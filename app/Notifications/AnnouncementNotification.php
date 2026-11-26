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
        $publisherName = $this->announcement->relationLoaded('publisher')
            ? $this->announcement->publisher?->name
            : null;

        return $this->buildKdmsViewMail(
            "[DMS] New Announcement: {$this->announcement->title}",
            'emails.notifications.announcement',
            [
                'preheader' => mb_strimwidth($this->announcement->body, 0, 110, '...'),
                'categoryBadge' => 'Announcement',
                'headline' => $this->announcement->title,
                'recipientName' => $notifiable->name ?? 'Tim Krevia Digital',
                'bodyText' => $this->announcement->body,
                'details' => array_filter([
                    'Kode' => $this->announcement->code,
                    'Prioritas' => $this->announcement->priority,
                    'Dipublikasikan Oleh' => $publisherName,
                    'Tanggal Publikasi' => $this->announcement->published_at?->format('d M Y H:i'),
                ]),
                'actionLabel' => 'View Announcement',
                'actionUrl' => route('announcements.index'),
            ]
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
