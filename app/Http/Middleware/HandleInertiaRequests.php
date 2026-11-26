<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    protected $rootView = 'app';

    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $user = $request->user();

        if ($user) {
            $user->loadMissing([
                'roles:id,name',
                'employeeProfile.department:id,code,name,color_hex',
                'employeeProfile.position:id,code,title,level',
            ]);
        }

        return [
            ...parent::share($request),
            'app' => [
                'name' => 'KDMS',
                'fullName' => 'Krevia Digital Management System',
                'tagline' => 'Build Smarter. Operate Better.',
                'period' => 'Dec 2026 – Dec 2027',
            ],
            'auth' => [
                'user' => $user ? [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'avatar_url' => $user->avatarUrl(),
                    'is_active' => $user->is_active,
                    'must_change_password' => (bool) $user->must_change_password,
                    'last_login_at' => $user->last_login_at?->format('Y-m-d H:i:s'),
                    'last_login_ip' => $user->last_login_ip,
                    'preferences' => $user->preferences ?? [
                        'theme' => 'light',
                        'language' => 'en',
                        'timezone' => 'Asia/Jakarta',
                        'date_format' => 'DD/MM/YYYY',
                        'compact_mode' => 'comfortable',
                    ],
                    'roles' => $user->getRoleNames()->values()->all(),
                    'permissions' => $user->getAllPermissions()->pluck('name')->values()->all(),
                    'can_manage_finance' => $user->canManageFinance(),
                    'can_manage_accounts' => $user->canManageAccounts(),
                    'profile' => $user->employeeProfile ? [
                        'id' => $user->employeeProfile->id,
                        'employee_code' => $user->employeeProfile->employee_code,
                        'avatar_color' => $user->employeeProfile->avatar_color,
                        'position' => $user->employeeProfile->position?->title,
                        'department' => $user->employeeProfile->department?->name,
                        'department_color' => $user->employeeProfile->department?->color_hex,
                        'whatsapp_number' => $user->employeeProfile->whatsapp_number,
                        'notification_email' => $user->employeeProfile->notification_email,
                    ] : null,
                ] : null,
                'unreadNotificationsCount' => $user ? $user->unreadNotifications()->count() : 0,
            ],
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
                'warning' => fn () => $request->session()->get('warning'),
            ],
        ];
    }
}
