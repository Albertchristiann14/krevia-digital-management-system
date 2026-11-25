<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class BackupDatabaseCommand extends Command
{
    protected $signature = 'kdms:backup-database {--path= : Optional custom output file path}';

    protected $description = 'Create a timestamped JSON/SQL snapshot backup of KDMS database tables in private storage.';

    public function handle(): int
    {
        $dir = storage_path('app/private/backups');
        if (! is_dir($dir)) {
            mkdir($dir, 0755, true);
        }

        $filePath = $this->option('path') ?: ($dir . DIRECTORY_SEPARATOR . 'kdms_backup_' . now()->format('Ymd_His') . '.json');

        $connection = config('database.default');
        $driver = config("database.connections.{$connection}.driver", $connection);
        $dbName = config("database.connections.{$connection}.database");
        $pgSchema = config("database.connections.{$connection}.search_path", 'public');

        $tables = collect(Schema::getTables())
            ->filter(function (array $t) use ($driver, $dbName, $pgSchema) {
                if ($driver === 'pgsql') {
                    return ($t['schema'] ?? 'public') === $pgSchema;
                }
                if ($driver === 'sqlite') {
                    return ! str_starts_with($t['name'], 'sqlite_');
                }

                return ($t['schema'] ?? $dbName) === $dbName;
            })
            ->pluck('name')
            ->all();

        $snapshot = [
            'generated_at' => now()->toIso8601String(),
            'connection' => $connection,
            'database' => $dbName,
            'tables' => [],
        ];

        foreach ($tables as $cleanName) {
            $rows = DB::table($cleanName)->get()->map(fn ($r) => (array) $r)->all();
            $snapshot['tables'][$cleanName] = [
                'count' => count($rows),
                'rows' => $rows,
            ];
        }

        file_put_contents($filePath, json_encode($snapshot, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

        $this->info("Database backup created successfully at: {$filePath} (" . count($snapshot['tables']) . ' tables).');

        return self::SUCCESS;
    }
}
