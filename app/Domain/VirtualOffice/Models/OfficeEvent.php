<?php

namespace App\Domain\VirtualOffice\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OfficeEvent extends Model
{
    public $timestamps = false;

    protected $table = 'office_events';

    protected $fillable = [
        'type',
        'actor_id',
        'zone_id',
        'payload',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'payload' => 'array',
            'created_at' => 'datetime',
        ];
    }

    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_id');
    }

    public function zone(): BelongsTo
    {
        return $this->belongsTo(OfficeZone::class, 'zone_id');
    }
}
