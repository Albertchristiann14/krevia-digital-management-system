<?php

namespace App\Domain\Finance\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FinanceConfiguration extends Model
{
    use HasUuids;

    protected $fillable = [
        'base_currency',
        'invoice_prefix',
        'journal_prefix',
        'expense_prefix',
        'bill_prefix',
        'default_cash_account_id',
        'default_bank_account_id',
        'default_ar_account_id',
        'default_ap_account_id',
        'default_unearned_revenue_account_id',
        'default_revenue_account_id',
        'default_expense_account_id',
        'default_compensation_payable_account_id',
        'default_retained_earnings_account_id',
    ];

    public function defaultCashAccount(): BelongsTo
    {
        return $this->belongsTo(FinanceAccount::class, 'default_cash_account_id');
    }

    public function defaultBankAccount(): BelongsTo
    {
        return $this->belongsTo(FinanceAccount::class, 'default_bank_account_id');
    }

    public function defaultArAccount(): BelongsTo
    {
        return $this->belongsTo(FinanceAccount::class, 'default_ar_account_id');
    }

    public function defaultApAccount(): BelongsTo
    {
        return $this->belongsTo(FinanceAccount::class, 'default_ap_account_id');
    }

    public function defaultUnearnedRevenueAccount(): BelongsTo
    {
        return $this->belongsTo(FinanceAccount::class, 'default_unearned_revenue_account_id');
    }

    public function defaultRevenueAccount(): BelongsTo
    {
        return $this->belongsTo(FinanceAccount::class, 'default_revenue_account_id');
    }

    public function defaultExpenseAccount(): BelongsTo
    {
        return $this->belongsTo(FinanceAccount::class, 'default_expense_account_id');
    }

    public function defaultCompensationPayableAccount(): BelongsTo
    {
        return $this->belongsTo(FinanceAccount::class, 'default_compensation_payable_account_id');
    }

    public function defaultRetainedEarningsAccount(): BelongsTo
    {
        return $this->belongsTo(FinanceAccount::class, 'default_retained_earnings_account_id');
    }
}
