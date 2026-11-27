<?php

namespace App\Domain\Workplan\Models;

use App\Domain\Crm\Models\Lead;
use App\Domain\Project\Models\Project;
use App\Models\User;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class Task extends Model
{
    use SoftDeletes;

    public const STATUSES = [
        'Not Started',
        'In Progress',
        'Under Review',
        'Completed',
        'On Hold',
        'Cancelled',
    ];

    public const PRIORITIES = [
        'Tinggi',
        'Sedang',
        'Rendah',
    ];

    protected $fillable = [
        'code',
        'annual_roadmap_id',
        'project_id',
        'lead_id',
        'title',
        'description',
        'expected_result',
        'pic_user_id',
        'reviewer_user_id',
        'priority',
        'start_date',
        'deadline',
        'status',
        'progress_pct',
        'kanban_order',
        'is_blocked',
        'blocker_note',
        'blocker_reported_at',
        'notes',
        'approved_by',
        'approved_at',
        'completed_at',
    ];

    protected function casts(): array
    {
        return [
            'start_date' => 'date',
            'deadline' => 'date',
            'progress_pct' => 'integer',
            'is_blocked' => 'boolean',
            'blocker_reported_at' => 'datetime',
            'approved_at' => 'datetime',
            'completed_at' => 'datetime',
        ];
    }

    public function annualRoadmap(): BelongsTo
    {
        return $this->belongsTo(AnnualRoadmap::class);
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }

    public function monthlyWorkplan(): HasOne
    {
        return $this->hasOne(MonthlyWorkplan::class);
    }

    public function pic(): BelongsTo
    {
        return $this->belongsTo(User::class, 'pic_user_id');
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewer_user_id');
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function subtasks(): HasMany
    {
        return $this->hasMany(Subtask::class)->orderBy('sort_order')->orderBy('id');
    }

    public function dependencies(): BelongsToMany
    {
        return $this->belongsToMany(
            Task::class,
            'task_dependencies',
            'task_id',
            'depends_on_task_id'
        )->withTimestamps();
    }

    public function dependents(): BelongsToMany
    {
        return $this->belongsToMany(
            Task::class,
            'task_dependencies',
            'depends_on_task_id',
            'task_id'
        )->withTimestamps();
    }

    public function comments(): HasMany
    {
        return $this->hasMany(TaskComment::class)->latest('id');
    }

    public function evidences(): HasMany
    {
        return $this->hasMany(TaskEvidence::class)->latest('id');
    }

    public function statusHistories(): HasMany
    {
        return $this->hasMany(TaskStatusHistory::class)->latest('id');
    }

    public function isClosed(): bool
    {
        return in_array($this->status, ['Completed', 'Cancelled'], true);
    }

    public function isOverdue(?CarbonInterface $referenceDate = null): bool
    {
        if ($this->isClosed() || $this->deadline === null) {
            return false;
        }

        $today = ($referenceDate ?? now())->startOfDay();

        return $this->deadline->lt($today);
    }

    public function isDueSoon(?CarbonInterface $referenceDate = null): bool
    {
        if ($this->isClosed() || $this->deadline === null || $this->isOverdue($referenceDate)) {
            return false;
        }

        $today = ($referenceDate ?? now())->startOfDay();

        return $this->deadline->lte($today->copy()->addDays(3));
    }

    public function deadlineStatus(?CarbonInterface $referenceDate = null): string
    {
        if ($this->isOverdue($referenceDate)) {
            return 'Terlambat';
        }
        if ($this->isDueSoon($referenceDate)) {
            return 'Segera';
        }

        return '';
    }
}
