<?php

namespace App\Domain\VirtualOffice\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OfficeKnock extends Model
{
    public const STATUSES = ['pending', 'accepted', 'declined', 'later', 'expired'];

    public const EXPIRY_MINUTES = 2;

    public const RATE_LIMIT_PER_HOUR = 3;

    protected $table = 'office_knocks';

    protected $fillable = [
        'from_user_id',
        'to_user_id',
        'message',
        'status',
        'expires_at',
        'responded_at',
    ];

    protected function casts(): array
    {
        return [
            'expires_at' => 'datetime',
            'responded_at' => 'datetime',
        ];
    }

    public function fromUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'from_user_id');
    }

    public function toUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'to_user_id');
    }
}
