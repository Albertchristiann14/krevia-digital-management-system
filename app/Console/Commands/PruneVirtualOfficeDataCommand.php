<?php

namespace App\Console\Commands;

use App\Domain\VirtualOffice\Models\OfficeEvent;
use App\Domain\VirtualOffice\Models\OfficeKnock;
use App\Domain\VirtualOffice\Models\OfficeMessage;
use App\Domain\VirtualOffice\Models\OfficePresenceLog;
use App\Domain\VirtualOffice\Models\OfficeVisitor;
use App\Domain\VirtualOffice\Services\PresenceService;
use App\Domain\VirtualOffice\Services\WorkspaceObjectService;
use Illuminate\Console\Command;

class PruneVirtualOfficeDataCommand extends Command
{
    protected $signature = 'kdms:prune-virtual-office-data {--days=90 : Retention window in days}';

    protected $description = 'Prune old Virtual Office logs, messages, knocks, visitors, and sweep stale sessions';

    public function handle(PresenceService $presenceService, WorkspaceObjectService $objectService): int
    {
        $days = max(7, (int) $this->option('days'));
        $cutoff = now()->subDays($days);

        $sweptPresences = $presenceService->sweepStalePresences();
        $sweptVisitors = $objectService->sweepExpiredVisitors();

        $logsDeleted = OfficePresenceLog::query()->where('started_at', '<', $cutoff)->delete();
        $eventsDeleted = OfficeEvent::query()->where('created_at', '<', $cutoff)->delete();
        $messagesDeleted = OfficeMessage::withTrashed()->where('created_at', '<', $cutoff)->forceDelete();
        $knocksDeleted = OfficeKnock::query()->where('created_at', '<', $cutoff)->delete();
        $visitorsDeleted = OfficeVisitor::query()
            ->whereIn('status', ['checked_out', 'expired'])
            ->where('created_at', '<', $cutoff)
            ->delete();

        $this->info(sprintf(
            'Swept (%d presences, %d visitors); pruned %d logs, %d events, %d messages, %d knocks, %d visitors (cutoff: %s).',
            $sweptPresences,
            $sweptVisitors,
            $logsDeleted,
            $eventsDeleted,
            $messagesDeleted,
            $knocksDeleted,
            $visitorsDeleted,
            $cutoff->toDateString()
        ));

        return self::SUCCESS;
    }
}
