<?php

namespace App\Domain\Finance\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FinanceJournalReversal extends Model
{
    use HasUuids;

    protected $fillable = [
        'original_journal_id',
        'reversal_journal_id',
        'reason',
        'reversed_by',
        'reversed_at',
    ];

    protected function casts(): array
    {
        return [
            'reversed_at' => 'datetime',
        ];
    }

    public function originalJournal(): BelongsTo
    {
        return $this->belongsTo(FinanceJournal::class, 'original_journal_id');
    }

    public function reversalJournal(): BelongsTo
    {
        return $this->belongsTo(FinanceJournal::class, 'reversal_journal_id');
    }

    public function reverser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reversed_by');
    }
}
