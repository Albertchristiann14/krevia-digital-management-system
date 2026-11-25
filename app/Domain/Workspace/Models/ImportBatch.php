<?php

namespace App\Domain\Workspace\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ImportBatch extends Model
{
    protected $fillable = [
        'filename',
        'mode',
        'preserve_existing',
        'summary_json',
        'imported_by',
    ];

    protected function casts(): array
    {
        return [
            'preserve_existing' => 'boolean',
            'summary_json' => 'array',
        ];
    }

    public function importer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'imported_by');
    }
}
