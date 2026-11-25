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
        return $this->buildKdmsMail(
            "Konten {$this->contentItem->code} ({$this->contentItem->platform})",
            $this->message,
            'Buka Kalender Konten',
            "/marketing/content/{$this->contentItem->id}"
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
