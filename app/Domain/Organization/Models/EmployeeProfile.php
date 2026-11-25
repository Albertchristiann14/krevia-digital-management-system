<?php

namespace App\Domain\Organization\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class EmployeeProfile extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'user_id',
        'employee_code',
        'department_id',
        'position_id',
        'primary_supervisor_id',
        'secondary_supervisor_id',
        'coordination_note',
        'coordination_status',
        'focus_summary',
        'weekly_capacity_hours',
        'capacity_status',
        'employment_status',
        'whatsapp_number',
        'notification_email',
        'notify_via_email',
        'notify_via_whatsapp',
        'joined_at',
        'avatar_color',
    ];

    protected function casts(): array
    {
        return [
            'weekly_capacity_hours' => 'decimal:2',
            'joined_at' => 'date',
            'notify_via_email' => 'boolean',
            'notify_via_whatsapp' => 'boolean',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function position(): BelongsTo
    {
        return $this->belongsTo(Position::class);
    }

    public function primarySupervisor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'primary_supervisor_id');
    }

    public function secondarySupervisor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'secondary_supervisor_id');
    }
}
