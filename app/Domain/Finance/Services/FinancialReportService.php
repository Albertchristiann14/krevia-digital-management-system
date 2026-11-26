<?php

namespace App\Domain\Finance\Services;

use App\Domain\Finance\Models\FinanceAccount;
use App\Domain\Finance\Models\FinanceJournal;
use App\Domain\Finance\Models\FinanceJournalLine;
use App\Domain\Finance\Models\FinanceVendorBill;
use App\Domain\Finance\Models\Invoice;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Generates all authoritative financial statements exclusively from Posted journal lines.
 */
class FinancialReportService
{
    /**
     * @return array{rows: array<int, array<string, mixed>>, total_debit: float, total_credit: float, difference: float}
     */
    public function getTrialBalance(?string $fromDate = null, ?string $toDate = null): array
    {
        $query = FinanceJournalLine::query()
            ->join('finance_journals as j', 'j.id', '=', 'finance_journal_lines.journal_id')
            ->join('finance_accounts as a', 'a.id', '=', 'finance_journal_lines.account_id')
            ->where('j.status', FinanceJournal::STATUS_POSTED);

        if ($fromDate) {
            $query->whereDate('j.journal_date', '>=', $fromDate);
        }
        if ($toDate) {
            $query->whereDate('j.journal_date', '<=', $toDate);
        }

        $aggregated = $query
            ->selectRaw('a.id, a.code, a.name, a.type, a.normal_balance, COALESCE(SUM(finance_journal_lines.debit), 0) as sum_debit, COALESCE(SUM(finance_journal_lines.credit), 0) as sum_credit')
            ->groupBy('a.id', 'a.code', 'a.name', 'a.type', 'a.normal_balance')
            ->orderBy('a.code')
            ->get();

        $totalDebit = 0.0;
        $totalCredit = 0.0;

        $rows = $aggregated->map(function ($row) use (&$totalDebit, &$totalCredit) {
            $net = round((float) $row->sum_debit - (float) $row->sum_credit, 2);
            $debitBal = $net > 0 ? $net : 0.0;
            $creditBal = $net < 0 ? abs($net) : 0.0;

            $totalDebit = round($totalDebit + $debitBal, 2);
            $totalCredit = round($totalCredit + $creditBal, 2);

            return [
                'account_id' => $row->id,
                'code' => $row->code,
                'name' => $row->name,
                'type' => $row->type,
                'normal_balance' => $row->normal_balance,
                'raw_debit' => round((float) $row->sum_debit, 2),
                'raw_credit' => round((float) $row->sum_credit, 2),
                'debit_balance' => $debitBal,
                'credit_balance' => $creditBal,
            ];
        })->values()->all();

        return [
            'rows' => $rows,
            'total_debit' => $totalDebit,
            'total_credit' => $totalCredit,
            'difference' => round($totalDebit - $totalCredit, 2),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function getGeneralLedger(string $accountId, ?string $fromDate = null, ?string $toDate = null): array
    {
        $account = FinanceAccount::query()->findOrFail($accountId);

        $openingNet = 0.0;
        if ($fromDate) {
            $op = FinanceJournalLine::query()
                ->join('finance_journals as j', 'j.id', '=', 'finance_journal_lines.journal_id')
                ->where('finance_journal_lines.account_id', $accountId)
                ->where('j.status', FinanceJournal::STATUS_POSTED)
                ->whereDate('j.journal_date', '<', $fromDate)
                ->selectRaw('COALESCE(SUM(debit), 0) as d, COALESCE(SUM(credit), 0) as c')
                ->first();
            $openingNet = $account->normal_balance === 'Debit'
                ? round((float) ($op->d ?? 0) - (float) ($op->c ?? 0), 2)
                : round((float) ($op->c ?? 0) - (float) ($op->d ?? 0), 2);
        }

        $linesQuery = FinanceJournalLine::query()
            ->join('finance_journals as j', 'j.id', '=', 'finance_journal_lines.journal_id')
            ->where('finance_journal_lines.account_id', $accountId)
            ->where('j.status', FinanceJournal::STATUS_POSTED);

        if ($fromDate) {
            $linesQuery->whereDate('j.journal_date', '>=', $fromDate);
        }
        if ($toDate) {
            $linesQuery->whereDate('j.journal_date', '<=', $toDate);
        }

        $lines = $linesQuery
            ->select([
                'finance_journal_lines.id',
                'finance_journal_lines.description',
                'finance_journal_lines.debit',
                'finance_journal_lines.credit',
                'j.id as journal_id',
                'j.journal_no',
                'j.journal_date',
                'j.source_type',
                'j.source_id',
            ])
            ->orderBy('j.journal_date')
            ->orderBy('j.journal_no')
            ->orderBy('finance_journal_lines.line_no')
            ->get();

        $running = $openingNet;
        $entries = $lines->map(function ($line) use (&$running, $account) {
            $d = (float) $line->debit;
            $c = (float) $line->credit;
            $delta = $account->normal_balance === 'Debit' ? ($d - $c) : ($c - $d);
            $running = round($running + $delta, 2);

            return [
                'id' => $line->id,
                'journal_id' => $line->journal_id,
                'journal_no' => $line->journal_no,
                'journal_date' => $line->journal_date,
                'description' => $line->description,
                'debit' => $d,
                'credit' => $c,
                'running_balance' => $running,
                'source_type' => $line->source_type,
                'source_id' => $line->source_id,
            ];
        })->values()->all();

        return [
            'account' => $account->only(['id', 'code', 'name', 'type', 'normal_balance']),
            'opening_balance' => $openingNet,
            'closing_balance' => $running,
            'entries' => $entries,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function getProfitAndLoss(?string $fromDate = null, ?string $toDate = null): array
    {
        $tb = $this->getTrialBalance($fromDate, $toDate);
        $revenues = [];
        $costOfServices = [];
        $operatingExpenses = [];

        $totalRevenue = 0.0;
        $totalCostOfServices = 0.0;
        $totalOperatingExpenses = 0.0;

        foreach ($tb['rows'] as $row) {
            if ($row['type'] === FinanceAccount::TYPE_REVENUE) {
                $amt = round($row['raw_credit'] - $row['raw_debit'], 2);
                $revenues[] = ['code' => $row['code'], 'name' => $row['name'], 'amount' => $amt];
                $totalRevenue = round($totalRevenue + $amt, 2);
            } elseif ($row['type'] === FinanceAccount::TYPE_EXPENSE) {
                $amt = round($row['raw_debit'] - $row['raw_credit'], 2);
                if (str_starts_with($row['code'], '5')) {
                    $costOfServices[] = ['code' => $row['code'], 'name' => $row['name'], 'amount' => $amt];
                    $totalCostOfServices = round($totalCostOfServices + $amt, 2);
                } else {
                    $operatingExpenses[] = ['code' => $row['code'], 'name' => $row['name'], 'amount' => $amt];
                    $totalOperatingExpenses = round($totalOperatingExpenses + $amt, 2);
                }
            }
        }

        $grossProfit = round($totalRevenue - $totalCostOfServices, 2);
        $netProfit = round($grossProfit - $totalOperatingExpenses, 2);

        return [
            'revenues' => $revenues,
            'total_revenue' => $totalRevenue,
            'cost_of_services' => $costOfServices,
            'total_cost_of_services' => $totalCostOfServices,
            'gross_profit' => $grossProfit,
            'operating_expenses' => $operatingExpenses,
            'total_operating_expenses' => $totalOperatingExpenses,
            'net_profit' => $netProfit,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function getBalanceSheet(?string $asOfDate = null): array
    {
        $tb = $this->getTrialBalance(null, $asOfDate);
        $pnl = $this->getProfitAndLoss(null, $asOfDate);

        $assets = [];
        $liabilities = [];
        $equity = [];

        $totalAssets = 0.0;
        $totalLiabilities = 0.0;
        $totalEquity = 0.0;

        foreach ($tb['rows'] as $row) {
            if ($row['type'] === FinanceAccount::TYPE_ASSET) {
                $amt = round($row['raw_debit'] - $row['raw_credit'], 2);
                $assets[] = ['code' => $row['code'], 'name' => $row['name'], 'amount' => $amt];
                $totalAssets = round($totalAssets + $amt, 2);
            } elseif ($row['type'] === FinanceAccount::TYPE_LIABILITY) {
                $amt = round($row['raw_credit'] - $row['raw_debit'], 2);
                $liabilities[] = ['code' => $row['code'], 'name' => $row['name'], 'amount' => $amt];
                $totalLiabilities = round($totalLiabilities + $amt, 2);
            } elseif ($row['type'] === FinanceAccount::TYPE_EQUITY) {
                $amt = round($row['raw_credit'] - $row['raw_debit'], 2);
                $equity[] = ['code' => $row['code'], 'name' => $row['name'], 'amount' => $amt];
                $totalEquity = round($totalEquity + $amt, 2);
            }
        }

        $currentPeriodEarnings = $pnl['net_profit'];
        $totalEquityWithEarnings = round($totalEquity + $currentPeriodEarnings, 2);
        $totalLiabilitiesAndEquity = round($totalLiabilities + $totalEquityWithEarnings, 2);

        return [
            'assets' => $assets,
            'total_assets' => $totalAssets,
            'liabilities' => $liabilities,
            'total_liabilities' => $totalLiabilities,
            'equity' => $equity,
            'current_period_earnings' => $currentPeriodEarnings,
            'total_equity' => $totalEquityWithEarnings,
            'total_liabilities_and_equity' => $totalLiabilitiesAndEquity,
            'is_balanced' => abs($totalAssets - $totalLiabilitiesAndEquity) < 0.01,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function getCashFlowStatement(?string $fromDate = null, ?string $toDate = null): array
    {
        $cashAccountIds = FinanceAccount::query()
            ->whereIn('code', ['1110', '1120'])
            ->pluck('id');

        $cashJournalIds = FinanceJournalLine::query()
            ->join('finance_journals as j', 'j.id', '=', 'finance_journal_lines.journal_id')
            ->where('j.status', FinanceJournal::STATUS_POSTED)
            ->whereIn('finance_journal_lines.account_id', $cashAccountIds)
            ->when($fromDate, fn ($q) => $q->whereDate('j.journal_date', '>=', $fromDate))
            ->when($toDate, fn ($q) => $q->whereDate('j.journal_date', '<=', $toDate))
            ->pluck('j.id')
            ->unique();

        $lines = FinanceJournalLine::query()
            ->join('finance_journals as j', 'j.id', '=', 'finance_journal_lines.journal_id')
            ->join('finance_accounts as a', 'a.id', '=', 'finance_journal_lines.account_id')
            ->whereIn('j.id', $cashJournalIds)
            ->whereIn('finance_journal_lines.account_id', $cashAccountIds)
            ->selectRaw('j.source_type, COALESCE(SUM(finance_journal_lines.debit - finance_journal_lines.credit), 0) as net_cash')
            ->groupBy('j.source_type')
            ->get();

        $operating = 0.0;
        $investing = 0.0;
        $financing = 0.0;

        foreach ($lines as $row) {
            $amt = (float) $row->net_cash;
            if ($row->source_type === 'EquipmentPurchase') {
                $investing = round($investing + $amt, 2);
            } elseif (in_array($row->source_type, ['OwnerCapital', 'Financing'], true)) {
                $financing = round($financing + $amt, 2);
            } else {
                $operating = round($operating + $amt, 2);
            }
        }

        return [
            'operating_activities' => $operating,
            'investing_activities' => $investing,
            'financing_activities' => $financing,
            'net_cash_change' => round($operating + $investing + $financing, 2),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function getArAging(): array
    {
        $today = Carbon::today();
        $buckets = ['Current' => 0.0, '1-30 Days' => 0.0, '31-60 Days' => 0.0, '61-90 Days' => 0.0, 'Over 90 Days' => 0.0];

        $invoices = Invoice::query()
            ->with('company:id,name')
            ->whereNotIn('status', ['Paid', 'Void', 'Cancelled'])
            ->get();

        $items = $invoices->map(function (Invoice $inv) use ($today, &$buckets) {
            $outstanding = max(0.0, round((float) $inv->amount - (float) $inv->paid_amount, 2));
            $daysOverdue = $inv->due_date && $inv->due_date->lt($today)
                ? (int) $inv->due_date->diffInDays($today)
                : 0;

            $bucket = match (true) {
                $daysOverdue <= 0 => 'Current',
                $daysOverdue <= 30 => '1-30 Days',
                $daysOverdue <= 60 => '31-60 Days',
                $daysOverdue <= 90 => '61-90 Days',
                default => 'Over 90 Days',
            };

            $buckets[$bucket] = round($buckets[$bucket] + $outstanding, 2);

            return [
                'id' => $inv->id,
                'invoice_no' => $inv->invoice_no,
                'company_name' => $inv->company?->name,
                'due_date' => $inv->due_date?->format('Y-m-d'),
                'outstanding' => $outstanding,
                'days_overdue' => $daysOverdue,
                'bucket' => $bucket,
            ];
        })->values()->all();

        return [
            'buckets' => $buckets,
            'total_receivable' => round(array_sum($buckets), 2),
            'items' => $items,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function getApAging(): array
    {
        $today = Carbon::today();
        $buckets = ['Current' => 0.0, '1-30 Days' => 0.0, '31-60 Days' => 0.0, '61-90 Days' => 0.0, 'Over 90 Days' => 0.0];

        $bills = FinanceVendorBill::query()
            ->with('vendor:id,name')
            ->whereNotIn('status', ['Paid', 'Void', 'Rejected'])
            ->get();

        $items = $bills->map(function (FinanceVendorBill $bill) use ($today, &$buckets) {
            $outstanding = max(0.0, round((float) $bill->total_amount - (float) $bill->paid_amount, 2));
            $daysOverdue = $bill->due_date && $bill->due_date->lt($today)
                ? (int) $bill->due_date->diffInDays($today)
                : 0;

            $bucket = match (true) {
                $daysOverdue <= 0 => 'Current',
                $daysOverdue <= 30 => '1-30 Days',
                $daysOverdue <= 60 => '31-60 Days',
                $daysOverdue <= 90 => '61-90 Days',
                default => 'Over 90 Days',
            };

            $buckets[$bucket] = round($buckets[$bucket] + $outstanding, 2);

            return [
                'id' => $bill->id,
                'bill_no' => $bill->bill_no,
                'vendor_name' => $bill->vendor?->name,
                'due_date' => $bill->due_date?->format('Y-m-d'),
                'outstanding' => $outstanding,
                'days_overdue' => $daysOverdue,
                'bucket' => $bucket,
            ];
        })->values()->all();

        return [
            'buckets' => $buckets,
            'total_payable' => round(array_sum($buckets), 2),
            'items' => $items,
        ];
    }
}
