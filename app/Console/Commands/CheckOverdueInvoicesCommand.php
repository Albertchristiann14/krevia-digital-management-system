<?php

namespace App\Console\Commands;

use App\Domain\Finance\Models\Invoice;
use App\Models\User;
use App\Notifications\InvoiceOverdueNotification;
use Illuminate\Console\Command;

class CheckOverdueInvoicesCommand extends Command
{
    protected $signature = 'kdms:check-overdue-invoices';

    protected $description = 'Mark unpaid past-due invoices as Overdue and notify finance owners (Albert & Farizy).';

    public function handle(): int
    {
        $today = now()->toDateString();

        $overdueInvoices = Invoice::query()
            ->with('company')
            ->whereIn('status', ['Sent', 'Partial', 'Overdue'])
            ->whereDate('due_date', '<', $today)
            ->whereColumn('paid_amount', '<', 'amount')
            ->get();

        if ($overdueInvoices->isEmpty()) {
            $this->info('No overdue invoices found.');

            return self::SUCCESS;
        }

        $financeOwners = User::query()
            ->role([User::ROLE_FOUNDER, User::ROLE_OPERATIONS])
            ->get();

        foreach ($overdueInvoices as $invoice) {
            if ($invoice->status !== 'Overdue') {
                $invoice->update(['status' => 'Overdue']);
            }

            foreach ($financeOwners as $owner) {
                $owner->notify(new InvoiceOverdueNotification($invoice));
            }
        }

        $this->info("Flagged {$overdueInvoices->count()} overdue invoices.");

        return self::SUCCESS;
    }
}
