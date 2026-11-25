<?php

namespace App\Domain\Workplan\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MonthlyWorkplan extends Model
{
    protected $fillable = [
        'annual_roadmap_id',
        'task_id',
        'stage_label',
        'expected_evidence',
        'evaluation_notes',
        'sort_order',
    ];

    public function annualRoadmap(): BelongsTo
    {
        return $this->belongsTo(AnnualRoadmap::class);
    }

    public function task(): BelongsTo
    {
        return $this->belongsTo(Task::class);
    }
}
