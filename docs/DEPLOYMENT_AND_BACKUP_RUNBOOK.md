# KDMS Deployment, Import & Backup/Recovery Runbook

## 1. Environment Requirements
- PHP 8.3+ (`pdo_mysql`, `mbstring`, `xml`, `zip`, `gd`, `fileinfo`)
- Composer 2.x, Node 20+, MySQL 8.x, Redis (optional cache/queue; database fallback supported)

## 2. Initial Setup & Seeding
```bash
composer install --no-dev --optimize-autoloader
npm ci && npm run build
cp .env.example .env
php artisan key:generate
php artisan migrate --force
php artisan db:seed --force
```

## 3. Workbook Import & Dry-Run Verification
Run a safe dry-run preview without modifying database records:
```bash
php artisan kdms:import-workplan --dry-run
```
Apply an updated Excel workbook idempotently (preserving records edited inside KDMS):
```bash
php artisan kdms:import-workplan /path/to/workbook.xlsx
```
Alternatively, authorized administrators (`imports.manage`) can execute dry-run/apply imports and download live `.xlsx` snapshots from `/admin/imports`.

## 4. Scheduler & Queue Workers
Ensure Laravel's scheduler cron runs every minute in production:
```cron
* * * * * cd /path/to/kdms && php artisan schedule:run >> /dev/null 2>&1
```

## 5. Backup & Recovery
- Automated daily backups run at `23:30 Asia/Jakarta` via `php artisan kdms:backup-database`, writing snapshots to `storage/app/private/backups/`.
- Run a manual backup anytime:
```bash
php artisan kdms:backup-database
```
- Protect `storage/app/private/` from public web access (`public/` must be the sole web root).
