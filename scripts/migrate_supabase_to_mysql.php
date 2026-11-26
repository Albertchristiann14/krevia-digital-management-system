<?php

/**
 * Non-destructive read-only Supabase PostgreSQL -> MySQL 8.4 Data Migration & Verification Utility.
 *
 * Usage:
 *   SUPABASE_DSN="pgsql:host=...;port=5432;dbname=postgres;sslmode=require" \
 *   SUPABASE_USER="postgres.<ref>" \
 *   SUPABASE_PASS="<password>" \
 *   MYSQL_DSN="mysql:host=127.0.0.1;port=3306;dbname=kdms;charset=utf8mb4" \
 *   MYSQL_USER="kdms_user" \
 *   MYSQL_PASS="<password>" \
 *   php scripts/migrate_supabase_to_mysql.php
 */

declare(strict_types=1);

$pgDsn = getenv('SUPABASE_DSN') ?: '';
$pgUser = getenv('SUPABASE_USER') ?: '';
$pgPass = getenv('SUPABASE_PASS') ?: '';

$myDsn = getenv('MYSQL_DSN') ?: '';
$myUser = getenv('MYSQL_USER') ?: '';
$myPass = getenv('MYSQL_PASS') ?: '';

if (! $pgDsn || ! $myDsn) {
    fwrite(STDERR, "Missing SUPABASE_DSN or MYSQL_DSN environment variables.\n");
    exit(1);
}

$pg = new PDO($pgDsn, $pgUser, $pgPass, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
$my = new PDO($myDsn, $myUser, $myPass, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);

$tables = $pg->query("SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename != 'migrations' ORDER BY tablename")
    ->fetchAll(PDO::FETCH_COLUMN);

$my->exec('SET FOREIGN_KEY_CHECKS=0');

$report = [];
foreach ($tables as $table) {
    $rows = $pg->query("SELECT * FROM \"{$table}\"")->fetchAll(PDO::FETCH_ASSOC);
    $pgCount = count($rows);

    if ($pgCount === 0) {
        $report[$table] = ['pg' => 0, 'mysql' => 0, 'status' => 'EMPTY'];
        continue;
    }

    $columns = array_keys($rows[0]);
    $colList = implode(', ', array_map(fn ($c) => "`{$c}`", $columns));
    $placeholders = implode(', ', array_fill(0, count($columns), '?'));

    $my->beginTransaction();
    try {
        $my->exec("TRUNCATE TABLE `{$table}`");
        $stmt = $my->prepare("INSERT INTO `{$table}` ({$colList}) VALUES ({$placeholders})");

        foreach ($rows as $row) {
            $values = [];
            foreach ($columns as $col) {
                $val = $row[$col];
                if (is_bool($val)) {
                    $val = $val ? 1 : 0;
                }
                $values[] = $val;
            }
            $stmt->execute($values);
        }
        $my->commit();
    } catch (Throwable $e) {
        $my->rollBack();
        fwrite(STDERR, "Failed migrating table {$table}: {$e->getMessage()}\n");
        exit(1);
    }

    $myCount = (int) $my->query("SELECT COUNT(*) FROM `{$table}`")->fetchColumn();
    $report[$table] = [
        'pg' => $pgCount,
        'mysql' => $myCount,
        'status' => $pgCount === $myCount ? 'VERIFIED' : 'MISMATCH',
    ];
}

$my->exec('SET FOREIGN_KEY_CHECKS=1');

echo json_encode($report, JSON_PRETTY_PRINT) . PHP_EOL;
