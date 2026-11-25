<?php

namespace App\Domain\Project\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Release extends Model
{
    protected $fillable = [
        'project_id',
        'version',
        'environment',
        'deployed_by',
        'deployed_at',
        'has_backup',
        'has_rollback_plan',
        'rollback_notes',
        'release_notes',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'deployed_at' => 'datetime',
            'has_backup' => 'boolean',
            'has_rollback_plan' => 'boolean',
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function deployer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'deployed_by');
    }
}
