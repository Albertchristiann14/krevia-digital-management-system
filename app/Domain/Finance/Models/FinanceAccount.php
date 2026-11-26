<?php

namespace App\Domain\Finance\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class FinanceAccount extends Model
{
    use HasUuids;

    public const TYPE_ASSET = 'Asset';
    public const TYPE_LIABILITY = 'Liability';
    public const TYPE_EQUITY = 'Equity';
    public const TYPE_REVENUE = 'Revenue';
    public const TYPE_EXPENSE = 'Expense';

    public const TYPES = [
        self::TYPE_ASSET,
        self::TYPE_LIABILITY,
        self::TYPE_EQUITY,
        self::TYPE_REVENUE,
        self::TYPE_EXPENSE,
    ];

    protected $fillable = [
        'code',
        'name',
        'type',
        'normal_balance',
        'parent_id',
        'description',
        'is_posting',
        'is_active',
        'is_system',
    ];

    protected function casts(): array
    {
        return [
            'is_posting' => 'boolean',
            'is_active' => 'boolean',
            'is_system' => 'boolean',
        ];
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(self::class, 'parent_id')->orderBy('code');
    }

    public function journalLines(): HasMany
    {
        return $this->hasMany(FinanceJournalLine::class, 'account_id');
    }
}
