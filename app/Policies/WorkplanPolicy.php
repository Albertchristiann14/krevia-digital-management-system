<?php

namespace App\Policies;

use App\Domain\Workplan\Models\AnnualRoadmap;
use App\Models\User;

class WorkplanPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('workplan.view');
    }

    public function update(User $user, AnnualRoadmap $roadmap): bool
    {
        return $user->can('workplan.edit') || $user->can('workplan.approve');
    }
}
