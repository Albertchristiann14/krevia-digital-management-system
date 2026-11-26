<?php

namespace App\Domain\Finance\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FinanceBankTransfer extends Model
{
    use HasUuids;

    protected $fillable = [
        'transfer_no',
        'from_cash_account_id',
        'to_cash_account_id',
        'transfer_date',
        'amount',
        'reference_no',
        'notes',
        'journal_id',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'transfer_date' => 'date',
            'amount' => 'decimal:2',
        ];
    }

    public function fromAccount(): BelongsTo
    {
        return $this->belongsTo(FinanceCashAccount::class, 'from_cash_account_id');
    }

    public function toAccount(): BelongsTo
    {
        return $this->belongsTo(FinanceCashAccount::class, 'to_cash_account_id');
    }

    public function journal(): BelongsTo
    {
        return $this->belongsTo(FinanceJournal::class, 'journal_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
