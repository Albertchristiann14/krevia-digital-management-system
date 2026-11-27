import { StatCard } from '@/Components/shared/StatCard';
import { StatusBadge } from '@/Components/shared/StatusBadge';
import { AppShell } from '@/Layouts/AppShell';
import { UserAvatar } from '@/Components/shared/UserAvatar';
import { getInitials } from '@/lib/utils';
import type { PageProps } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import {
    Activity,
    AlertTriangle,
    ArrowRight,
    CalendarClock,
    CheckCircle2,
    ClipboardList,
    Clock,
    Compass,
    Handshake,
    Layers,
    Briefcase,
    Radio,
    Wallet,
} from 'lucide-react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

interface DashboardProps extends PageProps {
    metrics: {
        total_tasks: number;
        completed_tasks: number;
        in_progress_tasks: number;
        overdue_tasks: number;
        due_soon_tasks: number;
        blocked_tasks: number;
        avg_progress: number;
        team_members: number;
        departments: number;
        pending_confirmations: number;
        pending_task_approvals_count?: number;
        roadmap_months: number;
        raci_activities: number;
        total_prospects: number;
        discovery_meetings: number;
        proposals_sent: number;
        won_projects: number;
        active_projects: number;
        revenue_received?: number | null;
        total_expenses?: number | null;
        cash_balance?: number | null;
    };
    canViewFinance?: boolean;
    tasksByStatus: { status: string; count: number; pct: number }[];
    monthlyRoadmap: {
        id: number;
        month: string;
        short_month: string;
        phase: string;
        due_tasks: number;
        completed_tasks: number;
        target_contacts: number;
        target_meetings: number;
        target_proposals: number;
        target_won: number;
        target_status: string;
    }[];
    team: {
        id: number;
        user_id: number;
        code: string;
        name: string;
        position: string;
        department: string;
        department_color: string;
        weekly_capacity_hours: number | null;
        capacity_status: string;
        coordination_status: string;
        avatar_color: string;
        total_tasks: number;
        completed_tasks: number;
        active_tasks: number;
        overdue_tasks: number;
    }[];
    upcomingDeadlines: {
        id: number;
        code: string;
        title: string;
        pic_name: string | null;
        priority: string;
        deadline: string;
        status: string;
        deadline_status: string;
    }[];
    pendingApprovals: {
        id: number;
        code: string;
        title: string;
        pic_name: string | null;
        deadline: string;
    }[];
    myTasks: {
        id: number;
        code: string;
        title: string;
        priority: string;
        deadline: string;
        status: string;
        progress_pct: number;
        deadline_status: string;
    }[];
    recentAudits: {
        id: number;
        event: string;
        summary: string;
        actor: string;
        created_at: string | null;
    }[];
    recentAnnouncements?: {
        id: number;
        code: string;
        title: string;
        body: string;
        priority: string;
        publisher: string;
        published_at: string | null;
    }[];
    periodFilter?: {
        period: string;
        date_from: string;
        date_to: string;
        label: string;
    };
}

const STATUS_COLORS: Record<string, string> = {
    'Not Started': '#94A3B8',
    'In Progress': '#2563EB',
    'Under Review': '#D97706',
    Completed: '#16A34A',
    'On Hold': '#7C3AED',
    Cancelled: '#DC2626',
};

export default function DashboardIndex({
    metrics,
    tasksByStatus,
    monthlyRoadmap,
    team,
    upcomingDeadlines,
    pendingApprovals,
    myTasks,
    recentAudits,
    recentAnnouncements = [],
    periodFilter = { period: 'all', date_from: '', date_to: '', label: 'All Time' },
    canViewFinance,
}: DashboardProps) {
    const { auth } = usePage<PageProps>().props;
    const user = auth.user;
    const [selectedPeriod, setSelectedPeriod] = useState(periodFilter.period);
    const [dateFrom, setDateFrom] = useState(periodFilter.date_from);
    const [dateTo, setDateTo] = useState(periodFilter.date_to);

    const applyPeriod = (nextPeriod: string, nextFrom = dateFrom, nextTo = dateTo) => {
        setSelectedPeriod(nextPeriod);
        if (nextPeriod === 'custom' && !nextFrom && !nextTo) {
            return;
        }
        router.get(
            '/dashboard',
            {
                period: nextPeriod,
                ...(nextPeriod === 'custom' ? { date_from: nextFrom, date_to: nextTo } : {}),
            },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    return (
        <AppShell
            title="Executive Dashboard"
            subtitle={`Welcome, ${user?.name ?? 'Member'} · Role View: ${user?.roles[0] ?? 'Member'}`}
            actions={
                <>
                    <Link
                        href="/workplan/roadmap"
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                        <Compass className="h-4 w-4 text-[#101D35]" />
                        Annual Roadmap
                    </Link>
                    <Link
                        href="/tasks"
                        className="inline-flex items-center gap-2 rounded-lg bg-[#101D35] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#1A2D4E]"
                    >
                        <ClipboardList className="h-4 w-4" />
                        Open Task Tracker
                    </Link>
                </>
            }
        >
            <Head title="Dashboard" />

            {/* Top Announcements Banner */}
            {recentAnnouncements.length > 0 && (
                <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                    <div className="mb-3 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#101D35] text-white">
                                <Radio className="h-3.5 w-3.5" />
                            </span>
                            <div>
                                <h2 className="text-xs font-bold tracking-wide text-[#101D35] uppercase">
                                    Latest Announcements
                                </h2>
                            </div>
                        </div>
                        <Link
                            href="/announcements"
                            prefetch
                            className="inline-flex items-center gap-1 text-xs font-semibold text-[#101D35] hover:underline"
                        >
                            View all <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                    </div>
                    <div className="grid gap-3 md:grid-cols-3">
                        {recentAnnouncements.map((ann) => {
                            const priorityStyle =
                                ann.priority === 'Mendesak'
                                    ? 'border-rose-200 bg-rose-50/70'
                                    : ann.priority === 'Penting'
                                      ? 'border-amber-200 bg-amber-50/70'
                                      : 'border-slate-200 bg-slate-50/70';
                            const badgeStyle =
                                ann.priority === 'Mendesak'
                                    ? 'bg-rose-600 text-white'
                                    : ann.priority === 'Penting'
                                      ? 'bg-amber-500 text-white'
                                      : 'bg-[#101D35] text-white';

                            return (
                                <div
                                    key={ann.id}
                                    className={`flex flex-col justify-between rounded-lg border p-3 ${priorityStyle}`}
                                >
                                    <div>
                                        <div className="mb-1.5 flex items-center justify-between gap-2">
                                            <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${badgeStyle}`}>
                                                {ann.priority}
                                            </span>
                                            <span className="font-mono text-[10px] text-slate-500">{ann.code}</span>
                                        </div>
                                        <p className="line-clamp-1 text-xs font-bold text-slate-900">{ann.title}</p>
                                        <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-slate-600">
                                            {ann.body}
                                        </p>
                                    </div>
                                    <div className="mt-2 flex items-center justify-between border-t border-slate-200/60 pt-1.5 text-[10px] text-slate-500">
                                        <span>By {ann.publisher}</span>
                                        <span>{ann.published_at ?? '—'}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Top Row: Live Database Metrics */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
                <Link href="/tasks" className="block transition hover:opacity-95">
                    <StatCard
                        dark
                        label="Total Tasks"
                        value={metrics.total_tasks}
                        subtitle={`Avg progress ${metrics.avg_progress}% across ${metrics.roadmap_months} months`}
                        icon={Layers}
                    />
                </Link>
                <Link href="/tasks?status=Completed" className="block transition hover:opacity-95">
                    <StatCard
                        label="Completed"
                        value={metrics.completed_tasks}
                        subtitle="Evidence-verified & approved"
                        icon={CheckCircle2}
                        accent="green"
                    />
                </Link>
                <Link href="/tasks?status=In+Progress" className="block transition hover:opacity-95">
                    <StatCard
                        label="Active Tasks"
                        value={metrics.in_progress_tasks}
                        subtitle="In Progress + Under Review"
                        icon={Clock}
                        accent="blue"
                    />
                </Link>
                <Link href="/tasks?overdue_only=1" className="block transition hover:opacity-95">
                    <StatCard
                        label="Overdue / Due Soon"
                        value={`${metrics.overdue_tasks} / ${metrics.due_soon_tasks}`}
                        subtitle={`${metrics.blocked_tasks} blocked tasks flagged`}
                        icon={AlertTriangle}
                        accent={metrics.overdue_tasks > 0 ? 'red' : 'amber'}
                    />
                </Link>
                <Link href="/tasks?status=Under+Review" className="block transition hover:opacity-95">
                    <StatCard
                        label="Pending Approvals"
                        value={metrics.pending_task_approvals_count ?? pendingApprovals.length}
                        subtitle={`Tasks in Under Review · ${metrics.pending_confirmations} org items pending`}
                        icon={CalendarClock}
                        accent="amber"
                    />
                </Link>
            </div>

            {/* Period Filter Bar for Commercial & Financial Metrics */}
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                <div className="text-xs">
                    <span className="font-semibold text-[#101D35] dark:text-white">
                        Commercial &amp; Financial Period:
                    </span>{' '}
                    <span className="font-medium text-slate-500 dark:text-slate-400">
                        {periodFilter.label}
                    </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <select
                        value={selectedPeriod}
                        onChange={(e) => applyPeriod(e.target.value)}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium"
                    >
                        <option value="all">All Time</option>
                        <option value="this_month">This Month</option>
                        <option value="last_month">Last Month</option>
                        <option value="this_quarter">This Quarter</option>
                        <option value="last_quarter">Last Quarter</option>
                        <option value="this_year">This Year</option>
                        <option value="custom">Custom Date Range</option>
                    </select>

                    {selectedPeriod === 'custom' && (
                        <>
                            <input
                                type="date"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                                className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
                            />
                            <span className="text-xs text-slate-400">to</span>
                            <input
                                type="date"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                                className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
                            />
                            <button
                                type="button"
                                onClick={() => applyPeriod('custom', dateFrom, dateTo)}
                                className="rounded-lg bg-[#101D35] px-3 py-1.5 text-xs font-semibold text-white"
                            >
                                Apply
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Commercial & Project Delivery Snapshot */}
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Link
                    href="/crm/leads"
                    className="group flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3.5 transition hover:border-[#101D35]/40 hover:shadow-xs"
                >
                    <div>
                        <p className="text-xs font-medium text-slate-500">Total Prospects</p>
                        <p className="mt-0.5 text-xl font-bold text-[#101D35]">{metrics.total_prospects}</p>
                        <p className="text-[11px] text-slate-500">
                            {metrics.discovery_meetings} Discovery • {metrics.proposals_sent} Proposals
                        </p>
                    </div>
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-700 group-hover:bg-[#101D35] group-hover:text-white transition">
                        <Handshake className="h-4 w-4" />
                    </div>
                </Link>
                <Link
                    href="/crm/leads?stage=Discovery%20Meeting"
                    className="group flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3.5 transition hover:border-[#101D35]/40 hover:shadow-xs"
                >
                    <div>
                        <p className="text-xs font-medium text-slate-500">Discovery & Proposals</p>
                        <p className="mt-0.5 text-xl font-bold text-[#101D35]">
                            {metrics.discovery_meetings} / {metrics.proposals_sent}
                        </p>
                        <p className="text-[11px] text-slate-500">Active commercial evaluations</p>
                    </div>
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-700 group-hover:bg-[#101D35] group-hover:text-white transition">
                        <Compass className="h-4 w-4" />
                    </div>
                </Link>
                <Link
                    href="/crm/leads?stage=Won"
                    className="group flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3.5 transition hover:border-[#101D35]/40 hover:shadow-xs"
                >
                    <div>
                        <p className="text-xs font-medium text-slate-500">Won Opportunities</p>
                        <p className="mt-0.5 text-xl font-bold text-emerald-700">{metrics.won_projects}</p>
                        <p className="text-[11px] text-slate-500">Converted or ready for kickoff</p>
                    </div>
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 group-hover:bg-[#101D35] group-hover:text-white transition">
                        <CheckCircle2 className="h-4 w-4" />
                    </div>
                </Link>
                <Link
                    href="/projects"
                    className="group flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3.5 transition hover:border-[#101D35]/40 hover:shadow-xs"
                >
                    <div>
                        <p className="text-xs font-medium text-slate-500">Active Delivery Projects</p>
                        <p className="mt-0.5 text-xl font-bold text-[#101D35]">{metrics.active_projects}</p>
                        <p className="text-[11px] text-slate-500">Web & Custom Software workflows</p>
                    </div>
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-[#101D35] group-hover:bg-[#101D35] group-hover:text-white transition">
                        <Briefcase className="h-4 w-4" />
                    </div>
                </Link>
            </div>

            {canViewFinance && (
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <Link
                        href="/finance"
                        className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3.5 transition hover:border-[#101D35]/40"
                    >
                        <div>
                            <p className="text-xs font-medium text-slate-500">Revenue Received</p>
                            <p className="mt-0.5 text-lg font-bold text-emerald-700">
                                {new Intl.NumberFormat('id-ID', {
                                    style: 'currency',
                                    currency: 'IDR',
                                    maximumFractionDigits: 0,
                                }).format(metrics.revenue_received ?? 0)}
                            </p>
                            <p className="text-[11px] text-slate-400">Confirmed ledger income only</p>
                        </div>
                        <Wallet className="h-5 w-5 text-emerald-600" />
                    </Link>
                    <Link
                        href="/finance"
                        className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3.5 transition hover:border-[#101D35]/40"
                    >
                        <div>
                            <p className="text-xs font-medium text-slate-500">Expenses</p>
                            <p className="mt-0.5 text-lg font-bold text-rose-700">
                                {new Intl.NumberFormat('id-ID', {
                                    style: 'currency',
                                    currency: 'IDR',
                                    maximumFractionDigits: 0,
                                }).format(metrics.total_expenses ?? 0)}
                            </p>
                            <p className="text-[11px] text-slate-400">Actual operating outflows</p>
                        </div>
                        <Wallet className="h-5 w-5 text-rose-600" />
                    </Link>
                    <Link
                        href="/finance"
                        className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3.5 transition hover:border-[#101D35]/40"
                    >
                        <div>
                            <p className="text-xs font-medium text-slate-500">Cash Balance</p>
                            <p className="mt-0.5 text-lg font-bold text-[#101D35]">
                                {new Intl.NumberFormat('id-ID', {
                                    style: 'currency',
                                    currency: 'IDR',
                                    maximumFractionDigits: 0,
                                }).format(metrics.cash_balance ?? 0)}
                            </p>
                            <p className="text-[11px] text-slate-400">Opening + Income − Expenses</p>
                        </div>
                        <Wallet className="h-5 w-5 text-[#101D35]" />
                    </Link>
                </div>
            )}

            {/* Charts Row: Annual Workplan Timeline + Task Status Distribution */}
            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-2">
                    <div className="mb-4 flex items-center justify-between">
                        <div>
                            <h2 className="font-display text-base font-bold text-[#101D35]">
                                Annual Workplan Load (Dec 2026 – Dec 2027)
                            </h2>
                            <p className="text-xs text-slate-500">
                                Monthly due tasks vs. completed tasks calculated from database
                            </p>
                        </div>
                        <Link
                            href="/workplan/monthly"
                            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
                        >
                            Monthly View <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                    </div>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={monthlyRoadmap} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                                <XAxis dataKey="short_month" tick={{ fontSize: 11, fill: '#64748B' }} />
                                <YAxis tick={{ fontSize: 11, fill: '#64748B' }} allowDecimals={false} />
                                <Tooltip
                                    contentStyle={{
                                        borderRadius: '10px',
                                        border: '1px solid #E2E8F0',
                                        fontSize: '12px',
                                    }}
                                />
                                <Bar dataKey="due_tasks" name="Scheduled Tasks" fill="#101D35" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="completed_tasks" name="Completed" fill="#16A34A" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-5">
                    <h2 className="font-display text-base font-bold text-[#101D35]">
                        Task Status Breakdown
                    </h2>
                    <p className="text-xs text-slate-500">Live distribution across 6 statuses</p>
                    <div className="mt-2 h-44 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={tasksByStatus.filter((s) => s.count > 0)}
                                    dataKey="count"
                                    nameKey="status"
                                    innerRadius={44}
                                    outerRadius={68}
                                    paddingAngle={2}
                                >
                                    {tasksByStatus
                                        .filter((s) => s.count > 0)
                                        .map((entry) => (
                                            <Cell
                                                key={entry.status}
                                                fill={STATUS_COLORS[entry.status] ?? '#64748B'}
                                            />
                                        ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="mt-2 space-y-1.5">
                        {tasksByStatus.map((row) => (
                            <div key={row.status} className="flex items-center justify-between text-xs">
                                <span className="flex items-center gap-2 text-slate-700">
                                    <span
                                        className="h-2.5 w-2.5 rounded-full"
                                        style={{ backgroundColor: STATUS_COLORS[row.status] ?? '#64748B' }}
                                    />
                                    {row.status}
                                </span>
                                <span className="font-mono font-semibold text-slate-900 tabular-nums">
                                    {row.count} ({row.pct}%)
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Bottom Grid: Team Performance + My Tasks + Upcoming Deadlines + Audit */}
            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Team Workload & Performance */}
                <div className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-2">
                    <div className="mb-4 flex items-center justify-between">
                        <div>
                            <h2 className="font-display text-base font-bold text-[#101D35]">
                                Team Workload &amp; Task Health
                            </h2>
                            <p className="text-xs text-slate-500">
                                Task distribution across the 7 members (matches Sheet 16 Dashboard)
                            </p>
                        </div>
                        <Link
                            href="/organization"
                            className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                        >
                            Team Directory
                        </Link>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-left text-xs">
                            <thead className="border-b border-slate-200 text-slate-500 uppercase">
                                <tr>
                                    <th className="py-2.5 pr-3">PIC</th>
                                    <th className="px-3 py-2.5 text-right">Total</th>
                                    <th className="px-3 py-2.5 text-right">Done</th>
                                    <th className="px-3 py-2.5 text-right">Active</th>
                                    <th className="px-3 py-2.5 text-right">Overdue</th>
                                    <th className="py-2.5 pl-3">Capacity</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {team.map((m) => (
                                    <tr key={m.id} className="hover:bg-slate-50/70">
                                        <td className="py-2.5 pr-3">
                                            <div className="flex items-center gap-2.5">
                                                <UserAvatar
                                                    name={m.name}
                                                    avatarUrl={(m as { avatar_url?: string | null }).avatar_url}
                                                    avatarColor={m.avatar_color}
                                                    size="xs"
                                                    className="h-7 w-7"
                                                />
                                                <div>
                                                    <p className="font-semibold text-slate-900">{m.name}</p>
                                                    <p className="text-[11px] text-slate-500">{m.department}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-3 py-2.5 text-right font-mono font-semibold tabular-nums">
                                            {m.total_tasks}
                                        </td>
                                        <td className="px-3 py-2.5 text-right font-mono font-semibold text-emerald-700 tabular-nums">
                                            {m.completed_tasks}
                                        </td>
                                        <td className="px-3 py-2.5 text-right font-mono font-semibold text-blue-700 tabular-nums">
                                            {m.active_tasks}
                                        </td>
                                        <td className="px-3 py-2.5 text-right font-mono font-semibold text-rose-700 tabular-nums">
                                            {m.overdue_tasks}
                                        </td>
                                        <td className="py-2.5 pl-3">
                                            {m.weekly_capacity_hours !== null ? (
                                                <span className="font-mono font-semibold text-slate-800">
                                                    {m.weekly_capacity_hours}h/wk
                                                </span>
                                            ) : (
                                                <StatusBadge label="Pending D-07" tone="amber" />
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Role-Specific Right Column */}
                <div className="space-y-6">
                    {/* My Open Tasks */}
                    <div className="rounded-xl border border-slate-200 bg-white p-5">
                        <div className="mb-3 flex items-center justify-between">
                            <h2 className="font-display text-sm font-bold text-[#101D35]">
                                My Next Tasks
                            </h2>
                            <Link
                                href="/my-tasks"
                                className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                            >
                                View all
                            </Link>
                        </div>
                        {myTasks.length === 0 ? (
                            <p className="text-xs text-slate-500">No open tasks assigned to you.</p>
                        ) : (
                            <div className="space-y-2.5">
                                {myTasks.map((t) => (
                                    <Link
                                        key={t.id}
                                        href={`/tasks/${t.id}`}
                                        className="block rounded-lg border border-slate-100 p-2.5 hover:border-slate-300 hover:bg-slate-50"
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="font-mono text-[11px] font-semibold text-[#101D35]">
                                                {t.code}
                                            </span>
                                            <span className="font-mono text-[11px] text-slate-500">
                                                {t.deadline}
                                            </span>
                                        </div>
                                        <p className="mt-1 line-clamp-1 text-xs font-medium text-slate-800">
                                            {t.title}
                                        </p>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Upcoming Deadlines */}
                    <div className="rounded-xl border border-slate-200 bg-white p-5">
                        <h2 className="mb-3 font-display text-sm font-bold text-[#101D35]">
                            Upcoming Deadlines
                        </h2>
                        <div className="space-y-2">
                            {upcomingDeadlines.map((t) => (
                                <Link
                                    key={t.id}
                                    href={`/tasks/${t.id}`}
                                    className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 px-3 py-2 hover:bg-slate-50"
                                >
                                    <div className="min-w-0">
                                        <p className="truncate text-xs font-semibold text-slate-800">
                                            <span className="mr-1.5 font-mono text-[#101D35]">{t.code}</span>
                                            {t.title}
                                        </p>
                                        <p className="text-[11px] text-slate-500">{t.pic_name}</p>
                                    </div>
                                    <span className="shrink-0 font-mono text-[11px] text-slate-600">
                                        {t.deadline}
                                    </span>
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* Recent Audit */}
                    <div className="rounded-xl border border-slate-200 bg-white p-5">
                        <div className="mb-3 flex items-center gap-2">
                            <Activity className="h-4 w-4 text-[#101D35]" />
                            <h2 className="font-display text-sm font-bold text-[#101D35]">
                                Recent Activity
                            </h2>
                        </div>
                        <div className="space-y-2">
                            {recentAudits.map((a) => (
                                <div key={a.id} className="rounded-lg border border-slate-100 p-2 text-xs">
                                    <p className="font-medium text-slate-800">{a.summary}</p>
                                    <p className="mt-0.5 text-[11px] text-slate-400">
                                        {a.actor} · {a.created_at}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </AppShell>
    );
}
