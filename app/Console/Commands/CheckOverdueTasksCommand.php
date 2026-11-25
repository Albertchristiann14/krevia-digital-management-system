<?php

namespace App\Console\Commands;

use App\Domain\Workplan\Models\Task;
use App\Models\User;
use App\Notifications\TaskNotification;
use Carbon\Carbon;
use Illuminate\Console\Command;

class CheckOverdueTasksCommand extends Command
{
    protected $signature = 'kdms:check-overdue-tasks {--date= : Reference date (YYYY-MM-DD)}';

    protected $description = 'Detect overdue and due-soon tasks and send reminders to PICs and Director of Operations.';

    public function handle(): int
    {
        $today = $this->option('date')
            ? Carbon::parse((string) $this->option('date'))->startOfDay()
            : now()->startOfDay();

        $soonCutoff = $today->copy()->addDays(3);

        $openTasks = Task::query()
            ->with('pic:id,name,email')
            ->whereNotIn('status', ['Completed', 'Cancelled'])
            ->whereDate('deadline', '<=', $soonCutoff)
            ->get();

        $opsLead = User::role(User::ROLE_OPERATIONS)->first();

        $overdueCount = 0;
        $dueSoonCount = 0;
        $notificationsSent = 0;

        foreach ($openTasks as $task) {
            if ($task->isOverdue($today)) {
                $overdueCount++;
                $category = 'overdue';
                $priority = 'urgent';
                $msg = "OVERDUE: {$task->code} ({$task->title}) passed its deadline on {$task->deadline->format('Y-m-d')}.";
            } else {
                $dueSoonCount++;
                $category = 'deadline';
                $priority = 'high';
                $msg = "DUE SOON: {$task->code} ({$task->title}) is due on {$task->deadline->format('Y-m-d')}.";
            }

            $recipients = collect([$task->pic, $opsLead])->filter()->unique('id');
            foreach ($recipients as $recipient) {
                $alreadySentToday = $recipient->notifications()
                    ->whereDate('created_at', $today)
                    ->where('data->task_id', $task->id)
                    ->where('data->category', $category)
                    ->exists();

                if (! $alreadySentToday) {
                    $recipient->notify(new TaskNotification($category, $priority, $task, $msg));
                    $notificationsSent++;
                }
            }
        }

        $this->info("Checked tasks as of {$today->toDateString()}: {$overdueCount} overdue, {$dueSoonCount} due soon, {$notificationsSent} notifications sent.");

        return self::SUCCESS;
    }
}
