<?php

namespace App\Domain\Portfolio\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DemoAsset extends Model
{
    public const TYPES = ['screenshot', 'demo_video', 'doc', 'asset_pack'];

    protected $fillable = [
        'demo_product_id',
        'asset_type',
        'title',
        'file_path',
        'external_url',
        'mime_type',
        'file_size',
        'uploaded_by',
    ];

    public function demoProduct(): BelongsTo
    {
        return $this->belongsTo(DemoProduct::class);
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}
