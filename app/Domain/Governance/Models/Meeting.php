<?php

namespace App\Domain\Governance\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class Meeting extends Model
{
    use SoftDeletes;

    public const STATUSES = ['Planned', 'Agenda Ready', 'Completed', 'Cancelled'];

    protected $fillable = [
        'code',
        'forum_id',
        'forum_name',
        'focus',
        'scheduled_date',
        'scheduled_time',
        'status',
        'pic_user_id',
        'agenda',
        'agenda_sent_at',
        'participants_list',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'scheduled_date' => 'date',
            'agenda_sent_at' => 'datetime',
        ];
    }

    public function forum(): BelongsTo
    {
        return $this->belongsTo(MeetingForum::class, 'forum_id');
    }

    public function pic(): BelongsTo
    {
        return $this->belongsTo(User::class, 'pic_user_id');
    }

    public function minute(): HasOne
    {
        return $this->hasOne(MeetingMinute::class);
    }

    public function actionItems(): HasMany
    {
        return $this->hasMany(ActionItem::class);
    }

    public function decisions(): HasMany
    {
        return $this->hasMany(Decision::class, 'source_meeting_id');
    }
}
