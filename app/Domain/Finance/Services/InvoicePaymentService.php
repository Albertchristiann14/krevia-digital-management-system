<?php

namespace App\Domain\Finance\Services;

use App\Domain\Finance\Models\FinanceCashAccount;
use App\Domain\Finance\Models\FinanceConfiguration;
use App\Domain\Finance\Models\Invoice;
use App\Domain\Finance\Models\InvoicePayment;
use App\Domain\Finance\Models\Transaction;
use App\Domain\Workspace\Services\AuditLogger;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class InvoicePaymentService
{
    public function __construct(private readonly AuditLogger $audit) {}

    public function recordPayment(
        Invoice $invoice,
        float $amount,
        string $paidAt,
        string $paymentMethod,
        ?string $referenceNo,
        User $actor,
        ?string $receiptPath = null,
        ?string $notes = null
    ): InvoicePayment {
        if ($invoice->status === 'Void') {
            throw ValidationException::withMessages([
                'invoice' => "Cannot record payment for voided invoice {$invoice->invoice_no}.",
            ]);
        }

        $remaining = round((float) $invoice->amount - (float) $invoice->paid_amount, 2);
        if ($amount <= 0 || $amount > $remaining) {
            throw ValidationException::withMessages([
                'amount' => "Payment amount must be greater than 0 and at most remaining balance ({$remaining}).",
            ]);
        }

        return DB::transaction(function () use (
            $invoice,
            $amount,
            $paidAt,
            $paymentMethod,
            $referenceNo,
            $actor,
            $receiptPath,
            $notes
        ): InvoicePayment {
            $payment = InvoicePayment::create([
                'invoice_id' => $invoice->id,
                'amount' => $amount,
                'paid_at' => $paidAt,
                'payment_method' => $paymentMethod,
                'reference_no' => $referenceNo,
                'receipt_path' => $receiptPath,
                'notes' => $notes,
                'recorded_by' => $actor->id,
            ]);

            $maxTrxNum = Transaction::withTrashed()
                ->where('code', 'like', 'TRX-%')
                ->pluck('code')
                ->map(fn (string $c) => (int) str_replace('TRX-', '', $c))
                ->max() ?? 0;

            Transaction::create([
                'code' => sprintf('TRX-%04d', $maxTrxNum + 1),
                'transaction_date' => $paidAt,
                'period_month' => Carbon::parse($paidAt)->format('Y-m'),
                'type' => Transaction::TYPE_INCOME,
                'description' => "Pembayaran {$invoice->invoice_no} — {$invoice->description}",
                'category' => 'Pendapatan Proyek',
                'amount' => $amount,
                'invoice_id' => $invoice->id,
                'company_id' => $invoice->company_id,
                'project_id' => $invoice->project_id,
                'pic_user_id' => $actor->id,
                'reference' => $referenceNo ?: $invoice->invoice_no,
                'evidence_path' => $receiptPath,
                'notes' => $notes,
                'recorded_by' => $actor->id,
            ]);

            $newPaidTotal = round((float) $invoice->payments()->sum('amount'), 2);
            $newStatus = $newPaidTotal >= round((float) $invoice->amount, 2) ? 'Paid' : 'Partial';

            $invoice->update([
                'paid_amount' => $newPaidTotal,
                'status' => $newStatus,
            ]);

            $cfg = FinanceConfiguration::query()->first();
            $cashAcc = FinanceCashAccount::query()
                ->where('account_type', $paymentMethod === 'Cash' ? 'Cash' : 'Bank')
                ->first() ?? FinanceCashAccount::query()->first();

            if ($cfg && $cashAcc && $cfg->default_ar_account_id) {
                app(AccountingEngineService::class)->createAndPostSystemJournal(
                    $paidAt,
                    "Invoice Payment {$invoice->invoice_no}",
                    [
                        [
                            'account_id' => $cashAcc->gl_account_id,
                            'debit' => $amount,
                            'credit' => 0,
                            'company_id' => $invoice->company_id,
                            'project_id' => $invoice->project_id,
                        ],
                        [
                            'account_id' => $cfg->default_ar_account_id,
                            'debit' => 0,
                            'credit' => $amount,
                            'company_id' => $invoice->company_id,
                            'project_id' => $invoice->project_id,
                        ],
                    ],
                    $actor,
                    InvoicePayment::class,
                    (string) $payment->id
                );
                $cashAcc->increment('current_balance', $amount);
            }

            $this->audit->log(
                'finance.payment_recorded',
                "Recorded payment of {$amount} on {$invoice->invoice_no} ({$newStatus}) and synced income ledger.",
                $invoice,
                null,
                ['amount' => $amount, 'paid_amount' => $newPaidTotal, 'status' => $newStatus],
                $actor->id
            );

            return $payment;
        });
    }
}
