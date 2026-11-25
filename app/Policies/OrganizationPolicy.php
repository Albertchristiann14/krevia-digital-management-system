<?php

namespace App\Policies;

use App\Domain\Organization\Models\EmployeeProfile;
use App\Models\User;

class OrganizationPolicy
{
    public function viewDirectory(User $user): bool
    {
        return $user->can('organization.view');
    }

    public function updateProfile(User $user, EmployeeProfile $profile): bool
    {
        if ($user->can('organization.manage') || $user->can('organization.edit')) {
            return true;
        }

        // Members can view their own profile, but cannot unilaterally change capacity/division without ops/leadership
        return false;
    }

    public function manageStructure(User $user): bool
    {
        return $user->can('organization.manage');
    }

    public function editRaci(User $user): bool
    {
        return $user->can('organization.manage') || $user->can('organization.edit');
    }

    public function manageRoles(User $user): bool
    {
        return $user->can('roles.manage');
    }

    public function viewAuditLogs(User $user): bool
    {
        return $user->can('audit.view');
    }
}
