<?php

namespace App\Notifications;

use App\Domain\Marketing\Models\ContentItem;
use App\Notifications\Concerns\SupportsMultiChannelDelivery;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class MarketingDeadlineNotification extends Notification
{
    use Queueable, SupportsMultiChannelDelivery;

    public function __construct(
        public readonly ContentItem $contentItem,
        public readonly string $alertType,
        public readonly string $message,
    ) {}

    public function whatsappSubject(): string
    {
        return "Konten {$this->contentItem->code}";
    }

    public function toMail(object $notifiable): MailMessage
    {
        return $this->buildKdmsViewMail(
            "[DMS] Content Reminder: {$this->contentItem->code}",
            'emails.notifications.generic',
            [
                'preheader' => mb_strimwidth($this->message, 0, 110, '...'),
                'categoryBadge' => 'Marketing',
                'headline' => "Pengingat Konten {$this->contentItem->code}",
                'recipientName' => $notifiable->name ?? 'Tim Krevia Digital',
                'messageText' => $this->message,
                'details' => array_filter([
                    'Kode Konten' => $this->contentItem->code,
                    'Platform' => $this->contentItem->platform,
                    'Topik' => $this->contentItem->title_topic,
                    'Tanggal Tayang' => $this->contentItem->publish_date?->format('d M Y'),
                ]),
                'actionLabel' => 'Open Content',
                'actionUrl' => route('marketing.show', $this->contentItem),
            ]
        );
    }

    public function toWhatsApp(object $notifiable): string
    {
        return "*[KDMS Konten · {$this->contentItem->code}]*\n{$this->message}";
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'marketing_deadline',
            'alert_type' => $this->alertType,
            'content_id' => $this->contentItem->id,
            'content_code' => $this->contentItem->code,
            'platform' => $this->contentItem->platform,
            'message' => $this->message,
            'action_url' => route('marketing.show', $this->contentItem),
        ];
    }
}
