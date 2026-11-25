<?php

namespace App\Console\Commands;

use App\Domain\Marketing\Models\ContentItem;
use App\Notifications\MarketingDeadlineNotification;
use Illuminate\Console\Command;

class CheckContentDeadlinesCommand extends Command
{
    protected $signature = 'kdms:check-content-deadlines';

    protected $description = 'Notify PICs and reviewers for H-5 production, H-2 review, and overdue publication dates.';

    public function handle(): int
    {
        $today = now()->toDateString();
        $count = 0;

        $items = ContentItem::query()
            ->with(['pic', 'reviewer'])
            ->whereNotIn('status', ['Published', 'Cancelled'])
            ->get();

        foreach ($items as $item) {
            if ($item->status === 'Planned' && $item->production_date && $item->production_date->toDateString() <= $today && $item->pic) {
                $item->pic->notify(new MarketingDeadlineNotification(
                    $item,
                    'production_h5',
                    "H-5 Production due for {$item->code} ({$item->platform}): {$item->title_topic}"
                ));
                $count++;
            }

            if (in_array($item->status, ['Planned', 'In Production'], true) && $item->review_date && $item->review_date->toDateString() <= $today && $item->reviewer) {
                $item->reviewer->notify(new MarketingDeadlineNotification(
                    $item,
                    'review_h2',
                    "H-2 Review ready/due for {$item->code} ({$item->platform}): {$item->title_topic}"
                ));
                $count++;
            }

            if ($item->publish_date && $item->publish_date->toDateString() < $today && $item->pic) {
                $item->pic->notify(new MarketingDeadlineNotification(
                    $item,
                    'publish_overdue',
                    "Scheduled publish date passed for {$item->code} ({$item->publish_date->format('Y-m-d')})."
                ));
                $count++;
            }
        }

        $this->info("Dispatched {$count} marketing deadline notifications.");

        return self::SUCCESS;
    }
}
