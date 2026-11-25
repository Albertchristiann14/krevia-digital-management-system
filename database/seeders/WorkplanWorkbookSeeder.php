<?php

namespace Database\Seeders;

use App\Domain\Workplan\Services\WorkplanWorkbookImporter;
use Illuminate\Database\Seeder;

class WorkplanWorkbookSeeder extends Seeder
{
    public function run(WorkplanWorkbookImporter $importer): void
    {
        $path = storage_path('app/private/seed/workplan_2026_2027.xlsx');
        $importer->import($path, preserveExisting: true);
    }
}
