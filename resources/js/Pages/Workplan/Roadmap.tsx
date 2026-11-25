import { StatCard } from '@/Components/shared/StatCard';
import { StatusBadge } from '@/Components/shared/StatusBadge';
import { AppShell } from '@/Layouts/AppShell';
import type { AnnualRoadmapItem, PageProps } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { Calendar, CheckCircle2, Compass, Edit3, Target, TrendingUp, X } from 'lucide-react';
import { useState, type FormEvent } from 'react';

interface RoadmapProps extends PageProps {
    roadmaps: AnnualRoadmapItem[];
    users: { id: number; name: string }[];
    canEdit: boolean;
}

export default function RoadmapIndex({ roadmaps, users, canEdit }: RoadmapProps) {
    const [editing, setEditing] = useState<AnnualRoadmapItem | null>(null);
    const [form, setForm] = useState({
        target_contacts: 0,
        target_meetings: 0,
        target_proposals: 0,
        target_won: 0,
        target_status: 'Usulan',
        primary_focus: '',
        pic_user_id: '',
    });

    const totals = roadmaps.reduce(
        (acc, r) => ({
            contacts: acc.contacts + r.target_contacts,
            meetings: acc.meetings + r.target_meetings,
            proposals: acc.proposals + r.target_proposals,
            won: acc.won + r.target_won,
            tasks: acc.tasks + r.tasks_count,
            completed: acc.completed + r.completed_tasks_count,
        }),
        { contacts: 0, meetings: 0, proposals: 0, won: 0, tasks: 0, completed: 0 },
    );

    const openEdit = (r: AnnualRoadmapItem) => {
        setEditing(r);
        setForm({
            target_contacts: r.target_contacts,
            target_meetings: r.target_meetings,
            target_proposals: r.target_proposals,
            target_won: r.target_won,
            target_status: r.target_status,
            primary_focus: r.primary_focus,
            pic_user_id: r.pic_user_id ? String(r.pic_user_id) : '',
        });
    };

    const submit = (e: FormEvent) => {
        e.preventDefault();
        if (!editing) return;
        router.patch(
            `/workplan/roadmap/${editing.id}`,
            {
                ...form,
                pic_user_id: form.pic_user_id ? Number(form.pic_user_id) : null,
            },
            {
                preserveScroll: true,
                onSuccess: () => setEditing(null),
            },
        );
    };

    return (
        <AppShell
            title="Annual Roadmap (Dec 2026 – Dec 2027)"
            subtitle="Sheet 05 source of truth · Numeric targets marked Usulan until confirmed by leadership (D-11)"
            actions={
                <Link
                    href="/workplan/monthly"
                    className="inline-flex items-center gap-2 rounded-lg bg-[#101D35] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#1A2D4E]"
                >
                    <Calendar className="h-4 w-4" />
                    Monthly Workplan
                </Link>
            }
        >
            <Head title="Annual Roadmap" />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    dark
                    label="Target Initial Contacts"
                    value={totals.contacts}
                    subtitle="13-month cumulative (Usulan)"
                    icon={Target}
                />
                <StatCard
                    label="Target Discovery Meetings"
                    value={totals.meetings}
                    subtitle="Cumulative target (Usulan)"
                    icon={Compass}
                    accent="blue"
                />
                <StatCard
                    label="Target Proposals / Won"
                    value={`${totals.proposals} / ${totals.won}`}
                    subtitle="Pending commercial agreement (D-11)"
                    icon={TrendingUp}
                    accent="amber"
                />
                <StatCard
                    label="Workplan Tasks Synced"
                    value={`${totals.completed} / ${totals.tasks}`}
                    subtitle="Live completion from Task Tracker"
                    icon={CheckCircle2}
                    accent="green"
                />
            </div>

            <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left text-sm">
                        <thead className="border-b border-slate-200 bg-[#101D35] text-xs font-semibold text-white uppercase">
                            <tr>
                                <th className="px-4 py-3">Month &amp; Phase</th>
                                <th className="px-4 py-3">Primary Focus &amp; Expected Output</th>
                                <th className="px-4 py-3">Lead PIC</th>
                                <th className="px-4 py-3 text-center">Pipeline Targets (C / M / P / W)</th>
                                <th className="px-4 py-3">Task Progress</th>
                                <th className="px-4 py-3">Status</th>
                                {canEdit && <th className="px-4 py-3 text-right">Edit</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {roadmaps.map((r) => {
                                const pct =
                                    r.tasks_count > 0
                                        ? Math.round((r.completed_tasks_count / r.tasks_count) * 100)
                                        : 0;
                                return (
                                    <tr key={r.id} className="align-top hover:bg-slate-50/70">
                                        <td className="px-4 py-3.5 whitespace-nowrap">
                                            <Link
                                                href={`/workplan/monthly?month_id=${r.id}`}
                                                className="font-semibold text-[#101D35] hover:underline"
                                            >
                                                {r.month_label}
                                            </Link>
                                            <p className="mt-0.5 text-xs text-slate-500">{r.phase_label}</p>
                                        </td>
                                        <td className="max-w-md px-4 py-3.5">
                                            <p className="text-xs font-medium text-slate-900">
                                                {r.primary_focus}
                                            </p>
                                            {r.expected_output && (
                                                <p className="mt-1 text-xs text-slate-500">
                                                    Output: {r.expected_output}
                                                </p>
                                            )}
                                        </td>
                                        <td className="px-4 py-3.5 text-xs font-medium text-slate-700 whitespace-nowrap">
                                            {r.pic_name ?? '—'}
                                        </td>
                                        <td className="px-4 py-3.5 text-center font-mono text-xs font-semibold text-slate-800 whitespace-nowrap tabular-nums">
                                            {r.target_contacts} / {r.target_meetings} / {r.target_proposals} /{' '}
                                            {r.target_won}
                                        </td>
                                        <td className="px-4 py-3.5 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <div className="h-2 w-20 overflow-hidden rounded-full bg-slate-100">
                                                    <div
                                                        className="h-full rounded-full bg-emerald-600"
                                                        style={{ width: `${pct}%` }}
                                                    />
                                                </div>
                                                <span className="font-mono text-xs text-slate-700 tabular-nums">
                                                    {r.completed_tasks_count}/{r.tasks_count}
                                                </span>
                                            </div>
                                            {r.overdue_tasks_count > 0 && (
                                                <p className="mt-1 text-[11px] font-medium text-rose-600">
                                                    {r.overdue_tasks_count} overdue
                                                </p>
                                            )}
                                        </td>
                                        <td className="px-4 py-3.5 whitespace-nowrap">
                                            <StatusBadge label={r.target_status} />
                                        </td>
                                        {canEdit && (
                                            <td className="px-4 py-3.5 text-right">
                                                <button
                                                    type="button"
                                                    onClick={() => openEdit(r)}
                                                    className="inline-flex items-center rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-50"
                                                >
                                                    <Edit3 className="h-3.5 w-3.5" />
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {editing && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
                    <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
                        <div className="mb-4 flex items-center justify-between">
                            <div>
                                <h3 className="font-display text-lg font-bold text-[#101D35]">
                                    Edit Targets · {editing.month_label}
                                </h3>
                                <p className="text-xs text-slate-500">{editing.phase_label}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setEditing(null)}
                                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={submit} className="space-y-4">
                            <div>
                                <label className="mb-1 block text-xs font-semibold text-slate-700">
                                    Primary Focus
                                </label>
                                <textarea
                                    rows={2}
                                    value={form.primary_focus}
                                    onChange={(e) => setForm({ ...form, primary_focus: e.target.value })}
                                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                                        Contacts
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={form.target_contacts}
                                        onChange={(e) =>
                                            setForm({ ...form, target_contacts: Number(e.target.value) })
                                        }
                                        className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                                        Meetings
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={form.target_meetings}
                                        onChange={(e) =>
                                            setForm({ ...form, target_meetings: Number(e.target.value) })
                                        }
                                        className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                                        Proposals
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={form.target_proposals}
                                        onChange={(e) =>
                                            setForm({ ...form, target_proposals: Number(e.target.value) })
                                        }
                                        className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                                        Won
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={form.target_won}
                                        onChange={(e) =>
                                            setForm({ ...form, target_won: Number(e.target.value) })
                                        }
                                        className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                                        Lead PIC
                                    </label>
                                    <select
                                        value={form.pic_user_id}
                                        onChange={(e) => setForm({ ...form, pic_user_id: e.target.value })}
                                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                    >
                                        <option value="">Unassigned</option>
                                        {users.map((u) => (
                                            <option key={u.id} value={String(u.id)}>
                                                {u.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                                        Target Status (D-11)
                                    </label>
                                    <select
                                        value={form.target_status}
                                        onChange={(e) => setForm({ ...form, target_status: e.target.value })}
                                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                    >
                                        <option value="Usulan">Usulan</option>
                                        <option value="Disepakati">Disepakati</option>
                                        <option value="Perlu Konfirmasi Manajemen">
                                            Perlu Konfirmasi Manajemen
                                        </option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setEditing(null)}
                                    className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="rounded-lg bg-[#101D35] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1A2D4E]"
                                >
                                    Save Targets
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AppShell>
    );
}
