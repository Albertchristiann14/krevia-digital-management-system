<?php

namespace App\Domain\Finance\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FinanceInvoiceItem extends Model
{
    use HasUuids;

    protected $fillable = [
        'invoice_id',
        'description',
        'quantity',
        'unit_price',
        'discount_amount',
        'tax_id',
        'tax_amount',
        'line_total',
        'revenue_account_id',
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'decimal:2',
            'unit_price' => 'decimal:2',
            'discount_amount' => 'decimal:2',
            'tax_amount' => 'decimal:2',
            'line_total' => 'decimal:2',
        ];
    }

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }

    public function tax(): BelongsTo
    {
        return $this->belongsTo(FinanceTax::class, 'tax_id');
    }

    public function revenueAccount(): BelongsTo
    {
        return $this->belongsTo(FinanceAccount::class, 'revenue_account_id');
    }
}
