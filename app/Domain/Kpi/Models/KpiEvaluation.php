<?php

namespace App\Domain\Kpi\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class KpiEvaluation extends Model
{
    public static function resolveRatingBand(float $score): string
    {
        return match (true) {
            $score >= 90 => 'Sangat baik',
            $score >= 80 => 'Baik',
            $score >= 70 => 'Cukup',
            default => 'Perlu perbaikan',
        };
    }

    protected $fillable = [
        'user_id',
        'period_type',
        'period_label',
        'total_weight',
        'total_score',
        'rating_band',
        'status',
        'evaluated_by',
        'approved_by',
        'approved_at',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'total_weight' => 'decimal:4',
            'total_score' => 'decimal:2',
            'approved_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function evaluator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'evaluated_by');
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function items(): HasMany
    {
        return $this->hasMany(KpiEvaluationItem::class);
    }
}
