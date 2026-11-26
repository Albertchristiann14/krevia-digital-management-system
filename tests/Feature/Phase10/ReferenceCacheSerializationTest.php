<?php

namespace Tests\Feature\Phase10;

use App\Domain\Organization\Models\Department;
use App\Domain\Organization\Models\Position;
use App\Domain\Shared\Services\ReferenceCacheService;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class ReferenceCacheSerializationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
    }

    public function test_empty_cache_populates_plain_arrays_and_scalars_and_returns_collections(): void
    {
        $service = app(ReferenceCacheService::class);
        $service->forgetUsers();
        $service->forgetOrganization();
        $service->forgetRbac();

        $users = $service->activeUsers();
        $departments = $service->departments();
        $positions = $service->positions();
        $deptCount = $service->departmentCount();
        $raciCount = $service->raciActivityCount();
        $roles = $service->roleNames();
        $permissions = $service->permissionNames();

        $this->assertInstanceOf(Collection::class, $users);
        $this->assertInstanceOf(Collection::class, $departments);
        $this->assertInstanceOf(Collection::class, $positions);
        $this->assertIsInt($deptCount);
        $this->assertIsInt($raciCount);
        $this->assertIsArray($roles);
        $this->assertIsArray($permissions);

        $this->assertNotEmpty($users);
        $this->assertNotEmpty($departments);
        $this->assertNotEmpty($positions);

        // Underlying cache values must be pure arrays/scalars (no Eloquent/Collection objects)
        foreach (['kdms:ref:active_users', 'kdms:ref:departments', 'kdms:ref:positions', 'kdms:ref:role_names', 'kdms:ref:permission_names'] as $key) {
            $raw = Cache::get($key);
            $this->assertIsArray($raw, "Expected {$key} to be stored as array");
            foreach ($raw as $item) {
                $this->assertFalse(is_object($item), "Cache key {$key} must not contain PHP objects");
            }
        }
        $this->assertIsInt(Cache::get('kdms:ref:raci_count'));

        // Hydrated items still support object property access used by controllers
        $firstDept = $departments->first();
        $this->assertInstanceOf(Department::class, $firstDept);
        $this->assertNotNull($firstDept->id);
        $this->assertNotNull($firstDept->name);

        $firstUser = $users->first();
        $this->assertInstanceOf(User::class, $firstUser);
        $this->assertNotNull($firstUser->id);
        $this->assertNotNull($firstUser->name);

        $firstPos = $positions->first();
        $this->assertInstanceOf(Position::class, $firstPos);
        $this->assertNotNull($firstPos->title);
    }

    public function test_subsequent_calls_use_valid_cache_without_hitting_database(): void
    {
        $service = app(ReferenceCacheService::class);
        $service->forgetUsers();
        $service->forgetOrganization();
        $service->forgetRbac();

        // Warm cache
        $service->activeUsers();
        $service->departments();
        $service->positions();
        $service->raciActivityCount();
        $service->roleNames();
        $service->permissionNames();

        DB::flushQueryLog();
        DB::enableQueryLog();

        $this->assertNotEmpty($service->activeUsers());
        $this->assertNotEmpty($service->departments());
        $this->assertNotEmpty($service->positions());
        $this->assertIsInt($service->raciActivityCount());
        $this->assertNotEmpty($service->roleNames());
        $this->assertNotEmpty($service->permissionNames());

        $queries = DB::getQueryLog();
        DB::disableQueryLog();

        $this->assertCount(0, $queries);
    }

    public function test_corrupted_or_incomplete_class_cache_is_discarded_and_rebuilt(): void
    {
        $service = app(ReferenceCacheService::class);
        $incomplete = unserialize('O:29:"NonExistent\\Legacy\\Collection":0:{}', ['allowed_classes' => false]);

        Cache::put('kdms:ref:departments', $incomplete, 300);
        Cache::put('kdms:ref:active_users', [new \stdClass()], 300);
        Cache::put('kdms:ref:positions', 'corrupted-string', 300);
        Cache::put('kdms:ref:raci_count', $incomplete, 300);
        Cache::put('kdms:ref:role_names', $incomplete, 300);
        Cache::put('kdms:ref:permission_names', [new \stdClass()], 300);

        $departments = $service->departments();
        $users = $service->activeUsers();
        $positions = $service->positions();
        $raci = $service->raciActivityCount();
        $roles = $service->roleNames();
        $permissions = $service->permissionNames();

        $this->assertInstanceOf(Collection::class, $departments);
        $this->assertInstanceOf(Collection::class, $users);
        $this->assertInstanceOf(Collection::class, $positions);
        $this->assertIsInt($raci);
        $this->assertIsArray($roles);
        $this->assertIsArray($permissions);
        $this->assertNotEmpty($departments);
        $this->assertNotEmpty($users);
        $this->assertNotEmpty($positions);

        // Controllers using ReferenceCacheService render 200 OK even after corrupted cache
        Cache::put('kdms:ref:departments', $incomplete, 300);
        Cache::put('kdms:ref:active_users', $incomplete, 300);

        $albert = User::where('email', 'albert@kreviadigital.com')->firstOrFail();
        $this->actingAs($albert)->get('/dashboard')->assertOk();
        $this->actingAs($albert)->get('/admin/accounts')->assertOk();
    }

    public function test_invalidation_methods_forget_only_target_keys_and_preserve_other_cache_keys(): void
    {
        $service = app(ReferenceCacheService::class);
        $service->activeUsers();
        $service->departments();
        $service->positions();
        $service->raciActivityCount();
        $service->roleNames();
        $service->permissionNames();

        Cache::put('unrelated:session:or:custom:key', 'keep-me', 300);

        $service->forgetUsers();
        $this->assertNull(Cache::get('kdms:ref:active_users'));
        $this->assertNotNull(Cache::get('kdms:ref:departments'));
        $this->assertSame('keep-me', Cache::get('unrelated:session:or:custom:key'));

        $service->forgetOrganization();
        $this->assertNull(Cache::get('kdms:ref:departments'));
        $this->assertNull(Cache::get('kdms:ref:positions'));
        $this->assertNull(Cache::get('kdms:ref:raci_count'));
        $this->assertNotNull(Cache::get('kdms:ref:role_names'));

        $service->forgetRbac();
        $this->assertNull(Cache::get('kdms:ref:role_names'));
        $this->assertNull(Cache::get('kdms:ref:permission_names'));
        $this->assertSame('keep-me', Cache::get('unrelated:session:or:custom:key'));
    }
}
