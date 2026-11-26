<?php

namespace App\Domain\Finance\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class FinanceFiscalYear extends Model
{
    use HasUuids;

    protected $fillable = [
        'name',
        'start_date',
        'end_date',
        'status',
        'closed_by',
        'closed_at',
    ];

    protected function casts(): array
    {
        return [
            'start_date' => 'date',
            'end_date' => 'date',
            'closed_at' => 'datetime',
        ];
    }

    public function periods(): HasMany
    {
        return $this->hasMany(FinancePeriod::class, 'fiscal_year_id')->orderBy('start_date');
    }

    public function closer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'closed_by');
    }
}
