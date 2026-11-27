<?php

namespace App\Domain\VirtualOffice\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OfficeStandup extends Model
{
    protected $table = 'office_standups';

    protected $fillable = [
        'standup_date',
        'user_id',
        'yesterday',
        'today',
        'blockers',
        'submitted_at',
    ];

    protected function casts(): array
    {
        return [
            'standup_date' => 'date',
            'submitted_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
