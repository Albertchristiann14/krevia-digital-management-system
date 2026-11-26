<?php

namespace App\Domain\Finance\Models;

use App\Domain\Crm\Models\Company;
use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class FinancePayment extends Model
{
    use HasUuids;

    protected $fillable = [
        'payment_no',
        'company_id',
        'cash_account_id',
        'payment_date',
        'amount_received',
        'unallocated_amount',
        'payment_method',
        'reference_no',
        'idempotency_key',
        'receipt_path',
        'notes',
        'journal_id',
        'recorded_by',
    ];

    protected function casts(): array
    {
        return [
            'payment_date' => 'date',
            'amount_received' => 'decimal:2',
            'unallocated_amount' => 'decimal:2',
        ];
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function cashAccount(): BelongsTo
    {
        return $this->belongsTo(FinanceCashAccount::class, 'cash_account_id');
    }

    public function allocations(): HasMany
    {
        return $this->hasMany(FinancePaymentAllocation::class, 'payment_id');
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
