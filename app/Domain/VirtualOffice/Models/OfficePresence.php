<?php

namespace App\Domain\VirtualOffice\Models;

use App\Domain\Workplan\Models\Task;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OfficePresence extends Model
{
    public const STATUSES = ['online', 'available', 'busy', 'away', 'dnd', 'offline'];

    public const HEARTBEAT_TIMEOUT_SECONDS = 90;

    public const IDLE_AWAY_SECONDS = 300; // 5 minutes

    protected $table = 'office_presence';

    protected $fillable = [
        'user_id',
        'status',
        'custom_status_text',
        'custom_status_emoji',
        'custom_status_expires_at',
        'zone_id',
        'seat_id',
        'pos_x',
        'pos_y',
        'pos_z',
        'current_task_id',
        'hide_current_task',
        'active_sessions_count',
        'last_seen_at',
        'last_activity_at',
    ];

    protected function casts(): array
    {
        return [
            'pos_x' => 'float',
            'pos_y' => 'float',
            'pos_z' => 'float',
            'hide_current_task' => 'boolean',
            'active_sessions_count' => 'integer',
            'custom_status_expires_at' => 'datetime',
            'last_seen_at' => 'datetime',
            'last_activity_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function zone(): BelongsTo
    {
        return $this->belongsTo(OfficeZone::class, 'zone_id');
    }

    public function seat(): BelongsTo
    {
        return $this->belongsTo(OfficeSeat::class, 'seat_id');
    }

    public function currentTask(): BelongsTo
    {
        return $this->belongsTo(Task::class, 'current_task_id');
    }

    public function effectiveStatus(): string
    {
        if ($this->status === 'offline' || ! $this->last_seen_at) {
            return 'offline';
        }

        if ($this->last_seen_at->lt(now()->subSeconds(self::HEARTBEAT_TIMEOUT_SECONDS))) {
            return 'offline';
        }

        if (
            in_array($this->status, ['online', 'available'], true)
            && $this->last_activity_at
            && $this->last_activity_at->lt(now()->subSeconds(self::IDLE_AWAY_SECONDS))
        ) {
            return 'away';
        }

        return $this->status;
    }

    public function activeCustomStatusText(): ?string
    {
        if (! $this->custom_status_text) {
            return null;
        }
        if ($this->custom_status_expires_at && $this->custom_status_expires_at->isPast()) {
            return null;
        }

        return $this->custom_status_text;
    }
}
