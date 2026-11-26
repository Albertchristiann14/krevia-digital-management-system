<?php

namespace App\Notifications;

use App\Domain\Crm\Models\FollowUp;
use App\Notifications\Concerns\SupportsMultiChannelDelivery;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class CrmFollowUpNotification extends Notification
{
    use Queueable, SupportsMultiChannelDelivery;

    public function __construct(public readonly FollowUp $followUp) {}

    public function whatsappSubject(): string
    {
        return "CRM Follow-Up {$this->followUp->lead->code}";
    }

    public function toMail(object $notifiable): MailMessage
    {
        $lead = $this->followUp->lead;
        $companyName = $lead?->company?->name ?? 'Prospek';
        $dueDate = $this->followUp->due_at?->format('d M Y') ?? '-';

        return $this->buildKdmsViewMail(
            "[DMS] CRM Follow-Up: {$lead->code} — {$companyName}",
            'emails.notifications.generic',
            [
                'preheader' => "Follow-up prospek {$lead->code} ({$companyName}) dijadwalkan pada {$dueDate}.",
                'categoryBadge' => 'CRM Follow-Up',
                'headline' => "Follow-Up Prospek {$lead->code}",
                'recipientName' => $notifiable->name ?? 'Tim Krevia Digital',
                'messageText' => "Follow-up prospek {$lead->code} ({$companyName}) dijadwalkan pada {$dueDate}.",
                'details' => [
                    'Kode Prospek' => $lead->code,
                    'Perusahaan' => $companyName,
                    'Jatuh Tempo' => $dueDate,
                ],
                'actionLabel' => 'Open CRM Lead',
                'actionUrl' => route('crm.leads.show', $lead),
            ]
        );
    }

    public function toWhatsApp(object $notifiable): string
    {
        $lead = $this->followUp->lead;

        return "*[KDMS CRM Follow-Up]*\nProspek: {$lead->code} — {$lead->company->name}\nJatuh tempo: {$this->followUp->due_at->format('Y-m-d')}";
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        $lead = $this->followUp->lead;

        return [
            'category' => 'crm',
            'priority' => $this->followUp->due_at->lt(now()->startOfDay()) ? 'high' : 'normal',
            'follow_up_id' => $this->followUp->id,
            'lead_id' => $lead->id,
            'message' => "CRM Follow-up due ({$this->followUp->due_at->format('Y-m-d')}): {$lead->code} — {$lead->company->name}.",
            'url' => "/crm/leads/{$lead->id}",
        ];
    }
}
