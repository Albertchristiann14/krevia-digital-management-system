<?php

namespace Tests\Feature\Phase1;

use App\Domain\Workspace\Models\AuditLog;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class AuthenticationAndRbacTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
    }

    public function test_guest_is_redirected_to_login(): void
    {
        $this->get('/dashboard')->assertRedirect('/login');
        $this->get('/organization')->assertRedirect('/login');
        $this->get('/admin/roles')->assertRedirect('/login');
    }

    public function test_team_member_can_sign_in_and_audit_log_is_recorded(): void
    {
        $response = $this->post('/login', [
            'email' => 'albert@kreviadigital.com',
            'password' => 'Krevia@2026!',
        ]);

        $response->assertRedirect('/dashboard');
        $this->assertAuthenticated();
        $this->assertDatabaseHas('audit_logs', [
            'event' => 'auth.login',
        ]);
    }

    public function test_inactive_user_cannot_sign_in(): void
    {
        $ananta = User::where('email', 'ananta@kreviadigital.com')->firstOrFail();
        $ananta->update(['is_active' => false]);

        $response = $this->post('/login', [
            'email' => 'ananta@kreviadigital.com',
            'password' => 'Krevia@2026!',
        ]);

        $response->assertSessionHasErrors('email');
        $this->assertGuest();
    }

    public function test_only_albert_and_farizy_can_manage_finance_per_d05(): void
    {
        $albert = User::where('email', 'albert@kreviadigital.com')->firstOrFail();
        $farizy = User::where('email', 'farizy@kreviadigital.com')->firstOrFail();
        $aldo = User::where('email', 'aldo@kreviadigital.com')->firstOrFail();
        $febriana = User::where('email', 'febriana@kreviadigital.com')->firstOrFail();
        $yoga = User::where('email', 'yoga@kreviadigital.com')->firstOrFail();
        $ananta = User::where('email', 'ananta@kreviadigital.com')->firstOrFail();
        $jihanz = User::where('email', 'jihanz@kreviadigital.com')->firstOrFail();

        $this->assertTrue($albert->canManageFinance());
        $this->assertTrue($farizy->canManageFinance());

        foreach ([$aldo, $febriana, $yoga, $ananta, $jihanz] as $member) {
            $this->assertFalse($member->canManageFinance(), "{$member->name} must not have finance write permission.");
        }
    }

    public function test_cannot_grant_finance_write_permissions_to_non_eligible_roles(): void
    {
        $albert = User::where('email', 'albert@kreviadigital.com')->firstOrFail();
        $ctoRole = Role::where('name', User::ROLE_CTO)->firstOrFail();

        $response = $this->actingAs($albert)->put("/admin/roles/{$ctoRole->id}/permissions", [
            'permissions' => ['dashboard.view', 'finance.manage'],
        ]);

        $response->assertSessionHasErrors('permissions');
    }

    public function test_non_admin_members_cannot_access_rbac_or_audit_logs(): void
    {
        $ananta = User::where('email', 'ananta@kreviadigital.com')->firstOrFail();
        $jihanz = User::where('email', 'jihanz@kreviadigital.com')->firstOrFail();

        $this->actingAs($ananta)->get('/admin/roles')->assertForbidden();
        $this->actingAs($ananta)->get('/admin/audit-logs')->assertForbidden();
        $this->actingAs($jihanz)->get('/admin/roles')->assertForbidden();

        $albert = User::where('email', 'albert@kreviadigital.com')->firstOrFail();
        $this->actingAs($albert)->get('/admin/roles')->assertOk();
        $this->actingAs($albert)->get('/admin/audit-logs')->assertOk();
        $this->assertGreaterThanOrEqual(0, AuditLog::count());
    }
}
