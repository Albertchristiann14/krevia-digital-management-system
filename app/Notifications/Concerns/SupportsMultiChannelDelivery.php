<?php

namespace App\Notifications\Concerns;

use App\Models\User;
use App\Notifications\Channels\WhatsAppChannel;
use App\Services\Notifications\NotificationDispatchService;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Support\Facades\Schema;

trait SupportsMultiChannelDelivery
{
    /**
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        $channels = ['database'];

        if (! $notifiable instanceof User) {
            return $channels;
        }

        if (! Schema::hasTable('notification_settings')) {
            return $channels;
        }

        $setting = app(NotificationDispatchService::class)->configureRuntimeMailer();
        $profile = $notifiable->relationLoaded('employeeProfile')
            ? $notifiable->employeeProfile
            : $notifiable->employeeProfile()->first();

        $allowEmail = property_exists($this, 'sendEmail') ? (bool) $this->sendEmail : true;
        $allowWa = property_exists($this, 'sendWhatsApp') ? (bool) $this->sendWhatsApp : true;

        $isMandatorySecurity = property_exists($this, 'isMandatorySecurity') && (bool) $this->isMandatorySecurity;
        $prefs = $notifiable->notification_preferences ?? [];
        $prefKey = match (class_basename($this)) {
            'AnnouncementNotification' => 'announcements',
            'TaskNotification' => (isset($this->category) && str_contains(strtolower((string) $this->category), 'assign'))
                ? 'task_assignment'
                : ((isset($this->category) && str_contains(strtolower((string) $this->category), 'comment'))
                    ? 'task_comments'
                    : 'task_deadline_reminder'),
            default => 'general_system',
        };

        $categoryEnabled = $isMandatorySecurity || (bool) ($prefs['categories'][$prefKey] ?? true);
        if (! $categoryEnabled) {
            return $channels;
        }

        $prefInApp = $isMandatorySecurity || (bool) ($prefs['channels']['in_app'] ?? true);
        if (! $prefInApp) {
            $channels = [];
        }

        if ($allowEmail && $setting->mail_enabled && ($isMandatorySecurity || (($profile?->notify_via_email ?? true) && ($prefs['channels']['email'] ?? true)))) {
            $channels[] = 'mail';
            app(NotificationDispatchService::class)->logDelivery(
                'mail',
                $notifiable,
                $notifiable->routeNotificationForMail(),
                method_exists($this, 'whatsappSubject') ? $this->whatsappSubject() : class_basename($this),
                'Queued/dispatched via KDMS Mail template',
                'sent'
            );
        }

        if (
            $allowWa
            && $setting->whatsapp_enabled
            && ($isMandatorySecurity || (($profile?->notify_via_whatsapp ?? true) && ($prefs['channels']['whatsapp'] ?? true)))
            && $notifiable->routeNotificationForWhatsApp() !== null
        ) {
            $channels[] = WhatsAppChannel::class;
        }

        return $channels;
    }

    /**
     * @param  array<string, mixed>  $data
     */
    protected function buildKdmsViewMail(string $subject, string $view, array $data): MailMessage
    {
        return (new MailMessage)
            ->subject($subject)
            ->view($view, array_merge([
                'emailTitle' => $subject,
            ], $data));
    }

    protected function buildKdmsMail(
        string $subject,
        string $body,
        ?string $actionLabel = null,
        ?string $actionUrl = null,
        ?object $notifiable = null,
        string $categoryBadge = 'Notification'
    ): MailMessage {
        $recipientName = $notifiable?->name ?? 'Tim Krevia Digital';

        return $this->buildKdmsViewMail(
            "[DMS] {$subject}",
            'emails.notifications.generic',
            [
                'preheader' => mb_strimwidth($body, 0, 110, '...'),
                'categoryBadge' => $categoryBadge,
                'headline' => $subject,
                'recipientName' => $recipientName,
                'messageText' => $body,
                'actionLabel' => $actionLabel,
                'actionUrl' => $actionUrl ? url($actionUrl) : null,
            ]
        );
    }
}
