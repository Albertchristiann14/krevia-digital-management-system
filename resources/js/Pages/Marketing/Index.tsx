import { StatusBadge } from '@/Components/shared/StatusBadge';
import { UserAvatar } from '@/Components/shared/UserAvatar';
import { UserPicker, type UserPickerOption } from '@/Components/shared/UserPicker';
import { AppShell } from '@/Layouts/AppShell';
import { cn, formatShortDate } from '@/lib/utils';
import type { PageProps } from '@/types';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import FullCalendar from '@fullcalendar/react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    AlertCircle,
    ArrowUpRight,
    BarChart3,
    Calendar as CalendarIcon,
    Grid3X3,
    Lock,
    Megaphone,
    Plus,
    Repeat2,
    Search,
    Table2,
    X,
} from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

interface ContentRow {
    id: number;
    code: string;
    platform: string;
    category: string;
    title_topic: string;
    production_date: string | null;
    review_date: string | null;
    publish_date: string | null;
    status: string;
    is_approved: boolean;
    is_reused_reel: boolean;
    published_url: string | null;
    pic_user_id?: number | null;
    pic_name: string | null;
    pic_email?: string | null;
    pic_avatar_url?: string | null;
    pic_avatar_color?: string | null;
    reviewer_name: string | null;
    assets_count: number;
    demo: { id: number; code: string; is_ready_to_present: boolean } | null;
    requires_ready_demo: boolean;
}

interface MonthlyReportRow {
    month: string;
    total: number;
    published: number;
    scheduled: number;
    approved: number;
    reach: number;
    impressions: number;
    inquiries: number;
}

interface MarketingIndexProps extends PageProps {
    viewMode: string;
    items: ContentRow[];
    stats: {
        total: number;
        planned: number;
        in_review: number;
        approved: number;
        scheduled: number;
        published: number;
    };
    monthlySummary: MonthlyReportRow[];
    frequencyGuidelines: {
        platform: string;
        frequency: string;
        suggested_day: string;
        rule: string;
    }[];
    platforms: string[];
    categories: string[];
    statuses: string[];
    demos: {
        id: number;
        code: string;
        name: string;
        service_line: string;
        is_ready_to_present: boolean;
    }[];
    users: UserPickerOption[];
    filters: {
        search: string;
        platform: string;
        category: string;
        status: string;
        month: string;
    };
    permissions: { canCreate: boolean };
}

const PLATFORM_COLORS: Record<string, string> = {
    'Instagram Feed': '#0284c7',
    'Instagram Reels': '#7c3aed',
    'Instagram Story': '#d97706',
    LinkedIn: '#101D35',
    TikTok: '#059669',
};

export default function MarketingIndex({
    viewMode: initialView,
    items,
    stats,
    monthlySummary,
    frequencyGuidelines,
    platforms,
    categories,
    statuses,
    demos,
    users,
    filters,
    permissions,
}: MarketingIndexProps) {
    const [view, setView] = useState<'calendar' | 'table' | 'ig_grid' | 'reports'>(
        (['table', 'ig_grid', 'reports'].includes(initialView)
            ? initialView
            : 'calendar') as 'calendar' | 'table' | 'ig_grid' | 'reports',
    );
    const [showCreateModal, setShowCreateModal] = useState(false);

    const [search, setSearch] = useState(filters.search);
    const [platformFilter, setPlatformFilter] = useState(filters.platform);
    const [categoryFilter, setCategoryFilter] = useState(filters.category);
    const [statusFilter, setStatusFilter] = useState(filters.status);

    const form = useForm({
        platform: platforms[0] ?? 'Instagram Feed',
        category: categories[0] ?? 'Company Introduction',
        title_topic: '',
        brief: '',
        demo_product_id: '',
        pic_user_id: '',
        publish_date: new Date().toISOString().slice(0, 10),
        is_reused_reel: false,
    });

    const applyFilters = (next?: Partial<typeof filters>) => {
        router.get(
            '/marketing/content',
            {
                view,
                search: next?.search ?? search,
                platform: next?.platform ?? platformFilter,
                category: next?.category ?? categoryFilter,
                status: next?.status ?? statusFilter,
            },
            { preserveState: true, replace: true },
        );
    };

    const calendarEvents = useMemo(
        () =>
            items
                .filter((i) => i.publish_date)
                .map((i) => {
                    const color = PLATFORM_COLORS[i.platform] ?? '#101D35';
                    return {
                        id: String(i.id),
                        title: i.title_topic,
                        start: i.publish_date!,
                        allDay: true,
                        backgroundColor: `${color}15`,
                        borderColor: `${color}35`,
                        textColor: '#0f172a',
                        extendedProps: {
                            code: i.code,
                            platform: i.platform,
                            status: i.status,
                            dotColor: color,
                        },
                    };
                }),
        [items],
    );

    const igFeedItems = useMemo(
        () =>
            items
                .filter((i) => i.platform === 'Instagram Feed' || i.platform === 'Instagram Reels')
                .slice(0, 18),
        [items],
    );

    const handleCreate = (e: FormEvent) => {
        e.preventDefault();
        form.transform((data) => ({
            ...data,
            pic_user_id: data.pic_user_id ? Number(data.pic_user_id) : null,
        }));
        form.post('/marketing/content', {
            onSuccess: () => {
                form.reset('title_topic', 'brief', 'demo_product_id', 'pic_user_id');
                setShowCreateModal(false);
            },
        });
    };

    return (
        <AppShell
            title="Marketing & Social Media Plan"
            subtitle="158 planned content items (Dec 2026 – Dec 2027) • H-5 production • H-2 review • Demo readiness gate"
            actions={
                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex rounded-lg border border-slate-200 bg-white p-0.5">
                        {(
                            [
                                ['calendar', 'Calendar', CalendarIcon],
                                ['table', 'Table', Table2],
                                ['ig_grid', 'IG Grid', Grid3X3],
                                ['reports', 'Reports', BarChart3],
                            ] as const
                        ).map(([key, label, Icon]) => (
                            <button
                                key={key}
                                type="button"
                                onClick={() => setView(key)}
                                className={cn(
                                    'inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition',
                                    view === key
                                        ? 'bg-[#101D35] text-white'
                                        : 'text-slate-600 hover:text-slate-900',
                                )}
                            >
                                <Icon className="h-3.5 w-3.5" />
                                {label}
                            </button>
                        ))}
                    </div>
                    {permissions.canCreate && (
                        <button
                            type="button"
                            onClick={() => setShowCreateModal(true)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-[#101D35] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#192c4e]"
                        >
                            <Plus className="h-4 w-4" />
                            New Content
                        </button>
                    )}
                </div>
            }
        >
            <Head title="Marketing & Content — KDMS" />

            {/* Top Metrics Strip */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-6">
                <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-3">
                    <p className="text-[11px] text-slate-500">Total Content</p>
                    <p className="text-xl font-bold text-[#101D35]">{stats.total}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-3">
                    <p className="text-[11px] text-slate-500">Planned</p>
                    <p className="text-xl font-bold text-slate-700">{stats.planned}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-3">
                    <p className="text-[11px] text-slate-500">In Review</p>
                    <p className="text-xl font-bold text-amber-600">{stats.in_review}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-3">
                    <p className="text-[11px] text-slate-500">Approved</p>
                    <p className="text-xl font-bold text-blue-700">{stats.approved}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-3">
                    <p className="text-[11px] text-slate-500">Scheduled</p>
                    <p className="text-xl font-bold text-indigo-700">{stats.scheduled}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-3">
                    <p className="text-[11px] text-slate-500">Published</p>
                    <p className="text-xl font-bold text-emerald-700">{stats.published}</p>
                </div>
            </div>

            {/* Filter Toolbar */}
            <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3">
                <div className="relative min-w-[200px] flex-1">
                    <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                        placeholder="Search code or topic..."
                        className="w-full rounded-lg border border-slate-200 py-1.5 pr-3 pl-9 text-xs"
                    />
                </div>
                <select
                    value={platformFilter}
                    onChange={(e) => {
                        setPlatformFilter(e.target.value);
                        applyFilters({ platform: e.target.value });
                    }}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs"
                >
                    <option value="">All Platforms</option>
                    {platforms.map((p) => (
                        <option key={p} value={p}>
                            {p}
                        </option>
                    ))}
                </select>
                <select
                    value={categoryFilter}
                    onChange={(e) => {
                        setCategoryFilter(e.target.value);
                        applyFilters({ category: e.target.value });
                    }}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs"
                >
                    <option value="">All 9 Categories</option>
                    {categories.map((c) => (
                        <option key={c} value={c}>
                            {c}
                        </option>
                    ))}
                </select>
                <select
                    value={statusFilter}
                    onChange={(e) => {
                        setStatusFilter(e.target.value);
                        applyFilters({ status: e.target.value });
                    }}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs"
                >
                    <option value="">All Statuses</option>
                    {statuses.map((s) => (
                        <option key={s} value={s}>
                            {s}
                        </option>
                    ))}
                </select>
            </div>

            {/* Active View */}
            {view === 'calendar' && (
                <div className="kdms-calendar mt-4 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 text-[11px] text-slate-500">
                        <span>Showing publish schedule ({calendarEvents.length} items)</span>
                        <div className="flex flex-wrap items-center gap-3">
                            {Object.entries(PLATFORM_COLORS).map(([platform, color]) => (
                                <span key={platform} className="inline-flex items-center gap-1.5">
                                    <span
                                        className="h-2 w-2 rounded-full"
                                        style={{ backgroundColor: color }}
                                    />
                                    {platform}
                                </span>
                            ))}
                        </div>
                    </div>
                    <FullCalendar
                        plugins={[dayGridPlugin, interactionPlugin]}
                        initialView="dayGridMonth"
                        initialDate="2026-12-01"
                        headerToolbar={{
                            left: 'prev,next today',
                            center: 'title',
                            right: '',
                        }}
                        events={calendarEvents}
                        dayMaxEvents={3}
                        moreLinkClick="popover"
                        fixedWeekCount={false}
                        height="auto"
                        eventContent={(arg) => {
                            const { code, platform, dotColor } = arg.event.extendedProps as {
                                code?: string;
                                platform?: string;
                                dotColor?: string;
                            };
                            return (
                                <div
                                    title={`${code ?? ''} · ${platform ?? ''}: ${arg.event.title}`}
                                    className="flex w-full items-center gap-1.5 overflow-hidden px-1.5 py-0.5 text-[11px] leading-tight"
                                >
                                    <span
                                        className="h-1.5 w-1.5 shrink-0 rounded-full"
                                        style={{ backgroundColor: dotColor ?? '#101D35' }}
                                    />
                                    <span className="shrink-0 font-mono text-[10px] font-semibold text-slate-600">
                                        {code}
                                    </span>
                                    <span className="truncate font-medium text-slate-800">
                                        {arg.event.title}
                                    </span>
                                </div>
                            );
                        }}
                        eventClick={(info) => {
                            router.visit(`/marketing/content/${info.event.id}`);
                        }}
                    />
                </div>
            )}

            {view === 'table' && (
                <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                            <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase">
                                <tr>
                                    <th className="px-4 py-3">ID & Platform</th>
                                    <th className="px-4 py-3">Category & Topic</th>
                                    <th className="px-4 py-3">H-5 Prod / H-2 Review / Publish</th>
                                    <th className="px-4 py-3">Reviewer</th>
                                    <th className="px-4 py-3">Status & Gate</th>
                                    <th className="px-4 py-3 text-right">Open</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {items.map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-50/70">
                                        <td className="px-4 py-3 align-top">
                                            <div className="font-mono font-bold text-[#101D35]">
                                                {item.code}
                                            </div>
                                            <div className="mt-0.5 text-[11px] text-slate-600">
                                                {item.platform}
                                            </div>
                                            {item.is_reused_reel && (
                                                <span className="mt-1 inline-flex items-center gap-1 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
                                                    <Repeat2 className="h-3 w-3" />
                                                    Reused Reels
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 align-top">
                                            <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                                                {item.category}
                                            </span>
                                            <p className="mt-1 max-w-md font-medium text-slate-800">
                                                {item.title_topic}
                                            </p>
                                        </td>
                                        <td className="px-4 py-3 align-top text-[11px] text-slate-600">
                                            <div>Prod: {formatShortDate(item.production_date)}</div>
                                            <div>Rev: {formatShortDate(item.review_date)}</div>
                                            <div className="font-semibold text-[#101D35]">
                                                Pub: {formatShortDate(item.publish_date)}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 align-top text-slate-700">
                                            <div className="flex items-center gap-2">
                                                {item.pic_name ? (
                                                    <>
                                                        <UserAvatar
                                                            name={item.pic_name}
                                                            avatarUrl={item.pic_avatar_url}
                                                            avatarColor={item.pic_avatar_color}
                                                            size="xs"
                                                            className="h-5 w-5"
                                                        />
                                                        <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                                                            {item.pic_name}
                                                        </span>
                                                    </>
                                                ) : (
                                                    <span className="text-xs text-slate-400">Unassigned</span>
                                                )}
                                            </div>
                                            <div className="mt-0.5 text-[11px] text-slate-400">
                                                Rev: {item.reviewer_name ?? '—'}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 align-top">
                                            <StatusBadge label={item.status} />
                                            {item.requires_ready_demo && (
                                                <div className="mt-1">
                                                    {item.demo?.is_ready_to_present ? (
                                                        <span className="text-[10px] font-semibold text-emerald-700">
                                                            {item.demo.code} Ready ✓
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700">
                                                            <Lock className="h-3 w-3" />
                                                            Needs {item.demo?.code ?? 'Demo'} Ready
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right align-top">
                                            <Link
                                                href={`/marketing/content/${item.id}`}
                                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-[#101D35] hover:bg-slate-100"
                                            >
                                                Workspace
                                                <ArrowUpRight className="h-3.5 w-3.5" />
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {view === 'ig_grid' && (
                <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-3">
                    <div className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-2">
                        <h3 className="text-sm font-bold text-[#101D35]">
                            Instagram Feed & Reels Visual Grid Preview
                        </h3>
                        <p className="text-xs text-slate-500">
                            Upcoming planned and scheduled posts arranged in 3-column Instagram layout
                        </p>
                        <div className="mt-4 grid grid-cols-3 gap-2.5">
                            {igFeedItems.map((post) => (
                                <Link
                                    key={post.id}
                                    href={`/marketing/content/${post.id}`}
                                    className="group flex aspect-square flex-col justify-between rounded-xl border border-slate-200 bg-slate-50 p-3 transition hover:border-[#101D35]"
                                >
                                    <div className="flex items-center justify-between gap-1">
                                        <span className="font-mono text-[10px] font-bold text-[#101D35]">
                                            {post.code}
                                        </span>
                                        <StatusBadge label={post.status} />
                                    </div>
                                    <p className="line-clamp-3 text-xs font-semibold text-slate-800 group-hover:text-blue-700">
                                        {post.title_topic}
                                    </p>
                                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                                        <span>{post.platform.replace('Instagram ', '')}</span>
                                        <span>{formatShortDate(post.publish_date)}</span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-5">
                        <h3 className="text-xs font-bold text-[#101D35] uppercase">
                            Agreed Publishing Cadence (Sheet 11)
                        </h3>
                        <div className="mt-3 space-y-2.5">
                            {frequencyGuidelines.map((fg) => (
                                <div
                                    key={fg.platform}
                                    className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs"
                                >
                                    <div className="flex items-center justify-between font-bold text-[#101D35]">
                                        <span>{fg.platform}</span>
                                        <span className="text-blue-700">{fg.frequency}</span>
                                    </div>
                                    <p className="mt-0.5 text-[11px] text-slate-500">
                                        Day: {fg.suggested_day}
                                    </p>
                                    <p className="mt-1 text-[11px] text-slate-600">{fg.rule}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {view === 'reports' && (
                <div className="mt-4 space-y-6">
                    <div className="rounded-xl border border-slate-200 bg-white p-5">
                        <h3 className="text-sm font-bold text-[#101D35]">
                            Monthly Content Output & Engagement (Dec 2026 – Dec 2027)
                        </h3>
                        <div className="mt-4 h-72 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={monthlySummary}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                                    <YAxis tick={{ fontSize: 11 }} />
                                    <Tooltip />
                                    <Bar dataKey="total" name="Planned/Total" fill="#101D35" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="approved" name="Approved" fill="#2563eb" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="published" name="Published" fill="#16a34a" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                        <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                            <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase">
                                <tr>
                                    <th className="px-4 py-3">Month</th>
                                    <th className="px-4 py-3">Total Posts</th>
                                    <th className="px-4 py-3">Approved</th>
                                    <th className="px-4 py-3">Scheduled</th>
                                    <th className="px-4 py-3">Published</th>
                                    <th className="px-4 py-3">Reach</th>
                                    <th className="px-4 py-3">Impressions</th>
                                    <th className="px-4 py-3">Inquiries</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {monthlySummary.map((row) => (
                                    <tr key={row.month}>
                                        <td className="px-4 py-2.5 font-mono font-semibold text-[#101D35]">
                                            {row.month}
                                        </td>
                                        <td className="px-4 py-2.5">{row.total}</td>
                                        <td className="px-4 py-2.5 text-blue-700">{row.approved}</td>
                                        <td className="px-4 py-2.5 text-indigo-700">{row.scheduled}</td>
                                        <td className="px-4 py-2.5 text-emerald-700">{row.published}</td>
                                        <td className="px-4 py-2.5">{row.reach.toLocaleString()}</td>
                                        <td className="px-4 py-2.5">
                                            {row.impressions.toLocaleString()}
                                        </td>
                                        <td className="px-4 py-2.5 font-semibold text-[#101D35]">
                                            {row.inquiries}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* New Content Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
                    <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <div className="flex items-center gap-2">
                                <Megaphone className="h-5 w-5 text-[#101D35]" />
                                <h2 className="font-display text-base font-bold text-[#101D35]">
                                    Schedule Social Content Item
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
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-semibold text-slate-700">
                                        Platform *
                                    </label>
                                    <select
                                        value={form.data.platform}
                                        onChange={(e) => form.setData('platform', e.target.value)}
                                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                                    >
                                        {platforms.map((p) => (
                                            <option key={p} value={p}>
                                                {p}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-700">
                                        Category *
                                    </label>
                                    <select
                                        value={form.data.category}
                                        onChange={(e) => form.setData('category', e.target.value)}
                                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                                    >
                                        {categories.map((c) => (
                                            <option key={c} value={c}>
                                                {c}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-700">
                                    Topic / Idea *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={form.data.title_topic}
                                    onChange={(e) => form.setData('title_topic', e.target.value)}
                                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-semibold text-slate-700">
                                        Publish Date * (H-5 & H-2 auto-calculated)
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        value={form.data.publish_date}
                                        onChange={(e) => form.setData('publish_date', e.target.value)}
                                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-700">
                                        Linked Demo (if showcase)
                                    </label>
                                    <select
                                        value={form.data.demo_product_id}
                                        onChange={(e) =>
                                            form.setData('demo_product_id', e.target.value)
                                        }
                                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                                    >
                                        <option value="">None / General</option>
                                        {demos.map((d) => (
                                            <option key={d.id} value={d.id}>
                                                {d.code} — {d.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-semibold text-slate-700">
                                    Person in Charge (PIC)
                                </label>
                                <UserPicker
                                    users={users}
                                    value={form.data.pic_user_id}
                                    onChange={(val) => form.setData('pic_user_id', val)}
                                    placeholder="Select PIC (optional)..."
                                    allowClear
                                    error={form.errors.pic_user_id}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-700">
                                    Content Brief
                                </label>
                                <textarea
                                    rows={2}
                                    value={form.data.brief}
                                    onChange={(e) => form.setData('brief', e.target.value)}
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
                                    Create Content
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AppShell>
    );
}
