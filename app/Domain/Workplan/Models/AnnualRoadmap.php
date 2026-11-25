<?php

namespace App\Domain\Workplan\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AnnualRoadmap extends Model
{
    protected $fillable = [
        'period_month',
        'month_label',
        'phase_label',
        'primary_focus',
        'target_summary',
        'priority_work',
        'expected_output',
        'pic_user_id',
        'success_indicator',
        'target_contacts',
        'target_meetings',
        'target_proposals',
        'target_won',
        'target_status',
    ];

    protected function casts(): array
    {
        return [
            'period_month' => 'date',
            'target_contacts' => 'integer',
            'target_meetings' => 'integer',
            'target_proposals' => 'integer',
            'target_won' => 'integer',
        ];
    }

    public function pic(): BelongsTo
    {
        return $this->belongsTo(User::class, 'pic_user_id');
    }

    public function monthlyWorkplans(): HasMany
    {
        return $this->hasMany(MonthlyWorkplan::class);
    }

    public function tasks(): HasMany
    {
        return $this->hasMany(Task::class);
    }
}
