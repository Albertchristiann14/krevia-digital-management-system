<?php

namespace App\Domain\Finance\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class FinancePeriod extends Model
{
    use HasUuids;

    public const STATUS_OPEN = 'Open';
    public const STATUS_CLOSED = 'Closed';
    public const STATUS_LOCKED = 'Locked';

    protected $fillable = [
        'fiscal_year_id',
        'code',
        'name',
        'start_date',
        'end_date',
        'status',
        'closed_by',
        'closed_at',
        'reopened_by',
        'reopened_at',
        'reopen_reason',
    ];

    protected function casts(): array
    {
        return [
            'start_date' => 'date',
            'end_date' => 'date',
            'closed_at' => 'datetime',
            'reopened_at' => 'datetime',
        ];
    }

    public function fiscalYear(): BelongsTo
    {
        return $this->belongsTo(FinanceFiscalYear::class, 'fiscal_year_id');
    }

    public function journals(): HasMany
    {
        return $this->hasMany(FinanceJournal::class, 'period_id');
    }

    public function closer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'closed_by');
    }

    public function reopener(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reopened_by');
    }

    public function isOpen(): bool
    {
        return $this->status === self::STATUS_OPEN;
    }
}
