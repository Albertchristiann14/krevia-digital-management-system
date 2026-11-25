<?php

namespace App\Domain\Governance\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class QuarterlyReview extends Model
{
    protected $fillable = [
        'sort_order',
        'quarter_label',
        'review_focus',
        'period_range',
        'score',
        'status',
        'key_decisions',
        'action_plan',
        'reviewed_by',
    ];

    protected function casts(): array
    {
        return [
            'score' => 'decimal:2',
        ];
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
}
