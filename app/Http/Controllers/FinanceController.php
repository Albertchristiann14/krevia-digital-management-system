<?php

namespace App\Http\Controllers;

use App\Domain\Crm\Models\Company;
use App\Domain\Finance\Models\Budget;
use App\Domain\Finance\Models\FinanceConfiguration;
use App\Domain\Finance\Models\FinancialSetting;
use App\Domain\Finance\Models\Invoice;
use App\Domain\Finance\Models\Transaction;
use App\Domain\Finance\Services\CashflowService;
use App\Domain\Finance\Services\FinanceOperationsService;
use App\Domain\Finance\Services\InvoicePaymentService;
use App\Domain\Project\Models\Project;
use App\Domain\Shared\Services\ReferenceCacheService;
use App\Domain\Workspace\Services\AuditLogger;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class FinanceController extends Controller
{
    public function index(Request $request, CashflowService $cashflow, ReferenceCacheService $refs): Response
    {
        $this->authorize('viewAny', Invoice::class);

        $summary = $cashflow->getSummary();

        $budgets = Budget::query()
            ->with('pic:id,name')
            ->orderBy('id')
            ->get();

        $expenseByCategory = Transaction::query()
            ->where('type', Transaction::TYPE_EXPENSE)
            ->selectRaw('category, SUM(amount) as spent')
            ->groupBy('category')
            ->pluck('spent', 'category');

        $invoices = Invoice::query()
            ->with(['company:id,name', 'project:id,code,name', 'payments.recorder:id,name'])
            ->latest('issue_date')
            ->latest('id')
            ->get();

        $transactions = Transaction::query()
            ->with(['company:id,name', 'project:id,code', 'pic:id,name', 'invoice:id,invoice_no'])
            ->latest('transaction_date')
            ->latest('id')
            ->get();

        return Inertia::render('Finance/Index', [
            'summary' => $summary,
            'monthlyCashflow' => $cashflow->getMonthlyCashflow($summary['opening_cash_balance'], true),
            'budgets' => $budgets->map(function (Budget $b) use ($expenseByCategory) {
                $actual = (float) ($expenseByCategory[$b->category] ?? 0);
                $target = $b->target_amount !== null ? (float) $b->target_amount : null;

                return [
                    'id' => $b->id,
                    'fiscal_year' => $b->fiscal_year,
                    'category' => $b->category,
                    'pic_user_id' => $b->pic_user_id,
                    'pic_name' => $b->pic?->name,
                    'assumptions' => $b->assumptions,
                    'target_amount' => $target,
                    'actual_spent' => $actual,
                    'variance' => $target !== null ? round($target - $actual, 2) : null,
                    'utilization_pct' => $target && $target > 0 ? round(($actual / $target) * 100, 1) : null,
                    'data_status' => $b->data_status,
                    'notes' => $b->notes,
                ];
            }),
            'invoices' => $invoices->map(fn (Invoice $inv) => [
                'id' => $inv->id,
                'invoice_no' => $inv->invoice_no,
                'company_name' => $inv->company?->name,
                'project_code' => $inv->project?->code,
                'description' => $inv->description,
                'issue_date' => $inv->issue_date?->format('Y-m-d'),
                'due_date' => $inv->due_date?->format('Y-m-d'),
                'amount' => (float) $inv->amount,
                'paid_amount' => (float) $inv->paid_amount,
                'remaining' => $inv->balanceRemaining(),
                'status' => $inv->status,
                'payments' => $inv->payments->map(fn ($p) => [
                    'id' => $p->id,
                    'amount' => (float) $p->amount,
                    'paid_at' => $p->paid_at?->format('Y-m-d'),
                    'payment_method' => $p->payment_method,
                    'reference_no' => $p->reference_no,
                    'recorder' => $p->recorder?->name,
                ]),
            ]),
            'transactions' => $transactions->map(fn (Transaction $t) => [
                'id' => $t->id,
                'code' => $t->code,
                'transaction_date' => $t->transaction_date?->format('Y-m-d'),
                'period_month' => $t->period_month,
                'type' => $t->type,
                'description' => $t->description,
                'category' => $t->category,
                'amount' => (float) $t->amount,
                'pic_name' => $t->pic?->name,
                'company_name' => $t->company?->name,
                'invoice_no' => $t->invoice?->invoice_no,
                'reference' => $t->reference,
                'has_evidence' => $t->evidence_path !== null,
            ]),
            'companies' => Company::query()->orderBy('name')->get(['id', 'name']),
            'projects' => Project::query()->orderBy('code')->get(['id', 'code', 'name', 'company_id']),
            'users' => $refs->activeUsers(),
            'categories' => Transaction::CATEGORIES,
            'canManage' => $request->user()?->canManageFinance() ?? false,
        ]);
    }

    public function updateSettings(Request $request, AuditLogger $audit): RedirectResponse
    {
        $this->authorize('manage', Invoice::class);

        $data = $request->validate([
            'opening_cash_balance' => ['required', 'numeric', 'min:0'],
            'opening_cash_date' => ['required', 'date'],
            'data_status' => ['required', Rule::in(['Disepakati', 'Usulan', 'Perlu Konfirmasi Manajemen'])],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $setting = FinancialSetting::firstOrCreate(['id' => 1]);
        $setting->update([
            ...$data,
            'confirmed_by' => $request->user()->id,
            'confirmed_at' => now(),
        ]);

        $audit->log('finance.settings_updated', 'Updated opening cash balance setting.', $setting);

        return back()->with('success', 'Financial opening balance updated.');
    }

    public function updateBudget(Request $request, Budget $budget, AuditLogger $audit): RedirectResponse
    {
        $this->authorize('manage', Invoice::class);

        $data = $request->validate([
            'target_amount' => ['nullable', 'numeric', 'min:0'],
            'pic_user_id' => ['nullable', 'exists:users,id'],
            'assumptions' => ['nullable', 'string', 'max:1000'],
            'data_status' => ['required', Rule::in(['Disepakati', 'Usulan', 'Perlu Konfirmasi Manajemen'])],
            'notes' => ['nullable', 'string', 'max:1500'],
        ]);

        $budget->update($data);
        $audit->log('finance.budget_updated', "Updated 2027 budget for category '{$budget->category}'.", $budget);

        return back()->with('success', "Budget '{$budget->category}' updated.");
    }

    public function storeInvoice(Request $request, AuditLogger $audit): RedirectResponse
    {
        $this->authorize('manage', Invoice::class);

        $data = $request->validate([
            'company_id' => ['required', 'exists:companies,id'],
            'project_id' => ['nullable', 'exists:projects,id'],
            'description' => ['required', 'string', 'max:255'],
            'issue_date' => ['required', 'date'],
            'due_date' => ['required', 'date', 'after_or_equal:issue_date'],
            'amount' => ['required', 'numeric', 'min:1'],
            'status' => ['required', Rule::in(['Draft', 'Sent'])],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $maxNum = Invoice::withTrashed()
            ->where('invoice_no', 'like', 'INV-%')
            ->pluck('invoice_no')
            ->map(fn (string $c) => (int) str_replace('INV-', '', $c))
            ->max() ?? 0;

        $invoice = Invoice::create([
            'invoice_no' => sprintf('INV-%03d', $maxNum + 1),
            ...$data,
            'paid_amount' => 0,
            'created_by' => $request->user()->id,
        ]);

        if ($invoice->status !== 'Draft' && FinanceConfiguration::query()->exists()) {
            app(FinanceOperationsService::class)->postInvoiceIssuanceJournal($invoice, $request->user());
        }

        $audit->log('finance.invoice_created', "Created invoice {$invoice->invoice_no}.", $invoice);

        return back()->with('success', "Invoice {$invoice->invoice_no} created.");
    }

    public function voidInvoice(Request $request, Invoice $invoice, AuditLogger $audit): RedirectResponse
    {
        $this->authorize('manage', Invoice::class);

        if ((float) $invoice->paid_amount > 0) {
            return back()->withErrors(['invoice' => 'Cannot void an invoice that already has recorded payments.']);
        }

        $invoice->update(['status' => 'Void']);
        $audit->log('finance.invoice_voided', "Voided invoice {$invoice->invoice_no}.", $invoice);

        return back()->with('success', "Invoice {$invoice->invoice_no} voided.");
    }

    public function recordPayment(
        Request $request,
        Invoice $invoice,
        InvoicePaymentService $service
    ): RedirectResponse {
        $this->authorize('manage', Invoice::class);

        $data = $request->validate([
            'amount' => ['required', 'numeric', 'min:0.01'],
            'paid_at' => ['required', 'date'],
            'payment_method' => ['required', 'string', 'max:60'],
            'reference_no' => ['nullable', 'string', 'max:120'],
            'notes' => ['nullable', 'string', 'max:1500'],
            'receipt' => ['nullable', 'file', 'max:10240'],
        ]);

        $receiptPath = $request->hasFile('receipt')
            ? $request->file('receipt')->store("finance-receipts/{$invoice->id}", 'local')
            : null;

        $service->recordPayment(
            $invoice,
            (float) $data['amount'],
            $data['paid_at'],
            $data['payment_method'],
            $data['reference_no'] ?? null,
            $request->user(),
            $receiptPath,
            $data['notes'] ?? null
        );

        return back()->with('success', "Payment recorded on {$invoice->invoice_no} and added to Transaction Ledger.");
    }

    public function storeTransaction(Request $request, AuditLogger $audit): RedirectResponse
    {
        $this->authorize('manage', Invoice::class);

        $data = $request->validate([
            'transaction_date' => ['required', 'date'],
            'type' => ['required', Rule::in(Transaction::TYPES)],
            'description' => ['required', 'string', 'max:255'],
            'category' => ['required', Rule::in(Transaction::CATEGORIES)],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'pic_user_id' => ['nullable', 'exists:users,id'],
            'company_id' => ['nullable', 'exists:companies,id'],
            'project_id' => ['nullable', 'exists:projects,id'],
            'reference' => ['nullable', 'string', 'max:200'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'evidence' => ['nullable', 'file', 'max:10240'],
        ]);

        $budgetId = Budget::where('fiscal_year', 2027)
            ->where('category', $data['category'])
            ->value('id');

        $evidencePath = $request->hasFile('evidence')
            ? $request->file('evidence')->store('finance-evidence', 'local')
            : null;

        $maxTrxNum = Transaction::withTrashed()
            ->where('code', 'like', 'TRX-%')
            ->pluck('code')
            ->map(fn (string $c) => (int) str_replace('TRX-', '', $c))
            ->max() ?? 0;

        $trx = Transaction::create([
            'code' => sprintf('TRX-%04d', $maxTrxNum + 1),
            'transaction_date' => $data['transaction_date'],
            'period_month' => Carbon::parse($data['transaction_date'])->format('Y-m'),
            'type' => $data['type'],
            'description' => $data['description'],
            'category' => $data['category'],
            'amount' => $data['amount'],
            'budget_id' => $budgetId,
            'company_id' => $data['company_id'] ?? null,
            'project_id' => $data['project_id'] ?? null,
            'pic_user_id' => $data['pic_user_id'] ?? $request->user()->id,
            'reference' => $data['reference'] ?? null,
            'evidence_path' => $evidencePath,
            'notes' => $data['notes'] ?? null,
            'recorded_by' => $request->user()->id,
        ]);

        $audit->log('finance.transaction_recorded', "Recorded {$trx->type} {$trx->code} ({$trx->amount}).", $trx);

        return back()->with('success', "Transaction {$trx->code} recorded.");
    }

    public function downloadEvidence(Transaction $transaction): StreamedResponse
    {
        $this->authorize('view', Invoice::class);
        abort_unless($transaction->evidence_path && Storage::disk('local')->exists($transaction->evidence_path), 404);

        return Storage::disk('local')->download($transaction->evidence_path, "{$transaction->code}_evidence");
    }
}
