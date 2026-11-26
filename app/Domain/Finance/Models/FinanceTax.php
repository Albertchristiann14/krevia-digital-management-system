<?php

namespace App\Domain\Finance\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FinanceTax extends Model
{
    use HasUuids;

    protected $fillable = [
        'code',
        'name',
        'category',
        'rate',
        'is_inclusive',
        'effective_from',
        'effective_to',
        'payable_account_id',
        'receivable_account_id',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'rate' => 'decimal:4',
            'is_inclusive' => 'boolean',
            'effective_from' => 'date',
            'effective_to' => 'date',
            'is_active' => 'boolean',
        ];
    }

    public function payableAccount(): BelongsTo
    {
        return $this->belongsTo(FinanceAccount::class, 'payable_account_id');
    }

    public function receivableAccount(): BelongsTo
    {
        return $this->belongsTo(FinanceAccount::class, 'receivable_account_id');
    }
}
