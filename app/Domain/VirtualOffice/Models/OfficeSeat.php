<?php

namespace App\Domain\VirtualOffice\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OfficeSeat extends Model
{
    public const TYPES = ['desk', 'sofa', 'meeting', 'standing'];

    protected $table = 'office_seats';

    protected $fillable = [
        'zone_id',
        'seat_key',
        'pos_x',
        'pos_y',
        'pos_z',
        'rotation',
        'type',
        'assigned_user_id',
        'is_hot_desk',
    ];

    protected function casts(): array
    {
        return [
            'pos_x' => 'float',
            'pos_y' => 'float',
            'pos_z' => 'float',
            'rotation' => 'float',
            'is_hot_desk' => 'boolean',
        ];
    }

    public function zone(): BelongsTo
    {
        return $this->belongsTo(OfficeZone::class, 'zone_id');
    }

    public function assignedUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_user_id');
    }
}
