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
 * Stores only plain arrays and scalars so Redis serialization remains safe when
 * `serializable_classes` is false.
 */
class ReferenceCacheService
{
    private const TTL_SECONDS = 300; // 5 minutes

    /**
     * @return Collection<int, User>
     */
    public function activeUsers(): Collection
    {
        $rows = $this->rememberSafeArray('kdms:ref:active_users', static function (): array {
            return User::query()
                ->where('is_active', true)
                ->orderBy('id')
                ->get(['id', 'name'])
                ->map(static fn (User $u): array => [
                    'id' => $u->id,
                    'name' => $u->name,
                ])
                ->values()
                ->all();
        });

        return User::hydrate($rows);
    }

    /**
     * @return Collection<int, Department>
     */
    public function departments(): Collection
    {
        $rows = $this->rememberSafeArray('kdms:ref:departments', static function (): array {
            return Department::query()
                ->orderBy('sort_order')
                ->get(['id', 'code', 'name', 'color_hex'])
                ->map(static fn (Department $d): array => [
                    'id' => $d->id,
                    'code' => $d->code,
                    'name' => $d->name,
                    'color_hex' => $d->color_hex,
                ])
                ->values()
                ->all();
        });

        return Department::hydrate($rows);
    }

    /**
     * @return Collection<int, Position>
     */
    public function positions(): Collection
    {
        $rows = $this->rememberSafeArray('kdms:ref:positions', static function (): array {
            return Position::query()
                ->orderBy('id')
                ->get(['id', 'code', 'title', 'department_id', 'level'])
                ->map(static fn (Position $p): array => [
                    'id' => $p->id,
                    'code' => $p->code,
                    'title' => $p->title,
                    'department_id' => $p->department_id,
                    'level' => $p->level,
                ])
                ->values()
                ->all();
        });

        return Position::hydrate($rows);
    }

    public function departmentCount(): int
    {
        return $this->departments()->count();
    }

    public function raciActivityCount(): int
    {
        $key = 'kdms:ref:raci_count';
        $cached = Cache::get($key);

        if (! is_int($cached) && ! (is_string($cached) && ctype_digit($cached))) {
            Cache::forget($key);
            $cached = RaciActivity::query()->count();
            Cache::put($key, (int) $cached, self::TTL_SECONDS);
        }

        return (int) $cached;
    }

    /**
     * @return array<int, string>
     */
    public function roleNames(): array
    {
        return $this->rememberSafeArray('kdms:ref:role_names', static function (): array {
            return Role::query()
                ->orderBy('id')
                ->pluck('name')
                ->map(static fn ($name): string => (string) $name)
                ->values()
                ->all();
        });
    }

    /**
     * @return array<int, string>
     */
    public function permissionNames(): array
    {
        return $this->rememberSafeArray('kdms:ref:permission_names', static function (): array {
            return Permission::query()
                ->orderBy('name')
                ->pluck('name')
                ->map(static fn ($name): string => (string) $name)
                ->values()
                ->all();
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

    /**
     * @param  callable(): array<int, mixed>  $resolver
     * @return array<int, mixed>
     */
    private function rememberSafeArray(string $key, callable $resolver): array
    {
        $cached = Cache::get($key);

        if ($this->isSafeCachedArray($cached)) {
            return $cached;
        }

        Cache::forget($key);
        $fresh = $resolver();
        Cache::put($key, $fresh, self::TTL_SECONDS);

        return $fresh;
    }

    private function isSafeCachedArray(mixed $value): bool
    {
        if (! is_array($value)) {
            return false;
        }

        foreach ($value as $item) {
            if (is_object($item)) {
                return false;
            }
        }

        return true;
    }
}
