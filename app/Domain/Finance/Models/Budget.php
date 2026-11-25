<?php

namespace App\Domain\Finance\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Budget extends Model
{
    public const DEFAULT_CATEGORIES = [
        'Infrastruktur',
        'Domain & hosting',
        'Tools & software',
        'Marketing',
        'Operasional',
        'Lain-lain',
    ];

    protected $fillable = [
        'fiscal_year',
        'category',
        'pic_user_id',
        'assumptions',
        'target_amount',
        'data_status',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'target_amount' => 'decimal:2',
        ];
    }

    public function pic(): BelongsTo
    {
        return $this->belongsTo(User::class, 'pic_user_id');
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(Transaction::class);
    }
}
