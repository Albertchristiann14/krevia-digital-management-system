<?php

namespace App\Domain\Finance\Models;

use App\Domain\Project\Models\Project;
use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FinanceReimbursement extends Model
{
    use HasUuids;

    protected $fillable = [
        'reimbursement_no',
        'user_id',
        'project_id',
        'expense_date',
        'category',
        'description',
        'amount',
        'receipt_path',
        'approval_status',
        'payment_status',
        'expense_account_id',
        'cash_account_id',
        'journal_id',
        'paid_at',
    ];

    protected function casts(): array
    {
        return [
            'expense_date' => 'date',
            'amount' => 'decimal:2',
            'paid_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function expenseAccount(): BelongsTo
    {
        return $this->belongsTo(FinanceAccount::class, 'expense_account_id');
    }

    public function cashAccount(): BelongsTo
    {
        return $this->belongsTo(FinanceCashAccount::class, 'cash_account_id');
    }

    public function journal(): BelongsTo
    {
        return $this->belongsTo(FinanceJournal::class, 'journal_id');
    }
}
