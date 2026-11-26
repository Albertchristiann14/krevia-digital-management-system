<?php

namespace Tests\Feature\Phase10;

use App\Domain\Workspace\Models\AuditLog;
use App\Models\DigitalIdentity;
use App\Models\User;
use App\Services\Identity\DigitalIdentityService;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class DigitalIdentityAndDirectoryTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
    }

    public function test_eligible_member_automatically_receives_unique_qr_identity_and_resolves_publicly(): void
    {
        $yoga = User::where('email', 'yoga@kreviadigital.com')->firstOrFail();

        $this->actingAs($yoga)
            ->get('/my-account?tab=identity')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('digitalIdentity.status', 'active')
                ->whereNotNull('digitalIdentity.public_url')
            );

        $identity = DigitalIdentity::where('user_id', $yoga->id)->firstOrFail();
        $rawToken = $identity->token_encrypted;

        $this->assertNotEmpty($rawToken);
        $this->assertSame(hash('sha256', $rawToken), $identity->token_hash);
        $this->assertMatchesRegularExpression('/^[a-f0-9]{48}$/', $rawToken);

        // Public guest scan resolves verified state, hiding email & whatsapp by default
        auth()->logout();
        $this->get('/id/'.$rawToken)
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Identity/Show')
                ->where('verificationState', 'verified')
                ->where('member.name', $yoga->name)
                ->where('member.email', null)
                ->where('member.whatsapp_number', null)
                ->where('member.employee_code', null)
            );
    }

    public function test_public_visibility_toggles_control_email_and_whatsapp_exposure(): void
    {
        $yoga = User::where('email', 'yoga@kreviadigital.com')->firstOrFail();
        $yoga->employeeProfile()->update(['whatsapp_number' => '+628123456789']);
        $identity = app(DigitalIdentityService::class)->ensureForUser($yoga);

        $this->actingAs($yoga)
            ->patch('/my-account/identity/visibility', [
                'show_email' => true,
                'show_whatsapp' => true,
            ])
            ->assertRedirect();

        auth()->logout();
        $this->get('/id/'.$identity->token_encrypted)
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('verificationState', 'verified')
                ->where('member.email', 'yoga@kreviadigital.com')
                ->where('member.whatsapp_number', '+628123456789')
            );
    }

    public function test_invalid_inactive_revoked_and_suspended_qr_states_hide_member_data(): void
    {
        $yoga = User::where('email', 'yoga@kreviadigital.com')->firstOrFail();
        $service = app(DigitalIdentityService::class);
        $identity = $service->ensureForUser($yoga);
        $oldToken = $identity->token_encrypted;

        // 1. Invalid token
        $this->get('/id/nonexistent-invalid-token-1234567890')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('verificationState', 'invalid')
                ->where('member', null)
            );

        // 2. Deactivated QR
        $this->actingAs($yoga)
            ->patch('/my-account/identity/status', ['active' => false])
            ->assertRedirect();

        auth()->logout();
        $this->get('/id/'.$oldToken)
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('verificationState', 'inactive')
                ->where('member', null)
            );

        // 3. Regenerated QR revokes old token immediately
        $this->actingAs($yoga)
            ->post('/my-account/identity/regenerate')
            ->assertRedirect();

        $newIdentity = DigitalIdentity::where('user_id', $yoga->id)
            ->where('status', 'active')
            ->firstOrFail();
        $newToken = $newIdentity->token_encrypted;
        $this->assertNotSame($oldToken, $newToken);

        auth()->logout();
        $this->get('/id/'.$oldToken)
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('verificationState', 'revoked')
                ->where('member', null)
            );

        // 4. Suspended / inactive account
        $yoga->forceFill(['is_active' => false])->save();
        $this->get('/id/'.$newToken)
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('verificationState', 'suspended')
                ->where('member', null)
            );

        // Raw QR tokens must never be logged in AuditLog
        $auditLogs = AuditLog::where('user_id', $yoga->id)->pluck('summary')->implode(' ');
        $this->assertStringNotContainsString($oldToken, $auditLogs);
        $this->assertStringNotContainsString($newToken, $auditLogs);
    }

    public function test_unauthorized_user_cannot_manage_another_members_qr_code(): void
    {
        $yoga = User::where('email', 'yoga@kreviadigital.com')->firstOrFail();
        $albert = User::where('email', 'albert@kreviadigital.com')->firstOrFail();

        $this->actingAs($yoga)
            ->post("/people/{$albert->id}/identity/regenerate")
            ->assertForbidden();

        $this->actingAs($yoga)
            ->patch("/people/{$albert->id}/identity/status", ['active' => false])
            ->assertForbidden();
    }

    public function test_member_directory_supports_search_filters_pagination_and_privacy(): void
    {
        $yoga = User::where('email', 'yoga@kreviadigital.com')->firstOrFail();
        $albert = User::where('email', 'albert@kreviadigital.com')->firstOrFail();

        $this->actingAs($yoga)
            ->get('/people')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('People/Index')
                ->has('members.data')
                ->where('members.data.0', function ($item) {
                    $arr = $item->toArray();

                    return ! array_key_exists('password', $arr)
                        && ! array_key_exists('last_login_ip', $arr)
                        && ! array_key_exists('notification_preferences', $arr)
                        && $arr['employee_code'] === null;
                })
            );

        // Search by name
        $this->actingAs($yoga)
            ->get('/people?search=Albert')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('members.data', 1)
                ->where('members.data.0.name', 'Albert Christian')
            );

        // View member detail hides private fields unless allowed
        $this->actingAs($yoga)
            ->get("/people/{$albert->id}")
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('People/Show')
                ->where('member.name', 'Albert Christian')
                ->where('member.employee_code', null)
                ->where('permissions.can_manage_identity', false)
            );
    }

    public function test_member_without_organization_view_permission_cannot_access_directory(): void
    {
        $restrictedRole = Role::create(['name' => 'External Guest', 'guard_name' => 'web']);
        $guestUser = User::factory()->create(['is_active' => true]);
        $guestUser->assignRole($restrictedRole);

        $this->actingAs($guestUser)->get('/people')->assertForbidden();
    }

    public function test_dark_mode_light_dark_and_system_preferences_persist_across_navigation(): void
    {
        $yoga = User::where('email', 'yoga@kreviadigital.com')->firstOrFail();

        foreach (['dark', 'system', 'light'] as $mode) {
            $this->actingAs($yoga)
                ->patch('/my-account/preferences', [
                    'theme' => $mode,
                    'language' => 'en',
                    'timezone' => 'Asia/Jakarta',
                    'date_format' => 'DD/MM/YYYY',
                    'compact_mode' => 'comfortable',
                ])
                ->assertRedirect();

            $this->actingAs($yoga)
                ->get('/dashboard')
                ->assertOk()
                ->assertInertia(fn (Assert $page) => $page
                    ->where('auth.user.preferences.theme', $mode)
                );
        }
    }

    public function test_uploaded_profile_photo_propagates_across_modules_with_cache_busting(): void
    {
        Storage::fake('public');
        $albert = User::where('email', 'albert@kreviadigital.com')->firstOrFail();

        $file = UploadedFile::fake()->image('albert.png', 200, 200);
        $this->actingAs($albert)
            ->post('/my-account/avatar', ['avatar' => $file])
            ->assertRedirect();

        $albert->refresh();
        $expectedUrl = $albert->avatarUrl();
        $this->assertNotNull($expectedUrl);
        $this->assertStringContainsString('?v=', $expectedUrl);

        $this->actingAs($albert)
            ->get('/people?search=Albert')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('members.data.0.avatar_url', $expectedUrl)
            );

        $this->actingAs($albert)
            ->get('/admin/accounts')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('accounts', function ($accounts) use ($albert, $expectedUrl) {
                    foreach ($accounts as $acc) {
                        if ($acc['id'] === $albert->id) {
                            return $acc['avatar_url'] === $expectedUrl;
                        }
                    }

                    return false;
                })
            );
    }
}
