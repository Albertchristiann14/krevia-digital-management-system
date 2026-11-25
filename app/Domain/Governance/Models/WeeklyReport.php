<?php

namespace App\Domain\Governance\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WeeklyReport extends Model
{
    protected $fillable = [
        'user_id',
        'week_start_date',
        'week_label',
        'completed_tasks_summary',
        'in_progress_summary',
        'blockers_summary',
        'next_week_plan',
        'submitted_at',
    ];

    protected function casts(): array
    {
        return [
            'week_start_date' => 'date',
            'submitted_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
