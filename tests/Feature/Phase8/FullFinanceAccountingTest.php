<?php

namespace Tests\Feature\Phase8;

use App\Domain\Crm\Models\Company;
use App\Domain\Finance\Models\FinanceAccount;
use App\Domain\Finance\Models\FinanceApprovalRequest;
use App\Domain\Finance\Models\FinanceCashAccount;
use App\Domain\Finance\Models\FinanceCompensation;
use App\Domain\Finance\Models\FinanceExpenseRequest;
use App\Domain\Finance\Models\FinanceJournal;
use App\Domain\Finance\Models\FinancePeriod;
use App\Domain\Finance\Models\FinanceProjectCost;
use App\Domain\Finance\Models\FinanceRevenueRecognitionEntry;
use App\Domain\Finance\Models\FinanceRevenueSchedule;
use App\Domain\Finance\Models\FinanceSubscription;
use App\Domain\Finance\Models\FinanceSubscriptionPlan;
use App\Domain\Finance\Models\Invoice;
use App\Domain\Finance\Services\AccountingEngineService;
use App\Domain\Finance\Services\AccountingPeriodService;
use App\Domain\Finance\Services\ApprovalWorkflowService;
use App\Domain\Finance\Services\FinanceOperationsService;
use App\Domain\Finance\Services\FinancialReportService;
use App\Domain\Project\Models\Project;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class FullFinanceAccountingTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
    }

    public function test_double_entry_validation_blocks_unbalanced_and_non_posting_journals(): void
    {
        $albert = User::where('email', 'albert@kreviadigital.com')->firstOrFail();
        $engine = app(AccountingEngineService::class);

        $cash = FinanceAccount::where('code', '1120')->firstOrFail();
        $rev = FinanceAccount::where('code', '4200')->firstOrFail();
        $header = FinanceAccount::where('code', '1000')->firstOrFail(); // is_posting = false

        // Unbalanced must throw
        try {
            $engine->createJournal('2026-12-10', 'Unbalanced Test', [
                ['account_id' => $cash->id, 'debit' => 1000000, 'credit' => 0],
                ['account_id' => $rev->id, 'debit' => 0, 'credit' => 900000],
            ], $albert);
            $this->fail('Expected ValidationException for unbalanced journal.');
        } catch (ValidationException $e) {
            $this->assertArrayHasKey('lines', $e->errors());
        }

        // Non-posting header account must throw
        try {
            $engine->createJournal('2026-12-10', 'Header Account Test', [
                ['account_id' => $header->id, 'debit' => 500000, 'credit' => 0],
                ['account_id' => $rev->id, 'debit' => 0, 'credit' => 500000],
            ], $albert);
            $this->fail('Expected ValidationException for non-posting account.');
        } catch (ValidationException $e) {
            $this->assertArrayHasKey('lines.0.account_id', $e->errors());
        }
    }

    public function test_period_closing_and_founder_only_reopening_and_reversal(): void
    {
        $albert = User::where('email', 'albert@kreviadigital.com')->firstOrFail();
        $farizy = User::where('email', 'farizy@kreviadigital.com')->firstOrFail();
        $engine = app(AccountingEngineService::class);
        $periodService = app(AccountingPeriodService::class);

        $cash = FinanceAccount::where('code', '1120')->firstOrFail();
        $capital = FinanceAccount::where('code', '3100')->firstOrFail();
        $period = FinancePeriod::where('code', '2026-12')->firstOrFail();

        $journal = $engine->createJournal('2026-12-05', 'Owner Capital Injection', [
            ['account_id' => $cash->id, 'debit' => 50000000, 'credit' => 0],
            ['account_id' => $capital->id, 'debit' => 0, 'credit' => 50000000],
        ], $albert);
        $posted = $engine->postJournal($journal, $albert);
        $this->assertEquals(FinanceJournal::STATUS_POSTED, $posted->status);

        // Close period -> posting into closed period must fail
        $periodService->closePeriod($period, $farizy);
        $this->assertEquals(FinancePeriod::STATUS_CLOSED, $period->fresh()->status);

        try {
            $engine->createJournal('2026-12-15', 'Backdated Entry', [
                ['account_id' => $cash->id, 'debit' => 100000, 'credit' => 0],
                ['account_id' => $capital->id, 'debit' => 0, 'credit' => 100000],
            ], $albert);
            $this->fail('Expected ValidationException for closed period.');
        } catch (ValidationException $e) {
            $this->assertArrayHasKey('journal_date', $e->errors());
        }

        // Farizy (Operations) cannot reopen period -> 403
        $this->actingAs($farizy)
            ->post("/finance/periods/{$period->id}/reopen", ['reason' => 'Attempt'])
            ->assertForbidden();

        // Albert (Founder) can reopen period -> 302
        $this->actingAs($albert)
            ->post("/finance/periods/{$period->id}/reopen", ['reason' => 'Year-end adjustment'])
            ->assertRedirect();
        $this->assertEquals(FinancePeriod::STATUS_OPEN, $period->fresh()->status);

        // Reversal creates opposite balanced journal
        $reversal = $engine->reverseJournal($posted, $albert, 'Correction');
        $this->assertEquals(FinanceJournal::STATUS_REVERSED, $posted->fresh()->status);
        $this->assertEquals(FinanceJournal::STATUS_POSTED, $reversal->status);

        $reports = app(FinancialReportService::class);
        $tb = $reports->getTrialBalance();
        $this->assertEquals(0.0, $tb['difference']);
    }

    public function test_founder_approval_workflow_and_expense_payment_and_project_cost_dedup(): void
    {
        $albert = User::where('email', 'albert@kreviadigital.com')->firstOrFail();
        $farizy = User::where('email', 'farizy@kreviadigital.com')->firstOrFail();
        $yoga = User::where('email', 'yoga@kreviadigital.com')->firstOrFail();

        $company = Company::firstOrFail();
        $project = Project::create([
            'code' => 'PRJ-FIN-01',
            'company_id' => $company->id,
            'name' => 'Client ERP Build',
            'service_line' => 'Custom Software Development',
            'status' => 'Active',
            'manager_user_id' => $farizy->id,
            'tech_lead_user_id' => $albert->id,
        ]);

        $bank = FinanceCashAccount::where('code', 'BANK-01')->firstOrFail();
        $ops = app(FinanceOperationsService::class);
        $approvals = app(ApprovalWorkflowService::class);

        $expense = $ops->submitExpenseRequest([
            'expense_date' => '2026-12-10',
            'category' => 'Infrastructure & Hosting',
            'description' => 'Cloud Server Production',
            'amount' => 1500000,
            'project_id' => $project->id,
        ], $yoga);

        $req = FinanceApprovalRequest::where('approvable_id', $expense->id)->firstOrFail();

        // Operations / Team Member CANNOT approve Founder request
        $this->actingAs($farizy)
            ->post("/finance/approvals/{$req->id}/approve", ['reason' => 'Self'])
            ->assertForbidden();

        // Paying before approval fails
        try {
            $ops->payExpenseRequest($expense->fresh(), $bank->id, $farizy);
            $this->fail('Expected ValidationException when paying unapproved expense.');
        } catch (ValidationException $e) {
            $this->assertArrayHasKey('expense', $e->errors());
        }

        // Founder approves -> payment succeeds and posts balanced journal + 1 project cost
        $approvals->approve($req, $albert, 'Approved for project');
        $paid = $ops->payExpenseRequest($expense->fresh(), $bank->id, $farizy);

        $this->assertEquals('Paid', $paid->payment_status);
        $this->assertNotNull($paid->journal_id);
        $this->assertEquals(1, FinanceProjectCost::where('project_id', $project->id)->count());

        $summary = $ops->getProjectFinancialSummary($project);
        $this->assertEquals(1500000.0, $summary['actual_direct_costs']);
    }

    public function test_internal_transfer_does_not_create_revenue_or_expense_and_balance_sheet_balances(): void
    {
        $albert = User::where('email', 'albert@kreviadigital.com')->firstOrFail();
        $cash = FinanceCashAccount::where('code', 'CASH-01')->firstOrFail();
        $bank = FinanceCashAccount::where('code', 'BANK-01')->firstOrFail();

        $ops = app(FinanceOperationsService::class);
        $ops->recordInternalTransfer($bank->id, $cash->id, '2026-12-12', 2000000, $albert, 'TRF-REF-01');

        $reports = app(FinancialReportService::class);
        $pnl = $reports->getProfitAndLoss();
        $bs = $reports->getBalanceSheet();

        $this->assertEquals(0.0, $pnl['total_revenue']);
        $this->assertEquals(0.0, $pnl['total_operating_expenses']);
        $this->assertTrue($bs['is_balanced']);
    }

    public function test_subscription_idempotent_billing_and_deferred_revenue_recognition(): void
    {
        $albert = User::where('email', 'albert@kreviadigital.com')->firstOrFail();
        $company = Company::firstOrFail();
        $plan = FinanceSubscriptionPlan::firstOrFail();
        $ops = app(FinanceOperationsService::class);

        $sub = FinanceSubscription::create([
            'subscription_no' => 'SUB/KRV/2026/0001',
            'company_id' => $company->id,
            'plan_id' => $plan->id,
            'start_date' => '2026-12-01',
            'next_billing_date' => '2026-12-01',
            'status' => 'Active',
            'auto_renew' => true,
            'created_by' => $albert->id,
        ]);

        $inv1 = $ops->generateSubscriptionInvoice($sub, $albert);
        $this->assertNotNull($inv1);

        // Reset next_billing_date back to simulate duplicate job execution -> must return null
        $sub->update(['next_billing_date' => '2026-12-01']);
        $invDup = $ops->generateSubscriptionInvoice($sub, $albert);
        $this->assertNull($invDup);

        // Deferred revenue recognition
        $schedule = FinanceRevenueSchedule::create([
            'source_type' => 'Subscription',
            'source_id' => $sub->id,
            'company_id' => $company->id,
            'total_amount' => 12000000,
            'start_date' => '2026-12-01',
            'end_date' => '2027-11-30',
            'periods_count' => 12,
            'status' => 'Active',
        ]);

        $entry = FinanceRevenueRecognitionEntry::create([
            'schedule_id' => $schedule->id,
            'period_month' => '2026-12',
            'recognition_date' => '2026-12-31',
            'amount' => 1000000,
            'status' => 'Scheduled',
        ]);

        $recognized = $ops->recognizeRevenueEntry($entry, $albert);
        $this->assertEquals('Recognized', $recognized->status);
        $this->assertNotNull($recognized->journal_id);

        $pnl = app(FinancialReportService::class)->getProfitAndLoss();
        $this->assertEqualsWithDelta(2500000.0, $pnl['total_revenue'], 0.01); // 1.5M invoice + 1.0M recognized
    }

    public function test_team_member_compensation_isolation_and_suite_pages_render(): void
    {
        $albert = User::where('email', 'albert@kreviadigital.com')->firstOrFail();
        $yoga = User::where('email', 'yoga@kreviadigital.com')->firstOrFail();
        $ananta = User::where('email', 'ananta@kreviadigital.com')->firstOrFail();

        FinanceCompensation::create([
            'compensation_no' => 'CMP/KRV/2026/0001',
            'user_id' => $yoga->id,
            'compensation_type' => 'Project-Based Fee',
            'amount' => 2500000,
            'description' => 'Yoga Private Fee',
            'approval_status' => 'Approved',
            'payment_status' => 'Unpaid',
            'created_by' => $albert->id,
        ]);

        // Ananta cannot access /finance/suite and cannot see Yoga's fee on /finance/my-compensations
        $this->actingAs($ananta)->get('/finance/suite')->assertForbidden();
        $this->actingAs($ananta)
            ->get('/finance/my-compensations')
            ->assertOk()
            ->assertDontSee('Yoga Private Fee');

        // Yoga sees his own compensation
        $this->actingAs($yoga)
            ->get('/finance/my-compensations')
            ->assertOk()
            ->assertSee('Yoga Private Fee');

        // Founder sees /finance/suite
        $this->actingAs($albert)->get('/finance/suite')->assertOk();

        // /finance must return 200 even when leads/invoices/transactions are empty
        \App\Domain\Crm\Models\Lead::query()->delete();
        $this->actingAs($albert)->get('/finance')->assertOk();
    }
}
