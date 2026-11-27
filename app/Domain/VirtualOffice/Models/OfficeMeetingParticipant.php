<?php

namespace App\Domain\VirtualOffice\Models;

use App\Domain\Governance\Models\Meeting;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OfficeMeetingParticipant extends Model
{
    public const RSVP_STATUSES = ['pending', 'accepted', 'maybe', 'declined'];

    protected $table = 'office_meeting_participants';

    protected $fillable = [
        'meeting_id',
        'user_id',
        'rsvp_status',
        'is_in_call',
        'joined_at',
        'left_at',
    ];

    protected function casts(): array
    {
        return [
            'is_in_call' => 'boolean',
            'joined_at' => 'datetime',
            'left_at' => 'datetime',
        ];
    }

    public function meeting(): BelongsTo
    {
        return $this->belongsTo(Meeting::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
