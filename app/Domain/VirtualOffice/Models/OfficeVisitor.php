<?php

namespace App\Domain\VirtualOffice\Models;

use App\Domain\Crm\Models\Company;
use App\Domain\Crm\Models\Contact;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OfficeVisitor extends Model
{
    public const STATUSES = ['waiting', 'admitted', 'delayed', 'checked_out', 'expired'];

    public const EXPIRY_HOURS = 2;

    protected $table = 'office_visitors';

    protected $fillable = [
        'name',
        'company_name',
        'company_id',
        'contact_id',
        'purpose',
        'host_user_id',
        'zone_id',
        'status',
        'host_note',
        'checked_in_at',
        'admitted_at',
        'checked_out_at',
        'expires_at',
    ];

    protected function casts(): array
    {
        return [
            'checked_in_at' => 'datetime',
            'admitted_at' => 'datetime',
            'checked_out_at' => 'datetime',
            'expires_at' => 'datetime',
        ];
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function contact(): BelongsTo
    {
        return $this->belongsTo(Contact::class);
    }

    public function host(): BelongsTo
    {
        return $this->belongsTo(User::class, 'host_user_id');
    }

    public function zone(): BelongsTo
    {
        return $this->belongsTo(OfficeZone::class, 'zone_id');
    }
}
