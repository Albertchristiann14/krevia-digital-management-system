<?php

namespace Tests\Feature\Phase7;

use App\Domain\Organization\Models\Department;
use App\Domain\Organization\Models\Position;
use App\Domain\Workspace\Models\Announcement;
use App\Domain\Workspace\Models\NotificationDeliveryLog;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class AccountsAnnouncementsAndMultiChannelTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
    }

    public function test_three_executives_can_manage_accounts_while_non_executives_receive_403(): void
    {
        $albert = User::where('email', 'albert@kreviadigital.com')->firstOrFail();
        $farizy = User::where('email', 'farizy@kreviadigital.com')->firstOrFail();
        $aldo = User::where('email', 'aldo@kreviadigital.com')->firstOrFail();

        $febriana = User::where('email', 'febriana@kreviadigital.com')->firstOrFail();
        $yoga = User::where('email', 'yoga@kreviadigital.com')->firstOrFail();
        $ananta = User::where('email', 'ananta@kreviadigital.com')->firstOrFail();
        $jihanz = User::where('email', 'jihanz@kreviadigital.com')->firstOrFail();

        foreach ([$albert, $farizy, $aldo] as $exec) {
            $this->actingAs($exec)
                ->get('/admin/accounts')
                ->assertOk()
                ->assertInertia(fn (Assert $page) => $page->component('Admin/Accounts'));

            $this->actingAs($exec)->get('/admin/notifications-settings')->assertOk();
        }

        foreach ([$febriana, $yoga, $ananta, $jihanz] as $nonExec) {
            $this->actingAs($nonExec)->get('/admin/accounts')->assertForbidden();
            $this->actingAs($nonExec)->post('/admin/accounts', [])->assertForbidden();
            $this->actingAs($nonExec)->get('/admin/notifications-settings')->assertForbidden();
            $this->actingAs($nonExec)->post('/announcements', [])->assertForbidden();
        }
    }

    public function test_executive_account_lifecycle_create_edit_email_whatsapp_passwords_deactivate_delete_restore(): void
    {
        $albert = User::where('email', 'albert@kreviadigital.com')->firstOrFail();
        $farizy = User::where('email', 'farizy@kreviadigital.com')->firstOrFail();
        $aldo = User::where('email', 'aldo@kreviadigital.com')->firstOrFail();

        $dept = Department::firstOrFail();
        $pos = Position::firstOrFail();

        // CTO cannot assign Founder role (D-05 guard)
        $this->actingAs($aldo)->post('/admin/accounts', [
            'name' => 'Blocked Escalation',
            'email' => 'escalate@kreviadigital.com',
            'password' => 'InitialPass#2026',
            'password_confirmation' => 'InitialPass#2026',
            'role' => User::ROLE_FOUNDER,
            'department_id' => $dept->id,
            'position_id' => $pos->id,
            'employment_status' => 'Active',
        ])->assertSessionHasErrors('role');

        // 1. CTO creates a new member with initial password & Indonesian WhatsApp number
        $this->actingAs($aldo)->post('/admin/accounts', [
            'name' => 'Sarah Putri',
            'email' => 'sarah@kreviadigital.com',
            'password' => 'InitialPass#2026',
            'password_confirmation' => 'InitialPass#2026',
            'must_change_password' => true,
            'role' => User::ROLE_TECH_CONTRIBUTOR,
            'department_id' => $dept->id,
            'position_id' => $pos->id,
            'employment_status' => 'Active',
            'whatsapp_number' => '0812-3456-7890',
            'notification_email' => 'sarah.gmail@gmail.com',
        ])->assertRedirect();

        $sarah = User::where('email', 'sarah@kreviadigital.com')->firstOrFail();
        $this->assertTrue($sarah->must_change_password);
        $this->assertEquals('6281234567890', $sarah->employeeProfile->whatsapp_number);
        $this->assertEquals('sarah.gmail@gmail.com', $sarah->routeNotificationForMail());

        // 2. Member logs in with initial password and updates own password
        $this->post('/login', [
            'email' => 'sarah@kreviadigital.com',
            'password' => 'InitialPass#2026',
        ])->assertRedirect('/dashboard');

        $this->actingAs($sarah)->put('/profile/password', [
            'current_password' => 'InitialPass#2026',
            'password' => 'SarahNew#2027',
            'password_confirmation' => 'SarahNew#2027',
        ])->assertRedirect();
        $this->assertFalse($sarah->fresh()->must_change_password);
        $this->post('/logout');

        // 3. Co-Founder (Farizy) edits member's login email & WhatsApp number
        $this->actingAs($farizy)->patch("/admin/accounts/{$sarah->id}", [
            'name' => 'Sarah Putri Updated',
            'email' => 'sarah.updated@kreviadigital.com',
            'role' => User::ROLE_TECH_CONTRIBUTOR,
            'department_id' => $dept->id,
            'position_id' => $pos->id,
            'employment_status' => 'Active',
            'whatsapp_number' => '081999888777',
            'notification_email' => 'sarah.wa@gmail.com',
            'notify_via_email' => true,
            'notify_via_whatsapp' => true,
            'is_active' => true,
        ])->assertRedirect();

        $sarah->refresh();
        $this->assertEquals('sarah.updated@kreviadigital.com', $sarah->email);
        $this->assertEquals('6281999888777', $sarah->employeeProfile->whatsapp_number);

        // 4. Founder (Albert) resets member's password
        $this->actingAs($albert)->put("/admin/accounts/{$sarah->id}/password", [
            'password' => 'ExecutiveReset#99',
            'password_confirmation' => 'ExecutiveReset#99',
            'must_change_password' => true,
        ])->assertRedirect();

        $this->post('/login', [
            'email' => 'sarah.updated@kreviadigital.com',
            'password' => 'ExecutiveReset#99',
        ])->assertRedirect('/dashboard');

        // 5. Deactivate member -> active session is immediately invalidated by EnsureUserIsActive
        $this->actingAs($aldo)->post("/admin/accounts/{$sarah->id}/toggle-active")->assertRedirect();
        $this->assertFalse($sarah->fresh()->is_active);

        $this->actingAs($sarah->fresh())->get('/dashboard')->assertRedirect('/login');

        // 6. Soft-delete & restore
        $this->actingAs($albert)->delete("/admin/accounts/{$sarah->id}")->assertRedirect();
        $this->assertSoftDeleted('users', ['id' => $sarah->id]);

        $this->actingAs($albert)->post("/admin/accounts/{$sarah->id}/restore")->assertRedirect();
        $this->assertNull($sarah->fresh()->deleted_at);
        $this->assertTrue($sarah->fresh()->is_active);

        // 7. Cannot deactivate/delete self or last active Founder
        $this->actingAs($albert)->post("/admin/accounts/{$albert->id}/toggle-active")->assertSessionHasErrors('is_active');
        $this->actingAs($farizy)->post("/admin/accounts/{$albert->id}/toggle-active")->assertSessionHasErrors('is_active');
    }

    public function test_announcements_and_notifications_dispatch_to_gmail_and_whatsapp_channels(): void
    {
        Mail::fake();
        Http::fake(['*' => Http::response(['status' => true], 200)]);

        $albert = User::where('email', 'albert@kreviadigital.com')->firstOrFail();
        $ananta = User::where('email', 'ananta@kreviadigital.com')->firstOrFail();
        $ananta->employeeProfile->update([
            'whatsapp_number' => '628111222333',
            'notification_email' => 'ananta.personal@gmail.com',
        ]);

        // Configure Gmail SMTP + WhatsApp Webhook + Gmail Relay
        $this->actingAs($albert)->patch('/admin/notifications-settings', [
            'mail_enabled' => true,
            'smtp_host' => 'smtp.gmail.com',
            'smtp_port' => 587,
            'smtp_encryption' => 'tls',
            'smtp_username' => 'krevia.ops@gmail.com',
            'smtp_password' => 'app-password-secret',
            'mail_from_address' => 'krevia.ops@gmail.com',
            'mail_from_name' => 'KDMS Notifications',
            'whatsapp_enabled' => true,
            'whatsapp_driver' => 'webhook',
            'whatsapp_api_url' => 'https://wa-gateway.test/send',
            'whatsapp_api_token' => 'wa-secret-token',
            'whatsapp_sender_id' => 'KDMS-BOT',
            'whatsapp_default_group' => '120363000111@g.us',
            'gmail_relay_address' => 'wa-relay@gmail.com',
        ])->assertRedirect();

        // Broadcast announcement
        $this->actingAs($albert)->post('/announcements', [
            'title' => 'Kickoff Operasional Desember 2026',
            'body' => 'Seluruh tim wajib memperbarui nomor WhatsApp dan memeriksa jadwal Weekly Sync.',
            'priority' => 'Penting',
            'audience_type' => 'all',
            'send_email' => true,
            'send_whatsapp' => true,
            'send_gmail_relay' => true,
        ])->assertRedirect();

        $announcement = Announcement::where('code', 'ANN-001')->firstOrFail();
        $this->assertEquals(7, $announcement->delivery_summary['recipients_count']);
        $this->assertTrue($announcement->delivery_summary['group_dispatched']);

        Http::assertSent(fn ($req) => $req->url() === 'https://wa-gateway.test/send' && $req['target'] === '628111222333');
        Http::assertSent(fn ($req) => $req->url() === 'https://wa-gateway.test/send' && $req['target'] === '120363000111@g.us');

        $this->assertTrue(NotificationDeliveryLog::where('channel', 'mail')->where('recipient_target', 'ananta.personal@gmail.com')->exists());
        $this->assertTrue(NotificationDeliveryLog::where('channel', 'whatsapp')->where('recipient_target', '628111222333')->exists());
        $this->assertTrue(NotificationDeliveryLog::where('channel', 'gmail_relay')->where('recipient_target', 'wa-relay@gmail.com')->exists());

        // Test rendering Announcements & NotificationSettings pages
        $this->actingAs($ananta)->get('/announcements')->assertOk();
        $this->actingAs($albert)->get('/admin/notifications-settings')->assertOk();
    }
}
