import { PipelineKanbanBoard, type PipelineLeadRow } from '@/Components/crm/PipelineKanbanBoard';
import { StatusBadge } from '@/Components/shared/StatusBadge';
import { AppShell } from '@/Layouts/AppShell';
import { cn, formatShortDate, getInitials } from '@/lib/utils';
import type { PageProps } from '@/types';
import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    AlertCircle,
    ArrowUpRight,
    Building2,
    CalendarClock,
    CheckCircle2,
    Filter,
    Globe,
    Handshake,
    Kanban,
    ListFilter,
    Plus,
    Search,
    Table2,
    X,
} from 'lucide-react';
import { useState, type FormEvent } from 'react';

interface LeadRow {
    id: number;
    code: string;
    company_id: number;
    company_name: string | null;
    industry: string | null;
    website: string | null;
    contact_name: string | null;
    contact_role: string | null;
    contact_phone: string | null;
    contact_email: string | null;
    potential_needs: string | null;
    service_line: string;
    source: string | null;
    stage: string;
    pic_user_id: number | null;
    pic_name: string | null;
    contacted_at: string | null;
    next_follow_up_at: string | null;
    estimated_value: number | null;
    discovery_meeting_at: string | null;
    proposal_sent_at: string | null;
    closed_at: string | null;
    data_status: string;
    follow_up_overdue: boolean;
    converted_project: { id: number; code: string } | null;
}

interface CrmIndexProps extends PageProps {
    viewMode: string;
    leads: LeadRow[];
    stageCounts: Record<string, number>;
    stages: string[];
    industries: string[];
    serviceLines: string[];
    users: { id: number; name: string }[];
    filters: {
        search: string;
        stage: string;
        industry: string;
        service_line: string;
    };
    canCreate: boolean;
}

const STAGE_TOP_BAR: Record<string, string> = {
    'Lead Identified': 'border-t-slate-400',
    'Initial Contact': 'border-t-sky-500',
    Responded: 'border-t-blue-500',
    'Discovery Meeting': 'border-t-indigo-500',
    'Requirement Analysis': 'border-t-violet-500',
    'Proposal Sent': 'border-t-cyan-600',
    Negotiation: 'border-t-amber-500',
    Won: 'border-t-emerald-500',
    Lost: 'border-t-rose-500',
    'Follow-up Later': 'border-t-orange-400',
};

function formatCurrency(val: number | null): string {
    if (val === null) return 'Pending Pricing';
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
    }).format(val);
}

export default function CrmIndex({
    viewMode: initialViewMode,
    leads,
    stageCounts,
    stages,
    industries,
    serviceLines,
    users,
    filters,
    canCreate,
}: CrmIndexProps) {
    const [view, setView] = useState<'kanban' | 'table'>(
        initialViewMode === 'table' ? 'table' : 'kanban',
    );
    const [showCreateModal, setShowCreateModal] = useState(false);

    const [search, setSearch] = useState(filters.search);
    const [stageFilter, setStageFilter] = useState(filters.stage);
    const [industryFilter, setIndustryFilter] = useState(filters.industry);
    const [serviceFilter, setServiceFilter] = useState(filters.service_line);

    const form = useForm({
        company_name: '',
        industry: industries[0] ?? 'Other',
        location: '',
        website: '',
        contact_name: '',
        contact_role: '',
        contact_email: '',
        contact_phone: '',
        potential_needs: '',
        service_line: serviceLines[0] ?? 'Website Development & CMS',
        source: 'Direct Outreach',
        pic_user_id: users[0]?.id ? String(users[0].id) : '',
        estimated_value: '',
    });

    const applyFilters = (next?: Partial<typeof filters>) => {
        const params = {
            view,
            search: next?.search ?? search,
            stage: next?.stage ?? stageFilter,
            industry: next?.industry ?? industryFilter,
            service_line: next?.service_line ?? serviceFilter,
        };
        router.get('/crm/leads', params, { preserveState: true, replace: true });
    };

    const resetFilters = () => {
        setSearch('');
        setStageFilter('');
        setIndustryFilter('');
        setServiceFilter('');
        router.get('/crm/leads', { view }, { preserveState: true, replace: true });
    };

    const handleCreate = (e: FormEvent) => {
        e.preventDefault();
        form.post('/crm/leads', {
            onSuccess: () => {
                form.reset();
                setShowCreateModal(false);
            },
        });
    };

    const activeCount = leads.filter((l) => !['Won', 'Lost'].includes(l.stage)).length;
    const evaluationCount = leads.filter((l) =>
        ['Discovery Meeting', 'Requirement Analysis', 'Proposal Sent', 'Negotiation'].includes(
            l.stage,
        ),
    ).length;
    const wonCount = leads.filter((l) => l.stage === 'Won').length;
    const overdueFollowUps = leads.filter((l) => l.follow_up_overdue).length;

    return (
        <AppShell
            title="Sales & Client Pipeline"
            subtitle="10-stage CRM funnel imported from Sheet 08 (Sales & Client Pipeline)"
            actions={
                <div className="flex items-center gap-2">
                    <div className="flex rounded-lg border border-slate-200 bg-white p-0.5">
                        <button
                            type="button"
                            onClick={() => setView('kanban')}
                            className={cn(
                                'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition',
                                view === 'kanban'
                                    ? 'bg-[#101D35] text-white'
                                    : 'text-slate-600 hover:text-slate-900',
                            )}
                        >
                            <Kanban className="h-3.5 w-3.5" />
                            Pipeline
                        </button>
                        <button
                            type="button"
                            onClick={() => setView('table')}
                            className={cn(
                                'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition',
                                view === 'table'
                                    ? 'bg-[#101D35] text-white'
                                    : 'text-slate-600 hover:text-slate-900',
                            )}
                        >
                            <Table2 className="h-3.5 w-3.5" />
                            Table
                        </button>
                    </div>
                    {canCreate && (
                        <button
                            type="button"
                            onClick={() => setShowCreateModal(true)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-[#101D35] px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-[#192c4e]"
                        >
                            <Plus className="h-4 w-4" />
                            New Prospect
                        </button>
                    )}
                </div>
            }
        >
            <Head title="Sales Pipeline — KDMS" />

            {/* Summary Strip */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                    <p className="text-[11px] font-medium text-slate-500">Total Prospects</p>
                    <p className="mt-0.5 text-xl font-bold text-[#101D35]">{leads.length}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                    <p className="text-[11px] font-medium text-slate-500">Active Pipeline</p>
                    <p className="mt-0.5 text-xl font-bold text-blue-700">{activeCount}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                    <p className="text-[11px] font-medium text-slate-500">Discovery → Neg.</p>
                    <p className="mt-0.5 text-xl font-bold text-indigo-700">{evaluationCount}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                    <p className="text-[11px] font-medium text-slate-500">Won Deals</p>
                    <p className="mt-0.5 text-xl font-bold text-emerald-700">{wonCount}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                    <p className="text-[11px] font-medium text-slate-500">Follow-up Overdue</p>
                    <p
                        className={cn(
                            'mt-0.5 text-xl font-bold',
                            overdueFollowUps > 0 ? 'text-rose-600' : 'text-slate-700',
                        )}
                    >
                        {overdueFollowUps}
                    </p>
                </div>
            </div>

            {/* Filter Toolbar */}
            <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3">
                <div className="relative min-w-[220px] flex-1">
                    <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                        placeholder="Search company, prospect code, or needs..."
                        className="w-full rounded-lg border border-slate-200 py-1.5 pr-3 pl-9 text-xs text-slate-800 placeholder:text-slate-400 focus:border-[#101D35] focus:outline-none"
                    />
                </div>
                <select
                    value={stageFilter}
                    onChange={(e) => {
                        setStageFilter(e.target.value);
                        applyFilters({ stage: e.target.value });
                    }}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-700 focus:border-[#101D35] focus:outline-none"
                >
                    <option value="">All 10 Stages</option>
                    {stages.map((s) => (
                        <option key={s} value={s}>
                            {s} ({stageCounts[s] ?? 0})
                        </option>
                    ))}
                </select>
                <select
                    value={industryFilter}
                    onChange={(e) => {
                        setIndustryFilter(e.target.value);
                        applyFilters({ industry: e.target.value });
                    }}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-700 focus:border-[#101D35] focus:outline-none"
                >
                    <option value="">All Industries</option>
                    {industries.map((ind) => (
                        <option key={ind} value={ind}>
                            {ind}
                        </option>
                    ))}
                </select>
                <select
                    value={serviceFilter}
                    onChange={(e) => {
                        setServiceFilter(e.target.value);
                        applyFilters({ service_line: e.target.value });
                    }}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-700 focus:border-[#101D35] focus:outline-none"
                >
                    <option value="">All Service Lines</option>
                    {serviceLines.map((sl) => (
                        <option key={sl} value={sl}>
                            {sl}
                        </option>
                    ))}
                </select>
                <button
                    type="button"
                    onClick={() => applyFilters()}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                >
                    <Filter className="h-3.5 w-3.5" />
                    Apply
                </button>
                {(search || stageFilter || industryFilter || serviceFilter) && (
                    <button
                        type="button"
                        onClick={resetFilters}
                        className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                    >
                        <X className="h-3.5 w-3.5" />
                        Reset
                    </button>
                )}
            </div>

            {/* Kanban or Table */}
            {view === 'kanban' ? (
                <PipelineKanbanBoard
                    leads={leads as PipelineLeadRow[]}
                    stages={stages}
                    stageTopBar={STAGE_TOP_BAR}
                    formatCurrency={formatCurrency}
                />
            ) : (
                <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                            <thead className="bg-slate-50 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                                <tr>
                                    <th className="px-4 py-3">Prospect</th>
                                    <th className="px-4 py-3">Company & Contact</th>
                                    <th className="px-4 py-3">Service Line</th>
                                    <th className="px-4 py-3">Stage</th>
                                    <th className="px-4 py-3">Follow-Up</th>
                                    <th className="px-4 py-3">PIC</th>
                                    <th className="px-4 py-3">Est. Value</th>
                                    <th className="px-4 py-3 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {leads.map((lead) => (
                                    <tr key={lead.id} className="hover:bg-slate-50/70">
                                        <td className="px-4 py-3 align-top">
                                            <div className="font-mono text-xs font-semibold text-[#101D35]">
                                                {lead.code}
                                            </div>
                                            <div className="mt-1">
                                                <StatusBadge label={lead.data_status} />
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 align-top">
                                            <div className="font-semibold text-slate-900">
                                                {lead.company_name}
                                            </div>
                                            <div className="text-[11px] text-slate-500">
                                                {lead.industry}
                                                {lead.contact_name ? ` • ${lead.contact_name}` : ''}
                                            </div>
                                            {lead.potential_needs && (
                                                <div className="mt-0.5 line-clamp-1 max-w-xs text-[11px] text-slate-500">
                                                    {lead.potential_needs}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 align-top text-slate-700">
                                            {lead.service_line}
                                        </td>
                                        <td className="px-4 py-3 align-top">
                                            <StatusBadge label={lead.stage} />
                                        </td>
                                        <td className="px-4 py-3 align-top">
                                            {lead.next_follow_up_at ? (
                                                <span
                                                    className={cn(
                                                        'inline-flex items-center gap-1 font-medium',
                                                        lead.follow_up_overdue
                                                            ? 'text-rose-600'
                                                            : 'text-slate-700',
                                                    )}
                                                >
                                                    {lead.follow_up_overdue && (
                                                        <AlertCircle className="h-3.5 w-3.5" />
                                                    )}
                                                    {formatShortDate(lead.next_follow_up_at)}
                                                </span>
                                            ) : (
                                                <span className="text-slate-400">—</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 align-top text-slate-700">
                                            {lead.pic_name ?? '—'}
                                        </td>
                                        <td className="px-4 py-3 align-top font-medium text-slate-700">
                                            {formatCurrency(lead.estimated_value)}
                                        </td>
                                        <td className="px-4 py-3 text-right align-top">
                                            <Link
                                                href={`/crm/leads/${lead.id}`}
                                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-[#101D35] hover:bg-slate-100"
                                            >
                                                Open
                                                <ArrowUpRight className="h-3.5 w-3.5" />
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                                {leads.length === 0 && (
                                    <tr>
                                        <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                                            No prospects match your current filters.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Create Prospect Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
                    <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <div className="flex items-center gap-2">
                                <Handshake className="h-5 w-5 text-[#101D35]" />
                                <h2 className="font-display text-base font-bold text-[#101D35]">
                                    Add New Sales Prospect
                                </h2>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowCreateModal(false)}
                                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <form onSubmit={handleCreate} className="mt-4 space-y-4">
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <div className="sm:col-span-2">
                                    <label className="text-xs font-semibold text-slate-700">
                                        Company Name *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={form.data.company_name}
                                        onChange={(e) => form.setData('company_name', e.target.value)}
                                        placeholder="e.g. PT Nusantara Digital Solusi"
                                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-[#101D35] focus:outline-none"
                                    />
                                    {form.errors.company_name && (
                                        <p className="mt-1 text-[11px] text-rose-600">
                                            {form.errors.company_name}
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-700">
                                        Industry *
                                    </label>
                                    <select
                                        value={form.data.industry}
                                        onChange={(e) => form.setData('industry', e.target.value)}
                                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-[#101D35] focus:outline-none"
                                    >
                                        {industries.map((ind) => (
                                            <option key={ind} value={ind}>
                                                {ind}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-700">
                                        Service Line *
                                    </label>
                                    <select
                                        value={form.data.service_line}
                                        onChange={(e) => form.setData('service_line', e.target.value)}
                                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-[#101D35] focus:outline-none"
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
                                        Contact Person
                                    </label>
                                    <input
                                        type="text"
                                        value={form.data.contact_name}
                                        onChange={(e) => form.setData('contact_name', e.target.value)}
                                        placeholder="Decision maker name"
                                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-[#101D35] focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-700">
                                        Contact Role
                                    </label>
                                    <input
                                        type="text"
                                        value={form.data.contact_role}
                                        onChange={(e) => form.setData('contact_role', e.target.value)}
                                        placeholder="e.g. Director / Head of IT"
                                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-[#101D35] focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-700">
                                        Contact Email
                                    </label>
                                    <input
                                        type="email"
                                        value={form.data.contact_email}
                                        onChange={(e) => form.setData('contact_email', e.target.value)}
                                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-[#101D35] focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-700">
                                        Contact Phone / WhatsApp
                                    </label>
                                    <input
                                        type="text"
                                        value={form.data.contact_phone}
                                        onChange={(e) => form.setData('contact_phone', e.target.value)}
                                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-[#101D35] focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-700">
                                        Website
                                    </label>
                                    <input
                                        type="text"
                                        value={form.data.website}
                                        onChange={(e) => form.setData('website', e.target.value)}
                                        placeholder="https://..."
                                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-[#101D35] focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-700">
                                        Assigned PIC *
                                    </label>
                                    <select
                                        required
                                        value={form.data.pic_user_id}
                                        onChange={(e) => form.setData('pic_user_id', e.target.value)}
                                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-[#101D35] focus:outline-none"
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
                                        Estimated Deal Value (IDR)
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={form.data.estimated_value}
                                        onChange={(e) => form.setData('estimated_value', e.target.value)}
                                        placeholder="Leave blank if pending approval"
                                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-[#101D35] focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-700">
                                        Lead Source
                                    </label>
                                    <input
                                        type="text"
                                        value={form.data.source}
                                        onChange={(e) => form.setData('source', e.target.value)}
                                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-[#101D35] focus:outline-none"
                                    />
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="text-xs font-semibold text-slate-700">
                                        Potential Business Needs
                                    </label>
                                    <textarea
                                        rows={2}
                                        value={form.data.potential_needs}
                                        onChange={(e) =>
                                            form.setData('potential_needs', e.target.value)
                                        }
                                        placeholder="Describe business problem or desired software/website solution..."
                                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-[#101D35] focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={form.processing}
                                    className="rounded-lg bg-[#101D35] px-4 py-2 text-xs font-semibold text-white hover:bg-[#192c4e] disabled:opacity-50"
                                >
                                    {form.processing ? 'Saving...' : 'Create Prospect'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AppShell>
    );
}
