<?php

namespace App\Domain\Finance\Models;

use App\Domain\Crm\Models\Company;
use App\Domain\Project\Models\Project;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Transaction extends Model
{
    use SoftDeletes;

    public const TYPE_INCOME = 'Pendapatan diterima';

    public const TYPE_EXPENSE = 'Pengeluaran';

    public const TYPES = [self::TYPE_INCOME, self::TYPE_EXPENSE];

    public const CATEGORIES = [
        'Pendapatan Proyek',
        'Pendapatan Lainnya',
        'Infrastruktur',
        'Domain & hosting',
        'Tools & software',
        'Marketing',
        'Operasional',
        'Lain-lain',
    ];

    protected $fillable = [
        'code',
        'transaction_date',
        'period_month',
        'type',
        'description',
        'category',
        'amount',
        'budget_id',
        'invoice_id',
        'company_id',
        'project_id',
        'pic_user_id',
        'reference',
        'evidence_path',
        'notes',
        'recorded_by',
    ];

    protected function casts(): array
    {
        return [
            'transaction_date' => 'date',
            'amount' => 'decimal:2',
        ];
    }

    public function budget(): BelongsTo
    {
        return $this->belongsTo(Budget::class);
    }

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function pic(): BelongsTo
    {
        return $this->belongsTo(User::class, 'pic_user_id');
    }

    public function recorder(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }
}
