<?php

namespace App\Domain\Portfolio\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DemoCriteriaCheck extends Model
{
    protected $fillable = [
        'demo_product_id',
        'criterion_key',
        'label',
        'sort_order',
        'is_met',
        'evidence_note',
        'checked_by',
        'checked_at',
    ];

    protected function casts(): array
    {
        return [
            'is_met' => 'boolean',
            'checked_at' => 'datetime',
        ];
    }

    public function demoProduct(): BelongsTo
    {
        return $this->belongsTo(DemoProduct::class);
    }

    public function checker(): BelongsTo
    {
        return $this->belongsTo(User::class, 'checked_by');
    }
}
