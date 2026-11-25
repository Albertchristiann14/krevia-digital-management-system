<?php

namespace App\Domain\Kpi\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class KpiDefinition extends Model
{
    public const PERIODS = ['Bulanan', 'Kuartalan', 'Per proyek', 'Per rilis'];

    protected $fillable = [
        'code',
        'user_id',
        'sort_order',
        'name',
        'definition',
        'target_label',
        'evaluation_period',
        'weight',
        'data_status',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'weight' => 'decimal:4',
            'is_active' => 'boolean',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function evaluationItems(): HasMany
    {
        return $this->hasMany(KpiEvaluationItem::class);
    }
}
