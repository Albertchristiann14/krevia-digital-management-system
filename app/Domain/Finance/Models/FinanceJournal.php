<?php

namespace App\Domain\Finance\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class FinanceJournal extends Model
{
    use HasUuids;

    public const STATUS_DRAFT = 'Draft';
    public const STATUS_PENDING_APPROVAL = 'Pending Approval';
    public const STATUS_APPROVED = 'Approved';
    public const STATUS_POSTED = 'Posted';
    public const STATUS_REVERSED = 'Reversed';
    public const STATUS_CANCELLED = 'Cancelled';

    protected $fillable = [
        'journal_no',
        'period_id',
        'journal_date',
        'journal_type',
        'source_type',
        'source_id',
        'description',
        'currency',
        'exchange_rate',
        'total_debit',
        'total_credit',
        'status',
        'created_by',
        'approved_by',
        'approved_at',
        'posted_by',
        'posted_at',
        'reversed_by_journal_id',
    ];

    protected function casts(): array
    {
        return [
            'journal_date' => 'date',
            'exchange_rate' => 'decimal:6',
            'total_debit' => 'decimal:2',
            'total_credit' => 'decimal:2',
            'approved_at' => 'datetime',
            'posted_at' => 'datetime',
        ];
    }

    public function period(): BelongsTo
    {
        return $this->belongsTo(FinancePeriod::class, 'period_id');
    }

    public function lines(): HasMany
    {
        return $this->hasMany(FinanceJournalLine::class, 'journal_id')->orderBy('line_no');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function poster(): BelongsTo
    {
        return $this->belongsTo(User::class, 'posted_by');
    }

    public function reversal(): HasOne
    {
        return $this->hasOne(FinanceJournalReversal::class, 'original_journal_id');
    }
}
