<?php

namespace App\Domain\Crm\Models;

use App\Domain\Project\Models\Project;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class Lead extends Model
{
    use SoftDeletes;

    public const STAGES = [
        'Lead Identified',
        'Initial Contact',
        'Responded',
        'Discovery Meeting',
        'Requirement Analysis',
        'Proposal Sent',
        'Negotiation',
        'Won',
        'Lost',
        'Follow-up Later',
    ];

    public const SERVICE_LINES = [
        'Website Development & CMS',
        'Custom Software Development',
        'Belum ditentukan',
    ];

    protected $fillable = [
        'code',
        'external_no',
        'company_id',
        'primary_contact_id',
        'potential_needs',
        'service_line',
        'source',
        'stage',
        'kanban_order',
        'pic_user_id',
        'contacted_at',
        'next_follow_up_at',
        'estimated_value',
        'discovery_meeting_at',
        'proposal_sent_at',
        'closed_at',
        'lost_reason',
        'data_status',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'contacted_at' => 'date',
            'next_follow_up_at' => 'date',
            'discovery_meeting_at' => 'date',
            'proposal_sent_at' => 'date',
            'closed_at' => 'date',
            'estimated_value' => 'decimal:2',
        ];
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function primaryContact(): BelongsTo
    {
        return $this->belongsTo(Contact::class, 'primary_contact_id');
    }

    public function pic(): BelongsTo
    {
        return $this->belongsTo(User::class, 'pic_user_id');
    }

    public function pipelineHistories(): HasMany
    {
        return $this->hasMany(PipelineHistory::class)->latest('changed_at')->latest('id');
    }

    public function interactions(): HasMany
    {
        return $this->hasMany(LeadInteraction::class)->latest('occurred_at');
    }

    public function followUps(): HasMany
    {
        return $this->hasMany(FollowUp::class)->orderBy('due_at');
    }

    public function proposals(): HasMany
    {
        return $this->hasMany(Proposal::class)->latest('id');
    }

    public function quotations(): HasMany
    {
        return $this->hasMany(Quotation::class)->latest('id');
    }

    public function project(): HasOne
    {
        return $this->hasOne(Project::class);
    }

    public function isFollowUpOverdue(): bool
    {
        if (in_array($this->stage, ['Won', 'Lost'], true) || $this->next_follow_up_at === null) {
            return false;
        }

        return $this->next_follow_up_at->lt(now()->startOfDay());
    }
}
