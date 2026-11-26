<?php

namespace App\Http\Controllers;

use App\Domain\Crm\Models\Company;
use App\Domain\Finance\Models\FinanceAccount;
use App\Domain\Finance\Models\FinanceApprovalRequest;
use App\Domain\Finance\Models\FinanceBankTransfer;
use App\Domain\Finance\Models\FinanceCashAccount;
use App\Domain\Finance\Models\FinanceCompensation;
use App\Domain\Finance\Models\FinanceExpenseRequest;
use App\Domain\Finance\Models\FinanceJournal;
use App\Domain\Finance\Models\FinancePeriod;
use App\Domain\Finance\Models\FinanceProjectBudget;
use App\Domain\Finance\Models\FinanceReimbursement;
use App\Domain\Finance\Models\FinanceSubscription;
use App\Domain\Finance\Models\FinanceSubscriptionPlan;
use App\Domain\Finance\Models\FinanceTax;
use App\Domain\Finance\Models\FinanceVendor;
use App\Domain\Finance\Models\FinanceVendorBill;
use App\Domain\Finance\Models\Invoice;
use App\Domain\Finance\Services\AccountingEngineService;
use App\Domain\Finance\Services\AccountingPeriodService;
use App\Domain\Finance\Services\ApprovalWorkflowService;
use App\Domain\Finance\Services\FinanceOperationsService;
use App\Domain\Finance\Services\FinancialReportService;
use App\Domain\Project\Models\Project;
use App\Domain\Shared\Services\ReferenceCacheService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class AccountingSuiteController extends Controller
{
    public function index(
        Request $request,
        FinancialReportService $reports,
        FinanceOperationsService $ops,
        ReferenceCacheService $refs
    ): Response {
        abort_unless($request->user()?->hasPermissionTo('finance.view'), 403);

        $fromDate = $request->string('from_date')->toString() ?: null;
        $toDate = $request->string('to_date')->toString() ?: null;
        $ledgerAccountId = $request->string('account_id')->toString() ?: FinanceAccount::where('code', '1120')->value('id');

        $accounts = FinanceAccount::query()->orderBy('code')->get(['id', 'code', 'name', 'type', 'normal_balance', 'is_posting', 'is_active']);
        $periods = FinancePeriod::query()->with('fiscalYear:id,name')->orderBy('start_date')->get();
        $journals = FinanceJournal::query()->with(['lines.account:id,code,name', 'creator:id,name'])->latest('journal_date')->latest('created_at')->limit(50)->get();
        $cashAccounts = FinanceCashAccount::query()->with('glAccount:id,code,name')->orderBy('code')->get();
        $transfers = FinanceBankTransfer::query()->with(['fromAccount:id,name', 'toAccount:id,name'])->latest('transfer_date')->limit(30)->get();
        $approvals = FinanceApprovalRequest::query()->with(['requester:id,name', 'decider:id,name'])->latest('submitted_at')->limit(50)->get();
        $expenses = FinanceExpenseRequest::query()->with(['requester:id,name', 'project:id,code,name'])->latest('expense_date')->limit(50)->get();
        $vendors = FinanceVendor::query()->orderBy('code')->get();
        $vendorBills = FinanceVendorBill::query()->with(['vendor:id,name', 'project:id,code'])->latest('bill_date')->limit(50)->get();
        $reimbursements = FinanceReimbursement::query()->with(['user:id,name', 'project:id,code'])->latest('expense_date')->limit(50)->get();
        $compensations = FinanceCompensation::query()->with(['user:id,name', 'project:id,code'])->latest('created_at')->limit(50)->get();
        $plans = FinanceSubscriptionPlan::query()->orderBy('code')->get();
        $subscriptions = FinanceSubscription::query()->with(['company:id,name', 'plan:id,name,billing_cycle,price'])->latest('created_at')->get();
        $taxes = FinanceTax::query()->orderBy('code')->get();
        $projects = Project::query()->orderBy('code')->get(['id', 'code', 'name']);

        return Inertia::render('Finance/AccountingSuite', [
            'accounts' => $accounts,
            'periods' => $periods,
            'journals' => $journals,
            'cashAccounts' => $cashAccounts,
            'transfers' => $transfers,
            'approvals' => $approvals,
            'expenses' => $expenses,
            'vendors' => $vendors,
            'vendorBills' => $vendorBills,
            'reimbursements' => $reimbursements,
            'compensations' => $compensations,
            'subscriptionPlans' => $plans,
            'subscriptions' => $subscriptions,
            'taxes' => $taxes,
            'projectFinancials' => $projects->map(fn (Project $p) => $ops->getProjectFinancialSummary($p)),
            'trialBalance' => $reports->getTrialBalance($fromDate, $toDate),
            'generalLedger' => $ledgerAccountId ? $reports->getGeneralLedger($ledgerAccountId, $fromDate, $toDate) : null,
            'profitAndLoss' => $reports->getProfitAndLoss($fromDate, $toDate),
            'balanceSheet' => $reports->getBalanceSheet($toDate),
            'cashFlow' => $reports->getCashFlowStatement($fromDate, $toDate),
            'arAging' => $reports->getArAging(),
            'apAging' => $reports->getApAging(),
            'companies' => Company::query()->orderBy('name')->get(['id', 'name']),
            'users' => $refs->activeUsers(),
            'expenseCategories' => FinanceExpenseRequest::CATEGORIES,
            'compensationTypes' => FinanceCompensation::TYPES,
            'canManage' => $request->user()?->canManageFinance() ?? false,
            'isFounder' => $request->user()?->isManagingDirector() ?? false,
            'filters' => [
                'from_date' => $fromDate ?? '',
                'to_date' => $toDate ?? '',
                'account_id' => $ledgerAccountId ?? '',
            ],
        ]);
    }

    /**
     * Strictly isolated personal compensation & reimbursement view for any team member.
     */
    public function myCompensations(Request $request): Response
    {
        $user = $request->user();

        return Inertia::render('Finance/MyCompensations', [
            'compensations' => FinanceCompensation::query()
                ->with(['project:id,code,name', 'task:id,code,title'])
                ->where('user_id', $user->id)
                ->latest('created_at')
                ->get(),
            'reimbursements' => FinanceReimbursement::query()
                ->with('project:id,code,name')
                ->where('user_id', $user->id)
                ->latest('expense_date')
                ->get(),
            'projects' => Project::query()->orderBy('code')->get(['id', 'code', 'name']),
            'expenseCategories' => FinanceExpenseRequest::CATEGORIES,
        ]);
    }

    public function storeAccount(Request $request): RedirectResponse
    {
        abort_unless($request->user()?->canManageFinance(), 403);

        $data = $request->validate([
            'code' => ['required', 'string', 'max:20', Rule::unique('finance_accounts', 'code')],
            'name' => ['required', 'string', 'max:150'],
            'type' => ['required', Rule::in(['Asset', 'Liability', 'Equity', 'Revenue', 'Expense'])],
            'normal_balance' => ['required', Rule::in(['Debit', 'Credit'])],
            'parent_id' => ['nullable', 'uuid', 'exists:finance_accounts,id'],
            'description' => ['nullable', 'string', 'max:500'],
            'is_posting' => ['boolean'],
        ]);

        FinanceAccount::create([
            ...$data,
            'is_posting' => $data['is_posting'] ?? true,
            'is_active' => true,
        ]);

        return back()->with('success', "Account {$data['code']} — {$data['name']} created.");
    }

    public function storeJournal(Request $request, AccountingEngineService $engine): RedirectResponse
    {
        abort_unless($request->user()?->canManageFinance(), 403);

        $data = $request->validate([
            'journal_date' => ['required', 'date'],
            'journal_type' => ['required', Rule::in(['General', 'Adjusting'])],
            'description' => ['required', 'string', 'max:500'],
            'post_immediately' => ['boolean'],
            'lines' => ['required', 'array', 'min:2'],
            'lines.*.account_id' => ['required', 'uuid', 'exists:finance_accounts,id'],
            'lines.*.description' => ['nullable', 'string', 'max:300'],
            'lines.*.debit' => ['required', 'numeric', 'min:0'],
            'lines.*.credit' => ['required', 'numeric', 'min:0'],
            'lines.*.project_id' => ['nullable', 'exists:projects,id'],
        ]);

        $journal = $engine->createJournal(
            $data['journal_date'],
            $data['description'],
            $data['lines'],
            $request->user(),
            $data['journal_type']
        );

        if (! empty($data['post_immediately'])) {
            $engine->postJournal($journal, $request->user());
        }

        return back()->with('success', "Journal {$journal->journal_no} saved.");
    }

    public function postJournal(Request $request, FinanceJournal $journal, AccountingEngineService $engine): RedirectResponse
    {
        abort_unless($request->user()?->canManageFinance(), 403);
        $engine->postJournal($journal, $request->user());

        return back()->with('success', "Journal {$journal->journal_no} posted.");
    }

    public function reverseJournal(Request $request, FinanceJournal $journal, AccountingEngineService $engine): RedirectResponse
    {
        abort_unless($request->user()?->canManageFinance(), 403);
        $data = $request->validate(['reason' => ['required', 'string', 'max:500']]);
        $rev = $engine->reverseJournal($journal, $request->user(), $data['reason']);

        return back()->with('success', "Journal {$journal->journal_no} reversed via {$rev->journal_no}.");
    }

    public function closePeriod(Request $request, FinancePeriod $period, AccountingPeriodService $service): RedirectResponse
    {
        abort_unless($request->user()?->canManageFinance(), 403);
        $service->closePeriod($period, $request->user());

        return back()->with('success', "Period {$period->name} closed.");
    }

    public function reopenPeriod(Request $request, FinancePeriod $period, AccountingPeriodService $service): RedirectResponse
    {
        abort_unless($request->user()?->isManagingDirector(), 403);
        $data = $request->validate(['reason' => ['required', 'string', 'max:500']]);
        $service->reopenPeriod($period, $request->user(), $data['reason']);

        return back()->with('success', "Period {$period->name} reopened by Founder.");
    }

    public function storeExpenseRequest(Request $request, FinanceOperationsService $ops): RedirectResponse
    {
        $data = $request->validate([
            'expense_date' => ['required', 'date'],
            'category' => ['required', Rule::in(FinanceExpenseRequest::CATEGORIES)],
            'description' => ['required', 'string', 'max:500'],
            'amount' => ['required', 'numeric', 'min:1'],
            'tax_amount' => ['nullable', 'numeric', 'min:0'],
            'project_id' => ['nullable', 'exists:projects,id'],
            'expense_account_id' => ['nullable', 'uuid', 'exists:finance_accounts,id'],
            'payment_method' => ['nullable', 'string', 'max:60'],
        ]);

        $expense = $ops->submitExpenseRequest($data, $request->user());

        return back()->with('success', "Expense request {$expense->expense_no} submitted for Founder approval.");
    }

    public function payExpenseRequest(Request $request, FinanceExpenseRequest $expense, FinanceOperationsService $ops): RedirectResponse
    {
        abort_unless($request->user()?->canManageFinance(), 403);
        $data = $request->validate(['cash_account_id' => ['required', 'uuid', 'exists:finance_cash_accounts,id']]);
        $ops->payExpenseRequest($expense, $data['cash_account_id'], $request->user());

        return back()->with('success', "Expense {$expense->expense_no} paid and posted to General Ledger.");
    }

    public function storeReimbursement(Request $request, ApprovalWorkflowService $approvals): RedirectResponse
    {
        $data = $request->validate([
            'expense_date' => ['required', 'date'],
            'category' => ['required', Rule::in(FinanceExpenseRequest::CATEGORIES)],
            'description' => ['required', 'string', 'max:500'],
            'amount' => ['required', 'numeric', 'min:1'],
            'project_id' => ['nullable', 'exists:projects,id'],
        ]);

        $count = FinanceReimbursement::count() + 1;
        $reimb = FinanceReimbursement::create([
            'reimbursement_no' => sprintf('RMB/KRV/%s/%04d', now()->format('Y'), $count),
            'user_id' => $request->user()->id,
            'project_id' => $data['project_id'] ?? null,
            'expense_date' => $data['expense_date'],
            'category' => $data['category'],
            'description' => $data['description'],
            'amount' => round((float) $data['amount'], 2),
            'approval_status' => 'Pending Approval',
            'payment_status' => 'Unpaid',
        ]);

        $approvals->submitRequest('Reimbursement', $reimb, $request->user(), (float) $reimb->amount, "{$reimb->reimbursement_no}: {$reimb->description}");

        return back()->with('success', "Reimbursement {$reimb->reimbursement_no} submitted for Founder approval.");
    }

    public function storeCompensation(Request $request, ApprovalWorkflowService $approvals): RedirectResponse
    {
        abort_unless($request->user()?->canManageFinance(), 403);

        $data = $request->validate([
            'user_id' => ['required', 'exists:users,id'],
            'project_id' => ['nullable', 'exists:projects,id'],
            'task_id' => ['nullable', 'exists:tasks,id'],
            'compensation_type' => ['required', Rule::in(FinanceCompensation::TYPES)],
            'amount' => ['required', 'numeric', 'min:1'],
            'description' => ['required', 'string', 'max:500'],
            'calculation_basis' => ['nullable', 'string', 'max:1000'],
        ]);

        $count = FinanceCompensation::count() + 1;
        $comp = FinanceCompensation::create([
            'compensation_no' => sprintf('CMP/KRV/%s/%04d', now()->format('Y'), $count),
            ...$data,
            'amount' => round((float) $data['amount'], 2),
            'approval_status' => 'Pending Approval',
            'payment_status' => 'Unpaid',
            'created_by' => $request->user()->id,
        ]);

        $approvals->submitRequest('Team Compensation', $comp, $request->user(), (float) $comp->amount, "{$comp->compensation_no}: {$comp->compensation_type}");

        return back()->with('success', "Compensation {$comp->compensation_no} submitted for Founder approval.");
    }

    public function payCompensation(Request $request, FinanceCompensation $compensation, FinanceOperationsService $ops): RedirectResponse
    {
        abort_unless($request->user()?->canManageFinance(), 403);
        $data = $request->validate([
            'cash_account_id' => ['required', 'uuid', 'exists:finance_cash_accounts,id'],
            'payment_date' => ['required', 'date'],
            'payment_reference' => ['nullable', 'string', 'max:120'],
        ]);

        $ops->payCompensation($compensation, $data['cash_account_id'], $data['payment_date'], $data['payment_reference'] ?? null, $request->user());

        return back()->with('success', "Compensation {$compensation->compensation_no} paid and journal posted.");
    }

    public function approveRequest(Request $request, FinanceApprovalRequest $approvalRequest, ApprovalWorkflowService $approvals): RedirectResponse
    {
        abort_unless($request->user()?->isManagingDirector(), 403);
        $data = $request->validate(['reason' => ['nullable', 'string', 'max:500']]);
        $approvals->approve($approvalRequest, $request->user(), $data['reason'] ?? null);

        return back()->with('success', "Approval request {$approvalRequest->request_no} approved.");
    }

    public function rejectRequest(Request $request, FinanceApprovalRequest $approvalRequest, ApprovalWorkflowService $approvals): RedirectResponse
    {
        abort_unless($request->user()?->isManagingDirector(), 403);
        $data = $request->validate(['reason' => ['required', 'string', 'max:500']]);
        $approvals->reject($approvalRequest, $request->user(), $data['reason']);

        return back()->with('success', "Approval request {$approvalRequest->request_no} rejected.");
    }

    public function storeTransfer(Request $request, FinanceOperationsService $ops): RedirectResponse
    {
        abort_unless($request->user()?->canManageFinance(), 403);
        $data = $request->validate([
            'from_cash_account_id' => ['required', 'uuid', 'exists:finance_cash_accounts,id'],
            'to_cash_account_id' => ['required', 'uuid', 'exists:finance_cash_accounts,id', 'different:from_cash_account_id'],
            'transfer_date' => ['required', 'date'],
            'amount' => ['required', 'numeric', 'min:1'],
            'reference_no' => ['nullable', 'string', 'max:100'],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        $transfer = $ops->recordInternalTransfer(
            $data['from_cash_account_id'],
            $data['to_cash_account_id'],
            $data['transfer_date'],
            (float) $data['amount'],
            $request->user(),
            $data['reference_no'] ?? null,
            $data['notes'] ?? null
        );

        return back()->with('success', "Internal transfer {$transfer->transfer_no} recorded.");
    }

    public function storeSubscription(Request $request): RedirectResponse
    {
        abort_unless($request->user()?->canManageFinance(), 403);
        $data = $request->validate([
            'company_id' => ['required', 'exists:companies,id'],
            'plan_id' => ['required', 'uuid', 'exists:finance_subscription_plans,id'],
            'project_id' => ['nullable', 'exists:projects,id'],
            'start_date' => ['required', 'date'],
        ]);

        $count = FinanceSubscription::count() + 1;
        $sub = FinanceSubscription::create([
            'subscription_no' => sprintf('SUB/KRV/%s/%04d', now()->format('Y'), $count),
            'company_id' => $data['company_id'],
            'plan_id' => $data['plan_id'],
            'project_id' => $data['project_id'] ?? null,
            'start_date' => $data['start_date'],
            'next_billing_date' => $data['start_date'],
            'status' => 'Active',
            'auto_renew' => true,
            'created_by' => $request->user()->id,
        ]);

        return back()->with('success', "Subscription {$sub->subscription_no} created.");
    }

    public function billSubscription(Request $request, FinanceSubscription $subscription, FinanceOperationsService $ops): RedirectResponse
    {
        abort_unless($request->user()?->canManageFinance(), 403);
        $invoice = $ops->generateSubscriptionInvoice($subscription, $request->user());

        return back()->with(
            $invoice ? 'success' : 'warning',
            $invoice ? "Recurring invoice {$invoice->invoice_no} generated." : 'Invoice for this billing period already exists.'
        );
    }

    public function storeProjectBudget(Request $request, ApprovalWorkflowService $approvals): RedirectResponse
    {
        abort_unless($request->user()?->canManageFinance(), 403);
        $data = $request->validate([
            'project_id' => ['required', 'exists:projects,id'],
            'contract_value' => ['required', 'numeric', 'min:0'],
            'approved_budget' => ['required', 'numeric', 'min:0'],
            'allocated_overhead' => ['nullable', 'numeric', 'min:0'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $budget = FinanceProjectBudget::updateOrCreate(
            ['project_id' => $data['project_id']],
            [
                'contract_value' => round((float) $data['contract_value'], 2),
                'approved_budget' => round((float) $data['approved_budget'], 2),
                'allocated_overhead' => round((float) ($data['allocated_overhead'] ?? 0), 2),
                'approval_status' => 'Pending Approval',
                'notes' => $data['notes'] ?? null,
            ]
        );

        $approvals->submitRequest('Project Budget', $budget, $request->user(), (float) $budget->approved_budget, "Project Budget Approval for Project #{$data['project_id']}");

        return back()->with('success', 'Project budget submitted for Founder approval.');
    }
}
