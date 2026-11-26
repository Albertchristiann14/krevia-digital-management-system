<?php

namespace App\Domain\Finance\Models;

use App\Domain\Project\Models\Project;
use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FinanceExpenseRequest extends Model
{
    use HasUuids;

    public const CATEGORIES = [
        'Infrastructure & Hosting',
        'Software & API',
        'Marketing & Advertising',
        'Project Development',
        'Team Compensation',
        'Office & Administration',
        'Equipment & Hardware',
        'Transportation',
        'Training & Development',
        'Other Expenses',
    ];

    protected $fillable = [
        'expense_no',
        'requester_id',
        'project_id',
        'expense_date',
        'category',
        'description',
        'amount',
        'tax_id',
        'tax_amount',
        'total_amount',
        'payment_method',
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
            'tax_amount' => 'decimal:2',
            'total_amount' => 'decimal:2',
            'paid_at' => 'datetime',
        ];
    }

    public function requester(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requester_id');
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function tax(): BelongsTo
    {
        return $this->belongsTo(FinanceTax::class, 'tax_id');
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
