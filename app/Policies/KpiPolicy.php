<?php

namespace App\Policies;

use App\Models\User;

class KpiPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasAnyPermission(['kpi.view_all', 'kpi.view_own']);
    }

    public function viewMember(User $user, int $targetUserId): bool
    {
        if ($user->hasPermissionTo('kpi.view_all')) {
            return true;
        }

        return $user->hasPermissionTo('kpi.view_own') && $user->id === $targetUserId;
    }

    public function edit(User $user): bool
    {
        return $user->hasAnyPermission(['kpi.edit', 'kpi.manage', 'kpi.approve']);
    }

    public function approve(User $user): bool
    {
        return $user->hasPermissionTo('kpi.approve');
    }
}
