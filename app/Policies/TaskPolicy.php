<?php

namespace App\Policies;

use App\Domain\Workplan\Models\Task;
use App\Models\User;

class TaskPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('tasks.view');
    }

    public function view(User $user, Task $task): bool
    {
        return $user->can('tasks.view');
    }

    public function create(User $user): bool
    {
        return $user->can('tasks.create') || $user->can('tasks.manage');
    }

    public function update(User $user, Task $task): bool
    {
        if ($user->can('tasks.manage') || $user->can('tasks.assign')) {
            return true;
        }

        if ($user->can('tasks.edit')) {
            return $task->pic_user_id === $user->id || $task->reviewer_user_id === $user->id;
        }

        return false;
    }

    public function delete(User $user, Task $task): bool
    {
        return $user->can('tasks.delete') || $user->can('tasks.manage');
    }

    public function approve(User $user, Task $task): bool
    {
        return $user->can('tasks.approve') || $task->reviewer_user_id === $user->id;
    }
}
