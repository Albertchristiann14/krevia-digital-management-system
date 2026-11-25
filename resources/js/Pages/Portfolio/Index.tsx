import { StatusBadge } from '@/Components/shared/StatusBadge';
import { AppShell } from '@/Layouts/AppShell';
import { cn, formatShortDate, getInitials } from '@/lib/utils';
import type { PageProps } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowUpRight,
    CheckCircle2,
    ExternalLink,
    FolderOpen,
    Layers,
    Megaphone,
    Plus,
    Presentation,
    ShieldCheck,
    X,
} from 'lucide-react';
import { useState, type FormEvent } from 'react';

interface DemoCard {
    id: number;
    code: string;
    name: string;
    service_line: string;
    purpose: string | null;
    features_summary: string | null;
    pic_name: string | null;
    supporting_team: string | null;
    start_date: string | null;
    target_end_date: string | null;
    status: string;
    label_type: string;
    is_conditional: boolean;
    data_status: string;
    staging_url: string | null;
    is_ready_to_present: boolean;
    technical_approved: boolean;
    commercial_approved: boolean;
    criteria_met_count: number;
    assets_count: number;
    content_items_count: number;
    notes: string | null;
}

interface PortfolioIndexProps extends PageProps {
    demos: DemoCard[];
    activeDemoCount: number;
    maxActiveDemos: number;
    readyDemoCount: number;
    serviceLines: string[];
    statuses: string[];
    users: { id: number; name: string }[];
    canCreate: boolean;
}

export default function PortfolioIndex({
    demos,
    activeDemoCount,
    maxActiveDemos,
    readyDemoCount,
    serviceLines,
    users,
    canCreate,
}: PortfolioIndexProps) {
    const [selectedService, setSelectedService] = useState<string>('');
    const [showCreateModal, setShowCreateModal] = useState(false);

    const form = useForm({
        name: '',
        service_line: serviceLines[0] ?? 'Website Development & CMS',
        purpose: '',
        features_summary: '',
        pic_user_id: users[0]?.id ? String(users[0].id) : '',
        supporting_team: '',
        start_date: '',
        target_end_date: '',
        is_conditional: false,
        notes: '',
    });

    const filtered = selectedService
        ? demos.filter((d) => d.service_line === selectedService)
        : demos;

    const handleCreate = (e: FormEvent) => {
        e.preventDefault();
        form.post('/portfolio/demos', {
            onSuccess: () => {
                form.reset();
                setShowCreateModal(false);
            },
        });
    };

    return (
        <AppShell
            title="Portfolio & Demo Roadmap"
            subtitle="Sheet 10 demo builds (PD-01–PD-06) • Max 2 active concurrently • 6 presentation-readiness criteria"
            actions={
                canCreate && (
                    <button
                        type="button"
                        onClick={() => setShowCreateModal(true)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#101D35] px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-[#192c4e]"
                    >
                        <Plus className="h-4 w-4" />
                        New Demo
                    </button>
                )
            }
        >
            <Head title="Portfolio & Demos — KDMS" />

            {/* Capacity & Readiness KPI Bar */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                    <p className="text-[11px] font-medium text-slate-500">Total Roadmap Demos</p>
                    <p className="mt-0.5 text-xl font-bold text-[#101D35]">{demos.length}</p>
                </div>
                <div
                    className={cn(
                        'rounded-xl border px-4 py-3',
                        activeDemoCount >= maxActiveDemos
                            ? 'border-amber-300 bg-amber-50'
                            : 'border-slate-200 bg-white',
                    )}
                >
                    <p className="text-[11px] font-medium text-slate-600">
                        Active Concurrency Limit
                    </p>
                    <p className="mt-0.5 text-xl font-bold text-[#101D35]">
                        {activeDemoCount} / {maxActiveDemos}
                    </p>
                    <p className="text-[10px] text-slate-500">
                        Max 2 active demos simultaneously
                    </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                    <p className="text-[11px] font-medium text-slate-500">Ready to Present</p>
                    <p className="mt-0.5 text-xl font-bold text-emerald-700">{readyDemoCount}</p>
                    <p className="text-[10px] text-slate-500">6/6 criteria + Aldo & Albert</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                    <p className="text-[11px] font-medium text-slate-500">Portfolio Policy</p>
                    <p className="mt-1 text-xs font-semibold text-slate-700">
                        Label &ldquo;contoh internal&rdquo; until client permission granted
                    </p>
                </div>
            </div>

            {/* Service Line Filter */}
            <div className="mt-4 flex flex-wrap gap-2">
                {['', ...serviceLines].map((line) => (
                    <button
                        key={line || 'all'}
                        type="button"
                        onClick={() => setSelectedService(line)}
                        className={cn(
                            'rounded-lg border px-3 py-1.5 text-xs font-semibold transition',
                            selectedService === line
                                ? 'border-[#101D35] bg-[#101D35] text-white'
                                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
                        )}
                    >
                        {line || 'All Demos'}
                    </button>
                ))}
            </div>

            {/* Demo Card Grid */}
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filtered.map((demo) => {
                    const pct = Math.round((demo.criteria_met_count / 6) * 100);
                    return (
                        <div
                            key={demo.id}
                            className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 transition hover:border-[#101D35]/40"
                        >
                            <div>
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono text-xs font-bold text-[#101D35]">
                                            {demo.code}
                                        </span>
                                        <StatusBadge label={demo.status} />
                                    </div>
                                    <StatusBadge label={demo.label_type} />
                                </div>

                                <h3 className="mt-2.5 text-base font-bold text-[#101D35]">
                                    {demo.name}
                                </h3>
                                <p className="text-[11px] font-medium text-slate-500">
                                    {demo.service_line}
                                </p>

                                {demo.is_conditional && (
                                    <div className="mt-2 flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-800">
                                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                                        <span>
                                            Conditional ({demo.data_status}) — build only after market validation
                                        </span>
                                    </div>
                                )}

                                {demo.purpose && (
                                    <p className="mt-2 line-clamp-2 text-xs text-slate-600">
                                        {demo.purpose}
                                    </p>
                                )}

                                {/* 6-Criteria Progress */}
                                <div className="mt-4">
                                    <div className="flex items-center justify-between text-[11px]">
                                        <span className="font-medium text-slate-600">
                                            Presentation Readiness
                                        </span>
                                        <span className="font-bold text-[#101D35]">
                                            {demo.criteria_met_count} / 6 ({pct}%)
                                        </span>
                                    </div>
                                    <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                                        <div
                                            className={cn(
                                                'h-full rounded-full transition-all',
                                                demo.is_ready_to_present
                                                    ? 'bg-emerald-600'
                                                    : 'bg-[#101D35]',
                                            )}
                                            style={{ width: `${pct}%` }}
                                        />
                                    </div>
                                </div>

                                {/* Dual Approval Indicators */}
                                <div className="mt-3 flex flex-wrap gap-1.5 text-[10px] font-semibold">
                                    <span
                                        className={cn(
                                            'inline-flex items-center gap-1 rounded-full px-2 py-0.5',
                                            demo.technical_approved
                                                ? 'bg-emerald-50 text-emerald-700'
                                                : 'bg-slate-100 text-slate-500',
                                        )}
                                    >
                                        <ShieldCheck className="h-3 w-3" />
                                        Aldo: {demo.technical_approved ? 'Approved' : 'Pending'}
                                    </span>
                                    <span
                                        className={cn(
                                            'inline-flex items-center gap-1 rounded-full px-2 py-0.5',
                                            demo.commercial_approved
                                                ? 'bg-emerald-50 text-emerald-700'
                                                : 'bg-slate-100 text-slate-500',
                                        )}
                                    >
                                        <CheckCircle2 className="h-3 w-3" />
                                        Albert: {demo.commercial_approved ? 'Approved' : 'Pending'}
                                    </span>
                                </div>
                            </div>

                            <div className="mt-4 space-y-2.5 border-t border-slate-100 pt-3">
                                <div className="flex items-center justify-between text-[11px] text-slate-500">
                                    <div className="flex items-center gap-1.5">
                                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#101D35] text-[9px] font-bold text-white">
                                            {demo.pic_name ? getInitials(demo.pic_name) : 'KD'}
                                        </span>
                                        <span>{demo.pic_name ?? 'Unassigned'}</span>
                                    </div>
                                    <span>Target: {formatShortDate(demo.target_end_date)}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3 text-[11px] text-slate-500">
                                        <span className="inline-flex items-center gap-1">
                                            <FolderOpen className="h-3.5 w-3.5" />
                                            {demo.assets_count} Assets
                                        </span>
                                        <span className="inline-flex items-center gap-1">
                                            <Megaphone className="h-3.5 w-3.5" />
                                            {demo.content_items_count} Posts
                                        </span>
                                        {demo.staging_url && (
                                            <a
                                                href={demo.staging_url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-flex items-center gap-0.5 text-blue-600 hover:underline"
                                            >
                                                Staging <ExternalLink className="h-3 w-3" />
                                            </a>
                                        )}
                                    </div>
                                    <Link
                                        href={`/portfolio/demos/${demo.id}`}
                                        className="inline-flex items-center gap-1 rounded-lg bg-[#101D35] px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-[#192c4e]"
                                    >
                                        Checklist & Build
                                        <ArrowUpRight className="h-3 w-3" />
                                    </Link>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* New Demo Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
                    <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <div className="flex items-center gap-2">
                                <Presentation className="h-5 w-5 text-[#101D35]" />
                                <h2 className="font-display text-base font-bold text-[#101D35]">
                                    Add Portfolio Demo Item
                                </h2>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowCreateModal(false)}
                                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <form onSubmit={handleCreate} className="mt-4 space-y-3">
                            <div>
                                <label className="text-xs font-semibold text-slate-700">
                                    Demo Name *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={form.data.name}
                                    onChange={(e) => form.setData('name', e.target.value)}
                                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-semibold text-slate-700">
                                        Service Line *
                                    </label>
                                    <select
                                        value={form.data.service_line}
                                        onChange={(e) =>
                                            form.setData('service_line', e.target.value)
                                        }
                                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                                    >
                                        {serviceLines.map((sl) => (
                                            <option key={sl} value={sl}>
                                                {sl}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-700">
                                        Assigned PIC *
                                    </label>
                                    <select
                                        value={form.data.pic_user_id}
                                        onChange={(e) =>
                                            form.setData('pic_user_id', e.target.value)
                                        }
                                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                                    >
                                        {users.map((u) => (
                                            <option key={u.id} value={u.id}>
                                                {u.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-semibold text-slate-700">
                                        Start Date
                                    </label>
                                    <input
                                        type="date"
                                        value={form.data.start_date}
                                        onChange={(e) => form.setData('start_date', e.target.value)}
                                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-700">
                                        Target End Date
                                    </label>
                                    <input
                                        type="date"
                                        value={form.data.target_end_date}
                                        onChange={(e) =>
                                            form.setData('target_end_date', e.target.value)
                                        }
                                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-700">
                                    Purpose
                                </label>
                                <textarea
                                    rows={2}
                                    value={form.data.purpose}
                                    onChange={(e) => form.setData('purpose', e.target.value)}
                                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                                />
                            </div>
                            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={form.processing}
                                    className="rounded-lg bg-[#101D35] px-4 py-2 text-xs font-semibold text-white"
                                >
                                    Create Demo
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AppShell>
    );
}
