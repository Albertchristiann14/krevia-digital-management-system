<?php

namespace App\Domain\Marketing\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ContentMetric extends Model
{
    protected $fillable = [
        'content_item_id',
        'recorded_date',
        'reach',
        'impressions',
        'likes',
        'comments',
        'shares',
        'saves',
        'clicks',
        'inquiries_generated',
        'recorded_by',
    ];

    protected function casts(): array
    {
        return [
            'recorded_date' => 'date',
        ];
    }

    public function contentItem(): BelongsTo
    {
        return $this->belongsTo(ContentItem::class);
    }

    public function recorder(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }
}
