<?php

namespace App\Domain\Finance\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FinanceSubscriptionInvoice extends Model
{
    use HasUuids;

    protected $fillable = [
        'subscription_id',
        'invoice_id',
        'billing_period_start',
        'billing_period_end',
    ];

    protected function casts(): array
    {
        return [
            'billing_period_start' => 'date',
            'billing_period_end' => 'date',
        ];
    }

    public function subscription(): BelongsTo
    {
        return $this->belongsTo(FinanceSubscription::class, 'subscription_id');
    }

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }
}
