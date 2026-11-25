<?php

namespace App\Domain\Governance\Models;

use App\Domain\Workplan\Models\Task;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ActionItem extends Model
{
    public const STATUSES = ['Open', 'In Progress', 'Completed', 'Overdue'];

    protected $fillable = [
        'meeting_id',
        'title',
        'pic_user_id',
        'due_date',
        'evidence_note',
        'status',
        'linked_task_id',
        'completed_at',
    ];

    protected function casts(): array
    {
        return [
            'due_date' => 'date',
            'completed_at' => 'datetime',
        ];
    }

    public function meeting(): BelongsTo
    {
        return $this->belongsTo(Meeting::class);
    }

    public function pic(): BelongsTo
    {
        return $this->belongsTo(User::class, 'pic_user_id');
    }

    public function linkedTask(): BelongsTo
    {
        return $this->belongsTo(Task::class, 'linked_task_id');
    }
}
