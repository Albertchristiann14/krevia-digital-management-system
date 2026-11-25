<?php

namespace App\Policies;

use App\Models\User;

class FinancePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermissionTo('finance.view');
    }

    public function view(User $user): bool
    {
        return $user->hasPermissionTo('finance.view');
    }

    public function manage(User $user): bool
    {
        return $user->canManageFinance();
    }

    public function create(User $user): bool
    {
        return $user->canManageFinance();
    }

    public function update(User $user): bool
    {
        return $user->canManageFinance();
    }

    public function delete(User $user): bool
    {
        return $user->canManageFinance();
    }
}
