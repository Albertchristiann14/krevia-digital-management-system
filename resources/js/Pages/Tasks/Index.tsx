import { StatusBadge } from '@/Components/shared/StatusBadge';
import { AppShell } from '@/Layouts/AppShell';
import { UserAvatar } from '@/Components/shared/UserAvatar';
import { cn } from '@/lib/utils';
import type { PageProps, TaskListItem } from '@/types';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import { Head, Link, router } from '@inertiajs/react';
import {
    AlertTriangle,
    Calendar as CalendarIcon,
    Columns3,
    FileCheck2,
    GanttChart,
    List,
    MessageSquare,
    Plus,
    Search,
    X,
} from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';

interface TasksIndexProps extends PageProps {
    isMyTasks: boolean;
    viewMode: string;
    tasks: TaskListItem[];
    users: { id: number; name: string }[];
    months: { id: number; month_label: string }[];
    statuses: string[];
    priorities: string[];
    filters: {
        search: string;
        status: string;
        priority: string;
        pic_user_id: string;
        annual_roadmap_id: string;
        overdue_only: boolean;
        blocked_only: boolean;
        sort: string;
        dir: string;
    };
    canCreate: boolean;
}

type ViewTab = 'list' | 'kanban' | 'calendar' | 'timeline';

const KANBAN_TOP_COLORS: Record<string, string> = {
    'Not Started': 'border-t-slate-400',
    'In Progress': 'border-t-blue-500',
    'Under Review': 'border-t-amber-500',
    Completed: 'border-t-emerald-500',
    'On Hold': 'border-t-violet-500',
    Cancelled: 'border-t-rose-500',
};

const PAGE_SIZE = 25;

export default function TasksIndex({
    isMyTasks,
    viewMode,
    tasks,
    users,
    months,
    statuses,
    priorities,
    filters,
    canCreate,
}: TasksIndexProps) {
    const validViews: ViewTab[] = ['list', 'kanban', 'calendar', 'timeline'];
    const [activeView, setActiveView] = useState<ViewTab>(
        validViews.includes(viewMode as ViewTab) ? (viewMode as ViewTab) : 'list',
    );
    const [calendarMode, setCalendarMode] = useState<'deadline' | 'range'>('deadline');
    const [calendarDensity, setCalendarDensity] = useState<'compact' | 'standard'>('standard');
    const [page, setPage] = useState(1);

    // Filter state
    const [search, setSearch] = useState(filters.search);
    const [status, setStatus] = useState(filters.status);
    const [priority, setPriority] = useState(filters.priority);
    const [picId, setPicId] = useState(filters.pic_user_id);
    const [monthId, setMonthId] = useState(filters.annual_roadmap_id);
    const [overdueOnly, setOverdueOnly] = useState(filters.overdue_only);

    // Create Task modal
    const [createOpen, setCreateOpen] = useState(false);
    const [newTask, setNewTask] = useState({
        title: '',
        description: '',
        expected_result: '',
        pic_user_id: String(users[0]?.id ?? ''),
        reviewer_user_id: '',
        priority: 'Sedang',
        start_date: '2026-12-01',
        deadline: '2026-12-15',
    });

    const basePath = isMyTasks ? '/my-tasks' : '/tasks';

    const applyFilters = (overrides: Record<string, unknown> = {}) => {
        setPage(1);
        router.get(
            basePath,
            {
                search,
                status,
                priority,
                pic_user_id: picId,
                annual_roadmap_id: monthId,
                overdue_only: overdueOnly ? 1 : '',
                view: activeView,
                ...overrides,
            },
            { preserveState: true, replace: true },
        );
    };

    const totalPages = Math.max(1, Math.ceil(tasks.length / PAGE_SIZE));
    const pagedTasks = useMemo(() => {
        const start = (page - 1) * PAGE_SIZE;
        return tasks.slice(start, start + PAGE_SIZE);
    }, [tasks, page]);

    const handleCreateTask = (e: FormEvent) => {
        e.preventDefault();
        router.post(
            '/tasks',
            {
                ...newTask,
                pic_user_id: Number(newTask.pic_user_id),
                reviewer_user_id: newTask.reviewer_user_id ? Number(newTask.reviewer_user_id) : null,
            },
            {
                onSuccess: () => setCreateOpen(false),
            },
        );
    };

    const handleQuickMove = (task: TaskListItem, targetStatus: string) => {
        if (targetStatus === 'Completed' && task.evidences_count === 0) {
            router.visit(`/tasks/${task.id}`);
            return;
        }
        router.post(
            `/tasks/${task.id}/transition`,
            { status: targetStatus },
            { preserveScroll: true },
        );
    };

    const calendarEvents = useMemo(
        () =>
            tasks.map((t) => {
                const isOverdue = t.deadline_status === 'Terlambat';
                const isDone = t.status === 'Completed';
                const isReview = t.status === 'Under Review';
                const isHigh = t.priority === 'Tinggi';

                const dotColor = isDone
                    ? '#10b981'
                    : isOverdue
                      ? '#ef4444'
                      : isReview
                        ? '#f59e0b'
                        : isHigh
                          ? '#6366f1'
                          : '#2563eb';

                const softBg = isDone
                    ? '#ecfdf5'
                    : isOverdue
                      ? '#fef2f2'
                      : isReview
                        ? '#fffbeb'
                        : isHigh
                          ? '#eef2ff'
                          : '#f0f9ff';

                const softBorder = isDone
                    ? '#a7f3d0'
                    : isOverdue
                      ? '#fecaca'
                      : isReview
                        ? '#fde68a'
                        : isHigh
                          ? '#c7d2fe'
                          : '#bae6fd';

                const textColor = isDone
                    ? '#065f46'
                    : isOverdue
                      ? '#991b1b'
                      : isReview
                        ? '#92400e'
                        : isHigh
                          ? '#3730a3'
                          : '#0369a1';

                return {
                    id: String(t.id),
                    title: t.title,
                    start: calendarMode === 'range' ? (t.start_date ?? t.deadline) : t.deadline,
                    end: calendarMode === 'range' ? t.deadline : undefined,
                    allDay: true,
                    backgroundColor: softBg,
                    borderColor: softBorder,
                    textColor: textColor,
                    extendedProps: {
                        code: t.code,
                        dotColor,
                        picName: t.pic_name,
                        status: t.status,
                        priority: t.priority,
                    },
                };
            }),
        [tasks, calendarMode],
    );

    // Timeline range bounds
    const timelineItems = useMemo(() => {
        const slice = tasks.slice(0, 40);
        if (slice.length === 0) return { items: [], minMs: 0, spanMs: 1 };
        const starts = slice.map((t) => new Date(t.start_date ?? t.deadline).getTime());
        const ends = slice.map((t) => new Date(t.deadline).getTime());
        const minMs = Math.min(...starts);
        const maxMs = Math.max(...ends);
        const spanMs = Math.max(86400000, maxMs - minMs);
        return { items: slice, minMs, spanMs };
    }, [tasks]);

    return (
        <AppShell
            title={isMyTasks ? 'My Tasks & Reviews' : 'Task Tracker'}
            subtitle={`${tasks.length} matching tasks · Evidence & reviewer approval enforced on completion`}
            actions={
                canCreate && (
                    <button
                        type="button"
                        onClick={() => setCreateOpen(true)}
                        className="inline-flex items-center gap-2 rounded-lg bg-[#101D35] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#1A2D4E]"
                    >
                        <Plus className="h-4 w-4" />
                        New Task
                    </button>
                )
            }
        >
            <Head title={isMyTasks ? 'My Tasks' : 'Task Tracker'} />

            {/* Toolbar: View Switcher + Filters */}
            <div className="mb-5 space-y-3 rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
                        {[
                            { id: 'list', label: 'List', icon: List },
                            { id: 'kanban', label: 'Kanban', icon: Columns3 },
                            { id: 'calendar', label: 'Calendar', icon: CalendarIcon },
                            { id: 'timeline', label: 'Timeline', icon: GanttChart },
                        ].map((tab) => {
                            const Icon = tab.icon;
                            const active = activeView === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setActiveView(tab.id as ViewTab)}
                                    className={cn(
                                        'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition',
                                        active
                                            ? 'bg-[#101D35] text-white shadow-xs'
                                            : 'text-slate-600 hover:text-slate-900',
                                    )}
                                >
                                    <Icon className="h-3.5 w-3.5" />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <label className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700">
                            <input
                                type="checkbox"
                                checked={overdueOnly}
                                onChange={(e) => {
                                    setOverdueOnly(e.target.checked);
                                    applyFilters({ overdue_only: e.target.checked ? 1 : '' });
                                }}
                                className="h-3.5 w-3.5 rounded border-slate-300 text-rose-600"
                            />
                            Overdue Only
                        </label>
                    </div>
                </div>

                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        applyFilters();
                    }}
                    className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-6"
                >
                    <div className="relative lg:col-span-2">
                        <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search ID (T-001) or title..."
                            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pr-3 pl-9 text-xs outline-none focus:border-[#101D35] focus:bg-white"
                        />
                    </div>

                    <select
                        value={status}
                        onChange={(e) => {
                            setStatus(e.target.value);
                            applyFilters({ status: e.target.value });
                        }}
                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-700"
                    >
                        <option value="">All Statuses</option>
                        {statuses.map((s) => (
                            <option key={s} value={s}>
                                {s}
                            </option>
                        ))}
                    </select>

                    <select
                        value={priority}
                        onChange={(e) => {
                            setPriority(e.target.value);
                            applyFilters({ priority: e.target.value });
                        }}
                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-700"
                    >
                        <option value="">All Priorities</option>
                        {priorities.map((p) => (
                            <option key={p} value={p}>
                                {p}
                            </option>
                        ))}
                    </select>

                    {!isMyTasks && (
                        <select
                            value={picId}
                            onChange={(e) => {
                                setPicId(e.target.value);
                                applyFilters({ pic_user_id: e.target.value });
                            }}
                            className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-700"
                        >
                            <option value="">All PICs</option>
                            {users.map((u) => (
                                <option key={u.id} value={String(u.id)}>
                                    {u.name}
                                </option>
                            ))}
                        </select>
                    )}

                    <select
                        value={monthId}
                        onChange={(e) => {
                            setMonthId(e.target.value);
                            applyFilters({ annual_roadmap_id: e.target.value });
                        }}
                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-700"
                    >
                        <option value="">All Months (13)</option>
                        {months.map((m) => (
                            <option key={m.id} value={String(m.id)}>
                                {m.month_label}
                            </option>
                        ))}
                    </select>
                </form>
            </div>

            {/* VIEW 1: LIST */}
            {activeView === 'list' && (
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-left text-sm">
                            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600 uppercase">
                                <tr>
                                    <th className="px-4 py-3">Task</th>
                                    <th className="px-4 py-3">PIC</th>
                                    <th className="px-4 py-3">Priority</th>
                                    <th className="px-4 py-3">Deadline</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3">Progress</th>
                                    <th className="px-4 py-3 text-right">Evidence</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {pagedTasks.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-500">
                                            No tasks match the current filters.
                                        </td>
                                    </tr>
                                ) : (
                                    pagedTasks.map((t) => (
                                        <tr key={t.id} className="hover:bg-slate-50/70">
                                            <td className="max-w-md px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <Link
                                                        href={`/tasks/${t.id}`}
                                                        className="font-mono text-xs font-bold text-[#101D35] hover:underline"
                                                    >
                                                        {t.code}
                                                    </Link>
                                                    {t.is_blocked && (
                                                        <span className="inline-flex items-center gap-1 rounded bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700">
                                                            <AlertTriangle className="h-3 w-3" /> Blocked
                                                        </span>
                                                    )}
                                                </div>
                                                <Link
                                                    href={`/tasks/${t.id}`}
                                                    className="mt-0.5 block text-xs font-semibold text-slate-900 hover:text-blue-700"
                                                >
                                                    {t.title}
                                                </Link>
                                                <p className="mt-0.5 text-[11px] text-slate-500">
                                                    {t.month_label ?? 'Unscheduled'}
                                                </p>
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <UserAvatar
                                                        name={t.pic_name}
                                                        avatarUrl={(t as { pic_avatar_url?: string | null }).pic_avatar_url}
                                                        avatarColor={t.pic_avatar_color}
                                                        size="xs"
                                                        className="h-7 w-7"
                                                    />
                                                    <span className="text-xs font-medium text-slate-800">
                                                        {t.pic_name}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <StatusBadge label={t.priority} />
                                            </td>
                                            <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">
                                                <div className="text-slate-800">{t.deadline}</div>
                                                {t.deadline_status && (
                                                    <div className="mt-1">
                                                        <StatusBadge label={t.deadline_status} />
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <StatusBadge label={t.status} />
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
                                                        <div
                                                            className="h-full rounded-full bg-[#101D35]"
                                                            style={{ width: `${t.progress_pct}%` }}
                                                        />
                                                    </div>
                                                    <span className="font-mono text-xs text-slate-600 tabular-nums">
                                                        {t.progress_pct}%
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono text-xs text-slate-600 whitespace-nowrap">
                                                <span className="inline-flex items-center gap-1">
                                                    <FileCheck2 className="h-3.5 w-3.5 text-slate-400" />
                                                    {t.evidences_count}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {totalPages > 1 && (
                        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-xs text-slate-600">
                            <span>
                                Page {page} of {totalPages} ({tasks.length} tasks)
                            </span>
                            <div className="flex items-center gap-1.5">
                                <button
                                    type="button"
                                    disabled={page <= 1}
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    className="rounded border border-slate-200 px-2.5 py-1 disabled:opacity-40"
                                >
                                    Prev
                                </button>
                                <button
                                    type="button"
                                    disabled={page >= totalPages}
                                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                    className="rounded border border-slate-200 px-2.5 py-1 disabled:opacity-40"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* VIEW 2: KANBAN BOARD (Ref 4 Cryta style) */}
            {activeView === 'kanban' && (
                <div className="flex gap-4 overflow-x-auto pb-4">
                    {statuses.map((colStatus) => {
                        const colTasks = tasks.filter((t) => t.status === colStatus);
                        return (
                            <div
                                key={colStatus}
                                className={cn(
                                    'flex w-80 shrink-0 flex-col rounded-xl border border-slate-200 border-t-4 bg-slate-50/70 p-3',
                                    KANBAN_TOP_COLORS[colStatus] ?? 'border-t-slate-400',
                                )}
                            >
                                <div className="mb-3 flex items-center justify-between px-1">
                                    <span className="text-xs font-bold text-[#101D35]">{colStatus}</span>
                                    <span className="rounded-full bg-white px-2 py-0.5 font-mono text-xs font-semibold text-slate-600 shadow-2xs">
                                        {colTasks.length}
                                    </span>
                                </div>
                                <div className="max-h-[68vh] space-y-2.5 overflow-y-auto pr-1">
                                    {colTasks.slice(0, 30).map((t) => (
                                        <div
                                            key={t.id}
                                            className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs"
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <Link
                                                    href={`/tasks/${t.id}`}
                                                    className="font-mono text-[11px] font-bold text-[#101D35] hover:underline"
                                                >
                                                    {t.code}
                                                </Link>
                                                <StatusBadge label={t.priority} />
                                            </div>
                                            <Link
                                                href={`/tasks/${t.id}`}
                                                className="mt-1.5 block text-xs font-semibold text-slate-900 hover:text-blue-700"
                                            >
                                                {t.title}
                                            </Link>
                                            <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500">
                                                <span className="font-mono">{t.deadline}</span>
                                                <span className="flex items-center gap-2">
                                                    <span className="inline-flex items-center gap-0.5">
                                                        <FileCheck2 className="h-3 w-3" /> {t.evidences_count}
                                                    </span>
                                                    <span className="inline-flex items-center gap-0.5">
                                                        <MessageSquare className="h-3 w-3" /> {t.comments_count}
                                                    </span>
                                                </span>
                                            </div>
                                            <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5">
                                                <span className="truncate text-[11px] font-medium text-slate-700">
                                                    {t.pic_name}
                                                </span>
                                                <select
                                                    value={t.status}
                                                    onChange={(e) => handleQuickMove(t, e.target.value)}
                                                    className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[11px] font-medium"
                                                >
                                                    {statuses.map((s) => (
                                                        <option key={s} value={s}>
                                                            {s}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* VIEW 3: CALENDAR (FullCalendar - Minimalist) */}
            {activeView === 'calendar' && (
                <div className="kdms-calendar rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-600">
                            <span className="inline-flex items-center gap-1.5 font-medium">
                                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                Completed
                            </span>
                            <span className="inline-flex items-center gap-1.5 font-medium">
                                <span className="h-2 w-2 rounded-full bg-blue-500" />
                                Scheduled
                            </span>
                            <span className="inline-flex items-center gap-1.5 font-medium">
                                <span className="h-2 w-2 rounded-full bg-amber-500" />
                                Review
                            </span>
                            <span className="inline-flex items-center gap-1.5 font-medium">
                                <span className="h-2 w-2 rounded-full bg-indigo-500" />
                                High Priority
                            </span>
                            <span className="inline-flex items-center gap-1.5 font-medium">
                                <span className="h-2 w-2 rounded-full bg-rose-500" />
                                Overdue
                            </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            {/* Mode: Deadline vs Date Spans */}
                            <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-[11px] font-medium">
                                <button
                                    type="button"
                                    onClick={() => setCalendarMode('deadline')}
                                    className={cn(
                                        'rounded-md px-2.5 py-1 transition',
                                        calendarMode === 'deadline'
                                            ? 'bg-white font-semibold text-slate-900 shadow-xs'
                                            : 'text-slate-500 hover:text-slate-800',
                                    )}
                                >
                                    Deadlines Only
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setCalendarMode('range')}
                                    className={cn(
                                        'rounded-md px-2.5 py-1 transition',
                                        calendarMode === 'range'
                                            ? 'bg-white font-semibold text-slate-900 shadow-xs'
                                            : 'text-slate-500 hover:text-slate-800',
                                    )}
                                >
                                    Date Spans
                                </button>
                            </div>

                            {/* Density: Compact vs Standard */}
                            <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-[11px] font-medium">
                                <button
                                    type="button"
                                    onClick={() => setCalendarDensity('compact')}
                                    className={cn(
                                        'rounded-md px-2.5 py-1 transition',
                                        calendarDensity === 'compact'
                                            ? 'bg-white font-semibold text-slate-900 shadow-xs'
                                            : 'text-slate-500 hover:text-slate-800',
                                    )}
                                >
                                    Compact
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setCalendarDensity('standard')}
                                    className={cn(
                                        'rounded-md px-2.5 py-1 transition',
                                        calendarDensity === 'standard'
                                            ? 'bg-white font-semibold text-slate-900 shadow-xs'
                                            : 'text-slate-500 hover:text-slate-800',
                                    )}
                                >
                                    Standard
                                </button>
                            </div>
                        </div>
                    </div>
                    <FullCalendar
                        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                        initialView="dayGridMonth"
                        initialDate="2026-12-01"
                        headerToolbar={{
                            left: 'prev,next today',
                            center: 'title',
                            right: 'dayGridMonth,timeGridWeek',
                        }}
                        events={calendarEvents}
                        dayMaxEvents={2}
                        moreLinkClick="popover"
                        fixedWeekCount={false}
                        height="auto"
                        eventContent={(arg) => {
                            const { code, dotColor, picName, status: taskStatus } =
                                arg.event.extendedProps as {
                                    code?: string;
                                    dotColor?: string;
                                    picName?: string;
                                    status?: string;
                                };
                            return (
                                <div
                                    title={`${code ?? ''} · ${arg.event.title}${picName ? ` (${picName} — ${taskStatus})` : ''}`}
                                    className="flex w-full items-center gap-1.5 overflow-hidden px-1.5 py-0.5 text-[11px] leading-tight font-medium"
                                >
                                    <span
                                        className="h-1.5 w-1.5 shrink-0 rounded-full"
                                        style={{ backgroundColor: dotColor ?? '#2563eb' }}
                                    />
                                    <span className="shrink-0 font-mono text-[10px] font-bold">
                                        {code}
                                    </span>
                                    {calendarDensity === 'standard' && (
                                        <span className="truncate opacity-90">
                                            {arg.event.title}
                                        </span>
                                    )}
                                </div>
                            );
                        }}
                        eventClick={(info) => {
                            router.visit(`/tasks/${info.event.id}`);
                        }}
                    />
                </div>
            )}

            {/* VIEW 4: TIMELINE / GANTT (Ref 3 Projector style) */}
            {activeView === 'timeline' && (
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                    <div className="border-b border-slate-200 bg-[#101D35] px-5 py-3 text-white">
                        <h3 className="font-display text-sm font-bold">
                            Schedule Timeline (First {timelineItems.items.length} filtered tasks)
                        </h3>
                    </div>
                    <div className="divide-y divide-slate-100 p-4">
                        {timelineItems.items.map((t) => {
                            const startMs = new Date(t.start_date ?? t.deadline).getTime();
                            const endMs = Math.max(startMs + 86400000, new Date(t.deadline).getTime());
                            const leftPct = Math.max(
                                0,
                                Math.min(92, ((startMs - timelineItems.minMs) / timelineItems.spanMs) * 100),
                            );
                            const widthPct = Math.max(
                                4,
                                Math.min(100 - leftPct, ((endMs - startMs) / timelineItems.spanMs) * 100),
                            );
                            return (
                                <div key={t.id} className="grid grid-cols-12 items-center gap-3 py-2.5">
                                    <div className="col-span-5 min-w-0 sm:col-span-4">
                                        <Link
                                            href={`/tasks/${t.id}`}
                                            className="block truncate text-xs font-semibold text-slate-900 hover:text-blue-700"
                                        >
                                            <span className="mr-1.5 font-mono text-[#101D35]">{t.code}</span>
                                            {t.title}
                                        </Link>
                                        <p className="text-[11px] text-slate-500">
                                            {t.pic_name} · {t.start_date ?? t.deadline} → {t.deadline}
                                        </p>
                                    </div>
                                    <div className="relative col-span-7 h-6 rounded-md bg-slate-100 sm:col-span-8">
                                        <div
                                            className="absolute top-1 bottom-1 rounded-full px-2 text-[10px] leading-4 font-semibold text-white"
                                            style={{
                                                left: `${leftPct}%`,
                                                width: `${widthPct}%`,
                                                backgroundColor:
                                                    t.status === 'Completed'
                                                        ? '#16A34A'
                                                        : t.priority === 'Tinggi'
                                                          ? '#101D35'
                                                          : '#2563EB',
                                            }}
                                            title={`${t.code}: ${t.start_date ?? t.deadline} to ${t.deadline}`}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Create Task Modal */}
            {createOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
                    <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="font-display text-lg font-bold text-[#101D35]">
                                Create New Task
                            </h3>
                            <button
                                type="button"
                                onClick={() => setCreateOpen(false)}
                                className="rounded p-1 text-slate-400 hover:bg-slate-100"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateTask} className="space-y-4">
                            <div>
                                <label className="mb-1 block text-xs font-semibold text-slate-700">
                                    Task Title *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={newTask.title}
                                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                />
                            </div>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                                        Primary PIC *
                                    </label>
                                    <select
                                        value={newTask.pic_user_id}
                                        onChange={(e) =>
                                            setNewTask({ ...newTask, pic_user_id: e.target.value })
                                        }
                                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                    >
                                        {users.map((u) => (
                                            <option key={u.id} value={String(u.id)}>
                                                {u.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                                        Reviewer (Optional)
                                    </label>
                                    <select
                                        value={newTask.reviewer_user_id}
                                        onChange={(e) =>
                                            setNewTask({ ...newTask, reviewer_user_id: e.target.value })
                                        }
                                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                    >
                                        <option value="">No specific reviewer</option>
                                        {users.map((u) => (
                                            <option key={u.id} value={String(u.id)}>
                                                {u.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                                        Priority *
                                    </label>
                                    <select
                                        value={newTask.priority}
                                        onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                    >
                                        {priorities.map((p) => (
                                            <option key={p} value={p}>
                                                {p}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                                        Start Date
                                    </label>
                                    <input
                                        type="date"
                                        value={newTask.start_date}
                                        onChange={(e) => setNewTask({ ...newTask, start_date: e.target.value })}
                                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                                        Deadline *
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        value={newTask.deadline}
                                        onChange={(e) => setNewTask({ ...newTask, deadline: e.target.value })}
                                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-semibold text-slate-700">
                                    Expected Result / Evidence Required
                                </label>
                                <textarea
                                    rows={2}
                                    value={newTask.expected_result}
                                    onChange={(e) =>
                                        setNewTask({ ...newTask, expected_result: e.target.value })
                                    }
                                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                />
                            </div>
                            <div className="flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setCreateOpen(false)}
                                    className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="rounded-lg bg-[#101D35] px-4 py-2 text-xs font-semibold text-white"
                                >
                                    Create Task
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AppShell>
    );
}
