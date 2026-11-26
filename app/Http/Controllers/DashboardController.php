<?php

namespace App\Http\Controllers;

use App\Domain\Crm\Models\Lead;
use App\Domain\Finance\Services\CashflowService;
use App\Domain\Organization\Models\EmployeeProfile;
use App\Domain\Organization\Models\RaciActivity;
use App\Domain\Project\Models\Project;
use App\Domain\Shared\Services\ReferenceCacheService;
use App\Domain\Workplan\Models\AnnualRoadmap;
use App\Domain\Workplan\Models\Task;
use App\Domain\Workspace\Models\Announcement;
use App\Domain\Workspace\Models\AuditLog;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(Request $request, CashflowService $cashflow, ReferenceCacheService $refs): Response
    {
        $user = $request->user();
        $today = now()->startOfDay();
        $soonCutoff = $today->copy()->addDays(3);

        $allTasks = Task::query()
            ->with('pic:id,name')
            ->get(['id', 'code', 'title', 'pic_user_id', 'reviewer_user_id', 'priority', 'deadline', 'status', 'progress_pct', 'is_blocked']);

        $totalTasks = $allTasks->count();
        $completedTasks = $allTasks->where('status', 'Completed')->count();
        $inProgressTasks = $allTasks->whereIn('status', ['In Progress', 'Under Review'])->count();
        $overdueTasks = $allTasks->filter(fn (Task $t) => $t->isOverdue($today))->count();
        $dueSoonTasks = $allTasks->filter(fn (Task $t) => $t->isDueSoon($today))->count();
        $blockedTasks = $allTasks->where('is_blocked', true)->count();
        $avgProgress = $totalTasks > 0 ? round((float) $allTasks->avg('progress_pct'), 1) : 0;

        $tasksByStatus = collect(Task::STATUSES)->map(fn (string $status) => [
            'status' => $status,
            'count' => $allTasks->where('status', $status)->count(),
            'pct' => $totalTasks > 0 ? round(($allTasks->where('status', $status)->count() / $totalTasks) * 100, 1) : 0,
        ])->values();

        $profiles = EmployeeProfile::query()
            ->with(['user:id,name,email,is_active', 'department:id,code,name,color_hex', 'position:id,code,title,level'])
            ->orderBy('employee_code')
            ->get();

        $team = $profiles->map(function (EmployeeProfile $p) use ($allTasks, $today) {
            $memberTasks = $allTasks->where('pic_user_id', $p->user_id);

            return [
                'id' => $p->id,
                'user_id' => $p->user_id,
                'code' => $p->employee_code,
                'name' => $p->user?->name,
                'position' => $p->position?->title,
                'department' => $p->department?->name,
                'department_color' => $p->department?->color_hex,
                'weekly_capacity_hours' => $p->weekly_capacity_hours !== null ? (float) $p->weekly_capacity_hours : null,
                'capacity_status' => $p->capacity_status,
                'coordination_status' => $p->coordination_status,
                'avatar_color' => $p->avatar_color,
                'total_tasks' => $memberTasks->count(),
                'completed_tasks' => $memberTasks->where('status', 'Completed')->count(),
                'active_tasks' => $memberTasks->whereIn('status', ['In Progress', 'Under Review'])->count(),
                'overdue_tasks' => $memberTasks->filter(fn (Task $t) => $t->isOverdue($today))->count(),
            ];
        });

        $monthlyRoadmap = AnnualRoadmap::query()
            ->withCount([
                'tasks',
                'tasks as completed_tasks_count' => fn ($q) => $q->where('status', 'Completed'),
            ])
            ->orderBy('period_month')
            ->get()
            ->map(fn (AnnualRoadmap $r) => [
                'id' => $r->id,
                'month' => $r->month_label,
                'short_month' => $r->period_month->format('M y'),
                'phase' => $r->phase_label,
                'due_tasks' => $r->tasks_count,
                'completed_tasks' => $r->completed_tasks_count,
                'target_contacts' => $r->target_contacts,
                'target_meetings' => $r->target_meetings,
                'target_proposals' => $r->target_proposals,
                'target_won' => $r->target_won,
                'target_status' => $r->target_status,
            ]);

        $upcomingDeadlines = $allTasks
            ->filter(fn (Task $t) => ! $t->isClosed())
            ->sortBy('deadline')
            ->take(6)
            ->values()
            ->map(fn (Task $t) => [
                'id' => $t->id,
                'code' => $t->code,
                'title' => $t->title,
                'pic_name' => $t->pic?->name,
                'priority' => $t->priority,
                'deadline' => $t->deadline?->format('Y-m-d'),
                'status' => $t->status,
                'deadline_status' => $t->deadlineStatus($today),
            ]);

        $pendingApprovals = $allTasks
            ->where('status', 'Under Review')
            ->take(6)
            ->values()
            ->map(fn (Task $t) => [
                'id' => $t->id,
                'code' => $t->code,
                'title' => $t->title,
                'pic_name' => $t->pic?->name,
                'deadline' => $t->deadline?->format('Y-m-d'),
            ]);

        $myTasks = $allTasks
            ->where('pic_user_id', $user->id)
            ->filter(fn (Task $t) => ! $t->isClosed())
            ->sortBy('deadline')
            ->take(5)
            ->values()
            ->map(fn (Task $t) => [
                'id' => $t->id,
                'code' => $t->code,
                'title' => $t->title,
                'priority' => $t->priority,
                'deadline' => $t->deadline?->format('Y-m-d'),
                'status' => $t->status,
                'progress_pct' => $t->progress_pct,
                'deadline_status' => $t->deadlineStatus($today),
            ]);

        $pendingConfirmations = $profiles->whereNull('weekly_capacity_hours')->count()
            + $profiles->where('coordination_status', '!=', 'Sesuai arahan')->count()
            + RaciActivity::where('data_status', '!=', 'Disepakati')->count();

        $leadAgg = Lead::query()
            ->selectRaw(
                "COUNT(*) as total_prospects, "
                ."COUNT(discovery_meeting_at) as discovery_meetings, "
                ."COUNT(proposal_sent_at) as proposals_sent, "
                ."COALESCE(SUM(CASE WHEN stage = 'Won' THEN 1 ELSE 0 END), 0) as won_projects"
            )
            ->first();

        $pipelineSummary = [
            'total_prospects' => (int) ($leadAgg->total_prospects ?? 0),
            'discovery_meetings' => (int) ($leadAgg->discovery_meetings ?? 0),
            'proposals_sent' => (int) ($leadAgg->proposals_sent ?? 0),
            'won_projects' => (int) ($leadAgg->won_projects ?? 0),
            'active_projects' => Project::where('status', 'Active')->count(),
        ];

        $recentAudits = AuditLog::query()
            ->with('user:id,name')
            ->latest('created_at')
            ->limit(6)
            ->get()
            ->map(fn (AuditLog $log) => [
                'id' => $log->id,
                'event' => $log->event,
                'summary' => $log->summary,
                'actor' => $log->user?->name ?? 'System',
                'created_at' => $log->created_at?->format('Y-m-d H:i'),
            ]);

        $canViewFinance = $user->hasPermissionTo('finance.view');
        $financeSummary = $canViewFinance ? $cashflow->getSummary() : null;

        $userDepartmentId = $user->employeeProfile?->department_id;
        $recentAnnouncements = Announcement::query()
            ->with('publisher:id,name')
            ->whereNotNull('published_at')
            ->latest('published_at')
            ->latest('id')
            ->limit(15)
            ->get()
            ->filter(function (Announcement $a) use ($user, $userDepartmentId): bool {
                if ($a->audience_type === 'all') {
                    return true;
                }
                if ($a->audience_type === 'department') {
                    return $userDepartmentId !== null && (int) $a->department_id === (int) $userDepartmentId;
                }
                if ($a->audience_type === 'selected') {
                    return in_array($user->id, array_map('intval', $a->recipient_user_ids ?? []), true);
                }

                return false;
            })
            ->take(3)
            ->values()
            ->map(fn (Announcement $a) => [
                'id' => $a->id,
                'code' => $a->code,
                'title' => $a->title,
                'body' => $a->body,
                'priority' => $a->priority,
                'publisher' => $a->publisher?->name ?? 'Management',
                'published_at' => $a->published_at?->format('Y-m-d H:i'),
            ]);

        return Inertia::render('Dashboard/Index', [
            'metrics' => [
                'total_tasks' => $totalTasks,
                'completed_tasks' => $completedTasks,
                'in_progress_tasks' => $inProgressTasks,
                'overdue_tasks' => $overdueTasks,
                'due_soon_tasks' => $dueSoonTasks,
                'blocked_tasks' => $blockedTasks,
                'avg_progress' => $avgProgress,
                'team_members' => $profiles->count(),
                'departments' => $refs->departmentCount(),
                'raci_activities' => $refs->raciActivityCount(),
                'pending_confirmations' => $pendingConfirmations,
                'roadmap_months' => $monthlyRoadmap->count(),
                ...$pipelineSummary,
                'revenue_received' => $financeSummary ? $financeSummary['revenue_received'] : null,
                'total_expenses' => $financeSummary ? $financeSummary['total_expenses'] : null,
                'cash_balance' => $financeSummary ? $financeSummary['cash_balance'] : null,
            ],
            'canViewFinance' => $canViewFinance,
            'tasksByStatus' => $tasksByStatus,
            'monthlyRoadmap' => $monthlyRoadmap,
            'team' => $team,
            'upcomingDeadlines' => $upcomingDeadlines,
            'pendingApprovals' => $pendingApprovals,
            'myTasks' => $myTasks,
            'recentAudits' => $recentAudits,
            'recentAnnouncements' => $recentAnnouncements,
        ]);
    }
}
