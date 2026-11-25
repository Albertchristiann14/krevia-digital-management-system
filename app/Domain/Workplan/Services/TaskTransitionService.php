<?php

namespace App\Domain\Workplan\Services;

use App\Domain\Workplan\Models\Task;
use App\Domain\Workplan\Models\TaskStatusHistory;
use App\Domain\Workspace\Services\AuditLogger;
use App\Models\User;
use App\Notifications\TaskNotification;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class TaskTransitionService
{
    public function __construct(private readonly AuditLogger $audit) {}

    public function transition(
        Task $task,
        string $newStatus,
        User $actor,
        ?string $note = null,
        ?int $progressPct = null
    ): Task {
        if (! in_array($newStatus, Task::STATUSES, true)) {
            throw ValidationException::withMessages([
                'status' => "Invalid task status '{$newStatus}'.",
            ]);
        }

        $oldStatus = $task->status;

        if ($newStatus === 'Completed') {
            if (! $task->evidences()->exists()) {
                throw ValidationException::withMessages([
                    'status' => "Task {$task->code} cannot be completed without completion evidence (file, link, or commit reference).",
                ]);
            }

            $openDependencies = $task->dependencies()
                ->whereNotIn('status', ['Completed'])
                ->pluck('code')
                ->all();

            if ($openDependencies !== []) {
                $codes = implode(', ', $openDependencies);
                throw ValidationException::withMessages([
                    'status' => "Task {$task->code} is blocked by incomplete dependencies: {$codes}.",
                ]);
            }

            if ($task->reviewer_user_id !== null || $oldStatus === 'Under Review') {
                $isAssignedReviewer = $task->reviewer_user_id === $actor->id;
                $canApprove = $actor->can('tasks.approve');
                if (! $isAssignedReviewer && ! $canApprove) {
                    throw new AuthorizationException(
                        'Only the assigned reviewer or an authorized approver can mark this task as Completed.'
                    );
                }
            }
        }

        return DB::transaction(function () use ($task, $oldStatus, $newStatus, $actor, $note, $progressPct): Task {
            $updates = [
                'status' => $newStatus,
            ];

            if ($newStatus === 'Completed') {
                $updates['progress_pct'] = 100;
                $updates['completed_at'] = now();
                $updates['approved_by'] = $actor->id;
                $updates['approved_at'] = now();
                $updates['is_blocked'] = false;
            } elseif ($newStatus === 'Under Review') {
                $updates['progress_pct'] = $progressPct ?? max($task->progress_pct, 90);
                $updates['completed_at'] = null;
            } elseif ($newStatus === 'In Progress') {
                $updates['progress_pct'] = $progressPct ?? max($task->progress_pct, 10);
                $updates['completed_at'] = null;
            } elseif ($newStatus === 'Not Started') {
                $updates['progress_pct'] = $progressPct ?? 0;
                $updates['completed_at'] = null;
            } elseif ($progressPct !== null) {
                $updates['progress_pct'] = $progressPct;
            }

            $task->update($updates);

            TaskStatusHistory::create([
                'task_id' => $task->id,
                'from_status' => $oldStatus,
                'to_status' => $newStatus,
                'changed_by' => $actor->id,
                'note' => $note,
                'created_at' => now(),
            ]);

            $this->audit->log(
                'task.status_changed',
                "Task {$task->code} transitioned from {$oldStatus} to {$newStatus}.",
                $task,
                ['status' => $oldStatus],
                ['status' => $newStatus, 'note' => $note],
                $actor->id
            );

            // Dispatch notifications
            if ($newStatus === 'Under Review' && $task->reviewer) {
                $task->reviewer->notify(new TaskNotification(
                    category: 'review',
                    priority: 'high',
                    task: $task,
                    message: "{$actor->name} submitted {$task->code} ({$task->title}) for your review."
                ));
            } elseif ($newStatus === 'Completed' && $task->pic && $task->pic_user_id !== $actor->id) {
                $task->pic->notify(new TaskNotification(
                    category: 'task',
                    priority: 'normal',
                    task: $task,
                    message: "{$actor->name} approved and completed {$task->code} ({$task->title})."
                ));
            }

            return $task->fresh();
        });
    }
}
