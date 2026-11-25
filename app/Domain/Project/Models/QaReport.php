<?php

namespace App\Domain\Project\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class QaReport extends Model
{
    protected $fillable = [
        'project_id',
        'title',
        'environment',
        'critical_bugs',
        'high_bugs',
        'medium_bugs',
        'dod_checklist_json',
        'status',
        'tested_by',
        'approved_by',
        'tested_at',
    ];

    protected function casts(): array
    {
        return [
            'dod_checklist_json' => 'array',
            'tested_at' => 'datetime',
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function tester(): BelongsTo
    {
        return $this->belongsTo(User::class, 'tested_by');
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
}
