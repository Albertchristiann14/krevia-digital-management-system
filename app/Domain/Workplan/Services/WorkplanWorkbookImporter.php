<?php

namespace App\Domain\Workplan\Services;

use App\Domain\Workplan\Models\AnnualRoadmap;
use App\Domain\Workplan\Models\MonthlyWorkplan;
use App\Domain\Workplan\Models\Task;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Shared\Date as ExcelDate;
use RuntimeException;

class WorkplanWorkbookImporter
{
    /**
     * Imports 05 Annual Roadmap, 06 Monthly Workplan, and 07 Task Tracker
     * idempotently without silently overwriting existing modified tasks.
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
            $reader->setLoadSheetsOnly(['05 Annual Roadmap', '06 Monthly Workplan', '07 Task Tracker']);
        }
        $spreadsheet = $reader->load($filePath);
        $usersByName = User::query()->get()->keyBy(fn (User $u) => mb_strtolower(trim($u->name)));

        $summary = [
            'roadmaps_created' => 0,
            'roadmaps_updated' => 0,
            'tasks_created' => 0,
            'tasks_skipped' => 0,
            'tasks_failed' => 0,
            'workplans_synced' => 0,
        ];

        DB::transaction(function () use ($spreadsheet, $usersByName, $preserveExisting, &$summary): void {
            // 1. Sheet 05 Annual Roadmap (rows 6..18)
            $roadmapSheet = $spreadsheet->getSheetByName('05 Annual Roadmap');
            $roadmapsByMonth = [];

            if ($roadmapSheet) {
                for ($r = 6; $r <= 18; $r++) {
                    $monthLabel = trim((string) $roadmapSheet->getCell("A{$r}")->getCalculatedValue());
                    if ($monthLabel === '') {
                        continue;
                    }

                    $periodDate = $this->parseDate($roadmapSheet->getCell("N{$r}")->getCalculatedValue());
                    if (! $periodDate) {
                        continue;
                    }

                    $picName = mb_strtolower(trim((string) $roadmapSheet->getCell("G{$r}")->getCalculatedValue()));
                    $picUser = $usersByName->get($picName);

                    $payload = [
                        'month_label' => $monthLabel,
                        'phase_label' => trim((string) $roadmapSheet->getCell("B{$r}")->getCalculatedValue()),
                        'primary_focus' => trim((string) $roadmapSheet->getCell("C{$r}")->getCalculatedValue()),
                        'target_summary' => trim((string) $roadmapSheet->getCell("D{$r}")->getCalculatedValue()),
                        'priority_work' => trim((string) $roadmapSheet->getCell("E{$r}")->getCalculatedValue()),
                        'expected_output' => trim((string) $roadmapSheet->getCell("F{$r}")->getCalculatedValue()),
                        'pic_user_id' => $picUser?->id,
                        'success_indicator' => trim((string) $roadmapSheet->getCell("H{$r}")->getCalculatedValue()),
                        'target_contacts' => (int) ($roadmapSheet->getCell("I{$r}")->getCalculatedValue() ?? 0),
                        'target_meetings' => (int) ($roadmapSheet->getCell("J{$r}")->getCalculatedValue() ?? 0),
                        'target_proposals' => (int) ($roadmapSheet->getCell("K{$r}")->getCalculatedValue() ?? 0),
                        'target_won' => (int) ($roadmapSheet->getCell("L{$r}")->getCalculatedValue() ?? 0),
                        'target_status' => trim((string) ($roadmapSheet->getCell("M{$r}")->getCalculatedValue() ?? 'Usulan')) ?: 'Usulan',
                    ];

                    $existing = AnnualRoadmap::whereDate('period_month', $periodDate)->first();
                    if ($existing) {
                        if (! $preserveExisting) {
                            $existing->update($payload);
                        }
                        $summary['roadmaps_updated']++;
                        $roadmap = $existing;
                    } else {
                        $roadmap = AnnualRoadmap::create(['period_month' => $periodDate, ...$payload]);
                        $summary['roadmaps_created']++;
                    }

                    $roadmapsByMonth[$periodDate] = $roadmap;
                }
            }

            // 2. Pre-read Sheet 06 Monthly Workplan for stage labels & expected evidence
            $monthlyMetaByTaskCode = [];
            $workplanSheet = $spreadsheet->getSheetByName('06 Monthly Workplan');
            if ($workplanSheet) {
                $currentStage = null;
                $maxRow = $workplanSheet->getHighestRow();
                for ($r = 6; $r <= $maxRow; $r++) {
                    $colA = trim((string) $workplanSheet->getCell("A{$r}")->getCalculatedValue());
                    $colB = trim((string) $workplanSheet->getCell("B{$r}")->getCalculatedValue());

                    if (str_starts_with($colA, 'Tahap ')) {
                        $currentStage = $colA;

                        continue;
                    }
                    if (str_contains($colA, '— Fokus:')) {
                        $currentStage = null;

                        continue;
                    }
                    if ($colB !== '' && str_starts_with($colB, 'T-')) {
                        $monthlyMetaByTaskCode[$colB] = [
                            'stage_label' => $currentStage,
                            'expected_evidence' => trim((string) $workplanSheet->getCell("I{$r}")->getCalculatedValue()),
                            'evaluation_notes' => trim((string) $workplanSheet->getCell("J{$r}")->getCalculatedValue()) ?: null,
                            'sort_order' => $r,
                        ];
                    }
                }
            }

            // 3. Sheet 07 Task Tracker (rows 6..220)
            $taskSheet = $spreadsheet->getSheetByName('07 Task Tracker');
            if ($taskSheet) {
                $maxRow = $taskSheet->getHighestRow();
                for ($r = 6; $r <= $maxRow; $r++) {
                    $code = trim((string) $taskSheet->getCell("A{$r}")->getCalculatedValue());
                    if ($code === '') {
                        continue;
                    }

                    $title = trim((string) $taskSheet->getCell("B{$r}")->getCalculatedValue());
                    $picName = mb_strtolower(trim((string) $taskSheet->getCell("D{$r}")->getCalculatedValue()));
                    $picUser = $usersByName->get($picName);
                    $deadline = $this->parseDate($taskSheet->getCell("G{$r}")->getCalculatedValue());

                    if ($title === '' || ! $picUser || ! $deadline) {
                        $summary['tasks_failed']++;

                        continue;
                    }

                    $startDate = $this->parseDate($taskSheet->getCell("F{$r}")->getCalculatedValue());
                    $monthKey = Carbon::parse($deadline)->startOfMonth()->toDateString();
                    $roadmap = $roadmapsByMonth[$monthKey] ?? AnnualRoadmap::whereDate('period_month', $monthKey)->first();

                    $existingTask = Task::withTrashed()->where('code', $code)->first();
                    if ($existingTask && $preserveExisting) {
                        $summary['tasks_skipped']++;
                        $task = $existingTask;
                    } else {
                        $meta = $monthlyMetaByTaskCode[$code] ?? null;
                        $payload = [
                            'annual_roadmap_id' => $roadmap?->id,
                            'title' => $title,
                            'description' => trim((string) $taskSheet->getCell("C{$r}")->getCalculatedValue()) ?: null,
                            'expected_result' => $meta['expected_evidence'] ?? null,
                            'pic_user_id' => $picUser->id,
                            'priority' => trim((string) ($taskSheet->getCell("E{$r}")->getCalculatedValue() ?? 'Sedang')) ?: 'Sedang',
                            'start_date' => $startDate,
                            'deadline' => $deadline,
                            'status' => trim((string) ($taskSheet->getCell("H{$r}")->getCalculatedValue() ?? 'Not Started')) ?: 'Not Started',
                            'progress_pct' => (int) ($taskSheet->getCell("I{$r}")->getCalculatedValue() ?? 0),
                            'blocker_note' => trim((string) $taskSheet->getCell("K{$r}")->getCalculatedValue()) ?: null,
                            'notes' => trim((string) $taskSheet->getCell("L{$r}")->getCalculatedValue()) ?: null,
                        ];

                        if ($existingTask) {
                            $existingTask->update($payload);
                            $task = $existingTask;
                        } else {
                            $task = Task::create(['code' => $code, ...$payload]);
                            $summary['tasks_created']++;
                        }
                    }

                    if ($roadmap) {
                        $meta = $monthlyMetaByTaskCode[$code] ?? ['stage_label' => null, 'expected_evidence' => null, 'evaluation_notes' => null, 'sort_order' => $r];
                        MonthlyWorkplan::updateOrCreate(
                            ['task_id' => $task->id],
                            [
                                'annual_roadmap_id' => $roadmap->id,
                                'stage_label' => $meta['stage_label'],
                                'expected_evidence' => $meta['expected_evidence'],
                                'evaluation_notes' => $meta['evaluation_notes'],
                                'sort_order' => $meta['sort_order'],
                            ]
                        );
                        $summary['workplans_synced']++;
                    }
                }
            }
        });

        $spreadsheet->disconnectWorksheets();
        unset($spreadsheet);
        gc_collect_cycles();

        return $summary;
    }

    private function parseDate(mixed $raw): ?string
    {
        if ($raw === null || $raw === '') {
            return null;
        }
        if (is_numeric($raw)) {
            return ExcelDate::excelToDateTimeObject((float) $raw)->format('Y-m-d');
        }
        try {
            return Carbon::parse((string) $raw)->format('Y-m-d');
        } catch (\Throwable) {
            return null;
        }
    }
}
