<?php

namespace App\Domain\Shared\Services;

use App\Domain\Organization\Models\Department;
use App\Domain\Organization\Models\Position;
use App\Domain\Organization\Models\RaciActivity;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

/**
 * Caches low-churn, non-sensitive reference data with explicit invalidation hooks.
 * Never caches financial data, user credentials, or user-private records.
 */
class ReferenceCacheService
{
    private const TTL_SECONDS = 300; // 5 minutes

    /**
     * @return Collection<int, User>
     */
    public function activeUsers(): Collection
    {
        return Cache::remember('kdms:ref:active_users', self::TTL_SECONDS, function () {
            return User::query()->where('is_active', true)->orderBy('id')->get(['id', 'name']);
        });
    }

    /**
     * @return Collection<int, Department>
     */
    public function departments(): Collection
    {
        return Cache::remember('kdms:ref:departments', self::TTL_SECONDS, function () {
            return Department::query()->orderBy('sort_order')->get(['id', 'code', 'name', 'color_hex']);
        });
    }

    /**
     * @return Collection<int, Position>
     */
    public function positions(): Collection
    {
        return Cache::remember('kdms:ref:positions', self::TTL_SECONDS, function () {
            return Position::query()->orderBy('id')->get(['id', 'code', 'title', 'department_id', 'level']);
        });
    }

    public function departmentCount(): int
    {
        return $this->departments()->count();
    }

    public function raciActivityCount(): int
    {
        return (int) Cache::remember('kdms:ref:raci_count', self::TTL_SECONDS, function () {
            return RaciActivity::query()->count();
        });
    }

    /**
     * @return array<int, string>
     */
    public function roleNames(): array
    {
        return Cache::remember('kdms:ref:role_names', self::TTL_SECONDS, function () {
            return Role::query()->orderBy('id')->pluck('name')->values()->all();
        });
    }

    /**
     * @return array<int, string>
     */
    public function permissionNames(): array
    {
        return Cache::remember('kdms:ref:permission_names', self::TTL_SECONDS, function () {
            return Permission::query()->orderBy('name')->pluck('name')->values()->all();
        });
    }

    public function forgetUsers(): void
    {
        Cache::forget('kdms:ref:active_users');
    }

    public function forgetOrganization(): void
    {
        Cache::forget('kdms:ref:departments');
        Cache::forget('kdms:ref:positions');
        Cache::forget('kdms:ref:raci_count');
    }

    public function forgetRbac(): void
    {
        Cache::forget('kdms:ref:role_names');
        Cache::forget('kdms:ref:permission_names');
    }
}
