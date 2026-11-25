<?php

namespace App\Domain\Organization\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class RaciActivity extends Model
{
    protected $fillable = [
        'sort_order',
        'activity_name',
        'notes',
        'data_status',
    ];

    public function assignments(): HasMany
    {
        return $this->hasMany(RaciAssignment::class);
    }
}
