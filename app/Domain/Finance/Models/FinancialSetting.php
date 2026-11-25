<?php

namespace App\Domain\Finance\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FinancialSetting extends Model
{
    protected $fillable = [
        'opening_cash_balance',
        'opening_cash_date',
        'currency',
        'data_status',
        'confirmed_by',
        'confirmed_at',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'opening_cash_balance' => 'decimal:2',
            'opening_cash_date' => 'date',
            'confirmed_at' => 'datetime',
        ];
    }

    public function confirmer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'confirmed_by');
    }
}
