<?php

namespace App\Domain\Finance\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class FinanceApprovalRequest extends Model
{
    use HasUuids;

    public const STATUS_PENDING = 'Pending Approval';
    public const STATUS_APPROVED = 'Approved';
    public const STATUS_REJECTED = 'Rejected';
    public const STATUS_CANCELLED = 'Cancelled';

    protected $fillable = [
        'request_no',
        'request_type',
        'approvable_type',
        'approvable_id',
        'requester_id',
        'amount',
        'summary',
        'status',
        'decided_by',
        'decided_at',
        'decision_reason',
        'submitted_at',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'decided_at' => 'datetime',
            'submitted_at' => 'datetime',
        ];
    }

    public function requester(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requester_id');
    }

    public function decider(): BelongsTo
    {
        return $this->belongsTo(User::class, 'decided_by');
    }

    public function actions(): HasMany
    {
        return $this->hasMany(FinanceApprovalAction::class, 'approval_request_id')->orderBy('acted_at');
    }
}
