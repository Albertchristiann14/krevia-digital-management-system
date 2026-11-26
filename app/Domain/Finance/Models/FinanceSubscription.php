<?php

namespace App\Domain\Finance\Models;

use App\Domain\Crm\Models\Company;
use App\Domain\Project\Models\Project;
use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class FinanceSubscription extends Model
{
    use HasUuids;

    public const STATUSES = ['Trial', 'Active', 'Past Due', 'Suspended', 'Cancelled', 'Expired'];

    protected $fillable = [
        'subscription_no',
        'company_id',
        'plan_id',
        'project_id',
        'start_date',
        'next_billing_date',
        'end_date',
        'status',
        'auto_renew',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'start_date' => 'date',
            'next_billing_date' => 'date',
            'end_date' => 'date',
            'auto_renew' => 'boolean',
        ];
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function plan(): BelongsTo
    {
        return $this->belongsTo(FinanceSubscriptionPlan::class, 'plan_id');
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function subscriptionInvoices(): HasMany
    {
        return $this->hasMany(FinanceSubscriptionInvoice::class, 'subscription_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
