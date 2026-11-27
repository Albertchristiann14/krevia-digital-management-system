<?php

namespace App\Http\Controllers;

use App\Domain\Governance\Models\Meeting;
use App\Domain\Project\Models\Project;
use App\Domain\Workplan\Models\Task;
use App\Domain\Workspace\Models\Announcement;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class VirtualOfficeController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();

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

        $members = User::query()
            ->where('is_active', true)
            ->with(['employeeProfile.department', 'employeeProfile.position'])
            ->orderBy('name')
            ->get()
            ->map(function (User $member, int $index) {
                // Distribute members across default zones cleanly for Milestone 1 preview
                $defaultZones = ['workspace', 'workspace', 'project', 'meeting', 'reception', 'lounge', 'workspace'];
                $zone = $defaultZones[$index % count($defaultZones)];

                return [
                    'id' => $member->id,
                    'name' => $member->name,
                    'avatar_url' => $member->avatarUrl(),
                    'avatar_color' => $member->employeeProfile?->avatar_color ?? '#668CFF',
                    'position' => $member->employeeProfile?->position?->title ?? 'Team Member',
                    'department' => $member->employeeProfile?->department?->name ?? 'Krevia Digital',
                    'zone' => $zone,
                    'status' => $member->id === auth()->id() ? 'Online' : 'Available',
                ];
            })
            ->values();

        $rooms = [
            [
                'id' => 'reception',
                'name' => 'Reception & Lobby',
                'code' => 'ZONE-01',
                'accent' => '#45D8E8',
                'description' => 'Digital headquarters front desk, visitor welcome lounge, and company-wide announcement board.',
                'capacity' => 4,
                'primary_action' => [
                    'label' => 'Open Announcements',
                    'href' => '/announcements',
                ],
                'secondary_action' => [
                    'label' => 'Organization Info',
                    'href' => '/organization',
                ],
                'metrics' => [
                    ['label' => 'Announcements', 'value' => $announcementsCount],
                    ['label' => 'Active Members', 'value' => $members->count()],
                ],
            ],
            [
                'id' => 'workspace',
                'name' => 'Main Workspace',
                'code' => 'ZONE-02',
                'accent' => '#668CFF',
                'description' => 'Core engineering and operations floor with dual-monitor workstations for sprint execution.',
                'capacity' => 8,
                'primary_action' => [
                    'label' => 'Open Task Tracker',
                    'href' => $canViewTasks ? '/tasks' : '/dashboard',
                ],
                'secondary_action' => [
                    'label' => 'My Tasks',
                    'href' => $canViewTasks ? '/my-tasks' : '/dashboard',
                ],
                'metrics' => [
                    ['label' => 'In Progress / Review', 'value' => $activeTasksCount ?? '—', 'hint' => 'Team tasks currently in active execution or review'],
                    ['label' => 'My Open Backlog', 'value' => $myOpenTasksCount ?? '—', 'hint' => 'All non-completed tasks assigned to you'],
                ],
            ],
            [
                'id' => 'meeting',
                'name' => 'Meeting Room',
                'code' => 'ZONE-03',
                'accent' => '#A17AFF',
                'description' => 'Glass-walled executive conference suite for weekly syncs, client discovery, and governance reviews.',
                'capacity' => 10,
                'primary_action' => [
                    'label' => 'Open Meetings',
                    'href' => $canViewMeetings ? '/governance/meetings' : '/dashboard',
                ],
                'secondary_action' => [
                    'label' => 'Monthly Workplan',
                    'href' => '/workplan/monthly',
                ],
                'metrics' => [
                    ['label' => 'Upcoming Meetings', 'value' => $upcomingMeetingsCount ?? '—'],
                    ['label' => 'Room Seats', 'value' => 10],
                ],
            ],
            [
                'id' => 'lounge',
                'name' => 'Lounge Area',
                'code' => 'ZONE-04',
                'accent' => '#42C99A',
                'description' => 'Casual collaboration lounge for informal check-ins, coffee breaks, and team directory browsing.',
                'capacity' => 6,
                'primary_action' => [
                    'label' => 'Member Directory',
                    'href' => $canViewPeople ? '/people' : '/my-account',
                ],
                'secondary_action' => [
                    'label' => 'My Account',
                    'href' => '/my-account',
                ],
                'metrics' => [
                    ['label' => 'Team Members', 'value' => $members->count()],
                    ['label' => 'Status', 'value' => 'Open'],
                ],
            ],
            [
                'id' => 'project',
                'name' => 'Project Room',
                'code' => 'ZONE-05',
                'accent' => '#F4B860',
                'description' => 'Dedicated delivery war-room for Website & Custom Software milestones, architecture, and QA.',
                'capacity' => 6,
                'primary_action' => [
                    'label' => 'Open Projects',
                    'href' => $canViewProjects ? '/projects' : '/dashboard',
                ],
                'secondary_action' => [
                    'label' => 'Annual Roadmap',
                    'href' => '/workplan/roadmap',
                ],
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

        return Inertia::render('VirtualOffice/Index', [
            'rooms' => $rooms,
            'members' => $members,
            'recentAnnouncements' => $recentAnnouncements,
        ]);
    }
}
