<?php

namespace App\Domain\Finance\Models;

use App\Domain\Crm\Models\Company;
use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FinanceCreditNote extends Model
{
    use HasUuids;

    protected $fillable = [
        'credit_note_no',
        'invoice_id',
        'company_id',
        'issue_date',
        'amount',
        'reason',
        'status',
        'journal_id',
        'created_by',
        'approved_by',
    ];

    protected function casts(): array
    {
        return [
            'issue_date' => 'date',
            'amount' => 'decimal:2',
        ];
    }

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function journal(): BelongsTo
    {
        return $this->belongsTo(FinanceJournal::class, 'journal_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
}
