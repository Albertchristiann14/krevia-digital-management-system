<?php

namespace App\Domain\Organization\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RaciAssignment extends Model
{
    protected $fillable = [
        'raci_activity_id',
        'user_id',
        'raci_code',
    ];

    public function activity(): BelongsTo
    {
        return $this->belongsTo(RaciActivity::class, 'raci_activity_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
