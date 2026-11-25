import { StatusBadge } from '@/Components/shared/StatusBadge';
import { AppShell } from '@/Layouts/AppShell';
import { cn, formatShortDate } from '@/lib/utils';
import type { PageProps } from '@/types';
import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    ArrowUpRight,
    Briefcase,
    CheckCircle2,
    Layers,
    Plus,
    Ticket,
    Users,
    X,
} from 'lucide-react';
import { useState, type FormEvent } from 'react';

interface ProjectRow {
    id: number;
    code: string;
    name: string;
    company_name: string | null;
    service_line: string;
    status: string;
    start_date: string | null;
    target_end_date: string | null;
    manager_name: string | null;
    tech_lead_name: string | null;
    total_stages: number;
    completed_stages: number;
    current_stage_name: string;
    requirements_count: number;
    tickets_count: number;
}

interface ProjectsIndexProps extends PageProps {
    projects: ProjectRow[];
    companies: { id: number; name: string }[];
    users: { id: number; name: string }[];
    serviceLines: string[];
    canCreate: boolean;
}

export default function ProjectsIndex({
    projects,
    companies,
    users,
    serviceLines,
    canCreate,
}: ProjectsIndexProps) {
    const [selectedLine, setSelectedLine] = useState<string>('');
    const [showCreateModal, setShowCreateModal] = useState(false);

    const form = useForm({
        company_id: companies[0]?.id ? String(companies[0].id) : '',
        name: '',
        service_line: serviceLines[0] ?? 'Website Development & CMS',
        scope_summary: '',
        start_date: new Date().toISOString().slice(0, 10),
        target_end_date: '',
        manager_user_id: users[1]?.id ? String(users[1].id) : String(users[0]?.id ?? ''),
        tech_lead_user_id: users[2]?.id ? String(users[2].id) : String(users[0]?.id ?? ''),
    });

    const handleFilter = (line: string) => {
        setSelectedLine(line);
        router.get(
            '/projects',
            line ? { service_line: line } : {},
            { preserveState: true, replace: true },
        );
    };

    const handleCreate = (e: FormEvent) => {
        e.preventDefault();
        form.post('/projects', {
            onSuccess: () => {
                form.reset('name', 'scope_summary', 'target_end_date');
                setShowCreateModal(false);
            },
        });
    };

    const webCount = projects.filter((p) => p.service_line === 'Website Development & CMS').length;
    const customCount = projects.filter(
        (p) => p.service_line === 'Custom Software Development',
    ).length;

    return (
        <AppShell
            title="Project Management & Delivery"
            subtitle="Sheet 09 workflows: Website Development & CMS (12 stages) & Custom Software Development (13 stages)"
            actions={
                canCreate && (
                    <button
                        type="button"
                        onClick={() => setShowCreateModal(true)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#101D35] px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-[#192c4e]"
                    >
                        <Plus className="h-4 w-4" />
                        New Project
                    </button>
                )
            }
        >
            <Head title="Projects — KDMS" />

            {/* Summary Strip */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                    <p className="text-[11px] font-medium text-slate-500">Total Projects</p>
                    <p className="mt-0.5 text-xl font-bold text-[#101D35]">{projects.length}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                    <p className="text-[11px] font-medium text-slate-500">
                        Website Development & CMS
                    </p>
                    <p className="mt-0.5 text-xl font-bold text-blue-700">{webCount}</p>
                    <p className="text-[11px] text-slate-400">12 gated stages per project</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                    <p className="text-[11px] font-medium text-slate-500">
                        Custom Software Development
                    </p>
                    <p className="mt-0.5 text-xl font-bold text-emerald-700">{customCount}</p>
                    <p className="text-[11px] text-slate-400">13 gated stages per project</p>
                </div>
            </div>

            {/* Service Line Filter Pills */}
            <div className="mt-4 flex flex-wrap items-center gap-2">
                {['', ...serviceLines].map((line) => (
                    <button
                        key={line || 'all'}
                        type="button"
                        onClick={() => handleFilter(line)}
                        className={cn(
                            'rounded-lg border px-3 py-1.5 text-xs font-semibold transition',
                            selectedLine === line
                                ? 'border-[#101D35] bg-[#101D35] text-white'
                                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
                        )}
                    >
                        {line || 'All Service Lines'}
                    </button>
                ))}
            </div>

            {/* Projects List */}
            {projects.length === 0 ? (
                <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
                    <Briefcase className="mx-auto h-10 w-10 text-slate-300" />
                    <h3 className="mt-3 text-sm font-bold text-[#101D35]">No delivery projects yet</h3>
                    <p className="mt-1 text-xs text-slate-500">
                        Convert a Won opportunity from the Sales Pipeline or create a project directly to start stage-gated delivery.
                    </p>
                    <div className="mt-4 flex justify-center gap-2">
                        <Link
                            href="/crm/leads"
                            className="rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-semibold text-[#101D35] hover:bg-slate-50"
                        >
                            Go to Sales Pipeline
                        </Link>
                        {canCreate && (
                            <button
                                type="button"
                                onClick={() => setShowCreateModal(true)}
                                className="rounded-lg bg-[#101D35] px-3.5 py-2 text-xs font-semibold text-white"
                            >
                                Create Project
                            </button>
                        )}
                    </div>
                </div>
            ) : (
                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {projects.map((p) => {
                        const pct =
                            p.total_stages > 0
                                ? Math.round((p.completed_stages / p.total_stages) * 100)
                                : 0;
                        return (
                            <Link
                                key={p.id}
                                href={`/projects/${p.id}`}
                                className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 transition hover:border-[#101D35]/40 hover:shadow-xs"
                            >
                                <div>
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="font-mono text-xs font-bold text-slate-500">
                                            {p.code}
                                        </span>
                                        <StatusBadge label={p.status} />
                                    </div>
                                    <h3 className="mt-2 text-base font-bold text-[#101D35] group-hover:text-blue-700">
                                        {p.name}
                                    </h3>
                                    <p className="text-xs text-slate-500">
                                        {p.company_name} • {p.service_line}
                                    </p>

                                    <div className="mt-4">
                                        <div className="flex items-center justify-between text-[11px]">
                                            <span className="font-medium text-slate-600">
                                                Stage: {p.current_stage_name}
                                            </span>
                                            <span className="font-bold text-[#101D35]">
                                                {p.completed_stages}/{p.total_stages} ({pct}%)
                                            </span>
                                        </div>
                                        <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                                            <div
                                                className="h-full rounded-full bg-[#101D35] transition-all"
                                                style={{ width: `${pct}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-[11px] text-slate-500">
                                    <div className="flex items-center gap-3">
                                        <span className="inline-flex items-center gap-1">
                                            <Layers className="h-3.5 w-3.5" />
                                            {p.requirements_count} Req
                                        </span>
                                        <span className="inline-flex items-center gap-1">
                                            <Ticket className="h-3.5 w-3.5" />
                                            {p.tickets_count} Tickets
                                        </span>
                                        <span className="inline-flex items-center gap-1">
                                            <Users className="h-3.5 w-3.5" />
                                            {p.manager_name?.split(' ')[0] ?? 'PM'}
                                        </span>
                                    </div>
                                    <span className="inline-flex items-center gap-0.5 font-semibold text-[#101D35]">
                                        {formatShortDate(p.target_end_date)}
                                        <ArrowUpRight className="h-3.5 w-3.5" />
                                    </span>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}

            {/* Create Project Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
                    <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <h2 className="font-display text-base font-bold text-[#101D35]">
                                Launch New Delivery Project
                            </h2>
                            <button
                                type="button"
                                onClick={() => setShowCreateModal(false)}
                                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <form onSubmit={handleCreate} className="mt-4 space-y-3">
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <div className="sm:col-span-2">
                                    <label className="text-xs font-semibold text-slate-700">
                                        Client Company *
                                    </label>
                                    <select
                                        required
                                        value={form.data.company_id}
                                        onChange={(e) => form.setData('company_id', e.target.value)}
                                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                                    >
                                        {companies.map((c) => (
                                            <option key={c.id} value={c.id}>
                                                {c.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="text-xs font-semibold text-slate-700">
                                        Project Name *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={form.data.name}
                                        onChange={(e) => form.setData('name', e.target.value)}
                                        placeholder="e.g. Company Website & CMS Portal"
                                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                                    />
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="text-xs font-semibold text-slate-700">
                                        Service Line Workflow *
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
                                                {sl} (
                                                {sl === 'Website Development & CMS'
                                                    ? '12 Stages'
                                                    : '13 Stages'}
                                                )
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-700">
                                        Project / Ops Manager *
                                    </label>
                                    <select
                                        value={form.data.manager_user_id}
                                        onChange={(e) =>
                                            form.setData('manager_user_id', e.target.value)
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
                                <div>
                                    <label className="text-xs font-semibold text-slate-700">
                                        Tech Lead *
                                    </label>
                                    <select
                                        value={form.data.tech_lead_user_id}
                                        onChange={(e) =>
                                            form.setData('tech_lead_user_id', e.target.value)
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
                                <div className="sm:col-span-2">
                                    <label className="text-xs font-semibold text-slate-700">
                                        Scope Summary
                                    </label>
                                    <textarea
                                        rows={2}
                                        value={form.data.scope_summary}
                                        onChange={(e) =>
                                            form.setData('scope_summary', e.target.value)
                                        }
                                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                                    />
                                </div>
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
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#101D35] px-4 py-2 text-xs font-semibold text-white"
                                >
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    Create & Seed Stages
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AppShell>
    );
}
