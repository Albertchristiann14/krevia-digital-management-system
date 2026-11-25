import { StatusBadge } from '@/Components/shared/StatusBadge';
import { AppShell } from '@/Layouts/AppShell';
import type { PageProps } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { CheckCircle2, ClipboardList, Edit3, X } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';

interface MonthOption {
    id: number;
    month_label: string;
    phase_label: string;
    primary_focus: string;
    target_status: string;
}

interface MonthlyWorkplanRow {
    id: number;
    stage_label: string;
    expected_evidence: string | null;
    evaluation_notes: string | null;
    task: {
        id: number;
        code: string;
        title: string;
        pic_name: string | null;
        department: string | null;
        department_color: string | null;
        deadline: string;
        status: string;
        progress_pct: number;
        deadline_status: string;
        evidences_count: number;
    };
}

interface MonthlyProps extends PageProps {
    months: MonthOption[];
    selectedMonthId: number;
    selectedMonth: MonthOption | null;
    items: MonthlyWorkplanRow[];
    canEdit: boolean;
}

export default function MonthlyWorkplanIndex({
    months,
    selectedMonthId,
    selectedMonth,
    items,
    canEdit,
}: MonthlyProps) {
    const [editingItem, setEditingItem] = useState<MonthlyWorkplanRow | null>(null);
    const [note, setNote] = useState('');

    const grouped = useMemo(() => {
        const map = new Map<string, MonthlyWorkplanRow[]>();
        items.forEach((item) => {
            const key = item.stage_label || 'Monthly Activities';
            const list = map.get(key) ?? [];
            list.push(item);
            map.set(key, list);
        });
        return Array.from(map.entries());
    }, [items]);

    const selectMonth = (id: number) => {
        router.get('/workplan/monthly', { month_id: id }, { preserveState: true });
    };

    const submitNote = (e: FormEvent) => {
        e.preventDefault();
        if (!editingItem) return;
        router.patch(
            `/workplan/monthly/${editingItem.id}/evaluation`,
            { evaluation_notes: note },
            {
                preserveScroll: true,
                onSuccess: () => setEditingItem(null),
            },
        );
    };

    return (
        <AppShell
            title="Monthly Workplan"
            subtitle="Sheet 06 baseline activities synchronized live with Task Tracker (Sheet 07)"
            actions={
                <Link
                    href={`/tasks?annual_roadmap_id=${selectedMonthId}`}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#101D35] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#1A2D4E]"
                >
                    <ClipboardList className="h-4 w-4" />
                    Filter in Task Tracker
                </Link>
            }
        >
            <Head title="Monthly Workplan" />

            {/* Month Selector Pills */}
            <div className="mb-5 flex flex-wrap gap-2">
                {months.map((m) => (
                    <button
                        key={m.id}
                        type="button"
                        onClick={() => selectMonth(m.id)}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                            m.id === selectedMonthId
                                ? 'border-[#101D35] bg-[#101D35] text-white'
                                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                    >
                        {m.month_label}
                    </button>
                ))}
            </div>

            {selectedMonth && (
                <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                            <p className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
                                {selectedMonth.phase_label}
                            </p>
                            <h2 className="mt-0.5 font-display text-lg font-bold text-[#101D35]">
                                {selectedMonth.month_label} — {selectedMonth.primary_focus}
                            </h2>
                        </div>
                        <StatusBadge label={selectedMonth.target_status} />
                    </div>
                </div>
            )}

            <div className="space-y-6">
                {grouped.map(([stageLabel, stageItems]) => (
                    <div
                        key={stageLabel}
                        className="overflow-hidden rounded-xl border border-slate-200 bg-white"
                    >
                        <div className="border-b border-slate-200 bg-slate-50 px-5 py-3">
                            <h3 className="font-display text-sm font-bold text-[#101D35]">
                                {stageLabel}
                            </h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse text-left text-sm">
                                <thead className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
                                    <tr>
                                        <th className="px-4 py-2.5">Task</th>
                                        <th className="px-4 py-2.5">PIC</th>
                                        <th className="px-4 py-2.5">Expected Evidence</th>
                                        <th className="px-4 py-2.5">Deadline</th>
                                        <th className="px-4 py-2.5">Status</th>
                                        <th className="px-4 py-2.5">Evaluation Note</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {stageItems.map((row) => (
                                        <tr key={row.id} className="align-top hover:bg-slate-50/70">
                                            <td className="px-4 py-3">
                                                <Link
                                                    href={`/tasks/${row.task.id}`}
                                                    className="font-mono text-xs font-bold text-[#101D35] hover:underline"
                                                >
                                                    {row.task.code}
                                                </Link>
                                                <p className="mt-0.5 text-xs font-medium text-slate-900">
                                                    {row.task.title}
                                                </p>
                                            </td>
                                            <td className="px-4 py-3 text-xs text-slate-700 whitespace-nowrap">
                                                <div className="font-medium">{row.task.pic_name}</div>
                                                <div className="text-[11px] text-slate-500">
                                                    {row.task.department}
                                                </div>
                                            </td>
                                            <td className="max-w-xs px-4 py-3 text-xs text-slate-600">
                                                <p>{row.expected_evidence ?? '—'}</p>
                                                {row.task.evidences_count > 0 && (
                                                    <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                                                        <CheckCircle2 className="h-3 w-3" />
                                                        {row.task.evidences_count} evidence attached
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 font-mono text-xs text-slate-700 whitespace-nowrap">
                                                <div>{row.task.deadline}</div>
                                                {row.task.deadline_status && (
                                                    <div className="mt-1">
                                                        <StatusBadge label={row.task.deadline_status} />
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <StatusBadge label={row.task.status} />
                                                <div className="mt-1 font-mono text-[11px] text-slate-500">
                                                    {row.task.progress_pct}%
                                                </div>
                                            </td>
                                            <td className="max-w-xs px-4 py-3 text-xs text-slate-600">
                                                <div className="flex items-start justify-between gap-2">
                                                    <span>{row.evaluation_notes ?? '—'}</span>
                                                    {canEdit && (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setEditingItem(row);
                                                                setNote(row.evaluation_notes ?? '');
                                                            }}
                                                            className="shrink-0 rounded border border-slate-200 p-1 text-slate-500 hover:bg-slate-100"
                                                        >
                                                            <Edit3 className="h-3 w-3" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ))}
            </div>

            {editingItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
                    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
                        <div className="mb-3 flex items-center justify-between">
                            <h3 className="font-display text-base font-bold text-[#101D35]">
                                Evaluation Note · {editingItem.task.code}
                            </h3>
                            <button
                                type="button"
                                onClick={() => setEditingItem(null)}
                                className="rounded p-1 text-slate-400 hover:bg-slate-100"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <form onSubmit={submitNote} className="space-y-4">
                            <textarea
                                rows={4}
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                placeholder="Monthly Performance Review note..."
                                className="w-full rounded-lg border border-slate-200 p-3 text-sm outline-none focus:border-[#101D35]"
                            />
                            <div className="flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setEditingItem(null)}
                                    className="rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="rounded-lg bg-[#101D35] px-3.5 py-2 text-xs font-semibold text-white"
                                >
                                    Save Note
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AppShell>
    );
}
