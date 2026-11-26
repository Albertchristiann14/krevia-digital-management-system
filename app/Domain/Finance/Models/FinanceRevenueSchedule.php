<?php

namespace App\Domain\Finance\Models;

use App\Domain\Crm\Models\Company;
use App\Domain\Project\Models\Project;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class FinanceRevenueSchedule extends Model
{
    use HasUuids;

    protected $fillable = [
        'source_type',
        'source_id',
        'company_id',
        'project_id',
        'total_amount',
        'recognized_amount',
        'start_date',
        'end_date',
        'periods_count',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'total_amount' => 'decimal:2',
            'recognized_amount' => 'decimal:2',
            'start_date' => 'date',
            'end_date' => 'date',
        ];
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function entries(): HasMany
    {
        return $this->hasMany(FinanceRevenueRecognitionEntry::class, 'schedule_id')->orderBy('period_month');
    }
}
