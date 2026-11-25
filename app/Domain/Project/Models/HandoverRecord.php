<?php

namespace App\Domain\Project\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HandoverRecord extends Model
{
    protected $fillable = [
        'project_id',
        'handover_date',
        'trained_users_summary',
        'access_transferred',
        'guide_delivered',
        'signed_by_client',
        'recorded_by',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'handover_date' => 'date',
            'access_transferred' => 'boolean',
            'guide_delivered' => 'boolean',
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function recorder(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }
}
