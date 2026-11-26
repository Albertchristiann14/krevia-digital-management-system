<?php

namespace App\Domain\Finance\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FinanceCashAccount extends Model
{
    use HasUuids;

    protected $fillable = [
        'code',
        'name',
        'account_type',
        'bank_name',
        'account_number',
        'gl_account_id',
        'currency',
        'opening_balance',
        'current_balance',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'opening_balance' => 'decimal:2',
            'current_balance' => 'decimal:2',
            'is_active' => 'boolean',
        ];
    }

    public function glAccount(): BelongsTo
    {
        return $this->belongsTo(FinanceAccount::class, 'gl_account_id');
    }
}
