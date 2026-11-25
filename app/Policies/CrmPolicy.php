<?php

namespace App\Policies;

use App\Domain\Crm\Models\Lead;
use App\Models\User;

class CrmPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('crm.view');
    }

    public function view(User $user, Lead $lead): bool
    {
        return $user->can('crm.view');
    }

    public function create(User $user): bool
    {
        return $user->can('crm.create') || $user->can('crm.manage');
    }

    public function update(User $user, Lead $lead): bool
    {
        return $user->can('crm.edit') || $user->can('crm.manage');
    }

    public function delete(User $user, Lead $lead): bool
    {
        return $user->can('crm.delete') || $user->can('crm.manage');
    }

    public function convertToProject(User $user, Lead $lead): bool
    {
        return $user->can('crm.manage') || $user->can('projects.create');
    }
}
