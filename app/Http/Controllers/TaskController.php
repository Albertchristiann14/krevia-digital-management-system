<?php

namespace App\Http\Controllers;

use App\Domain\Workplan\Models\AnnualRoadmap;
use App\Domain\Workplan\Models\MonthlyWorkplan;
use App\Domain\Workplan\Models\Subtask;
use App\Domain\Workplan\Models\Task;
use App\Domain\Workplan\Models\TaskComment;
use App\Domain\Workplan\Models\TaskEvidence;
use App\Domain\Workplan\Models\TaskStatusHistory;
use App\Domain\Workplan\Services\TaskTransitionService;
use App\Domain\Workspace\Services\AuditLogger;
use App\Http\Requests\Workplan\StoreTaskRequest;
use App\Http\Requests\Workplan\UpdateTaskRequest;
use App\Models\User;
use App\Notifications\TaskNotification;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class TaskController extends Controller
{
    public function index(Request $request): Response
    {
        $this->authorize('viewAny', Task::class);

        $isMyTasks = $request->routeIs('tasks.mine') || $request->boolean('mine');
        $viewMode = $request->string('view', 'list')->toString();

        $query = Task::query()
            ->with([
                'pic:id,name',
                'pic.employeeProfile:id,user_id,avatar_color,department_id',
                'pic.employeeProfile.department:id,name,color_hex',
                'reviewer:id,name',
                'annualRoadmap:id,month_label,period_month',
            ])
            ->withCount(['subtasks', 'evidences', 'comments']);

        if ($isMyTasks) {
            $userId = $request->user()->id;
            $query->where(function ($q) use ($userId) {
                $q->where('pic_user_id', $userId)->orWhere('reviewer_user_id', $userId);
            });
        }

        if ($search = $request->string('search')->trim()->toString()) {
            $query->where(function ($q) use ($search) {
                $q->whereLike('code', "%{$search}%", caseSensitive: false)
                    ->orWhereLike('title', "%{$search}%", caseSensitive: false)
                    ->orWhereLike('description', "%{$search}%", caseSensitive: false);
            });
        }

        if ($status = $request->string('status')->trim()->toString()) {
            $query->where('status', $status);
        }

        if ($priority = $request->string('priority')->trim()->toString()) {
            $query->where('priority', $priority);
        }

        if ($picId = $request->integer('pic_user_id')) {
            $query->where('pic_user_id', $picId);
        }

        if ($monthId = $request->integer('annual_roadmap_id')) {
            $query->where('annual_roadmap_id', $monthId);
        }

        if ($request->boolean('overdue_only')) {
            $query->whereNotIn('status', ['Completed', 'Cancelled'])
                ->whereDate('deadline', '<', now()->startOfDay());
        }

        if ($request->boolean('blocked_only')) {
            $query->where('is_blocked', true);
        }

        $sortField = in_array($request->string('sort')->toString(), ['code', 'deadline', 'priority', 'status', 'progress_pct'], true)
            ? $request->string('sort')->toString()
            : 'deadline';
        $sortDir = $request->string('dir')->toString() === 'desc' ? 'desc' : 'asc';

        $allMatching = (clone $query)->orderBy($sortField, $sortDir)->orderBy('code')->get();

        $transform = fn (Task $t) => [
            'id' => $t->id,
            'code' => $t->code,
            'title' => $t->title,
            'description' => $t->description,
            'expected_result' => $t->expected_result,
            'pic_user_id' => $t->pic_user_id,
            'pic_name' => $t->pic?->name,
            'pic_avatar_url' => $t->pic?->avatarUrl(),
            'pic_avatar_color' => $t->pic?->employeeProfile?->avatar_color ?? '#101D35',
            'department' => $t->pic?->employeeProfile?->department?->name,
            'department_color' => $t->pic?->employeeProfile?->department?->color_hex,
            'reviewer_user_id' => $t->reviewer_user_id,
            'reviewer_name' => $t->reviewer?->name,
            'priority' => $t->priority,
            'start_date' => $t->start_date?->format('Y-m-d'),
            'deadline' => $t->deadline?->format('Y-m-d'),
            'status' => $t->status,
            'progress_pct' => $t->progress_pct,
            'is_blocked' => $t->is_blocked,
            'blocker_note' => $t->blocker_note,
            'deadline_status' => $t->deadlineStatus(),
            'month_label' => $t->annualRoadmap?->month_label,
            'subtasks_count' => $t->subtasks_count,
            'evidences_count' => $t->evidences_count,
            'comments_count' => $t->comments_count,
        ];

        $users = User::query()->where('is_active', true)->orderBy('id')->get(['id', 'name']);
        $months = AnnualRoadmap::query()->orderBy('period_month')->get(['id', 'month_label']);

        return Inertia::render('Tasks/Index', [
            'isMyTasks' => $isMyTasks,
            'viewMode' => $viewMode,
            'tasks' => $allMatching->map($transform)->values(),
            'users' => $users,
            'months' => $months,
            'statuses' => Task::STATUSES,
            'priorities' => Task::PRIORITIES,
            'filters' => [
                'search' => $request->string('search')->toString(),
                'status' => $request->string('status')->toString(),
                'priority' => $request->string('priority')->toString(),
                'pic_user_id' => $request->string('pic_user_id')->toString(),
                'annual_roadmap_id' => $request->string('annual_roadmap_id')->toString(),
                'overdue_only' => $request->boolean('overdue_only'),
                'blocked_only' => $request->boolean('blocked_only'),
                'sort' => $sortField,
                'dir' => $sortDir,
            ],
            'canCreate' => $request->user()?->can('create', Task::class) ?? false,
        ]);
    }

    public function show(Request $request, Task $task): Response
    {
        $this->authorize('view', $task);

        $task->load([
            'pic:id,name',
            'pic.employeeProfile:id,user_id,avatar_color,department_id',
            'pic.employeeProfile.department:id,name,color_hex',
            'reviewer:id,name',
            'approver:id,name',
            'annualRoadmap:id,month_label,phase_label',
            'monthlyWorkplan:id,task_id,stage_label,expected_evidence,evaluation_notes',
            'subtasks.completedBy:id,name',
            'dependencies:id,code,title,status,deadline',
            'dependents:id,code,title,status',
            'comments.user:id,name',
            'evidences.uploader:id,name',
            'statusHistories.actor:id,name',
        ]);

        $users = User::query()->where('is_active', true)->orderBy('id')->get(['id', 'name']);
        $linkableTasks = Task::query()
            ->where('id', '!=', $task->id)
            ->orderBy('code')
            ->get(['id', 'code', 'title', 'status']);

        $user = $request->user();

        return Inertia::render('Tasks/Show', [
            'task' => [
                'id' => $task->id,
                'code' => $task->code,
                'title' => $task->title,
                'description' => $task->description,
                'expected_result' => $task->expected_result,
                'pic_user_id' => $task->pic_user_id,
                'pic_name' => $task->pic?->name,
                'department' => $task->pic?->employeeProfile?->department?->name,
                'reviewer_user_id' => $task->reviewer_user_id,
                'reviewer_name' => $task->reviewer?->name,
                'approver_name' => $task->approver?->name,
                'approved_at' => $task->approved_at?->format('Y-m-d H:i'),
                'completed_at' => $task->completed_at?->format('Y-m-d H:i'),
                'priority' => $task->priority,
                'start_date' => $task->start_date?->format('Y-m-d'),
                'deadline' => $task->deadline?->format('Y-m-d'),
                'status' => $task->status,
                'progress_pct' => $task->progress_pct,
                'is_blocked' => $task->is_blocked,
                'blocker_note' => $task->blocker_note,
                'blocker_reported_at' => $task->blocker_reported_at?->format('Y-m-d H:i'),
                'notes' => $task->notes,
                'deadline_status' => $task->deadlineStatus(),
                'month_label' => $task->annualRoadmap?->month_label,
                'stage_label' => $task->monthlyWorkplan?->stage_label,
                'expected_evidence' => $task->monthlyWorkplan?->expected_evidence,
                'subtasks' => $task->subtasks->map(fn ($s) => [
                    'id' => $s->id,
                    'title' => $s->title,
                    'is_completed' => $s->is_completed,
                    'completed_by' => $s->completedBy?->name,
                ]),
                'dependencies' => $task->dependencies->map(fn ($d) => [
                    'id' => $d->id,
                    'code' => $d->code,
                    'title' => $d->title,
                    'status' => $d->status,
                    'deadline' => $d->deadline?->format('Y-m-d'),
                ]),
                'comments' => $task->comments->map(fn ($c) => [
                    'id' => $c->id,
                    'author' => $c->user?->name,
                    'body' => $c->body,
                    'created_at' => $c->created_at?->format('Y-m-d H:i'),
                ]),
                'evidences' => $task->evidences->map(fn ($ev) => [
                    'id' => $ev->id,
                    'type' => $ev->type,
                    'title' => $ev->title,
                    'url' => $ev->url,
                    'original_name' => $ev->original_name,
                    'uploader' => $ev->uploader?->name,
                    'created_at' => $ev->created_at?->format('Y-m-d H:i'),
                ]),
                'histories' => $task->statusHistories->map(fn ($h) => [
                    'id' => $h->id,
                    'from_status' => $h->from_status,
                    'to_status' => $h->to_status,
                    'actor' => $h->actor?->name ?? 'System',
                    'note' => $h->note,
                    'created_at' => $h->created_at?->format('Y-m-d H:i'),
                ]),
            ],
            'users' => $users,
            'linkableTasks' => $linkableTasks,
            'statuses' => Task::STATUSES,
            'priorities' => Task::PRIORITIES,
            'permissions' => [
                'canUpdate' => $user?->can('update', $task) ?? false,
                'canApprove' => $user?->can('approve', $task) ?? false,
                'canDelete' => $user?->can('delete', $task) ?? false,
            ],
        ]);
    }

    public function store(StoreTaskRequest $request, AuditLogger $audit): RedirectResponse
    {
        $data = $request->validated();

        $task = DB::transaction(function () use ($data, $request, $audit): Task {
            $maxNum = Task::withTrashed()
                ->where('code', 'like', 'T-%')
                ->pluck('code')
                ->map(fn (string $c) => (int) str_replace('T-', '', $c))
                ->max() ?? 135;

            $nextCode = sprintf('T-%03d', $maxNum + 1);
            $monthKey = Carbon::parse($data['deadline'])->startOfMonth()->toDateString();
            $roadmap = AnnualRoadmap::whereDate('period_month', $monthKey)->first();

            $task = Task::create([
                'code' => $nextCode,
                'annual_roadmap_id' => $roadmap?->id,
                'title' => $data['title'],
                'description' => $data['description'] ?? null,
                'expected_result' => $data['expected_result'] ?? null,
                'pic_user_id' => $data['pic_user_id'],
                'reviewer_user_id' => $data['reviewer_user_id'] ?? null,
                'priority' => $data['priority'],
                'start_date' => $data['start_date'] ?? now()->toDateString(),
                'deadline' => $data['deadline'],
                'status' => 'Not Started',
                'progress_pct' => 0,
                'notes' => $data['notes'] ?? null,
            ]);

            if ($roadmap) {
                MonthlyWorkplan::create([
                    'annual_roadmap_id' => $roadmap->id,
                    'task_id' => $task->id,
                    'stage_label' => $data['stage_label'] ?? null,
                    'expected_evidence' => $data['expected_result'] ?? null,
                    'sort_order' => 999,
                ]);
            }

            TaskStatusHistory::create([
                'task_id' => $task->id,
                'from_status' => null,
                'to_status' => 'Not Started',
                'changed_by' => $request->user()->id,
                'note' => 'Task created',
                'created_at' => now(),
            ]);

            $audit->log('task.created', "Created task {$task->code}: {$task->title}.", $task);

            if ($task->pic && $task->pic_user_id !== $request->user()->id) {
                $task->pic->notify(new TaskNotification(
                    category: 'task',
                    priority: 'normal',
                    task: $task,
                    message: "{$request->user()->name} assigned task {$task->code} ({$task->title}) to you."
                ));
            }

            return $task;
        });

        return redirect()->route('tasks.show', $task)->with('success', "Task {$task->code} created.");
    }

    public function update(UpdateTaskRequest $request, Task $task, AuditLogger $audit): RedirectResponse
    {
        $data = $request->validated();
        $old = $task->only(array_keys($data));

        if (array_key_exists('is_blocked', $data)) {
            $data['blocker_reported_at'] = $data['is_blocked'] ? ($task->blocker_reported_at ?? now()) : null;
        }

        if (isset($data['deadline'])) {
            $monthKey = Carbon::parse($data['deadline'])->startOfMonth()->toDateString();
            $roadmap = AnnualRoadmap::whereDate('period_month', $monthKey)->first();
            if ($roadmap) {
                $data['annual_roadmap_id'] = $roadmap->id;
            }
        }

        $task->update($data);
        $audit->log('task.updated', "Updated task {$task->code}.", $task, $old, $data);

        return back()->with('success', "Task {$task->code} updated.");
    }

    public function transition(
        Request $request,
        Task $task,
        TaskTransitionService $service
    ): RedirectResponse {
        $this->authorize('update', $task);

        $data = $request->validate([
            'status' => ['required', Rule::in(Task::STATUSES)],
            'note' => ['nullable', 'string', 'max:1000'],
            'progress_pct' => ['nullable', 'integer', 'min:0', 'max:100'],
        ]);

        $service->transition(
            $task,
            $data['status'],
            $request->user(),
            $data['note'] ?? null,
            $data['progress_pct'] ?? null
        );

        return back()->with('success', "Task {$task->code} moved to {$data['status']}.");
    }

    public function destroy(Task $task, AuditLogger $audit): RedirectResponse
    {
        $this->authorize('delete', $task);
        $code = $task->code;
        $task->delete();
        $audit->log('task.deleted', "Deleted task {$code}.", $task);

        return redirect()->route('tasks.index')->with('success', "Task {$code} deleted.");
    }

    public function storeSubtask(Request $request, Task $task): RedirectResponse
    {
        $this->authorize('update', $task);
        $data = $request->validate(['title' => ['required', 'string', 'max:255']]);

        $task->subtasks()->create([
            'title' => $data['title'],
            'sort_order' => $task->subtasks()->count() + 1,
        ]);

        return back()->with('success', 'Subtask added.');
    }

    public function toggleSubtask(Task $task, Subtask $subtask): RedirectResponse
    {
        $this->authorize('update', $task);
        abort_unless($subtask->task_id === $task->id, 404);

        $completed = ! $subtask->is_completed;
        $subtask->update([
            'is_completed' => $completed,
            'completed_by' => $completed ? auth()->id() : null,
            'completed_at' => $completed ? now() : null,
        ]);

        return back();
    }

    public function destroySubtask(Task $task, Subtask $subtask): RedirectResponse
    {
        $this->authorize('update', $task);
        abort_unless($subtask->task_id === $task->id, 404);
        $subtask->delete();

        return back();
    }

    public function storeDependency(Request $request, Task $task): RedirectResponse
    {
        $this->authorize('update', $task);
        $data = $request->validate([
            'depends_on_task_id' => ['required', 'exists:tasks,id'],
        ]);

        $depId = (int) $data['depends_on_task_id'];
        if ($depId === $task->id) {
            throw ValidationException::withMessages([
                'depends_on_task_id' => 'A task cannot depend on itself.',
            ]);
        }

        $reverseExists = DB::table('task_dependencies')
            ->where('task_id', $depId)
            ->where('depends_on_task_id', $task->id)
            ->exists();

        if ($reverseExists) {
            throw ValidationException::withMessages([
                'depends_on_task_id' => 'Circular dependency detected.',
            ]);
        }

        $task->dependencies()->syncWithoutDetaching([$depId]);

        return back()->with('success', 'Dependency linked.');
    }

    public function destroyDependency(Task $task, Task $dependency): RedirectResponse
    {
        $this->authorize('update', $task);
        $task->dependencies()->detach($dependency->id);

        return back();
    }

    public function storeComment(Request $request, Task $task): RedirectResponse
    {
        $this->authorize('view', $task);
        $data = $request->validate(['body' => ['required', 'string', 'max:2000']]);

        TaskComment::create([
            'task_id' => $task->id,
            'user_id' => $request->user()->id,
            'body' => $data['body'],
        ]);

        return back()->with('success', 'Comment posted.');
    }

    public function storeEvidence(Request $request, Task $task, AuditLogger $audit): RedirectResponse
    {
        $this->authorize('update', $task);

        $data = $request->validate([
            'type' => ['required', Rule::in(['file', 'url', 'commit'])],
            'title' => ['required', 'string', 'max:255'],
            'url' => ['nullable', 'string', 'max:500', 'required_if:type,url,commit'],
            'file' => ['nullable', 'file', 'max:10240', 'required_if:type,file'],
        ]);

        $filePath = null;
        $originalName = null;
        $mimeType = null;
        $fileSize = null;

        if ($data['type'] === 'file' && $request->hasFile('file')) {
            $uploaded = $request->file('file');
            $filePath = $uploaded->store("task-evidences/{$task->id}", 'local');
            $originalName = $uploaded->getClientOriginalName();
            $mimeType = $uploaded->getClientMimeType();
            $fileSize = $uploaded->getSize();
        }

        $evidence = TaskEvidence::create([
            'task_id' => $task->id,
            'type' => $data['type'],
            'title' => $data['title'],
            'url' => $data['url'] ?? null,
            'file_path' => $filePath,
            'original_name' => $originalName,
            'mime_type' => $mimeType,
            'file_size' => $fileSize,
            'uploaded_by' => $request->user()->id,
        ]);

        $audit->log('task.evidence_added', "Added evidence '{$evidence->title}' to {$task->code}.", $task);

        return back()->with('success', 'Completion evidence attached.');
    }

    public function downloadEvidence(Task $task, TaskEvidence $evidence): StreamedResponse
    {
        $this->authorize('view', $task);
        abort_unless($evidence->task_id === $task->id && $evidence->file_path, 404);
        abort_unless(Storage::disk('local')->exists($evidence->file_path), 404);

        return Storage::disk('local')->download(
            $evidence->file_path,
            $evidence->original_name ?? basename($evidence->file_path)
        );
    }

    public function destroyEvidence(Task $task, TaskEvidence $evidence): RedirectResponse
    {
        $this->authorize('update', $task);
        abort_unless($evidence->task_id === $task->id, 404);

        if ($evidence->file_path && Storage::disk('local')->exists($evidence->file_path)) {
            Storage::disk('local')->delete($evidence->file_path);
        }

        $evidence->delete();

        return back()->with('success', 'Evidence removed.');
    }
}
