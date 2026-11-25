<?php

namespace App\Domain\Workspace\Models;

use App\Domain\Project\Models\Project;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Document extends Model
{
    use SoftDeletes;

    public const CATEGORIES = [
        'SOP & Governance',
        'Proposal & Contract',
        'Technical & Architecture',
        'Client & UAT',
        'Marketing & Brand',
        'Finance & Legal',
        'Other',
    ];

    protected $fillable = [
        'code',
        'title',
        'category',
        'description',
        'project_id',
        'file_path',
        'original_filename',
        'mime_type',
        'file_size',
        'version',
        'data_status',
        'uploaded_by',
    ];

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}
