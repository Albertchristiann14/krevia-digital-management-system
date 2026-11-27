<?php

namespace App\Domain\VirtualOffice\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class OfficeMessage extends Model
{
    use SoftDeletes;

    public const SCOPES = ['zone', 'dm', 'room'];

    public const ALLOWED_REACTIONS = ['👍', '❤️', '🔥', '👏', '😂', '👀'];

    protected $table = 'office_messages';

    protected $fillable = [
        'scope',
        'zone_id',
        'room_id',
        'recipient_id',
        'sender_id',
        'body',
        'attachments',
        'reactions',
        'reply_to_id',
        'is_urgent',
        'edited_at',
    ];

    protected function casts(): array
    {
        return [
            'attachments' => 'array',
            'reactions' => 'array',
            'is_urgent' => 'boolean',
            'edited_at' => 'datetime',
        ];
    }

    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sender_id');
    }

    public function recipient(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recipient_id');
    }

    public function zone(): BelongsTo
    {
        return $this->belongsTo(OfficeZone::class, 'zone_id');
    }

    public function replyTo(): BelongsTo
    {
        return $this->belongsTo(self::class, 'reply_to_id');
    }

    public function reads(): HasMany
    {
        return $this->hasMany(OfficeMessageRead::class, 'message_id');
    }
}
