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
        return $this->buildKdmsMail(
            "Meeting SLA · {$this->meeting->code}",
            $this->message,
            'Buka Meetings & Evaluation',
            '/governance/meetings'
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
