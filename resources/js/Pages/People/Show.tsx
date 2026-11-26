import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowLeft,
    BadgeCheck,
    Building2,
    Calendar,
    ExternalLink,
    Mail,
    MessageSquare,
    Power,
    QrCode,
    RefreshCw,
} from 'lucide-react';
import { useState } from 'react';
import { QrIdentityWidget } from '@/Components/shared/QrIdentityWidget';
import { StatusBadge } from '@/Components/shared/StatusBadge';
import { UserAvatar } from '@/Components/shared/UserAvatar';
import { AppShell } from '@/Layouts/AppShell';

interface PeopleShowProps {
    member: {
        id: number;
        name: string;
        avatar_url: string | null;
        avatar_color: string;
        position: string;
        position_level: string | null;
        department: string;
        department_color: string;
        membership_status: string;
        employment_status: string;
        joined_at: string | null;
        employee_code: string | null;
        email: string | null;
        whatsapp_number: string | null;
    };
    digitalIdentity: {
        status: 'active' | 'inactive' | 'revoked';
        public_url: string | null;
        regenerated_at: string | null;
    } | null;
    permissions: {
        is_owner: boolean;
        can_manage_identity: boolean;
    };
}

export default function PeopleShow({ member, digitalIdentity, permissions }: PeopleShowProps) {
    const [busy, setBusy] = useState(false);

    const whatsappHref = member.whatsapp_number
        ? `https://wa.me/${member.whatsapp_number.replace(/\D+/g, '')}`
        : null;

    return (
        <AppShell
            title={member.name}
            subtitle={`${member.position} • ${member.department}`}
            actions={
                <Link
                    href="/people"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Back to People
                </Link>
            }
        >
            <Head title={`${member.name} — Member Profile`} />

            <div className="space-y-6">
                {/* Section A — Profile Header */}
                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
                    <div className="h-24 bg-gradient-to-r from-[#101D35] via-[#17294A] to-[#1E355E]" />
                    <div className="px-6 pb-6">
                        <div className="-mt-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                                <UserAvatar
                                    name={member.name}
                                    avatarUrl={member.avatar_url}
                                    avatarColor={member.avatar_color}
                                    size="xl"
                                    className="h-28 w-28 text-3xl ring-4 ring-white dark:ring-slate-900"
                                />
                                <div className="pb-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                                            {member.name}
                                        </h2>
                                        <StatusBadge
                                            label={member.membership_status}
                                            tone={
                                                member.membership_status === 'Active'
                                                    ? 'emerald'
                                                    : 'rose'
                                            }
                                        />
                                    </div>
                                    <p className="mt-0.5 text-sm font-medium text-slate-600 dark:text-slate-300">
                                        {member.position}
                                    </p>
                                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                                        {member.department}
                                    </p>
                                </div>
                            </div>

                            {permissions.is_owner && (
                                <Link
                                    href="/my-account"
                                    className="inline-flex items-center justify-center rounded-lg bg-[#101D35] px-4 py-2 text-xs font-semibold text-white hover:bg-[#192c4f] dark:bg-blue-600 dark:hover:bg-blue-700"
                                >
                                    Edit in My Account
                                </Link>
                            )}
                        </div>
                    </div>
                </section>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                    {/* Left Column: Organization & Contact */}
                    <div className="space-y-6 lg:col-span-7">
                        {/* Section C — Organization Information */}
                        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                                <Building2 className="h-4 w-4 text-slate-400" />
                                Organization Information
                            </h3>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                {member.employee_code && (
                                    <div className="rounded-xl bg-slate-50 p-3.5 dark:bg-slate-800/60">
                                        <p className="text-[11px] font-medium text-slate-400 uppercase">
                                            Employee ID
                                        </p>
                                        <p className="mt-1 font-mono text-sm font-semibold text-slate-900 dark:text-slate-100">
                                            {member.employee_code}
                                        </p>
                                    </div>
                                )}
                                <div className="rounded-xl bg-slate-50 p-3.5 dark:bg-slate-800/60">
                                    <p className="text-[11px] font-medium text-slate-400 uppercase">
                                        Department
                                    </p>
                                    <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                                        {member.department}
                                    </p>
                                </div>
                                <div className="rounded-xl bg-slate-50 p-3.5 dark:bg-slate-800/60">
                                    <p className="text-[11px] font-medium text-slate-400 uppercase">
                                        Position
                                    </p>
                                    <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                                        {member.position}
                                    </p>
                                </div>
                                <div className="rounded-xl bg-slate-50 p-3.5 dark:bg-slate-800/60">
                                    <p className="text-[11px] font-medium text-slate-400 uppercase">
                                        Employment Status
                                    </p>
                                    <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                                        {member.employment_status}
                                    </p>
                                </div>
                                <div className="rounded-xl bg-slate-50 p-3.5 dark:bg-slate-800/60 sm:col-span-2">
                                    <p className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400 uppercase">
                                        <Calendar className="h-3.5 w-3.5" />
                                        Joined Date
                                    </p>
                                    <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                                        {member.joined_at ?? '—'}
                                    </p>
                                </div>
                            </div>
                        </section>

                        {/* Section D — Contact Information */}
                        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                            <h3 className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">
                                Contact Information
                            </h3>

                            {!member.email && !member.whatsapp_number ? (
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    This member has restricted public visibility for their contact
                                    details.
                                </p>
                            ) : (
                                <div className="space-y-3">
                                    {member.email && (
                                        <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-800/60">
                                            <div className="flex min-w-0 items-center gap-3">
                                                <Mail className="h-4 w-4 shrink-0 text-slate-400" />
                                                <div className="min-w-0">
                                                    <p className="text-[11px] text-slate-400">
                                                        Professional Email
                                                    </p>
                                                    <p className="truncate text-xs font-semibold text-slate-900 dark:text-slate-100">
                                                        {member.email}
                                                    </p>
                                                </div>
                                            </div>
                                            <a
                                                href={`mailto:${member.email}`}
                                                className="shrink-0 rounded-lg bg-[#101D35] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#192c4f] dark:bg-blue-600"
                                            >
                                                Email
                                            </a>
                                        </div>
                                    )}

                                    {member.whatsapp_number && (
                                        <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-800/60">
                                            <div className="flex min-w-0 items-center gap-3">
                                                <MessageSquare className="h-4 w-4 shrink-0 text-emerald-500" />
                                                <div className="min-w-0">
                                                    <p className="text-[11px] text-slate-400">
                                                        WhatsApp
                                                    </p>
                                                    <p className="font-mono text-xs font-semibold text-slate-900 dark:text-slate-100">
                                                        {member.whatsapp_number}
                                                    </p>
                                                </div>
                                            </div>
                                            {whatsappHref && (
                                                <a
                                                    href={whatsappHref}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="shrink-0 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
                                                >
                                                    Chat
                                                </a>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </section>
                    </div>

                    {/* Right Column: Section E — Digital Identity */}
                    <div className="lg:col-span-5">
                        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
                                <div className="flex items-center gap-2">
                                    <QrCode className="h-4 w-4 text-[#101D35] dark:text-blue-400" />
                                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                                        Digital Identity
                                    </h3>
                                </div>
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                                    <BadgeCheck className="h-3.5 w-3.5" />
                                    {digitalIdentity?.status === 'active'
                                        ? 'Verified Active'
                                        : 'Inactive'}
                                </span>
                            </div>

                            <div className="flex flex-col items-center">
                                <QrIdentityWidget
                                    value={digitalIdentity?.public_url ?? null}
                                    status={digitalIdentity?.status ?? 'inactive'}
                                    fileName={`krevia-member-${member.id}`}
                                    showDownloads={permissions.can_manage_identity}
                                />

                                {digitalIdentity?.status === 'active' &&
                                    digitalIdentity.public_url && (
                                        <a
                                            href={digitalIdentity.public_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#101D35] px-4 py-2 text-xs font-semibold text-white hover:bg-[#192c4f] dark:bg-blue-600 dark:hover:bg-blue-700"
                                        >
                                            <ExternalLink className="h-3.5 w-3.5" />
                                            Open Digital Identity Page
                                        </a>
                                    )}

                                {permissions.can_manage_identity && digitalIdentity && (
                                    <div className="mt-4 flex w-full flex-wrap gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
                                        <button
                                            type="button"
                                            disabled={busy}
                                            onClick={() => {
                                                setBusy(true);
                                                router.patch(
                                                    `/people/${member.id}/identity/status`,
                                                    { active: digitalIdentity.status !== 'active' },
                                                    {
                                                        preserveScroll: true,
                                                        onFinish: () => setBusy(false),
                                                    },
                                                );
                                            }}
                                            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                                        >
                                            <Power className="h-3.5 w-3.5" />
                                            {digitalIdentity.status === 'active'
                                                ? 'Deactivate'
                                                : 'Activate'}
                                        </button>
                                        <button
                                            type="button"
                                            disabled={busy}
                                            onClick={() => {
                                                setBusy(true);
                                                router.post(
                                                    `/people/${member.id}/identity/regenerate`,
                                                    {},
                                                    {
                                                        preserveScroll: true,
                                                        onFinish: () => setBusy(false),
                                                    },
                                                );
                                            }}
                                            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 hover:bg-amber-100 dark:border-amber-800/60 dark:bg-amber-950/60 dark:text-amber-300"
                                        >
                                            <RefreshCw className="h-3.5 w-3.5" />
                                            Regenerate
                                        </button>
                                    </div>
                                )}
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        </AppShell>
    );
}
