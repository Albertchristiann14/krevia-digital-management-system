<?php

namespace App\Notifications;

use App\Domain\Governance\Models\Meeting;
use App\Notifications\Concerns\SupportsMultiChannelDelivery;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class MeetingSlaNotification extends Notification
{
    use Queueable, SupportsMultiChannelDelivery;

    public function __construct(
        public readonly Meeting $meeting,
        public readonly string $alertType,
        public readonly string $message,
    ) {}

    public function whatsappSubject(): string
    {
        return "Meeting {$this->meeting->code}";
    }

    public function toMail(object $notifiable): MailMessage
    {
        return $this->buildKdmsViewMail(
            "[DMS] Meeting SLA: {$this->meeting->code}",
            'emails.notifications.generic',
            [
                'preheader' => mb_strimwidth($this->message, 0, 110, '...'),
                'categoryBadge' => 'Governance',
                'headline' => "Pengingat SLA Meeting {$this->meeting->code}",
                'recipientName' => $notifiable->name ?? 'Tim Krevia Digital',
                'messageText' => $this->message,
                'details' => array_filter([
                    'Kode Meeting' => $this->meeting->code,
                    'Forum' => $this->meeting->forum_name,
                    'Tanggal' => $this->meeting->scheduled_date?->format('d M Y'),
                ]),
                'actionLabel' => 'Open Meetings',
                'actionUrl' => route('governance.meetings.index'),
            ]
        );
    }

    public function toWhatsApp(object $notifiable): string
    {
        return "*[KDMS Meeting · {$this->meeting->code}]*\n{$this->message}";
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'meeting_sla',
            'alert_type' => $this->alertType,
            'meeting_id' => $this->meeting->id,
            'meeting_code' => $this->meeting->code,
            'message' => $this->message,
            'action_url' => route('governance.meetings.index'),
        ];
    }
}
