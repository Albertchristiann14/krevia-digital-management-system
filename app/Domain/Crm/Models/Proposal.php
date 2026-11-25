<?php

namespace App\Domain\Crm\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Proposal extends Model
{
    protected $fillable = [
        'lead_id',
        'code',
        'version',
        'title',
        'scope_summary',
        'estimated_hours',
        'total_value',
        'is_price_approved',
        'status',
        'sent_at',
        'created_by',
        'approved_by',
    ];

    protected function casts(): array
    {
        return [
            'total_value' => 'decimal:2',
            'is_price_approved' => 'boolean',
            'sent_at' => 'date',
        ];
    }

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
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
