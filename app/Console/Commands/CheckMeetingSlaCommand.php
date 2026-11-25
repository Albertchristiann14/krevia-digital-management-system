<?php

namespace App\Console\Commands;

use App\Domain\Governance\Models\ActionItem;
use App\Domain\Governance\Models\Meeting;
use App\Notifications\MeetingSlaNotification;
use Illuminate\Console\Command;

class CheckMeetingSlaCommand extends Command
{
    protected $signature = 'kdms:check-meeting-slas';

    protected $description = 'Notify meeting PICs for H-1 agenda readiness, 24h minutes SLA, and overdue action items.';

    public function handle(): int
    {
        $tomorrow = now()->addDay()->toDateString();
        $yesterday = now()->subDay()->toDateString();
        $count = 0;

        $meetingsMissingAgenda = Meeting::query()
            ->with('pic')
            ->where('status', 'Planned')
            ->whereDate('scheduled_date', '<=', $tomorrow)
            ->whereNull('agenda')
            ->get();

        foreach ($meetingsMissingAgenda as $m) {
            if ($m->pic) {
                $m->pic->notify(new MeetingSlaNotification(
                    $m,
                    'missing_h1_agenda',
                    "H-1 Agenda required for {$m->code} ({$m->forum_name}: {$m->focus}) scheduled on {$m->scheduled_date->format('Y-m-d')}."
                ));
                $count++;
            }
        }

        $meetingsMissingMinutes = Meeting::query()
            ->with('pic')
            ->whereIn('status', ['Planned', 'Agenda Ready'])
            ->whereDate('scheduled_date', '<=', $yesterday)
            ->doesntHave('minute')
            ->get();

        foreach ($meetingsMissingMinutes as $m) {
            if ($m->pic) {
                $m->pic->notify(new MeetingSlaNotification(
                    $m,
                    'overdue_24h_minutes',
                    "Minutes overdue (>24h SLA) for {$m->code} ({$m->forum_name})."
                ));
                $count++;
            }
        }

        ActionItem::query()
            ->whereIn('status', ['Open', 'In Progress'])
            ->whereDate('due_date', '<', now()->toDateString())
            ->update(['status' => 'Overdue']);

        $this->info("Dispatched {$count} meeting SLA notifications.");

        return self::SUCCESS;
    }
}
