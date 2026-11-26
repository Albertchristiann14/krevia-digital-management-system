import { StatusBadge } from '@/Components/shared/StatusBadge';
import { AppShell } from '@/Layouts/AppShell';
import { UserAvatar } from '@/Components/shared/UserAvatar';
import { cn } from '@/lib/utils';
import type { PageProps } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { Award, CheckCircle2, ClipboardCheck, Scale, Target } from 'lucide-react';
import { useState, type FormEvent } from 'react';

interface KpiDefRow {
    id: number;
    code: string;
    sort_order: number;
    name: string;
    definition: string | null;
    target_label: string;
    evaluation_period: string;
    weight: number;
    data_status: string;
}

interface KpiEvalRow {
    id: number;
    period_type: string;
    period_label: string;
    total_score: number;
    rating_band: string;
    status: string;
    evaluator: string | null;
    approver: string | null;
    notes: string | null;
    items: {
        id: number;
        kpi_definition_id: number;
        code: string | null;
        name: string | null;
        target_label: string | null;
        actual_value: string | null;
        score: number;
        weight: number;
        weighted_score: number;
        notes: string | null;
    }[];
}

interface MemberKpi {
    user_id: number;
    employee_code: string;
    name: string | null;
    position: string | null;
    department: string | null;
    avatar_color: string | null;
    total_weight: number;
    definitions: KpiDefRow[];
    latest_evaluation: {
        id: number;
        period_label: string;
        period_type: string;
        total_score: number;
        rating_band: string;
        status: string;
        approver: string | null;
    } | null;
    evaluations: KpiEvalRow[];
}

interface KpiIndexProps extends PageProps {
    members: MemberKpi[];
    ratingGuide: { range: string; band: string; description: string }[];
    permissions: {
        canViewAll: boolean;
        canEdit: boolean;
        canApprove: boolean;
    };
}

export default function KpiIndex({
    members,
    ratingGuide,
    permissions,
    errors,
}: KpiIndexProps) {
    const [selectedUserId, setSelectedUserId] = useState<number>(members[0]?.user_id ?? 0);
    const activeMember = members.find((m) => m.user_id === selectedUserId) ?? members[0];

    const [mode, setMode] = useState<'scorecard' | 'evaluate' | 'weights'>('scorecard');
    const [periodType, setPeriodType] = useState<'Bulanan' | 'Kuartalan'>('Bulanan');
    const [periodLabel, setPeriodLabel] = useState('2026-12');
    const [evalNotes, setEvalNotes] = useState('');

    const [scoreDraft, setScoreDraft] = useState<
        Record<number, { actual_value: string; score: string; notes: string }>
    >({});
    const [weightDraft, setWeightDraft] = useState<Record<number, string>>({});

    const initEvaluation = (member: MemberKpi) => {
        const next: Record<number, { actual_value: string; score: string; notes: string }> = {};
        member.definitions.forEach((d) => {
            next[d.id] = { actual_value: '', score: '85', notes: '' };
        });
        setScoreDraft(next);
        setMode('evaluate');
    };

    const initWeights = (member: MemberKpi) => {
        const next: Record<number, string> = {};
        member.definitions.forEach((d) => {
            next[d.id] = String(d.weight);
        });
        setWeightDraft(next);
        setMode('weights');
    };

    const submitEvaluation = (e: FormEvent) => {
        e.preventDefault();
        if (!activeMember) return;
        router.post(
            `/kpi/members/${activeMember.user_id}/evaluations`,
            {
                period_type: periodType,
                period_label: periodLabel,
                notes: evalNotes,
                items: scoreDraft,
            },
            {
                onSuccess: () => setMode('scorecard'),
            },
        );
    };

    const submitWeights = (e: FormEvent) => {
        e.preventDefault();
        if (!activeMember) return;
        router.put(
            `/kpi/members/${activeMember.user_id}/weights`,
            { weights: weightDraft },
            { onSuccess: () => setMode('scorecard') },
        );
    };

    const weightSum = activeMember
        ? activeMember.definitions.reduce(
              (acc, d) => acc + parseFloat(weightDraft[d.id] ?? String(d.weight)),
              0,
          )
        : 0;

    const liveWeightedTotal = activeMember
        ? activeMember.definitions.reduce((acc, d) => {
              const s = parseFloat(scoreDraft[d.id]?.score ?? '0') || 0;
              return acc + d.weight * s;
          }, 0)
        : 0;

    const errorList = Object.values(errors ?? {});

    return (
        <AppShell
            title="KPI & Performance Evaluation"
            subtitle="Sheet 12 role-aligned scorecards • Weighted total = 1.00 (100%) per member"
        >
            <Head title="KPI & Performance — KDMS" />

            {errorList.length > 0 && (
                <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">
                    {errorList.map((m, i) => (
                        <div key={i}>{m}</div>
                    ))}
                </div>
            )}

            {/* Rating Band Reference Strip */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {ratingGuide.map((rg) => (
                    <div
                        key={rg.band}
                        className="rounded-xl border border-slate-200 bg-white px-4 py-3"
                    >
                        <div className="flex items-center justify-between">
                            <span className="font-mono text-xs font-bold text-[#101D35]">
                                {rg.range}
                            </span>
                            <StatusBadge label={rg.band} />
                        </div>
                        <p className="mt-1 text-[11px] text-slate-500">{rg.description}</p>
                    </div>
                ))}
            </div>

            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-4">
                {/* Member List */}
                <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3 lg:col-span-1">
                    <p className="px-2 py-1 text-[11px] font-bold text-slate-400 uppercase">
                        Team Scorecards ({members.length})
                    </p>
                    {members.map((m) => (
                        <button
                            key={m.user_id}
                            type="button"
                            onClick={() => {
                                setSelectedUserId(m.user_id);
                                setMode('scorecard');
                            }}
                            className={cn(
                                'flex w-full items-center justify-between rounded-xl p-2.5 text-left transition',
                                activeMember?.user_id === m.user_id
                                    ? 'bg-[#101D35] text-white'
                                    : 'hover:bg-slate-50',
                            )}
                        >
                            <div className="flex items-center gap-2.5">
                                <UserAvatar
                                    name={m.name}
                                    avatarUrl={(m as { avatar_url?: string | null }).avatar_url}
                                    avatarColor={m.avatar_color}
                                    size="sm"
                                />
                                <div className="min-w-0">
                                    <p className="truncate text-xs font-bold">{m.name}</p>
                                    <p
                                        className={cn(
                                            'truncate text-[10px]',
                                            activeMember?.user_id === m.user_id
                                                ? 'text-slate-300'
                                                : 'text-slate-500',
                                        )}
                                    >
                                        {m.definitions.length} KPIs • Weight{' '}
                                        {Math.round(m.total_weight * 100)}%
                                    </p>
                                </div>
                            </div>
                            {m.latest_evaluation && (
                                <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold">
                                    {m.latest_evaluation.total_score}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Active Member Detail */}
                {activeMember && (
                    <div className="space-y-6 lg:col-span-3">
                        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-5">
                            <div>
                                <h2 className="text-base font-bold text-[#101D35]">
                                    {activeMember.name}
                                </h2>
                                <p className="text-xs text-slate-500">
                                    {activeMember.position} • {activeMember.department} • Total Weight:{' '}
                                    <strong className="text-[#101D35]">
                                        {activeMember.total_weight.toFixed(2)} (100%)
                                    </strong>
                                </p>
                            </div>
                            {permissions.canEdit && (
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        onClick={() => initWeights(activeMember)}
                                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-[#101D35] hover:bg-slate-50"
                                    >
                                        <Scale className="h-3.5 w-3.5" />
                                        Edit Weights
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => initEvaluation(activeMember)}
                                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#101D35] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#192c4e]"
                                    >
                                        <ClipboardCheck className="h-3.5 w-3.5" />
                                        Score Evaluation
                                    </button>
                                </div>
                            )}
                        </div>

                        {mode === 'scorecard' && (
                            <>
                                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                                    <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                                        <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase">
                                            <tr>
                                                <th className="px-4 py-3">KPI</th>
                                                <th className="px-4 py-3">Target</th>
                                                <th className="px-4 py-3">Period</th>
                                                <th className="px-4 py-3 text-right">Weight</th>
                                                <th className="px-4 py-3">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {activeMember.definitions.map((d) => (
                                                <tr key={d.id}>
                                                    <td className="px-4 py-3">
                                                        <div className="font-bold text-[#101D35]">
                                                            {d.sort_order}. {d.name}
                                                        </div>
                                                        {d.definition && (
                                                            <div className="text-[11px] text-slate-500">
                                                                {d.definition}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 font-medium text-slate-700">
                                                        {d.target_label}
                                                    </td>
                                                    <td className="px-4 py-3 text-slate-600">
                                                        {d.evaluation_period}
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-mono font-bold text-[#101D35]">
                                                        {Math.round(d.weight * 100)}%
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <StatusBadge label={d.data_status} />
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-5">
                                    <h3 className="flex items-center gap-1.5 text-xs font-bold text-[#101D35] uppercase">
                                        <Award className="h-4 w-4" />
                                        Recorded Evaluations ({activeMember.evaluations.length})
                                    </h3>
                                    {activeMember.evaluations.map((ev) => (
                                        <div
                                            key={ev.id}
                                            className="rounded-xl border border-slate-200 p-4"
                                        >
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono text-sm font-bold text-[#101D35]">
                                                        {ev.period_label} ({ev.period_type})
                                                    </span>
                                                    <StatusBadge label={ev.rating_band} />
                                                    <StatusBadge label={ev.status} />
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-base font-bold text-[#101D35]">
                                                        {ev.total_score} / 100
                                                    </span>
                                                    {ev.status !== 'Approved' &&
                                                        permissions.canApprove && (
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    router.post(
                                                                        `/kpi/evaluations/${ev.id}/approve`,
                                                                    )
                                                                }
                                                                className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1 text-[11px] font-semibold text-white"
                                                            >
                                                                <CheckCircle2 className="h-3.5 w-3.5" />
                                                                Approve
                                                            </button>
                                                        )}
                                                </div>
                                            </div>
                                            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                                                {ev.items.map((it) => (
                                                    <div
                                                        key={it.id}
                                                        className="rounded-lg bg-slate-50 px-3 py-2 text-xs"
                                                    >
                                                        <div className="flex justify-between font-semibold text-slate-800">
                                                            <span>{it.name}</span>
                                                            <span>
                                                                {it.score} ×{' '}
                                                                {Math.round(it.weight * 100)}% ={' '}
                                                                {it.weighted_score}
                                                            </span>
                                                        </div>
                                                        {it.actual_value && (
                                                            <p className="text-[11px] text-slate-500">
                                                                Actual: {it.actual_value}
                                                            </p>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                    {activeMember.evaluations.length === 0 && (
                                        <p className="py-6 text-center text-xs text-slate-400">
                                            No evaluations recorded for {activeMember.name} yet.
                                        </p>
                                    )}
                                </div>
                            </>
                        )}

                        {mode === 'evaluate' && (
                            <form
                                onSubmit={submitEvaluation}
                                className="space-y-4 rounded-xl border border-slate-200 bg-white p-5"
                            >
                                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                                    <h3 className="text-sm font-bold text-[#101D35]">
                                        Record Evaluation — {activeMember.name}
                                    </h3>
                                    <span className="rounded-lg bg-[#101D35] px-3 py-1 text-xs font-bold text-white">
                                        Live Weighted Total: {liveWeightedTotal.toFixed(2)} / 100
                                    </span>
                                </div>
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    <select
                                        value={periodType}
                                        onChange={(e) =>
                                            setPeriodType(
                                                e.target.value as 'Bulanan' | 'Kuartalan',
                                            )
                                        }
                                        className="rounded-lg border border-slate-200 px-3 py-2 text-xs"
                                    >
                                        <option value="Bulanan">Bulanan</option>
                                        <option value="Kuartalan">Kuartalan</option>
                                    </select>
                                    <input
                                        type="text"
                                        required
                                        value={periodLabel}
                                        onChange={(e) => setPeriodLabel(e.target.value)}
                                        placeholder="e.g. 2026-12 or 2027-Q1"
                                        className="rounded-lg border border-slate-200 px-3 py-2 text-xs"
                                    />
                                </div>

                                <div className="space-y-2.5">
                                    {activeMember.definitions.map((d) => (
                                        <div
                                            key={d.id}
                                            className="grid grid-cols-1 gap-2 rounded-lg border border-slate-200 p-3 sm:grid-cols-4"
                                        >
                                            <div className="sm:col-span-2">
                                                <p className="text-xs font-bold text-[#101D35]">
                                                    {d.name} ({Math.round(d.weight * 100)}%)
                                                </p>
                                                <p className="text-[11px] text-slate-500">
                                                    Target: {d.target_label}
                                                </p>
                                            </div>
                                            <input
                                                type="text"
                                                value={scoreDraft[d.id]?.actual_value ?? ''}
                                                onChange={(e) =>
                                                    setScoreDraft((prev) => ({
                                                        ...prev,
                                                        [d.id]: {
                                                            ...prev[d.id],
                                                            actual_value: e.target.value,
                                                        },
                                                    }))
                                                }
                                                placeholder="Actual realization"
                                                className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
                                            />
                                            <input
                                                type="number"
                                                min="0"
                                                max="100"
                                                step="0.5"
                                                required
                                                value={scoreDraft[d.id]?.score ?? '0'}
                                                onChange={(e) =>
                                                    setScoreDraft((prev) => ({
                                                        ...prev,
                                                        [d.id]: {
                                                            ...prev[d.id],
                                                            score: e.target.value,
                                                        },
                                                    }))
                                                }
                                                placeholder="Score 0-100"
                                                className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold"
                                            />
                                        </div>
                                    ))}
                                </div>

                                <textarea
                                    rows={2}
                                    value={evalNotes}
                                    onChange={(e) => setEvalNotes(e.target.value)}
                                    placeholder="Evaluation notes..."
                                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                                />

                                <div className="flex justify-end gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setMode('scorecard')}
                                        className="rounded-lg border border-slate-200 px-4 py-2 text-xs"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="rounded-lg bg-[#101D35] px-4 py-2 text-xs font-semibold text-white"
                                    >
                                        Save Evaluation
                                    </button>
                                </div>
                            </form>
                        )}

                        {mode === 'weights' && (
                            <form
                                onSubmit={submitWeights}
                                className="space-y-3 rounded-xl border border-slate-200 bg-white p-5"
                            >
                                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                    <h3 className="text-sm font-bold text-[#101D35]">
                                        Rebalance KPI Weights (Must Sum to 1.00)
                                    </h3>
                                    <span
                                        className={cn(
                                            'rounded-full px-3 py-1 text-xs font-bold',
                                            Math.abs(weightSum - 1) <= 0.0005
                                                ? 'bg-emerald-50 text-emerald-700'
                                                : 'bg-rose-50 text-rose-700',
                                        )}
                                    >
                                        Sum: {weightSum.toFixed(4)}
                                    </span>
                                </div>
                                {activeMember.definitions.map((d) => (
                                    <div
                                        key={d.id}
                                        className="flex items-center justify-between gap-4 rounded-lg border border-slate-100 px-3 py-2 text-xs"
                                    >
                                        <span className="font-medium text-slate-800">{d.name}</span>
                                        <input
                                            type="number"
                                            step="0.05"
                                            min="0"
                                            max="1"
                                            value={weightDraft[d.id] ?? String(d.weight)}
                                            onChange={(e) =>
                                                setWeightDraft((prev) => ({
                                                    ...prev,
                                                    [d.id]: e.target.value,
                                                }))
                                            }
                                            className="w-24 rounded-lg border border-slate-200 px-2.5 py-1 text-right font-mono font-bold"
                                        />
                                    </div>
                                ))}
                                <div className="flex justify-end gap-2 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setMode('scorecard')}
                                        className="rounded-lg border border-slate-200 px-4 py-2 text-xs"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="rounded-lg bg-[#101D35] px-4 py-2 text-xs font-semibold text-white"
                                    >
                                        Save Weights
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                )}
            </div>
        </AppShell>
    );
}
