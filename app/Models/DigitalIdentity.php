<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DigitalIdentity extends Model
{
    public const STATUS_ACTIVE = 'active';

    public const STATUS_INACTIVE = 'inactive';

    public const STATUS_REVOKED = 'revoked';

    protected $fillable = [
        'user_id',
        'token_hash',
        'token_encrypted',
        'status',
        'regenerated_at',
        'revoked_at',
        'last_verified_at',
    ];

    protected $hidden = [
        'token_hash',
        'token_encrypted',
    ];

    protected function casts(): array
    {
        return [
            'token_encrypted' => 'encrypted',
            'regenerated_at' => 'datetime',
            'revoked_at' => 'datetime',
            'last_verified_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function isUsable(): bool
    {
        return $this->status === self::STATUS_ACTIVE;
    }

    public function publicUrl(): ?string
    {
        if (! $this->token_encrypted) {
            return null;
        }

        return url('/id/'.$this->token_encrypted);
    }
}
