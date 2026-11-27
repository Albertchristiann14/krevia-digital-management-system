<?php

namespace App\Http\Controllers;

use App\Domain\Governance\Models\Meeting;
use App\Domain\Project\Models\Project;
use App\Domain\VirtualOffice\Models\OfficePresence;
use App\Domain\VirtualOffice\Models\OfficeSeat;
use App\Domain\VirtualOffice\Models\OfficeZone;
use App\Domain\VirtualOffice\Services\CommunicationService;
use App\Domain\VirtualOffice\Services\MeetingRoomService;
use App\Domain\VirtualOffice\Services\PresenceService;
use App\Domain\Workplan\Models\Task;
use App\Domain\Workspace\Models\Announcement;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class VirtualOfficeController extends Controller
{
    public function index(
        Request $request,
        PresenceService $presenceService,
        CommunicationService $comms,
        MeetingRoomService $meetingRoomService
    ): Response {
        $user = $request->user();

        // Sweep stale/away sessions and register current user's live heartbeat
        $presenceService->sweepStalePresences();
        $myPresence = $presenceService->heartbeat($user, true);

        $canViewTasks = $user->can('tasks.view');
        $canViewProjects = $user->can('projects.view');
        $canViewMeetings = $user->can('governance.view') || $user->can('meetings.view');
        $canViewPeople = $user->can('organization.view');

        $activeTasksCount = $canViewTasks
            ? Task::query()->whereIn('status', ['In Progress', 'Under Review'])->count()
            : null;
        $myOpenTasksCount = $canViewTasks
            ? Task::query()->where('pic_user_id', $user->id)->where('status', '!=', 'Completed')->count()
            : null;
        $activeProjectsCount = $canViewProjects
            ? Project::query()->where('status', '!=', 'Completed')->count()
            : null;
        $upcomingMeetingsCount = $canViewMeetings
            ? Meeting::query()
                ->whereDate('scheduled_date', '>=', now()->toDateString())
                ->count()
            : null;
        $announcementsCount = Announcement::query()->count();

        $members = $this->buildMembersSnapshot($presenceService);
        $onlineCount = collect($members)->where('status_key', '!=', 'offline')->count();

        $zonesBySlug = OfficeZone::query()->where('is_active', true)->get()->keyBy('slug');

        $rooms = [
            [
                'id' => 'reception',
                'zone_id' => $zonesBySlug['reception']->id ?? null,
                'name' => $zonesBySlug['reception']->name ?? 'Reception & Lobby',
                'code' => $zonesBySlug['reception']->code ?? 'ZONE-01',
                'accent' => $zonesBySlug['reception']->color ?? '#0D9488',
                'description' => $zonesBySlug['reception']->description ?? 'Digital headquarters front desk, visitor welcome lounge, and company-wide announcement board.',
                'capacity' => $zonesBySlug['reception']->capacity ?? 6,
                'primary_action' => ['label' => 'Open Announcements', 'href' => '/announcements'],
                'secondary_action' => ['label' => 'Organization Info', 'href' => '/organization'],
                'metrics' => [
                    ['label' => 'Announcements', 'value' => $announcementsCount],
                    ['label' => 'Online Now', 'value' => $onlineCount],
                ],
            ],
            [
                'id' => 'workspace',
                'zone_id' => $zonesBySlug['workspace']->id ?? null,
                'name' => $zonesBySlug['workspace']->name ?? 'Main Workspace',
                'code' => $zonesBySlug['workspace']->code ?? 'ZONE-02',
                'accent' => $zonesBySlug['workspace']->color ?? '#2563EB',
                'description' => $zonesBySlug['workspace']->description ?? 'Core engineering and operations floor with dual-monitor workstations for sprint execution.',
                'capacity' => $zonesBySlug['workspace']->capacity ?? 10,
                'primary_action' => ['label' => 'Open Task Tracker', 'href' => $canViewTasks ? '/tasks' : '/dashboard'],
                'secondary_action' => ['label' => 'My Tasks', 'href' => $canViewTasks ? '/my-tasks' : '/dashboard'],
                'metrics' => [
                    ['label' => 'In Progress / Review', 'value' => $activeTasksCount ?? '—', 'hint' => 'Team tasks currently in active execution or review'],
                    ['label' => 'My Open Backlog', 'value' => $myOpenTasksCount ?? '—', 'hint' => 'All non-completed tasks assigned to you'],
                ],
            ],
            [
                'id' => 'meeting',
                'zone_id' => $zonesBySlug['meeting']->id ?? null,
                'name' => $zonesBySlug['meeting']->name ?? 'Meeting Room',
                'code' => $zonesBySlug['meeting']->code ?? 'ZONE-03',
                'accent' => $zonesBySlug['meeting']->color ?? '#7C3AED',
                'description' => $zonesBySlug['meeting']->description ?? 'Glass-walled executive conference suite for weekly syncs, client discovery, and governance reviews.',
                'capacity' => $zonesBySlug['meeting']->capacity ?? 10,
                'primary_action' => ['label' => 'Open Meetings', 'href' => $canViewMeetings ? '/governance/meetings' : '/dashboard'],
                'secondary_action' => ['label' => 'Monthly Workplan', 'href' => '/workplan/monthly'],
                'metrics' => [
                    ['label' => 'Upcoming Meetings', 'value' => $upcomingMeetingsCount ?? '—'],
                    ['label' => 'Room Seats', 'value' => $zonesBySlug['meeting']->capacity ?? 10],
                ],
            ],
            [
                'id' => 'lounge',
                'zone_id' => $zonesBySlug['lounge']->id ?? null,
                'name' => $zonesBySlug['lounge']->name ?? 'Lounge Area',
                'code' => $zonesBySlug['lounge']->code ?? 'ZONE-04',
                'accent' => $zonesBySlug['lounge']->color ?? '#16A34A',
                'description' => $zonesBySlug['lounge']->description ?? 'Casual collaboration lounge for informal check-ins, coffee breaks, and team directory browsing.',
                'capacity' => $zonesBySlug['lounge']->capacity ?? 6,
                'primary_action' => ['label' => 'Member Directory', 'href' => $canViewPeople ? '/people' : '/my-account'],
                'secondary_action' => ['label' => 'My Account', 'href' => '/my-account'],
                'metrics' => [
                    ['label' => 'Total Team', 'value' => count($members)],
                    ['label' => 'Online Now', 'value' => $onlineCount],
                ],
            ],
            [
                'id' => 'project',
                'zone_id' => $zonesBySlug['project']->id ?? null,
                'name' => $zonesBySlug['project']->name ?? 'Project Room',
                'code' => $zonesBySlug['project']->code ?? 'ZONE-05',
                'accent' => $zonesBySlug['project']->color ?? '#D97706',
                'description' => $zonesBySlug['project']->description ?? 'Dedicated delivery war-room for Website & Custom Software milestones, architecture, and QA.',
                'capacity' => $zonesBySlug['project']->capacity ?? 6,
                'primary_action' => ['label' => 'Open Projects', 'href' => $canViewProjects ? '/projects' : '/dashboard'],
                'secondary_action' => ['label' => 'Annual Roadmap', 'href' => '/workplan/roadmap'],
                'metrics' => [
                    ['label' => 'Active Projects', 'value' => $activeProjectsCount ?? '—'],
                    ['label' => 'Delivery Focus', 'value' => 'Web & Software'],
                ],
            ],
        ];

        $recentAnnouncements = Announcement::query()
            ->latest('published_at')
            ->limit(3)
            ->get(['id', 'code', 'title', 'priority', 'published_at'])
            ->map(fn (Announcement $a) => [
                'id' => $a->id,
                'code' => $a->code,
                'title' => $a->title,
                'priority' => $a->priority,
                'published_at' => $a->published_at?->format('d M Y'),
            ]);

        $reverbAppKey = config('broadcasting.connections.reverb.key');

        return Inertia::render('VirtualOffice/Index', [
            'rooms' => $rooms,
            'seats' => $this->buildSeatsSnapshot($members),
            'members' => $members,
            'myPresence' => $presenceService->serializePresence($myPresence),
            'unread' => $comms->unreadCounts($user),
            'pendingKnocks' => $comms->pendingKnocksFor($user),
            'meetings' => $meetingRoomService->listMeetingsForOffice(),
            'recentEvents' => $meetingRoomService->listEvents(null, 40),
            'projects' => $canViewProjects
                ? Project::query()->where('status', '!=', 'Completed')->orderBy('code')->get(['id', 'code', 'name'])->map(fn (Project $p) => [
                    'id' => $p->id,
                    'code' => $p->code,
                    'name' => $p->name,
                ])->values()->all()
                : [],
            'recentAnnouncements' => $recentAnnouncements,
            'reverbConfig' => [
                'enabled' => config('broadcasting.default') === 'reverb' && ! empty($reverbAppKey),
                'key' => $reverbAppKey,
                'host' => config('broadcasting.connections.reverb.options.host') ?: $request->getHost(),
                'port' => (int) (config('broadcasting.connections.reverb.options.port') ?: ($request->isSecure() ? 443 : 8080)),
                'scheme' => config('broadcasting.connections.reverb.options.scheme') ?: ($request->isSecure() ? 'https' : 'http'),
            ],
        ]);
    }

    public function heartbeat(Request $request, PresenceService $presenceService): JsonResponse
    {
        $data = $request->validate([
            'has_activity' => ['sometimes', 'boolean'],
            'zone_slug' => ['nullable', 'string', 'exists:office_zones,slug'],
        ]);

        $presenceService->sweepStalePresences();
        $presence = $presenceService->heartbeat(
            $request->user(),
            (bool) ($data['has_activity'] ?? true),
            $data['zone_slug'] ?? null,
        );

        return response()->json([
            'ok' => true,
            'myPresence' => $presenceService->serializePresence($presence),
            'members' => $this->buildMembersSnapshot($presenceService),
        ]);
    }

    public function updatePresence(Request $request, PresenceService $presenceService): JsonResponse
    {
        $data = $request->validate([
            'status' => ['sometimes', 'string', Rule::in(OfficePresence::STATUSES)],
            'custom_status_text' => ['nullable', 'string', 'max:80'],
            'custom_status_emoji' => ['nullable', 'string', 'max:16'],
            'expires_in' => ['nullable', 'string', Rule::in(['30m', '1h', 'today', 'never'])],
            'hide_current_task' => ['sometimes', 'boolean'],
            'zone_slug' => ['nullable', 'string', 'exists:office_zones,slug'],
        ]);

        $presence = $presenceService->updateStatus($request->user(), $data);

        return response()->json([
            'ok' => true,
            'myPresence' => $presenceService->serializePresence($presence),
            'members' => $this->buildMembersSnapshot($presenceService),
        ]);
    }

    public function disconnect(Request $request, PresenceService $presenceService): JsonResponse
    {
        $presenceService->disconnect($request->user());

        return response()->json(['ok' => true]);
    }

    public function snapshot(PresenceService $presenceService): JsonResponse
    {
        $presenceService->sweepStalePresences();
        $members = $this->buildMembersSnapshot($presenceService);

        return response()->json([
            'ok' => true,
            'members' => $members,
            'seats' => $this->buildSeatsSnapshot($members),
        ]);
    }

    public function move(Request $request, PresenceService $presenceService): JsonResponse
    {
        $data = $request->validate([
            'zone_slug' => ['required', 'string', 'exists:office_zones,slug'],
            'pos_x' => ['nullable', 'numeric', 'between:-12,12'],
            'pos_z' => ['nullable', 'numeric', 'between:-9,9'],
        ]);

        $presence = $presenceService->move(
            $request->user(),
            $data['zone_slug'],
            isset($data['pos_x']) ? (float) $data['pos_x'] : null,
            isset($data['pos_z']) ? (float) $data['pos_z'] : null,
        );

        $members = $this->buildMembersSnapshot($presenceService);

        return response()->json([
            'ok' => true,
            'myPresence' => $presenceService->serializePresence($presence),
            'members' => $members,
            'seats' => $this->buildSeatsSnapshot($members),
        ]);
    }

    public function seat(Request $request, PresenceService $presenceService): JsonResponse
    {
        $data = $request->validate([
            'seat_id' => ['nullable', 'integer', 'exists:office_seats,id'],
        ]);

        $presence = $presenceService->sitOrStand(
            $request->user(),
            isset($data['seat_id']) ? (int) $data['seat_id'] : null,
        );

        $members = $this->buildMembersSnapshot($presenceService);

        return response()->json([
            'ok' => true,
            'myPresence' => $presenceService->serializePresence($presence),
            'members' => $members,
            'seats' => $this->buildSeatsSnapshot($members),
        ]);
    }

    private function buildSeatsSnapshot(array $members): array
    {
        $occupantsBySeat = [];
        foreach ($members as $m) {
            if (! empty($m['seat_id']) && ($m['status_key'] ?? 'offline') !== 'offline') {
                $occupantsBySeat[$m['seat_id']] = [
                    'user_id' => $m['id'],
                    'name' => $m['name'],
                ];
            }
        }

        return OfficeSeat::query()
            ->with('zone:id,slug')
            ->orderBy('zone_id')
            ->orderBy('seat_key')
            ->get()
            ->map(fn (OfficeSeat $s) => [
                'id' => $s->id,
                'zone' => $s->zone?->slug ?? 'workspace',
                'zone_id' => $s->zone_id,
                'seat_key' => $s->seat_key,
                'pos_x' => $s->pos_x,
                'pos_y' => $s->pos_y,
                'pos_z' => $s->pos_z,
                'rotation' => $s->rotation,
                'type' => $s->type,
                'assigned_user_id' => $s->assigned_user_id,
                'is_hot_desk' => $s->is_hot_desk,
                'occupied_by' => $occupantsBySeat[$s->id] ?? null,
            ])
            ->values()
            ->all();
    }

    /**
     * Build 100% real database-backed member presence list (no dummy/fake online statuses).
     */
    private function buildMembersSnapshot(PresenceService $presenceService): array
    {
        $presencesByUser = OfficePresence::query()
            ->with(['user.employeeProfile.department', 'user.employeeProfile.position', 'zone'])
            ->get()
            ->keyBy('user_id');

        return User::query()
            ->where('is_active', true)
            ->with(['employeeProfile.department', 'employeeProfile.position'])
            ->orderBy('name')
            ->get()
            ->map(function (User $member) use ($presencesByUser, $presenceService) {
                if ($presencesByUser->has($member->id)) {
                    return $presenceService->serializePresence($presencesByUser->get($member->id));
                }

                return [
                    'id' => $member->id,
                    'user_id' => $member->id,
                    'name' => $member->name,
                    'avatar_url' => $member->avatarUrl(),
                    'avatar_color' => $member->employeeProfile?->avatar_color ?? '#2563EB',
                    'position' => $member->employeeProfile?->position?->title ?? 'Team Member',
                    'department' => $member->employeeProfile?->department?->name ?? 'Krevia Digital',
                    'zone' => 'reception',
                    'zone_id' => null,
                    'status' => 'Offline',
                    'status_key' => 'offline',
                    'custom_status_text' => null,
                    'custom_status_emoji' => null,
                    'hide_current_task' => false,
                    'last_seen_at' => null,
                    'last_activity_at' => null,
                ];
            })
            ->values()
            ->all();
    }
}
