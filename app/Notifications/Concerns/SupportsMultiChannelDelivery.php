<?php

namespace App\Notifications\Concerns;

use App\Domain\Workspace\Models\NotificationSetting;
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

        if ($allowEmail && $setting->mail_enabled && ($profile?->notify_via_email ?? true)) {
            $channels[] = 'mail';
            app(NotificationDispatchService::class)->logDelivery(
                'mail',
                $notifiable,
                $notifiable->routeNotificationForMail(),
                method_exists($this, 'whatsappSubject') ? $this->whatsappSubject() : class_basename($this),
                method_exists($this, 'toWhatsApp') ? $this->toWhatsApp($notifiable) : 'KDMS Email Notification',
                'sent'
            );
        }

        if (
            $allowWa
            && $setting->whatsapp_enabled
            && ($profile?->notify_via_whatsapp ?? true)
            && $notifiable->routeNotificationForWhatsApp() !== null
        ) {
            $channels[] = WhatsAppChannel::class;
        }

        return $channels;
    }

    protected function buildKdmsMail(string $subject, string $body, ?string $actionLabel = null, ?string $actionUrl = null): MailMessage
    {
        $mail = (new MailMessage)
            ->subject("[KDMS] {$subject}")
            ->greeting('Halo Tim Krevia Digital,')
            ->line($body);

        if ($actionLabel && $actionUrl) {
            $mail->action($actionLabel, url($actionUrl));
        }

        return $mail->salutation('— Krevia Digital Management System (Build Smarter. Operate Better.)');
    }
}
