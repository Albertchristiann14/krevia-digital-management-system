<?php

namespace Database\Seeders;

use App\Domain\Governance\Services\GovernanceWorkbookImporter;
use Illuminate\Database\Seeder;

class GovernanceSeeder extends Seeder
{
    public function run(): void
    {
        $path = storage_path('app/private/seed/workplan_2026_2027.xlsx');
        if (! is_file($path)) {
            $fallback = base_path('KREVIA_DIGITAL_ANNUAL_WORKPLAN_2026_2027_REVISED.xlsx');
            if (is_file($fallback)) {
                $path = $fallback;
            }
        }

        app(GovernanceWorkbookImporter::class)->import($path, preserveExisting: true);
    }
}
