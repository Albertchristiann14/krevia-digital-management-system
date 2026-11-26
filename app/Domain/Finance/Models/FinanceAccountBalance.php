<?php

namespace App\Domain\Finance\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FinanceAccountBalance extends Model
{
    use HasUuids;

    protected $fillable = [
        'period_id',
        'account_id',
        'opening_debit',
        'opening_credit',
        'period_debit',
        'period_credit',
        'closing_debit',
        'closing_credit',
    ];

    protected function casts(): array
    {
        return [
            'opening_debit' => 'decimal:2',
            'opening_credit' => 'decimal:2',
            'period_debit' => 'decimal:2',
            'period_credit' => 'decimal:2',
            'closing_debit' => 'decimal:2',
            'closing_credit' => 'decimal:2',
        ];
    }

    public function period(): BelongsTo
    {
        return $this->belongsTo(FinancePeriod::class, 'period_id');
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(FinanceAccount::class, 'account_id');
    }
}
