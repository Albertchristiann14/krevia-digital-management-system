<?php

namespace App\Domain\Marketing\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ContentAsset extends Model
{
    public const TYPES = ['image', 'video', 'carousel_slide', 'document', 'link'];

    protected $fillable = [
        'content_item_id',
        'asset_type',
        'title',
        'file_path',
        'external_url',
        'mime_type',
        'file_size',
        'uploaded_by',
    ];

    public function contentItem(): BelongsTo
    {
        return $this->belongsTo(ContentItem::class);
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}
