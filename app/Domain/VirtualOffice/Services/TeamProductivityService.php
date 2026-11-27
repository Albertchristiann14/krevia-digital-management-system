<?php

namespace App\Domain\VirtualOffice\Services;

use App\Domain\VirtualOffice\Events\OfficeTeamPulseUpdated;
use App\Domain\VirtualOffice\Models\OfficeEvent;
use App\Domain\VirtualOffice\Models\OfficePresenceLog;
use App\Domain\VirtualOffice\Models\OfficeStandup;
use App\Domain\VirtualOffice\Models\OfficeZone;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class TeamProductivityService
{
    public function isAdmin(User $user): bool
    {
        return $user->hasAnyRole([User::ROLE_FOUNDER, User::ROLE_OPERATIONS]) || $user->can('organization.manage');
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function listStandups(?string $date = null): array
    {
        $targetDate = $date ?: now()->toDateString();

        return OfficeStandup::query()
            ->with('user:id,name,avatar_path')
            ->whereDate('standup_date', $targetDate)
            ->orderByDesc('submitted_at')
            ->get()
            ->map(fn (OfficeStandup $s) => [
                'id' => $s->id,
                'standup_date' => $s->standup_date?->format('Y-m-d'),
                'user_id' => $s->user_id,
                'user_name' => $s->user?->name ?? 'Member',
                'user_avatar_url' => $s->user?->avatarUrl(),
                'yesterday' => $s->yesterday,
                'today' => $s->today,
                'blockers' => $s->blockers,
                'submitted_at' => $s->submitted_at?->toIso8601String(),
                'submitted_human' => $s->submitted_at?->diffForHumans(),
            ])
            ->values()
            ->all();
    }

    public function startStandup(User $actor): void
    {
        if (! $this->isAdmin($actor)) {
            abort(403, 'Hanya Founder/Operations/Admin yang dapat memulai sesi standup tim.');
        }

        $meetingZone = OfficeZone::query()->where('slug', 'meeting')->first();

        OfficeEvent::create([
            'type' => 'standup_started',
            'actor_id' => $actor->id,
            'zone_id' => $meetingZone?->id,
            'payload' => [
                'initiated_by' => $actor->name,
                'standup_date' => now()->toDateString(),
            ],
            'created_at' => now(),
        ]);

        event(new OfficeTeamPulseUpdated('standup.started', [
            'initiated_by' => $actor->name,
            'standup_date' => now()->toDateString(),
        ]));
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public function submitStandup(User $user, array $data): array
    {
        $today = now()->toDateString();

        $standup = DB::transaction(function () use ($user, $data, $today): OfficeStandup {
            $record = OfficeStandup::updateOrCreate(
                ['standup_date' => $today, 'user_id' => $user->id],
                [
                    'yesterday' => strip_tags(trim((string) $data['yesterday'])),
                    'today' => strip_tags(trim((string) $data['today'])),
                    'blockers' => isset($data['blockers']) && trim((string) $data['blockers']) !== ''
                        ? strip_tags(trim((string) $data['blockers']))
                        : null,
                    'submitted_at' => now(),
                ]
            );

            OfficeEvent::create([
                'type' => 'standup_submitted',
                'actor_id' => $user->id,
                'payload' => ['standup_date' => $today],
                'created_at' => now(),
            ]);

            return $record;
        });

        $standup->load('user:id,name,avatar_path');
        $serialized = [
            'id' => $standup->id,
            'standup_date' => $standup->standup_date?->format('Y-m-d'),
            'user_id' => $standup->user_id,
            'user_name' => $standup->user?->name ?? $user->name,
            'user_avatar_url' => $standup->user?->avatarUrl(),
            'yesterday' => $standup->yesterday,
            'today' => $standup->today,
            'blockers' => $standup->blockers,
            'submitted_at' => $standup->submitted_at?->toIso8601String(),
            'submitted_human' => $standup->submitted_at?->diffForHumans(),
        ];

        event(new OfficeTeamPulseUpdated('standup.submitted', $serialized));

        return $serialized;
    }

    /**
     * Weekly attendance heatmap (last 7 days, hours 08..19 Asia/Jakarta) for Admin.
     *
     * @return array<string, mixed>
     */
    public function attendanceHeatmap(User $actor): array
    {
        if (! $this->isAdmin($actor)) {
            abort(403, 'Hanya Admin/Founder/Operations yang dapat melihat heatmap kehadiran.');
        }

        $since = now()->subDays(6)->startOfDay();
        $logs = OfficePresenceLog::query()
            ->with('user:id,name')
            ->where('started_at', '>=', $since)
            ->where('status', '!=', 'offline')
            ->get(['id', 'user_id', 'status', 'started_at', 'ended_at']);

        $users = User::query()
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name']);

        $hours = range(8, 19);
        $matrix = [];
        foreach ($users as $u) {
            $matrix[$u->id] = [
                'user_id' => $u->id,
                'name' => $u->name,
                'hours' => array_fill_keys($hours, 0),
                'total_sessions' => 0,
            ];
        }

        foreach ($logs as $log) {
            if (! isset($matrix[$log->user_id])) {
                continue;
            }
            $hour = (int) Carbon::parse($log->started_at)->timezone('Asia/Jakarta')->format('G');
            $matrix[$log->user_id]['total_sessions']++;
            if ($hour >= 8 && $hour <= 19) {
                $matrix[$log->user_id]['hours'][$hour]++;
            }
        }

        return [
            'since' => $since->toDateString(),
            'until' => now()->toDateString(),
            'hours' => $hours,
            'rows' => array_values($matrix),
        ];
    }

    /**
     * Admin/Lead summon invite ("Panggil ke Sini").
     *
     * @return array<string, mixed>
     */
    public function summonMember(User $actor, User $target, OfficeZone $zone, ?string $note = null): array
    {
        if (! $this->isAdmin($actor)) {
            abort(403, 'Hanya Founder/Operations/Admin yang dapat memanggil anggota ke zona.');
        }

        $payload = [
            'from_user_id' => $actor->id,
            'from_name' => $actor->name,
            'zone_id' => $zone->id,
            'zone_slug' => $zone->slug,
            'zone_name' => $zone->name,
            'note' => $note ? strip_tags(trim($note)) : "Mohon merapat ke {$zone->name}.",
        ];

        event(new OfficeTeamPulseUpdated('summon.received', $payload, $target->id));

        OfficeEvent::create([
            'type' => 'member_summoned',
            'actor_id' => $actor->id,
            'zone_id' => $zone->id,
            'payload' => ['target_user_id' => $target->id, 'target_name' => $target->name],
            'created_at' => now(),
        ]);

        return $payload;
    }

    /**
     * Admin zone configuration update (capacity, linked_project_id, description).
     *
     * @param  array<string, mixed>  $data
     */
    public function updateZoneSettings(User $actor, OfficeZone $zone, array $data): OfficeZone
    {
        if (! $this->isAdmin($actor)) {
            abort(403, 'Hanya Admin yang dapat mengubah pengaturan zona.');
        }

        $zone->update([
            'capacity' => $data['capacity'] ?? $zone->capacity,
            'linked_project_id' => array_key_exists('linked_project_id', $data) ? $data['linked_project_id'] : $zone->linked_project_id,
            'description' => array_key_exists('description', $data) && $data['description'] !== null
                ? strip_tags(trim((string) $data['description']))
                : $zone->description,
        ]);

        return $zone->fresh();
    }
}
