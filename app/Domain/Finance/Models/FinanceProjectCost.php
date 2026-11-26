<?php

namespace App\Domain\Finance\Models;

use App\Domain\Project\Models\Project;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FinanceProjectCost extends Model
{
    use HasUuids;

    protected $fillable = [
        'project_id',
        'cost_type',
        'source_type',
        'source_id',
        'description',
        'cost_date',
        'amount',
        'is_committed',
        'journal_id',
    ];

    protected function casts(): array
    {
        return [
            'cost_date' => 'date',
            'amount' => 'decimal:2',
            'is_committed' => 'boolean',
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function journal(): BelongsTo
    {
        return $this->belongsTo(FinanceJournal::class, 'journal_id');
    }
}
