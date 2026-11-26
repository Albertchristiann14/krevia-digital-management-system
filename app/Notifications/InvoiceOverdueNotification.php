<?php

namespace App\Notifications;

use App\Domain\Finance\Models\Invoice;
use App\Notifications\Concerns\SupportsMultiChannelDelivery;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class InvoiceOverdueNotification extends Notification
{
    use Queueable, SupportsMultiChannelDelivery;

    public function __construct(public readonly Invoice $invoice) {}

    public function whatsappSubject(): string
    {
        return "Invoice {$this->invoice->invoice_no} Overdue";
    }

    public function toMail(object $notifiable): MailMessage
    {
        $companyName = $this->invoice->company?->name ?? 'Klien';
        $dueDate = $this->invoice->due_date?->format('d M Y') ?? '-';
        $remaining = 'Rp '.number_format($this->invoice->balanceRemaining(), 0, ',', '.');

        return $this->buildKdmsViewMail(
            "[DMS] Invoice Overdue: {$this->invoice->invoice_no}",
            'emails.notifications.generic',
            [
                'preheader' => "Invoice {$this->invoice->invoice_no} ({$companyName}) melewati jatuh tempo {$dueDate}.",
                'categoryBadge' => 'Finance Alert',
                'headline' => "Invoice {$this->invoice->invoice_no} Jatuh Tempo",
                'recipientName' => $notifiable->name ?? 'Tim Krevia Digital',
                'messageText' => "Invoice {$this->invoice->invoice_no} untuk {$companyName} telah melewati tanggal jatuh tempo {$dueDate}. Mohon tindak lanjuti penagihan.",
                'details' => [
                    'Nomor Invoice' => $this->invoice->invoice_no,
                    'Klien' => $companyName,
                    'Jatuh Tempo' => $dueDate,
                    'Sisa Tagihan' => $remaining,
                ],
                'actionLabel' => 'View Invoice',
                'actionUrl' => route('finance.index'),
            ]
        );
    }

    public function toWhatsApp(object $notifiable): string
    {
        return "*[KDMS Finance · Invoice Overdue]*\nInvoice: {$this->invoice->invoice_no} ({$this->invoice->company?->name})\nJatuh tempo: {$this->invoice->due_date?->format('Y-m-d')}";
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'invoice_overdue',
            'invoice_id' => $this->invoice->id,
            'invoice_no' => $this->invoice->invoice_no,
            'company' => $this->invoice->company?->name,
            'remaining' => $this->invoice->balanceRemaining(),
            'due_date' => $this->invoice->due_date?->format('Y-m-d'),
            'message' => "Invoice {$this->invoice->invoice_no} ({$this->invoice->company?->name}) is overdue since {$this->invoice->due_date?->format('Y-m-d')}.",
            'action_url' => route('finance.index'),
        ];
    }
}
