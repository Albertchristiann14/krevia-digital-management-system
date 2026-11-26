import { StatusBadge } from '@/Components/shared/StatusBadge';
import { AppShell } from '@/Layouts/AppShell';
import { UserAvatar } from '@/Components/shared/UserAvatar';
import { cn } from '@/lib/utils';
import type { PageProps } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import {
    Edit3,
    KeyRound,
    Mail,
    MessageCircle,
    Plus,
    Power,
    RotateCcw,
    Trash2,
    UserPlus,
    X,
} from 'lucide-react';
import { useState, type FormEvent } from 'react';

interface AccountRow {
    id: number;
    name: string;
    email: string;
    is_active: boolean;
    must_change_password: boolean;
    password_updated_at: string | null;
    last_login_at: string | null;
    deleted_at: string | null;
    role: string | null;
    employee_code: string | null;
    department_id: number | null;
    department: string | null;
    position_id: number | null;
    position: string | null;
    employment_status: string;
    weekly_capacity_hours: number | null;
    whatsapp_number: string | null;
    notification_email: string | null;
    notify_via_email: boolean;
    notify_via_whatsapp: boolean;
}

interface AccountsProps extends PageProps {
    accounts: AccountRow[];
    roles: string[];
    departments: { id: number; name: string }[];
    positions: { id: number; title: string; department_id: number }[];
    isFounderOrOps: boolean;
}

export default function Accounts({
    accounts,
    roles,
    departments,
    positions,
    isFounderOrOps,
    auth,
    errors,
}: AccountsProps) {
    const [showCreate, setShowCreate] = useState(false);
    const [editing, setEditing] = useState<AccountRow | null>(null);
    const [passwordTarget, setPasswordTarget] = useState<AccountRow | null>(null);

    const createForm = useForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
        must_change_password: true,
        role: roles[roles.length - 1] ?? 'Technical Contributor',
        department_id: departments[0]?.id ? String(departments[0].id) : '',
        position_id: positions[0]?.id ? String(positions[0].id) : '',
        employment_status: 'Active',
        weekly_capacity_hours: '',
        whatsapp_number: '',
        notification_email: '',
        notify_via_email: true,
        notify_via_whatsapp: true,
        is_active: true,
    });

    const editForm = useForm({
        name: '',
        email: '',
        role: '',
        department_id: '',
        position_id: '',
        employment_status: 'Active',
        weekly_capacity_hours: '',
        whatsapp_number: '',
        notification_email: '',
        notify_via_email: true,
        notify_via_whatsapp: true,
        is_active: true,
    });

    const passwordForm = useForm({
        password: '',
        password_confirmation: '',
        must_change_password: true,
    });

    const openEdit = (acc: AccountRow) => {
        setEditing(acc);
        editForm.setData({
            name: acc.name,
            email: acc.email,
            role: acc.role ?? roles[0] ?? '',
            department_id: acc.department_id ? String(acc.department_id) : String(departments[0]?.id ?? ''),
            position_id: acc.position_id ? String(acc.position_id) : String(positions[0]?.id ?? ''),
            employment_status: acc.employment_status,
            weekly_capacity_hours: acc.weekly_capacity_hours !== null ? String(acc.weekly_capacity_hours) : '',
            whatsapp_number: acc.whatsapp_number ?? '',
            notification_email: acc.notification_email ?? '',
            notify_via_email: acc.notify_via_email,
            notify_via_whatsapp: acc.notify_via_whatsapp,
            is_active: acc.is_active,
        });
    };

    const openPasswordModal = (acc: AccountRow) => {
        setPasswordTarget(acc);
        passwordForm.reset();
        passwordForm.setData('must_change_password', true);
    };

    const errorList = Object.values(errors ?? {});
    const assignableRoles = isFounderOrOps
        ? roles
        : roles.filter((r) => !['Founder / Managing Director', 'Director of Operations'].includes(r));

    return (
        <AppShell
            title="Executive Member & Account Management"
            subtitle="Founder, Co-Founder & CTO access to add, activate/deactivate, archive, edit login email, WhatsApp number, and member passwords"
            actions={
                <button
                    type="button"
                    onClick={() => setShowCreate(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#101D35] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#192c4e]"
                >
                    <UserPlus className="h-4 w-4" />
                    Add Member Account
                </button>
            }
        >
            <Head title="Team Accounts — KDMS" />

            {errorList.length > 0 && (
                <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">
                    {errorList.map((e, i) => (
                        <div key={i}>{e}</div>
                    ))}
                </div>
            )}

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                        <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase">
                            <tr>
                                <th className="px-4 py-3">Member</th>
                                <th className="px-4 py-3">Login Email & Channels</th>
                                <th className="px-4 py-3">Role & Position</th>
                                <th className="px-4 py-3">Status & Security</th>
                                <th className="px-4 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {accounts.map((acc) => {
                                const isSelf = auth.user?.id === acc.id;
                                const isArchived = acc.deleted_at !== null;
                                return (
                                    <tr key={acc.id} className={cn(isArchived && 'bg-slate-50/70 opacity-70')}>
                                        <td className="px-4 py-3 align-top">
                                            <div className="flex items-center gap-2.5">
                                                <UserAvatar
                                                    name={acc.name}
                                                    avatarUrl={(acc as { avatar_url?: string | null }).avatar_url}
                                                    avatarColor={(acc as { avatar_color?: string | null }).avatar_color}
                                                    size="sm"
                                                />
                                                <div>
                                                    <div className="font-bold text-[#101D35]">
                                                        {acc.name}{' '}
                                                        {isSelf && (
                                                            <span className="text-[10px] font-semibold text-blue-600">
                                                                (You)
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="font-mono text-[11px] text-slate-500">
                                                        {acc.employee_code ?? `USR-${acc.id}`}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 align-top">
                                            <div className="flex items-center gap-1.5 font-medium text-slate-800">
                                                <Mail className="h-3.5 w-3.5 text-slate-400" />
                                                {acc.email}
                                            </div>
                                            {acc.notification_email && (
                                                <div className="mt-0.5 text-[11px] text-slate-500">
                                                    Notify Email: {acc.notification_email}
                                                </div>
                                            )}
                                            <div className="mt-1 flex items-center gap-1.5 text-[11px]">
                                                <MessageCircle className="h-3.5 w-3.5 text-emerald-600" />
                                                {acc.whatsapp_number ? (
                                                    <span className="font-mono text-emerald-700">
                                                        +{acc.whatsapp_number}
                                                    </span>
                                                ) : (
                                                    <span className="text-amber-600">
                                                        No WhatsApp number set
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 align-top">
                                            <div className="font-semibold text-[#101D35]">
                                                {acc.role ?? '—'}
                                            </div>
                                            <div className="text-[11px] text-slate-500">
                                                {acc.position} • {acc.department}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 align-top">
                                            <div className="flex flex-wrap gap-1">
                                                <StatusBadge
                                                    label={
                                                        isArchived
                                                            ? 'Cancelled'
                                                            : acc.is_active
                                                              ? 'Active'
                                                              : 'Inactive'
                                                    }
                                                />
                                                {acc.must_change_password && !isArchived && (
                                                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                                                        Initial Password
                                                    </span>
                                                )}
                                            </div>
                                            <div className="mt-1 text-[10px] text-slate-400">
                                                Last login: {acc.last_login_at ?? 'Never'}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-right align-top">
                                            {isArchived ? (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        router.post(`/admin/accounts/${acc.id}/restore`)
                                                    }
                                                    className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700"
                                                >
                                                    <RotateCcw className="h-3.5 w-3.5" />
                                                    Restore
                                                </button>
                                            ) : (
                                                <div className="flex flex-wrap justify-end gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => openEdit(acc)}
                                                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-[#101D35] hover:bg-slate-50"
                                                    >
                                                        <Edit3 className="h-3 w-3" />
                                                        Edit
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => openPasswordModal(acc)}
                                                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-blue-700 hover:bg-blue-50"
                                                    >
                                                        <KeyRound className="h-3 w-3" />
                                                        Password
                                                    </button>
                                                    {!isSelf && (
                                                        <>
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    router.post(
                                                                        `/admin/accounts/${acc.id}/toggle-active`,
                                                                    )
                                                                }
                                                                className={cn(
                                                                    'inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-semibold',
                                                                    acc.is_active
                                                                        ? 'border-amber-200 text-amber-700 hover:bg-amber-50'
                                                                        : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50',
                                                                )}
                                                            >
                                                                <Power className="h-3 w-3" />
                                                                {acc.is_active ? 'Deactivate' : 'Activate'}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    if (
                                                                        confirm(
                                                                            `Archive/delete account ${acc.name}?`,
                                                                        )
                                                                    ) {
                                                                        router.delete(
                                                                            `/admin/accounts/${acc.id}`,
                                                                        );
                                                                    }
                                                                }}
                                                                className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2.5 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-50"
                                                            >
                                                                <Trash2 className="h-3 w-3" />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create Member Modal */}
            {showCreate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
                    <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <h2 className="text-base font-bold text-[#101D35]">
                                Add New Member Account
                            </h2>
                            <button
                                type="button"
                                onClick={() => setShowCreate(false)}
                                className="rounded p-1 text-slate-400"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <form
                            onSubmit={(e: FormEvent) => {
                                e.preventDefault();
                                createForm.post('/admin/accounts', {
                                    onSuccess: () => {
                                        createForm.reset();
                                        setShowCreate(false);
                                    },
                                });
                            }}
                            className="mt-4 space-y-3"
                        >
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <div>
                                    <label className="text-xs font-semibold text-slate-700">
                                        Full Name *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={createForm.data.name}
                                        onChange={(e) => createForm.setData('name', e.target.value)}
                                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-700">
                                        Login Email *
                                    </label>
                                    <input
                                        type="email"
                                        required
                                        value={createForm.data.email}
                                        onChange={(e) => createForm.setData('email', e.target.value)}
                                        placeholder="member@kreviadigital.com"
                                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-700">
                                        Initial Password *
                                    </label>
                                    <input
                                        type="password"
                                        required
                                        minLength={8}
                                        value={createForm.data.password}
                                        onChange={(e) =>
                                            createForm.setData('password', e.target.value)
                                        }
                                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-700">
                                        Confirm Initial Password *
                                    </label>
                                    <input
                                        type="password"
                                        required
                                        minLength={8}
                                        value={createForm.data.password_confirmation}
                                        onChange={(e) =>
                                            createForm.setData(
                                                'password_confirmation',
                                                e.target.value,
                                            )
                                        }
                                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-700">
                                        WhatsApp Number (e.g. 0812... or 62812...)
                                    </label>
                                    <input
                                        type="text"
                                        value={createForm.data.whatsapp_number}
                                        onChange={(e) =>
                                            createForm.setData('whatsapp_number', e.target.value)
                                        }
                                        placeholder="628123456789"
                                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-700">
                                        Gmail Notification Address (optional)
                                    </label>
                                    <input
                                        type="email"
                                        value={createForm.data.notification_email}
                                        onChange={(e) =>
                                            createForm.setData('notification_email', e.target.value)
                                        }
                                        placeholder="If different from login email"
                                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-700">
                                        Role *
                                    </label>
                                    <select
                                        value={createForm.data.role}
                                        onChange={(e) => createForm.setData('role', e.target.value)}
                                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                                    >
                                        {assignableRoles.map((r) => (
                                            <option key={r} value={r}>
                                                {r}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-700">
                                        Department *
                                    </label>
                                    <select
                                        value={createForm.data.department_id}
                                        onChange={(e) =>
                                            createForm.setData('department_id', e.target.value)
                                        }
                                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                                    >
                                        {departments.map((d) => (
                                            <option key={d.id} value={d.id}>
                                                {d.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-700">
                                        Position *
                                    </label>
                                    <select
                                        value={createForm.data.position_id}
                                        onChange={(e) =>
                                            createForm.setData('position_id', e.target.value)
                                        }
                                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                                    >
                                        {positions.map((p) => (
                                            <option key={p.id} value={p.id}>
                                                {p.title}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-700">
                                        Employment Status *
                                    </label>
                                    <select
                                        value={createForm.data.employment_status}
                                        onChange={(e) =>
                                            createForm.setData('employment_status', e.target.value)
                                        }
                                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                                    >
                                        {['Active', 'Part-Time', 'Probation', 'Contract'].map(
                                            (st) => (
                                                <option key={st} value={st}>
                                                    {st}
                                                </option>
                                            ),
                                        )}
                                    </select>
                                </div>
                            </div>
                            <label className="flex items-center gap-2 text-xs text-slate-700">
                                <input
                                    type="checkbox"
                                    checked={createForm.data.must_change_password}
                                    onChange={(e) =>
                                        createForm.setData('must_change_password', e.target.checked)
                                    }
                                />
                                Flag as initial password (prompt member to update after first login)
                            </label>
                            <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                                <button
                                    type="button"
                                    onClick={() => setShowCreate(false)}
                                    className="rounded-lg border border-slate-200 px-4 py-2 text-xs"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={createForm.processing}
                                    className="rounded-lg bg-[#101D35] px-4 py-2 text-xs font-semibold text-white"
                                >
                                    Create Account
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Account Modal */}
            {editing && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
                    <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <h2 className="text-base font-bold text-[#101D35]">
                                Edit Account — {editing.name}
                            </h2>
                            <button
                                type="button"
                                onClick={() => setEditing(null)}
                                className="rounded p-1 text-slate-400"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <form
                            onSubmit={(e: FormEvent) => {
                                e.preventDefault();
                                editForm.patch(`/admin/accounts/${editing.id}`, {
                                    onSuccess: () => setEditing(null),
                                });
                            }}
                            className="mt-4 space-y-3"
                        >
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <div>
                                    <label className="text-xs font-semibold text-slate-700">
                                        Name
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={editForm.data.name}
                                        onChange={(e) => editForm.setData('name', e.target.value)}
                                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-700">
                                        Login Email *
                                    </label>
                                    <input
                                        type="email"
                                        required
                                        value={editForm.data.email}
                                        onChange={(e) => editForm.setData('email', e.target.value)}
                                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-700">
                                        WhatsApp Number
                                    </label>
                                    <input
                                        type="text"
                                        value={editForm.data.whatsapp_number}
                                        onChange={(e) =>
                                            editForm.setData('whatsapp_number', e.target.value)
                                        }
                                        placeholder="628123456789"
                                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-700">
                                        Gmail Notification Address
                                    </label>
                                    <input
                                        type="email"
                                        value={editForm.data.notification_email}
                                        onChange={(e) =>
                                            editForm.setData('notification_email', e.target.value)
                                        }
                                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-700">
                                        Role
                                    </label>
                                    <select
                                        value={editForm.data.role}
                                        onChange={(e) => editForm.setData('role', e.target.value)}
                                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                                    >
                                        {roles.map((r) => (
                                            <option key={r} value={r}>
                                                {r}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-700">
                                        Department
                                    </label>
                                    <select
                                        value={editForm.data.department_id}
                                        onChange={(e) =>
                                            editForm.setData('department_id', e.target.value)
                                        }
                                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                                    >
                                        {departments.map((d) => (
                                            <option key={d.id} value={d.id}>
                                                {d.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-4 pt-1 text-xs text-slate-700">
                                <label className="flex items-center gap-1.5">
                                    <input
                                        type="checkbox"
                                        checked={editForm.data.notify_via_email}
                                        onChange={(e) =>
                                            editForm.setData('notify_via_email', e.target.checked)
                                        }
                                    />
                                    Receive Email Notifications
                                </label>
                                <label className="flex items-center gap-1.5">
                                    <input
                                        type="checkbox"
                                        checked={editForm.data.notify_via_whatsapp}
                                        onChange={(e) =>
                                            editForm.setData('notify_via_whatsapp', e.target.checked)
                                        }
                                    />
                                    Receive WhatsApp Notifications
                                </label>
                            </div>
                            <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                                <button
                                    type="button"
                                    onClick={() => setEditing(null)}
                                    className="rounded-lg border border-slate-200 px-4 py-2 text-xs"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={editForm.processing}
                                    className="rounded-lg bg-[#101D35] px-4 py-2 text-xs font-semibold text-white"
                                >
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Set / Reset Password Modal */}
            {passwordTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
                    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <h2 className="text-base font-bold text-[#101D35]">
                                Set / Change Password — {passwordTarget.name}
                            </h2>
                            <button
                                type="button"
                                onClick={() => setPasswordTarget(null)}
                                className="rounded p-1 text-slate-400"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <form
                            onSubmit={(e: FormEvent) => {
                                e.preventDefault();
                                passwordForm.put(`/admin/accounts/${passwordTarget.id}/password`, {
                                    onSuccess: () => setPasswordTarget(null),
                                });
                            }}
                            className="mt-4 space-y-3"
                        >
                            <div>
                                <label className="text-xs font-semibold text-slate-700">
                                    New Password (min 8 chars) *
                                </label>
                                <input
                                    type="password"
                                    required
                                    minLength={8}
                                    value={passwordForm.data.password}
                                    onChange={(e) =>
                                        passwordForm.setData('password', e.target.value)
                                    }
                                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-700">
                                    Confirm Password *
                                </label>
                                <input
                                    type="password"
                                    required
                                    minLength={8}
                                    value={passwordForm.data.password_confirmation}
                                    onChange={(e) =>
                                        passwordForm.setData(
                                            'password_confirmation',
                                            e.target.value,
                                        )
                                    }
                                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                                />
                            </div>
                            <label className="flex items-center gap-2 text-xs text-slate-700">
                                <input
                                    type="checkbox"
                                    checked={passwordForm.data.must_change_password}
                                    onChange={(e) =>
                                        passwordForm.setData(
                                            'must_change_password',
                                            e.target.checked,
                                        )
                                    }
                                />
                                Mark as initial/temporary password
                            </label>
                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setPasswordTarget(null)}
                                    className="rounded-lg border border-slate-200 px-4 py-2 text-xs"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={passwordForm.processing}
                                    className="rounded-lg bg-[#101D35] px-4 py-2 text-xs font-semibold text-white"
                                >
                                    Save Password
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AppShell>
    );
}
