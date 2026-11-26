<?php

namespace App\Domain\Finance\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class FinanceSubscriptionPlan extends Model
{
    use HasUuids;

    protected $fillable = [
        'code',
        'name',
        'service_line',
        'billing_cycle',
        'price',
        'revenue_account_id',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'price' => 'decimal:2',
            'is_active' => 'boolean',
        ];
    }

    public function revenueAccount(): BelongsTo
    {
        return $this->belongsTo(FinanceAccount::class, 'revenue_account_id');
    }

    public function subscriptions(): HasMany
    {
        return $this->hasMany(FinanceSubscription::class, 'plan_id');
    }
}
