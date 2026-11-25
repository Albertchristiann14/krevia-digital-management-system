<?php

namespace App\Domain\Workspace\Services;

use App\Domain\Crm\Models\Lead;
use App\Domain\Crm\Services\CrmWorkbookImporter;
use App\Domain\Finance\Services\FinanceAndKpiWorkbookImporter;
use App\Domain\Governance\Models\Decision;
use App\Domain\Governance\Models\Risk;
use App\Domain\Governance\Services\GovernanceWorkbookImporter;
use App\Domain\Portfolio\Services\PortfolioAndMarketingWorkbookImporter;
use App\Domain\Workplan\Models\Task;
use App\Domain\Workplan\Services\WorkplanWorkbookImporter;
use App\Domain\Workspace\Models\ImportBatch;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

class FullWorkbookOrchestratorService
{
    public function __construct(
        private readonly WorkplanWorkbookImporter $workplanImporter,
        private readonly CrmWorkbookImporter $crmImporter,
        private readonly PortfolioAndMarketingWorkbookImporter $portfolioImporter,
        private readonly FinanceAndKpiWorkbookImporter $financeKpiImporter,
        private readonly GovernanceWorkbookImporter $governanceImporter,
        private readonly AuditLogger $audit,
    ) {}

    /**
     * Runs all 5 domain workbook importers with optional dry-run rollback preview.
     *
     * @return array<string, mixed>
     */
    public function runImport(
        string $filePath,
        bool $dryRun = false,
        bool $preserveExisting = true,
        ?User $actor = null,
        ?string $displayFilename = null
    ): array {
        $filename = $displayFilename ?: basename($filePath);
        $summary = [];

        if ($dryRun) {
            DB::beginTransaction();
            try {
                $summary = $this->executeAllImporters($filePath, $preserveExisting);
            } finally {
                DB::rollBack();
            }
        } else {
            $summary = $this->executeAllImporters($filePath, $preserveExisting);
        }

        $batch = ImportBatch::create([
            'filename' => $filename,
            'mode' => $dryRun ? 'dry_run' : 'apply',
            'preserve_existing' => $preserveExisting,
            'summary_json' => $summary,
            'imported_by' => $actor?->id,
        ]);

        $this->audit->log(
            'workbook.import_' . ($dryRun ? 'dry_run' : 'applied'),
            "Executed {$batch->mode} workbook import from {$filename}.",
            $batch,
            null,
            $summary,
            $actor?->id
        );

        return [
            'batch' => $batch,
            'summary' => $summary,
        ];
    }

    /**
     * @return array<string, array<string, int>>
     */
    private function executeAllImporters(string $filePath, bool $preserveExisting): array
    {
        return [
            'workplan' => $this->workplanImporter->import($filePath, $preserveExisting),
            'crm' => $this->crmImporter->import($filePath, $preserveExisting),
            'portfolio_marketing' => $this->portfolioImporter->import($filePath, $preserveExisting),
            'finance_kpi' => $this->financeKpiImporter->import($filePath, $preserveExisting),
            'governance' => $this->governanceImporter->import($filePath, $preserveExisting),
        ];
    }

    public function exportLiveWorkbook(): string
    {
        $spreadsheet = new Spreadsheet;

        // Sheet 1: Tasks
        $taskSheet = $spreadsheet->getActiveSheet();
        $taskSheet->setTitle('Tasks');
        $taskSheet->fromArray(['Code', 'Title', 'PIC', 'Priority', 'Deadline', 'Status', 'Progress %'], null, 'A1');
        $row = 2;
        foreach (Task::with('pic:id,name')->orderBy('code')->get() as $t) {
            $taskSheet->fromArray([
                $t->code,
                $t->title,
                $t->pic?->name,
                $t->priority,
                $t->deadline?->format('Y-m-d'),
                $t->status,
                $t->progress_pct,
            ], null, "A{$row}");
            $row++;
        }

        // Sheet 2: Sales Pipeline
        $crmSheet = $spreadsheet->createSheet();
        $crmSheet->setTitle('Sales Pipeline');
        $crmSheet->fromArray(['Code', 'Company', 'Industry', 'Service Line', 'Stage', 'PIC', 'Est. Value', 'Data Status'], null, 'A1');
        $row = 2;
        foreach (Lead::with(['company:id,name,industry', 'pic:id,name'])->orderBy('code')->get() as $l) {
            $crmSheet->fromArray([
                $l->code,
                $l->company?->name,
                $l->company?->industry,
                $l->service_line,
                $l->stage,
                $l->pic?->name,
                $l->estimated_value,
                $l->data_status,
            ], null, "A{$row}");
            $row++;
        }

        // Sheet 3: Risks & Decisions
        $govSheet = $spreadsheet->createSheet();
        $govSheet->setTitle('Risks & Decisions');
        $govSheet->fromArray(['Type', 'Code', 'Title / Topic', 'Level / Data Status', 'Status', 'PIC'], null, 'A1');
        $row = 2;
        foreach (Risk::with('pic:id,name')->orderBy('code')->get() as $r) {
            $govSheet->fromArray(['Risk', $r->code, $r->title, "{$r->level} ({$r->score})", $r->status, $r->pic?->name], null, "A{$row}");
            $row++;
        }
        foreach (Decision::with('pic:id,name')->orderBy('code')->get() as $d) {
            $govSheet->fromArray(['Decision', $d->code, $d->topic_decision, $d->data_status, $d->status, $d->pic?->name], null, "A{$row}");
            $row++;
        }

        $tmpPath = storage_path('app/private/exports/kdms_export_' . now()->format('Ymd_His') . '.xlsx');
        if (! is_dir(dirname($tmpPath))) {
            mkdir(dirname($tmpPath), 0755, true);
        }

        $writer = new Xlsx($spreadsheet);
        $writer->save($tmpPath);
        $spreadsheet->disconnectWorksheets();
        unset($spreadsheet);

        return $tmpPath;
    }
}
