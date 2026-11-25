<?php

namespace App\Policies;

use App\Models\User;

class GovernancePolicy
{
    public function viewMeetings(User $user): bool
    {
        return $user->hasPermissionTo('meetings.view');
    }

    public function manageMeetings(User $user): bool
    {
        return $user->hasAnyPermission(['meetings.create', 'meetings.edit', 'meetings.manage']);
    }

    public function viewRisks(User $user): bool
    {
        return $user->hasPermissionTo('risks.view');
    }

    public function manageRisks(User $user): bool
    {
        return $user->hasAnyPermission(['risks.create', 'risks.edit', 'risks.manage']);
    }

    public function viewDecisions(User $user): bool
    {
        return $user->hasPermissionTo('decisions.view');
    }

    public function createDecisions(User $user): bool
    {
        return $user->hasAnyPermission(['decisions.create', 'decisions.edit', 'decisions.manage']);
    }

    public function approveDecisions(User $user): bool
    {
        return $user->hasAnyPermission(['decisions.approve', 'decisions.manage']);
    }
}
