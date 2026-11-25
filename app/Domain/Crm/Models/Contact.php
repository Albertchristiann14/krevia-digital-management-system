<?php

namespace App\Domain\Crm\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Contact extends Model
{
    protected $fillable = [
        'company_id',
        'name',
        'role_title',
        'email',
        'phone',
        'is_decision_maker',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'is_decision_maker' => 'boolean',
        ];
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }
}
