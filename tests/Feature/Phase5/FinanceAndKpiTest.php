<?php

namespace Tests\Feature\Phase5;

use App\Domain\Crm\Models\Company;
use App\Domain\Crm\Models\Lead;
use App\Domain\Finance\Models\Budget;
use App\Domain\Finance\Models\FinancialSetting;
use App\Domain\Finance\Models\Invoice;
use App\Domain\Finance\Models\Transaction;
use App\Domain\Finance\Services\CashflowService;
use App\Domain\Finance\Services\FinanceAndKpiWorkbookImporter;
use App\Domain\Kpi\Models\KpiDefinition;
use App\Domain\Kpi\Models\KpiEvaluation;
use App\Models\User;
use App\Notifications\InvoiceOverdueNotification;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class FinanceAndKpiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
    }

    public function test_sheet12_and_sheet13_import_35_kpis_and_unconfirmed_budgets_without_fabricated_figures(): void
    {
        $this->assertEquals(35, KpiDefinition::count());
        $this->assertEquals(6, Budget::count());

        // Each of the 7 members must have KPI weights summing to 1.0000
        $users = User::all();
        $this->assertCount(7, $users);
        foreach ($users as $user) {
            $sum = (float) KpiDefinition::where('user_id', $user->id)->sum('weight');
            $this->assertEqualsWithDelta(1.0, $sum, 0.0001, "KPI weight sum mismatch for {$user->name}");
        }

        $setting = FinancialSetting::firstOrFail();
        $this->assertNull($setting->opening_cash_balance);
        $this->assertEquals('Perlu Konfirmasi Manajemen', $setting->data_status);

        foreach (Budget::all() as $budget) {
            $this->assertNull($budget->target_amount);
            $this->assertEquals('Perlu Konfirmasi Manajemen', $budget->data_status);
        }

        // Re-running importer preserves existing modified budget
        $infra = Budget::where('category', 'Infrastruktur')->firstOrFail();
        $infra->update(['target_amount' => 12000000, 'data_status' => 'Disepakati']);

        $summary = app(FinanceAndKpiWorkbookImporter::class)->import(
            storage_path('app/private/seed/workplan_2026_2027.xlsx'),
            preserveExisting: true
        );

        $this->assertEquals(35, $summary['kpis_skipped']);
        $this->assertEquals(6, $summary['budgets_skipped']);
        $this->assertEquals(12000000.0, (float) $infra->fresh()->target_amount);
    }

    public function test_finance_authorization_strictly_restricts_writes_to_albert_and_farizy(): void
    {
        $albert = User::where('email', 'albert@kreviadigital.com')->firstOrFail();
        $farizy = User::where('email', 'farizy@kreviadigital.com')->firstOrFail();
        $aldo = User::where('email', 'aldo@kreviadigital.com')->firstOrFail();
        $febriana = User::where('email', 'febriana@kreviadigital.com')->firstOrFail();
        $yoga = User::where('email', 'yoga@kreviadigital.com')->firstOrFail();
        $ananta = User::where('email', 'ananta@kreviadigital.com')->firstOrFail();
        $jihanz = User::where('email', 'jihanz@kreviadigital.com')->firstOrFail();

        $company = Company::firstOrFail();
        $budget = Budget::firstOrFail();

        $invoice = Invoice::create([
            'invoice_no' => 'INV-001',
            'company_id' => $company->id,
            'description' => 'Initial Invoice',
            'issue_date' => '2026-12-01',
            'due_date' => '2026-12-15',
            'amount' => 10000000,
            'paid_amount' => 0,
            'status' => 'Sent',
            'created_by' => $albert->id,
        ]);

        // View checks: Albert, Farizy, Aldo = 200; others = 403
        foreach ([$albert, $farizy, $aldo] as $viewer) {
            $this->actingAs($viewer)->get('/finance')->assertOk();
        }
        foreach ([$febriana, $yoga, $ananta, $jihanz] as $nonViewer) {
            $this->actingAs($nonViewer)->get('/finance')->assertForbidden();
            $this->actingAs($nonViewer)
                ->get('/dashboard')
                ->assertInertia(fn (Assert $page) => $page
                    ->where('canViewFinance', false)
                    ->where('metrics.cash_balance', null)
                );
        }

        // Write checks: Aldo, Febriana, Yoga, Ananta, Jihanz MUST get 403 on ALL finance write endpoints
        foreach ([$aldo, $febriana, $yoga, $ananta, $jihanz] as $unauthorized) {
            $this->actingAs($unauthorized)
                ->patch('/finance/settings', [
                    'opening_cash_balance' => 1000000,
                    'opening_cash_date' => '2026-12-01',
                    'data_status' => 'Disepakati',
                ])
                ->assertForbidden();

            $this->actingAs($unauthorized)
                ->patch("/finance/budgets/{$budget->id}", [
                    'target_amount' => 5000000,
                    'data_status' => 'Disepakati',
                ])
                ->assertForbidden();

            $this->actingAs($unauthorized)
                ->post('/finance/invoices', [
                    'company_id' => $company->id,
                    'description' => 'Blocked',
                    'issue_date' => '2026-12-01',
                    'due_date' => '2026-12-15',
                    'amount' => 1000000,
                    'status' => 'Sent',
                ])
                ->assertForbidden();

            $this->actingAs($unauthorized)
                ->post("/finance/invoices/{$invoice->id}/payments", [
                    'amount' => 1000000,
                    'paid_at' => '2026-12-05',
                    'payment_method' => 'Bank Transfer',
                ])
                ->assertForbidden();

            $this->actingAs($unauthorized)
                ->post('/finance/transactions', [
                    'transaction_date' => '2026-12-05',
                    'type' => 'Pengeluaran',
                    'description' => 'Blocked expense',
                    'category' => 'Operasional',
                    'amount' => 100000,
                ])
                ->assertForbidden();

            $this->actingAs($unauthorized)
                ->post("/finance/invoices/{$invoice->id}/void")
                ->assertForbidden();
        }

        // Farizy and Albert are allowed
        $this->actingAs($farizy)
            ->patch('/finance/settings', [
                'opening_cash_balance' => 5000000,
                'opening_cash_date' => '2026-12-01',
                'data_status' => 'Disepakati',
            ])
            ->assertRedirect();

        $this->assertEquals(5000000.0, (float) FinancialSetting::firstOrFail()->opening_cash_balance);
    }

    public function test_invoice_payments_sync_ledger_and_separate_pipeline_estimates_and_overdue_command(): void
    {
        Notification::fake();

        $albert = User::where('email', 'albert@kreviadigital.com')->firstOrFail();
        $farizy = User::where('email', 'farizy@kreviadigital.com')->firstOrFail();
        $company = Company::firstOrFail();

        // Pipeline estimates must NEVER appear as received revenue
        $lead = Lead::firstOrFail();
        $lead->update(['stage' => 'Proposal Sent', 'estimated_value' => 50000000]);

        $this->actingAs($albert)->patch('/finance/settings', [
            'opening_cash_balance' => 5000000,
            'opening_cash_date' => '2026-12-01',
            'data_status' => 'Disepakati',
        ])->assertRedirect();

        $this->actingAs($albert)->post('/finance/invoices', [
            'company_id' => $company->id,
            'description' => 'Corporate Web Build Milestone 1',
            'issue_date' => now()->subDays(10)->toDateString(),
            'due_date' => now()->subDays(2)->toDateString(),
            'amount' => 10000000,
            'status' => 'Sent',
        ])->assertRedirect();

        $invoice = Invoice::where('description', 'Corporate Web Build Milestone 1')->firstOrFail();

        // Summary before payment: revenue = 0, receivables = 10M, pipeline_estimate = 50M
        $summary = app(CashflowService::class)->getSummary();
        $this->assertEquals(0.0, $summary['revenue_received']);
        $this->assertEquals(10000000.0, $summary['receivables']);
        $this->assertEquals(50000000.0, $summary['pipeline_estimate_total']);

        // Partial payment 4M
        $this->actingAs($farizy)->post("/finance/invoices/{$invoice->id}/payments", [
            'amount' => 4000000,
            'paid_at' => '2026-12-10',
            'payment_method' => 'Bank Transfer',
            'reference_no' => 'TRF-001',
        ])->assertRedirect();

        $invoice->refresh();
        $this->assertEquals('Partial', $invoice->status);
        $this->assertEquals(4000000.0, (float) $invoice->paid_amount);
        $this->assertEquals(1, Transaction::where('type', Transaction::TYPE_INCOME)->count());

        // Overpayment > 6M remaining blocked
        $this->actingAs($farizy)->post("/finance/invoices/{$invoice->id}/payments", [
            'amount' => 7000000,
            'paid_at' => '2026-12-11',
            'payment_method' => 'Bank Transfer',
        ])->assertSessionHasErrors('amount');

        // Overdue invoice command flags Partial past-due invoice & notifies Albert & Farizy
        $this->artisan('kdms:check-overdue-invoices')->assertExitCode(0);
        $this->assertEquals('Overdue', $invoice->fresh()->status);
        Notification::assertSentTo($albert, InvoiceOverdueNotification::class);
        Notification::assertSentTo($farizy, InvoiceOverdueNotification::class);

        // Pay remaining 6M -> Paid
        $this->actingAs($albert)->post("/finance/invoices/{$invoice->id}/payments", [
            'amount' => 6000000,
            'paid_at' => '2026-12-12',
            'payment_method' => 'Bank Transfer',
        ])->assertRedirect();

        $this->assertEquals('Paid', $invoice->fresh()->status);

        // Record expense 1.5M
        $this->actingAs($farizy)->post('/finance/transactions', [
            'transaction_date' => '2026-12-12',
            'type' => 'Pengeluaran',
            'description' => 'Cloud VPS Hosting',
            'category' => 'Infrastruktur',
            'amount' => 1500000,
        ])->assertRedirect();

        $final = app(CashflowService::class)->getSummary();
        $this->assertEquals(10000000.0, $final['revenue_received']);
        $this->assertEquals(1500000.0, $final['total_expenses']);
        $this->assertEquals(0.0, $final['receivables']);
        $this->assertEquals(13500000.0, $final['cash_balance']);
    }

    public function test_kpi_weight_sum_constraint_weighted_scoring_and_rbac(): void
    {
        $albert = User::where('email', 'albert@kreviadigital.com')->firstOrFail();
        $farizy = User::where('email', 'farizy@kreviadigital.com')->firstOrFail();
        $ananta = User::where('email', 'ananta@kreviadigital.com')->firstOrFail();

        // Ananta only sees his own 1 member scorecard on /kpi
        $this->actingAs($ananta)
            ->get('/kpi')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Kpi/Index')
                ->has('members', 1)
                ->where('members.0.user_id', $ananta->id)
            );

        // Farizy sees all 7 members
        $this->actingAs($farizy)
            ->get('/kpi')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Kpi/Index')
                ->has('members', 7)
            );

        // Weights that do not sum to 1.00 must be rejected
        $anantaKpis = KpiDefinition::where('user_id', $ananta->id)->orderBy('sort_order')->get();
        $badWeights = [];
        foreach ($anantaKpis as $k) {
            $badWeights[$k->id] = 0.5; // sum = 2.0 != 1.0
        }

        $this->actingAs($farizy)
            ->put("/kpi/members/{$ananta->id}/weights", ['weights' => $badWeights])
            ->assertSessionHasErrors('weights');

        // Record evaluation for Ananta (weights 0.35, 0.30, 0.15, 0.20)
        // Scores: 90, 80, 100, 85 => 31.5 + 24 + 15 + 17 = 87.50 ('Baik')
        $scores = [90, 80, 100, 85];
        $itemsPayload = [];
        foreach ($anantaKpis as $idx => $k) {
            $itemsPayload[$k->id] = [
                'actual_value' => 'Verified',
                'score' => $scores[$idx],
            ];
        }

        $this->actingAs($farizy)
            ->post("/kpi/members/{$ananta->id}/evaluations", [
                'period_type' => 'Bulanan',
                'period_label' => '2026-12',
                'items' => $itemsPayload,
            ])
            ->assertRedirect();

        $eval = KpiEvaluation::where('user_id', $ananta->id)->where('period_label', '2026-12')->firstOrFail();
        $this->assertEquals(87.5, (float) $eval->total_score);
        $this->assertEquals('Baik', $eval->rating_band);

        // Farizy lacks kpi.approve -> 403; Albert has kpi.approve -> Approved
        $this->actingAs($farizy)->post("/kpi/evaluations/{$eval->id}/approve")->assertForbidden();
        $this->actingAs($albert)->post("/kpi/evaluations/{$eval->id}/approve")->assertRedirect();
        $this->assertEquals('Approved', $eval->fresh()->status);
    }
}
