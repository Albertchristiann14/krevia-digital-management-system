<?php

namespace App\Domain\Finance\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FinanceVendorPayment extends Model
{
    use HasUuids;

    protected $fillable = [
        'payment_no',
        'vendor_bill_id',
        'cash_account_id',
        'payment_date',
        'amount',
        'payment_method',
        'reference_no',
        'approval_status',
        'journal_id',
        'recorded_by',
    ];

    protected function casts(): array
    {
        return [
            'payment_date' => 'date',
            'amount' => 'decimal:2',
        ];
    }

    public function bill(): BelongsTo
    {
        return $this->belongsTo(FinanceVendorBill::class, 'vendor_bill_id');
    }

    public function cashAccount(): BelongsTo
    {
        return $this->belongsTo(FinanceCashAccount::class, 'cash_account_id');
    }

    public function journal(): BelongsTo
    {
        return $this->belongsTo(FinanceJournal::class, 'journal_id');
    }

    public function recorder(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }
}
