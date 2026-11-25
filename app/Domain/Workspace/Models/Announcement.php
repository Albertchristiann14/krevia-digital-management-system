<?php

namespace App\Domain\Workspace\Models;

use App\Domain\Organization\Models\Department;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Announcement extends Model
{
    use SoftDeletes;

    public const PRIORITIES = ['Normal', 'Penting', 'Mendesak'];

    public const AUDIENCES = ['all', 'department', 'selected'];

    protected $fillable = [
        'code',
        'title',
        'body',
        'priority',
        'audience_type',
        'department_id',
        'recipient_user_ids',
        'send_email',
        'send_whatsapp',
        'send_gmail_relay',
        'published_by',
        'published_at',
        'delivery_summary',
    ];

    protected function casts(): array
    {
        return [
            'recipient_user_ids' => 'array',
            'send_email' => 'boolean',
            'send_whatsapp' => 'boolean',
            'send_gmail_relay' => 'boolean',
            'published_at' => 'datetime',
            'delivery_summary' => 'array',
        ];
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function publisher(): BelongsTo
    {
        return $this->belongsTo(User::class, 'published_by');
    }
}
