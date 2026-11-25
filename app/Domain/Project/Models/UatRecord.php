<?php

namespace App\Domain\Project\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UatRecord extends Model
{
    protected $fillable = [
        'project_id',
        'title',
        'tester_name',
        'status',
        'feedback',
        'signed_off_at',
        'recorded_by',
    ];

    protected function casts(): array
    {
        return [
            'signed_off_at' => 'datetime',
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
