<?php

namespace App\Domain\VirtualOffice\Services;

use App\Domain\VirtualOffice\Events\PresenceUpdated;
use App\Domain\VirtualOffice\Models\OfficeEvent;
use App\Domain\VirtualOffice\Models\OfficePresence;
use App\Domain\VirtualOffice\Models\OfficePresenceLog;
use App\Domain\VirtualOffice\Models\OfficeZone;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Log;

class PresenceService
{
    public function heartbeat(User $user, bool $hasRecentActivity = true, ?string $zoneSlug = null): OfficePresence
    {
        $now = now();
        $presence = OfficePresence::firstOrNew(['user_id' => $user->id]);
        $previousStatus = $presence->exists ? $presence->effectiveStatus() : 'offline';
        $previousZoneId = $presence->zone_id;

        if ($zoneSlug) {
            $zone = OfficeZone::where('slug', $zoneSlug)->where('is_active', true)->first();
            if ($zone) {
                $presence->zone_id = $zone->id;
            }
        }

        if (! $presence->zone_id) {
            $presence->zone_id = OfficeZone::where('slug', 'reception')->value('id')
                ?? OfficeZone::where('is_active', true)->value('id');
        }

        $presence->last_seen_at = $now;

        if ($hasRecentActivity) {
            $presence->last_activity_at = $now;
        } elseif (! $presence->last_activity_at) {
            $presence->last_activity_at = $now;
        }

        // Determine status transitions cleanly without overwriting manual Busy/DND
        if (! $presence->exists || $presence->status === 'offline') {
            $presence->status = 'online';
        } elseif ($presence->status === 'away' && $hasRecentActivity) {
            $presence->status = 'online';
        } elseif (
            in_array($presence->status, ['online', 'available'], true)
            && ! $hasRecentActivity
            && $presence->last_activity_at->lt($now->copy()->subSeconds(OfficePresence::IDLE_AWAY_SECONDS))
        ) {
            $presence->status = 'away';
        }

        $presence->active_sessions_count = max(1, (int) $presence->active_sessions_count);
        $presence->save();

        $newStatus = $presence->effectiveStatus();
        if ($previousStatus !== $newStatus || $previousZoneId !== $presence->zone_id) {
            $this->recordLogTransition($user->id, $presence->zone_id, $newStatus, $now);
            $this->broadcastPresence($presence);
        }

        return $presence;
    }

    public function updateStatus(User $user, array $data): OfficePresence
    {
        $now = now();
        $presence = OfficePresence::firstOrNew(['user_id' => $user->id]);
        $previousStatus = $presence->exists ? $presence->effectiveStatus() : 'offline';
        $previousZoneId = $presence->zone_id;

        if (! empty($data['zone_slug'])) {
            $zone = OfficeZone::where('slug', $data['zone_slug'])->where('is_active', true)->first();
            if ($zone) {
                $presence->zone_id = $zone->id;
            }
        }

        if (! $presence->zone_id) {
            $presence->zone_id = OfficeZone::where('slug', 'reception')->value('id');
        }

        if (isset($data['status'])) {
            $presence->status = $data['status'];
        }

        if (array_key_exists('custom_status_text', $data)) {
            $cleanText = $data['custom_status_text'] !== null
                ? mb_substr(trim(strip_tags((string) $data['custom_status_text'])), 0, 80)
                : null;
            $presence->custom_status_text = $cleanText !== '' ? $cleanText : null;
        }

        if (array_key_exists('custom_status_emoji', $data)) {
            $presence->custom_status_emoji = $data['custom_status_emoji'] ?: null;
        }

        if (array_key_exists('expires_in', $data)) {
            $presence->custom_status_expires_at = match ($data['expires_in']) {
                '30m' => $now->copy()->addMinutes(30),
                '1h' => $now->copy()->addHour(),
                'today' => $now->copy()->endOfDay(),
                default => null,
            };
        }

        if (array_key_exists('hide_current_task', $data)) {
            $presence->hide_current_task = (bool) $data['hide_current_task'];
        }

        if ($presence->status === 'offline') {
            $presence->active_sessions_count = 0;
        } else {
            $presence->last_seen_at = $now;
            $presence->last_activity_at = $now;
            $presence->active_sessions_count = max(1, (int) $presence->active_sessions_count);
        }

        $presence->save();

        $newStatus = $presence->effectiveStatus();
        if ($previousStatus !== $newStatus || $previousZoneId !== $presence->zone_id) {
            $this->recordLogTransition($user->id, $presence->zone_id, $newStatus, $now);

            OfficeEvent::create([
                'type' => 'presence.updated',
                'actor_id' => $user->id,
                'zone_id' => $presence->zone_id,
                'payload' => ['status' => $newStatus],
                'created_at' => $now,
            ]);
        }

        $this->broadcastPresence($presence);

        return $presence;
    }

    public function disconnect(User $user): void
    {
        $presence = OfficePresence::where('user_id', $user->id)->first();
        if (! $presence) {
            return;
        }

        $presence->status = 'offline';
        $presence->active_sessions_count = 0;
        $presence->seat_id = null;
        $presence->save();

        $this->closeOpenLog($user->id, now());
        $this->broadcastPresence($presence);
    }

    /**
     * Sweep stale sessions (>90s without heartbeat -> offline) and idle sessions (>5m -> away).
     */
    public function sweepStalePresences(): int
    {
        $now = now();
        $changed = 0;

        $staleCutoff = $now->copy()->subSeconds(OfficePresence::HEARTBEAT_TIMEOUT_SECONDS);
        $staleRows = OfficePresence::query()
            ->where('status', '!=', 'offline')
            ->where(function ($q) use ($staleCutoff) {
                $q->whereNull('last_seen_at')->orWhere('last_seen_at', '<', $staleCutoff);
            })
            ->get();

        foreach ($staleRows as $row) {
            $row->status = 'offline';
            $row->active_sessions_count = 0;
            $row->seat_id = null;
            $row->save();
            $this->closeOpenLog($row->user_id, $now);
            $this->broadcastPresence($row);
            $changed++;
        }

        $idleCutoff = $now->copy()->subSeconds(OfficePresence::IDLE_AWAY_SECONDS);
        $idleRows = OfficePresence::query()
            ->whereIn('status', ['online', 'available'])
            ->whereNotNull('last_activity_at')
            ->where('last_activity_at', '<', $idleCutoff)
            ->get();

        foreach ($idleRows as $row) {
            $row->status = 'away';
            $row->save();
            $this->recordLogTransition($row->user_id, $row->zone_id, 'away', $now);
            $this->broadcastPresence($row);
            $changed++;
        }

        return $changed;
    }

    public function serializePresence(OfficePresence $presence): array
    {
        $presence->loadMissing(['user.employeeProfile.department', 'user.employeeProfile.position', 'zone']);
        $user = $presence->user;
        $status = $presence->effectiveStatus();

        return [
            'id' => $user->id,
            'user_id' => $user->id,
            'name' => $user->name,
            'avatar_url' => $user->avatarUrl(),
            'avatar_color' => $user->employeeProfile?->avatar_color ?? '#2563EB',
            'position' => $user->employeeProfile?->position?->title ?? 'Team Member',
            'department' => $user->employeeProfile?->department?->name ?? 'Krevia Digital',
            'zone' => $presence->zone?->slug ?? 'reception',
            'zone_id' => $presence->zone_id,
            'status' => ucfirst($status),
            'status_key' => $status,
            'custom_status_text' => $presence->activeCustomStatusText(),
            'custom_status_emoji' => $presence->custom_status_emoji,
            'hide_current_task' => (bool) $presence->hide_current_task,
            'last_seen_at' => $presence->last_seen_at?->toIso8601String(),
            'last_activity_at' => $presence->last_activity_at?->toIso8601String(),
        ];
    }

    private function recordLogTransition(int $userId, ?int $zoneId, string $status, Carbon $now): void
    {
        $this->closeOpenLog($userId, $now);

        if ($status !== 'offline') {
            OfficePresenceLog::create([
                'user_id' => $userId,
                'zone_id' => $zoneId,
                'status' => $status,
                'started_at' => $now,
            ]);
        }
    }

    private function closeOpenLog(int $userId, Carbon $now): void
    {
        OfficePresenceLog::query()
            ->where('user_id', $userId)
            ->whereNull('ended_at')
            ->update(['ended_at' => $now]);
    }

    private function broadcastPresence(OfficePresence $presence): void
    {
        try {
            broadcast(new PresenceUpdated($this->serializePresence($presence)));
        } catch (\Throwable $e) {
            Log::warning('[VirtualOffice] Broadcast skipped: '.$e->getMessage());
        }
    }
}
