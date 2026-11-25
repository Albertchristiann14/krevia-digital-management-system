<?php

namespace App\Policies;

use App\Domain\Portfolio\Models\DemoProduct;
use App\Models\User;

class DemoProductPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermissionTo('demos.view');
    }

    public function view(User $user, DemoProduct $demo): bool
    {
        return $user->hasPermissionTo('demos.view');
    }

    public function create(User $user): bool
    {
        return $user->hasAnyPermission(['demos.create', 'demos.manage']);
    }

    public function update(User $user, DemoProduct $demo): bool
    {
        return $user->hasAnyPermission(['demos.edit', 'demos.manage'])
            || $demo->pic_user_id === $user->id;
    }

    public function approveTechnical(User $user, DemoProduct $demo): bool
    {
        return $user->hasPermissionTo('demos.approve_technical');
    }

    public function approveCommercial(User $user, DemoProduct $demo): bool
    {
        return $user->hasPermissionTo('demos.approve_commercial');
    }
}
