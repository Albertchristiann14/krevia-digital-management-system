<?php

namespace App\Domain\Project\Models;

use App\Domain\Crm\Models\Company;
use App\Domain\Crm\Models\Contact;
use App\Domain\Crm\Models\Lead;
use App\Domain\Workplan\Models\Task;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class Project extends Model
{
    use SoftDeletes;

    public const SERVICE_WEBSITE = 'Website Development & CMS';

    public const SERVICE_CUSTOM = 'Custom Software Development';

    public const STATUSES = ['Active', 'On Hold', 'Completed', 'Maintenance', 'Cancelled'];

    protected $fillable = [
        'code',
        'lead_id',
        'company_id',
        'primary_contact_id',
        'name',
        'service_line',
        'scope_summary',
        'contract_ref',
        'contract_value',
        'status',
        'start_date',
        'target_end_date',
        'actual_end_date',
        'manager_user_id',
        'tech_lead_user_id',
    ];

    protected function casts(): array
    {
        return [
            'contract_value' => 'decimal:2',
            'start_date' => 'date',
            'target_end_date' => 'date',
            'actual_end_date' => 'date',
        ];
    }

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function primaryContact(): BelongsTo
    {
        return $this->belongsTo(Contact::class, 'primary_contact_id');
    }

    public function manager(): BelongsTo
    {
        return $this->belongsTo(User::class, 'manager_user_id');
    }

    public function techLead(): BelongsTo
    {
        return $this->belongsTo(User::class, 'tech_lead_user_id');
    }

    public function members(): HasMany
    {
        return $this->hasMany(ProjectMember::class);
    }

    public function stages(): HasMany
    {
        return $this->hasMany(ProjectStage::class)->orderBy('stage_order');
    }

    public function milestones(): HasMany
    {
        return $this->hasMany(Milestone::class)->orderBy('due_date');
    }

    public function requirements(): HasMany
    {
        return $this->hasMany(Requirement::class)->orderBy('code');
    }

    public function qaReports(): HasMany
    {
        return $this->hasMany(QaReport::class)->latest('tested_at');
    }

    public function uatRecords(): HasMany
    {
        return $this->hasMany(UatRecord::class)->latest('id');
    }

    public function releases(): HasMany
    {
        return $this->hasMany(Release::class)->latest('deployed_at');
    }

    public function handoverRecord(): HasOne
    {
        return $this->hasOne(HandoverRecord::class)->latest('id');
    }

    public function maintenanceTickets(): HasMany
    {
        return $this->hasMany(MaintenanceTicket::class)->latest('id');
    }

    public function tasks(): HasMany
    {
        return $this->hasMany(Task::class);
    }
}
