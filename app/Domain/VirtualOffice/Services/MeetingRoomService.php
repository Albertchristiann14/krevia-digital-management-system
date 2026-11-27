<?php

namespace App\Domain\VirtualOffice\Services;

use App\Domain\Governance\Models\ActionItem;
use App\Domain\Governance\Models\Meeting;
use App\Domain\Governance\Models\MeetingMinute;
use App\Domain\VirtualOffice\Events\OfficeMeetingUpdated;
use App\Domain\VirtualOffice\Models\OfficeEvent;
use App\Domain\VirtualOffice\Models\OfficeMeetingParticipant;
use App\Domain\VirtualOffice\Models\OfficePresence;
use App\Domain\VirtualOffice\Models\OfficeSeat;
use App\Domain\VirtualOffice\Models\OfficeZone;
use App\Domain\Workplan\Models\AnnualRoadmap;
use App\Domain\Workplan\Models\Task;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class MeetingRoomService
{
    public function __construct(
        private readonly PresenceService $presenceService,
        private readonly CommunicationService $communicationService,
    ) {}

    /**
     * @return array{live: array<int, array<string, mixed>>, upcoming: array<int, array<string, mixed>>, recent: array<int, array<string, mixed>>}
     */
    public function listMeetingsForOffice(?int $zoneId = null): array
    {
        $baseQuery = Meeting::query()
            ->with([
                'pic:id,name',
                'officeZone:id,slug,name',
                'project:id,code,name',
                'minute.recorder:id,name',
                'actionItems.pic:id,name',
                'actionItems.linkedTask:id,code,status',
                'officeParticipants.user:id,name,avatar_path',
            ])
            ->when($zoneId !== null, fn ($q) => $q->where(function ($sub) use ($zoneId) {
                $sub->where('office_zone_id', $zoneId)->orWhereNull('office_zone_id');
            }));

        $live = (clone $baseQuery)
            ->where('is_live', true)
            ->orderByDesc('started_at')
            ->get()
            ->map(fn (Meeting $m) => $this->serializeMeeting($m))
            ->values()
            ->all();

        $upcoming = (clone $baseQuery)
            ->where('is_live', false)
            ->whereIn('status', ['Planned', 'Agenda Ready'])
            ->whereDate('scheduled_date', '>=', now()->toDateString())
            ->orderBy('scheduled_date')
            ->orderBy('scheduled_time')
            ->limit(15)
            ->get()
            ->map(fn (Meeting $m) => $this->serializeMeeting($m))
            ->values()
            ->all();

        $recent = (clone $baseQuery)
            ->where('is_live', false)
            ->where('status', 'Completed')
            ->orderByDesc('ended_at')
            ->orderByDesc('scheduled_date')
            ->limit(8)
            ->get()
            ->map(fn (Meeting $m) => $this->serializeMeeting($m))
            ->values()
            ->all();

        return [
            'live' => $live,
            'upcoming' => $upcoming,
            'recent' => $recent,
        ];
    }

    /**
     * 30-minute availability timeline for a zone on a given date (08:00 - 18:30).
     *
     * @return array<int, array{time: string, available: bool, meeting_code: ?string, meeting_title: ?string}>
     */
    public function timelineSlots(string $date, int $zoneId): array
    {
        $dayMeetings = Meeting::query()
            ->whereDate('scheduled_date', $date)
            ->where('status', '!=', 'Cancelled')
            ->where(function ($q) use ($zoneId) {
                $q->where('office_zone_id', $zoneId)->orWhereNull('office_zone_id');
            })
            ->get(['id', 'code', 'focus', 'scheduled_time', 'duration_minutes']);

        $slots = [];
        for ($hour = 8; $hour <= 18; $hour++) {
            foreach ([0, 30] as $min) {
                $slotStart = Carbon::createFromFormat('Y-m-d H:i', sprintf('%s %02d:%02d', $date, $hour, $min));
                $slotEnd = $slotStart->copy()->addMinutes(30);
                $booked = null;

                foreach ($dayMeetings as $m) {
                    $range = $this->meetingTimeRange($date, $m->scheduled_time, (int) ($m->duration_minutes ?: 30));
                    if ($range && $slotStart->lt($range[1]) && $slotEnd->gt($range[0])) {
                        $booked = $m;
                        break;
                    }
                }

                $slots[] = [
                    'time' => $slotStart->format('H:i'),
                    'available' => $booked === null,
                    'meeting_code' => $booked?->code,
                    'meeting_title' => $booked?->focus,
                ];
            }
        }

        return $slots;
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public function startInstantMeeting(User $actor, array $data): array
    {
        $zone = $this->resolveTargetZone($data['zone_id'] ?? null);

        $meeting = DB::transaction(function () use ($actor, $data, $zone): Meeting {
            $alreadyLive = Meeting::query()
                ->where('is_live', true)
                ->where('office_zone_id', $zone->id)
                ->lockForUpdate()
                ->first();

            if ($alreadyLive) {
                throw ValidationException::withMessages([
                    'zone_id' => "Sudah ada rapat LIVE di {$zone->name}: {$alreadyLive->focus}. Gabung atau akhiri rapat tersebut terlebih dahulu.",
                ]);
            }

            $code = $this->nextMeetingCode();
            $roomSlug = 'KreviaVO-' . $code . '-' . Str::upper(Str::random(5));

            $meeting = Meeting::create([
                'code' => $code,
                'forum_name' => $data['forum_name'] ?? 'Virtual Office Instant Sync',
                'focus' => trim((string) $data['focus']),
                'scheduled_date' => now()->toDateString(),
                'scheduled_time' => now()->format('H:i'),
                'duration_minutes' => (int) ($data['duration_minutes'] ?? 30),
                'status' => 'Agenda Ready',
                'is_live' => true,
                'is_locked' => (bool) ($data['is_locked'] ?? false),
                'live_room_code' => $roomSlug,
                'started_at' => now(),
                'started_by' => $actor->id,
                'pic_user_id' => $actor->id,
                'office_zone_id' => $zone->id,
                'project_id' => $data['project_id'] ?? null,
                'agenda' => isset($data['agenda']) ? trim((string) $data['agenda']) : 'Instant Virtual Office Meeting',
                'agenda_sent_at' => now(),
            ]);

            $inviteIds = collect($data['invite_user_ids'] ?? [])
                ->map(fn ($id) => (int) $id)
                ->filter(fn ($id) => $id > 0 && $id !== $actor->id)
                ->unique()
                ->values();

            OfficeMeetingParticipant::create([
                'meeting_id' => $meeting->id,
                'user_id' => $actor->id,
                'rsvp_status' => 'accepted',
                'is_in_call' => true,
                'joined_at' => now(),
            ]);

            foreach ($inviteIds as $uid) {
                OfficeMeetingParticipant::create([
                    'meeting_id' => $meeting->id,
                    'user_id' => $uid,
                    'rsvp_status' => 'pending',
                    'is_in_call' => false,
                ]);
            }

            OfficeEvent::create([
                'type' => 'meeting_started',
                'actor_id' => $actor->id,
                'zone_id' => $zone->id,
                'payload' => [
                    'meeting_id' => $meeting->id,
                    'code' => $meeting->code,
                    'focus' => $meeting->focus,
                ],
                'created_at' => now(),
            ]);

            return $meeting;
        });

        $this->moveAndSeatUser($actor, $zone);

        $serialized = $this->serializeMeeting($this->loadMeetingRelations($meeting));
        event(new OfficeMeetingUpdated('started', $serialized, $zone->id));

        return $serialized;
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public function scheduleMeeting(User $actor, array $data): array
    {
        $zone = $this->resolveTargetZone($data['zone_id'] ?? null);
        $date = (string) $data['scheduled_date'];
        $time = (string) $data['scheduled_time'];
        $duration = (int) ($data['duration_minutes'] ?? 30);

        $reqRange = $this->meetingTimeRange($date, $time, $duration);
        if (! $reqRange) {
            throw ValidationException::withMessages([
                'scheduled_time' => 'Format jam rapat tidak valid (gunakan HH:MM).',
            ]);
        }

        $inviteIds = collect($data['invite_user_ids'] ?? [])
            ->map(fn ($id) => (int) $id)
            ->filter(fn ($id) => $id > 0)
            ->push($actor->id)
            ->unique()
            ->values();

        $meeting = DB::transaction(function () use ($actor, $data, $zone, $date, $time, $duration, $reqRange, $inviteIds): Meeting {
            // Lock same-day non-cancelled meetings in this zone to prevent double-booking
            $existing = Meeting::query()
                ->with('officeParticipants:id,meeting_id,user_id')
                ->whereDate('scheduled_date', $date)
                ->where('status', '!=', 'Cancelled')
                ->lockForUpdate()
                ->get();

            foreach ($existing as $other) {
                $otherRange = $this->meetingTimeRange($date, $other->scheduled_time, (int) ($other->duration_minutes ?: 30));
                if (! $otherRange) {
                    continue;
                }

                $overlaps = $reqRange[0]->lt($otherRange[1]) && $reqRange[1]->gt($otherRange[0]);
                if (! $overlaps) {
                    continue;
                }

                if ((int) ($other->office_zone_id ?? $zone->id) === $zone->id) {
                    throw ValidationException::withMessages([
                        'scheduled_time' => "Ruangan {$zone->name} sudah terpakai oleh '{$other->focus}' ({$other->scheduled_time}).",
                    ]);
                }

                $otherUsers = $other->officeParticipants->pluck('user_id')->push($other->pic_user_id)->filter()->unique();
                $conflictingUsers = $inviteIds->intersect($otherUsers);
                if ($conflictingUsers->isNotEmpty()) {
                    $names = User::query()->whereIn('id', $conflictingUsers)->pluck('name')->implode(', ');
                    throw ValidationException::withMessages([
                        'invite_user_ids' => "Peserta bentrok jadwal dengan '{$other->focus}': {$names}.",
                    ]);
                }
            }

            $code = $this->nextMeetingCode();
            $agenda = isset($data['agenda']) ? trim((string) $data['agenda']) : null;

            $meeting = Meeting::create([
                'code' => $code,
                'forum_name' => $data['forum_name'] ?? 'Virtual Office Meeting',
                'focus' => trim((string) $data['focus']),
                'scheduled_date' => $date,
                'scheduled_time' => $time,
                'duration_minutes' => $duration,
                'status' => $agenda ? 'Agenda Ready' : 'Planned',
                'is_live' => false,
                'is_locked' => (bool) ($data['is_locked'] ?? false),
                'live_room_code' => 'KreviaVO-' . $code . '-' . Str::upper(Str::random(5)),
                'pic_user_id' => $actor->id,
                'office_zone_id' => $zone->id,
                'project_id' => $data['project_id'] ?? null,
                'agenda' => $agenda,
                'agenda_sent_at' => $agenda ? now() : null,
            ]);

            foreach ($inviteIds as $uid) {
                OfficeMeetingParticipant::create([
                    'meeting_id' => $meeting->id,
                    'user_id' => $uid,
                    'rsvp_status' => $uid === $actor->id ? 'accepted' : 'pending',
                    'is_in_call' => false,
                ]);
            }

            OfficeEvent::create([
                'type' => 'meeting_scheduled',
                'actor_id' => $actor->id,
                'zone_id' => $zone->id,
                'payload' => [
                    'meeting_id' => $meeting->id,
                    'code' => $meeting->code,
                    'focus' => $meeting->focus,
                    'scheduled_date' => $date,
                    'scheduled_time' => $time,
                ],
                'created_at' => now(),
            ]);

            return $meeting;
        });

        $serialized = $this->serializeMeeting($this->loadMeetingRelations($meeting));
        event(new OfficeMeetingUpdated('scheduled', $serialized, $zone->id));

        return $serialized;
    }

    /**
     * @return array<string, mixed>
     */
    public function joinMeeting(Meeting $meeting, User $user): array
    {
        if ($meeting->status === 'Cancelled' || $meeting->status === 'Completed') {
            throw ValidationException::withMessages([
                'meeting' => 'Rapat ini sudah selesai atau dibatalkan.',
            ]);
        }

        if ($meeting->is_locked) {
            $isAllowed = (int) $meeting->pic_user_id === $user->id
                || (int) $meeting->started_by === $user->id
                || $this->isAdmin($user)
                || OfficeMeetingParticipant::query()
                    ->where('meeting_id', $meeting->id)
                    ->where('user_id', $user->id)
                    ->exists();

            if (! $isAllowed) {
                throw ValidationException::withMessages([
                    'meeting' => 'Ruang rapat sedang dikunci oleh host. Minta undangan terlebih dahulu.',
                ]);
            }
        }

        $zone = $this->resolveTargetZone($meeting->office_zone_id);

        DB::transaction(function () use ($meeting, $user, $zone): void {
            if (! $meeting->is_live) {
                $meeting->update([
                    'is_live' => true,
                    'started_at' => $meeting->started_at ?? now(),
                    'started_by' => $meeting->started_by ?? $user->id,
                    'live_room_code' => $meeting->live_room_code ?: ('KreviaVO-' . $meeting->code . '-' . Str::upper(Str::random(5))),
                    'office_zone_id' => $meeting->office_zone_id ?? $zone->id,
                ]);
            }

            OfficeMeetingParticipant::updateOrCreate(
                ['meeting_id' => $meeting->id, 'user_id' => $user->id],
                [
                    'rsvp_status' => 'accepted',
                    'is_in_call' => true,
                    'joined_at' => now(),
                    'left_at' => null,
                ]
            );

            OfficeEvent::create([
                'type' => 'meeting_joined',
                'actor_id' => $user->id,
                'zone_id' => $zone->id,
                'payload' => [
                    'meeting_id' => $meeting->id,
                    'code' => $meeting->code,
                    'focus' => $meeting->focus,
                ],
                'created_at' => now(),
            ]);
        });

        $this->moveAndSeatUser($user, $zone);

        $serialized = $this->serializeMeeting($this->loadMeetingRelations($meeting->fresh()));
        event(new OfficeMeetingUpdated('joined', $serialized, $zone->id));

        return $serialized;
    }

    /**
     * @return array<string, mixed>
     */
    public function leaveMeeting(Meeting $meeting, User $user): array
    {
        OfficeMeetingParticipant::query()
            ->where('meeting_id', $meeting->id)
            ->where('user_id', $user->id)
            ->update([
                'is_in_call' => false,
                'left_at' => now(),
            ]);

        $serialized = $this->serializeMeeting($this->loadMeetingRelations($meeting->fresh()));
        event(new OfficeMeetingUpdated('left', $serialized, $meeting->office_zone_id));

        return $serialized;
    }

    /**
     * @return array<string, mixed>
     */
    public function endMeeting(Meeting $meeting, User $actor): array
    {
        $canEnd = (int) $meeting->pic_user_id === $actor->id
            || (int) $meeting->started_by === $actor->id
            || $this->isAdmin($actor);

        if (! $canEnd) {
            throw ValidationException::withMessages([
                'meeting' => 'Hanya host rapat atau Admin/Founder yang dapat mengakhiri rapat.',
            ]);
        }

        DB::transaction(function () use ($meeting, $actor): void {
            $meeting->update([
                'is_live' => false,
                'ended_at' => now(),
                'status' => 'Completed',
            ]);

            OfficeMeetingParticipant::query()
                ->where('meeting_id', $meeting->id)
                ->where('is_in_call', true)
                ->update([
                    'is_in_call' => false,
                    'left_at' => now(),
                ]);

            OfficeEvent::create([
                'type' => 'meeting_ended',
                'actor_id' => $actor->id,
                'zone_id' => $meeting->office_zone_id,
                'payload' => [
                    'meeting_id' => $meeting->id,
                    'code' => $meeting->code,
                    'focus' => $meeting->focus,
                ],
                'created_at' => now(),
            ]);
        });

        $serialized = $this->serializeMeeting($this->loadMeetingRelations($meeting->fresh()));
        event(new OfficeMeetingUpdated('ended', $serialized, $meeting->office_zone_id));

        return $serialized;
    }

    /**
     * @return array<string, mixed>
     */
    public function rsvp(Meeting $meeting, User $user, string $status): array
    {
        OfficeMeetingParticipant::updateOrCreate(
            ['meeting_id' => $meeting->id, 'user_id' => $user->id],
            ['rsvp_status' => $status]
        );

        $serialized = $this->serializeMeeting($this->loadMeetingRelations($meeting->fresh()));
        event(new OfficeMeetingUpdated('rsvp', $serialized, $meeting->office_zone_id));

        return $serialized;
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public function saveNotes(Meeting $meeting, User $actor, array $data): array
    {
        $now = now();
        $deadline24h = ($meeting->scheduled_date ?? $now)->copy()->endOfDay()->addHours(24);
        $withinSla = $now->lessThanOrEqualTo($deadline24h);

        MeetingMinute::updateOrCreate(
            ['meeting_id' => $meeting->id],
            [
                'recorded_by' => $actor->id,
                'summary' => strip_tags((string) $data['summary']),
                'decisions_summary' => isset($data['decisions_summary']) ? strip_tags((string) $data['decisions_summary']) : null,
                'escalations' => isset($data['escalations']) ? strip_tags((string) $data['escalations']) : null,
                'submitted_at' => $now,
                'is_within_24h_sla' => $withinSla,
            ]
        );

        $serialized = $this->serializeMeeting($this->loadMeetingRelations($meeting->fresh()));
        event(new OfficeMeetingUpdated('notes_updated', $serialized, $meeting->office_zone_id));

        return $serialized;
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public function addActionItem(Meeting $meeting, User $actor, array $data): array
    {
        ActionItem::create([
            'meeting_id' => $meeting->id,
            'title' => strip_tags((string) $data['title']),
            'pic_user_id' => $data['pic_user_id'] ?? $actor->id,
            'due_date' => $data['due_date'] ?? now()->addDays(3)->toDateString(),
            'evidence_note' => isset($data['evidence_note']) ? strip_tags((string) $data['evidence_note']) : null,
            'status' => 'Open',
        ]);

        $serialized = $this->serializeMeeting($this->loadMeetingRelations($meeting->fresh()));
        event(new OfficeMeetingUpdated('action_item_added', $serialized, $meeting->office_zone_id));

        return $serialized;
    }

    /**
     * Convert a meeting action item into a real Task Tracker task in one click.
     *
     * @return array<string, mixed>
     */
    public function convertActionItemToTask(ActionItem $item, User $actor): array
    {
        $item->loadMissing('meeting');

        $task = DB::transaction(function () use ($item, $actor): Task {
            $locked = ActionItem::query()->whereKey($item->id)->lockForUpdate()->firstOrFail();

            if ($locked->linked_task_id) {
                $existing = Task::query()->find($locked->linked_task_id);
                if ($existing) {
                    return $existing;
                }
            }

            $maxNum = Task::withTrashed()
                ->where('code', 'like', 'T-%')
                ->pluck('code')
                ->map(fn (string $c) => (int) str_replace('T-', '', $c))
                ->max() ?? 135;

            $nextCode = sprintf('T-%03d', $maxNum + 1);
            $deadline = ($locked->due_date ?? now()->addDays(3))->toDateString();
            $monthKey = Carbon::parse($deadline)->startOfMonth()->toDateString();
            $roadmap = AnnualRoadmap::query()->whereDate('period_month', $monthKey)->first();

            $task = Task::create([
                'code' => $nextCode,
                'annual_roadmap_id' => $roadmap?->id,
                'project_id' => $item->meeting?->project_id,
                'title' => $locked->title,
                'description' => 'Created from Virtual Office Meeting ' . ($item->meeting?->code ?? '') . ': ' . ($item->meeting?->focus ?? ''),
                'pic_user_id' => $locked->pic_user_id ?? $actor->id,
                'priority' => 'Sedang',
                'start_date' => now()->toDateString(),
                'deadline' => $deadline,
                'status' => 'Not Started',
                'progress_pct' => 0,
            ]);

            $locked->update(['linked_task_id' => $task->id]);

            OfficeEvent::create([
                'type' => 'action_item_task_created',
                'actor_id' => $actor->id,
                'zone_id' => $item->meeting?->office_zone_id,
                'payload' => [
                    'action_item_id' => $locked->id,
                    'task_id' => $task->id,
                    'task_code' => $task->code,
                    'title' => $task->title,
                ],
                'created_at' => now(),
            ]);

            return $task;
        });

        $serializedMeeting = $item->meeting
            ? $this->serializeMeeting($this->loadMeetingRelations($item->meeting->fresh()))
            : null;

        if ($serializedMeeting) {
            event(new OfficeMeetingUpdated('action_item_converted', $serializedMeeting, $item->meeting?->office_zone_id));
        }

        return [
            'task' => [
                'id' => $task->id,
                'code' => $task->code,
                'title' => $task->title,
                'status' => $task->status,
            ],
            'meeting' => $serializedMeeting,
        ];
    }

    /**
     * Start an instant 1:1 quick call and send a DM invitation with the Jitsi link.
     *
     * @return array<string, mixed>
     */
    public function startQuickCall(User $actor, User $target): array
    {
        if ($actor->id === $target->id) {
            throw ValidationException::withMessages([
                'target' => 'Tidak dapat memulai panggilan dengan diri sendiri.',
            ]);
        }

        $roomCode = 'KreviaCall-' . min($actor->id, $target->id) . '-' . max($actor->id, $target->id) . '-' . Str::upper(Str::random(5));
        $joinUrl = "https://meet.jit.si/{$roomCode}";

        $dm = $this->communicationService->sendMessage($actor, [
            'scope' => 'dm',
            'recipient_id' => $target->id,
            'body' => "📹 Mengajak kamu panggilan cepat sekarang: {$joinUrl}",
            'is_urgent' => false,
        ]);

        return [
            'room_code' => $roomCode,
            'join_url' => $joinUrl,
            'message' => $dm,
        ];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function listEvents(?int $zoneId = null, int $limit = 40): array
    {
        return OfficeEvent::query()
            ->with(['actor:id,name,avatar_path', 'zone:id,slug,name'])
            ->when($zoneId !== null, fn ($q) => $q->where('zone_id', $zoneId))
            ->orderByDesc('id')
            ->limit($limit)
            ->get()
            ->map(fn (OfficeEvent $e) => [
                'id' => $e->id,
                'type' => $e->type,
                'actor_name' => $e->actor?->name ?? 'System',
                'actor_avatar_url' => $e->actor?->avatarUrl(),
                'zone_id' => $e->zone_id,
                'zone_name' => $e->zone?->name,
                'payload' => $e->payload ?? [],
                'created_at' => $e->created_at?->toIso8601String(),
                'created_human' => $e->created_at?->diffForHumans(),
            ])
            ->values()
            ->all();
    }

    /**
     * @return array<string, mixed>
     */
    public function serializeMeeting(Meeting $m): array
    {
        return [
            'id' => $m->id,
            'code' => $m->code,
            'forum_name' => $m->forum_name,
            'focus' => $m->focus,
            'scheduled_date' => $m->scheduled_date?->format('Y-m-d'),
            'scheduled_time' => $m->scheduled_time,
            'duration_minutes' => (int) ($m->duration_minutes ?: 30),
            'status' => $m->status,
            'is_live' => (bool) $m->is_live,
            'is_locked' => (bool) $m->is_locked,
            'live_room_code' => $m->live_room_code,
            'join_url' => $m->live_room_code ? "https://meet.jit.si/{$m->live_room_code}" : null,
            'started_at' => $m->started_at?->toIso8601String(),
            'ended_at' => $m->ended_at?->toIso8601String(),
            'pic_user_id' => $m->pic_user_id,
            'pic_name' => $m->pic?->name,
            'started_by' => $m->started_by,
            'office_zone_id' => $m->office_zone_id,
            'zone_slug' => $m->officeZone?->slug ?? 'meeting',
            'zone_name' => $m->officeZone?->name ?? 'Meeting Room',
            'project_id' => $m->project_id,
            'project_name' => $m->project ? "{$m->project->code} · {$m->project->name}" : null,
            'agenda' => $m->agenda,
            'minute' => $m->minute ? [
                'summary' => $m->minute->summary,
                'decisions_summary' => $m->minute->decisions_summary,
                'escalations' => $m->minute->escalations,
                'recorder_name' => $m->minute->recorder?->name,
                'submitted_at' => $m->minute->submitted_at?->toIso8601String(),
            ] : null,
            'participants' => $m->officeParticipants->map(fn (OfficeMeetingParticipant $p) => [
                'user_id' => $p->user_id,
                'name' => $p->user?->name ?? 'Member',
                'avatar_url' => $p->user?->avatarUrl(),
                'rsvp_status' => $p->rsvp_status,
                'is_in_call' => (bool) $p->is_in_call,
                'joined_at' => $p->joined_at?->toIso8601String(),
            ])->values()->all(),
            'action_items' => $m->actionItems->map(fn (ActionItem $a) => [
                'id' => $a->id,
                'title' => $a->title,
                'pic_user_id' => $a->pic_user_id,
                'pic_name' => $a->pic?->name,
                'due_date' => $a->due_date?->format('Y-m-d'),
                'status' => $a->status,
                'linked_task_id' => $a->linked_task_id,
                'linked_task_code' => $a->linkedTask?->code,
            ])->values()->all(),
        ];
    }

    private function loadMeetingRelations(Meeting $meeting): Meeting
    {
        return $meeting->load([
            'pic:id,name',
            'officeZone:id,slug,name',
            'project:id,code,name',
            'minute.recorder:id,name',
            'actionItems.pic:id,name',
            'actionItems.linkedTask:id,code,status',
            'officeParticipants.user:id,name,avatar_path',
        ]);
    }

    private function resolveTargetZone(?int $zoneId): OfficeZone
    {
        if ($zoneId) {
            $found = OfficeZone::query()->whereKey($zoneId)->where('is_active', true)->first();
            if ($found) {
                return $found;
            }
        }

        return OfficeZone::query()->where('slug', 'meeting')->where('is_active', true)->firstOrFail();
    }

    private function moveAndSeatUser(User $user, OfficeZone $zone): void
    {
        $this->presenceService->move($user, $zone->slug);

        $occupiedSeatIds = OfficePresence::query()
            ->whereNotNull('seat_id')
            ->where('user_id', '!=', $user->id)
            ->pluck('seat_id');

        $freeSeat = OfficeSeat::query()
            ->where('zone_id', $zone->id)
            ->whereNotIn('id', $occupiedSeatIds)
            ->where(function ($q) use ($user) {
                $q->whereNull('assigned_user_id')
                    ->orWhere('assigned_user_id', $user->id)
                    ->orWhere('is_hot_desk', true);
            })
            ->orderBy('id')
            ->first();

        if ($freeSeat) {
            $this->presenceService->sitOrStand($user, $freeSeat->id);
        }
    }

    private function nextMeetingCode(): string
    {
        $max = Meeting::withTrashed()
            ->where('code', 'like', 'VO-%')
            ->pluck('code')
            ->map(fn (string $c) => (int) str_replace('VO-', '', $c))
            ->max() ?? 0;

        return sprintf('VO-%04d', $max + 1);
    }

    /**
     * @return array{0: Carbon, 1: Carbon}|null
     */
    private function meetingTimeRange(string $date, ?string $timeStr, int $durationMinutes): ?array
    {
        if (! $timeStr || ! preg_match('/^(\d{1,2}):(\d{2})/', trim($timeStr), $matches)) {
            return null;
        }

        $start = Carbon::createFromFormat('Y-m-d H:i', sprintf('%s %02d:%02d', $date, (int) $matches[1], (int) $matches[2]));
        if (! $start) {
            return null;
        }

        return [$start, $start->copy()->addMinutes(max(15, $durationMinutes))];
    }

    private function isAdmin(User $user): bool
    {
        return $user->hasAnyRole([User::ROLE_FOUNDER, User::ROLE_OPERATIONS]) || $user->can('organization.manage');
    }
}
