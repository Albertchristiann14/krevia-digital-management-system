<?php

namespace Tests\Feature\Phase10;

use App\Domain\Organization\Models\EmployeeProfile;
use App\Domain\Workspace\Models\Announcement;
use App\Domain\Workspace\Models\AuditLog;
use App\Domain\Workspace\Models\NotificationSetting;
use App\Models\User;
use App\Notifications\AnnouncementNotification;
use App\Notifications\Channels\WhatsAppChannel;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class MyAccountModuleTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
    }

    public function test_guest_cannot_access_my_account(): void
    {
        $this->get('/my-account')->assertRedirect('/login');
        $this->patch('/my-account/profile', [])->assertRedirect('/login');
    }

    public function test_authenticated_user_can_view_my_account_with_all_sections(): void
    {
        $user = User::where('email', 'yoga@kreviadigital.com')->firstOrFail();

        $this->actingAs($user)
            ->get('/my-account')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('MyAccount/Index')
                ->has('account')
                ->has('organizationIdentity')
                ->has('notificationPreferences.channels')
                ->has('notificationPreferences.categories')
                ->has('personalPreferences')
                ->has('activities.data')
                ->where('account.email', 'yoga@kreviadigital.com')
            );
    }

    public function test_user_can_update_personal_information_with_indonesian_whatsapp_normalization(): void
    {
        $user = User::where('email', 'yoga@kreviadigital.com')->firstOrFail();

        $this->actingAs($user)
            ->patch('/my-account/profile', [
                'name' => 'Yoga Pratama Updated',
                'email' => 'yoga.updated@kreviadigital.com',
                'whatsapp_number' => '0812-3456-7890',
            ])
            ->assertRedirect();

        $user->refresh();
        $profile = $user->employeeProfile()->first();

        $this->assertSame('Yoga Pratama Updated', $user->name);
        $this->assertSame('yoga.updated@kreviadigital.com', $user->email);
        $this->assertSame('+6281234567890', $profile?->whatsapp_number);
    }

    public function test_user_cannot_modify_role_department_position_or_other_users_via_profile_endpoint(): void
    {
        $user = User::where('email', 'yoga@kreviadigital.com')->firstOrFail();
        $otherUser = User::where('email', 'albert@kreviadigital.com')->firstOrFail();

        $originalProfile = $user->employeeProfile()->firstOrFail();
        $originalRoles = $user->getRoleNames()->toArray();

        $this->actingAs($user)
            ->patch('/my-account/profile', [
                'user_id' => $otherUser->id,
                'name' => 'Yoga Safe Name',
                'email' => 'yoga@kreviadigital.com',
                'whatsapp_number' => '081299998888',
                'role' => 'Founder / Managing Director',
                'employee_code' => 'KRV-999',
                'department_id' => 999,
                'position_id' => 999,
                'is_active' => false,
            ])
            ->assertRedirect();

        $user->refresh();
        $otherUser->refresh();
        $updatedProfile = $user->employeeProfile()->firstOrFail();

        $this->assertSame('Albert Christian', $otherUser->name);
        $this->assertSame($originalRoles, $user->getRoleNames()->toArray());
        $this->assertSame($originalProfile->employee_code, $updatedProfile->employee_code);
        $this->assertSame($originalProfile->department_id, $updatedProfile->department_id);
        $this->assertSame($originalProfile->position_id, $updatedProfile->position_id);
        $this->assertTrue((bool) $user->is_active);
    }

    public function test_user_can_upload_replace_and_remove_profile_photo(): void
    {
        Storage::fake('public');
        $user = User::where('email', 'yoga@kreviadigital.com')->firstOrFail();

        // 1. Upload first photo
        $firstFile = UploadedFile::fake()->image('avatar1.png', 200, 200);
        $this->actingAs($user)
            ->post('/my-account/avatar', ['avatar' => $firstFile])
            ->assertRedirect();

        $user->refresh();
        $firstPath = $user->avatar_path;
        $this->assertNotNull($firstPath);
        Storage::disk('public')->assertExists($firstPath);

        // 2. Replace with second photo
        $secondFile = UploadedFile::fake()->image('avatar2.jpg', 300, 300);
        $this->actingAs($user)
            ->post('/my-account/avatar', ['avatar' => $secondFile])
            ->assertRedirect();

        $user->refresh();
        $secondPath = $user->avatar_path;
        $this->assertNotNull($secondPath);
        $this->assertNotSame($firstPath, $secondPath);
        Storage::disk('public')->assertMissing($firstPath);
        Storage::disk('public')->assertExists($secondPath);

        // 3. Remove photo
        $this->actingAs($user)
            ->delete('/my-account/avatar')
            ->assertRedirect();

        $user->refresh();
        $this->assertNull($user->avatar_path);
        Storage::disk('public')->assertMissing($secondPath);
    }

    public function test_avatar_upload_rejects_invalid_file_types(): void
    {
        Storage::fake('public');
        $user = User::where('email', 'yoga@kreviadigital.com')->firstOrFail();

        $pdfFile = UploadedFile::fake()->create('document.pdf', 100, 'application/pdf');

        $this->actingAs($user)
            ->post('/my-account/avatar', ['avatar' => $pdfFile])
            ->assertSessionHasErrors('avatar');
    }

    public function test_user_can_change_password_and_fails_with_wrong_current_password(): void
    {
        $user = User::where('email', 'yoga@kreviadigital.com')->firstOrFail();
        $user->forceFill(['password' => Hash::make('OldPassword123!')])->save();

        $this->actingAs($user)
            ->put('/my-account/password', [
                'current_password' => 'wrong-password',
                'password' => 'NewStrongPass123!',
                'password_confirmation' => 'NewStrongPass123!',
            ])
            ->assertSessionHasErrors('current_password');

        $this->actingAs($user)
            ->put('/my-account/password', [
                'current_password' => 'OldPassword123!',
                'password' => 'NewStrongPass123!',
                'password_confirmation' => 'NewStrongPass123!',
            ])
            ->assertRedirect();

        $user->refresh();
        $this->assertTrue(Hash::check('NewStrongPass123!', $user->password));
        $this->assertFalse((bool) $user->must_change_password);
    }

    public function test_user_can_save_notification_preferences_and_delivery_respects_them(): void
    {
        $user = User::where('email', 'yoga@kreviadigital.com')->firstOrFail();
        EmployeeProfile::where('user_id', $user->id)->update([
            'whatsapp_number' => '628123456789',
            'notify_via_email' => true,
            'notify_via_whatsapp' => true,
        ]);

        if (Schema::hasTable('notification_settings')) {
            NotificationSetting::current()->update([
                'mail_enabled' => true,
                'whatsapp_enabled' => true,
            ]);
        }

        $this->actingAs($user)
            ->patch('/my-account/notifications', [
                'channels' => [
                    'in_app' => true,
                    'whatsapp' => false,
                    'email' => false,
                ],
                'categories' => [
                    'task_assignment' => true,
                    'task_deadline_reminder' => true,
                    'task_status_updates' => true,
                    'task_comments' => true,
                    'project_updates' => true,
                    'announcements' => true,
                    'general_system' => true,
                ],
            ])
            ->assertRedirect();

        $user->refresh();

        $announcement = Announcement::create([
            'code' => 'ANN-TEST-01',
            'title' => 'Test Notice',
            'body' => 'Body',
            'priority' => 'Normal',
            'audience_type' => 'all',
            'send_email' => true,
            'send_whatsapp' => true,
            'published_by' => $user->id,
            'published_at' => now(),
        ]);

        $notification = new AnnouncementNotification($announcement);
        $channels = $notification->via($user);

        $this->assertContains('database', $channels);
        $this->assertNotContains('mail', $channels);
        $this->assertNotContains(WhatsAppChannel::class, $channels);

        // Mandatory security notification bypasses opt-outs
        $mandatory = new class($announcement) extends AnnouncementNotification {
            public bool $isMandatorySecurity = true;
        };
        $mandatoryChannels = $mandatory->via($user);
        $this->assertContains('database', $mandatoryChannels);
        $this->assertContains('mail', $mandatoryChannels);
        $this->assertContains(WhatsAppChannel::class, $mandatoryChannels);
    }

    public function test_user_can_save_personal_preferences_and_receive_them_via_inertia(): void
    {
        $user = User::where('email', 'yoga@kreviadigital.com')->firstOrFail();

        $this->actingAs($user)
            ->patch('/my-account/preferences', [
                'theme' => 'dark',
                'language' => 'id',
                'timezone' => 'Asia/Makassar',
                'date_format' => 'YYYY-MM-DD',
                'compact_mode' => 'compact',
            ])
            ->assertRedirect();

        $this->actingAs($user)
            ->get('/my-account?tab=preferences')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('auth.user.preferences.theme', 'dark')
                ->where('auth.user.preferences.language', 'id')
                ->where('auth.user.preferences.timezone', 'Asia/Makassar')
                ->where('auth.user.preferences.date_format', 'YYYY-MM-DD')
                ->where('auth.user.preferences.compact_mode', 'compact')
            );
    }

    public function test_activity_history_is_strictly_scoped_to_authenticated_user_and_paginates(): void
    {
        $yoga = User::where('email', 'yoga@kreviadigital.com')->firstOrFail();
        $albert = User::where('email', 'albert@kreviadigital.com')->firstOrFail();

        AuditLog::create([
            'user_id' => $albert->id,
            'event' => 'finance.secret_albert_event',
            'auditable_type' => 'Finance',
            'summary' => 'Albert Secret Action',
            'created_at' => now(),
        ]);

        for ($i = 1; $i <= 25; $i++) {
            AuditLog::create([
                'user_id' => $yoga->id,
                'event' => $i <= 5 ? "task.updated_{$i}" : "account.updated_{$i}",
                'auditable_type' => $i <= 5 ? 'Task' : 'User',
                'summary' => "Yoga Action {$i}",
                'created_at' => now()->subMinutes($i),
            ]);
        }

        $this->actingAs($yoga)
            ->get('/my-account?tab=activity')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('activities.last_page', 2)
                ->has('activities.data', 15)
                ->where('activities.data', function ($items) {
                    foreach ($items as $item) {
                        if ($item['title'] === 'Albert Secret Action') {
                            return false;
                        }
                    }

                    return true;
                })
            );

        $this->actingAs($yoga)
            ->get('/my-account?tab=activity&module=tasks')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('activities.data', 5)
            );
    }
}
