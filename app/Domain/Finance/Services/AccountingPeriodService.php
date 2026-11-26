<?php

namespace App\Domain\Finance\Services;

use App\Domain\Finance\Models\FinancePeriod;
use App\Domain\Workspace\Services\AuditLogger;
use App\Models\User;
use Illuminate\Validation\ValidationException;

class AccountingPeriodService
{
    public function __construct(private readonly AuditLogger $audit) {}

    public function closePeriod(FinancePeriod $period, User $actor): FinancePeriod
    {
        if (! $actor->canManageFinance()) {
            abort(403, 'Unauthorized to close accounting periods.');
        }

        if ($period->status === FinancePeriod::STATUS_LOCKED) {
            throw ValidationException::withMessages([
                'period' => "Period {$period->code} is locked.",
            ]);
        }

        $period->update([
            'status' => FinancePeriod::STATUS_CLOSED,
            'closed_by' => $actor->id,
            'closed_at' => now(),
        ]);

        $this->audit->log(
            'finance.period_closed',
            "Closed accounting period {$period->name} ({$period->code}).",
            $period,
            null,
            ['status' => FinancePeriod::STATUS_CLOSED],
            $actor->id
        );

        return $period->fresh();
    }

    public function reopenPeriod(FinancePeriod $period, User $founder, string $reason): FinancePeriod
    {
        if (! $founder->isManagingDirector()) {
            abort(403, 'Founder authorization is mandatory to reopen a closed accounting period.');
        }

        if ($period->status === FinancePeriod::STATUS_LOCKED) {
            throw ValidationException::withMessages([
                'period' => "Period {$period->code} is permanently locked.",
            ]);
        }

        $oldStatus = $period->status;
        $period->update([
            'status' => FinancePeriod::STATUS_OPEN,
            'reopened_by' => $founder->id,
            'reopened_at' => now(),
            'reopen_reason' => $reason,
        ]);

        $this->audit->log(
            'finance.period_reopened',
            "Reopened accounting period {$period->name} ({$period->code}). Reason: {$reason}",
            $period,
            ['status' => $oldStatus],
            ['status' => FinancePeriod::STATUS_OPEN, 'reason' => $reason],
            $founder->id
        );

        return $period->fresh();
    }
}
