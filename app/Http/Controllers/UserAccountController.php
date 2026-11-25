<?php

namespace App\Http\Controllers;

use App\Domain\Organization\Models\Department;
use App\Domain\Organization\Models\EmployeeProfile;
use App\Domain\Organization\Models\Position;
use App\Domain\Shared\Services\ReferenceCacheService;
use App\Domain\Workspace\Services\AuditLogger;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class UserAccountController extends Controller
{
    public function index(Request $request, ReferenceCacheService $refs): Response
    {
        abort_unless($request->user()?->canManageAccounts(), 403);

        $users = User::withTrashed()
            ->with([
                'roles:id,name',
                'employeeProfile.department:id,name,color_hex',
                'employeeProfile.position:id,title',
            ])
            ->orderByRaw('deleted_at IS NOT NULL')
            ->orderBy('id')
            ->get()
            ->map(fn (User $u) => [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'is_active' => (bool) $u->is_active,
                'must_change_password' => (bool) $u->must_change_password,
                'password_updated_at' => $u->password_updated_at?->format('Y-m-d H:i'),
                'last_login_at' => $u->last_login_at?->format('Y-m-d H:i'),
                'deleted_at' => $u->deleted_at?->format('Y-m-d H:i'),
                'role' => $u->roles->first()?->name,
                'employee_code' => $u->employeeProfile?->employee_code,
                'department_id' => $u->employeeProfile?->department_id,
                'department' => $u->employeeProfile?->department?->name,
                'position_id' => $u->employeeProfile?->position_id,
                'position' => $u->employeeProfile?->position?->title,
                'employment_status' => $u->employeeProfile?->employment_status ?? 'Active',
                'weekly_capacity_hours' => $u->employeeProfile?->weekly_capacity_hours !== null
                    ? (float) $u->employeeProfile->weekly_capacity_hours
                    : null,
                'whatsapp_number' => $u->employeeProfile?->whatsapp_number,
                'notification_email' => $u->employeeProfile?->notification_email,
                'notify_via_email' => $u->employeeProfile?->notify_via_email ?? true,
                'notify_via_whatsapp' => $u->employeeProfile?->notify_via_whatsapp ?? true,
            ]);

        return Inertia::render('Admin/Accounts', [
            'accounts' => $users,
            'roles' => $refs->roleNames(),
            'departments' => $refs->departments()->map(fn ($d) => ['id' => $d->id, 'name' => $d->name])->values(),
            'positions' => $refs->positions()->map(fn ($p) => ['id' => $p->id, 'title' => $p->title, 'department_id' => $p->department_id])->values(),
            'isFounderOrOps' => $request->user()->isManagingDirector() || $request->user()->isDirectorOfOperations(),
        ]);
    }

    public function store(Request $request, AuditLogger $audit): RedirectResponse
    {
        $actor = $request->user();
        abort_unless($actor?->canManageAccounts(), 403);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'email' => ['required', 'string', 'email', 'max:180', Rule::unique('users', 'email')],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
            'must_change_password' => ['sometimes', 'boolean'],
            'role' => ['required', 'string', Rule::exists('roles', 'name')],
            'department_id' => ['required', 'exists:departments,id'],
            'position_id' => ['required', 'exists:positions,id'],
            'employment_status' => ['required', Rule::in(['Active', 'Part-Time', 'Probation', 'Contract'])],
            'weekly_capacity_hours' => ['nullable', 'numeric', 'min:1', 'max:80'],
            'whatsapp_number' => ['nullable', 'string', 'max:30'],
            'notification_email' => ['nullable', 'email', 'max:180'],
            'notify_via_email' => ['sometimes', 'boolean'],
            'notify_via_whatsapp' => ['sometimes', 'boolean'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        if (
            in_array($data['role'], [User::ROLE_FOUNDER, User::ROLE_OPERATIONS], true)
            && ! ($actor->isManagingDirector() || $actor->isDirectorOfOperations())
        ) {
            throw ValidationException::withMessages([
                'role' => 'Only Founder or Director of Operations may assign Founder/Finance-eligible roles (D-05).',
            ]);
        }

        $user = DB::transaction(function () use ($data, $actor, $audit): User {
            $user = User::create([
                'name' => $data['name'],
                'email' => mb_strtolower(trim($data['email'])),
                'password' => $data['password'],
                'is_active' => (bool) ($data['is_active'] ?? true),
                'must_change_password' => (bool) ($data['must_change_password'] ?? true),
                'password_updated_at' => now(),
                'email_verified_at' => now(),
            ]);

            $user->syncRoles([$data['role']]);
            app(PermissionRegistrar::class)->forgetCachedPermissions();

            $maxCodeNum = EmployeeProfile::withTrashed()
                ->where('employee_code', 'like', 'KD-%')
                ->pluck('employee_code')
                ->map(fn (string $c) => (int) str_replace('KD-', '', $c))
                ->max() ?? 0;

            EmployeeProfile::create([
                'user_id' => $user->id,
                'employee_code' => sprintf('KD-%02d', $maxCodeNum + 1),
                'department_id' => $data['department_id'],
                'position_id' => $data['position_id'],
                'employment_status' => $data['employment_status'],
                'weekly_capacity_hours' => $data['weekly_capacity_hours'] ?? null,
                'capacity_status' => isset($data['weekly_capacity_hours']) ? 'Disepakati' : 'Perlu Konfirmasi Manajemen',
                'whatsapp_number' => $this->normalizeWhatsApp($data['whatsapp_number'] ?? null),
                'notification_email' => $data['notification_email'] ?? null,
                'notify_via_email' => (bool) ($data['notify_via_email'] ?? true),
                'notify_via_whatsapp' => (bool) ($data['notify_via_whatsapp'] ?? true),
                'joined_at' => now()->toDateString(),
                'avatar_color' => '#101D35',
            ]);

            $audit->log(
                'accounts.created',
                "Created member account for {$user->name} ({$user->email}) with role {$data['role']}.",
                $user,
                null,
                ['role' => $data['role'], 'email' => $user->email],
                $actor->id
            );

            return $user;
        });

        return back()->with('success', "Member account created for {$user->name} ({$user->email}).");
    }

    public function update(Request $request, User $user, AuditLogger $audit): RedirectResponse
    {
        $actor = $request->user();
        abort_unless($actor?->canManageAccounts(), 403);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'email' => ['required', 'string', 'email', 'max:180', Rule::unique('users', 'email')->ignore($user->id)],
            'role' => ['required', 'string', Rule::exists('roles', 'name')],
            'department_id' => ['required', 'exists:departments,id'],
            'position_id' => ['required', 'exists:positions,id'],
            'employment_status' => ['required', Rule::in(['Active', 'Part-Time', 'Probation', 'Contract'])],
            'weekly_capacity_hours' => ['nullable', 'numeric', 'min:1', 'max:80'],
            'whatsapp_number' => ['nullable', 'string', 'max:30'],
            'notification_email' => ['nullable', 'email', 'max:180'],
            'notify_via_email' => ['required', 'boolean'],
            'notify_via_whatsapp' => ['required', 'boolean'],
            'is_active' => ['required', 'boolean'],
        ]);

        if ($user->id === $actor->id && ! $data['is_active']) {
            throw ValidationException::withMessages([
                'is_active' => 'You cannot deactivate your own account while signed in.',
            ]);
        }

        $currentRole = $user->roles->first()?->name;
        if (
            $data['role'] !== $currentRole
            && (in_array($data['role'], [User::ROLE_FOUNDER, User::ROLE_OPERATIONS], true) || in_array($currentRole, [User::ROLE_FOUNDER, User::ROLE_OPERATIONS], true))
            && ! ($actor->isManagingDirector() || $actor->isDirectorOfOperations())
        ) {
            throw ValidationException::withMessages([
                'role' => 'Only Founder or Director of Operations may change Founder/Finance-eligible role assignments (D-05).',
            ]);
        }

        if ($user->hasRole(User::ROLE_FOUNDER) && (! $data['is_active'] || $data['role'] !== User::ROLE_FOUNDER)) {
            $otherActiveFounders = User::role(User::ROLE_FOUNDER)
                ->where('is_active', true)
                ->where('id', '!=', $user->id)
                ->count();
            if ($otherActiveFounders === 0) {
                throw ValidationException::withMessages([
                    'is_active' => 'At least one active Founder / Managing Director account must remain.',
                ]);
            }
        }

        DB::transaction(function () use ($user, $data, $actor, $audit): void {
            $old = ['name' => $user->name, 'email' => $user->email, 'is_active' => $user->is_active];

            $user->update([
                'name' => $data['name'],
                'email' => mb_strtolower(trim($data['email'])),
                'is_active' => $data['is_active'],
            ]);

            $user->syncRoles([$data['role']]);
            app(PermissionRegistrar::class)->forgetCachedPermissions();

            if ($user->employeeProfile) {
                $user->employeeProfile->update([
                    'department_id' => $data['department_id'],
                    'position_id' => $data['position_id'],
                    'employment_status' => $data['employment_status'],
                    'weekly_capacity_hours' => $data['weekly_capacity_hours'] ?? null,
                    'whatsapp_number' => $this->normalizeWhatsApp($data['whatsapp_number'] ?? null),
                    'notification_email' => $data['notification_email'] ?? null,
                    'notify_via_email' => $data['notify_via_email'],
                    'notify_via_whatsapp' => $data['notify_via_whatsapp'],
                ]);
            }

            $audit->log(
                'accounts.updated',
                "Updated account & contact profile for {$user->name} ({$user->email}).",
                $user,
                $old,
                ['name' => $user->name, 'email' => $user->email, 'is_active' => $user->is_active, 'role' => $data['role']],
                $actor->id
            );
        });

        return back()->with('success', "Account updated for {$user->name}.");
    }

    public function toggleActive(Request $request, User $user, AuditLogger $audit): RedirectResponse
    {
        $actor = $request->user();
        abort_unless($actor?->canManageAccounts(), 403);

        if ($user->id === $actor->id) {
            throw ValidationException::withMessages([
                'is_active' => 'You cannot deactivate your own account.',
            ]);
        }

        if ($user->hasRole(User::ROLE_FOUNDER) && $user->is_active) {
            $otherActiveFounders = User::role(User::ROLE_FOUNDER)
                ->where('is_active', true)
                ->where('id', '!=', $user->id)
                ->count();
            if ($otherActiveFounders === 0) {
                throw ValidationException::withMessages([
                    'is_active' => 'Cannot deactivate the last active Founder account.',
                ]);
            }
        }

        $next = ! $user->is_active;
        $user->update(['is_active' => $next]);

        $audit->log(
            'accounts.status_toggled',
            ($next ? 'Activated' : 'Deactivated') . " account {$user->name} ({$user->email}).",
            $user,
            ['is_active' => ! $next],
            ['is_active' => $next],
            $actor->id
        );

        return back()->with('success', "{$user->name} is now " . ($next ? 'Active' : 'Inactive') . '.');
    }

    public function updatePassword(Request $request, User $user, AuditLogger $audit): RedirectResponse
    {
        $actor = $request->user();
        abort_unless($actor?->canManageAccounts(), 403);

        $data = $request->validate([
            'password' => ['required', 'string', 'min:8', 'confirmed'],
            'must_change_password' => ['sometimes', 'boolean'],
        ]);

        $user->update([
            'password' => $data['password'],
            'must_change_password' => (bool) ($data['must_change_password'] ?? false),
            'password_updated_at' => now(),
        ]);

        $audit->log(
            'accounts.password_reset',
            "Executive {$actor->name} updated password for {$user->name}.",
            $user,
            null,
            ['must_change_password' => $user->must_change_password],
            $actor->id
        );

        return back()->with('success', "Password updated for {$user->name}.");
    }

    public function updateOwnPassword(Request $request, AuditLogger $audit): RedirectResponse
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

        return back()->with('success', 'Your password has been updated.');
    }

    public function destroy(Request $request, User $user, AuditLogger $audit): RedirectResponse
    {
        $actor = $request->user();
        abort_unless($actor?->canManageAccounts(), 403);

        if ($user->id === $actor->id) {
            throw ValidationException::withMessages([
                'account' => 'You cannot delete your own signed-in account.',
            ]);
        }

        if ($user->hasRole(User::ROLE_FOUNDER)) {
            $otherActiveFounders = User::role(User::ROLE_FOUNDER)
                ->where('is_active', true)
                ->where('id', '!=', $user->id)
                ->count();
            if ($otherActiveFounders === 0) {
                throw ValidationException::withMessages([
                    'account' => 'Cannot delete the last active Founder account.',
                ]);
            }
        }

        DB::transaction(function () use ($user, $actor, $audit): void {
            $user->update(['is_active' => false]);
            $user->employeeProfile?->delete();
            $user->delete();

            $audit->log('accounts.deleted', "Archived/deleted account {$user->name} ({$user->email}).", $user, null, null, $actor->id);
        });

        return back()->with('success', "Account {$user->name} deleted (archived).");
    }

    public function restore(Request $request, int $id, AuditLogger $audit): RedirectResponse
    {
        $actor = $request->user();
        abort_unless($actor?->canManageAccounts(), 403);

        $user = User::withTrashed()->findOrFail($id);

        DB::transaction(function () use ($user, $actor, $audit): void {
            $user->restore();
            $user->update(['is_active' => true]);
            EmployeeProfile::withTrashed()->where('user_id', $user->id)->restore();

            $audit->log('accounts.restored', "Restored account {$user->name} ({$user->email}).", $user, null, null, $actor->id);
        });

        return back()->with('success', "Account {$user->name} restored.");
    }

    private function normalizeWhatsApp(?string $raw): ?string
    {
        if ($raw === null || trim($raw) === '') {
            return null;
        }

        $digits = preg_replace('/\D+/', '', $raw) ?? '';
        if ($digits === '') {
            return null;
        }
        if (str_starts_with($digits, '0')) {
            return '62' . substr($digits, 1);
        }

        return $digits;
    }
}
