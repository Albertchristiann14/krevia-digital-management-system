<?php

namespace App\Policies;

use App\Domain\Project\Models\Project;
use App\Models\User;

class ProjectPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('projects.view');
    }

    public function view(User $user, Project $project): bool
    {
        return $user->can('projects.view');
    }

    public function create(User $user): bool
    {
        return $user->can('projects.create') || $user->can('projects.manage');
    }

    public function update(User $user, Project $project): bool
    {
        if ($user->can('projects.manage') || $user->can('projects.edit')) {
            return true;
        }

        return $project->members()->where('user_id', $user->id)->exists();
    }

    public function delete(User $user, Project $project): bool
    {
        return $user->can('projects.delete') || $user->can('projects.manage');
    }
}
