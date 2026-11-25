<?php

namespace App\Domain\Finance\Services;

use App\Domain\Finance\Models\Budget;
use App\Domain\Finance\Models\FinancialSetting;
use App\Domain\Kpi\Models\KpiDefinition;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use PhpOffice\PhpSpreadsheet\IOFactory;
use RuntimeException;

class FinanceAndKpiWorkbookImporter
{
    /**
     * Imports Sheet 12 KPI & Performance (35 KPIs across 7 members)
     * and Sheet 13 Financial Tracker (6 operational budget categories + unconfirmed opening balance) idempotently.
     *
     * @return array<string, int>
     */
    public function import(string $filePath, bool $preserveExisting = true): array
    {
        if (! is_file($filePath)) {
            throw new RuntimeException("Workbook file not found at {$filePath}");
        }

        $reader = IOFactory::createReaderForFile($filePath);
        $reader->setReadDataOnly(true);
        if (method_exists($reader, 'setLoadSheetsOnly')) {
            $reader->setLoadSheetsOnly(['12 KPI & Performance', '13 Financial Tracker']);
        }
        $spreadsheet = $reader->load($filePath);

        $usersByName = User::query()->get()->keyBy(fn (User $u) => mb_strtolower(trim($u->name)));

        $summary = [
            'kpis_created' => 0,
            'kpis_skipped' => 0,
            'budgets_created' => 0,
            'budgets_skipped' => 0,
        ];

        DB::transaction(function () use ($spreadsheet, $usersByName, $preserveExisting, &$summary): void {
            // 1. Sheet 12 KPI & Performance
            $kpiSheet = $spreadsheet->getSheetByName('12 KPI & Performance');
            if ($kpiSheet) {
                $currentUser = null;
                $userSeq = 0;
                $highestRow = min(120, (int) $kpiSheet->getHighestRow());

                for ($r = 21; $r <= $highestRow; $r++) {
                    $colA = trim((string) $kpiSheet->getCell("A{$r}")->getCalculatedValue());
                    $colB = trim((string) $kpiSheet->getCell("B{$r}")->getCalculatedValue());

                    if ($colA !== '' && str_contains($colA, '—')) {
                        $memberName = mb_strtolower(trim(explode('—', $colA)[0]));
                        $currentUser = $usersByName->get($memberName);
                        $userSeq++;

                        continue;
                    }

                    if (! $currentUser || ! is_numeric($colA) || $colB === '' || mb_strtolower($colB) === 'total') {
                        continue;
                    }

                    $sortOrder = (int) $colA;
                    $code = sprintf('KPI-%02d-%02d', $userSeq, $sortOrder);
                    $existing = KpiDefinition::where('code', $code)->first();

                    if ($existing && $preserveExisting) {
                        $summary['kpis_skipped']++;

                        continue;
                    }

                    $targetLabel = trim((string) $kpiSheet->getCell("D{$r}")->getCalculatedValue());
                    $dataStatus = str_contains(mb_strtolower($targetLabel), 'usulan')
                        ? 'Usulan'
                        : 'Disepakati';

                    KpiDefinition::updateOrCreate(
                        ['code' => $code],
                        [
                            'user_id' => $currentUser->id,
                            'sort_order' => $sortOrder,
                            'name' => $colB,
                            'definition' => trim((string) $kpiSheet->getCell("C{$r}")->getCalculatedValue()) ?: null,
                            'target_label' => $targetLabel,
                            'evaluation_period' => trim((string) $kpiSheet->getCell("E{$r}")->getCalculatedValue()) ?: 'Bulanan',
                            'weight' => round((float) ($kpiSheet->getCell("F{$r}")->getCalculatedValue() ?? 0), 4),
                            'data_status' => $dataStatus,
                            'is_active' => true,
                        ]
                    );

                    $summary['kpis_created']++;
                }
            }

            // 2. Sheet 13 Financial Tracker (never fabricate numbers: D-12)
            FinancialSetting::firstOrCreate(
                ['id' => 1],
                [
                    'opening_cash_balance' => null,
                    'opening_cash_date' => '2026-12-01',
                    'currency' => 'IDR',
                    'data_status' => 'Perlu Konfirmasi Manajemen',
                    'notes' => 'Saldo awal kas per 1 Des 2026 sengaja kosong menunggu konfirmasi Albert & Farizy (D-12).',
                ]
            );

            $finSheet = $spreadsheet->getSheetByName('13 Financial Tracker');
            if ($finSheet) {
                for ($r = 20; $r <= 25; $r++) {
                    $category = trim((string) $finSheet->getCell("B{$r}")->getCalculatedValue());
                    if ($category === '') {
                        continue;
                    }

                    $existingBudget = Budget::where('fiscal_year', 2027)
                        ->where('category', $category)
                        ->first();

                    if ($existingBudget && $preserveExisting) {
                        $summary['budgets_skipped']++;

                        continue;
                    }

                    $picName = mb_strtolower(trim((string) $finSheet->getCell("C{$r}")->getCalculatedValue()));
                    $pic = $usersByName->get($picName);
                    $rawTarget = $finSheet->getCell("E{$r}")->getCalculatedValue();
                    $targetAmount = ($rawTarget !== null && $rawTarget !== '' && is_numeric($rawTarget))
                        ? (float) $rawTarget
                        : null;

                    Budget::updateOrCreate(
                        ['fiscal_year' => 2027, 'category' => $category],
                        [
                            'pic_user_id' => $pic?->id,
                            'assumptions' => trim((string) $finSheet->getCell("D{$r}")->getCalculatedValue()) ?: null,
                            'target_amount' => $targetAmount,
                            'data_status' => trim((string) ($finSheet->getCell("I{$r}")->getCalculatedValue() ?? 'Perlu Konfirmasi Manajemen')) ?: 'Perlu Konfirmasi Manajemen',
                            'notes' => trim((string) $finSheet->getCell("J{$r}")->getCalculatedValue()) ?: null,
                        ]
                    );

                    $summary['budgets_created']++;
                }
            }
        });

        $spreadsheet->disconnectWorksheets();
        unset($spreadsheet);
        gc_collect_cycles();

        return $summary;
    }
}
