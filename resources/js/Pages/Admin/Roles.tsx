import { StatusBadge } from '@/Components/shared/StatusBadge';
import { AppShell } from '@/Layouts/AppShell';
import type { PageProps } from '@/types';
import { Head, router } from '@inertiajs/react';
import { Lock, Save, ShieldCheck } from 'lucide-react';
import { useState } from 'react';

interface UserRow {
    id: number;
    name: string;
    email: string;
    is_active: boolean;
    last_login_at: string | null;
    role: string;
    department: string | null;
    position: string | null;
    can_manage_finance: boolean;
}

interface RoleRow {
    id: number;
    name: string;
    permissions: string[];
    is_finance_write_eligible: boolean;
}

interface RolesPageProps extends PageProps {
    users: UserRow[];
    roles: RoleRow[];
    allPermissions: string[];
    canManage: boolean;
}

const FINANCE_WRITE_PERMS = new Set([
    'finance.create',
    'finance.edit',
    'finance.delete',
    'finance.approve',
    'finance.manage',
]);

export default function RolesIndex({
    users,
    roles,
    allPermissions,
    canManage,
}: RolesPageProps) {
    const [selectedRoleId, setSelectedRoleId] = useState<number>(roles[0]?.id ?? 0);
    const activeRole = roles.find((r) => r.id === selectedRoleId) ?? roles[0];

    const [rolePerms, setRolePerms] = useState<Record<number, string[]>>(() => {
        const init: Record<number, string[]> = {};
        roles.forEach((r) => {
            init[r.id] = r.permissions;
        });
        return init;
    });

    const togglePerm = (perm: string) => {
        if (!canManage || !activeRole) return;
        if (!activeRole.is_finance_write_eligible && FINANCE_WRITE_PERMS.has(perm)) {
            return;
        }
        const current = rolePerms[activeRole.id] ?? [];
        const next = current.includes(perm)
            ? current.filter((p) => p !== perm)
            : [...current, perm];
        setRolePerms({ ...rolePerms, [activeRole.id]: next });
    };

    const saveRolePermissions = () => {
        if (!activeRole || !canManage) return;
        router.put(
            `/admin/roles/${activeRole.id}/permissions`,
            { permissions: rolePerms[activeRole.id] ?? [] },
            { preserveScroll: true },
        );
    };

    const toggleUserActive = (u: UserRow) => {
        if (!canManage) return;
        router.patch(
            `/admin/users/${u.id}/access`,
            { role: u.role, is_active: !u.is_active },
            { preserveScroll: true },
        );
    };

    const changeUserRole = (u: UserRow, role: string) => {
        if (!canManage) return;
        router.patch(
            `/admin/users/${u.id}/access`,
            { role, is_active: u.is_active },
            { preserveScroll: true },
        );
    };

    return (
        <AppShell
            title="Roles & Permissions (RBAC)"
            subtitle="Granular backend-enforced permissions · Finance write locked to Albert & Farizy (D-05)"
        >
            <Head title="Roles & Permissions" />

            <div className="space-y-6">
                {/* User Accounts Table */}
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                    <div className="border-b border-slate-200 px-5 py-4">
                        <h2 className="font-display text-base font-bold text-[#101D35]">
                            Internal User Accounts (7 Members)
                        </h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-left text-sm">
                            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600 uppercase">
                                <tr>
                                    <th className="px-4 py-3">Member</th>
                                    <th className="px-4 py-3">Assigned Role</th>
                                    <th className="px-4 py-3">Finance Authority</th>
                                    <th className="px-4 py-3">Account Status</th>
                                    <th className="px-4 py-3">Last Login</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {users.map((u) => (
                                    <tr key={u.id} className="hover:bg-slate-50/70">
                                        <td className="px-4 py-3">
                                            <p className="font-semibold text-slate-900">{u.name}</p>
                                            <p className="font-mono text-xs text-slate-500">{u.email}</p>
                                        </td>
                                        <td className="px-4 py-3">
                                            {canManage ? (
                                                <select
                                                    value={u.role}
                                                    onChange={(e) => changeUserRole(u, e.target.value)}
                                                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700"
                                                >
                                                    {roles.map((r) => (
                                                        <option key={r.id} value={r.name}>
                                                            {r.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <span className="text-xs font-medium text-slate-700">
                                                    {u.role}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            {u.can_manage_finance ? (
                                                <StatusBadge label="Finance Write Enabled (D-05)" tone="green" />
                                            ) : (
                                                <StatusBadge label="Restricted" tone="slate" />
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <button
                                                type="button"
                                                disabled={!canManage}
                                                onClick={() => toggleUserActive(u)}
                                                className="disabled:cursor-default"
                                            >
                                                <StatusBadge
                                                    label={u.is_active ? 'Active' : 'Inactive'}
                                                    tone={u.is_active ? 'green' : 'red'}
                                                />
                                            </button>
                                        </td>
                                        <td className="px-4 py-3 font-mono text-xs text-slate-500">
                                            {u.last_login_at ?? 'Never'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Role Permissions Matrix */}
                {activeRole && (
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
                        <div className="space-y-1.5 rounded-xl border border-slate-200 bg-white p-3">
                            <p className="px-2 py-1 text-xs font-semibold tracking-wider text-slate-400 uppercase">
                                Roles
                            </p>
                            {roles.map((r) => (
                                <button
                                    key={r.id}
                                    type="button"
                                    onClick={() => setSelectedRoleId(r.id)}
                                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-xs font-semibold transition ${
                                        activeRole.id === r.id
                                            ? 'bg-[#101D35] text-white'
                                            : 'text-slate-700 hover:bg-slate-50'
                                    }`}
                                >
                                    <span className="truncate">{r.name}</span>
                                    <span className="font-mono opacity-75">
                                        {(rolePerms[r.id] ?? []).length}
                                    </span>
                                </button>
                            ))}
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-3">
                            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <ShieldCheck className="h-4 w-4 text-[#101D35]" />
                                        <h3 className="font-display text-base font-bold text-[#101D35]">
                                            {activeRole.name}
                                        </h3>
                                    </div>
                                    {!activeRole.is_finance_write_eligible && (
                                        <p className="mt-1 flex items-center gap-1 text-xs text-amber-700">
                                            <Lock className="h-3.5 w-3.5" />
                                            Finance write permissions are locked by Decision D-05.
                                        </p>
                                    )}
                                </div>
                                {canManage && (
                                    <button
                                        type="button"
                                        onClick={saveRolePermissions}
                                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#101D35] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#1A2D4E]"
                                    >
                                        <Save className="h-3.5 w-3.5" />
                                        Save Permissions
                                    </button>
                                )}
                            </div>

                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
                                {allPermissions.map((perm) => {
                                    const checked = (rolePerms[activeRole.id] ?? []).includes(perm);
                                    const lockedFinance =
                                        !activeRole.is_finance_write_eligible &&
                                        FINANCE_WRITE_PERMS.has(perm);
                                    return (
                                        <label
                                            key={perm}
                                            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs ${
                                                lockedFinance
                                                    ? 'cursor-not-allowed border-slate-100 bg-slate-50 text-slate-400'
                                                    : 'cursor-pointer border-slate-200 hover:bg-slate-50'
                                            }`}
                                        >
                                            <input
                                                type="checkbox"
                                                disabled={!canManage || lockedFinance}
                                                checked={checked}
                                                onChange={() => togglePerm(perm)}
                                                className="h-3.5 w-3.5 rounded border-slate-300 text-[#101D35]"
                                            />
                                            <span className="font-mono">{perm}</span>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AppShell>
    );
}
