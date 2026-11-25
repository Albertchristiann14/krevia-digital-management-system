<?php

namespace App\Domain\Organization\Models;

use App\Domain\Shared\Services\ReferenceCacheService;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class RaciActivity extends Model
{
    protected static function booted(): void
    {
        $invalidate = static fn () => app(ReferenceCacheService::class)->forgetOrganization();
        static::saved($invalidate);
        static::deleted($invalidate);
    }
    protected $fillable = [
        'sort_order',
        'activity_name',
        'notes',
        'data_status',
    ];

    public function assignments(): HasMany
    {
        return $this->hasMany(RaciAssignment::class);
    }
}
