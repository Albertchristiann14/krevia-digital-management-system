<?php

namespace App\Policies;

use App\Domain\Marketing\Models\ContentItem;
use App\Models\User;

class MarketingPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermissionTo('marketing.view');
    }

    public function view(User $user, ContentItem $item): bool
    {
        return $user->hasPermissionTo('marketing.view');
    }

    public function create(User $user): bool
    {
        return $user->hasAnyPermission(['marketing.create', 'marketing.manage']);
    }

    public function update(User $user, ContentItem $item): bool
    {
        return $user->hasAnyPermission(['marketing.edit', 'marketing.manage'])
            || $item->pic_user_id === $user->id;
    }

    public function approve(User $user, ContentItem $item): bool
    {
        return $user->hasPermissionTo('marketing.approve');
    }

    public function publish(User $user, ContentItem $item): bool
    {
        return $user->hasAnyPermission(['marketing.publish', 'marketing.manage']);
    }
}
