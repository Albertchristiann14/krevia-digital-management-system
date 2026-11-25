<?php

namespace App\Domain\Governance\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MeetingMinute extends Model
{
    protected $fillable = [
        'meeting_id',
        'recorded_by',
        'summary',
        'decisions_summary',
        'escalations',
        'submitted_at',
        'is_within_24h_sla',
    ];

    protected function casts(): array
    {
        return [
            'submitted_at' => 'datetime',
            'is_within_24h_sla' => 'boolean',
        ];
    }

    public function meeting(): BelongsTo
    {
        return $this->belongsTo(Meeting::class);
    }

    public function recorder(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }
}
