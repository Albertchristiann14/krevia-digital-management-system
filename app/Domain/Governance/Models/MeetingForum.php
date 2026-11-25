<?php

namespace App\Domain\Governance\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MeetingForum extends Model
{
    protected $fillable = [
        'code',
        'name',
        'purpose',
        'frequency',
        'duration',
        'participants',
        'standard_agenda',
        'required_output',
        'pic_user_id',
    ];

    public function pic(): BelongsTo
    {
        return $this->belongsTo(User::class, 'pic_user_id');
    }

    public function meetings(): HasMany
    {
        return $this->hasMany(Meeting::class, 'forum_id');
    }
}
