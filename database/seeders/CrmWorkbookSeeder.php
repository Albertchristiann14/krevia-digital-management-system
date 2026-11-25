<?php

namespace Database\Seeders;

use App\Domain\Crm\Services\CrmWorkbookImporter;
use Illuminate\Database\Seeder;

class CrmWorkbookSeeder extends Seeder
{
    public function run(CrmWorkbookImporter $importer): void
    {
        $path = storage_path('app/private/seed/workplan_2026_2027.xlsx');
        $importer->import($path, preserveExisting: true);
    }
}
