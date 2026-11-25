<?php

namespace App\Notifications\Channels;

use App\Models\User;
use App\Services\Notifications\NotificationDispatchService;
use Illuminate\Notifications\Notification;

class WhatsAppChannel
{
    public function __construct(private readonly NotificationDispatchService $dispatcher) {}

    public function send(object $notifiable, Notification $notification): void
    {
        if (! method_exists($notifiable, 'routeNotificationForWhatsApp') || ! method_exists($notification, 'toWhatsApp')) {
            return;
        }

        $target = $notifiable->routeNotificationForWhatsApp();
        if (! $target) {
            return;
        }

        $message = (string) $notification->toWhatsApp($notifiable);
        if (trim($message) === '') {
            return;
        }

        $subject = method_exists($notification, 'whatsappSubject')
            ? (string) $notification->whatsappSubject()
            : class_basename($notification);

        $this->dispatcher->sendWhatsApp(
            $target,
            $message,
            $notifiable instanceof User ? $notifiable : null,
            $subject
        );
    }
}
