<?php

namespace App\Domain\Kpi\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class KpiEvaluationItem extends Model
{
    protected $fillable = [
        'kpi_evaluation_id',
        'kpi_definition_id',
        'actual_value',
        'score',
        'weight_snapshot',
        'weighted_score',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'score' => 'decimal:2',
            'weight_snapshot' => 'decimal:4',
            'weighted_score' => 'decimal:2',
        ];
    }

    public function evaluation(): BelongsTo
    {
        return $this->belongsTo(KpiEvaluation::class, 'kpi_evaluation_id');
    }

    public function definition(): BelongsTo
    {
        return $this->belongsTo(KpiDefinition::class, 'kpi_definition_id');
    }
}
