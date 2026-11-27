<?php

namespace App\Http\Controllers;

use App\Domain\Shared\Services\ReferenceCacheService;
use App\Domain\Workplan\Models\AnnualRoadmap;
use App\Domain\Workplan\Models\MonthlyWorkplan;
use App\Domain\Workspace\Services\AuditLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class WorkplanController extends Controller
{
    public function roadmap(Request $request, ReferenceCacheService $refs): Response
    {
        $this->authorize('viewAny', AnnualRoadmap::class);

        $roadmaps = AnnualRoadmap::query()
            ->with('pic:id,name')
            ->withCount([
                'tasks',
                'tasks as completed_tasks_count' => fn ($q) => $q->where('status', 'Completed'),
                'tasks as in_progress_tasks_count' => fn ($q) => $q->whereIn('status', ['In Progress', 'Under Review']),
                'tasks as overdue_tasks_count' => fn ($q) => $q
                    ->whereNotIn('status', ['Completed', 'Cancelled'])
                    ->whereDate('deadline', '<', now()->startOfDay()),
            ])
            ->orderBy('period_month')
            ->get();

        $users = $refs->activeUsers();

        return Inertia::render('Workplan/Roadmap', [
            'roadmaps' => $roadmaps->map(fn (AnnualRoadmap $r) => [
                'id' => $r->id,
                'period_month' => $r->period_month->format('Y-m-d'),
                'month_label' => $r->month_label,
                'phase_label' => $r->phase_label,
                'primary_focus' => $r->primary_focus,
                'target_summary' => $r->target_summary,
                'priority_work' => $r->priority_work,
                'expected_output' => $r->expected_output,
                'pic_user_id' => $r->pic_user_id,
                'pic_name' => $r->pic?->name,
                'success_indicator' => $r->success_indicator,
                'target_contacts' => $r->target_contacts,
                'target_meetings' => $r->target_meetings,
                'target_proposals' => $r->target_proposals,
                'target_won' => $r->target_won,
                'target_status' => $r->target_status,
                'tasks_count' => $r->tasks_count,
                'completed_tasks_count' => $r->completed_tasks_count,
                'in_progress_tasks_count' => $r->in_progress_tasks_count,
                'overdue_tasks_count' => $r->overdue_tasks_count,
            ]),
            'users' => $users,
            'canEdit' => $request->user()?->can('workplan.edit') || $request->user()?->can('workplan.approve'),
        ]);
    }

    public function storeRoadmap(Request $request, AuditLogger $audit): RedirectResponse
    {
        $user = $request->user();
        abort_unless(
            $user && ($user->can('workplan.create') || $user->can('workplan.edit') || $user->can('workplan.approve')),
            403
        );

        $data = $request->validate([
            'period_month' => ['required', 'date'],
            'month_label' => ['required', 'string', 'max:100'],
            'phase_label' => ['required', 'string', 'max:120'],
            'primary_focus' => ['required', 'string', 'max:500'],
            'target_contacts' => ['required', 'integer', 'min:0', 'max:1000'],
            'target_meetings' => ['required', 'integer', 'min:0', 'max:500'],
            'target_proposals' => ['required', 'integer', 'min:0', 'max:500'],
            'target_won' => ['required', 'integer', 'min:0', 'max:500'],
            'target_status' => ['required', Rule::in(['Disepakati', 'Usulan', 'Perlu Konfirmasi Manajemen'])],
            'pic_user_id' => ['nullable', 'exists:users,id'],
        ]);

        $roadmap = AnnualRoadmap::create($data);

        $audit->log(
            'workplan.roadmap_created',
            "Created Annual Roadmap month {$roadmap->month_label}.",
            $roadmap,
            null,
            $data
        );

        return back()->with('success', "Roadmap month {$roadmap->month_label} created.");
    }

    public function updateRoadmap(Request $request, AnnualRoadmap $roadmap, AuditLogger $audit): RedirectResponse
    {
        $this->authorize('update', $roadmap);

        $data = $request->validate([
            'target_contacts' => ['required', 'integer', 'min:0', 'max:1000'],
            'target_meetings' => ['required', 'integer', 'min:0', 'max:500'],
            'target_proposals' => ['required', 'integer', 'min:0', 'max:500'],
            'target_won' => ['required', 'integer', 'min:0', 'max:500'],
            'target_status' => ['required', Rule::in(['Disepakati', 'Usulan', 'Perlu Konfirmasi Manajemen'])],
            'primary_focus' => ['required', 'string', 'max:500'],
            'pic_user_id' => ['nullable', 'exists:users,id'],
        ]);

        $old = $roadmap->only(['target_contacts', 'target_meetings', 'target_proposals', 'target_won', 'target_status']);
        $roadmap->update($data);

        $audit->log(
            'workplan.roadmap_updated',
            "Updated Annual Roadmap targets for {$roadmap->month_label}.",
            $roadmap,
            $old,
            $data
        );

        return back()->with('success', "Roadmap targets updated for {$roadmap->month_label}.");
    }

    public function destroyRoadmap(Request $request, AnnualRoadmap $roadmap, AuditLogger $audit): RedirectResponse
    {
        $user = $request->user();
        abort_unless(
            $user && ($user->can('workplan.edit') || $user->can('workplan.approve')),
            403
        );

        if ($roadmap->tasks()->exists()) {
            return back()->with('error', "Cannot delete {$roadmap->month_label} because tasks are still linked to it.");
        }

        $label = $roadmap->month_label;
        $roadmap->delete();

        $audit->log('workplan.roadmap_deleted', "Deleted Annual Roadmap month {$label}.", $roadmap);

        return back()->with('success', "Roadmap month {$label} deleted.");
    }

    public function monthly(Request $request): Response
    {
        $this->authorize('viewAny', AnnualRoadmap::class);

        $months = AnnualRoadmap::query()
            ->orderBy('period_month')
            ->get(['id', 'month_label', 'phase_label', 'primary_focus', 'period_month', 'target_status']);

        $selectedMonthId = $request->integer('month_id') ?: ($months->first()?->id ?? 0);
        $selectedMonth = $months->firstWhere('id', $selectedMonthId);

        $items = MonthlyWorkplan::query()
            ->with([
                'task.pic:id,name',
                'task.pic.employeeProfile.department:id,name,color_hex',
                'task.evidences:id,task_id',
            ])
            ->where('annual_roadmap_id', $selectedMonthId)
            ->orderBy('sort_order')
            ->get();

        return Inertia::render('Workplan/Monthly', [
            'months' => $months->map(fn ($m) => [
                'id' => $m->id,
                'month_label' => $m->month_label,
                'phase_label' => $m->phase_label,
                'primary_focus' => $m->primary_focus,
                'target_status' => $m->target_status,
            ]),
            'selectedMonthId' => $selectedMonthId,
            'selectedMonth' => $selectedMonth ? [
                'id' => $selectedMonth->id,
                'month_label' => $selectedMonth->month_label,
                'phase_label' => $selectedMonth->phase_label,
                'primary_focus' => $selectedMonth->primary_focus,
                'target_status' => $selectedMonth->target_status,
            ] : null,
            'items' => $items->map(fn (MonthlyWorkplan $item) => [
                'id' => $item->id,
                'stage_label' => $item->stage_label ?? 'Monthly Activities',
                'expected_evidence' => $item->expected_evidence,
                'evaluation_notes' => $item->evaluation_notes,
                'task' => [
                    'id' => $item->task->id,
                    'code' => $item->task->code,
                    'title' => $item->task->title,
                    'pic_name' => $item->task->pic?->name,
                    'department' => $item->task->pic?->employeeProfile?->department?->name,
                    'department_color' => $item->task->pic?->employeeProfile?->department?->color_hex,
                    'deadline' => $item->task->deadline?->format('Y-m-d'),
                    'status' => $item->task->status,
                    'progress_pct' => $item->task->progress_pct,
                    'deadline_status' => $item->task->deadlineStatus(),
                    'evidences_count' => $item->task->evidences->count(),
                ],
            ]),
            'canEdit' => $request->user()?->can('workplan.edit') || $request->user()?->can('workplan.approve'),
        ]);
    }

    public function updateMonthlyEvaluation(Request $request, MonthlyWorkplan $monthlyWorkplan, AuditLogger $audit): RedirectResponse
    {
        abort_unless($request->user()?->can('workplan.edit') || $request->user()?->can('tasks.manage'), 403);

        $data = $request->validate([
            'evaluation_notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $monthlyWorkplan->update($data);
        $audit->log(
            'workplan.evaluation_updated',
            "Updated monthly evaluation note for task {$monthlyWorkplan->task->code}.",
            $monthlyWorkplan
        );

        return back()->with('success', 'Evaluation note saved.');
    }
}
