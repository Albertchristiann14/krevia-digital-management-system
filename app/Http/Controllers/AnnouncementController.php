<?php

namespace App\Http\Controllers;

use App\Domain\Organization\Models\Department;
use App\Domain\Workspace\Models\Announcement;
use App\Domain\Workspace\Models\NotificationDeliveryLog;
use App\Domain\Workspace\Models\NotificationSetting;
use App\Domain\Workspace\Services\AuditLogger;
use App\Models\User;
use App\Notifications\AnnouncementNotification;
use App\Services\Notifications\NotificationDispatchService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class AnnouncementController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();

        $announcements = Announcement::query()
            ->with(['publisher:id,name', 'department:id,name'])
            ->latest('published_at')
            ->latest('id')
            ->limit(40)
            ->get()
            ->map(fn (Announcement $a) => [
                'id' => $a->id,
                'code' => $a->code,
                'title' => $a->title,
                'body' => $a->body,
                'priority' => $a->priority,
                'audience_type' => $a->audience_type,
                'department_name' => $a->department?->name,
                'send_email' => $a->send_email,
                'send_whatsapp' => $a->send_whatsapp,
                'send_gmail_relay' => $a->send_gmail_relay,
                'publisher' => $a->publisher?->name,
                'published_at' => $a->published_at?->format('Y-m-d H:i'),
                'delivery_summary' => $a->delivery_summary,
            ]);

        $setting = NotificationSetting::current();

        return Inertia::render('Announcements/Index', [
            'announcements' => $announcements,
            'departments' => Department::query()->orderBy('sort_order')->get(['id', 'name']),
            'members' => User::query()->where('is_active', true)->orderBy('id')->get(['id', 'name']),
            'channelStatus' => [
                'mail_enabled' => $setting->mail_enabled,
                'whatsapp_enabled' => $setting->whatsapp_enabled,
                'whatsapp_driver' => $setting->whatsapp_driver,
                'has_gmail_relay' => ! empty($setting->gmail_relay_address),
                'has_default_group' => ! empty($setting->whatsapp_default_group),
            ],
            'canPublish' => $user->canManageAccounts() || $user->hasPermissionTo('announcements.manage'),
        ]);
    }

    public function store(
        Request $request,
        NotificationDispatchService $dispatcher,
        AuditLogger $audit
    ): RedirectResponse {
        $actor = $request->user();
        abort_unless($actor->canManageAccounts() || $actor->hasPermissionTo('announcements.manage'), 403);

        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'body' => ['required', 'string', 'max:5000'],
            'priority' => ['required', Rule::in(Announcement::PRIORITIES)],
            'audience_type' => ['required', Rule::in(Announcement::AUDIENCES)],
            'department_id' => ['nullable', 'exists:departments,id'],
            'recipient_user_ids' => ['nullable', 'array'],
            'recipient_user_ids.*' => ['exists:users,id'],
            'send_email' => ['required', 'boolean'],
            'send_whatsapp' => ['required', 'boolean'],
            'send_gmail_relay' => ['sometimes', 'boolean'],
        ]);

        $recipientsQuery = User::query()
            ->with('employeeProfile')
            ->where('is_active', true);

        if ($data['audience_type'] === 'department' && ! empty($data['department_id'])) {
            $recipientsQuery->whereHas('employeeProfile', fn ($q) => $q->where('department_id', $data['department_id']));
        } elseif ($data['audience_type'] === 'selected' && ! empty($data['recipient_user_ids'])) {
            $recipientsQuery->whereIn('id', $data['recipient_user_ids']);
        }

        $recipients = $recipientsQuery->get();

        $maxNum = Announcement::withTrashed()
            ->where('code', 'like', 'ANN-%')
            ->pluck('code')
            ->map(fn (string $c) => (int) str_replace('ANN-', '', $c))
            ->max() ?? 0;

        $announcement = Announcement::create([
            'code' => sprintf('ANN-%03d', $maxNum + 1),
            'title' => $data['title'],
            'body' => $data['body'],
            'priority' => $data['priority'],
            'audience_type' => $data['audience_type'],
            'department_id' => $data['department_id'] ?? null,
            'recipient_user_ids' => $data['recipient_user_ids'] ?? null,
            'send_email' => (bool) $data['send_email'],
            'send_whatsapp' => (bool) $data['send_whatsapp'],
            'send_gmail_relay' => (bool) ($data['send_gmail_relay'] ?? false),
            'published_by' => $actor->id,
            'published_at' => now(),
        ]);

        foreach ($recipients as $recipient) {
            $recipient->notify(new AnnouncementNotification($announcement));
        }

        $setting = NotificationSetting::current();
        $groupDispatched = false;
        if ($announcement->send_whatsapp && $setting->whatsapp_enabled && ! empty($setting->whatsapp_default_group)) {
            $dispatcher->sendWhatsApp(
                $setting->whatsapp_default_group,
                "*[KDMS · {$announcement->priority}] {$announcement->title}*\n\n{$announcement->body}",
                null,
                "Group Broadcast {$announcement->code}"
            );
            $groupDispatched = true;
        }

        $relayStatus = 'skipped';
        if ($announcement->send_gmail_relay) {
            $relayStatus = $dispatcher->sendGmailRelay(
                "{$announcement->code}: {$announcement->title}",
                $announcement->body,
                $actor
            );
        }

        $announcement->update([
            'delivery_summary' => [
                'recipients_count' => $recipients->count(),
                'mail_enabled' => $setting->mail_enabled && $announcement->send_email,
                'whatsapp_enabled' => $setting->whatsapp_enabled && $announcement->send_whatsapp,
                'group_dispatched' => $groupDispatched,
                'gmail_relay_status' => $relayStatus,
            ],
        ]);

        $audit->log(
            'announcements.published',
            "Published announcement {$announcement->code}: {$announcement->title} to {$recipients->count()} member(s).",
            $announcement,
            null,
            $announcement->delivery_summary,
            $actor->id
        );

        return back()->with('success', "Announcement {$announcement->code} sent to {$recipients->count()} active member(s).");
    }

    public function settings(Request $request): Response
    {
        abort_unless($request->user()?->canManageAccounts(), 403);

        $setting = NotificationSetting::current();
        $logs = NotificationDeliveryLog::query()
            ->with('recipient:id,name')
            ->latest('sent_at')
            ->limit(40)
            ->get()
            ->map(fn (NotificationDeliveryLog $l) => [
                'id' => $l->id,
                'channel' => $l->channel,
                'recipient_name' => $l->recipient?->name,
                'recipient_target' => $l->recipient_target,
                'subject_or_type' => $l->subject_or_type,
                'status' => $l->status,
                'error_message' => $l->error_message,
                'sent_at' => $l->sent_at?->format('Y-m-d H:i:s'),
            ]);

        return Inertia::render('Admin/NotificationSettings', [
            'setting' => [
                'mail_enabled' => $setting->mail_enabled,
                'smtp_host' => $setting->smtp_host,
                'smtp_port' => $setting->smtp_port,
                'smtp_encryption' => $setting->smtp_encryption,
                'smtp_username' => $setting->smtp_username ?? '',
                'has_smtp_password' => ! empty($setting->smtp_password),
                'mail_from_address' => $setting->mail_from_address ?? '',
                'mail_from_name' => $setting->mail_from_name,
                'whatsapp_enabled' => $setting->whatsapp_enabled,
                'whatsapp_driver' => $setting->whatsapp_driver,
                'whatsapp_api_url' => $setting->whatsapp_api_url ?? '',
                'has_whatsapp_token' => ! empty($setting->whatsapp_api_token),
                'whatsapp_sender_id' => $setting->whatsapp_sender_id ?? '',
                'whatsapp_default_group' => $setting->whatsapp_default_group ?? '',
                'gmail_relay_address' => $setting->gmail_relay_address ?? '',
            ],
            'drivers' => NotificationSetting::WHATSAPP_DRIVERS,
            'logs' => $logs,
        ]);
    }

    public function updateSettings(Request $request, AuditLogger $audit): RedirectResponse
    {
        abort_unless($request->user()?->canManageAccounts(), 403);

        $data = $request->validate([
            'mail_enabled' => ['required', 'boolean'],
            'smtp_host' => ['required', 'string', 'max:120'],
            'smtp_port' => ['required', 'integer', 'min:1', 'max:65535'],
            'smtp_encryption' => ['required', Rule::in(['tls', 'ssl', 'none'])],
            'smtp_username' => ['nullable', 'string', 'max:180'],
            'smtp_password' => ['nullable', 'string', 'max:255'],
            'mail_from_address' => ['nullable', 'email', 'max:180'],
            'mail_from_name' => ['required', 'string', 'max:120'],
            'whatsapp_enabled' => ['required', 'boolean'],
            'whatsapp_driver' => ['required', Rule::in(NotificationSetting::WHATSAPP_DRIVERS)],
            'whatsapp_api_url' => ['nullable', 'url', 'max:500'],
            'whatsapp_api_token' => ['nullable', 'string', 'max:500'],
            'whatsapp_sender_id' => ['nullable', 'string', 'max:120'],
            'whatsapp_default_group' => ['nullable', 'string', 'max:120'],
            'gmail_relay_address' => ['nullable', 'email', 'max:180'],
        ]);

        $setting = NotificationSetting::current();

        $updates = [
            'mail_enabled' => $data['mail_enabled'],
            'smtp_host' => $data['smtp_host'],
            'smtp_port' => $data['smtp_port'],
            'smtp_encryption' => $data['smtp_encryption'] === 'none' ? '' : $data['smtp_encryption'],
            'smtp_username' => $data['smtp_username'] ?? null,
            'mail_from_address' => $data['mail_from_address'] ?? null,
            'mail_from_name' => $data['mail_from_name'],
            'whatsapp_enabled' => $data['whatsapp_enabled'],
            'whatsapp_driver' => $data['whatsapp_driver'],
            'whatsapp_api_url' => $data['whatsapp_api_url'] ?? null,
            'whatsapp_sender_id' => $data['whatsapp_sender_id'] ?? null,
            'whatsapp_default_group' => $data['whatsapp_default_group'] ?? null,
            'gmail_relay_address' => $data['gmail_relay_address'] ?? null,
            'updated_by' => $request->user()->id,
        ];

        if (! empty($data['smtp_password'])) {
            $updates['smtp_password'] = $data['smtp_password'];
        }
        if (! empty($data['whatsapp_api_token'])) {
            $updates['whatsapp_api_token'] = $data['whatsapp_api_token'];
        }

        $setting->update($updates);
        $audit->log('notifications.settings_updated', 'Updated Gmail SMTP and WhatsApp gateway settings.', $setting);

        return back()->with('success', 'Gmail SMTP & WhatsApp notification settings saved.');
    }

    public function sendTest(Request $request, NotificationDispatchService $dispatcher): RedirectResponse
    {
        abort_unless($request->user()?->canManageAccounts(), 403);

        $data = $request->validate([
            'test_whatsapp' => ['nullable', 'string', 'max:40'],
            'test_email' => ['nullable', 'email', 'max:180'],
        ]);

        $results = [];

        if (! empty($data['test_whatsapp'])) {
            $status = $dispatcher->sendWhatsApp(
                $data['test_whatsapp'],
                '*[KDMS Test]* Koneksi notifikasi WhatsApp KDMS berhasil dikonfigurasi.',
                $request->user(),
                'Test WhatsApp Delivery'
            );
            $results[] = "WhatsApp: {$status}";
        }

        if (! empty($data['test_email'])) {
            try {
                $dispatcher->configureRuntimeMailer();
                \Illuminate\Support\Facades\Mail::raw(
                    'Ini adalah pesan uji coba dari Krevia Digital Management System (KDMS) via Gmail SMTP.',
                    fn ($msg) => $msg->to($data['test_email'])->subject('[KDMS] Test Email Notification')
                );
                $dispatcher->logDelivery('mail', $request->user(), $data['test_email'], 'Test Email Delivery', 'Test Email via Gmail SMTP', 'sent');
                $results[] = 'Email: sent';
            } catch (\Throwable $e) {
                $dispatcher->logDelivery('mail', $request->user(), $data['test_email'], 'Test Email Delivery', 'Test Email', 'failed', $e->getMessage());
                $results[] = 'Email: failed';
            }
        }

        return back()->with('success', 'Test dispatch finished (' . (implode(', ', $results) ?: 'no target specified') . ').');
    }
}
