<?php

namespace App\Domain\Portfolio\Models;

use App\Domain\Marketing\Models\ContentItem;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class DemoProduct extends Model
{
    use SoftDeletes;

    public const STATUSES = [
        'Not Started',
        'In Progress',
        'Under Review',
        'Ready to Present',
        'On Hold',
        'Archived',
    ];

    public const SERVICE_LINES = [
        'Website Development & CMS',
        'Custom Software Development',
    ];

    public const CRITERIA_DEFINITIONS = [
        'staging_bug_free' => [1, 'Staging tanpa bug kritis/tinggi'],
        'responsive_verified' => [2, 'Responsif 390 px dan 1280 px'],
        'realistic_sample_data' => [3, 'Data contoh realistis, bukan data klien'],
        'demo_script_rehearsed' => [4, 'Skenario demo 5–7 menit dilatih'],
        'asset_pack_ready' => [5, 'Paket aset dari Jihanz siap'],
        'dual_approved' => [6, 'Disetujui Aldo dan Albert'],
    ];

    public const MAX_ACTIVE_DEMOS = 2;

    protected $fillable = [
        'code',
        'name',
        'service_line',
        'purpose',
        'features_summary',
        'feature_checklist',
        'qa_checklist',
        'pic_user_id',
        'supporting_team',
        'start_date',
        'target_end_date',
        'status',
        'label_type',
        'client_permission_granted',
        'is_conditional',
        'data_status',
        'staging_url',
        'documentation_url',
        'technical_approved_by',
        'technical_approved_at',
        'commercial_approved_by',
        'commercial_approved_at',
        'is_ready_to_present',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'feature_checklist' => 'array',
            'qa_checklist' => 'array',
            'start_date' => 'date',
            'target_end_date' => 'date',
            'client_permission_granted' => 'boolean',
            'is_conditional' => 'boolean',
            'technical_approved_at' => 'datetime',
            'commercial_approved_at' => 'datetime',
            'is_ready_to_present' => 'boolean',
        ];
    }

    public function pic(): BelongsTo
    {
        return $this->belongsTo(User::class, 'pic_user_id');
    }

    public function technicalApprover(): BelongsTo
    {
        return $this->belongsTo(User::class, 'technical_approved_by');
    }

    public function commercialApprover(): BelongsTo
    {
        return $this->belongsTo(User::class, 'commercial_approved_by');
    }

    public function criteriaChecks(): HasMany
    {
        return $this->hasMany(DemoCriteriaCheck::class)->orderBy('sort_order');
    }

    public function assets(): HasMany
    {
        return $this->hasMany(DemoAsset::class)->latest('id');
    }

    public function contentItems(): HasMany
    {
        return $this->hasMany(ContentItem::class);
    }
}
