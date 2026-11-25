<?php

namespace App\Domain\Project\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Requirement extends Model
{
    protected $fillable = [
        'project_id',
        'code',
        'title',
        'description',
        'priority',
        'status',
        'client_approved_at',
        'approved_by_client_name',
    ];

    protected function casts(): array
    {
        return [
            'client_approved_at' => 'datetime',
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function acceptanceCriteria(): HasMany
    {
        return $this->hasMany(AcceptanceCriterion::class);
    }
}
