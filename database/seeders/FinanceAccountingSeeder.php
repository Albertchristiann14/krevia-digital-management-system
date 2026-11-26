<?php

namespace Database\Seeders;

use App\Domain\Finance\Models\FinanceAccount;
use App\Domain\Finance\Models\FinanceCashAccount;
use App\Domain\Finance\Models\FinanceConfiguration;
use App\Domain\Finance\Models\FinanceFiscalYear;
use App\Domain\Finance\Models\FinancePeriod;
use App\Domain\Finance\Models\FinanceSubscriptionPlan;
use App\Domain\Finance\Models\FinanceTax;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class FinanceAccountingSeeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function (): void {
            $accounts = [
                // Code, Name, Type, Normal, ParentCode, IsPosting
                ['1000', 'Assets', 'Asset', 'Debit', null, false],
                ['1100', 'Cash', 'Asset', 'Debit', '1000', false],
                ['1110', 'Cash on Hand', 'Asset', 'Debit', '1100', true],
                ['1120', 'Bank Accounts', 'Asset', 'Debit', '1100', true],
                ['1200', 'Accounts Receivable', 'Asset', 'Debit', '1000', true],
                ['1300', 'Prepaid Expenses', 'Asset', 'Debit', '1000', true],
                ['1400', 'Equipment', 'Asset', 'Debit', '1000', true],
                ['1500', 'Input Tax Receivable', 'Asset', 'Debit', '1000', true],

                ['2000', 'Liabilities', 'Liability', 'Credit', null, false],
                ['2100', 'Accounts Payable', 'Liability', 'Credit', '2000', true],
                ['2200', 'Tax Payable', 'Liability', 'Credit', '2000', true],
                ['2300', 'Unearned Revenue', 'Liability', 'Credit', '2000', true],
                ['2400', 'Compensation Payable', 'Liability', 'Credit', '2000', true],

                ['3000', 'Equity', 'Equity', 'Credit', null, false],
                ['3100', 'Owner Capital', 'Equity', 'Credit', '3000', true],
                ['3200', 'Retained Earnings', 'Equity', 'Credit', '3000', true],

                ['4000', 'Revenue', 'Revenue', 'Credit', null, false],
                ['4100', 'Website Development Revenue', 'Revenue', 'Credit', '4000', true],
                ['4200', 'Software Development Revenue', 'Revenue', 'Credit', '4000', true],
                ['4300', 'Subscription Revenue', 'Revenue', 'Credit', '4000', true],
                ['4400', 'Maintenance Revenue', 'Revenue', 'Credit', '4000', true],

                ['5000', 'Cost of Services', 'Expense', 'Debit', null, false],
                ['5100', 'Developer Compensation Expense', 'Expense', 'Debit', '5000', true],
                ['5200', 'Project Operational Cost', 'Expense', 'Debit', '5000', true],

                ['6000', 'Operating Expenses', 'Expense', 'Debit', null, false],
                ['6100', 'Infrastructure Expense', 'Expense', 'Debit', '6000', true],
                ['6200', 'Software & Tools Expense', 'Expense', 'Debit', '6000', true],
                ['6300', 'Marketing Expense', 'Expense', 'Debit', '6000', true],
                ['6400', 'Administrative Expense', 'Expense', 'Debit', '6000', true],
                ['6500', 'Transportation Expense', 'Expense', 'Debit', '6000', true],
            ];

            $byCode = [];
            foreach ($accounts as [$code, $name, $type, $normal, $parentCode, $isPosting]) {
                $acc = FinanceAccount::firstOrCreate(
                    ['code' => $code],
                    [
                        'name' => $name,
                        'type' => $type,
                        'normal_balance' => $normal,
                        'parent_id' => $parentCode ? ($byCode[$parentCode]->id ?? null) : null,
                        'is_posting' => $isPosting,
                        'is_active' => true,
                        'is_system' => true,
                    ]
                );
                $byCode[$code] = $acc;
            }

            // Fiscal Years & Monthly Periods (Dec 2026 - Dec 2027)
            $fy2026 = FinanceFiscalYear::firstOrCreate(
                ['name' => 'FY 2026'],
                ['start_date' => '2026-01-01', 'end_date' => '2026-12-31', 'status' => 'Open']
            );
            $fy2027 = FinanceFiscalYear::firstOrCreate(
                ['name' => 'FY 2027'],
                ['start_date' => '2027-01-01', 'end_date' => '2027-12-31', 'status' => 'Open']
            );

            $cursor = Carbon::create(2026, 11, 1);
            for ($i = 0; $i < 14; $i++) {
                $fy = $cursor->year === 2026 ? $fy2026 : $fy2027;
                FinancePeriod::firstOrCreate(
                    ['code' => $cursor->format('Y-m')],
                    [
                        'fiscal_year_id' => $fy->id,
                        'name' => $cursor->format('M Y'),
                        'start_date' => $cursor->copy()->startOfMonth()->format('Y-m-d'),
                        'end_date' => $cursor->copy()->endOfMonth()->format('Y-m-d'),
                        'status' => 'Open',
                    ]
                );
                $cursor->addMonth();
            }

            if (FinanceConfiguration::count() === 0) {
                FinanceConfiguration::create([
                    'base_currency' => 'IDR',
                    'invoice_prefix' => 'INV/KRV',
                    'journal_prefix' => 'JRN/KRV',
                    'expense_prefix' => 'EXP/KRV',
                    'bill_prefix' => 'BILL/KRV',
                    'default_cash_account_id' => $byCode['1110']->id,
                    'default_bank_account_id' => $byCode['1120']->id,
                    'default_ar_account_id' => $byCode['1200']->id,
                    'default_ap_account_id' => $byCode['2100']->id,
                    'default_unearned_revenue_account_id' => $byCode['2300']->id,
                    'default_revenue_account_id' => $byCode['4200']->id,
                    'default_expense_account_id' => $byCode['6400']->id,
                    'default_compensation_payable_account_id' => $byCode['2400']->id,
                    'default_retained_earnings_account_id' => $byCode['3200']->id,
                ]);
            }

            FinanceCashAccount::firstOrCreate(
                ['code' => 'CASH-01'],
                [
                    'name' => 'Petty Cash Krevia',
                    'account_type' => 'Cash',
                    'gl_account_id' => $byCode['1110']->id,
                    'currency' => 'IDR',
                    'opening_balance' => 0,
                    'current_balance' => 0,
                    'is_active' => true,
                ]
            );

            FinanceCashAccount::firstOrCreate(
                ['code' => 'BANK-01'],
                [
                    'name' => 'Bank Operasional Utama Krevia',
                    'account_type' => 'Bank',
                    'bank_name' => 'Bank Central Asia (BCA)',
                    'gl_account_id' => $byCode['1120']->id,
                    'currency' => 'IDR',
                    'opening_balance' => 0,
                    'current_balance' => 0,
                    'is_active' => true,
                ]
            );

            FinanceTax::firstOrCreate(
                ['code' => 'PPN-11'],
                [
                    'name' => 'PPN 11%',
                    'category' => 'Output',
                    'rate' => 11.0000,
                    'is_inclusive' => false,
                    'effective_from' => '2026-01-01',
                    'payable_account_id' => $byCode['2200']->id,
                    'receivable_account_id' => $byCode['1500']->id,
                    'is_active' => true,
                ]
            );

            FinanceTax::firstOrCreate(
                ['code' => 'PPH-23'],
                [
                    'name' => 'PPh 23 Jasa (2%)',
                    'category' => 'Withholding',
                    'rate' => 2.0000,
                    'is_inclusive' => false,
                    'effective_from' => '2026-01-01',
                    'payable_account_id' => $byCode['2200']->id,
                    'receivable_account_id' => $byCode['1500']->id,
                    'is_active' => true,
                ]
            );

            FinanceSubscriptionPlan::firstOrCreate(
                ['code' => 'PLAN-MAINT-M'],
                [
                    'name' => 'Website & App Maintenance (Monthly)',
                    'service_line' => 'Digital Products & Recurring Services',
                    'billing_cycle' => 'Monthly',
                    'price' => 1500000,
                    'revenue_account_id' => $byCode['4400']->id,
                    'is_active' => true,
                ]
            );
        });
    }
}
