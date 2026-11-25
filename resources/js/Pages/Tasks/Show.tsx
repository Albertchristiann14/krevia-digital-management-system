import { StatusBadge } from '@/Components/shared/StatusBadge';
import { AppShell } from '@/Layouts/AppShell';
import type { PageProps } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowLeft,
    CheckCircle2,
    Download,
    FileUp,
    GitCommit,
    Link2,
    MessageSquare,
    Plus,
    Trash2,
} from 'lucide-react';
import { useState, type FormEvent } from 'react';

interface TaskShowProps extends PageProps {
    task: {
        id: number;
        code: string;
        title: string;
        description: string | null;
        expected_result: string | null;
        pic_user_id: number;
        pic_name: string | null;
        department: string | null;
        reviewer_user_id: number | null;
        reviewer_name: string | null;
        approver_name: string | null;
        approved_at: string | null;
        completed_at: string | null;
        priority: string;
        start_date: string | null;
        deadline: string;
        status: string;
        progress_pct: number;
        is_blocked: boolean;
        blocker_note: string | null;
        blocker_reported_at: string | null;
        notes: string | null;
        deadline_status: string;
        month_label: string | null;
        stage_label: string | null;
        expected_evidence: string | null;
        subtasks: { id: number; title: string; is_completed: boolean; completed_by: string | null }[];
        dependencies: { id: number; code: string; title: string; status: string; deadline: string | null }[];
        comments: { id: number; author: string | null; body: string; created_at: string | null }[];
        evidences: {
            id: number;
            type: string;
            title: string;
            url: string | null;
            original_name: string | null;
            uploader: string | null;
            created_at: string | null;
        }[];
        histories: {
            id: number;
            from_status: string | null;
            to_status: string;
            actor: string;
            note: string | null;
            created_at: string | null;
        }[];
    };
    users: { id: number; name: string }[];
    linkableTasks: { id: number; code: string; title: string; status: string }[];
    statuses: string[];
    priorities: string[];
    permissions: {
        canUpdate: boolean;
        canApprove: boolean;
        canDelete: boolean;
    };
    errors?: Record<string, string>;
}

export default function TaskShow({
    task,
    users,
    linkableTasks,
    priorities,
    permissions,
    errors = {},
}: TaskShowProps) {
    const [subtaskTitle, setSubtaskTitle] = useState('');
    const [commentBody, setCommentBody] = useState('');
    const [depId, setDepId] = useState('');
    const [transitionNote, setTransitionNote] = useState('');

    // Evidence form
    const [evType, setEvType] = useState<'url' | 'commit' | 'file'>('url');
    const [evTitle, setEvTitle] = useState('');
    const [evUrl, setEvUrl] = useState('');
    const [evFile, setEvFile] = useState<File | null>(null);

    // Edit metadata form
    const [progress, setProgress] = useState(task.progress_pct);
    const [reviewerId, setReviewerId] = useState(
        task.reviewer_user_id ? String(task.reviewer_user_id) : '',
    );
    const [priority, setPriority] = useState(task.priority);
    const [isBlocked, setIsBlocked] = useState(task.is_blocked);
    const [blockerNote, setBlockerNote] = useState(task.blocker_note ?? '');

    const transition = (targetStatus: string) => {
        router.post(
            `/tasks/${task.id}/transition`,
            { status: targetStatus, note: transitionNote },
            { preserveScroll: true, onSuccess: () => setTransitionNote('') },
        );
    };

    const saveMeta = (e: FormEvent) => {
        e.preventDefault();
        router.patch(
            `/tasks/${task.id}`,
            {
                progress_pct: progress,
                reviewer_user_id: reviewerId ? Number(reviewerId) : null,
                priority,
                is_blocked: isBlocked,
                blocker_note: blockerNote,
            },
            { preserveScroll: true },
        );
    };

    const addEvidence = (e: FormEvent) => {
        e.preventDefault();
        router.post(
            `/tasks/${task.id}/evidences`,
            {
                type: evType,
                title: evTitle,
                url: evType !== 'file' ? evUrl : null,
                file: evType === 'file' ? evFile : null,
            },
            {
                forceFormData: true,
                preserveScroll: true,
                onSuccess: () => {
                    setEvTitle('');
                    setEvUrl('');
                    setEvFile(null);
                },
            },
        );
    };

    const addSubtask = (e: FormEvent) => {
        e.preventDefault();
        if (!subtaskTitle.trim()) return;
        router.post(
            `/tasks/${task.id}/subtasks`,
            { title: subtaskTitle },
            { preserveScroll: true, onSuccess: () => setSubtaskTitle('') },
        );
    };

    const addComment = (e: FormEvent) => {
        e.preventDefault();
        if (!commentBody.trim()) return;
        router.post(
            `/tasks/${task.id}/comments`,
            { body: commentBody },
            { preserveScroll: true, onSuccess: () => setCommentBody('') },
        );
    };

    const addDependency = (e: FormEvent) => {
        e.preventDefault();
        if (!depId) return;
        router.post(
            `/tasks/${task.id}/dependencies`,
            { depends_on_task_id: Number(depId) },
            { preserveScroll: true, onSuccess: () => setDepId('') },
        );
    };

    const hasEvidence = task.evidences.length > 0;

    return (
        <AppShell
            title={`${task.code} · ${task.title}`}
            subtitle={`${task.month_label ?? 'Workplan'} ${task.stage_label ? `· ${task.stage_label}` : ''}`}
            actions={
                <Link
                    href="/tasks"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Tracker
                </Link>
            }
        >
            <Head title={`${task.code} — ${task.title}`} />

            {errors.status && (
                <div className="mb-5 flex items-center gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
                    <span>{errors.status}</span>
                </div>
            )}

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Left 2 Columns: Details, Evidence Gate, Subtasks, Comments */}
                <div className="space-y-6 lg:col-span-2">
                    {/* Overview & Workflow Transitions */}
                    <div className="rounded-xl border border-slate-200 bg-white p-6">
                        <div className="flex flex-wrap items-center gap-2">
                            <StatusBadge label={task.status} />
                            <StatusBadge label={task.priority} />
                            {task.deadline_status && <StatusBadge label={task.deadline_status} />}
                            {task.is_blocked && <StatusBadge label="Blocked" tone="red" />}
                        </div>

                        {task.description && (
                            <p className="mt-4 text-sm leading-relaxed text-slate-700">
                                {task.description}
                            </p>
                        )}

                        {(task.expected_evidence || task.expected_result) && (
                            <div className="mt-4 rounded-lg border border-slate-100 bg-slate-50 p-3.5 text-xs text-slate-700">
                                <span className="font-bold text-[#101D35]">Expected Evidence: </span>
                                {task.expected_evidence ?? task.expected_result}
                            </div>
                        )}

                        {/* Status Transition Controls */}
                        {permissions.canUpdate && (
                            <div className="mt-5 border-t border-slate-100 pt-4">
                                <p className="mb-2 text-xs font-bold tracking-wide text-slate-500 uppercase">
                                    Workflow Transitions
                                </p>
                                <input
                                    type="text"
                                    value={transitionNote}
                                    onChange={(e) => setTransitionNote(e.target.value)}
                                    placeholder="Optional status transition note..."
                                    className="mb-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                                />
                                <div className="flex flex-wrap gap-2">
                                    {task.status !== 'In Progress' && (
                                        <button
                                            type="button"
                                            onClick={() => transition('In Progress')}
                                            className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                                        >
                                            Move to In Progress
                                        </button>
                                    )}
                                    {task.status !== 'Under Review' && (
                                        <button
                                            type="button"
                                            onClick={() => transition('Under Review')}
                                            className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100"
                                        >
                                            Submit for Review
                                        </button>
                                    )}
                                    {task.status !== 'Completed' && permissions.canApprove && (
                                        <button
                                            type="button"
                                            disabled={!hasEvidence}
                                            onClick={() => transition('Completed')}
                                            title={
                                                hasEvidence
                                                    ? 'Approve and mark Completed'
                                                    : 'Attach completion evidence first'
                                            }
                                            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-45"
                                        >
                                            <CheckCircle2 className="h-3.5 w-3.5" />
                                            Approve &amp; Complete
                                        </button>
                                    )}
                                    {task.status !== 'On Hold' && (
                                        <button
                                            type="button"
                                            onClick={() => transition('On Hold')}
                                            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                        >
                                            Put On Hold
                                        </button>
                                    )}
                                </div>
                                {!hasEvidence && task.status !== 'Completed' && (
                                    <p className="mt-2 text-xs text-amber-700">
                                        Completion Gate: Attach at least one evidence item below before this task
                                        can be marked Completed.
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Completion Evidence */}
                    <div className="rounded-xl border border-slate-200 bg-white p-6">
                        <div className="mb-4 flex items-center justify-between">
                            <div>
                                <h2 className="font-display text-base font-bold text-[#101D35]">
                                    Completion Evidence ({task.evidences.length})
                                </h2>
                                <p className="text-xs text-slate-500">
                                    Files are stored privately and served only to authenticated team members
                                </p>
                            </div>
                        </div>

                        <div className="space-y-2.5">
                            {task.evidences.map((ev) => (
                                <div
                                    key={ev.id}
                                    className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50/60 px-3.5 py-2.5"
                                >
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <StatusBadge label={ev.type.toUpperCase()} tone="blue" />
                                            <span className="truncate text-xs font-semibold text-slate-900">
                                                {ev.title}
                                            </span>
                                        </div>
                                        <p className="mt-1 truncate text-[11px] text-slate-500">
                                            {ev.url ?? ev.original_name} · by {ev.uploader} ({ev.created_at})
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {ev.type === 'file' ? (
                                            <a
                                                href={`/tasks/${task.id}/evidences/${ev.id}/download`}
                                                className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-[#101D35] hover:bg-slate-50"
                                            >
                                                <Download className="h-3.5 w-3.5" />
                                                Download
                                            </a>
                                        ) : (
                                            ev.url && (
                                                <a
                                                    href={ev.url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-slate-50"
                                                >
                                                    <Link2 className="h-3.5 w-3.5" />
                                                    Open
                                                </a>
                                            )
                                        )}
                                        {permissions.canUpdate && (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    router.delete(`/tasks/${task.id}/evidences/${ev.id}`, {
                                                        preserveScroll: true,
                                                    })
                                                }
                                                className="rounded p-1 text-slate-400 hover:text-rose-600"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {permissions.canUpdate && (
                            <form
                                onSubmit={addEvidence}
                                className="mt-4 grid grid-cols-1 gap-2.5 border-t border-slate-100 pt-4 sm:grid-cols-4"
                            >
                                <select
                                    value={evType}
                                    onChange={(e) => setEvType(e.target.value as 'url' | 'commit' | 'file')}
                                    className="rounded-lg border border-slate-200 px-2.5 py-2 text-xs font-medium"
                                >
                                    <option value="url">Link / URL</option>
                                    <option value="commit">Git Commit / PR</option>
                                    <option value="file">Private File Upload</option>
                                </select>
                                <input
                                    type="text"
                                    required
                                    value={evTitle}
                                    onChange={(e) => setEvTitle(e.target.value)}
                                    placeholder="Evidence title..."
                                    className="rounded-lg border border-slate-200 px-3 py-2 text-xs"
                                />
                                {evType === 'file' ? (
                                    <input
                                        type="file"
                                        required
                                        onChange={(e) => setEvFile(e.target.files?.[0] ?? null)}
                                        className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
                                    />
                                ) : (
                                    <input
                                        type="text"
                                        required
                                        value={evUrl}
                                        onChange={(e) => setEvUrl(e.target.value)}
                                        placeholder={evType === 'commit' ? 'Commit hash / PR URL' : 'https://...'}
                                        className="rounded-lg border border-slate-200 px-3 py-2 text-xs"
                                    />
                                )}
                                <button
                                    type="submit"
                                    className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#101D35] px-3 py-2 text-xs font-semibold text-white hover:bg-[#1A2D4E]"
                                >
                                    {evType === 'file' ? (
                                        <FileUp className="h-3.5 w-3.5" />
                                    ) : (
                                        <GitCommit className="h-3.5 w-3.5" />
                                    )}
                                    Attach
                                </button>
                            </form>
                        )}
                    </div>

                    {/* Subtasks & Dependencies */}
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        <div className="rounded-xl border border-slate-200 bg-white p-5">
                            <h3 className="mb-3 font-display text-sm font-bold text-[#101D35]">
                                Subtasks ({task.subtasks.length})
                            </h3>
                            <div className="space-y-2">
                                {task.subtasks.map((s) => (
                                    <div key={s.id} className="flex items-center justify-between gap-2 text-xs">
                                        <label className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                checked={s.is_completed}
                                                disabled={!permissions.canUpdate}
                                                onChange={() =>
                                                    router.post(
                                                        `/tasks/${task.id}/subtasks/${s.id}/toggle`,
                                                        {},
                                                        { preserveScroll: true },
                                                    )
                                                }
                                                className="h-3.5 w-3.5 rounded border-slate-300 text-[#101D35]"
                                            />
                                            <span className={s.is_completed ? 'text-slate-400 line-through' : ''}>
                                                {s.title}
                                            </span>
                                        </label>
                                        {permissions.canUpdate && (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    router.delete(`/tasks/${task.id}/subtasks/${s.id}`, {
                                                        preserveScroll: true,
                                                    })
                                                }
                                                className="text-slate-400 hover:text-rose-600"
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                            {permissions.canUpdate && (
                                <form onSubmit={addSubtask} className="mt-3 flex gap-2">
                                    <input
                                        type="text"
                                        value={subtaskTitle}
                                        onChange={(e) => setSubtaskTitle(e.target.value)}
                                        placeholder="Add subtask..."
                                        className="flex-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
                                    />
                                    <button
                                        type="submit"
                                        className="rounded-lg bg-[#101D35] px-2.5 py-1.5 text-xs font-semibold text-white"
                                    >
                                        <Plus className="h-3.5 w-3.5" />
                                    </button>
                                </form>
                            )}
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-white p-5">
                            <h3 className="mb-3 font-display text-sm font-bold text-[#101D35]">
                                Blocking Dependencies ({task.dependencies.length})
                            </h3>
                            <div className="space-y-2">
                                {task.dependencies.map((d) => (
                                    <div
                                        key={d.id}
                                        className="flex items-center justify-between rounded-lg border border-slate-100 px-2.5 py-2 text-xs"
                                    >
                                        <Link href={`/tasks/${d.id}`} className="truncate font-medium">
                                            <span className="mr-1 font-mono font-bold text-[#101D35]">
                                                {d.code}
                                            </span>
                                            {d.title}
                                        </Link>
                                        <div className="flex items-center gap-1.5">
                                            <StatusBadge label={d.status} />
                                            {permissions.canUpdate && (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        router.delete(
                                                            `/tasks/${task.id}/dependencies/${d.id}`,
                                                            { preserveScroll: true },
                                                        )
                                                    }
                                                    className="text-slate-400 hover:text-rose-600"
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {permissions.canUpdate && (
                                <form onSubmit={addDependency} className="mt-3 flex gap-2">
                                    <select
                                        value={depId}
                                        onChange={(e) => setDepId(e.target.value)}
                                        className="min-w-0 flex-1 rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
                                    >
                                        <option value="">Link prerequisite task...</option>
                                        {linkableTasks.map((lt) => (
                                            <option key={lt.id} value={String(lt.id)}>
                                                {lt.code} — {lt.title}
                                            </option>
                                        ))}
                                    </select>
                                    <button
                                        type="submit"
                                        className="rounded-lg bg-[#101D35] px-2.5 py-1.5 text-xs font-semibold text-white"
                                    >
                                        Link
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>

                    {/* Comments */}
                    <div className="rounded-xl border border-slate-200 bg-white p-6">
                        <div className="mb-4 flex items-center gap-2">
                            <MessageSquare className="h-4 w-4 text-[#101D35]" />
                            <h3 className="font-display text-sm font-bold text-[#101D35]">
                                Comments ({task.comments.length})
                            </h3>
                        </div>
                        <form onSubmit={addComment} className="mb-4 flex gap-2">
                            <input
                                type="text"
                                value={commentBody}
                                onChange={(e) => setCommentBody(e.target.value)}
                                placeholder="Write a progress update or review comment..."
                                className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-xs"
                            />
                            <button
                                type="submit"
                                className="rounded-lg bg-[#101D35] px-4 py-2 text-xs font-semibold text-white"
                            >
                                Post
                            </button>
                        </form>
                        <div className="space-y-3">
                            {task.comments.map((c) => (
                                <div key={c.id} className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="font-semibold text-slate-900">{c.author}</span>
                                        <span className="font-mono text-[11px] text-slate-400">
                                            {c.created_at}
                                        </span>
                                    </div>
                                    <p className="mt-1 text-xs text-slate-700">{c.body}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Column: Metadata, Blocker & Status History */}
                <div className="space-y-6">
                    <form
                        onSubmit={saveMeta}
                        className="space-y-4 rounded-xl border border-slate-200 bg-white p-5"
                    >
                        <h3 className="font-display text-sm font-bold text-[#101D35]">
                            Task Properties &amp; Blockers
                        </h3>

                        <div className="space-y-2 text-xs">
                            <div className="flex justify-between">
                                <span className="text-slate-500">Primary PIC</span>
                                <span className="font-semibold text-slate-900">{task.pic_name}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Start Date</span>
                                <span className="font-mono text-slate-900">{task.start_date ?? '—'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Deadline</span>
                                <span className="font-mono font-semibold text-slate-900">{task.deadline}</span>
                            </div>
                            {task.approver_name && (
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Approved By</span>
                                    <span className="font-semibold text-emerald-700">
                                        {task.approver_name} ({task.approved_at})
                                    </span>
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-700">
                                Progress ({progress}%)
                            </label>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                step="5"
                                disabled={!permissions.canUpdate}
                                value={progress}
                                onChange={(e) => setProgress(Number(e.target.value))}
                                className="w-full accent-[#101D35]"
                            />
                        </div>

                        <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-700">
                                Reviewer
                            </label>
                            <select
                                disabled={!permissions.canUpdate}
                                value={reviewerId}
                                onChange={(e) => setReviewerId(e.target.value)}
                                className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-xs"
                            >
                                <option value="">No assigned reviewer</option>
                                {users.map((u) => (
                                    <option key={u.id} value={String(u.id)}>
                                        {u.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-700">
                                Priority
                            </label>
                            <select
                                disabled={!permissions.canUpdate}
                                value={priority}
                                onChange={(e) => setPriority(e.target.value)}
                                className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-xs"
                            >
                                {priorities.map((p) => (
                                    <option key={p} value={p}>
                                        {p}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="rounded-lg border border-slate-200 p-3">
                            <label className="flex items-center gap-2 text-xs font-semibold text-rose-700">
                                <input
                                    type="checkbox"
                                    disabled={!permissions.canUpdate}
                                    checked={isBlocked}
                                    onChange={(e) => setIsBlocked(e.target.checked)}
                                    className="h-3.5 w-3.5 rounded border-slate-300 text-rose-600"
                                />
                                Report Blocker (≤1 workday SLA)
                            </label>
                            {isBlocked && (
                                <textarea
                                    rows={2}
                                    disabled={!permissions.canUpdate}
                                    value={blockerNote}
                                    onChange={(e) => setBlockerNote(e.target.value)}
                                    placeholder="Describe blocker & escalation needed..."
                                    className="mt-2 w-full rounded border border-rose-200 p-2 text-xs"
                                />
                            )}
                        </div>

                        {permissions.canUpdate && (
                            <button
                                type="submit"
                                className="w-full rounded-lg bg-[#101D35] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1A2D4E]"
                            >
                                Save Updates
                            </button>
                        )}
                    </form>

                    {/* Change History */}
                    <div className="rounded-xl border border-slate-200 bg-white p-5">
                        <h3 className="mb-3 font-display text-sm font-bold text-[#101D35]">
                            Status History
                        </h3>
                        <div className="space-y-2.5">
                            {task.histories.length === 0 ? (
                                <p className="text-xs text-slate-400">No status transitions recorded yet.</p>
                            ) : (
                                task.histories.map((h) => (
                                    <div key={h.id} className="border-l-2 border-[#101D35] pl-3 text-xs">
                                        <p className="font-semibold text-slate-900">
                                            {h.from_status ?? 'New'} → {h.to_status}
                                        </p>
                                        <p className="text-[11px] text-slate-500">
                                            {h.actor} · {h.created_at}
                                        </p>
                                        {h.note && <p className="mt-0.5 text-slate-600">{h.note}</p>}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </AppShell>
    );
}
