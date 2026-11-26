<?php

namespace App\Domain\Finance\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class FinanceBankStatement extends Model
{
    use HasUuids;

    protected $fillable = [
        'cash_account_id',
        'statement_date',
        'reference_no',
        'opening_balance',
        'closing_balance',
        'status',
        'uploaded_by',
    ];

    protected function casts(): array
    {
        return [
            'statement_date' => 'date',
            'opening_balance' => 'decimal:2',
            'closing_balance' => 'decimal:2',
        ];
    }

    public function cashAccount(): BelongsTo
    {
        return $this->belongsTo(FinanceCashAccount::class, 'cash_account_id');
    }

    public function lines(): HasMany
    {
        return $this->hasMany(FinanceBankStatementLine::class, 'statement_id');
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}
