<?php

namespace App\Domain\Finance\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FinanceBankStatementLine extends Model
{
    use HasUuids;

    protected $fillable = [
        'statement_id',
        'transaction_date',
        'description',
        'reference',
        'debit',
        'credit',
        'matched_journal_line_id',
        'is_reconciled',
    ];

    protected function casts(): array
    {
        return [
            'transaction_date' => 'date',
            'debit' => 'decimal:2',
            'credit' => 'decimal:2',
            'is_reconciled' => 'boolean',
        ];
    }

    public function statement(): BelongsTo
    {
        return $this->belongsTo(FinanceBankStatement::class, 'statement_id');
    }

    public function matchedJournalLine(): BelongsTo
    {
        return $this->belongsTo(FinanceJournalLine::class, 'matched_journal_line_id');
    }
}
