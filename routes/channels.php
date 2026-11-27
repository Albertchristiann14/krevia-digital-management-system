<?php

use App\Domain\VirtualOffice\Models\OfficeZone;
use App\Models\User;
use Illuminate\Support\Facades\Broadcast;

/*
|--------------------------------------------------------------------------
| Virtual Office Broadcast Channels (Authenticated & Role/Active Enforced)
|--------------------------------------------------------------------------
*/

Broadcast::channel('office.presence', function (User $user): array|bool {
    if (! $user->is_active) {
        return false;
    }

    $user->loadMissing(['employeeProfile.department', 'employeeProfile.position']);

    return [
        'id' => $user->id,
        'name' => $user->name,
        'avatar_url' => $user->avatarUrl(),
        'avatar_color' => $user->employeeProfile?->avatar_color ?? '#2563EB',
        'position' => $user->employeeProfile?->position?->title ?? 'Team Member',
        'department' => $user->employeeProfile?->department?->name ?? 'Krevia Digital',
    ];
});

Broadcast::channel('office.zone.{zoneId}', function (User $user, int $zoneId): bool {
    if (! $user->is_active) {
        return false;
    }

    return OfficeZone::query()
        ->whereKey($zoneId)
        ->where('is_active', true)
        ->exists();
});

Broadcast::channel('office.dm.{userId}', function (User $user, int $userId): bool {
    return $user->is_active && (int) $user->id === $userId;
});
