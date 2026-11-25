<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('kdms:check-overdue-tasks')->dailyAt('07:00')->timezone('Asia/Jakarta');
Schedule::command('kdms:check-crm-followups')->dailyAt('07:30')->timezone('Asia/Jakarta');
Schedule::command('kdms:check-content-deadlines')->dailyAt('08:00')->timezone('Asia/Jakarta');
Schedule::command('kdms:check-overdue-invoices')->dailyAt('08:30')->timezone('Asia/Jakarta');
Schedule::command('kdms:check-meeting-slas')->dailyAt('09:00')->timezone('Asia/Jakarta');
Schedule::command('kdms:backup-database')->dailyAt('23:30')->timezone('Asia/Jakarta');
