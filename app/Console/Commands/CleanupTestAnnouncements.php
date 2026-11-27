<?php

namespace App\Console\Commands;

use App\Domain\Workspace\Models\Announcement;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class CleanupTestAnnouncements extends Command
{
    protected $signature = 'kdms:cleanup-test-announcements {--dry-run : List matching records without deleting}';

    protected $description = 'Safely remove confirmed dummy/testing announcements and their database notifications.';

    /**
     * Exact normalized titles of confirmed test announcements only.
     */
    private const CONFIRMED_TEST_TITLES = [
        'tes',
        'test',
        'tes lagi',
        'testing lagi',
        'testing lagiii',
        'tes notification',
        'test notification',
        'tes notifikasi',
        'coba',
        'coba lagi',
    ];

    public function handle(): int
    {
        $matches = Announcement::query()
            ->get()
            ->filter(function (Announcement $a): bool {
                $normalized = strtolower(trim(preg_replace('/[.!?\s]+$/', '', (string) $a->title)));

                return in_array($normalized, self::CONFIRMED_TEST_TITLES, true);
            });

        if ($matches->isEmpty()) {
            $this->info('No confirmed test announcements found.');

            return self::SUCCESS;
        }

        foreach ($matches as $ann) {
            $this->line(sprintf(' - #%d [%s] %s (%s)', $ann->id, $ann->code, $ann->title, $ann->published_at?->toDateTimeString() ?? 'draft'));
        }

        if ($this->option('dry-run')) {
            $this->warn('Dry run enabled; no records were deleted.');

            return self::SUCCESS;
        }

        DB::transaction(function () use ($matches): void {
            $codes = $matches->pluck('code')->filter()->values()->all();
            foreach ($matches as $ann) {
                $ann->forceDelete();
            }

            if ($codes !== []) {
                DB::table('notifications')
                    ->where('type', 'App\\Notifications\\AnnouncementNotification')
                    ->where(function ($q) use ($codes): void {
                        foreach ($codes as $code) {
                            $q->orWhere('data', 'like', "%\"{$code}\"%");
                        }
                    })
                    ->delete();
            }
        });

        $this->info("Removed {$matches->count()} confirmed test announcement(s).");

        return self::SUCCESS;
    }
}
