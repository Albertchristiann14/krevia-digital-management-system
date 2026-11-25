<?php

namespace App\Domain\Finance\Models;

use App\Domain\Crm\Models\Company;
use App\Domain\Project\Models\Project;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Invoice extends Model
{
    use SoftDeletes;

    public const STATUSES = ['Draft', 'Sent', 'Partial', 'Paid', 'Overdue', 'Void'];

    protected $fillable = [
        'invoice_no',
        'company_id',
        'project_id',
        'description',
        'issue_date',
        'due_date',
        'amount',
        'paid_amount',
        'status',
        'created_by',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'issue_date' => 'date',
            'due_date' => 'date',
            'amount' => 'decimal:2',
            'paid_amount' => 'decimal:2',
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

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function payments(): HasMany
    {
        return $this->hasMany(InvoicePayment::class)->latest('paid_at');
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(Transaction::class);
    }

    public function balanceRemaining(): float
    {
        return max(0.0, (float) $this->amount - (float) $this->paid_amount);
    }
}
