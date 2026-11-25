<?php

namespace App\Domain\Governance\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Risk extends Model
{
    use SoftDeletes;

    public const CATEGORIES = ['Bisnis', 'Operasional', 'Teknis', 'Proyek', 'Komunikasi', 'Finansial'];

    public const STATUSES = ['Open', 'Mitigated', 'Monitoring', 'Closed'];

    public static function resolveLevel(int $score): string
    {
        return match (true) {
            $score >= 15 => 'Tinggi',
            $score >= 8 => 'Sedang',
            default => 'Rendah',
        };
    }

    protected $fillable = [
        'code',
        'category',
        'title',
        'likelihood',
        'impact',
        'score',
        'level',
        'pic_user_id',
        'mitigation_plan',
        'contingency_plan',
        'status',
        'last_reviewed_at',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'last_reviewed_at' => 'date',
        ];
    }

    public function pic(): BelongsTo
    {
        return $this->belongsTo(User::class, 'pic_user_id');
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(RiskReview::class)->latest('reviewed_at');
    }
}
