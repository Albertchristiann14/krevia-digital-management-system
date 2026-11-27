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
    Sparkles,
    UserCircle2,
    Users,
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
                        className="inline-flex items-center gap-2 rounded-xl border border-white/[0.12] bg-white/[0.055] px-3.5 py-2 text-xs font-semibold text-[#F4F7FF] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-md transition hover:border-[#45D8E8]/45 hover:bg-white/[0.1]"
                    >
                        <Compass className="h-4 w-4 text-[#45D8E8]" />
                        Annual Roadmap
                    </Link>
                    <Link
                        href="/tasks"
                        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#668CFF] to-[#45D8E8] px-3.5 py-2 text-xs font-semibold text-[#070B16] shadow-[0_0_24px_rgba(102,140,255,0.35)] transition hover:brightness-110"
                    >
                        <ClipboardList className="h-4 w-4" />
                        Open Task Tracker
                    </Link>
                </>
            }
        >
            <Head title="Dashboard" />

            {/* Krevia Glow Welcome Hero Card */}
            <div className="relative mb-6 overflow-hidden rounded-2xl border border-white/[0.13] bg-gradient-to-br from-[#15223A]/90 via-[#101A30]/88 to-[#0B1222]/94 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_20px_50px_-18px_rgba(0,0,0,0.75)]">
                <div
                    className="pointer-events-none absolute -top-24 -right-12 h-72 w-72 rounded-full"
                    style={{ background: 'radial-gradient(circle, rgba(102,140,255,0.22) 0%, transparent 70%)' }}
                />
                <div
                    className="pointer-events-none absolute -bottom-24 left-1/3 h-64 w-64 rounded-full"
                    style={{ background: 'radial-gradient(circle, rgba(161,122,255,0.18) 0%, transparent 70%)' }}
                />
                <div
                    className="pointer-events-none absolute top-1/2 left-12 h-48 w-48 -translate-y-1/2 rounded-full"
                    style={{ background: 'radial-gradient(circle, rgba(69,216,232,0.14) 0%, transparent 70%)' }}
                />
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />

                <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center gap-4">
                        <UserAvatar
                            name={user?.name ?? 'Member'}
                            avatarUrl={user?.avatar_url}
                            avatarColor={user?.profile?.avatar_color}
                            size="lg"
                            className="ring-2 ring-[#45D8E8]/45 shadow-[0_0_24px_rgba(69,216,232,0.22)]"
                        />
                        <div>
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="inline-flex items-center gap-1 rounded-full border border-[#668CFF]/35 bg-[#668CFF]/15 px-2.5 py-0.5 text-[10px] font-semibold tracking-wider text-[#A7C0FF] uppercase shadow-[0_0_14px_rgba(102,140,255,0.2)]">
                                    <Sparkles className="h-3 w-3 text-[#45D8E8]" />
                                    Krevia Glow
                                </span>
                                <span className="text-xs font-medium text-[#A7B4CB]">
                                    {new Date().toLocaleDateString('en-US', {
                                        weekday: 'long',
                                        month: 'long',
                                        day: 'numeric',
                                        year: 'numeric',
                                    })}
                                </span>
                            </div>
                            <h2 className="font-display mt-1.5 text-lg font-bold tracking-tight text-[#F4F7FF] sm:text-xl">
                                {(() => {
                                    const hour = new Date().getHours();
                                    const greeting =
                                        hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
                                    return `${greeting}, ${user?.name ?? 'Member'}`;
                                })()}
                            </h2>
                            <p className="mt-0.5 text-xs text-[#A7B4CB]">
                                Build Smarter. Operate Better. · Role:{' '}
                                <span className="font-semibold text-[#F4F7FF]">
                                    {user?.roles[0] ?? 'Member'}
                                </span>
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <Link
                            href="/tasks"
                            className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.11] bg-white/[0.055] px-3 py-1.5 text-xs font-semibold text-[#A7B4CB] transition hover:border-[#668CFF]/45 hover:bg-white/[0.1] hover:text-[#F4F7FF]"
                        >
                            <ClipboardList className="h-3.5 w-3.5 text-[#668CFF]" />
                            Tasks
                        </Link>
                        <Link
                            href="/workplan/roadmap"
                            className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.11] bg-white/[0.055] px-3 py-1.5 text-xs font-semibold text-[#A7B4CB] transition hover:border-[#45D8E8]/45 hover:bg-white/[0.1] hover:text-[#F4F7FF]"
                        >
                            <Compass className="h-3.5 w-3.5 text-[#45D8E8]" />
                            Roadmap
                        </Link>
                        <Link
                            href="/people"
                            className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.11] bg-white/[0.055] px-3 py-1.5 text-xs font-semibold text-[#A7B4CB] transition hover:border-[#A17AFF]/45 hover:bg-white/[0.1] hover:text-[#F4F7FF]"
                        >
                            <Users className="h-3.5 w-3.5 text-[#A17AFF]" />
                            People
                        </Link>
                        <Link
                            href="/my-account"
                            className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.11] bg-white/[0.055] px-3 py-1.5 text-xs font-semibold text-[#A7B4CB] transition hover:border-[#42C99A]/45 hover:bg-white/[0.1] hover:text-[#F4F7FF]"
                        >
                            <UserCircle2 className="h-3.5 w-3.5 text-[#42C99A]" />
                            My Account
                        </Link>
                    </div>
                </div>
            </div>

            {/* Top Announcements Banner */}
            {recentAnnouncements.length > 0 && (
                <div className="krevia-glass mb-6 rounded-2xl p-4">
                    <div className="mb-3 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-to-br from-[#668CFF]/30 to-[#45D8E8]/20 text-[#45D8E8] ring-1 ring-[#668CFF]/35 shadow-[0_0_16px_rgba(102,140,255,0.22)]">
                                <Radio className="h-3.5 w-3.5" />
                            </span>
                            <div>
                                <h2 className="text-xs font-bold tracking-wider text-[#F4F7FF] uppercase">
                                    Latest Announcements
                                </h2>
                            </div>
                        </div>
                        <Link
                            href="/announcements"
                            prefetch
                            className="inline-flex items-center gap-1 text-xs font-semibold text-[#45D8E8] transition hover:text-[#F4F7FF]"
                        >
                            View all <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                    </div>
                    <div className="grid gap-3 md:grid-cols-3">
                        {recentAnnouncements.map((ann) => {
                            const priorityStyle =
                                ann.priority === 'Mendesak'
                                    ? 'border-[#F07183]/30 bg-[#F07183]/[0.07] hover:border-[#F07183]/50'
                                    : ann.priority === 'Penting'
                                      ? 'border-[#F4B860]/30 bg-[#F4B860]/[0.07] hover:border-[#F4B860]/50'
                                      : 'border-white/[0.11] bg-white/[0.045] hover:border-[#668CFF]/40';
                            const badgeStyle =
                                ann.priority === 'Mendesak'
                                    ? 'bg-[#F07183]/20 text-[#F07183] ring-1 ring-[#F07183]/35 shadow-[0_0_12px_rgba(240,113,131,0.2)]'
                                    : ann.priority === 'Penting'
                                      ? 'bg-[#F4B860]/20 text-[#F4B860] ring-1 ring-[#F4B860]/35 shadow-[0_0_12px_rgba(244,184,96,0.2)]'
                                      : 'bg-[#668CFF]/20 text-[#8DA8FF] ring-1 ring-[#668CFF]/35';

                            return (
                                <div
                                    key={ann.id}
                                    className={`krevia-card-hover flex flex-col justify-between rounded-xl border p-3.5 backdrop-blur-md ${priorityStyle}`}
                                >
                                    <div>
                                        <div className="mb-2 flex items-center justify-between gap-2">
                                            <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${badgeStyle}`}>
                                                {ann.priority}
                                            </span>
                                            <span className="font-mono text-[10px] text-[#71819C]">{ann.code}</span>
                                        </div>
                                        <p className="line-clamp-1 text-xs font-bold text-[#F4F7FF]">{ann.title}</p>
                                        <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-[#A7B4CB]">
                                            {ann.body}
                                        </p>
                                    </div>
                                    <div className="mt-2.5 flex items-center justify-between border-t border-white/[0.08] pt-2 text-[10px] text-[#71819C]">
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
            <div className="krevia-glass mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3">
                <div className="text-xs">
                    <span className="font-semibold text-[#F4F7FF]">
                        Commercial &amp; Financial Period:
                    </span>{' '}
                    <span className="font-medium text-[#45D8E8]">
                        {periodFilter.label}
                    </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <select
                        value={selectedPeriod}
                        onChange={(e) => applyPeriod(e.target.value)}
                        className="rounded-xl border border-white/[0.12] bg-[#0B1222]/80 px-3 py-1.5 text-xs font-medium text-[#F4F7FF]"
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
                                className="rounded-xl border border-white/[0.12] bg-[#0B1222]/80 px-2.5 py-1.5 text-xs text-[#F4F7FF]"
                            />
                            <span className="text-xs text-[#71819C]">to</span>
                            <input
                                type="date"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                                className="rounded-xl border border-white/[0.12] bg-[#0B1222]/80 px-2.5 py-1.5 text-xs text-[#F4F7FF]"
                            />
                            <button
                                type="button"
                                onClick={() => applyPeriod('custom', dateFrom, dateTo)}
                                className="rounded-xl bg-gradient-to-r from-[#668CFF] to-[#45D8E8] px-3 py-1.5 text-xs font-semibold text-[#070B16]"
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
                    className="krevia-glass krevia-card-hover group flex items-center justify-between rounded-2xl px-4 py-3.5"
                >
                    <div>
                        <p className="text-xs font-medium text-[#A7B4CB]">Total Prospects</p>
                        <p className="mt-0.5 text-xl font-bold text-[#F4F7FF] tabular-nums">{metrics.total_prospects}</p>
                        <p className="text-[11px] text-[#71819C]">
                            {metrics.discovery_meetings} Discovery • {metrics.proposals_sent} Proposals
                        </p>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#668CFF]/20 text-[#668CFF] ring-1 ring-[#668CFF]/35 transition group-hover:bg-[#668CFF] group-hover:text-white">
                        <Handshake className="h-4 w-4" />
                    </div>
                </Link>
                <Link
                    href="/crm/leads?stage=Discovery%20Meeting"
                    className="krevia-glass krevia-card-hover group flex items-center justify-between rounded-2xl px-4 py-3.5"
                >
                    <div>
                        <p className="text-xs font-medium text-[#A7B4CB]">Discovery & Proposals</p>
                        <p className="mt-0.5 text-xl font-bold text-[#F4F7FF] tabular-nums">
                            {metrics.discovery_meetings} / {metrics.proposals_sent}
                        </p>
                        <p className="text-[11px] text-[#71819C]">Active commercial evaluations</p>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F4B860]/20 text-[#F4B860] ring-1 ring-[#F4B860]/35 transition group-hover:bg-[#F4B860] group-hover:text-[#070B16]">
                        <Compass className="h-4 w-4" />
                    </div>
                </Link>
                <Link
                    href="/crm/leads?stage=Won"
                    className="krevia-glass krevia-card-hover group flex items-center justify-between rounded-2xl px-4 py-3.5"
                >
                    <div>
                        <p className="text-xs font-medium text-[#A7B4CB]">Won Opportunities</p>
                        <p className="mt-0.5 text-xl font-bold text-[#42C99A] tabular-nums">{metrics.won_projects}</p>
                        <p className="text-[11px] text-[#71819C]">Converted or ready for kickoff</p>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#42C99A]/20 text-[#42C99A] ring-1 ring-[#42C99A]/35 transition group-hover:bg-[#42C99A] group-hover:text-[#070B16]">
                        <CheckCircle2 className="h-4 w-4" />
                    </div>
                </Link>
                <Link
                    href="/projects"
                    className="krevia-glass krevia-card-hover group flex items-center justify-between rounded-2xl px-4 py-3.5"
                >
                    <div>
                        <p className="text-xs font-medium text-[#A7B4CB]">Active Delivery Projects</p>
                        <p className="mt-0.5 text-xl font-bold text-[#45D8E8] tabular-nums">{metrics.active_projects}</p>
                        <p className="text-[11px] text-[#71819C]">Web & Custom Software workflows</p>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#45D8E8]/20 text-[#45D8E8] ring-1 ring-[#45D8E8]/35 transition group-hover:bg-[#45D8E8] group-hover:text-[#070B16]">
                        <Briefcase className="h-4 w-4" />
                    </div>
                </Link>
            </div>

            {canViewFinance && (
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <Link
                        href="/finance"
                        className="krevia-glass krevia-card-hover flex items-center justify-between rounded-2xl px-4 py-3.5"
                    >
                        <div>
                            <p className="text-xs font-medium text-[#A7B4CB]">Revenue Received</p>
                            <p className="mt-0.5 text-lg font-bold text-[#42C99A] tabular-nums">
                                {new Intl.NumberFormat('id-ID', {
                                    style: 'currency',
                                    currency: 'IDR',
                                    maximumFractionDigits: 0,
                                }).format(metrics.revenue_received ?? 0)}
                            </p>
                            <p className="text-[11px] text-[#71819C]">Confirmed ledger income only</p>
                        </div>
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#42C99A]/15 text-[#42C99A] ring-1 ring-[#42C99A]/30">
                            <Wallet className="h-5 w-5" />
                        </div>
                    </Link>
                    <Link
                        href="/finance"
                        className="krevia-glass krevia-card-hover flex items-center justify-between rounded-2xl px-4 py-3.5"
                    >
                        <div>
                            <p className="text-xs font-medium text-[#A7B4CB]">Expenses</p>
                            <p className="mt-0.5 text-lg font-bold text-[#F07183] tabular-nums">
                                {new Intl.NumberFormat('id-ID', {
                                    style: 'currency',
                                    currency: 'IDR',
                                    maximumFractionDigits: 0,
                                }).format(metrics.total_expenses ?? 0)}
                            </p>
                            <p className="text-[11px] text-[#71819C]">Actual operating outflows</p>
                        </div>
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F07183]/15 text-[#F07183] ring-1 ring-[#F07183]/30">
                            <Wallet className="h-5 w-5" />
                        </div>
                    </Link>
                    <Link
                        href="/finance"
                        className="krevia-glass krevia-card-hover flex items-center justify-between rounded-2xl px-4 py-3.5"
                    >
                        <div>
                            <p className="text-xs font-medium text-[#A7B4CB]">Cash Balance</p>
                            <p className="mt-0.5 text-lg font-bold text-[#45D8E8] tabular-nums">
                                {new Intl.NumberFormat('id-ID', {
                                    style: 'currency',
                                    currency: 'IDR',
                                    maximumFractionDigits: 0,
                                }).format(metrics.cash_balance ?? 0)}
                            </p>
                            <p className="text-[11px] text-[#71819C]">Opening + Income − Expenses</p>
                        </div>
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#668CFF]/15 text-[#668CFF] ring-1 ring-[#668CFF]/30">
                            <Wallet className="h-5 w-5" />
                        </div>
                    </Link>
                </div>
            )}

            {/* Charts Row: Annual Workplan Timeline + Task Status Distribution */}
            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="krevia-glass rounded-2xl p-5 lg:col-span-2">
                    <div className="mb-4 flex items-center justify-between">
                        <div>
                            <h2 className="font-display text-base font-bold text-[#F4F7FF]">
                                Annual Workplan Load (Dec 2026 – Dec 2027)
                            </h2>
                            <p className="text-xs text-[#A7B4CB]">
                                Monthly due tasks vs. completed tasks calculated from database
                            </p>
                        </div>
                        <Link
                            href="/workplan/monthly"
                            className="inline-flex items-center gap-1 text-xs font-semibold text-[#45D8E8] transition hover:text-[#F4F7FF]"
                        >
                            Monthly View <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                    </div>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={monthlyRoadmap} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
                                <XAxis dataKey="short_month" tick={{ fontSize: 11, fill: '#A7B4CB' }} />
                                <YAxis tick={{ fontSize: 11, fill: '#A7B4CB' }} allowDecimals={false} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'rgba(16, 26, 48, 0.94)',
                                        borderRadius: '12px',
                                        border: '1px solid rgba(255, 255, 255, 0.14)',
                                        color: '#F4F7FF',
                                        fontSize: '12px',
                                    }}
                                />
                                <Bar dataKey="due_tasks" name="Scheduled Tasks" fill="#668CFF" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                                <Bar dataKey="completed_tasks" name="Completed" fill="#42C99A" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="krevia-glass rounded-2xl p-5">
                    <h2 className="font-display text-base font-bold text-[#F4F7FF]">
                        Task Status Breakdown
                    </h2>
                    <p className="text-xs text-[#A7B4CB]">Live distribution across 6 statuses</p>
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
                                    isAnimationActive={false}
                                >
                                    {tasksByStatus
                                        .filter((s) => s.count > 0)
                                        .map((entry) => (
                                            <Cell
                                                key={entry.status}
                                                fill={STATUS_COLORS[entry.status] ?? '#71819C'}
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
                                <span className="flex items-center gap-2 text-[#A7B4CB]">
                                    <span
                                        className="h-2.5 w-2.5 rounded-full"
                                        style={{ backgroundColor: STATUS_COLORS[row.status] ?? '#71819C' }}
                                    />
                                    {row.status}
                                </span>
                                <span className="font-mono font-semibold text-[#F4F7FF] tabular-nums">
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
                <div className="krevia-glass rounded-2xl p-5 lg:col-span-2">
                    <div className="mb-4 flex items-center justify-between">
                        <div>
                            <h2 className="font-display text-base font-bold text-[#F4F7FF]">
                                Team Workload &amp; Task Health
                            </h2>
                            <p className="text-xs text-[#A7B4CB]">
                                Task distribution across the 7 members
                            </p>
                        </div>
                        <Link
                            href="/organization"
                            className="text-xs font-semibold text-[#45D8E8] transition hover:text-[#F4F7FF]"
                        >
                            Team Directory
                        </Link>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-left text-xs">
                            <thead className="border-b border-white/[0.11] text-[#A7B4CB] uppercase">
                                <tr>
                                    <th className="py-2.5 pr-3">PIC</th>
                                    <th className="px-3 py-2.5 text-right">Total</th>
                                    <th className="px-3 py-2.5 text-right">Done</th>
                                    <th className="px-3 py-2.5 text-right">Active</th>
                                    <th className="px-3 py-2.5 text-right">Overdue</th>
                                    <th className="py-2.5 pl-3">Capacity</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/[0.08]">
                                {team.map((m) => (
                                    <tr key={m.id} className="transition hover:bg-white/[0.04]">
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
                                                    <p className="font-semibold text-[#F4F7FF]">{m.name}</p>
                                                    <p className="text-[11px] text-[#71819C]">{m.department}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-3 py-2.5 text-right font-mono font-semibold text-[#F4F7FF] tabular-nums">
                                            {m.total_tasks}
                                        </td>
                                        <td className="px-3 py-2.5 text-right font-mono font-semibold text-[#42C99A] tabular-nums">
                                            {m.completed_tasks}
                                        </td>
                                        <td className="px-3 py-2.5 text-right font-mono font-semibold text-[#45D8E8] tabular-nums">
                                            {m.active_tasks}
                                        </td>
                                        <td className="px-3 py-2.5 text-right font-mono font-semibold text-[#F07183] tabular-nums">
                                            {m.overdue_tasks}
                                        </td>
                                        <td className="py-2.5 pl-3">
                                            {m.weekly_capacity_hours !== null ? (
                                                <span className="font-mono font-semibold text-[#F4F7FF]">
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
                    <div className="krevia-glass rounded-2xl p-5">
                        <div className="mb-3 flex items-center justify-between">
                            <h2 className="font-display text-sm font-bold text-[#F4F7FF]">
                                My Next Tasks
                            </h2>
                            <Link
                                href="/my-tasks"
                                className="text-xs font-semibold text-[#45D8E8] transition hover:text-[#F4F7FF]"
                            >
                                View all
                            </Link>
                        </div>
                        {myTasks.length === 0 ? (
                            <p className="text-xs text-[#71819C]">No open tasks assigned to you.</p>
                        ) : (
                            <div className="space-y-2.5">
                                {myTasks.map((t) => (
                                    <Link
                                        key={t.id}
                                        href={`/tasks/${t.id}`}
                                        className="block rounded-xl border border-white/[0.09] bg-white/[0.03] p-2.5 transition hover:border-[#668CFF]/40 hover:bg-white/[0.07]"
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="font-mono text-[11px] font-semibold text-[#668CFF]">
                                                {t.code}
                                            </span>
                                            <span className="font-mono text-[11px] text-[#71819C]">
                                                {t.deadline}
                                            </span>
                                        </div>
                                        <p className="mt-1 line-clamp-1 text-xs font-medium text-[#F4F7FF]">
                                            {t.title}
                                        </p>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Upcoming Deadlines */}
                    <div className="krevia-glass rounded-2xl p-5">
                        <h2 className="mb-3 font-display text-sm font-bold text-[#F4F7FF]">
                            Upcoming Deadlines
                        </h2>
                        <div className="space-y-2">
                            {upcomingDeadlines.map((t) => (
                                <Link
                                    key={t.id}
                                    href={`/tasks/${t.id}`}
                                    className="flex items-center justify-between gap-2 rounded-xl border border-white/[0.09] bg-white/[0.03] px-3 py-2 transition hover:border-[#45D8E8]/40 hover:bg-white/[0.07]"
                                >
                                    <div className="min-w-0">
                                        <p className="truncate text-xs font-semibold text-[#F4F7FF]">
                                            <span className="mr-1.5 font-mono text-[#45D8E8]">{t.code}</span>
                                            {t.title}
                                        </p>
                                        <p className="text-[11px] text-[#71819C]">{t.pic_name}</p>
                                    </div>
                                    <span className="shrink-0 font-mono text-[11px] text-[#A7B4CB]">
                                        {t.deadline}
                                    </span>
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* Recent Audit */}
                    <div className="krevia-glass rounded-2xl p-5">
                        <div className="mb-3 flex items-center gap-2">
                            <Activity className="h-4 w-4 text-[#A17AFF]" />
                            <h2 className="font-display text-sm font-bold text-[#F4F7FF]">
                                Recent Activity
                            </h2>
                        </div>
                        <div className="space-y-2">
                            {recentAudits.map((a) => (
                                <div key={a.id} className="rounded-xl border border-white/[0.09] bg-white/[0.03] p-2.5 text-xs">
                                    <p className="font-medium text-[#F4F7FF]">{a.summary}</p>
                                    <p className="mt-0.5 text-[11px] text-[#71819C]">
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
