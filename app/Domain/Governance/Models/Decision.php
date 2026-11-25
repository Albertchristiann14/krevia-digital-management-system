<?php

namespace App\Domain\Governance\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Decision extends Model
{
    use SoftDeletes;

    public const STATUSES = ['Open', 'In Progress', 'Done', 'Cancelled'];

    protected $fillable = [
        'code',
        'decision_date',
        'topic_decision',
        'deadline',
        'status',
        'pic_user_id',
        'follow_up',
        'data_status',
        'approved_by',
        'approved_at',
        'source_meeting_id',
    ];

    protected function casts(): array
    {
        return [
            'decision_date' => 'date',
            'deadline' => 'date',
            'approved_at' => 'datetime',
        ];
    }

    public function pic(): BelongsTo
    {
        return $this->belongsTo(User::class, 'pic_user_id');
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function sourceMeeting(): BelongsTo
    {
        return $this->belongsTo(Meeting::class, 'source_meeting_id');
    }
}
