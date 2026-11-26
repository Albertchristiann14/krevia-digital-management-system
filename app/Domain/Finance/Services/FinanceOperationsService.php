<?php

namespace App\Domain\Finance\Services;

use App\Domain\Finance\Models\FinanceApprovalRequest;
use App\Domain\Finance\Models\FinanceBankTransfer;
use App\Domain\Finance\Models\FinanceCashAccount;
use App\Domain\Finance\Models\FinanceCompensation;
use App\Domain\Finance\Models\FinanceConfiguration;
use App\Domain\Finance\Models\FinanceExpenseRequest;
use App\Domain\Finance\Models\FinancePayment;
use App\Domain\Finance\Models\FinancePaymentAllocation;
use App\Domain\Finance\Models\FinanceProjectBudget;
use App\Domain\Finance\Models\FinanceProjectCost;
use App\Domain\Finance\Models\FinanceReimbursement;
use App\Domain\Finance\Models\FinanceRevenueRecognitionEntry;
use App\Domain\Finance\Models\FinanceRevenueSchedule;
use App\Domain\Finance\Models\FinanceSubscription;
use App\Domain\Finance\Models\FinanceSubscriptionInvoice;
use App\Domain\Finance\Models\FinanceVendorBill;
use App\Domain\Finance\Models\FinanceVendorPayment;
use App\Domain\Finance\Models\Invoice;
use App\Domain\Finance\Models\Transaction;
use App\Domain\Project\Models\Project;
use App\Domain\Workspace\Services\AuditLogger;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class FinanceOperationsService
{
    public function __construct(
        private readonly AccountingEngineService $accounting,
        private readonly ApprovalWorkflowService $approvals,
        private readonly AuditLogger $audit,
    ) {}

    private function config(): FinanceConfiguration
    {
        return FinanceConfiguration::query()->firstOrFail();
    }

    /**
     * Records an accrual invoice issuance journal: DR Accounts Receivable, CR Revenue.
     */
    public function postInvoiceIssuanceJournal(Invoice $invoice, User $actor, ?string $revenueAccountId = null): void
    {
        $cfg = $this->config();
        $arAcc = $cfg->default_ar_account_id;
        $revAcc = $revenueAccountId ?: $cfg->default_revenue_account_id;

        if (! $arAcc || ! $revAcc || (float) $invoice->amount <= 0) {
            return;
        }

        $this->accounting->createAndPostSystemJournal(
            $invoice->issue_date->format('Y-m-d'),
            "Invoice Issued {$invoice->invoice_no} — {$invoice->description}",
            [
                [
                    'account_id' => $arAcc,
                    'debit' => (float) $invoice->amount,
                    'credit' => 0,
                    'company_id' => $invoice->company_id,
                    'project_id' => $invoice->project_id,
                ],
                [
                    'account_id' => $revAcc,
                    'debit' => 0,
                    'credit' => (float) $invoice->amount,
                    'company_id' => $invoice->company_id,
                    'project_id' => $invoice->project_id,
                ],
            ],
            $actor,
            Invoice::class,
            (string) $invoice->id
        );
    }

    /**
     * Multi-invoice payment allocation with idempotency & overpayment prevention.
     *
     * @param  array<int, array{invoice_id: int, amount: float}>  $allocations
     */
    public function recordAllocatedPayment(
        int $companyId,
        string $cashAccountId,
        string $paymentDate,
        float $amountReceived,
        string $paymentMethod,
        array $allocations,
        User $actor,
        ?string $referenceNo = null,
        ?string $idempotencyKey = null,
        ?string $notes = null
    ): FinancePayment {
        if ($idempotencyKey) {
            $existing = FinancePayment::query()->where('idempotency_key', $idempotencyKey)->first();
            if ($existing) {
                return $existing->load('allocations.invoice');
            }
        }

        $allocatedTotal = round(collect($allocations)->sum(fn ($a) => (float) $a['amount']), 2);
        if ($amountReceived <= 0 || $allocatedTotal <= 0 || $allocatedTotal > round($amountReceived, 2)) {
            throw ValidationException::withMessages([
                'allocations' => 'Total allocated amount must be positive and cannot exceed amount received.',
            ]);
        }

        return DB::transaction(function () use (
            $companyId,
            $cashAccountId,
            $paymentDate,
            $amountReceived,
            $allocatedTotal,
            $paymentMethod,
            $allocations,
            $actor,
            $referenceNo,
            $idempotencyKey,
            $notes
        ): FinancePayment {
            /** @var FinanceCashAccount $cashAcc */
            $cashAcc = FinanceCashAccount::query()->whereKey($cashAccountId)->lockForUpdate()->firstOrFail();
            $cfg = $this->config();

            $count = FinancePayment::count() + 1;
            $payment = FinancePayment::create([
                'payment_no' => sprintf('PAY/KRV/%s/%04d', Carbon::parse($paymentDate)->format('Y'), $count),
                'company_id' => $companyId,
                'cash_account_id' => $cashAcc->id,
                'payment_date' => $paymentDate,
                'amount_received' => round($amountReceived, 2),
                'unallocated_amount' => round($amountReceived - $allocatedTotal, 2),
                'payment_method' => $paymentMethod,
                'reference_no' => $referenceNo,
                'idempotency_key' => $idempotencyKey,
                'notes' => $notes,
                'recorded_by' => $actor->id,
            ]);

            foreach ($allocations as $alloc) {
                /** @var Invoice $inv */
                $inv = Invoice::query()->whereKey($alloc['invoice_id'])->lockForUpdate()->firstOrFail();
                if ($inv->company_id !== $companyId) {
                    throw ValidationException::withMessages([
                        'allocations' => "Invoice {$inv->invoice_no} does not belong to selected client.",
                    ]);
                }

                $remaining = round((float) $inv->amount - (float) $inv->paid_amount, 2);
                $amt = round((float) $alloc['amount'], 2);
                if ($amt <= 0 || $amt > $remaining) {
                    throw ValidationException::withMessages([
                        'allocations' => "Allocation ({$amt}) exceeds remaining balance ({$remaining}) for {$inv->invoice_no}.",
                    ]);
                }

                FinancePaymentAllocation::create([
                    'payment_id' => $payment->id,
                    'invoice_id' => $inv->id,
                    'allocated_amount' => $amt,
                ]);

                $newPaid = round((float) $inv->paid_amount + $amt, 2);
                $inv->update([
                    'paid_amount' => $newPaid,
                    'status' => $newPaid >= round((float) $inv->amount, 2) ? 'Paid' : 'Partial',
                ]);
            }

            $journal = $this->accounting->createAndPostSystemJournal(
                $paymentDate,
                "Customer Payment {$payment->payment_no}",
                [
                    [
                        'account_id' => $cashAcc->gl_account_id,
                        'debit' => round($amountReceived, 2),
                        'credit' => 0,
                        'company_id' => $companyId,
                    ],
                    [
                        'account_id' => $cfg->default_ar_account_id,
                        'debit' => 0,
                        'credit' => round($amountReceived, 2),
                        'company_id' => $companyId,
                    ],
                ],
                $actor,
                FinancePayment::class,
                (string) $payment->id
            );

            $payment->update(['journal_id' => $journal->id]);
            $cashAcc->increment('current_balance', round($amountReceived, 2));

            return $payment->fresh(['allocations.invoice', 'journal']);
        });
    }

    /**
     * Submits an expense request into Founder Approval Inbox.
     */
    public function submitExpenseRequest(array $data, User $requester): FinanceExpenseRequest
    {
        return DB::transaction(function () use ($data, $requester): FinanceExpenseRequest {
            $count = FinanceExpenseRequest::count() + 1;
            $amount = round((float) $data['amount'], 2);
            $taxAmount = round((float) ($data['tax_amount'] ?? 0), 2);
            $total = round($amount + $taxAmount, 2);

            $expense = FinanceExpenseRequest::create([
                'expense_no' => sprintf('EXP/KRV/%s/%04d', now()->format('Y'), $count),
                'requester_id' => $requester->id,
                'project_id' => $data['project_id'] ?? null,
                'expense_date' => $data['expense_date'],
                'category' => $data['category'],
                'description' => $data['description'],
                'amount' => $amount,
                'tax_id' => $data['tax_id'] ?? null,
                'tax_amount' => $taxAmount,
                'total_amount' => $total,
                'payment_method' => $data['payment_method'] ?? 'Bank Transfer',
                'receipt_path' => $data['receipt_path'] ?? null,
                'approval_status' => 'Pending Approval',
                'payment_status' => 'Unpaid',
                'expense_account_id' => $data['expense_account_id'] ?? $this->config()->default_expense_account_id,
            ]);

            $this->approvals->submitRequest(
                'Expense Request',
                $expense,
                $requester,
                $total,
                "{$expense->expense_no}: {$expense->description}"
            );

            return $expense;
        });
    }

    /**
     * Pays an approved expense request and posts double-entry journal + project cost allocation.
     */
    public function payExpenseRequest(FinanceExpenseRequest $expense, string $cashAccountId, User $actor): FinanceExpenseRequest
    {
        if (! $actor->canManageFinance()) {
            abort(403);
        }

        if ($expense->approval_status !== 'Approved') {
            throw ValidationException::withMessages([
                'expense' => 'Expense request must be approved by Founder before payment.',
            ]);
        }

        if ($expense->payment_status === 'Paid') {
            throw ValidationException::withMessages([
                'expense' => 'Expense request is already paid.',
            ]);
        }

        return DB::transaction(function () use ($expense, $cashAccountId, $actor): FinanceExpenseRequest {
            /** @var FinanceCashAccount $cashAcc */
            $cashAcc = FinanceCashAccount::query()->whereKey($cashAccountId)->lockForUpdate()->firstOrFail();
            $expenseAccId = $expense->expense_account_id ?: $this->config()->default_expense_account_id;

            $journal = $this->accounting->createAndPostSystemJournal(
                now()->format('Y-m-d'),
                "Expense Paid {$expense->expense_no} — {$expense->description}",
                [
                    [
                        'account_id' => $expenseAccId,
                        'debit' => (float) $expense->total_amount,
                        'credit' => 0,
                        'project_id' => $expense->project_id,
                    ],
                    [
                        'account_id' => $cashAcc->gl_account_id,
                        'debit' => 0,
                        'credit' => (float) $expense->total_amount,
                        'project_id' => $expense->project_id,
                    ],
                ],
                $actor,
                FinanceExpenseRequest::class,
                (string) $expense->id
            );

            $expense->update([
                'payment_status' => 'Paid',
                'cash_account_id' => $cashAcc->id,
                'journal_id' => $journal->id,
                'paid_at' => now(),
            ]);

            $cashAcc->decrement('current_balance', (float) $expense->total_amount);
            $this->syncLedgerTransaction(
                $expense->expense_date->format('Y-m-d'),
                Transaction::TYPE_EXPENSE,
                "{$expense->expense_no} — {$expense->description}",
                $expense->category,
                (float) $expense->total_amount,
                $expense->project_id,
                $expense->requester_id,
                $expense->expense_no,
                $actor->id
            );

            if ($expense->project_id) {
                FinanceProjectCost::firstOrCreate(
                    [
                        'project_id' => $expense->project_id,
                        'source_type' => FinanceExpenseRequest::class,
                        'source_id' => (string) $expense->id,
                    ],
                    [
                        'cost_type' => 'Other',
                        'description' => $expense->description,
                        'cost_date' => $expense->expense_date->format('Y-m-d'),
                        'amount' => $expense->total_amount,
                        'is_committed' => false,
                        'journal_id' => $journal->id,
                    ]
                );
            }

            return $expense->fresh('journal');
        });
    }

    /**
     * Pays an approved compensation record, posts journal, and links project cost uniquely.
     */
    public function payCompensation(FinanceCompensation $comp, string $cashAccountId, string $paymentDate, ?string $reference, User $actor): FinanceCompensation
    {
        if (! $actor->canManageFinance()) {
            abort(403);
        }

        if ($comp->approval_status !== 'Approved') {
            throw ValidationException::withMessages([
                'compensation' => 'Compensation must be approved by Founder before payment.',
            ]);
        }

        if ($comp->payment_status === 'Paid') {
            throw ValidationException::withMessages([
                'compensation' => 'Compensation is already paid.',
            ]);
        }

        return DB::transaction(function () use ($comp, $cashAccountId, $paymentDate, $reference, $actor): FinanceCompensation {
            /** @var FinanceCashAccount $cashAcc */
            $cashAcc = FinanceCashAccount::query()->whereKey($cashAccountId)->lockForUpdate()->firstOrFail();
            $compExpAccId = \App\Domain\Finance\Models\FinanceAccount::where('code', '5100')->value('id')
                ?: $this->config()->default_expense_account_id;

            $journal = $this->accounting->createAndPostSystemJournal(
                $paymentDate,
                "Team Compensation {$comp->compensation_no} ({$comp->compensation_type})",
                [
                    [
                        'account_id' => $compExpAccId,
                        'debit' => (float) $comp->amount,
                        'credit' => 0,
                        'project_id' => $comp->project_id,
                        'user_id' => $comp->user_id,
                    ],
                    [
                        'account_id' => $cashAcc->gl_account_id,
                        'debit' => 0,
                        'credit' => (float) $comp->amount,
                        'project_id' => $comp->project_id,
                        'user_id' => $comp->user_id,
                    ],
                ],
                $actor,
                FinanceCompensation::class,
                (string) $comp->id
            );

            $comp->update([
                'payment_status' => 'Paid',
                'payment_date' => $paymentDate,
                'payment_reference' => $reference,
                'cash_account_id' => $cashAcc->id,
                'journal_id' => $journal->id,
            ]);

            $cashAcc->decrement('current_balance', (float) $comp->amount);
            $this->syncLedgerTransaction(
                $paymentDate,
                Transaction::TYPE_EXPENSE,
                "{$comp->compensation_no} ({$comp->compensation_type}) — {$comp->description}",
                'Operasional',
                (float) $comp->amount,
                $comp->project_id,
                $comp->user_id,
                $comp->payment_reference ?: $comp->compensation_no,
                $actor->id
            );

            if ($comp->project_id) {
                FinanceProjectCost::firstOrCreate(
                    [
                        'project_id' => $comp->project_id,
                        'source_type' => FinanceCompensation::class,
                        'source_id' => (string) $comp->id,
                    ],
                    [
                        'cost_type' => 'Direct Labor',
                        'description' => "{$comp->compensation_type}: {$comp->description}",
                        'cost_date' => $paymentDate,
                        'amount' => $comp->amount,
                        'is_committed' => false,
                        'journal_id' => $journal->id,
                    ]
                );
            }

            return $comp->fresh('journal');
        });
    }

    /**
     * Executes an internal transfer between Cash/Bank accounts (never Revenue or Expense).
     */
    public function recordInternalTransfer(
        string $fromCashId,
        string $toCashId,
        string $transferDate,
        float $amount,
        User $actor,
        ?string $referenceNo = null,
        ?string $notes = null
    ): FinanceBankTransfer {
        if ($fromCashId === $toCashId) {
            throw ValidationException::withMessages([
                'to_cash_account_id' => 'Destination account must differ from source account.',
            ]);
        }

        if ($amount <= 0) {
            throw ValidationException::withMessages([
                'amount' => 'Transfer amount must be positive.',
            ]);
        }

        return DB::transaction(function () use ($fromCashId, $toCashId, $transferDate, $amount, $actor, $referenceNo, $notes): FinanceBankTransfer {
            $from = FinanceCashAccount::query()->whereKey($fromCashId)->lockForUpdate()->firstOrFail();
            $to = FinanceCashAccount::query()->whereKey($toCashId)->lockForUpdate()->firstOrFail();

            $count = FinanceBankTransfer::count() + 1;
            $transfer = FinanceBankTransfer::create([
                'transfer_no' => sprintf('TRF/KRV/%s/%04d', Carbon::parse($transferDate)->format('Y'), $count),
                'from_cash_account_id' => $from->id,
                'to_cash_account_id' => $to->id,
                'transfer_date' => $transferDate,
                'amount' => round($amount, 2),
                'reference_no' => $referenceNo,
                'notes' => $notes,
                'created_by' => $actor->id,
            ]);

            $journal = $this->accounting->createAndPostSystemJournal(
                $transferDate,
                "Internal Transfer {$transfer->transfer_no}: {$from->name} -> {$to->name}",
                [
                    [
                        'account_id' => $to->gl_account_id,
                        'debit' => round($amount, 2),
                        'credit' => 0,
                    ],
                    [
                        'account_id' => $from->gl_account_id,
                        'debit' => 0,
                        'credit' => round($amount, 2),
                    ],
                ],
                $actor,
                FinanceBankTransfer::class,
                (string) $transfer->id
            );

            $transfer->update(['journal_id' => $journal->id]);
            $from->decrement('current_balance', round($amount, 2));
            $to->increment('current_balance', round($amount, 2));

            return $transfer->fresh('journal');
        });
    }

    /**
     * Generates recurring subscription invoices idempotently for the current billing period.
     */
    public function generateSubscriptionInvoice(FinanceSubscription $sub, User $actor): ?Invoice
    {
        $sub->loadMissing('plan', 'company');
        $periodStart = $sub->next_billing_date->copy();
        $periodEnd = $sub->plan->billing_cycle === 'Annual'
            ? $periodStart->copy()->addYear()->subDay()
            : $periodStart->copy()->addMonth()->subDay();

        $alreadyExists = FinanceSubscriptionInvoice::query()
            ->where('subscription_id', $sub->id)
            ->whereDate('billing_period_start', $periodStart->format('Y-m-d'))
            ->whereDate('billing_period_end', $periodEnd->format('Y-m-d'))
            ->exists();

        if ($alreadyExists) {
            return null;
        }

        return DB::transaction(function () use ($sub, $periodStart, $periodEnd, $actor): Invoice {
            $maxInv = Invoice::withTrashed()->count() + 1;
            $invoice = Invoice::create([
                'invoice_no' => sprintf('INV/KRV/%s/%04d', $periodStart->format('Y'), $maxInv),
                'company_id' => $sub->company_id,
                'project_id' => $sub->project_id,
                'description' => "Subscription {$sub->plan->name} ({$periodStart->format('Y-m-d')} to {$periodEnd->format('Y-m-d')})",
                'issue_date' => $periodStart->format('Y-m-d'),
                'due_date' => $periodStart->copy()->addDays(14)->format('Y-m-d'),
                'amount' => $sub->plan->price,
                'paid_amount' => 0,
                'status' => 'Sent',
                'created_by' => $actor->id,
            ]);

            FinanceSubscriptionInvoice::create([
                'subscription_id' => $sub->id,
                'invoice_id' => $invoice->id,
                'billing_period_start' => $periodStart->format('Y-m-d'),
                'billing_period_end' => $periodEnd->format('Y-m-d'),
            ]);

            $sub->update([
                'next_billing_date' => $periodEnd->copy()->addDay()->format('Y-m-d'),
            ]);

            $this->postInvoiceIssuanceJournal($invoice, $actor, $sub->plan->revenue_account_id);

            return $invoice;
        });
    }

    /**
     * Recognizes a scheduled deferred revenue entry: DR Unearned Revenue, CR Subscription Revenue.
     */
    public function recognizeRevenueEntry(FinanceRevenueRecognitionEntry $entry, User $actor): FinanceRevenueRecognitionEntry
    {
        if ($entry->status === 'Recognized') {
            return $entry;
        }

        return DB::transaction(function () use ($entry, $actor): FinanceRevenueRecognitionEntry {
            /** @var FinanceRevenueRecognitionEntry $locked */
            $locked = FinanceRevenueRecognitionEntry::query()->whereKey($entry->id)->lockForUpdate()->firstOrFail();
            if ($locked->status === 'Recognized') {
                return $locked;
            }

            $schedule = $locked->schedule()->firstOrFail();
            $cfg = $this->config();
            $subRevAcc = \App\Domain\Finance\Models\FinanceAccount::where('code', '4300')->value('id')
                ?: $cfg->default_revenue_account_id;

            $journal = $this->accounting->createAndPostSystemJournal(
                $locked->recognition_date->format('Y-m-d'),
                "Deferred Revenue Recognition ({$locked->period_month}) — {$schedule->source_type}",
                [
                    [
                        'account_id' => $cfg->default_unearned_revenue_account_id,
                        'debit' => (float) $locked->amount,
                        'credit' => 0,
                        'company_id' => $schedule->company_id,
                        'project_id' => $schedule->project_id,
                    ],
                    [
                        'account_id' => $subRevAcc,
                        'debit' => 0,
                        'credit' => (float) $locked->amount,
                        'company_id' => $schedule->company_id,
                        'project_id' => $schedule->project_id,
                    ],
                ],
                $actor,
                FinanceRevenueRecognitionEntry::class,
                (string) $locked->id
            );

            $locked->update([
                'status' => 'Recognized',
                'journal_id' => $journal->id,
            ]);

            $schedule->increment('recognized_amount', (float) $locked->amount);

            return $locked->fresh('journal');
        });
    }

    private function syncLedgerTransaction(
        string $date,
        string $type,
        string $description,
        string $category,
        float $amount,
        ?int $projectId,
        ?int $picUserId,
        string $reference,
        int $actorId
    ): void {
        if (Transaction::query()->where('reference', $reference)->exists()) {
            return;
        }

        $maxTrxNum = Transaction::withTrashed()
            ->where('code', 'like', 'TRX-%')
            ->pluck('code')
            ->map(fn (string $c) => (int) str_replace('TRX-', '', $c))
            ->max() ?? 0;

        Transaction::create([
            'code' => sprintf('TRX-%04d', $maxTrxNum + 1),
            'transaction_date' => $date,
            'period_month' => Carbon::parse($date)->format('Y-m'),
            'type' => $type,
            'description' => $description,
            'category' => in_array($category, Transaction::CATEGORIES, true) ? $category : 'Operasional',
            'amount' => round($amount, 2),
            'project_id' => $projectId,
            'pic_user_id' => $picUserId,
            'reference' => $reference,
            'recorded_by' => $actorId,
        ]);
    }

    /**
     * Computes real-time financial summary for a single project.
     *
     * @return array<string, mixed>
     */
    public function getProjectFinancialSummary(Project $project): array
    {
        $budget = FinanceProjectBudget::query()->where('project_id', $project->id)->first();
        $actualDirectCosts = (float) FinanceProjectCost::query()
            ->where('project_id', $project->id)
            ->where('is_committed', false)
            ->sum('amount');
        $committedCosts = (float) FinanceProjectCost::query()
            ->where('project_id', $project->id)
            ->where('is_committed', true)
            ->sum('amount');

        $invoiceTotals = Invoice::query()
            ->where('project_id', $project->id)
            ->where('status', '!=', 'Void')
            ->selectRaw('COALESCE(SUM(amount), 0) as total_invoiced, COALESCE(SUM(paid_amount), 0) as total_paid')
            ->first();

        $totalInvoiced = (float) ($invoiceTotals->total_invoiced ?? 0);
        $paymentsReceived = (float) ($invoiceTotals->total_paid ?? 0);
        $contractValue = $budget ? (float) $budget->contract_value : $totalInvoiced;
        $approvedBudget = $budget ? (float) $budget->approved_budget : 0.0;
        $allocatedOverhead = $budget ? (float) $budget->allocated_overhead : 0.0;

        $grossProfit = round($totalInvoiced - $actualDirectCosts, 2);
        $netProfit = round($grossProfit - $allocatedOverhead, 2);
        $marginPct = $totalInvoiced > 0 ? round(($netProfit / $totalInvoiced) * 100, 1) : 0.0;

        return [
            'project_id' => $project->id,
            'project_code' => $project->code,
            'project_name' => $project->name,
            'contract_value' => $contractValue,
            'approved_budget' => $approvedBudget,
            'committed_costs' => $committedCosts,
            'actual_direct_costs' => $actualDirectCosts,
            'allocated_overhead' => $allocatedOverhead,
            'total_invoiced' => $totalInvoiced,
            'payments_received' => $paymentsReceived,
            'outstanding_receivable' => max(0.0, round($totalInvoiced - $paymentsReceived, 2)),
            'gross_profit' => $grossProfit,
            'net_profit' => $netProfit,
            'profit_margin_pct' => $marginPct,
            'budget_utilization_pct' => $approvedBudget > 0 ? round(($actualDirectCosts / $approvedBudget) * 100, 1) : 0.0,
            'approval_status' => $budget?->approval_status ?? 'Not Set',
        ];
    }
}
