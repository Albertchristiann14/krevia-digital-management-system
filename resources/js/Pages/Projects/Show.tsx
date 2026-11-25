import { StatusBadge } from '@/Components/shared/StatusBadge';
import { AppShell } from '@/Layouts/AppShell';
import { cn, formatShortDate, getInitials } from '@/lib/utils';
import type { PageProps } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowLeft,
    Bug,
    CheckCircle2,
    ClipboardCheck,
    FileCheck2,
    Flag,
    Lock,
    Rocket,
    ShieldCheck,
    Ticket,
    Users,
} from 'lucide-react';
import { useState, type FormEvent } from 'react';

interface StageItem {
    id: number;
    stage_order: number;
    name: string;
    purpose: string | null;
    output_label: string | null;
    completion_criteria: string | null;
    pic_name: string | null;
    status: string;
    completion_evidence_note: string | null;
    completed_at: string | null;
    approver_name: string | null;
}

interface ProjectShowProps extends PageProps {
    project: {
        id: number;
        code: string;
        name: string;
        service_line: string;
        scope_summary: string | null;
        contract_ref: string | null;
        contract_value: number | null;
        status: string;
        start_date: string | null;
        target_end_date: string | null;
        lead_code: string | null;
        company: { id: number; name: string; industry: string; location: string | null } | null;
        primary_contact: { id: number; name: string; role_title: string | null; phone: string | null } | null;
        manager_name: string | null;
        tech_lead_name: string | null;
        members: { id: number; user_id: number; name: string | null; project_role: string }[];
        stages: StageItem[];
        milestones: { id: number; title: string; due_date: string | null; status: string }[];
        requirements: {
            id: number;
            code: string;
            title: string;
            description: string | null;
            priority: string;
            status: string;
            approved_by_client_name: string | null;
            acceptance_criteria: { id: number; description: string; is_passed: boolean }[];
        }[];
        qa_reports: {
            id: number;
            title: string;
            environment: string;
            critical_bugs: number;
            high_bugs: number;
            medium_bugs: number;
            status: string;
            tester: string | null;
            tested_at: string | null;
        }[];
        uat_records: {
            id: number;
            title: string;
            tester_name: string;
            status: string;
            feedback: string | null;
            signed_off_at: string | null;
        }[];
        releases: {
            id: number;
            version: string;
            environment: string;
            has_backup: boolean;
            has_rollback_plan: boolean;
            status: string;
            deployer: string | null;
            deployed_at: string | null;
        }[];
        handover_record: {
            id: number;
            handover_date: string | null;
            signed_by_client: string;
            access_transferred: boolean;
            guide_delivered: boolean;
        } | null;
        maintenance_tickets: {
            id: number;
            code: string;
            title: string;
            priority: string;
            status: string;
            assignee: string | null;
        }[];
        tasks: {
            id: number;
            code: string;
            title: string;
            pic_name: string | null;
            status: string;
            deadline: string | null;
        }[];
    };
    dodChecklist: string[];
    users: { id: number; name: string }[];
    canUpdate: boolean;
}

type TabKey = 'stages' | 'requirements' | 'qa' | 'uat_releases' | 'handover' | 'tasks' | 'team';

export default function ProjectsShow({
    project,
    dodChecklist,
    users,
    canUpdate,
    errors,
}: ProjectShowProps) {
    const [tab, setTab] = useState<TabKey>('stages');
    const [completingStageId, setCompletingStageId] = useState<number | null>(null);

    const stageForm = useForm({ completion_evidence_note: '' });

    const reqForm = useForm({
        title: '',
        description: '',
        priority: 'Tinggi',
        status: 'Client Approved',
        approved_by_client_name: project.primary_contact?.name ?? '',
        acceptance_criterion: '',
    });

    const qaForm = useForm({
        title: 'Sprint QA Verification',
        environment: 'staging',
        critical_bugs: '0',
        high_bugs: '0',
        medium_bugs: '0',
        status: 'Passed',
    });

    const uatForm = useForm({
        title: 'Client User Acceptance Sign-Off',
        tester_name: project.primary_contact?.name ?? '',
        status: 'Approved',
        feedback: '',
    });

    const releaseForm = useForm({
        version: 'v1.0.0',
        environment: 'production',
        has_backup: true,
        has_rollback_plan: true,
        rollback_notes: '',
        release_notes: '',
        status: 'Live',
    });

    const handoverForm = useForm({
        handover_date: new Date().toISOString().slice(0, 10),
        signed_by_client: project.primary_contact?.name ?? '',
        trained_users_summary: '',
        access_transferred: true,
        guide_delivered: true,
        notes: '',
    });

    const ticketForm = useForm({
        title: '',
        description: '',
        priority: 'Sedang',
        assigned_to: users[0]?.id ? String(users[0].id) : '',
    });

    const milestoneForm = useForm({
        title: '',
        due_date: '',
    });

    const completedCount = project.stages.filter((s) => s.status === 'Completed').length;
    const totalStages = project.stages.length;
    const progressPct = totalStages > 0 ? Math.round((completedCount / totalStages) * 100) : 0;
    const nextPendingStage = project.stages.find((s) => s.status !== 'Completed');

    const submitStageComplete = (e: FormEvent, stageId: number) => {
        e.preventDefault();
        stageForm.post(`/projects/${project.id}/stages/${stageId}/complete`, {
            onSuccess: () => {
                stageForm.reset();
                setCompletingStageId(null);
            },
        });
    };

    const errorMessages = Object.values(errors ?? {});

    return (
        <AppShell
            title={`${project.code} — ${project.name}`}
            subtitle={`${project.company?.name ?? 'Client'} • ${project.service_line} (${totalStages} Stages)`}
            actions={
                <Link
                    href="/projects"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    All Projects
                </Link>
            }
        >
            <Head title={`${project.code} ${project.name} — KDMS`} />

            {errorMessages.length > 0 && (
                <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">
                    <div className="flex items-center gap-2 font-bold">
                        <AlertTriangle className="h-4 w-4" />
                        Stage Gate / Validation Blocked
                    </div>
                    <ul className="mt-1 list-disc pl-5">
                        {errorMessages.map((msg, i) => (
                            <li key={i}>{msg}</li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Header Overview Card */}
            <div className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <StatusBadge label={project.status} />
                            {project.lead_code && (
                                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                                    From Lead {project.lead_code}
                                </span>
                            )}
                            <span className="text-xs text-slate-500">
                                PM: <strong className="text-slate-700">{project.manager_name}</strong> • Tech Lead:{' '}
                                <strong className="text-slate-700">{project.tech_lead_name}</strong>
                            </span>
                        </div>
                        {project.scope_summary && (
                            <p className="max-w-3xl text-xs text-slate-600">
                                {project.scope_summary}
                            </p>
                        )}
                    </div>
                    <div className="text-right text-xs">
                        <div className="font-bold text-[#101D35]">
                            {completedCount} / {totalStages} Stages ({progressPct}%)
                        </div>
                        <div className="text-[11px] text-slate-500">
                            {formatShortDate(project.start_date)} →{' '}
                            {formatShortDate(project.target_end_date)}
                        </div>
                    </div>
                </div>
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                        className="h-full rounded-full bg-[#101D35] transition-all"
                        style={{ width: `${progressPct}%` }}
                    />
                </div>
            </div>

            {/* Workspace Tabs */}
            <div className="mt-5 flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-1.5">
                {(
                    [
                        ['stages', `Stages & Gates (${completedCount}/${totalStages})`],
                        ['requirements', `Requirements (${project.requirements.length})`],
                        ['qa', `QA & DoD (${project.qa_reports.length})`],
                        ['uat_releases', `UAT & Releases (${project.releases.length})`],
                        ['handover', `Handover & Tickets (${project.maintenance_tickets.length})`],
                        ['tasks', `Tasks & Milestones (${project.tasks.length})`],
                        ['team', `Team (${project.members.length})`],
                    ] as const
                ).map(([key, label]) => (
                    <button
                        key={key}
                        type="button"
                        onClick={() => setTab(key)}
                        className={cn(
                            'rounded-lg px-3 py-1.5 text-xs font-semibold transition',
                            tab === key
                                ? 'bg-[#101D35] text-white'
                                : 'text-slate-600 hover:bg-slate-100',
                        )}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="mt-4">
                {tab === 'stages' && (
                    <div className="space-y-3">
                        {project.stages.map((stage) => {
                            const isCompleted = stage.status === 'Completed';
                            const isCurrent = nextPendingStage?.id === stage.id;
                            const isLocked = !isCompleted && !isCurrent;

                            return (
                                <div
                                    key={stage.id}
                                    className={cn(
                                        'rounded-xl border bg-white p-4',
                                        isCurrent
                                            ? 'border-[#101D35] ring-1 ring-[#101D35]/10'
                                            : 'border-slate-200',
                                    )}
                                >
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div className="flex items-start gap-3">
                                            <div
                                                className={cn(
                                                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold',
                                                    isCompleted
                                                        ? 'bg-emerald-600 text-white'
                                                        : isCurrent
                                                          ? 'bg-[#101D35] text-white'
                                                          : 'bg-slate-100 text-slate-400',
                                                )}
                                            >
                                                {stage.stage_order}
                                            </div>
                                            <div>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <h3 className="text-sm font-bold text-[#101D35]">
                                                        {stage.name}
                                                    </h3>
                                                    <StatusBadge label={stage.status} />
                                                    {isLocked && (
                                                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                                                            <Lock className="h-3 w-3" />
                                                            Sequential Gate
                                                        </span>
                                                    )}
                                                </div>
                                                {stage.purpose && (
                                                    <p className="mt-0.5 text-xs text-slate-600">
                                                        {stage.purpose}
                                                    </p>
                                                )}
                                                <div className="mt-1.5 flex flex-wrap gap-3 text-[11px] text-slate-500">
                                                    {stage.output_label && (
                                                        <span>
                                                            <strong>Output:</strong> {stage.output_label}
                                                        </span>
                                                    )}
                                                    {stage.completion_criteria && (
                                                        <span>
                                                            <strong>Gate Criteria:</strong>{' '}
                                                            {stage.completion_criteria}
                                                        </span>
                                                    )}
                                                </div>
                                                {stage.completion_evidence_note && (
                                                    <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs text-emerald-800">
                                                        <strong>Evidence:</strong>{' '}
                                                        {stage.completion_evidence_note} (Approved by{' '}
                                                        {stage.approver_name} • {stage.completed_at})
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        {isCurrent && canUpdate && (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setCompletingStageId(
                                                        completingStageId === stage.id
                                                            ? null
                                                            : stage.id,
                                                    )
                                                }
                                                className="inline-flex items-center gap-1.5 rounded-lg bg-[#101D35] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#192c4e]"
                                            >
                                                <CheckCircle2 className="h-3.5 w-3.5" />
                                                Complete Stage
                                            </button>
                                        )}
                                    </div>

                                    {completingStageId === stage.id && (
                                        <form
                                            onSubmit={(e) => submitStageComplete(e, stage.id)}
                                            className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3"
                                        >
                                            <label className="text-xs font-semibold text-slate-700">
                                                Completion Evidence & Sign-Off Note *
                                            </label>
                                            <div className="mt-1.5 flex gap-2">
                                                <input
                                                    type="text"
                                                    required
                                                    value={stageForm.data.completion_evidence_note}
                                                    onChange={(e) =>
                                                        stageForm.setData(
                                                            'completion_evidence_note',
                                                            e.target.value,
                                                        )
                                                    }
                                                    placeholder="Link to document, sign-off summary, or verification evidence..."
                                                    className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs"
                                                />
                                                <button
                                                    type="submit"
                                                    disabled={stageForm.processing}
                                                    className="rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                                                >
                                                    Verify Gate
                                                </button>
                                            </div>
                                        </form>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {tab === 'requirements' && (
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                        {canUpdate && (
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    reqForm.post(`/projects/${project.id}/requirements`, {
                                        onSuccess: () =>
                                            reqForm.reset('title', 'description', 'acceptance_criterion'),
                                    });
                                }}
                                className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 lg:col-span-1"
                            >
                                <h3 className="flex items-center gap-1.5 text-xs font-bold text-[#101D35]">
                                    <ClipboardCheck className="h-4 w-4" />
                                    Add Requirement & AC
                                </h3>
                                <input
                                    type="text"
                                    required
                                    value={reqForm.data.title}
                                    onChange={(e) => reqForm.setData('title', e.target.value)}
                                    placeholder="Requirement title"
                                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                                />
                                <textarea
                                    rows={2}
                                    value={reqForm.data.description}
                                    onChange={(e) => reqForm.setData('description', e.target.value)}
                                    placeholder="Functional specification..."
                                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                                />
                                <div className="grid grid-cols-2 gap-2">
                                    <select
                                        value={reqForm.data.priority}
                                        onChange={(e) => reqForm.setData('priority', e.target.value)}
                                        className="rounded-lg border border-slate-200 px-2.5 py-2 text-xs"
                                    >
                                        <option value="Tinggi">Tinggi</option>
                                        <option value="Sedang">Sedang</option>
                                        <option value="Rendah">Rendah</option>
                                    </select>
                                    <select
                                        value={reqForm.data.status}
                                        onChange={(e) => reqForm.setData('status', e.target.value)}
                                        className="rounded-lg border border-slate-200 px-2.5 py-2 text-xs"
                                    >
                                        <option value="Draft">Draft</option>
                                        <option value="Client Approved">Client Approved</option>
                                        <option value="Implemented">Implemented</option>
                                        <option value="Verified">Verified</option>
                                    </select>
                                </div>
                                <input
                                    type="text"
                                    value={reqForm.data.approved_by_client_name}
                                    onChange={(e) =>
                                        reqForm.setData('approved_by_client_name', e.target.value)
                                    }
                                    placeholder="Client approver name"
                                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                                />
                                <input
                                    type="text"
                                    value={reqForm.data.acceptance_criterion}
                                    onChange={(e) =>
                                        reqForm.setData('acceptance_criterion', e.target.value)
                                    }
                                    placeholder="Initial acceptance criterion..."
                                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                                />
                                <button
                                    type="submit"
                                    disabled={reqForm.processing}
                                    className="w-full rounded-lg bg-[#101D35] py-2 text-xs font-semibold text-white"
                                >
                                    Save Requirement
                                </button>
                            </form>
                        )}
                        <div
                            className={cn(
                                'space-y-3 rounded-xl border border-slate-200 bg-white p-5',
                                canUpdate ? 'lg:col-span-2' : 'lg:col-span-3',
                            )}
                        >
                            {project.requirements.map((req) => (
                                <div key={req.id} className="rounded-lg border border-slate-200 p-3.5">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono text-xs font-bold text-[#101D35]">
                                                {req.code}
                                            </span>
                                            <StatusBadge label={req.priority} />
                                            <StatusBadge label={req.status} />
                                        </div>
                                        {req.approved_by_client_name && (
                                            <span className="text-[11px] text-emerald-700">
                                                Approved by {req.approved_by_client_name}
                                            </span>
                                        )}
                                    </div>
                                    <p className="mt-1.5 text-xs font-semibold text-slate-900">
                                        {req.title}
                                    </p>
                                    {req.description && (
                                        <p className="mt-0.5 text-xs text-slate-600">
                                            {req.description}
                                        </p>
                                    )}
                                    {req.acceptance_criteria.length > 0 && (
                                        <ul className="mt-2 list-disc pl-4 text-[11px] text-slate-500">
                                            {req.acceptance_criteria.map((ac) => (
                                                <li key={ac.id}>{ac.description}</li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            ))}
                            {project.requirements.length === 0 && (
                                <p className="py-8 text-center text-xs text-slate-400">
                                    No requirements documented yet. Required to unlock the Requirement Gathering gate.
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {tab === 'qa' && (
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                        <div className="space-y-4 lg:col-span-1">
                            <div className="rounded-xl border border-slate-200 bg-white p-5">
                                <h3 className="flex items-center gap-1.5 text-xs font-bold text-[#101D35]">
                                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                                    8-Point Definition of Done (Sheet 09)
                                </h3>
                                <ul className="mt-3 space-y-2 text-xs text-slate-600">
                                    {dodChecklist.map((item, i) => (
                                        <li key={i} className="flex items-start gap-2">
                                            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                                            <span>{item}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {canUpdate && (
                                <form
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        qaForm.post(`/projects/${project.id}/qa-reports`);
                                    }}
                                    className="space-y-3 rounded-xl border border-slate-200 bg-white p-5"
                                >
                                    <h3 className="flex items-center gap-1.5 text-xs font-bold text-[#101D35]">
                                        <Bug className="h-4 w-4" />
                                        Log QA Report
                                    </h3>
                                    <input
                                        type="text"
                                        required
                                        value={qaForm.data.title}
                                        onChange={(e) => qaForm.setData('title', e.target.value)}
                                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                                    />
                                    <div className="grid grid-cols-2 gap-2">
                                        <select
                                            value={qaForm.data.environment}
                                            onChange={(e) =>
                                                qaForm.setData('environment', e.target.value)
                                            }
                                            className="rounded-lg border border-slate-200 px-2.5 py-2 text-xs"
                                        >
                                            <option value="staging">Staging</option>
                                            <option value="production">Production</option>
                                        </select>
                                        <select
                                            value={qaForm.data.status}
                                            onChange={(e) => qaForm.setData('status', e.target.value)}
                                            className="rounded-lg border border-slate-200 px-2.5 py-2 text-xs"
                                        >
                                            <option value="Passed">Passed</option>
                                            <option value="Pending">Pending</option>
                                            <option value="Failed">Failed</option>
                                        </select>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2">
                                        <div>
                                            <label className="text-[10px] font-semibold text-slate-500">
                                                Critical
                                            </label>
                                            <input
                                                type="number"
                                                min="0"
                                                value={qaForm.data.critical_bugs}
                                                onChange={(e) =>
                                                    qaForm.setData('critical_bugs', e.target.value)
                                                }
                                                className="mt-0.5 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-semibold text-slate-500">
                                                High
                                            </label>
                                            <input
                                                type="number"
                                                min="0"
                                                value={qaForm.data.high_bugs}
                                                onChange={(e) =>
                                                    qaForm.setData('high_bugs', e.target.value)
                                                }
                                                className="mt-0.5 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-semibold text-slate-500">
                                                Medium
                                            </label>
                                            <input
                                                type="number"
                                                min="0"
                                                value={qaForm.data.medium_bugs}
                                                onChange={(e) =>
                                                    qaForm.setData('medium_bugs', e.target.value)
                                                }
                                                className="mt-0.5 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
                                            />
                                        </div>
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={qaForm.processing}
                                        className="w-full rounded-lg bg-[#101D35] py-2 text-xs font-semibold text-white"
                                    >
                                        Submit QA Report
                                    </button>
                                </form>
                            )}
                        </div>
                        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 lg:col-span-2">
                            {project.qa_reports.map((qa) => (
                                <div
                                    key={qa.id}
                                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 p-3.5 text-xs"
                                >
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-[#101D35]">
                                                {qa.title}
                                            </span>
                                            <StatusBadge label={qa.status} />
                                            <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] uppercase">
                                                {qa.environment}
                                            </span>
                                        </div>
                                        <p className="mt-1 text-[11px] text-slate-500">
                                            Tested by {qa.tester} • {qa.tested_at}
                                        </p>
                                    </div>
                                    <div className="flex gap-3 text-[11px] font-semibold">
                                        <span className="text-rose-600">
                                            Critical: {qa.critical_bugs}
                                        </span>
                                        <span className="text-amber-600">High: {qa.high_bugs}</span>
                                        <span className="text-slate-600">
                                            Medium: {qa.medium_bugs}
                                        </span>
                                    </div>
                                </div>
                            ))}
                            {project.qa_reports.length === 0 && (
                                <p className="py-8 text-center text-xs text-slate-400">
                                    No QA reports recorded yet.
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {tab === 'uat_releases' && (
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
                            <h3 className="flex items-center gap-1.5 text-xs font-bold text-[#101D35]">
                                <FileCheck2 className="h-4 w-4" />
                                Client UAT Sign-Off
                            </h3>
                            {canUpdate && (
                                <form
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        uatForm.post(`/projects/${project.id}/uat-records`, {
                                            onSuccess: () => uatForm.reset('feedback'),
                                        });
                                    }}
                                    className="space-y-2.5 rounded-lg border border-slate-100 bg-slate-50 p-3.5"
                                >
                                    <input
                                        type="text"
                                        required
                                        value={uatForm.data.title}
                                        onChange={(e) => uatForm.setData('title', e.target.value)}
                                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs"
                                    />
                                    <div className="grid grid-cols-2 gap-2">
                                        <input
                                            type="text"
                                            required
                                            value={uatForm.data.tester_name}
                                            onChange={(e) =>
                                                uatForm.setData('tester_name', e.target.value)
                                            }
                                            placeholder="Client tester name"
                                            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs"
                                        />
                                        <select
                                            value={uatForm.data.status}
                                            onChange={(e) => uatForm.setData('status', e.target.value)}
                                            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
                                        >
                                            <option value="Approved">Approved</option>
                                            <option value="Pending">Pending</option>
                                            <option value="Revisions Needed">Revisions Needed</option>
                                        </select>
                                    </div>
                                    <textarea
                                        rows={2}
                                        value={uatForm.data.feedback}
                                        onChange={(e) => uatForm.setData('feedback', e.target.value)}
                                        placeholder="Client UAT feedback..."
                                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs"
                                    />
                                    <button
                                        type="submit"
                                        className="rounded-lg bg-[#101D35] px-3.5 py-1.5 text-xs font-semibold text-white"
                                    >
                                        Record UAT
                                    </button>
                                </form>
                            )}
                            <div className="space-y-2">
                                {project.uat_records.map((u) => (
                                    <div
                                        key={u.id}
                                        className="rounded-lg border border-slate-200 p-3 text-xs"
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="font-bold text-[#101D35]">{u.title}</span>
                                            <StatusBadge label={u.status} />
                                        </div>
                                        <p className="mt-1 text-[11px] text-slate-500">
                                            Tester: {u.tester_name}{' '}
                                            {u.signed_off_at ? `• Signed ${u.signed_off_at}` : ''}
                                        </p>
                                        {u.feedback && (
                                            <p className="mt-1 text-slate-600">{u.feedback}</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
                            <h3 className="flex items-center gap-1.5 text-xs font-bold text-[#101D35]">
                                <Rocket className="h-4 w-4" />
                                Deployments & Releases
                            </h3>
                            {canUpdate && (
                                <form
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        releaseForm.post(`/projects/${project.id}/releases`);
                                    }}
                                    className="space-y-2.5 rounded-lg border border-slate-100 bg-slate-50 p-3.5"
                                >
                                    <div className="grid grid-cols-3 gap-2">
                                        <input
                                            type="text"
                                            required
                                            value={releaseForm.data.version}
                                            onChange={(e) =>
                                                releaseForm.setData('version', e.target.value)
                                            }
                                            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
                                        />
                                        <select
                                            value={releaseForm.data.environment}
                                            onChange={(e) =>
                                                releaseForm.setData('environment', e.target.value)
                                            }
                                            className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs"
                                        >
                                            <option value="production">Production</option>
                                            <option value="staging">Staging</option>
                                        </select>
                                        <select
                                            value={releaseForm.data.status}
                                            onChange={(e) =>
                                                releaseForm.setData('status', e.target.value)
                                            }
                                            className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs"
                                        >
                                            <option value="Live">Live</option>
                                            <option value="Planned">Planned</option>
                                            <option value="Rolled Back">Rolled Back</option>
                                        </select>
                                    </div>
                                    <div className="flex gap-4 text-xs text-slate-700">
                                        <label className="flex items-center gap-1.5">
                                            <input
                                                type="checkbox"
                                                checked={releaseForm.data.has_backup}
                                                onChange={(e) =>
                                                    releaseForm.setData('has_backup', e.target.checked)
                                                }
                                            />
                                            Backup Verified
                                        </label>
                                        <label className="flex items-center gap-1.5">
                                            <input
                                                type="checkbox"
                                                checked={releaseForm.data.has_rollback_plan}
                                                onChange={(e) =>
                                                    releaseForm.setData(
                                                        'has_rollback_plan',
                                                        e.target.checked,
                                                    )
                                                }
                                            />
                                            Rollback Plan Ready
                                        </label>
                                    </div>
                                    <button
                                        type="submit"
                                        className="rounded-lg bg-[#101D35] px-3.5 py-1.5 text-xs font-semibold text-white"
                                    >
                                        Log Release
                                    </button>
                                </form>
                            )}
                            <div className="space-y-2">
                                {project.releases.map((rel) => (
                                    <div
                                        key={rel.id}
                                        className="rounded-lg border border-slate-200 p-3 text-xs"
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="font-mono font-bold text-[#101D35]">
                                                {rel.version} ({rel.environment})
                                            </span>
                                            <StatusBadge label={rel.status} />
                                        </div>
                                        <p className="mt-1 text-[11px] text-slate-500">
                                            Backup: {rel.has_backup ? 'Yes' : 'No'} • Rollback Plan:{' '}
                                            {rel.has_rollback_plan ? 'Yes' : 'No'} • {rel.deployed_at}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {tab === 'handover' && (
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        <div className="rounded-xl border border-slate-200 bg-white p-5">
                            <h3 className="text-xs font-bold text-[#101D35]">
                                Handover Documentation & Sign-Off
                            </h3>
                            {project.handover_record ? (
                                <div className="mt-3 space-y-2 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-900">
                                    <p>
                                        <strong>Handover Date:</strong>{' '}
                                        {formatShortDate(project.handover_record.handover_date)}
                                    </p>
                                    <p>
                                        <strong>Signed By Client:</strong>{' '}
                                        {project.handover_record.signed_by_client}
                                    </p>
                                    <p>
                                        <strong>Access Transferred:</strong>{' '}
                                        {project.handover_record.access_transferred ? 'Yes' : 'No'} •{' '}
                                        <strong>User Guide Delivered:</strong>{' '}
                                        {project.handover_record.guide_delivered ? 'Yes' : 'No'}
                                    </p>
                                </div>
                            ) : canUpdate ? (
                                <form
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        handoverForm.post(`/projects/${project.id}/handover`);
                                    }}
                                    className="mt-3 space-y-3"
                                >
                                    <div className="grid grid-cols-2 gap-2">
                                        <input
                                            type="date"
                                            required
                                            value={handoverForm.data.handover_date}
                                            onChange={(e) =>
                                                handoverForm.setData('handover_date', e.target.value)
                                            }
                                            className="rounded-lg border border-slate-200 px-3 py-2 text-xs"
                                        />
                                        <input
                                            type="text"
                                            required
                                            value={handoverForm.data.signed_by_client}
                                            onChange={(e) =>
                                                handoverForm.setData(
                                                    'signed_by_client',
                                                    e.target.value,
                                                )
                                            }
                                            placeholder="Client BAST signatory"
                                            className="rounded-lg border border-slate-200 px-3 py-2 text-xs"
                                        />
                                    </div>
                                    <div className="flex gap-4 text-xs text-slate-700">
                                        <label className="flex items-center gap-1.5">
                                            <input
                                                type="checkbox"
                                                checked={handoverForm.data.access_transferred}
                                                onChange={(e) =>
                                                    handoverForm.setData(
                                                        'access_transferred',
                                                        e.target.checked,
                                                    )
                                                }
                                            />
                                            Access Transferred
                                        </label>
                                        <label className="flex items-center gap-1.5">
                                            <input
                                                type="checkbox"
                                                checked={handoverForm.data.guide_delivered}
                                                onChange={(e) =>
                                                    handoverForm.setData(
                                                        'guide_delivered',
                                                        e.target.checked,
                                                    )
                                                }
                                            />
                                            Guide & Training Delivered
                                        </label>
                                    </div>
                                    <button
                                        type="submit"
                                        className="rounded-lg bg-[#101D35] px-4 py-2 text-xs font-semibold text-white"
                                    >
                                        Save Handover Record
                                    </button>
                                </form>
                            ) : (
                                <p className="mt-3 text-xs text-slate-400">
                                    No handover recorded yet.
                                </p>
                            )}
                        </div>

                        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-5">
                            <h3 className="flex items-center gap-1.5 text-xs font-bold text-[#101D35]">
                                <Ticket className="h-4 w-4" />
                                Maintenance Tickets
                            </h3>
                            {canUpdate && (
                                <form
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        ticketForm.post(`/projects/${project.id}/tickets`, {
                                            onSuccess: () => ticketForm.reset('title', 'description'),
                                        });
                                    }}
                                    className="space-y-2 rounded-lg border border-slate-100 bg-slate-50 p-3"
                                >
                                    <input
                                        type="text"
                                        required
                                        value={ticketForm.data.title}
                                        onChange={(e) => ticketForm.setData('title', e.target.value)}
                                        placeholder="Ticket issue or enhancement..."
                                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs"
                                    />
                                    <div className="flex gap-2">
                                        <select
                                            value={ticketForm.data.priority}
                                            onChange={(e) =>
                                                ticketForm.setData('priority', e.target.value)
                                            }
                                            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
                                        >
                                            <option value="Tinggi">Tinggi</option>
                                            <option value="Sedang">Sedang</option>
                                            <option value="Rendah">Rendah</option>
                                        </select>
                                        <select
                                            value={ticketForm.data.assigned_to}
                                            onChange={(e) =>
                                                ticketForm.setData('assigned_to', e.target.value)
                                            }
                                            className="flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
                                        >
                                            {users.map((u) => (
                                                <option key={u.id} value={u.id}>
                                                    {u.name}
                                                </option>
                                            ))}
                                        </select>
                                        <button
                                            type="submit"
                                            className="rounded-lg bg-[#101D35] px-3 py-1.5 text-xs font-semibold text-white"
                                        >
                                            Open
                                        </button>
                                    </div>
                                </form>
                            )}
                            <div className="space-y-2">
                                {project.maintenance_tickets.map((tk) => (
                                    <div
                                        key={tk.id}
                                        className="flex items-center justify-between rounded-lg border border-slate-200 p-3 text-xs"
                                    >
                                        <div>
                                            <span className="font-mono font-bold text-[#101D35]">
                                                {tk.code}
                                            </span>{' '}
                                            — {tk.title}
                                            <div className="text-[11px] text-slate-500">
                                                Assignee: {tk.assignee ?? 'Unassigned'}
                                            </div>
                                        </div>
                                        <StatusBadge label={tk.priority} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {tab === 'tasks' && (
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-5">
                            <h3 className="flex items-center gap-1.5 text-xs font-bold text-[#101D35]">
                                <Flag className="h-4 w-4" />
                                Project Milestones
                            </h3>
                            {canUpdate && (
                                <form
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        milestoneForm.post(`/projects/${project.id}/milestones`, {
                                            onSuccess: () => milestoneForm.reset(),
                                        });
                                    }}
                                    className="flex gap-2"
                                >
                                    <input
                                        type="text"
                                        required
                                        value={milestoneForm.data.title}
                                        onChange={(e) =>
                                            milestoneForm.setData('title', e.target.value)
                                        }
                                        placeholder="Milestone title"
                                        className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs"
                                    />
                                    <input
                                        type="date"
                                        value={milestoneForm.data.due_date}
                                        onChange={(e) =>
                                            milestoneForm.setData('due_date', e.target.value)
                                        }
                                        className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
                                    />
                                    <button
                                        type="submit"
                                        className="rounded-lg bg-[#101D35] px-3 py-1.5 text-xs font-semibold text-white"
                                    >
                                        Add
                                    </button>
                                </form>
                            )}
                            <div className="space-y-2">
                                {project.milestones.map((ms) => (
                                    <div
                                        key={ms.id}
                                        className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs"
                                    >
                                        <span className="font-medium text-slate-800">{ms.title}</span>
                                        <span className="text-[11px] text-slate-500">
                                            {formatShortDate(ms.due_date)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-5">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xs font-bold text-[#101D35]">
                                    Linked Operational Tasks
                                </h3>
                                <Link
                                    href="/tasks"
                                    className="text-[11px] font-semibold text-blue-600 hover:underline"
                                >
                                    Task Tracker
                                </Link>
                            </div>
                            <div className="space-y-2">
                                {project.tasks.map((t) => (
                                    <Link
                                        key={t.id}
                                        href={`/tasks/${t.id}`}
                                        className="flex items-center justify-between rounded-lg border border-slate-200 p-3 text-xs hover:bg-slate-50"
                                    >
                                        <div>
                                            <span className="font-mono font-bold text-[#101D35]">
                                                {t.code}
                                            </span>{' '}
                                            — {t.title}
                                            <div className="text-[11px] text-slate-500">
                                                PIC: {t.pic_name} • Due {formatShortDate(t.deadline)}
                                            </div>
                                        </div>
                                        <StatusBadge label={t.status} />
                                    </Link>
                                ))}
                                {project.tasks.length === 0 && (
                                    <p className="py-6 text-center text-xs text-slate-400">
                                        No tasks linked to this project yet.
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {tab === 'team' && (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {project.members.map((m) => (
                            <div
                                key={m.id}
                                className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4"
                            >
                                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#101D35] text-xs font-bold text-white">
                                    {m.name ? getInitials(m.name) : 'KD'}
                                </span>
                                <div>
                                    <p className="text-xs font-bold text-[#101D35]">{m.name}</p>
                                    <p className="text-[11px] text-slate-500">{m.project_role}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </AppShell>
    );
}
