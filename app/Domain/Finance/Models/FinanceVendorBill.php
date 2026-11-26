<?php

namespace App\Domain\Finance\Models;

use App\Domain\Project\Models\Project;
use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class FinanceVendorBill extends Model
{
    use HasUuids;

    protected $fillable = [
        'bill_no',
        'vendor_id',
        'project_id',
        'bill_date',
        'due_date',
        'subtotal',
        'tax_amount',
        'total_amount',
        'paid_amount',
        'status',
        'expense_account_id',
        'journal_id',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'bill_date' => 'date',
            'due_date' => 'date',
            'subtotal' => 'decimal:2',
            'tax_amount' => 'decimal:2',
            'total_amount' => 'decimal:2',
            'paid_amount' => 'decimal:2',
        ];
    }

    public function vendor(): BelongsTo
    {
        return $this->belongsTo(FinanceVendor::class, 'vendor_id');
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(FinanceVendorPayment::class, 'vendor_bill_id');
    }

    public function expenseAccount(): BelongsTo
    {
        return $this->belongsTo(FinanceAccount::class, 'expense_account_id');
    }

    public function journal(): BelongsTo
    {
        return $this->belongsTo(FinanceJournal::class, 'journal_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
