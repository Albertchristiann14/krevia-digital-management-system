<?php

namespace App\Domain\Finance\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class FinanceVendor extends Model
{
    use HasUuids;

    protected $fillable = [
        'code',
        'name',
        'email',
        'phone',
        'address',
        'tax_id',
        'bank_name',
        'bank_account_no',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    public function bills(): HasMany
    {
        return $this->hasMany(FinanceVendorBill::class, 'vendor_id');
    }
}
