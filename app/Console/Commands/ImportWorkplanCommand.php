<?php

namespace App\Console\Commands;

use App\Domain\Workspace\Services\FullWorkbookOrchestratorService;
use Illuminate\Console\Command;

class ImportWorkplanCommand extends Command
{
    protected $signature = 'kdms:import-workplan
                            {file? : Path to the Excel workbook}
                            {--dry-run : Validate and preview counts without committing changes}
                            {--overwrite : Overwrite existing records matched by workbook code}';

    protected $description = 'Import all KDMS sheets from KREVIA_DIGITAL_ANNUAL_WORKPLAN_2026_2027_REVISED.xlsx idempotently.';

    public function handle(FullWorkbookOrchestratorService $orchestrator): int
    {
        $file = $this->argument('file') ?: storage_path('app/private/seed/workplan_2026_2027.xlsx');
        if (! is_file($file)) {
            $this->error("Workbook file not found: {$file}");

            return self::FAILURE;
        }

        $dryRun = (bool) $this->option('dry-run');
        $preserve = ! (bool) $this->option('overwrite');

        $result = $orchestrator->runImport($file, $dryRun, $preserve, null, basename($file));

        $this->info(($dryRun ? '[DRY-RUN] ' : '') . 'Workbook import completed:');
        $this->line(json_encode($result['summary'], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

        return self::SUCCESS;
    }
}
