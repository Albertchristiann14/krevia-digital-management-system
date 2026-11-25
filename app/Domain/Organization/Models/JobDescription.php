<?php

namespace App\Domain\Organization\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class JobDescription extends Model
{
    protected $fillable = [
        'position_id',
        'purpose',
        'responsibilities',
        'routine_tasks',
        'project_tasks',
        'expected_outputs',
        'success_indicators',
        'authority_limits',
        'coordination_links',
        'confirmed_at',
    ];

    protected function casts(): array
    {
        return [
            'responsibilities' => 'array',
            'routine_tasks' => 'array',
            'project_tasks' => 'array',
            'expected_outputs' => 'array',
            'success_indicators' => 'array',
            'authority_limits' => 'array',
            'coordination_links' => 'array',
            'confirmed_at' => 'datetime',
        ];
    }

    public function position(): BelongsTo
    {
        return $this->belongsTo(Position::class);
    }
}
