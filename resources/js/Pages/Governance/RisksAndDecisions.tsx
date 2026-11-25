import { StatusBadge } from '@/Components/shared/StatusBadge';
import { AppShell } from '@/Layouts/AppShell';
import { cn, formatShortDate } from '@/lib/utils';
import type { PageProps } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { AlertTriangle, CheckCircle2, Gavel, Plus, ShieldAlert, X } from 'lucide-react';
import { useState, type FormEvent } from 'react';

interface RiskRow {
    id: number;
    code: string;
    category: string;
    title: string;
    likelihood: number;
    impact: number;
    score: number;
    level: string;
    pic_user_id: number | null;
    pic_name: string | null;
    mitigation_plan: string;
    contingency_plan: string | null;
    status: string;
    last_reviewed_at: string | null;
}

interface DecisionRow {
    id: number;
    code: string;
    decision_date: string | null;
    topic_decision: string;
    deadline: string | null;
    status: string;
    pic_name: string | null;
    follow_up: string | null;
    data_status: string;
    approver_name: string | null;
    source_meeting_code: string | null;
}

interface RisksDecisionsProps extends PageProps {
    risks: RiskRow[];
    decisions: DecisionRow[];
    categories: string[];
    riskStatuses: string[];
    decisionStatuses: string[];
    users: { id: number; name: string }[];
    permissions: {
        canManageRisks: boolean;
        canCreateDecisions: boolean;
        canApproveDecisions: boolean;
    };
}

export default function RisksAndDecisions({
    risks,
    decisions,
    categories,
    riskStatuses,
    users,
    permissions,
    errors,
}: RisksDecisionsProps) {
    const [tab, setTab] = useState<'risks' | 'decisions'>('risks');
    const [showRiskModal, setShowRiskModal] = useState(false);
    const [showDecisionModal, setShowDecisionModal] = useState(false);
    const [reviewingRisk, setReviewingRisk] = useState<RiskRow | null>(null);

    const riskForm = useForm({
        category: categories[0] ?? 'Bisnis',
        title: '',
        likelihood: '3',
        impact: '3',
        pic_user_id: users[0]?.id ? String(users[0].id) : '',
        mitigation_plan: '',
        contingency_plan: '',
    });

    const reviewForm = useForm({
        likelihood: '3',
        impact: '3',
        status: 'Open',
        notes: '',
    });

    const decisionForm = useForm({
        topic_decision: '',
        decision_date: new Date().toISOString().slice(0, 10),
        deadline: '',
        pic_user_id: users[0]?.id ? String(users[0].id) : '',
        follow_up: '',
        data_status: 'Usulan',
    });

    const highRisks = risks.filter((r) => r.score >= 15);
    const pendingConfirmDecisions = decisions.filter(
        (d) => d.data_status !== 'Disepakati' || d.status === 'Open',
    );
    const errorList = Object.values(errors ?? {});

    return (
        <AppShell
            title="Risk Register & Decision Log"
            subtitle="Sheet 14 • 5×5 Risk Matrix (Score ≥15 Tinggi requires contingency plan) & Management Decision Log (D-01–D-13+)"
            actions={
                <div className="flex gap-2">
                    {permissions.canManageRisks && (
                        <button
                            type="button"
                            onClick={() => setShowRiskModal(true)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-[#101D35] hover:bg-slate-50"
                        >
                            <Plus className="h-4 w-4" />
                            Log Risk
                        </button>
                    )}
                    {permissions.canCreateDecisions && (
                        <button
                            type="button"
                            onClick={() => setShowDecisionModal(true)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-[#101D35] px-3.5 py-2 text-xs font-semibold text-white"
                        >
                            <Plus className="h-4 w-4" />
                            Log Decision
                        </button>
                    )}
                </div>
            }
        >
            <Head title="Risks & Decisions — KDMS" />

            {errorList.length > 0 && (
                <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">
                    {errorList.map((e, i) => (
                        <div key={i}>{e}</div>
                    ))}
                </div>
            )}

            {/* Summary */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                    <p className="text-[11px] text-slate-500">Total Risks</p>
                    <p className="text-xl font-bold text-[#101D35]">{risks.length}</p>
                </div>
                <div className="rounded-xl border border-rose-200 bg-rose-50/70 px-4 py-3">
                    <p className="text-[11px] font-medium text-rose-800">High Risks (Score ≥15)</p>
                    <p className="text-xl font-bold text-rose-700">{highRisks.length}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                    <p className="text-[11px] text-slate-500">Decisions Logged</p>
                    <p className="text-xl font-bold text-[#101D35]">{decisions.length}</p>
                </div>
                <div className="rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3">
                    <p className="text-[11px] font-medium text-amber-800">
                        Open / Pending Confirmation
                    </p>
                    <p className="text-xl font-bold text-amber-700">
                        {pendingConfirmDecisions.length}
                    </p>
                </div>
            </div>

            <div className="mt-4 flex gap-1 rounded-xl border border-slate-200 bg-white p-1.5">
                <button
                    type="button"
                    onClick={() => setTab('risks')}
                    className={cn(
                        'rounded-lg px-3.5 py-1.5 text-xs font-semibold',
                        tab === 'risks' ? 'bg-[#101D35] text-white' : 'text-slate-600',
                    )}
                >
                    Risk Register & 5×5 Heatmap ({risks.length})
                </button>
                <button
                    type="button"
                    onClick={() => setTab('decisions')}
                    className={cn(
                        'rounded-lg px-3.5 py-1.5 text-xs font-semibold',
                        tab === 'decisions' ? 'bg-[#101D35] text-white' : 'text-slate-600',
                    )}
                >
                    Management Decision Log ({decisions.length})
                </button>
            </div>

            {tab === 'risks' && (
                <div className="mt-4 space-y-6">
                    {/* 5x5 Heatmap */}
                    <div className="rounded-xl border border-slate-200 bg-white p-5">
                        <h3 className="text-xs font-bold text-[#101D35] uppercase">
                            5×5 Risk Heatmap (Likelihood rows 5→1 × Impact columns 1→5)
                        </h3>
                        <div className="mt-3 overflow-x-auto">
                            <table className="w-full border-collapse text-center text-[11px]">
                                <thead>
                                    <tr>
                                        <th className="p-2 text-left text-slate-500">L \ I</th>
                                        {[1, 2, 3, 4, 5].map((imp) => (
                                            <th key={imp} className="p-2 text-slate-600">
                                                Impact {imp}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {[5, 4, 3, 2, 1].map((lik) => (
                                        <tr key={lik}>
                                            <td className="p-2 text-left font-bold text-slate-600">
                                                L={lik}
                                            </td>
                                            {[1, 2, 3, 4, 5].map((imp) => {
                                                const score = lik * imp;
                                                const cellRisks = risks.filter(
                                                    (r) =>
                                                        r.likelihood === lik && r.impact === imp,
                                                );
                                                return (
                                                    <td
                                                        key={imp}
                                                        className={cn(
                                                            'border border-white p-2 align-top',
                                                            score >= 15
                                                                ? 'bg-rose-100 text-rose-900'
                                                                : score >= 8
                                                                  ? 'bg-amber-100 text-amber-900'
                                                                  : 'bg-emerald-50 text-emerald-900',
                                                        )}
                                                    >
                                                        <div className="font-mono text-[10px] opacity-60">
                                                            {score}
                                                        </div>
                                                        <div className="mt-0.5 flex flex-wrap justify-center gap-1">
                                                            {cellRisks.map((cr) => (
                                                                <span
                                                                    key={cr.id}
                                                                    className="rounded bg-white/90 px-1.5 py-0.5 font-mono text-[10px] font-bold text-[#101D35]"
                                                                >
                                                                    {cr.code}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                        <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                            <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase">
                                <tr>
                                    <th className="px-4 py-3">Risk</th>
                                    <th className="px-4 py-3">Score & Level</th>
                                    <th className="px-4 py-3">Mitigation & Contingency</th>
                                    <th className="px-4 py-3">PIC & Status</th>
                                    {permissions.canManageRisks && (
                                        <th className="px-4 py-3 text-right">Review</th>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {risks.map((r) => (
                                    <tr key={r.id}>
                                        <td className="px-4 py-3 align-top">
                                            <div className="font-mono font-bold text-[#101D35]">
                                                {r.code} • {r.category}
                                            </div>
                                            <p className="mt-1 max-w-sm font-semibold text-slate-800">
                                                {r.title}
                                            </p>
                                        </td>
                                        <td className="px-4 py-3 align-top">
                                            <div className="font-mono font-bold text-[#101D35]">
                                                {r.likelihood} × {r.impact} = {r.score}
                                            </div>
                                            <div className="mt-1">
                                                <StatusBadge label={r.level} />
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 align-top text-slate-600">
                                            <p>
                                                <strong>Mitigation:</strong> {r.mitigation_plan}
                                            </p>
                                            {r.contingency_plan && (
                                                <p className="mt-1 text-slate-500">
                                                    <strong>Contingency:</strong>{' '}
                                                    {r.contingency_plan}
                                                </p>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 align-top">
                                            <div className="font-medium text-slate-700">
                                                {r.pic_name}
                                            </div>
                                            <div className="mt-1">
                                                <StatusBadge label={r.status} />
                                            </div>
                                        </td>
                                        {permissions.canManageRisks && (
                                            <td className="px-4 py-3 text-right align-top">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setReviewingRisk(r);
                                                        reviewForm.setData({
                                                            likelihood: String(r.likelihood),
                                                            impact: String(r.impact),
                                                            status: r.status,
                                                            notes: '',
                                                        });
                                                    }}
                                                    className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-[#101D35] hover:bg-slate-50"
                                                >
                                                    Review
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {tab === 'decisions' && (
                <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
                    <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                        <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase">
                            <tr>
                                <th className="px-4 py-3">ID & Date</th>
                                <th className="px-4 py-3">Decision & Follow-up</th>
                                <th className="px-4 py-3">PIC & Deadline</th>
                                <th className="px-4 py-3">Status & Confirmation</th>
                                {permissions.canApproveDecisions && (
                                    <th className="px-4 py-3 text-right">Action</th>
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {decisions.map((d) => (
                                <tr key={d.id}>
                                    <td className="px-4 py-3 align-top">
                                        <div className="font-mono font-bold text-[#101D35]">
                                            {d.code}
                                        </div>
                                        <div className="text-[11px] text-slate-400">
                                            {formatShortDate(d.decision_date)}
                                        </div>
                                        {d.source_meeting_code && (
                                            <div className="mt-0.5 text-[10px] text-blue-600">
                                                From {d.source_meeting_code}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 align-top">
                                        <p className="max-w-lg font-semibold text-slate-800">
                                            {d.topic_decision}
                                        </p>
                                        {d.follow_up && (
                                            <p className="mt-1 text-[11px] text-slate-500">
                                                Follow-up: {d.follow_up}
                                            </p>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 align-top text-slate-600">
                                        <div>{d.pic_name}</div>
                                        <div className="text-[11px] text-slate-400">
                                            Due: {formatShortDate(d.deadline)}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 align-top">
                                        <div className="flex flex-col gap-1">
                                            <StatusBadge label={d.status} />
                                            <StatusBadge label={d.data_status} />
                                        </div>
                                    </td>
                                    {permissions.canApproveDecisions && (
                                        <td className="px-4 py-3 text-right align-top">
                                            {d.status !== 'Done' && (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        router.post(
                                                            `/governance/decisions/${d.id}/approve`,
                                                        )
                                                    }
                                                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white"
                                                >
                                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                                    Confirm
                                                </button>
                                            )}
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Risk Create Modal */}
            {showRiskModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
                    <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <h2 className="text-base font-bold text-[#101D35]">Log New Risk</h2>
                            <button
                                type="button"
                                onClick={() => setShowRiskModal(false)}
                                className="rounded p-1 text-slate-400"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                riskForm.post('/governance/risks', {
                                    onSuccess: () => {
                                        riskForm.reset(
                                            'title',
                                            'mitigation_plan',
                                            'contingency_plan',
                                        );
                                        setShowRiskModal(false);
                                    },
                                });
                            }}
                            className="mt-4 space-y-3"
                        >
                            <div className="grid grid-cols-2 gap-2">
                                <select
                                    value={riskForm.data.category}
                                    onChange={(e) => riskForm.setData('category', e.target.value)}
                                    className="rounded-lg border border-slate-200 px-3 py-2 text-xs"
                                >
                                    {categories.map((c) => (
                                        <option key={c} value={c}>
                                            {c}
                                        </option>
                                    ))}
                                </select>
                                <select
                                    value={riskForm.data.pic_user_id}
                                    onChange={(e) =>
                                        riskForm.setData('pic_user_id', e.target.value)
                                    }
                                    className="rounded-lg border border-slate-200 px-3 py-2 text-xs"
                                >
                                    {users.map((u) => (
                                        <option key={u.id} value={u.id}>
                                            {u.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <input
                                type="text"
                                required
                                value={riskForm.data.title}
                                onChange={(e) => riskForm.setData('title', e.target.value)}
                                placeholder="Risk description"
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                            />
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-[11px] font-semibold text-slate-600">
                                        Likelihood (1-5)
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="5"
                                        value={riskForm.data.likelihood}
                                        onChange={(e) =>
                                            riskForm.setData('likelihood', e.target.value)
                                        }
                                        className="mt-0.5 w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs"
                                    />
                                </div>
                                <div>
                                    <label className="text-[11px] font-semibold text-slate-600">
                                        Impact (1-5)
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="5"
                                        value={riskForm.data.impact}
                                        onChange={(e) => riskForm.setData('impact', e.target.value)}
                                        className="mt-0.5 w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs"
                                    />
                                </div>
                            </div>
                            <textarea
                                rows={2}
                                required
                                value={riskForm.data.mitigation_plan}
                                onChange={(e) =>
                                    riskForm.setData('mitigation_plan', e.target.value)
                                }
                                placeholder="Preventive mitigation plan *"
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                            />
                            <textarea
                                rows={2}
                                value={riskForm.data.contingency_plan}
                                onChange={(e) =>
                                    riskForm.setData('contingency_plan', e.target.value)
                                }
                                placeholder="Contingency plan (required if L×I >= 15)"
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                            />
                            <div className="flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowRiskModal(false)}
                                    className="rounded-lg border border-slate-200 px-4 py-2 text-xs"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="rounded-lg bg-[#101D35] px-4 py-2 text-xs font-semibold text-white"
                                >
                                    Save Risk
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Review Risk Modal */}
            {reviewingRisk && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
                    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <h2 className="text-base font-bold text-[#101D35]">
                                Review {reviewingRisk.code}
                            </h2>
                            <button
                                type="button"
                                onClick={() => setReviewingRisk(null)}
                                className="rounded p-1 text-slate-400"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                reviewForm.post(`/governance/risks/${reviewingRisk.id}/review`, {
                                    onSuccess: () => setReviewingRisk(null),
                                });
                            }}
                            className="mt-4 space-y-3"
                        >
                            <div className="grid grid-cols-3 gap-2">
                                <input
                                    type="number"
                                    min="1"
                                    max="5"
                                    value={reviewForm.data.likelihood}
                                    onChange={(e) =>
                                        reviewForm.setData('likelihood', e.target.value)
                                    }
                                    className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
                                />
                                <input
                                    type="number"
                                    min="1"
                                    max="5"
                                    value={reviewForm.data.impact}
                                    onChange={(e) => reviewForm.setData('impact', e.target.value)}
                                    className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
                                />
                                <select
                                    value={reviewForm.data.status}
                                    onChange={(e) => reviewForm.setData('status', e.target.value)}
                                    className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
                                >
                                    {riskStatuses.map((s) => (
                                        <option key={s} value={s}>
                                            {s}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <textarea
                                rows={2}
                                value={reviewForm.data.notes}
                                onChange={(e) => reviewForm.setData('notes', e.target.value)}
                                placeholder="Review notes..."
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                            />
                            <div className="flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setReviewingRisk(null)}
                                    className="rounded-lg border border-slate-200 px-4 py-2 text-xs"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="rounded-lg bg-[#101D35] px-4 py-2 text-xs font-semibold text-white"
                                >
                                    Record Review
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Decision Create Modal */}
            {showDecisionModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
                    <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <h2 className="text-base font-bold text-[#101D35]">Log Decision</h2>
                            <button
                                type="button"
                                onClick={() => setShowDecisionModal(false)}
                                className="rounded p-1 text-slate-400"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                decisionForm.post('/governance/decisions', {
                                    onSuccess: () => {
                                        decisionForm.reset('topic_decision', 'follow_up');
                                        setShowDecisionModal(false);
                                    },
                                });
                            }}
                            className="mt-4 space-y-3"
                        >
                            <textarea
                                rows={3}
                                required
                                value={decisionForm.data.topic_decision}
                                onChange={(e) =>
                                    decisionForm.setData('topic_decision', e.target.value)
                                }
                                placeholder="Decision topic & resolution..."
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                            />
                            <div className="grid grid-cols-2 gap-2">
                                <select
                                    value={decisionForm.data.pic_user_id}
                                    onChange={(e) =>
                                        decisionForm.setData('pic_user_id', e.target.value)
                                    }
                                    className="rounded-lg border border-slate-200 px-3 py-2 text-xs"
                                >
                                    {users.map((u) => (
                                        <option key={u.id} value={u.id}>
                                            {u.name}
                                        </option>
                                    ))}
                                </select>
                                <select
                                    value={decisionForm.data.data_status}
                                    onChange={(e) =>
                                        decisionForm.setData('data_status', e.target.value)
                                    }
                                    className="rounded-lg border border-slate-200 px-3 py-2 text-xs"
                                >
                                    <option value="Usulan">Usulan</option>
                                    <option value="Perlu Konfirmasi Manajemen">
                                        Perlu Konfirmasi Manajemen
                                    </option>
                                    <option value="Disepakati">Disepakati</option>
                                </select>
                            </div>
                            <input
                                type="text"
                                value={decisionForm.data.follow_up}
                                onChange={(e) =>
                                    decisionForm.setData('follow_up', e.target.value)
                                }
                                placeholder="Follow-up action..."
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                            />
                            <div className="flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowDecisionModal(false)}
                                    className="rounded-lg border border-slate-200 px-4 py-2 text-xs"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="rounded-lg bg-[#101D35] px-4 py-2 text-xs font-semibold text-white"
                                >
                                    Log Decision
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AppShell>
    );
}
