<?php

namespace App\Domain\Finance\Services;

use App\Domain\Finance\Models\FinanceAccount;
use App\Domain\Finance\Models\FinanceAccountBalance;
use App\Domain\Finance\Models\FinanceConfiguration;
use App\Domain\Finance\Models\FinanceJournal;
use App\Domain\Finance\Models\FinanceJournalLine;
use App\Domain\Finance\Models\FinanceJournalReversal;
use App\Domain\Finance\Models\FinancePeriod;
use App\Domain\Workspace\Services\AuditLogger;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AccountingEngineService
{
    public function __construct(private readonly AuditLogger $audit) {}

    /**
     * Resolves an open accounting period for the given date, or throws a ValidationException.
     */
    public function resolveOpenPeriod(string $date): FinancePeriod
    {
        $parsed = Carbon::parse($date)->format('Y-m-d');
        $period = FinancePeriod::query()
            ->whereDate('start_date', '<=', $parsed)
            ->whereDate('end_date', '>=', $parsed)
            ->first();

        if (! $period) {
            throw ValidationException::withMessages([
                'journal_date' => "No accounting period configured for date {$parsed}.",
            ]);
        }

        if (! $period->isOpen()) {
            throw ValidationException::withMessages([
                'journal_date' => "Accounting period {$period->name} ({$period->code}) is {$period->status}. Posting is blocked.",
            ]);
        }

        return $period;
    }

    /**
     * Generates a unique sequential journal number e.g. JRN/KRV/2026/0001.
     */
    public function nextJournalNumber(string $date): string
    {
        $year = Carbon::parse($date)->format('Y');
        $prefix = (FinanceConfiguration::query()->value('journal_prefix') ?: 'JRN/KRV')."/{$year}/";

        $latest = FinanceJournal::query()
            ->where('journal_no', 'like', $prefix.'%')
            ->orderByDesc('journal_no')
            ->value('journal_no');

        $seq = $latest ? ((int) substr($latest, strlen($prefix))) + 1 : 1;

        return $prefix.sprintf('%04d', $seq);
    }

    /**
     * Validates lines against strict double-entry accounting rules.
     *
     * @param  array<int, array<string, mixed>>  $lines
     * @return array{total_debit: float, total_credit: float}
     */
    public function validateLines(array $lines): array
    {
        if (count($lines) < 2) {
            throw ValidationException::withMessages([
                'lines' => 'A journal entry must contain at least 2 lines.',
            ]);
        }

        $accountIds = collect($lines)->pluck('account_id')->filter()->unique()->values()->all();
        $accounts = FinanceAccount::query()->whereIn('id', $accountIds)->get()->keyBy('id');

        $totalDebit = 0.0;
        $totalCredit = 0.0;

        foreach ($lines as $idx => $line) {
            $accId = $line['account_id'] ?? null;
            $account = $accId ? $accounts->get($accId) : null;

            if (! $account || ! $account->is_active || ! $account->is_posting) {
                throw ValidationException::withMessages([
                    "lines.{$idx}.account_id" => 'Account must be an active posting account.',
                ]);
            }

            $debit = round((float) ($line['debit'] ?? 0), 2);
            $credit = round((float) ($line['credit'] ?? 0), 2);

            if ($debit < 0 || $credit < 0) {
                throw ValidationException::withMessages([
                    "lines.{$idx}" => 'Debit and credit amounts must be non-negative.',
                ]);
            }

            if ($debit > 0 && $credit > 0) {
                throw ValidationException::withMessages([
                    "lines.{$idx}" => 'A single journal line cannot have both debit and credit greater than zero.',
                ]);
            }

            if ($debit == 0.0 && $credit == 0.0) {
                throw ValidationException::withMessages([
                    "lines.{$idx}" => 'A journal line must have either a positive debit or credit amount.',
                ]);
            }

            $totalDebit = round($totalDebit + $debit, 2);
            $totalCredit = round($totalCredit + $credit, 2);
        }

        if (abs($totalDebit - $totalCredit) > 0.001) {
            throw ValidationException::withMessages([
                'lines' => "Unbalanced journal: Total Debit ({$totalDebit}) must equal Total Credit ({$totalCredit}).",
            ]);
        }

        return [
            'total_debit' => $totalDebit,
            'total_credit' => $totalCredit,
        ];
    }

    /**
     * Creates a Draft or Pending Approval journal entry.
     *
     * @param  array<int, array<string, mixed>>  $lines
     */
    public function createJournal(
        string $date,
        string $description,
        array $lines,
        User $actor,
        string $journalType = 'General',
        string $initialStatus = FinanceJournal::STATUS_DRAFT,
        ?string $sourceType = null,
        ?string $sourceId = null
    ): FinanceJournal {
        $period = $this->resolveOpenPeriod($date);
        $totals = $this->validateLines($lines);

        return DB::transaction(function () use (
            $date,
            $description,
            $lines,
            $actor,
            $journalType,
            $initialStatus,
            $sourceType,
            $sourceId,
            $period,
            $totals
        ): FinanceJournal {
            $journal = FinanceJournal::create([
                'journal_no' => $this->nextJournalNumber($date),
                'period_id' => $period->id,
                'journal_date' => Carbon::parse($date)->format('Y-m-d'),
                'journal_type' => $journalType,
                'source_type' => $sourceType,
                'source_id' => $sourceId,
                'description' => $description,
                'currency' => 'IDR',
                'exchange_rate' => 1,
                'total_debit' => $totals['total_debit'],
                'total_credit' => $totals['total_credit'],
                'status' => $initialStatus,
                'created_by' => $actor->id,
            ]);

            foreach ($lines as $i => $line) {
                FinanceJournalLine::create([
                    'journal_id' => $journal->id,
                    'line_no' => $i + 1,
                    'account_id' => $line['account_id'],
                    'description' => $line['description'] ?? $description,
                    'debit' => round((float) ($line['debit'] ?? 0), 2),
                    'credit' => round((float) ($line['credit'] ?? 0), 2),
                    'company_id' => $line['company_id'] ?? null,
                    'project_id' => $line['project_id'] ?? null,
                    'user_id' => $line['user_id'] ?? null,
                ]);
            }

            return $journal->load('lines.account');
        });
    }

    /**
     * Atomically posts a journal entry with concurrency locking and period verification.
     */
    public function postJournal(FinanceJournal $journal, User $actor): FinanceJournal
    {
        return DB::transaction(function () use ($journal, $actor): FinanceJournal {
            /** @var FinanceJournal $locked */
            $locked = FinanceJournal::query()->whereKey($journal->id)->lockForUpdate()->firstOrFail();

            if ($locked->status === FinanceJournal::STATUS_POSTED) {
                throw ValidationException::withMessages([
                    'journal' => "Journal {$locked->journal_no} is already posted.",
                ]);
            }

            if (in_array($locked->status, [FinanceJournal::STATUS_REVERSED, FinanceJournal::STATUS_CANCELLED], true)) {
                throw ValidationException::withMessages([
                    'journal' => "Cannot post a {$locked->status} journal.",
                ]);
            }

            if ($locked->journal_type === 'Adjusting' && ! $actor->isManagingDirector() && $locked->approved_by === null) {
                throw ValidationException::withMessages([
                    'journal' => 'Adjusting journal entries require Founder approval before posting.',
                ]);
            }

            $period = $this->resolveOpenPeriod($locked->journal_date->format('Y-m-d'));
            $lines = $locked->lines()->get();
            $this->validateLines($lines->map(fn ($l) => [
                'account_id' => $l->account_id,
                'debit' => $l->debit,
                'credit' => $l->credit,
            ])->all());

            $locked->update([
                'period_id' => $period->id,
                'status' => FinanceJournal::STATUS_POSTED,
                'posted_by' => $actor->id,
                'posted_at' => now(),
            ]);

            foreach ($lines as $line) {
                $this->applyLineToAccountBalance($period->id, $line->account_id, (float) $line->debit, (float) $line->credit);
            }

            $this->audit->log(
                'finance.journal_posted',
                "Posted journal {$locked->journal_no} ({$locked->total_debit} IDR).",
                $locked,
                null,
                ['journal_no' => $locked->journal_no, 'total_debit' => $locked->total_debit],
                $actor->id
            );

            return $locked->fresh(['lines.account', 'period']);
        });
    }

    /**
     * Convenience helper for system-generated journals from previously authorized source transactions.
     *
     * @param  array<int, array<string, mixed>>  $lines
     */
    public function createAndPostSystemJournal(
        string $date,
        string $description,
        array $lines,
        User $actor,
        string $sourceType,
        string $sourceId
    ): FinanceJournal {
        $existing = FinanceJournal::query()
            ->where('source_type', $sourceType)
            ->where('source_id', $sourceId)
            ->where('status', FinanceJournal::STATUS_POSTED)
            ->first();

        if ($existing) {
            return $existing;
        }

        $journal = $this->createJournal(
            $date,
            $description,
            $lines,
            $actor,
            'System',
            FinanceJournal::STATUS_APPROVED,
            $sourceType,
            $sourceId
        );

        return $this->postJournal($journal, $actor);
    }

    /**
     * Reverses a posted journal by creating an immutable opposite journal.
     */
    public function reverseJournal(FinanceJournal $journal, User $actor, string $reason): FinanceJournal
    {
        return DB::transaction(function () use ($journal, $actor, $reason): FinanceJournal {
            /** @var FinanceJournal $locked */
            $locked = FinanceJournal::query()->whereKey($journal->id)->lockForUpdate()->firstOrFail();

            if ($locked->status !== FinanceJournal::STATUS_POSTED) {
                throw ValidationException::withMessages([
                    'journal' => 'Only posted journals can be reversed.',
                ]);
            }

            if (FinanceJournalReversal::query()->where('original_journal_id', $locked->id)->exists()) {
                throw ValidationException::withMessages([
                    'journal' => "Journal {$locked->journal_no} has already been reversed.",
                ]);
            }

            $reversalDate = now()->format('Y-m-d');
            $period = $this->resolveOpenPeriod($reversalDate);

            $lines = $locked->lines()->get()->map(fn (FinanceJournalLine $l) => [
                'account_id' => $l->account_id,
                'description' => "Reversal of {$locked->journal_no}: {$l->description}",
                'debit' => (float) $l->credit,
                'credit' => (float) $l->debit,
                'company_id' => $l->company_id,
                'project_id' => $l->project_id,
                'user_id' => $l->user_id,
            ])->all();

            $reversal = $this->createJournal(
                $reversalDate,
                "Reversal of {$locked->journal_no} — {$reason}",
                $lines,
                $actor,
                'Reversal',
                FinanceJournal::STATUS_APPROVED,
                'FinanceJournalReversal',
                $locked->id
            );

            $reversal = $this->postJournal($reversal, $actor);

            $locked->update([
                'status' => FinanceJournal::STATUS_REVERSED,
                'reversed_by_journal_id' => $reversal->id,
            ]);

            FinanceJournalReversal::create([
                'original_journal_id' => $locked->id,
                'reversal_journal_id' => $reversal->id,
                'reason' => $reason,
                'reversed_by' => $actor->id,
                'reversed_at' => now(),
            ]);

            $this->audit->log(
                'finance.journal_reversed',
                "Reversed journal {$locked->journal_no} via {$reversal->journal_no}. Reason: {$reason}",
                $locked,
                ['status' => FinanceJournal::STATUS_POSTED],
                ['status' => FinanceJournal::STATUS_REVERSED, 'reversal_journal_no' => $reversal->journal_no],
                $actor->id
            );

            return $reversal;
        });
    }

    private function applyLineToAccountBalance(string $periodId, string $accountId, float $debit, float $credit): void
    {
        $bal = FinanceAccountBalance::firstOrCreate(
            ['period_id' => $periodId, 'account_id' => $accountId],
            [
                'opening_debit' => 0,
                'opening_credit' => 0,
                'period_debit' => 0,
                'period_credit' => 0,
                'closing_debit' => 0,
                'closing_credit' => 0,
            ]
        );

        $newPeriodDebit = round((float) $bal->period_debit + $debit, 2);
        $newPeriodCredit = round((float) $bal->period_credit + $credit, 2);

        $bal->update([
            'period_debit' => $newPeriodDebit,
            'period_credit' => $newPeriodCredit,
            'closing_debit' => round((float) $bal->opening_debit + $newPeriodDebit, 2),
            'closing_credit' => round((float) $bal->opening_credit + $newPeriodCredit, 2),
        ]);
    }
}
