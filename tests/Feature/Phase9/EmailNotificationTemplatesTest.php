<?php

namespace Tests\Feature\Phase9;

use App\Domain\Crm\Models\Company;
use App\Domain\Crm\Models\FollowUp;
use App\Domain\Crm\Models\Lead;
use App\Domain\Finance\Models\Invoice;
use App\Domain\Governance\Models\Meeting;
use App\Domain\Marketing\Models\ContentItem;
use App\Domain\Workplan\Models\Task;
use App\Domain\Workspace\Models\Announcement;
use App\Domain\Workspace\Models\NotificationSetting;
use App\Models\User;
use App\Notifications\AnnouncementNotification;
use App\Notifications\Channels\WhatsAppChannel;
use App\Notifications\CrmFollowUpNotification;
use App\Notifications\InvoiceOverdueNotification;
use App\Notifications\MarketingDeadlineNotification;
use App\Notifications\MeetingSlaNotification;
use App\Notifications\TaskNotification;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class EmailNotificationTemplatesTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
    }

    public function test_master_layout_and_announcement_email_render_with_krevia_branding_and_safe_escaping(): void
    {
        $user = User::where('email', 'albert@kreviadigital.com')->firstOrFail();

        $announcement = Announcement::create([
            'code' => 'ANN-TEST-01',
            'title' => 'Jadwal Rilis <script>alert("xss")</script>',
            'body' => 'Rilis produksi dijadwalkan malam ini pukul 22.00 WIB.',
            'priority' => 'Penting',
            'audience_type' => 'all',
            'send_email' => true,
            'send_whatsapp' => false,
            'published_by' => $user->id,
            'published_at' => now(),
        ]);

        $notification = new AnnouncementNotification($announcement);
        $mail = $notification->toMail($user);

        $this->assertEquals('[DMS] New Announcement: Jadwal Rilis <script>alert("xss")</script>', $mail->subject);
        $html = view($mail->view, $mail->viewData)->render();

        $this->assertStringContainsString('Krevia Digital', $html);
        $this->assertStringContainsString('Digital Management System (DMS)', $html);
        $this->assertStringContainsString('#101D35', $html);
        $this->assertStringContainsString('support@kreviadigitalid.my.id', $html);
        $this->assertStringContainsString('This is an automated notification from Krevia Digital DMS.', $html);
        $this->assertStringContainsString("Halo <strong>{$user->name}</strong>", $html);
        $this->assertStringContainsString('View Announcement', $html);
        $this->assertStringContainsString(route('announcements.index'), $html);
        $this->assertStringContainsString('Terdapat pengumuman baru yang dipublikasikan melalui Krevia Digital DMS:', $html);
        $this->assertStringNotContainsString('<script>alert("xss")</script>', $html);
        $this->assertStringContainsString('&lt;script&gt;', $html);
        $this->assertStringNotContainsString('Fonnte', $html);
        $this->assertStringNotContainsString('<img', $html);
    }

    public function test_task_assignment_and_reminder_emails_handle_optional_fields_gracefully(): void
    {
        $user = User::where('email', 'yoga@kreviadigital.com')->firstOrFail();

        $task = Task::create([
            'code' => 'T-EMAIL-01',
            'title' => 'Optimasi Query Dashboard',
            'pic_user_id' => $user->id,
            'priority' => 'Tinggi',
            'deadline' => now()->addDays(3),
            'status' => 'In Progress',
        ]);
        $task->setAttribute('deadline', null); // Test missing optional deadline in email template

        $assignNotification = new TaskNotification('assigned', 'Tinggi', $task, 'Mohon kerjakan optimasi query.');
        $assignMail = $assignNotification->toMail($user);
        $assignHtml = view($assignMail->view, $assignMail->viewData)->render();

        $this->assertEquals('[DMS] New Task Assigned: Optimasi Query Dashboard', $assignMail->subject);
        $this->assertStringContainsString('View Task', $assignHtml);
        $this->assertStringContainsString(route('tasks.show', $task), $assignHtml);
        $this->assertStringContainsString('Anda mendapatkan penugasan task baru', $assignHtml);

        $reminderNotification = new TaskNotification('reminder', 'Tinggi', $task, 'Deadline task mendekati batas waktu.');
        $reminderMail = $reminderNotification->toMail($user);
        $reminderHtml = view($reminderMail->view, $reminderMail->viewData)->render();

        $this->assertEquals('[DMS] Task Reminder: Optimasi Query Dashboard', $reminderMail->subject);
        $this->assertStringContainsString('Open Task', $reminderHtml);
        $this->assertStringContainsString('Pengingat terkait task berikut', $reminderHtml);
    }

    public function test_all_other_domain_notifications_render_cleanly_and_preserve_channels(): void
    {
        $user = User::where('email', 'albert@kreviadigital.com')->firstOrFail();
        $company = Company::firstOrFail();

        $lead = Lead::create([
            'code' => 'L-EMAIL-01',
            'company_id' => $company->id,
            'potential_needs' => 'Company Profile',
            'service_line' => 'Website Development',
            'stage' => 'Discovery',
            'pic_user_id' => $user->id,
        ]);
        $followUp = FollowUp::create([
            'lead_id' => $lead->id,
            'assigned_to' => $user->id,
            'channel' => 'Email',
            'due_at' => now()->addDay(),
            'notes' => 'Follow up proposal',
        ]);
        $crmMail = (new CrmFollowUpNotification($followUp))->toMail($user);
        $crmHtml = view($crmMail->view, $crmMail->viewData)->render();
        $this->assertStringContainsString('[DMS] CRM Follow-Up: L-EMAIL-01', $crmMail->subject);
        $this->assertStringContainsString('Open CRM Lead', $crmHtml);

        $invoice = Invoice::create([
            'invoice_no' => 'INV-EMAIL-01',
            'company_id' => $company->id,
            'description' => 'Web Dev',
            'issue_date' => now()->subDays(20),
            'due_date' => now()->subDays(5),
            'amount' => 5000000,
            'paid_amount' => 0,
            'status' => 'Overdue',
            'created_by' => $user->id,
        ]);
        $invMail = (new InvoiceOverdueNotification($invoice))->toMail($user);
        $invHtml = view($invMail->view, $invMail->viewData)->render();
        $this->assertEquals('[DMS] Invoice Overdue: INV-EMAIL-01', $invMail->subject);
        $this->assertStringContainsString('View Invoice', $invHtml);
        $this->assertStringContainsString('Rp 5.000.000', $invHtml);

        $content = ContentItem::create([
            'code' => 'C-EMAIL-01',
            'platform' => 'Instagram',
            'category' => 'Edukasi',
            'title_topic' => 'Tips Keamanan Aplikasi',
            'publish_date' => now()->addDays(2),
            'pic_user_id' => $user->id,
            'status' => 'Scheduled',
        ]);
        $mktMail = (new MarketingDeadlineNotification($content, 'deadline', 'Konten akan tayang 2 hari lagi.'))->toMail($user);
        $mktHtml = view($mktMail->view, $mktMail->viewData)->render();
        $this->assertEquals('[DMS] Content Reminder: C-EMAIL-01', $mktMail->subject);
        $this->assertStringContainsString('Open Content', $mktHtml);

        $meeting = Meeting::create([
            'code' => 'MTG-EMAIL-01',
            'forum_name' => 'Weekly Sync',
            'focus' => 'Sprint Review',
            'scheduled_date' => now(),
            'pic_user_id' => $user->id,
            'status' => 'Scheduled',
        ]);
        $mtgMail = (new MeetingSlaNotification($meeting, 'sla', 'Notulensi belum dikirim dalam 24 jam.'))->toMail($user);
        $mtgHtml = view($mtgMail->view, $mtgMail->viewData)->render();
        $this->assertEquals('[DMS] Meeting SLA: MTG-EMAIL-01', $mtgMail->subject);
        $this->assertStringContainsString('Open Meetings', $mtgHtml);

        // Verify via() channels remain database + mail + WhatsAppChannel when enabled
        NotificationSetting::current()->update([
            'mail_enabled' => true,
            'whatsapp_enabled' => true,
        ]);
        $user->employeeProfile->update([
            'whatsapp_number' => '081234567890',
            'notify_via_email' => true,
            'notify_via_whatsapp' => true,
        ]);

        Notification::fake();
        $channels = (new TaskNotification('assigned', 'Tinggi', $task = Task::firstOrFail(), 'Test'))->via($user->fresh('employeeProfile'));
        $this->assertEquals(['database', 'mail', WhatsAppChannel::class], $channels);
    }
}
