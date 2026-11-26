<?php

namespace App\Domain\Finance\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FinanceRevenueRecognitionEntry extends Model
{
    use HasUuids;

    protected $fillable = [
        'schedule_id',
        'period_month',
        'recognition_date',
        'amount',
        'status',
        'journal_id',
    ];

    protected function casts(): array
    {
        return [
            'recognition_date' => 'date',
            'amount' => 'decimal:2',
        ];
    }

    public function schedule(): BelongsTo
    {
        return $this->belongsTo(FinanceRevenueSchedule::class, 'schedule_id');
    }

    public function journal(): BelongsTo
    {
        return $this->belongsTo(FinanceJournal::class, 'journal_id');
    }
}
