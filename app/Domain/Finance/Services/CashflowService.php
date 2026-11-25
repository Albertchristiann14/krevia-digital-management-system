<?php

namespace App\Domain\Finance\Services;

use App\Domain\Crm\Models\Lead;
use App\Domain\Finance\Models\Budget;
use App\Domain\Finance\Models\FinancialSetting;
use App\Domain\Finance\Models\Invoice;
use App\Domain\Finance\Models\Transaction;
use Carbon\Carbon;

class CashflowService
{
    /**
     * Computes live financial summary from ledger transactions & invoices,
     * strictly separating confirmed revenue received from non-revenue pipeline estimates.
     *
     * @return array<string, mixed>
     */
    public function getSummary(): array
    {
        $setting = FinancialSetting::query()->first();
        $openingCash = $setting?->opening_cash_balance !== null
            ? (float) $setting->opening_cash_balance
            : null;

        // Single conditional-aggregate query for both income & expense
        $txTotals = Transaction::query()
            ->selectRaw(
                'COALESCE(SUM(CASE WHEN type = ? THEN amount ELSE 0 END), 0) as revenue_received, '
                .'COALESCE(SUM(CASE WHEN type = ? THEN amount ELSE 0 END), 0) as total_expenses',
                [Transaction::TYPE_INCOME, Transaction::TYPE_EXPENSE]
            )
            ->first();

        $revenueReceived = (float) ($txTotals->revenue_received ?? 0);
        $totalExpenses = (float) ($txTotals->total_expenses ?? 0);

        // Single aggregate query for active invoices
        $invoiceTotals = Invoice::query()
            ->where('status', '!=', 'Void')
            ->selectRaw('COALESCE(SUM(amount), 0) as total_invoiced, COALESCE(SUM(paid_amount), 0) as total_paid')
            ->first();

        $totalInvoiced = (float) ($invoiceTotals->total_invoiced ?? 0);
        $totalPaidInvoices = (float) ($invoiceTotals->total_paid ?? 0);
        $receivables = max(0.0, round($totalInvoiced - $totalPaidInvoices, 2));

        $cashBalance = ($openingCash ?? 0.0) + $revenueReceived - $totalExpenses;

        // Single aggregate query for budget targets
        $budgetStats = Budget::query()
            ->selectRaw('COUNT(*) as total_count, COUNT(target_amount) as confirmed_count, COALESCE(SUM(target_amount), 0) as total_target')
            ->first();

        $confirmedBudgetCount = (int) ($budgetStats->confirmed_count ?? 0);
        $pendingBudgetCount = max(0, (int) ($budgetStats->total_count ?? 0) - $confirmedBudgetCount);
        $totalBudgetTarget = $confirmedBudgetCount > 0
            ? (float) $budgetStats->total_target
            : null;

        // Section F: Pipeline Estimate (BUKAN pendapatan — strictly separated!)
        $pipelineAgg = Lead::query()
            ->whereIn('stage', ['Proposal Sent', 'Negotiation', 'Won'])
            ->selectRaw('stage, COUNT(*) as stage_count, COALESCE(SUM(estimated_value), 0) as estimated_total')
            ->groupBy('stage')
            ->get()
            ->keyBy('stage');

        $pipelineStages = collect(['Proposal Sent', 'Negotiation', 'Won'])->map(function (string $stage) use ($pipelineAgg) {
            $row = $pipelineAgg->get($stage);

            return [
                'stage' => $stage,
                'count' => (int) ($row->stage_count ?? 0),
                'estimated_total' => (float) ($row->estimated_total ?? 0),
                'note' => match ($stage) {
                    'Proposal Sent' => 'Penawaran terkirim, belum ada keputusan klien',
                    'Negotiation' => 'Dalam pembahasan harga/lingkup',
                    default => 'Kesepakatan ditandatangani; pendapatan baru dihitung setelah dibayar',
                },
            ];
        })->values()->all();

        $pipelineEstimateTotal = (float) (($pipelineAgg->get('Proposal Sent')->estimated_total ?? 0)
            + ($pipelineAgg->get('Negotiation')->estimated_total ?? 0));

        return [
            'opening_cash_balance' => $openingCash,
            'opening_cash_date' => $setting?->opening_cash_date?->format('Y-m-d') ?? '2026-12-01',
            'opening_cash_status' => $setting?->data_status ?? 'Perlu Konfirmasi Manajemen',
            'total_budget_target' => $totalBudgetTarget,
            'confirmed_budget_count' => $confirmedBudgetCount,
            'pending_budget_count' => $pendingBudgetCount,
            'revenue_received' => round($revenueReceived, 2),
            'total_expenses' => round($totalExpenses, 2),
            'total_invoiced' => round($totalInvoiced, 2),
            'receivables' => $receivables,
            'cash_balance' => round($cashBalance, 2),
            'pipeline_estimate_total' => round($pipelineEstimateTotal, 2),
            'pipeline_stages' => $pipelineStages,
        ];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function getMonthlyCashflow(?float $openingCashBalance = null, bool $useProvidedOpening = false): array
    {
        if ($useProvidedOpening) {
            $running = $openingCashBalance ?? 0.0;
        } else {
            $setting = FinancialSetting::query()->first();
            $running = $setting?->opening_cash_balance !== null
                ? (float) $setting->opening_cash_balance
                : 0.0;
        }

        $grouped = Transaction::query()
            ->selectRaw("period_month, type, SUM(amount) as total")
            ->groupBy('period_month', 'type')
            ->get();

        $months = [];
        $cursor = Carbon::create(2026, 12, 1);
        for ($i = 0; $i < 13; $i++) {
            $months[] = $cursor->format('Y-m');
            $cursor->addMonth();
        }

        foreach ($grouped->pluck('period_month')->unique() as $m) {
            if ($m && ! in_array($m, $months, true)) {
                $months[] = $m;
            }
        }
        sort($months);

        $rows = [];
        foreach ($months as $ym) {
            $income = (float) $grouped
                ->where('period_month', $ym)
                ->where('type', Transaction::TYPE_INCOME)
                ->sum('total');
            $expense = (float) $grouped
                ->where('period_month', $ym)
                ->where('type', Transaction::TYPE_EXPENSE)
                ->sum('total');
            $net = $income - $expense;
            $running += $net;

            $rows[] = [
                'period_month' => $ym,
                'label' => Carbon::createFromFormat('Y-m', $ym)->format('M Y'),
                'income' => round($income, 2),
                'expense' => round($expense, 2),
                'net' => round($net, 2),
                'cumulative_balance' => round($running, 2),
            ];
        }

        return $rows;
    }
}
