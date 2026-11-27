<?php

namespace App\Models;

use App\Domain\Organization\Models\EmployeeProfile;
use App\Domain\Shared\Services\ReferenceCacheService;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, HasRoles, Notifiable, SoftDeletes;

    public const ROLE_FOUNDER = 'Founder / Managing Director';

    public const ROLE_OPERATIONS = 'Director of Operations';

    public const ROLE_CTO = 'CTO / Technology Lead';

    public const ROLE_SYSTEM_ANALYST = 'System Analyst';

    public const ROLE_BACKEND_ENGINEER = 'Backend Engineer';

    public const ROLE_TECH_CONTRIBUTOR = 'Technical Contributor';

    public const ROLE_SOCIAL_DESIGN = 'Social Media & Graphic Design';

    protected static function booted(): void
    {
        $invalidate = static fn () => app(ReferenceCacheService::class)->forgetUsers();
        static::saved($invalidate);
        static::deleted($invalidate);
        static::restored($invalidate);
    }

    protected $fillable = [
        'name',
        'email',
        'avatar_path',
        'password',
        'is_active',
        'must_change_password',
        'password_updated_at',
        'last_login_at',
        'last_login_ip',
        'notification_preferences',
        'preferences',
        'public_visibility',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'last_login_at' => 'datetime',
            'password_updated_at' => 'datetime',
            'is_active' => 'boolean',
            'must_change_password' => 'boolean',
            'password' => 'hashed',
            'notification_preferences' => 'array',
            'preferences' => 'array',
            'public_visibility' => 'array',
        ];
    }

    public function avatarUrl(): ?string
    {
        if (! $this->avatar_path) {
            return null;
        }

        $base = '/storage/'.ltrim($this->avatar_path, '/');
        $version = $this->updated_at?->timestamp;

        return $version ? "{$base}?v={$version}" : $base;
    }

    /**
     * @return array{show_email: bool, show_whatsapp: bool}
     */
    public function publicVisibility(): array
    {
        $raw = is_array($this->public_visibility) ? $this->public_visibility : [];

        return [
            'show_email' => (bool) ($raw['show_email'] ?? false),
            'show_whatsapp' => (bool) ($raw['show_whatsapp'] ?? false),
        ];
    }

    public function digitalIdentities(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(DigitalIdentity::class);
    }

    public function activeDigitalIdentity(): HasOne
    {
        return $this->hasOne(DigitalIdentity::class)
            ->whereIn('status', [DigitalIdentity::STATUS_ACTIVE, DigitalIdentity::STATUS_INACTIVE])
            ->latestOfMany('id');
    }

    public function employeeProfile(): HasOne
    {
        return $this->hasOne(EmployeeProfile::class);
    }

    public function contentItems(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(\App\Domain\Marketing\Models\ContentItem::class, 'pic_user_id');
    }

    public function isManagingDirector(): bool
    {
        return $this->hasRole(self::ROLE_FOUNDER);
    }

    public function isDirectorOfOperations(): bool
    {
        return $this->hasRole(self::ROLE_OPERATIONS);
    }

    public function isCto(): bool
    {
        return $this->hasRole(self::ROLE_CTO);
    }

    /**
     * Critical business rule (D-05): Only Albert Christian and Farizy Rahman Hidayat
     * may create, edit, or manage financial records.
     */
    public function canManageFinance(): bool
    {
        return $this->hasAnyRole([self::ROLE_FOUNDER, self::ROLE_OPERATIONS])
            && $this->hasPermissionTo('finance.manage');
    }

    /**
     * Executive governance rule: Founder, Co-Founder (Operations), and CTO
     * may add, edit login emails, activate/deactivate, set/reset passwords, and delete accounts.
     */
    public function canManageAccounts(): bool
    {
        return $this->hasAnyRole([
            self::ROLE_FOUNDER,
            self::ROLE_OPERATIONS,
            self::ROLE_CTO,
        ]);
    }

    public function routeNotificationForMail(): string
    {
        $profile = $this->relationLoaded('employeeProfile')
            ? $this->employeeProfile
            : $this->employeeProfile()->first();
        $altEmail = $profile?->notification_email;

        return $altEmail && trim($altEmail) !== '' ? trim($altEmail) : $this->email;
    }

    public function routeNotificationForWhatsApp(): ?string
    {
        $profile = $this->relationLoaded('employeeProfile')
            ? $this->employeeProfile
            : $this->employeeProfile()->first();
        $number = $profile?->whatsapp_number;

        return $number && trim($number) !== '' ? trim($number) : null;
    }
}
