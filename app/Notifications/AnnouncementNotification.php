<?php

namespace App\Notifications;

use App\Domain\Workspace\Models\Announcement;
use App\Notifications\Concerns\SupportsMultiChannelDelivery;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class AnnouncementNotification extends Notification
{
    use Queueable, SupportsMultiChannelDelivery;

    public readonly bool $sendEmail;

    public readonly bool $sendWhatsApp;

    public function __construct(public readonly Announcement $announcement)
    {
        $this->sendEmail = $announcement->send_email;
        $this->sendWhatsApp = $announcement->send_whatsapp;
    }

    public function whatsappSubject(): string
    {
        return "Pengumuman {$this->announcement->code}: {$this->announcement->title}";
    }

    public function toMail(object $notifiable): MailMessage
    {
        return $this->buildKdmsMail(
            "[{$this->announcement->priority}] {$this->announcement->title}",
            $this->announcement->body,
            'Buka Pengumuman di KDMS',
            '/announcements'
        );
    }

    public function toWhatsApp(object $notifiable): string
    {
        return "*[KDMS · {$this->announcement->priority}] {$this->announcement->title}*\n\n"
            . "{$this->announcement->body}\n\n"
            . "Kode: {$this->announcement->code}";
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'announcement',
            'announcement_id' => $this->announcement->id,
            'code' => $this->announcement->code,
            'priority' => $this->announcement->priority,
            'message' => "[{$this->announcement->priority}] {$this->announcement->title}",
            'action_url' => route('announcements.index'),
        ];
    }
}
