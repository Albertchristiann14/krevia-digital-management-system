<?php

namespace App\Domain\Finance\Models;

use App\Domain\Project\Models\Project;
use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FinanceProjectBudget extends Model
{
    use HasUuids;

    protected $fillable = [
        'project_id',
        'contract_value',
        'approved_budget',
        'committed_amount',
        'allocated_overhead',
        'approval_status',
        'approved_by',
        'approved_at',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'contract_value' => 'decimal:2',
            'approved_budget' => 'decimal:2',
            'committed_amount' => 'decimal:2',
            'allocated_overhead' => 'decimal:2',
            'approved_at' => 'datetime',
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
}
