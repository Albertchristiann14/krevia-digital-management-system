import { StatusBadge } from '@/Components/shared/StatusBadge';
import { AppShell } from '@/Layouts/AppShell';
import { cn, formatShortDate } from '@/lib/utils';
import type { PageProps } from '@/types';
import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowLeft,
    ArrowRight,
    Briefcase,
    Building2,
    CalendarClock,
    CheckCircle2,
    Clock,
    FileText,
    Globe,
    History,
    Mail,
    MessageSquarePlus,
    Phone,
    Plus,
    Sparkles,
    UserCheck,
    X,
} from 'lucide-react';
import { useState, type FormEvent } from 'react';

interface ContactItem {
    id: number;
    name: string;
    role_title: string | null;
    email: string | null;
    phone: string | null;
    is_decision_maker: boolean;
}

interface LeadShowProps extends PageProps {
    lead: {
        id: number;
        code: string;
        company: {
            id: number;
            name: string;
            industry: string;
            location: string | null;
            phone: string | null;
            email: string | null;
            website: string | null;
            contacts: ContactItem[];
        };
        primary_contact_id: number | null;
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
        lost_reason: string | null;
        data_status: string;
        notes: string | null;
        project: { id: number; code: string; name: string; status: string } | null;
        histories: {
            id: number;
            from_stage: string | null;
            to_stage: string;
            actor: string;
            evidence_note: string | null;
            changed_at: string | null;
        }[];
        interactions: {
            id: number;
            channel: string;
            summary: string;
            outcome: string | null;
            author: string | null;
            occurred_at: string | null;
        }[];
        follow_ups: {
            id: number;
            due_at: string | null;
            note: string | null;
            status: string;
            assignee: string | null;
        }[];
        proposals: {
            id: number;
            code: string;
            version: number;
            title: string;
            scope_summary: string | null;
            estimated_hours: number | null;
            total_value: number | null;
            is_price_approved: boolean;
            status: string;
            sent_at: string | null;
        }[];
        quotations: {
            id: number;
            code: string;
            total_amount: number | null;
            valid_until: string | null;
            status: string;
        }[];
    };
    stages: string[];
    serviceLines: string[];
    projectServiceLines: string[];
    users: { id: number; name: string }[];
    permissions: {
        canUpdate: boolean;
        canConvert: boolean;
        canDelete: boolean;
    };
}

function formatCurrency(val: number | null): string {
    if (val === null) return 'Pending Pricing Approval';
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
    }).format(val);
}

export default function CrmShow({
    lead,
    stages,
    serviceLines,
    projectServiceLines,
    users,
    permissions,
}: LeadShowProps) {
    const [activeTab, setActiveTab] = useState<'overview' | 'interactions' | 'proposals' | 'history'>(
        'overview',
    );
    const [targetStage, setTargetStage] = useState<string | null>(null);
    const [showConvertModal, setShowConvertModal] = useState(false);

    const stageForm = useForm({
        stage: lead.stage,
        evidence_note: '',
        lost_reason: '',
        next_follow_up_at: '',
        event_date: new Date().toISOString().slice(0, 10),
    });

    const editForm = useForm({
        potential_needs: lead.potential_needs ?? '',
        service_line: lead.service_line,
        pic_user_id: lead.pic_user_id ? String(lead.pic_user_id) : '',
        estimated_value: lead.estimated_value !== null ? String(lead.estimated_value) : '',
        next_follow_up_at: lead.next_follow_up_at ?? '',
        data_status: lead.data_status,
        notes: lead.notes ?? '',
    });

    const interactionForm = useForm({
        channel: 'WhatsApp',
        summary: '',
        outcome: '',
    });

    const followUpForm = useForm({
        due_at: new Date().toISOString().slice(0, 10),
        assigned_to: lead.pic_user_id ? String(lead.pic_user_id) : String(users[0]?.id ?? ''),
        note: '',
    });

    const proposalForm = useForm({
        title: `${lead.company.name} — ${lead.service_line}`,
        scope_summary: lead.potential_needs ?? '',
        estimated_hours: '',
        total_value: '',
        status: 'Draft',
    });

    const convertForm = useForm({
        name: `${lead.company.name} — ${lead.service_line}`,
        service_line: projectServiceLines.includes(lead.service_line)
            ? lead.service_line
            : projectServiceLines[0],
        contract_value: lead.estimated_value !== null ? String(lead.estimated_value) : '',
        start_date: new Date().toISOString().slice(0, 10),
        target_end_date: '',
    });

    const openStageTransition = (stage: string) => {
        if (!permissions.canUpdate || stage === lead.stage) return;
        setTargetStage(stage);
        stageForm.setData('stage', stage);
    };

    const submitStageTransition = (e: FormEvent) => {
        e.preventDefault();
        stageForm.post(`/crm/leads/${lead.id}/stage`, {
            onSuccess: () => {
                setTargetStage(null);
                stageForm.reset('evidence_note', 'lost_reason');
            },
        });
    };

    const submitEdit = (e: FormEvent) => {
        e.preventDefault();
        editForm.patch(`/crm/leads/${lead.id}`);
    };

    const submitInteraction = (e: FormEvent) => {
        e.preventDefault();
        interactionForm.post(`/crm/leads/${lead.id}/interactions`, {
            onSuccess: () => interactionForm.reset('summary', 'outcome'),
        });
    };

    const submitFollowUp = (e: FormEvent) => {
        e.preventDefault();
        followUpForm.post(`/crm/leads/${lead.id}/follow-ups`, {
            onSuccess: () => followUpForm.reset('note'),
        });
    };

    const submitProposal = (e: FormEvent) => {
        e.preventDefault();
        proposalForm.post(`/crm/leads/${lead.id}/proposals`, {
            onSuccess: () => proposalForm.reset('estimated_hours', 'total_value'),
        });
    };

    const submitConvert = (e: FormEvent) => {
        e.preventDefault();
        convertForm.post(`/crm/leads/${lead.id}/convert`, {
            onSuccess: () => setShowConvertModal(false),
        });
    };

    return (
        <AppShell
            title={`${lead.code} — ${lead.company.name}`}
            subtitle={`${lead.company.industry} • ${lead.service_line}`}
            actions={
                <div className="flex flex-wrap items-center gap-2">
                    <Link
                        href="/crm/leads"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        Back to Pipeline
                    </Link>
                    {lead.project ? (
                        <Link
                            href={`/projects/${lead.project.id}`}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                        >
                            <Briefcase className="h-3.5 w-3.5" />
                            Open Project {lead.project.code}
                        </Link>
                    ) : lead.stage === 'Won' && permissions.canConvert ? (
                        <button
                            type="button"
                            onClick={() => setShowConvertModal(true)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                        >
                            <Sparkles className="h-3.5 w-3.5" />
                            Convert Won to Project
                        </button>
                    ) : null}
                </div>
            }
        >
            <Head title={`${lead.code} ${lead.company.name} — KDMS`} />

            {lead.data_status !== 'Disepakati' && (
                <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-800">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                    <span>
                        Status data: <strong>{lead.data_status}</strong>. Pricing or management confirmation is pending before final commercial commitment.
                    </span>
                </div>
            )}

            {/* 10-Stage Interactive Stepper */}
            <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                        <h2 className="text-xs font-bold tracking-wide text-[#101D35] uppercase">
                            10-Stage Sales Pipeline Progression
                        </h2>
                        <p className="text-[11px] text-slate-500">
                            Every stage move writes an immutable record to pipeline history
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <StatusBadge label={lead.stage} />
                        <StatusBadge label={lead.data_status} />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-5 lg:grid-cols-10">
                    {stages.map((stage, idx) => {
                        const isCurrent = stage === lead.stage;
                        return (
                            <button
                                key={stage}
                                type="button"
                                disabled={!permissions.canUpdate || isCurrent}
                                onClick={() => openStageTransition(stage)}
                                className={cn(
                                    'flex flex-col items-start rounded-lg border px-2.5 py-2 text-left transition',
                                    isCurrent
                                        ? 'border-[#101D35] bg-[#101D35] text-white'
                                        : permissions.canUpdate
                                          ? 'border-slate-200 bg-slate-50/60 text-slate-700 hover:border-[#101D35]/40 hover:bg-white'
                                          : 'cursor-default border-slate-200 bg-slate-50 text-slate-400',
                                )}
                            >
                                <span
                                    className={cn(
                                        'text-[10px] font-semibold',
                                        isCurrent ? 'text-slate-300' : 'text-slate-400',
                                    )}
                                >
                                    {String(idx + 1).padStart(2, '0')}
                                </span>
                                <span className="mt-0.5 text-[11px] leading-tight font-semibold">
                                    {stage}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {targetStage && (
                    <form
                        onSubmit={submitStageTransition}
                        className="mt-4 rounded-xl border border-blue-200 bg-blue-50/50 p-4"
                    >
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-bold text-[#101D35]">
                                Move stage: {lead.stage} <ArrowRight className="mx-1 inline h-3 w-3" />{' '}
                                <span className="text-blue-700">{targetStage}</span>
                            </p>
                            <button
                                type="button"
                                onClick={() => setTargetStage(null)}
                                className="text-xs text-slate-500 hover:text-slate-800"
                            >
                                Cancel
                            </button>
                        </div>

                        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                            {targetStage === 'Lost' && (
                                <div className="sm:col-span-2">
                                    <label className="text-xs font-semibold text-slate-700">
                                        Lost Reason (Required) *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={stageForm.data.lost_reason}
                                        onChange={(e) =>
                                            stageForm.setData('lost_reason', e.target.value)
                                        }
                                        placeholder="Budget mismatch, selected competitor, timeline..."
                                        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
                                    />
                                    {stageForm.errors.lost_reason && (
                                        <p className="mt-1 text-[11px] text-rose-600">
                                            {stageForm.errors.lost_reason}
                                        </p>
                                    )}
                                </div>
                            )}

                            {targetStage === 'Follow-up Later' && (
                                <div>
                                    <label className="text-xs font-semibold text-slate-700">
                                        Next Follow-Up Date (Required) *
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        value={stageForm.data.next_follow_up_at}
                                        onChange={(e) =>
                                            stageForm.setData('next_follow_up_at', e.target.value)
                                        }
                                        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
                                    />
                                </div>
                            )}

                            {['Discovery Meeting', 'Proposal Sent'].includes(targetStage) && (
                                <div>
                                    <label className="text-xs font-semibold text-slate-700">
                                        {targetStage} Date
                                    </label>
                                    <input
                                        type="date"
                                        value={stageForm.data.event_date}
                                        onChange={(e) =>
                                            stageForm.setData('event_date', e.target.value)
                                        }
                                        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
                                    />
                                </div>
                            )}

                            <div className="sm:col-span-2">
                                <label className="text-xs font-semibold text-slate-700">
                                    Transition Note / Evidence
                                </label>
                                <input
                                    type="text"
                                    value={stageForm.data.evidence_note}
                                    onChange={(e) =>
                                        stageForm.setData('evidence_note', e.target.value)
                                    }
                                    placeholder="Summary of client response or supporting milestone..."
                                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
                                />
                            </div>
                        </div>

                        <div className="mt-3 flex justify-end gap-2">
                            <button
                                type="submit"
                                disabled={stageForm.processing}
                                className="rounded-lg bg-[#101D35] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#192c4e]"
                            >
                                Confirm Stage Change
                            </button>
                        </div>
                    </form>
                )}
            </div>

            {/* Main 2-Column Workspace */}
            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Left 2 Columns */}
                <div className="space-y-4 lg:col-span-2">
                    <div className="flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-1.5">
                        {(
                            [
                                ['overview', 'Overview & Edit'],
                                ['interactions', `Interactions (${lead.interactions.length})`],
                                ['proposals', `Proposals (${lead.proposals.length})`],
                                ['history', `Stage History (${lead.histories.length})`],
                            ] as const
                        ).map(([key, label]) => (
                            <button
                                key={key}
                                type="button"
                                onClick={() => setActiveTab(key)}
                                className={cn(
                                    'rounded-lg px-3 py-1.5 text-xs font-semibold transition',
                                    activeTab === key
                                        ? 'bg-[#101D35] text-white'
                                        : 'text-slate-600 hover:bg-slate-100',
                                )}
                            >
                                {label}
                            </button>
                        ))}
                    </div>

                    {activeTab === 'overview' && (
                        <form
                            onSubmit={submitEdit}
                            className="space-y-4 rounded-xl border border-slate-200 bg-white p-5"
                        >
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="text-xs font-semibold text-slate-700">
                                        Service Line
                                    </label>
                                    <select
                                        disabled={!permissions.canUpdate}
                                        value={editForm.data.service_line}
                                        onChange={(e) =>
                                            editForm.setData('service_line', e.target.value)
                                        }
                                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
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
                                        Assigned PIC
                                    </label>
                                    <select
                                        disabled={!permissions.canUpdate}
                                        value={editForm.data.pic_user_id}
                                        onChange={(e) =>
                                            editForm.setData('pic_user_id', e.target.value)
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
                                        Estimated Deal Value (IDR)
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        disabled={!permissions.canUpdate}
                                        value={editForm.data.estimated_value}
                                        onChange={(e) =>
                                            editForm.setData('estimated_value', e.target.value)
                                        }
                                        placeholder="Pending pricing approval"
                                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-700">
                                        Next Follow-Up Date
                                    </label>
                                    <input
                                        type="date"
                                        disabled={!permissions.canUpdate}
                                        value={editForm.data.next_follow_up_at}
                                        onChange={(e) =>
                                            editForm.setData('next_follow_up_at', e.target.value)
                                        }
                                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-700">
                                        Data Confirmation Status
                                    </label>
                                    <select
                                        disabled={!permissions.canUpdate}
                                        value={editForm.data.data_status}
                                        onChange={(e) =>
                                            editForm.setData('data_status', e.target.value)
                                        }
                                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                                    >
                                        <option value="Disepakati">Disepakati</option>
                                        <option value="Usulan">Usulan</option>
                                        <option value="Perlu Konfirmasi Manajemen">
                                            Perlu Konfirmasi Manajemen
                                        </option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-700">
                                        Key Milestones
                                    </label>
                                    <div className="mt-1 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-[11px] text-slate-600">
                                        Contacted: {formatShortDate(lead.contacted_at)} • Discovery:{' '}
                                        {formatShortDate(lead.discovery_meeting_at)} • Proposal:{' '}
                                        {formatShortDate(lead.proposal_sent_at)}
                                    </div>
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="text-xs font-semibold text-slate-700">
                                        Potential Business Needs
                                    </label>
                                    <textarea
                                        rows={2}
                                        disabled={!permissions.canUpdate}
                                        value={editForm.data.potential_needs}
                                        onChange={(e) =>
                                            editForm.setData('potential_needs', e.target.value)
                                        }
                                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                                    />
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="text-xs font-semibold text-slate-700">
                                        Internal Notes
                                    </label>
                                    <textarea
                                        rows={3}
                                        disabled={!permissions.canUpdate}
                                        value={editForm.data.notes}
                                        onChange={(e) => editForm.setData('notes', e.target.value)}
                                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                                    />
                                </div>
                                {lead.lost_reason && (
                                    <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 sm:col-span-2">
                                        <strong>Lost Reason:</strong> {lead.lost_reason}
                                    </div>
                                )}
                            </div>
                            {permissions.canUpdate && (
                                <div className="flex justify-end border-t border-slate-100 pt-3">
                                    <button
                                        type="submit"
                                        disabled={editForm.processing}
                                        className="rounded-lg bg-[#101D35] px-4 py-2 text-xs font-semibold text-white hover:bg-[#192c4e]"
                                    >
                                        Save Prospect Changes
                                    </button>
                                </div>
                            )}
                        </form>
                    )}

                    {activeTab === 'interactions' && (
                        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
                            {permissions.canUpdate && (
                                <form
                                    onSubmit={submitInteraction}
                                    className="space-y-3 rounded-xl border border-slate-100 bg-slate-50 p-4"
                                >
                                    <h3 className="flex items-center gap-1.5 text-xs font-bold text-[#101D35]">
                                        <MessageSquarePlus className="h-4 w-4" />
                                        Log Client Interaction
                                    </h3>
                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                        <select
                                            value={interactionForm.data.channel}
                                            onChange={(e) =>
                                                interactionForm.setData('channel', e.target.value)
                                            }
                                            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
                                        >
                                            {['WhatsApp', 'Email', 'Call', 'Meeting', 'Visit'].map(
                                                (ch) => (
                                                    <option key={ch} value={ch}>
                                                        {ch}
                                                    </option>
                                                ),
                                            )}
                                        </select>
                                        <input
                                            type="text"
                                            value={interactionForm.data.outcome}
                                            onChange={(e) =>
                                                interactionForm.setData('outcome', e.target.value)
                                            }
                                            placeholder="Outcome (e.g. Requested proposal)"
                                            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs sm:col-span-2"
                                        />
                                    </div>
                                    <textarea
                                        rows={2}
                                        required
                                        value={interactionForm.data.summary}
                                        onChange={(e) =>
                                            interactionForm.setData('summary', e.target.value)
                                        }
                                        placeholder="Summary of conversation..."
                                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
                                    />
                                    <div className="flex justify-end">
                                        <button
                                            type="submit"
                                            disabled={interactionForm.processing}
                                            className="rounded-lg bg-[#101D35] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#192c4e]"
                                        >
                                            Log Interaction
                                        </button>
                                    </div>
                                </form>
                            )}

                            <div className="space-y-3">
                                {lead.interactions.map((item) => (
                                    <div
                                        key={item.id}
                                        className="rounded-lg border border-slate-200 p-3.5"
                                    >
                                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                                            <span className="font-semibold text-[#101D35]">
                                                {item.channel} • {item.author ?? 'Team'}
                                            </span>
                                            <span>{item.occurred_at}</span>
                                        </div>
                                        <p className="mt-1 text-xs text-slate-700">{item.summary}</p>
                                        {item.outcome && (
                                            <p className="mt-1 text-[11px] font-medium text-emerald-700">
                                                Outcome: {item.outcome}
                                            </p>
                                        )}
                                    </div>
                                ))}
                                {lead.interactions.length === 0 && (
                                    <p className="py-6 text-center text-xs text-slate-400">
                                        No interactions recorded yet.
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'proposals' && (
                        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
                            {permissions.canUpdate && (
                                <form
                                    onSubmit={submitProposal}
                                    className="space-y-3 rounded-xl border border-slate-100 bg-slate-50 p-4"
                                >
                                    <h3 className="flex items-center gap-1.5 text-xs font-bold text-[#101D35]">
                                        <FileText className="h-4 w-4" />
                                        Register Proposal Record
                                    </h3>
                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                        <input
                                            type="text"
                                            required
                                            value={proposalForm.data.title}
                                            onChange={(e) =>
                                                proposalForm.setData('title', e.target.value)
                                            }
                                            placeholder="Proposal title"
                                            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs sm:col-span-2"
                                        />
                                        <input
                                            type="number"
                                            min="1"
                                            value={proposalForm.data.estimated_hours}
                                            onChange={(e) =>
                                                proposalForm.setData(
                                                    'estimated_hours',
                                                    e.target.value,
                                                )
                                            }
                                            placeholder="Estimated hours"
                                            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
                                        />
                                        <input
                                            type="number"
                                            min="0"
                                            value={proposalForm.data.total_value}
                                            onChange={(e) =>
                                                proposalForm.setData('total_value', e.target.value)
                                            }
                                            placeholder="Quoted value (IDR) — blank if pending"
                                            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
                                        />
                                        <select
                                            value={proposalForm.data.status}
                                            onChange={(e) =>
                                                proposalForm.setData('status', e.target.value)
                                            }
                                            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
                                        >
                                            {[
                                                'Draft',
                                                'Sent',
                                                'Under Negotiation',
                                                'Accepted',
                                                'Rejected',
                                            ].map((st) => (
                                                <option key={st} value={st}>
                                                    {st}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <textarea
                                        rows={2}
                                        value={proposalForm.data.scope_summary}
                                        onChange={(e) =>
                                            proposalForm.setData('scope_summary', e.target.value)
                                        }
                                        placeholder="Scope summary..."
                                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
                                    />
                                    <div className="flex justify-end">
                                        <button
                                            type="submit"
                                            disabled={proposalForm.processing}
                                            className="rounded-lg bg-[#101D35] px-3.5 py-1.5 text-xs font-semibold text-white"
                                        >
                                            Save Proposal
                                        </button>
                                    </div>
                                </form>
                            )}

                            <div className="space-y-2.5">
                                {lead.proposals.map((p) => (
                                    <div
                                        key={p.id}
                                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 p-3.5"
                                    >
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono text-xs font-bold text-[#101D35]">
                                                    {p.code} (v{p.version})
                                                </span>
                                                <StatusBadge label={p.status} />
                                                {!p.is_price_approved && (
                                                    <span className="rounded bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                                                        Pending Commercial Approval
                                                    </span>
                                                )}
                                            </div>
                                            <p className="mt-1 text-xs font-semibold text-slate-800">
                                                {p.title}
                                            </p>
                                            {p.scope_summary && (
                                                <p className="mt-0.5 text-[11px] text-slate-500">
                                                    {p.scope_summary}
                                                </p>
                                            )}
                                        </div>
                                        <div className="text-right text-xs">
                                            <div className="font-bold text-[#101D35]">
                                                {formatCurrency(p.total_value)}
                                            </div>
                                            {p.sent_at && (
                                                <div className="text-[11px] text-slate-500">
                                                    Sent {formatShortDate(p.sent_at)}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {lead.proposals.length === 0 && (
                                    <p className="py-6 text-center text-xs text-slate-400">
                                        No proposals created for this prospect yet.
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'history' && (
                        <div className="rounded-xl border border-slate-200 bg-white p-5">
                            <h3 className="mb-3 flex items-center gap-1.5 text-xs font-bold text-[#101D35]">
                                <History className="h-4 w-4" />
                                Pipeline Stage Audit History
                            </h3>
                            <div className="space-y-2.5">
                                {lead.histories.map((h) => (
                                    <div
                                        key={h.id}
                                        className="flex items-start justify-between rounded-lg border border-slate-100 bg-slate-50/70 p-3 text-xs"
                                    >
                                        <div>
                                            <p className="font-semibold text-[#101D35]">
                                                {h.from_stage ? `${h.from_stage} → ` : ''}
                                                {h.to_stage}
                                            </p>
                                            {h.evidence_note && (
                                                <p className="mt-0.5 text-slate-600">
                                                    {h.evidence_note}
                                                </p>
                                            )}
                                            <p className="mt-1 text-[11px] text-slate-400">
                                                By {h.actor}
                                            </p>
                                        </div>
                                        <span className="text-[11px] text-slate-500">
                                            {h.changed_at}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Column */}
                <div className="space-y-4">
                    <div className="rounded-xl border border-slate-200 bg-white p-5">
                        <div className="flex items-center justify-between">
                            <h3 className="flex items-center gap-1.5 text-xs font-bold text-[#101D35]">
                                <Building2 className="h-4 w-4" />
                                Client & Contacts
                            </h3>
                            <Link
                                href="/crm/companies"
                                className="text-[11px] font-semibold text-blue-600 hover:underline"
                            >
                                Directory
                            </Link>
                        </div>
                        <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                            <p className="font-semibold text-slate-900">{lead.company.name}</p>
                            <p>
                                {lead.company.industry}
                                {lead.company.location ? ` • ${lead.company.location}` : ''}
                            </p>
                            {lead.company.website && (
                                <p className="flex items-center gap-1.5 text-blue-600">
                                    <Globe className="h-3.5 w-3.5" />
                                    {lead.company.website}
                                </p>
                            )}
                            {lead.company.phone && (
                                <p className="flex items-center gap-1.5">
                                    <Phone className="h-3.5 w-3.5 text-slate-400" />
                                    {lead.company.phone}
                                </p>
                            )}
                            {lead.company.email && (
                                <p className="flex items-center gap-1.5">
                                    <Mail className="h-3.5 w-3.5 text-slate-400" />
                                    {lead.company.email}
                                </p>
                            )}
                        </div>
                        <div className="mt-4 border-t border-slate-100 pt-3">
                            <p className="text-[11px] font-semibold text-slate-500 uppercase">
                                Contact Persons
                            </p>
                            <div className="mt-2 space-y-2">
                                {lead.company.contacts.map((c) => (
                                    <div
                                        key={c.id}
                                        className="rounded-lg border border-slate-100 bg-slate-50 p-2.5 text-xs"
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="font-semibold text-slate-800">
                                                {c.name}
                                            </span>
                                            {c.is_decision_maker && (
                                                <span className="inline-flex items-center gap-0.5 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
                                                    <UserCheck className="h-2.5 w-2.5" />
                                                    Decision Maker
                                                </span>
                                            )}
                                        </div>
                                        {c.role_title && (
                                            <p className="text-[11px] text-slate-500">
                                                {c.role_title}
                                            </p>
                                        )}
                                        {(c.phone || c.email) && (
                                            <p className="mt-0.5 text-[11px] text-slate-500">
                                                {[c.phone, c.email].filter(Boolean).join(' • ')}
                                            </p>
                                        )}
                                    </div>
                                ))}
                                {lead.company.contacts.length === 0 && (
                                    <p className="text-[11px] text-slate-400">
                                        No individual contacts added yet.
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Follow-up Reminders */}
                    <div className="rounded-xl border border-slate-200 bg-white p-5">
                        <h3 className="flex items-center gap-1.5 text-xs font-bold text-[#101D35]">
                            <CalendarClock className="h-4 w-4" />
                            Follow-Up Reminders
                        </h3>

                        {permissions.canUpdate && (
                            <form onSubmit={submitFollowUp} className="mt-3 space-y-2">
                                <div className="grid grid-cols-2 gap-2">
                                    <input
                                        type="date"
                                        required
                                        value={followUpForm.data.due_at}
                                        onChange={(e) =>
                                            followUpForm.setData('due_at', e.target.value)
                                        }
                                        className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
                                    />
                                    <select
                                        value={followUpForm.data.assigned_to}
                                        onChange={(e) =>
                                            followUpForm.setData('assigned_to', e.target.value)
                                        }
                                        className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
                                    >
                                        {users.map((u) => (
                                            <option key={u.id} value={u.id}>
                                                {u.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={followUpForm.data.note}
                                        onChange={(e) =>
                                            followUpForm.setData('note', e.target.value)
                                        }
                                        placeholder="Follow-up action..."
                                        className="flex-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
                                    />
                                    <button
                                        type="submit"
                                        className="inline-flex items-center gap-1 rounded-lg bg-[#101D35] px-3 py-1.5 text-xs font-semibold text-white"
                                    >
                                        <Plus className="h-3.5 w-3.5" />
                                        Add
                                    </button>
                                </div>
                            </form>
                        )}

                        <div className="mt-3 space-y-2">
                            {lead.follow_ups.map((f) => (
                                <div
                                    key={f.id}
                                    className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs"
                                >
                                    <div>
                                        <p className="font-semibold text-slate-800">
                                            {formatShortDate(f.due_at)} • {f.assignee}
                                        </p>
                                        {f.note && (
                                            <p className="text-[11px] text-slate-500">{f.note}</p>
                                        )}
                                    </div>
                                    {f.status === 'Pending' && permissions.canUpdate ? (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                router.post(
                                                    `/crm/leads/${lead.id}/follow-ups/${f.id}/complete`,
                                                )
                                            }
                                            className="rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100"
                                        >
                                            Done
                                        </button>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700">
                                            <CheckCircle2 className="h-3 w-3" />
                                            {f.status}
                                        </span>
                                    )}
                                </div>
                            ))}
                            {lead.follow_ups.length === 0 && (
                                <p className="text-[11px] text-slate-400">
                                    No scheduled follow-ups yet.
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Convert Won Opportunity Modal */}
            {showConvertModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
                    <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <h2 className="font-display text-base font-bold text-[#101D35]">
                                Convert Won Opportunity to Project
                            </h2>
                            <button
                                type="button"
                                onClick={() => setShowConvertModal(false)}
                                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                            Reuses existing company <strong>{lead.company.name}</strong> and primary contact without creating duplicate records, and seeds the delivery workflow stages.
                        </p>
                        <form onSubmit={submitConvert} className="mt-4 space-y-3">
                            <div>
                                <label className="text-xs font-semibold text-slate-700">
                                    Project Name
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={convertForm.data.name}
                                    onChange={(e) => convertForm.setData('name', e.target.value)}
                                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-700">
                                    Delivery Workflow (Service Line)
                                </label>
                                <select
                                    value={convertForm.data.service_line}
                                    onChange={(e) =>
                                        convertForm.setData('service_line', e.target.value)
                                    }
                                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                                >
                                    {projectServiceLines.map((sl) => (
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
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-semibold text-slate-700">
                                        Contract Value (IDR)
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={convertForm.data.contract_value}
                                        onChange={(e) =>
                                            convertForm.setData('contract_value', e.target.value)
                                        }
                                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-700">
                                        Start Date
                                    </label>
                                    <input
                                        type="date"
                                        value={convertForm.data.start_date}
                                        onChange={(e) =>
                                            convertForm.setData('start_date', e.target.value)
                                        }
                                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-700">
                                    Target End Date
                                </label>
                                <input
                                    type="date"
                                    value={convertForm.data.target_end_date}
                                    onChange={(e) =>
                                        convertForm.setData('target_end_date', e.target.value)
                                    }
                                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                                />
                            </div>
                            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowConvertModal(false)}
                                    className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={convertForm.processing}
                                    className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                                >
                                    {convertForm.processing
                                        ? 'Converting...'
                                        : 'Create Delivery Project'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AppShell>
    );
}
