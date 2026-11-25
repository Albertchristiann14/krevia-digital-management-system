<?php

namespace App\Console\Commands;

use App\Domain\Crm\Models\FollowUp;
use App\Notifications\CrmFollowUpNotification;
use Carbon\Carbon;
use Illuminate\Console\Command;

class CheckCrmFollowUpsCommand extends Command
{
    protected $signature = 'kdms:check-crm-followups {--date= : Reference date (YYYY-MM-DD)}';

    protected $description = 'Send reminders for due and overdue CRM prospect follow-ups.';

    public function handle(): int
    {
        $today = $this->option('date')
            ? Carbon::parse((string) $this->option('date'))->startOfDay()
            : now()->startOfDay();

        $dueFollowUps = FollowUp::query()
            ->with(['lead.company:id,name', 'assignee:id,name'])
            ->where('status', 'Pending')
            ->whereDate('due_at', '<=', $today)
            ->get();

        $sent = 0;

        foreach ($dueFollowUps as $followUp) {
            if (! $followUp->assignee || ! $followUp->lead) {
                continue;
            }

            $alreadySentToday = $followUp->assignee->notifications()
                ->whereDate('created_at', $today)
                ->where('data->follow_up_id', $followUp->id)
                ->exists();

            if (! $alreadySentToday) {
                $followUp->assignee->notify(new CrmFollowUpNotification($followUp));
                $sent++;
            }
        }

        $this->info("Checked CRM follow-ups as of {$today->toDateString()}: {$dueFollowUps->count()} due, {$sent} reminders sent.");

        return self::SUCCESS;
    }
}
