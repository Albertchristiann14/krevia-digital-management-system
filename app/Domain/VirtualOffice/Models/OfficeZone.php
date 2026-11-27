<?php

namespace App\Domain\VirtualOffice\Models;

use App\Domain\Project\Models\Project;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class OfficeZone extends Model
{
    public const TYPES = ['reception', 'workspace', 'meeting', 'lounge', 'project'];

    protected $table = 'office_zones';

    protected $fillable = [
        'code',
        'slug',
        'name',
        'type',
        'description',
        'capacity',
        'color',
        'layout_config',
        'is_active',
        'linked_project_id',
    ];

    protected function casts(): array
    {
        return [
            'layout_config' => 'array',
            'is_active' => 'boolean',
            'capacity' => 'integer',
        ];
    }

    public function seats(): HasMany
    {
        return $this->hasMany(OfficeSeat::class, 'zone_id');
    }

    public function presences(): HasMany
    {
        return $this->hasMany(OfficePresence::class, 'zone_id');
    }

    public function linkedProject(): BelongsTo
    {
        return $this->belongsTo(Project::class, 'linked_project_id');
    }
}
