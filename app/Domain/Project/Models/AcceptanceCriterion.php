<?php

namespace App\Domain\Project\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AcceptanceCriterion extends Model
{
    protected $table = 'acceptance_criteria';

    protected $fillable = ['requirement_id', 'description', 'is_passed', 'verified_by', 'verified_at'];

    protected function casts(): array
    {
        return [
            'is_passed' => 'boolean',
            'verified_at' => 'datetime',
        ];
    }

    public function requirement(): BelongsTo
    {
        return $this->belongsTo(Requirement::class);
    }

    public function verifier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verified_by');
    }
}
