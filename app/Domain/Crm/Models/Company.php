<?php

namespace App\Domain\Crm\Models;

use App\Domain\Project\Models\Project;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Company extends Model
{
    use SoftDeletes;

    public const INDUSTRIES = [
        'Pendidikan / Sekolah',
        'Perusahaan Jasa',
        'Kontraktor & Konstruksi',
        'Distributor',
        'Retail',
        'Hotel & Perhotelan',
        'Organisasi / Lainnya',
    ];

    protected $fillable = [
        'name',
        'industry',
        'location',
        'phone',
        'email',
        'website',
        'notes',
    ];

    public function contacts(): HasMany
    {
        return $this->hasMany(Contact::class);
    }

    public function leads(): HasMany
    {
        return $this->hasMany(Lead::class);
    }

    public function projects(): HasMany
    {
        return $this->hasMany(Project::class);
    }
}
