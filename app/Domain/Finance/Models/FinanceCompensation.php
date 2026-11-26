<?php

namespace App\Domain\Finance\Models;

use App\Domain\Project\Models\Project;
use App\Domain\Workplan\Models\Task;
use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FinanceCompensation extends Model
{
    use HasUuids;

    protected $table = 'finance_compensations';

    public const TYPES = [
        'Project-Based Fee',
        'Task-Based Fee',
        'Design Fee',
        'Commission',
        'Bonus',
        'Operational Allowance',
        'Monthly Retainer',
        'Reimbursement',
    ];

    protected $fillable = [
        'compensation_no',
        'user_id',
        'project_id',
        'task_id',
        'compensation_type',
        'amount',
        'description',
        'calculation_basis',
        'supporting_document_path',
        'approval_status',
        'payment_status',
        'payment_date',
        'payment_reference',
        'cash_account_id',
        'journal_id',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'payment_date' => 'date',
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

    public function task(): BelongsTo
    {
        return $this->belongsTo(Task::class);
    }

    public function cashAccount(): BelongsTo
    {
        return $this->belongsTo(FinanceCashAccount::class, 'cash_account_id');
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
