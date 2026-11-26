<?php

namespace App\Http\Controllers;

use App\Domain\Workspace\Models\AuditLog;
use App\Domain\Workspace\Services\AuditLogger;
use App\Services\Identity\DigitalIdentityService;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class MyAccountController extends Controller
{
    public const DEFAULT_NOTIFICATION_PREFS = [
        'channels' => [
            'in_app' => true,
            'whatsapp' => true,
            'email' => true,
        ],
        'categories' => [
            'task_assignment' => true,
            'task_deadline_reminder' => true,
            'task_status_updates' => true,
            'task_comments' => true,
            'project_updates' => true,
            'announcements' => true,
            'general_system' => true,
        ],
    ];

    public const DEFAULT_PERSONAL_PREFS = [
        'theme' => 'light',
        'language' => 'en',
        'timezone' => 'Asia/Jakarta',
        'date_format' => 'DD/MM/YYYY',
        'compact_mode' => 'comfortable',
    ];

    public function index(Request $request): Response
    {
        $user = $request->user()->loadMissing([
            'roles:id,name',
            'employeeProfile.department:id,code,name,color_hex',
            'employeeProfile.position:id,code,title,level',
        ]);
        $profile = $user->employeeProfile;

        // Active sessions (when database session driver is active, otherwise current session summary)
        $sessionDriver = config('session.driver');
        $currentSessionId = $request->session()->getId();
        $sessions = [];

        if ($sessionDriver === 'database' && Schema::hasTable(config('session.table', 'sessions'))) {
            $sessions = DB::table(config('session.table', 'sessions'))
                ->where('user_id', $user->id)
                ->orderByDesc('last_activity')
                ->get(['id', 'ip_address', 'user_agent', 'last_activity'])
                ->map(fn ($s) => [
                    'id' => substr(hash('sha256', (string) $s->id), 0, 12),
                    'ip_address' => $s->ip_address,
                    'agent' => $this->parseUserAgent((string) $s->user_agent),
                    'last_activity' => Carbon::createFromTimestamp($s->last_activity)->diffForHumans(),
                    'is_current' => $s->id === $currentSessionId,
                ])
                ->values()
                ->all();
        } else {
            $sessions = [[
                'id' => 'current',
                'ip_address' => $request->ip(),
                'agent' => $this->parseUserAgent((string) $request->userAgent()),
                'last_activity' => 'Active now',
                'is_current' => true,
            ]];
        }

        // Personal Activity History strictly isolated to authenticated user
        $module = $request->string('module', 'all')->toString();
        $dateFrom = $request->string('date_from')->toString();

        $activityQuery = AuditLog::query()
            ->where('user_id', $user->id)
            ->latest('created_at')
            ->latest('id');

        if ($module !== 'all') {
            match ($module) {
                'tasks' => $activityQuery->where('event', 'like', 'task%'),
                'projects' => $activityQuery->where('event', 'like', 'project%'),
                'documents' => $activityQuery->where('event', 'like', 'document%'),
                'account' => $activityQuery->where(function ($q) {
                    $q->where('event', 'like', 'auth.%')->orWhere('event', 'like', 'account.%');
                }),
                default => null,
            };
        }

        if ($dateFrom !== '') {
            $activityQuery->whereDate('created_at', '>=', $dateFrom);
        }

        $activities = $activityQuery->paginate(15)->withQueryString()->through(fn (AuditLog $log) => [
            'id' => $log->id,
            'event' => $log->event,
            'module' => $this->resolveModuleLabel($log->event),
            'title' => $this->resolveActivityTitle($log->event),
            'description' => $log->summary,
            'related_type' => $log->auditable_type ? class_basename($log->auditable_type) : null,
            'created_at' => $log->created_at?->format('Y-m-d H:i:s'),
            'date_group' => $this->resolveDateGroup($log->created_at),
        ]);

        $savedNotif = $user->notification_preferences ?? [];
        $notifPrefs = [
            'channels' => [
                'in_app' => (bool) ($savedNotif['channels']['in_app'] ?? true),
                'whatsapp' => (bool) ($savedNotif['channels']['whatsapp'] ?? ($profile?->notify_via_whatsapp ?? true)),
                'email' => (bool) ($savedNotif['channels']['email'] ?? ($profile?->notify_via_email ?? true)),
            ],
            'categories' => array_merge(
                self::DEFAULT_NOTIFICATION_PREFS['categories'],
                is_array($savedNotif['categories'] ?? null) ? $savedNotif['categories'] : []
            ),
        ];

        $personalPrefs = array_merge(
            self::DEFAULT_PERSONAL_PREFS,
            is_array($user->preferences) ? $user->preferences : []
        );

        $digitalIdentity = app(DigitalIdentityService::class)->ensureForUser($user);

        return Inertia::render('MyAccount/Index', [
            'initialTab' => $request->string('tab', 'personal')->toString(),
            'account' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'email_verified' => $user->email_verified_at !== null,
                'avatar_url' => $user->avatarUrl(),
                'avatar_color' => $profile?->avatar_color ?? '#101D35',
                'whatsapp_number' => $profile?->whatsapp_number,
                'is_active' => (bool) $user->is_active,
                'must_change_password' => (bool) $user->must_change_password,
                'password_updated_at' => $user->password_updated_at?->format('Y-m-d H:i'),
                'last_login_at' => $user->last_login_at?->format('Y-m-d H:i'),
                'last_login_ip' => $user->last_login_ip,
                'roles' => $user->getRoleNames()->values()->all(),
            ],
            'organizationIdentity' => [
                'employee_code' => $profile?->employee_code ?? '—',
                'position' => $profile?->position?->title ?? '—',
                'position_level' => $profile?->position?->level ?? null,
                'department' => $profile?->department?->name ?? '—',
                'department_color' => $profile?->department?->color_hex ?? '#101D35',
                'employment_status' => $profile?->employment_status ?? 'Active',
                'joined_at' => $profile?->joined_at?->format('Y-m-d'),
                'account_status' => $user->is_active ? 'Active' : 'Inactive',
            ],
            'digitalIdentity' => $digitalIdentity ? [
                'status' => $digitalIdentity->status,
                'public_url' => $digitalIdentity->publicUrl(),
                'regenerated_at' => $digitalIdentity->regenerated_at?->format('Y-m-d H:i'),
                'created_at' => $digitalIdentity->created_at?->format('Y-m-d H:i'),
            ] : null,
            'publicVisibility' => $user->publicVisibility(),
            'sessions' => $sessions,
            'sessionDriver' => $sessionDriver,
            'notificationPreferences' => $notifPrefs,
            'personalPreferences' => $personalPrefs,
            'activities' => $activities,
            'activityFilters' => [
                'module' => $module,
                'date_from' => $dateFrom,
            ],
        ]);
    }

    public function updateProfile(Request $request, AuditLogger $audit): RedirectResponse
    {
        $user = $request->user();

        $data = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'email' => ['required', 'string', 'email', 'max:180', Rule::unique('users', 'email')->ignore($user->id)],
            'whatsapp_number' => ['nullable', 'string', 'max:30', 'regex:/^[0-9+\-\s()]{8,25}$/'],
        ], [
            'whatsapp_number.regex' => 'Format nomor WhatsApp tidak valid (gunakan angka Indonesia misal 0812... atau +62812...).',
        ]);

        $normalizedWa = $this->normalizeIndonesianPhone($data['whatsapp_number'] ?? null);
        $old = [
            'name' => $user->name,
            'email' => $user->email,
            'whatsapp_number' => $user->employeeProfile?->whatsapp_number,
        ];

        $emailChanged = $data['email'] !== $user->email;
        $user->update([
            'name' => trim($data['name']),
            'email' => strtolower(trim($data['email'])),
            'email_verified_at' => $emailChanged ? null : $user->email_verified_at,
        ]);

        if ($user->employeeProfile) {
            $user->employeeProfile->update([
                'whatsapp_number' => $normalizedWa,
            ]);
        }

        $audit->log(
            'account.profile_updated',
            "User {$user->name} updated personal profile information.",
            $user,
            $old,
            ['name' => $user->name, 'email' => $user->email, 'whatsapp_number' => $normalizedWa]
        );

        return back()->with('success', 'Personal information updated.');
    }

    public function uploadAvatar(Request $request, AuditLogger $audit): RedirectResponse
    {
        $request->validate([
            'avatar' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
        ]);

        $user = $request->user();
        $file = $request->file('avatar');
        $ext = strtolower($file->getClientOriginalExtension() ?: 'png');
        $filename = sprintf('user-%d-%s.%s', $user->id, Str::uuid()->toString(), $ext);

        $path = Storage::disk('public')->putFileAs('avatars', $file, $filename);

        if ($user->avatar_path && Storage::disk('public')->exists($user->avatar_path)) {
            Storage::disk('public')->delete($user->avatar_path);
        }

        $user->update(['avatar_path' => $path]);

        $audit->log('account.avatar_updated', "User {$user->name} updated profile photo.", $user);

        return back()->with('success', 'Profile photo updated.');
    }

    public function removeAvatar(Request $request, AuditLogger $audit): RedirectResponse
    {
        $user = $request->user();

        if ($user->avatar_path && Storage::disk('public')->exists($user->avatar_path)) {
            Storage::disk('public')->delete($user->avatar_path);
        }

        $user->update(['avatar_path' => null]);

        $audit->log('account.avatar_removed', "User {$user->name} removed profile photo.", $user);

        return back()->with('success', 'Profile photo removed.');
    }

    public function updatePassword(Request $request, AuditLogger $audit): RedirectResponse
    {
        $user = $request->user();

        $data = $request->validate([
            'current_password' => ['required', 'current_password'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $user->update([
            'password' => $data['password'],
            'must_change_password' => false,
            'password_updated_at' => now(),
        ]);

        $audit->log('auth.password_changed', "User {$user->name} changed their own password.", $user);

        return back()->with('success', 'Password updated successfully.');
    }

    public function destroyOtherSessions(Request $request, AuditLogger $audit): RedirectResponse
    {
        $user = $request->user();
        $currentId = $request->session()->getId();

        if (config('session.driver') === 'database' && Schema::hasTable(config('session.table', 'sessions'))) {
            DB::table(config('session.table', 'sessions'))
                ->where('user_id', $user->id)
                ->where('id', '!=', $currentId)
                ->delete();
        }

        $audit->log('account.sessions_terminated', "User {$user->name} terminated other active sessions.", $user);

        return back()->with('success', 'Other active sessions have been signed out.');
    }

    public function updateNotifications(Request $request, AuditLogger $audit): RedirectResponse
    {
        $user = $request->user();

        $data = $request->validate([
            'channels' => ['required', 'array'],
            'channels.in_app' => ['required', 'boolean'],
            'channels.whatsapp' => ['required', 'boolean'],
            'channels.email' => ['required', 'boolean'],
            'categories' => ['required', 'array'],
            'categories.task_assignment' => ['required', 'boolean'],
            'categories.task_deadline_reminder' => ['required', 'boolean'],
            'categories.task_status_updates' => ['required', 'boolean'],
            'categories.task_comments' => ['required', 'boolean'],
            'categories.project_updates' => ['required', 'boolean'],
            'categories.announcements' => ['required', 'boolean'],
            'categories.general_system' => ['required', 'boolean'],
        ]);

        $user->update(['notification_preferences' => $data]);

        if ($user->employeeProfile) {
            $user->employeeProfile->update([
                'notify_via_email' => (bool) $data['channels']['email'],
                'notify_via_whatsapp' => (bool) $data['channels']['whatsapp'],
            ]);
        }

        $audit->log('account.notifications_updated', "User {$user->name} updated notification preferences.", $user);

        return back()->with('success', 'Notification preferences saved.');
    }

    public function updatePreferences(Request $request, AuditLogger $audit): RedirectResponse
    {
        $user = $request->user();

        $data = $request->validate([
            'theme' => ['required', Rule::in(['light', 'dark', 'system'])],
            'language' => ['required', Rule::in(['id', 'en'])],
            'timezone' => ['required', Rule::in(['Asia/Jakarta', 'Asia/Makassar', 'Asia/Jayapura', 'UTC'])],
            'date_format' => ['required', Rule::in(['DD/MM/YYYY', 'YYYY-MM-DD', 'MM/DD/YYYY'])],
            'compact_mode' => ['required', Rule::in(['comfortable', 'compact'])],
        ]);

        $user->update(['preferences' => $data]);

        $audit->log('account.preferences_updated', "User {$user->name} updated personal preferences.", $user);

        return back()->with('success', 'Personal preferences saved.');
    }

    private function normalizeIndonesianPhone(?string $raw): ?string
    {
        if ($raw === null || trim($raw) === '') {
            return null;
        }

        $digits = preg_replace('/\D+/', '', $raw) ?? '';
        if ($digits === '') {
            return null;
        }

        if (str_starts_with($digits, '0')) {
            return '+62'.substr($digits, 1);
        }

        if (str_starts_with($digits, '62')) {
            return '+'.$digits;
        }

        return '+'.$digits;
    }

    private function parseUserAgent(string $ua): string
    {
        if ($ua === '') {
            return 'Unknown Device';
        }

        $browser = match (true) {
            str_contains($ua, 'Edg/') => 'Microsoft Edge',
            str_contains($ua, 'Chrome/') => 'Google Chrome',
            str_contains($ua, 'Firefox/') => 'Mozilla Firefox',
            str_contains($ua, 'Safari/') => 'Safari',
            default => 'Browser',
        };

        $os = match (true) {
            str_contains($ua, 'Windows') => 'Windows',
            str_contains($ua, 'Mac OS') => 'macOS',
            str_contains($ua, 'Android') => 'Android',
            str_contains($ua, 'iPhone') || str_contains($ua, 'iPad') => 'iOS',
            str_contains($ua, 'Linux') => 'Linux',
            default => 'Device',
        };

        return "{$browser} on {$os}";
    }

    private function resolveModuleLabel(string $event): string
    {
        return match (true) {
            str_starts_with($event, 'task') => 'Tasks',
            str_starts_with($event, 'project') => 'Projects',
            str_starts_with($event, 'document') => 'Documents',
            str_starts_with($event, 'auth.') || str_starts_with($event, 'account.') => 'Account & Security',
            str_starts_with($event, 'finance.') => 'Finance',
            str_starts_with($event, 'crm.') => 'CRM',
            default => 'System',
        };
    }

    private function resolveActivityTitle(string $event): string
    {
        return Str::headline(str_replace('.', ' ', $event));
    }

    private function resolveDateGroup(?Carbon $date): string
    {
        if (! $date) {
            return 'Earlier';
        }
        if ($date->isToday()) {
            return 'Today';
        }
        if ($date->isYesterday()) {
            return 'Yesterday';
        }

        return $date->format('d M Y');
    }
}
