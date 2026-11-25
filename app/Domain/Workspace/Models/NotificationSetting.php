<?php

namespace App\Domain\Workspace\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class NotificationSetting extends Model
{
    public const WHATSAPP_DRIVERS = ['log', 'fonnte', 'meta_cloud', 'webhook'];

    protected $fillable = [
        'mail_enabled',
        'smtp_host',
        'smtp_port',
        'smtp_encryption',
        'smtp_username',
        'smtp_password',
        'mail_from_address',
        'mail_from_name',
        'whatsapp_enabled',
        'whatsapp_driver',
        'whatsapp_api_url',
        'whatsapp_api_token',
        'whatsapp_sender_id',
        'whatsapp_default_group',
        'gmail_relay_address',
        'updated_by',
    ];

    protected function casts(): array
    {
        return [
            'mail_enabled' => 'boolean',
            'whatsapp_enabled' => 'boolean',
            'smtp_password' => 'encrypted',
            'whatsapp_api_token' => 'encrypted',
        ];
    }

    public static function current(): self
    {
        return static::query()->orderBy('id')->first() ?? static::create([
            'mail_enabled' => false,
            'smtp_host' => 'smtp.gmail.com',
            'smtp_port' => 587,
            'smtp_encryption' => 'tls',
            'mail_from_name' => 'Krevia Digital Management System',
            'whatsapp_enabled' => false,
            'whatsapp_driver' => 'log',
        ]);
    }

    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}
