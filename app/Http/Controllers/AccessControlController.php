<?php

namespace App\Http\Controllers;

use App\Domain\Workspace\Models\AuditLog;
use App\Domain\Workspace\Services\AuditLogger;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class AccessControlController extends Controller
{
    public const FINANCE_WRITE_PERMISSIONS = [
        'finance.create',
        'finance.edit',
        'finance.delete',
        'finance.approve',
        'finance.manage',
    ];

    public function index(Request $request): Response
    {
        abort_unless($request->user()?->can('roles.view'), 403);

        $users = User::query()
            ->with(['roles:id,name', 'employeeProfile.department:id,name,color_hex', 'employeeProfile.position:id,title'])
            ->orderBy('id')
            ->get()
            ->map(fn (User $u) => [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'is_active' => $u->is_active,
                'last_login_at' => $u->last_login_at?->format('Y-m-d H:i'),
                'role' => $u->roles->first()?->name,
                'department' => $u->employeeProfile?->department?->name,
                'position' => $u->employeeProfile?->position?->title,
                'can_manage_finance' => $u->canManageFinance(),
            ]);

        $roles = Role::query()
            ->with('permissions:id,name')
            ->orderBy('id')
            ->get()
            ->map(fn (Role $r) => [
                'id' => $r->id,
                'name' => $r->name,
                'permissions' => $r->permissions->pluck('name')->values()->all(),
                'is_finance_write_eligible' => in_array($r->name, [User::ROLE_FOUNDER, User::ROLE_OPERATIONS], true),
            ]);

        $permissions = Permission::query()
            ->orderBy('name')
            ->pluck('name')
            ->values()
            ->all();

        return Inertia::render('Admin/Roles', [
            'users' => $users,
            'roles' => $roles,
            'allPermissions' => $permissions,
            'canManage' => (bool) $request->user()?->can('roles.manage'),
        ]);
    }

    public function updateUserAccess(Request $request, User $user, AuditLogger $audit): RedirectResponse
    {
        abort_unless($request->user()?->can('roles.manage'), 403);

        $data = $request->validate([
            'role' => ['required', 'string', Rule::exists('roles', 'name')],
            'is_active' => ['required', 'boolean'],
        ]);

        if ($user->id === $request->user()->id && ! $data['is_active']) {
            throw ValidationException::withMessages([
                'is_active' => 'You cannot deactivate your own account while signed in.',
            ]);
        }

        $old = ['role' => $user->roles->first()?->name, 'is_active' => $user->is_active];
        $user->update(['is_active' => $data['is_active']]);
        $user->syncRoles([$data['role']]);
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $audit->log('rbac.user_access_updated', "Updated role/status for {$user->name}.", $user, $old, $data);

        return back()->with('success', "Access updated for {$user->name}.");
    }

    public function updateRolePermissions(Request $request, Role $role, AuditLogger $audit): RedirectResponse
    {
        abort_unless($request->user()?->can('roles.manage'), 403);

        $data = $request->validate([
            'permissions' => ['required', 'array'],
            'permissions.*' => ['string', Rule::exists('permissions', 'name')],
        ]);

        $isFinanceWriteEligible = in_array($role->name, [User::ROLE_FOUNDER, User::ROLE_OPERATIONS], true);
        if (! $isFinanceWriteEligible) {
            $forbiddenFinancePerms = array_intersect($data['permissions'], self::FINANCE_WRITE_PERMISSIONS);
            if ($forbiddenFinancePerms !== []) {
                throw ValidationException::withMessages([
                    'permissions' => 'Business Rule D-05: Financial write permissions may only be assigned to Founder / Managing Director (Albert) and Director of Operations (Farizy).',
                ]);
            }
        }

        $oldPerms = $role->permissions()->pluck('name')->values()->all();
        $role->syncPermissions($data['permissions']);
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $audit->log(
            'rbac.role_permissions_updated',
            "Updated permissions for role '{$role->name}'.",
            $role,
            ['permissions' => $oldPerms],
            ['permissions' => $data['permissions']]
        );

        return back()->with('success', "Permissions updated for {$role->name}.");
    }

    public function auditLogs(Request $request): Response
    {
        abort_unless($request->user()?->can('audit.view'), 403);

        $query = AuditLog::query()->with('user:id,name,email')->latest('created_at');

        if ($search = $request->string('search')->trim()->toString()) {
            $query->where(function ($q) use ($search) {
                $q->where('summary', 'like', "%{$search}%")
                    ->orWhere('event', 'like', "%{$search}%");
            });
        }

        if ($event = $request->string('event')->trim()->toString()) {
            $query->where('event', $event);
        }

        $logs = $query->paginate(20)->withQueryString()->through(fn (AuditLog $log) => [
            'id' => $log->id,
            'event' => $log->event,
            'summary' => $log->summary,
            'actor' => $log->user?->name ?? 'System',
            'ip_address' => $log->ip_address,
            'old_values' => $log->old_values,
            'new_values' => $log->new_values,
            'created_at' => $log->created_at?->format('Y-m-d H:i:s'),
        ]);

        $events = AuditLog::query()->select('event')->distinct()->orderBy('event')->pluck('event');

        return Inertia::render('Admin/AuditLogs', [
            'logs' => $logs,
            'events' => $events,
            'filters' => [
                'search' => $request->string('search')->toString(),
                'event' => $request->string('event')->toString(),
            ],
        ]);
    }
}
