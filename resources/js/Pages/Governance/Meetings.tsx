import { StatusBadge } from '@/Components/shared/StatusBadge';
import { AppShell } from '@/Layouts/AppShell';
import { cn, formatShortDate } from '@/lib/utils';
import type { PageProps } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import {
    CalendarCheck,
    CheckCircle2,
    Clock,
    FileText,
    Gavel,
    ListChecks,
    NotebookPen,
    Plus,
    X,
} from 'lucide-react';
import { useState, type FormEvent } from 'react';

interface ForumRow {
    id: number;
    code: string;
    name: string;
    purpose: string | null;
    frequency: string;
    duration: string;
    participants: string | null;
    standard_agenda: string | null;
    required_output: string | null;
    pic_name: string | null;
}

interface MeetingRow {
    id: number;
    code: string;
    forum_id: number | null;
    forum_name: string;
    focus: string;
    scheduled_date: string | null;
    scheduled_time: string | null;
    status: string;
    pic_user_id: number | null;
    pic_name: string | null;
    agenda: string | null;
    agenda_sent_at: string | null;
    participants_list: string | null;
    minute: {
        id: number;
        summary: string;
        decisions_summary: string | null;
        escalations: string | null;
        recorder: string | null;
        submitted_at: string | null;
        is_within_24h_sla: boolean;
    } | null;
    action_items: {
        id: number;
        title: string;
        pic_name: string | null;
        due_date: string | null;
        evidence_note: string | null;
        status: string;
    }[];
    decisions: { id: number; code: string; topic_decision: string }[];
}

interface MeetingsProps extends PageProps {
    forums: ForumRow[];
    meetings: MeetingRow[];
    weeklyReports: {
        id: number;
        user_name: string | null;
        week_start_date: string | null;
        week_label: string;
        completed_tasks_summary: string;
        in_progress_summary: string;
        blockers_summary: string | null;
        next_week_plan: string;
        submitted_at: string | null;
    }[];
    quarterlyReviews: {
        id: number;
        quarter_label: string;
        review_focus: string;
        period_range: string;
        score: number | null;
        status: string;
        key_decisions: string | null;
        action_plan: string | null;
    }[];
    users: { id: number; name: string }[];
    canManage: boolean;
}

export default function Meetings({
    forums,
    meetings,
    weeklyReports,
    quarterlyReviews,
    users,
    canManage,
    errors,
}: MeetingsProps) {
    const [tab, setTab] = useState<'meetings' | 'forums' | 'weekly' | 'quarterly'>('meetings');
    const [selectedMeetingId, setSelectedMeetingId] = useState<number>(meetings[0]?.id ?? 0);
    const [showNewModal, setShowNewModal] = useState(false);

    const activeMeeting = meetings.find((m) => m.id === selectedMeetingId) ?? meetings[0];

    const newMeetingForm = useForm({
        forum_id: forums[0]?.id ? String(forums[0].id) : '',
        forum_name: forums[0]?.name ?? 'Weekly Team Sync',
        focus: '',
        scheduled_date: new Date().toISOString().slice(0, 10),
        scheduled_time: '09:00',
        pic_user_id: users[0]?.id ? String(users[0].id) : '',
        agenda: '',
    });

    const agendaForm = useForm({
        agenda: activeMeeting?.agenda ?? '',
        participants_list: activeMeeting?.participants_list ?? 'All 7 Krevia Digital team members',
    });

    const minuteForm = useForm({
        summary: activeMeeting?.minute?.summary ?? '',
        decisions_summary: activeMeeting?.minute?.decisions_summary ?? '',
        escalations: activeMeeting?.minute?.escalations ?? '',
    });

    const actionForm = useForm({
        title: '',
        pic_user_id: users[0]?.id ? String(users[0].id) : '',
        due_date: '',
        evidence_note: '',
    });

    const decisionForm = useForm({
        topic_decision: '',
        pic_user_id: users[0]?.id ? String(users[0].id) : '',
        deadline: '',
        follow_up: '',
    });

    const weeklyForm = useForm({
        week_start_date: new Date().toISOString().slice(0, 10),
        completed_tasks_summary: '',
        in_progress_summary: '',
        blockers_summary: '',
        next_week_plan: '',
    });

    const selectMeeting = (m: MeetingRow) => {
        setSelectedMeetingId(m.id);
        agendaForm.setData({
            agenda: m.agenda ?? '',
            participants_list: m.participants_list ?? 'All 7 Krevia Digital team members',
        });
        minuteForm.setData({
            summary: m.minute?.summary ?? '',
            decisions_summary: m.minute?.decisions_summary ?? '',
            escalations: m.minute?.escalations ?? '',
        });
    };

    const errorList = Object.values(errors ?? {});

    return (
        <AppShell
            title="Meetings & Evaluation Hub"
            subtitle="Sheet 15 • 6 Forums, 16 Planned Evaluation Reviews, H-1 Agenda & 24h Minutes SLA, Weekly Friday 16:00 Report"
            actions={
                canManage && (
                    <button
                        type="button"
                        onClick={() => setShowNewModal(true)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#101D35] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#192c4e]"
                    >
                        <Plus className="h-4 w-4" />
                        Schedule Meeting
                    </button>
                )
            }
        >
            <Head title="Meetings & Evaluation — KDMS" />

            {errorList.length > 0 && (
                <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">
                    {errorList.map((e, i) => (
                        <div key={i}>{e}</div>
                    ))}
                </div>
            )}

            <div className="flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-1.5">
                {(
                    [
                        ['meetings', `Meetings & Minutes (${meetings.length})`],
                        ['forums', `6 Routine Forums (${forums.length})`],
                        ['weekly', `Weekly Progress Reports (${weeklyReports.length})`],
                        ['quarterly', `Quarterly Reviews (${quarterlyReviews.length})`],
                    ] as const
                ).map(([k, label]) => (
                    <button
                        key={k}
                        type="button"
                        onClick={() => setTab(k)}
                        className={cn(
                            'rounded-lg px-3 py-1.5 text-xs font-semibold transition',
                            tab === k
                                ? 'bg-[#101D35] text-white'
                                : 'text-slate-600 hover:bg-slate-100',
                        )}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {tab === 'meetings' && (
                <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-3">
                    {/* Left Pane: Schedule */}
                    <div className="max-h-[75vh] space-y-2 overflow-y-auto rounded-xl border border-slate-200 bg-white p-3 lg:col-span-1">
                        {meetings.map((m) => (
                            <button
                                key={m.id}
                                type="button"
                                onClick={() => selectMeeting(m)}
                                className={cn(
                                    'w-full rounded-xl border p-3 text-left transition',
                                    activeMeeting?.id === m.id
                                        ? 'border-[#101D35] bg-[#101D35] text-white'
                                        : 'border-slate-100 bg-slate-50/70 hover:bg-slate-100',
                                )}
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <span className="font-mono text-[11px] font-bold">
                                        {m.code}
                                    </span>
                                    <StatusBadge label={m.status} />
                                </div>
                                <p className="mt-1 text-xs font-bold">{m.forum_name}</p>
                                <p
                                    className={cn(
                                        'text-[11px]',
                                        activeMeeting?.id === m.id
                                            ? 'text-slate-300'
                                            : 'text-slate-600',
                                    )}
                                >
                                    {m.focus}
                                </p>
                                <p
                                    className={cn(
                                        'mt-1 text-[10px]',
                                        activeMeeting?.id === m.id
                                            ? 'text-slate-300'
                                            : 'text-slate-400',
                                    )}
                                >
                                    {formatShortDate(m.scheduled_date)} • PIC: {m.pic_name}
                                </p>
                            </button>
                        ))}
                    </div>

                    {/* Right Pane: Hypercontext Workspace */}
                    {activeMeeting && (
                        <div className="space-y-4 lg:col-span-2">
                            <div className="rounded-xl border border-slate-200 bg-white p-5">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div>
                                        <span className="font-mono text-xs font-bold text-slate-500">
                                            {activeMeeting.code} • {formatShortDate(activeMeeting.scheduled_date)}
                                        </span>
                                        <h2 className="text-base font-bold text-[#101D35]">
                                            {activeMeeting.forum_name} — {activeMeeting.focus}
                                        </h2>
                                    </div>
                                    <StatusBadge label={activeMeeting.status} />
                                </div>
                            </div>

                            {/* H-1 Agenda Gate */}
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    agendaForm.post(`/governance/meetings/${activeMeeting.id}/agenda`);
                                }}
                                className="space-y-3 rounded-xl border border-slate-200 bg-white p-5"
                            >
                                <div className="flex items-center justify-between">
                                    <h3 className="flex items-center gap-1.5 text-xs font-bold text-[#101D35]">
                                        <CalendarCheck className="h-4 w-4" />
                                        H-1 Agenda (Mandatory before completion)
                                    </h3>
                                    {activeMeeting.agenda_sent_at && (
                                        <span className="text-[11px] font-semibold text-emerald-700">
                                            Sent {activeMeeting.agenda_sent_at}
                                        </span>
                                    )}
                                </div>
                                <textarea
                                    rows={2}
                                    required
                                    disabled={!canManage}
                                    value={agendaForm.data.agenda}
                                    onChange={(e) => agendaForm.setData('agenda', e.target.value)}
                                    placeholder="Written agenda items..."
                                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                                />
                                {canManage && (
                                    <div className="flex justify-end">
                                        <button
                                            type="submit"
                                            className="rounded-lg bg-[#101D35] px-3.5 py-1.5 text-xs font-semibold text-white"
                                        >
                                            Publish / Update Agenda
                                        </button>
                                    </div>
                                )}
                            </form>

                            {/* 24h Minutes SLA */}
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    minuteForm.post(`/governance/meetings/${activeMeeting.id}/minutes`);
                                }}
                                className="space-y-3 rounded-xl border border-slate-200 bg-white p-5"
                            >
                                <div className="flex items-center justify-between">
                                    <h3 className="flex items-center gap-1.5 text-xs font-bold text-[#101D35]">
                                        <NotebookPen className="h-4 w-4" />
                                        Meeting Minutes (24h SLA)
                                    </h3>
                                    {activeMeeting.minute && (
                                        <span
                                            className={cn(
                                                'rounded-full px-2.5 py-0.5 text-[10px] font-bold',
                                                activeMeeting.minute.is_within_24h_sla
                                                    ? 'bg-emerald-50 text-emerald-700'
                                                    : 'bg-amber-50 text-amber-700',
                                            )}
                                        >
                                            {activeMeeting.minute.is_within_24h_sla
                                                ? 'Submitted Within 24h SLA ✓'
                                                : 'Submitted >24h'}
                                        </span>
                                    )}
                                </div>
                                <textarea
                                    rows={3}
                                    required
                                    disabled={!canManage}
                                    value={minuteForm.data.summary}
                                    onChange={(e) => minuteForm.setData('summary', e.target.value)}
                                    placeholder="Meeting summary & outcomes..."
                                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                                />
                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                    <input
                                        type="text"
                                        disabled={!canManage}
                                        value={minuteForm.data.decisions_summary}
                                        onChange={(e) =>
                                            minuteForm.setData('decisions_summary', e.target.value)
                                        }
                                        placeholder="Key decisions summary..."
                                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs"
                                    />
                                    <input
                                        type="text"
                                        disabled={!canManage}
                                        value={minuteForm.data.escalations}
                                        onChange={(e) =>
                                            minuteForm.setData('escalations', e.target.value)
                                        }
                                        placeholder="Escalations & owners..."
                                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs"
                                    />
                                </div>
                                {canManage && (
                                    <div className="flex justify-end">
                                        <button
                                            type="submit"
                                            className="rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white"
                                        >
                                            Save Minutes & Complete
                                        </button>
                                    </div>
                                )}
                            </form>

                            {/* Action Items + Promote Decision */}
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div className="rounded-xl border border-slate-200 bg-white p-4">
                                    <h3 className="flex items-center gap-1.5 text-xs font-bold text-[#101D35]">
                                        <ListChecks className="h-4 w-4" />
                                        Action Items ({activeMeeting.action_items.length})
                                    </h3>
                                    {canManage && (
                                        <form
                                            onSubmit={(e) => {
                                                e.preventDefault();
                                                actionForm.post(
                                                    `/governance/meetings/${activeMeeting.id}/action-items`,
                                                    { onSuccess: () => actionForm.reset('title') },
                                                );
                                            }}
                                            className="mt-2 space-y-2"
                                        >
                                            <input
                                                type="text"
                                                required
                                                value={actionForm.data.title}
                                                onChange={(e) =>
                                                    actionForm.setData('title', e.target.value)
                                                }
                                                placeholder="Action item..."
                                                className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
                                            />
                                            <div className="flex gap-2">
                                                <select
                                                    value={actionForm.data.pic_user_id}
                                                    onChange={(e) =>
                                                        actionForm.setData(
                                                            'pic_user_id',
                                                            e.target.value,
                                                        )
                                                    }
                                                    className="flex-1 rounded-lg border border-slate-200 px-2 py-1 text-xs"
                                                >
                                                    {users.map((u) => (
                                                        <option key={u.id} value={u.id}>
                                                            {u.name}
                                                        </option>
                                                    ))}
                                                </select>
                                                <button
                                                    type="submit"
                                                    className="rounded-lg bg-[#101D35] px-3 py-1 text-xs font-semibold text-white"
                                                >
                                                    Add
                                                </button>
                                            </div>
                                        </form>
                                    )}
                                    <div className="mt-3 space-y-1.5">
                                        {activeMeeting.action_items.map((ai) => (
                                            <div
                                                key={ai.id}
                                                className="flex items-center justify-between rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs"
                                            >
                                                <div>
                                                    <p className="font-semibold text-slate-800">
                                                        {ai.title}
                                                    </p>
                                                    <p className="text-[10px] text-slate-500">
                                                        {ai.pic_name}
                                                    </p>
                                                </div>
                                                {ai.status !== 'Completed' ? (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            router.post(
                                                                `/governance/action-items/${ai.id}/complete`,
                                                            )
                                                        }
                                                        className="rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700"
                                                    >
                                                        Done
                                                    </button>
                                                ) : (
                                                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="rounded-xl border border-slate-200 bg-white p-4">
                                    <h3 className="flex items-center gap-1.5 text-xs font-bold text-[#101D35]">
                                        <Gavel className="h-4 w-4" />
                                        Promote to Decision Log
                                    </h3>
                                    {canManage && (
                                        <form
                                            onSubmit={(e) => {
                                                e.preventDefault();
                                                decisionForm.post(
                                                    `/governance/meetings/${activeMeeting.id}/promote-decision`,
                                                    {
                                                        onSuccess: () =>
                                                            decisionForm.reset(
                                                                'topic_decision',
                                                                'follow_up',
                                                            ),
                                                    },
                                                );
                                            }}
                                            className="mt-2 space-y-2"
                                        >
                                            <textarea
                                                rows={2}
                                                required
                                                value={decisionForm.data.topic_decision}
                                                onChange={(e) =>
                                                    decisionForm.setData(
                                                        'topic_decision',
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder="Decision statement to log in Sheet 14..."
                                                className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
                                            />
                                            <button
                                                type="submit"
                                                className="w-full rounded-lg bg-[#101D35] py-1.5 text-xs font-semibold text-white"
                                            >
                                                Promote to Decision Log
                                            </button>
                                        </form>
                                    )}
                                    <div className="mt-3 space-y-1.5">
                                        {activeMeeting.decisions.map((d) => (
                                            <div
                                                key={d.id}
                                                className="rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs"
                                            >
                                                <span className="font-mono font-bold text-[#101D35]">
                                                    {d.code}
                                                </span>
                                                : {d.topic_decision}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {tab === 'forums' && (
                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {forums.map((f) => (
                        <div
                            key={f.id}
                            className="rounded-xl border border-slate-200 bg-white p-5"
                        >
                            <div className="flex items-center justify-between">
                                <span className="font-mono text-xs font-bold text-slate-500">
                                    {f.code}
                                </span>
                                <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700">
                                    {f.frequency}
                                </span>
                            </div>
                            <h3 className="mt-2 text-sm font-bold text-[#101D35]">{f.name}</h3>
                            <p className="mt-1 text-xs text-slate-600">{f.purpose}</p>
                            <div className="mt-3 space-y-1 border-t border-slate-100 pt-3 text-[11px] text-slate-500">
                                <p>
                                    <strong>Duration:</strong> {f.duration} •{' '}
                                    <strong>PIC:</strong> {f.pic_name}
                                </p>
                                <p>
                                    <strong>Output:</strong> {f.required_output}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {tab === 'weekly' && (
                <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-3">
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            weeklyForm.post('/governance/weekly-reports', {
                                onSuccess: () =>
                                    weeklyForm.reset(
                                        'completed_tasks_summary',
                                        'in_progress_summary',
                                        'blockers_summary',
                                        'next_week_plan',
                                    ),
                            });
                        }}
                        className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 lg:col-span-1"
                    >
                        <h3 className="text-sm font-bold text-[#101D35]">
                            Submit Weekly Progress Report (Friday 16:00)
                        </h3>
                        <input
                            type="date"
                            required
                            value={weeklyForm.data.week_start_date}
                            onChange={(e) =>
                                weeklyForm.setData('week_start_date', e.target.value)
                            }
                            className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs"
                        />
                        <textarea
                            rows={2}
                            required
                            value={weeklyForm.data.completed_tasks_summary}
                            onChange={(e) =>
                                weeklyForm.setData('completed_tasks_summary', e.target.value)
                            }
                            placeholder="1. Completed tasks this week (ID & evidence)..."
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                        />
                        <textarea
                            rows={2}
                            required
                            value={weeklyForm.data.in_progress_summary}
                            onChange={(e) =>
                                weeklyForm.setData('in_progress_summary', e.target.value)
                            }
                            placeholder="2. Tasks in progress & ETA..."
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                        />
                        <textarea
                            rows={2}
                            value={weeklyForm.data.blockers_summary}
                            onChange={(e) =>
                                weeklyForm.setData('blockers_summary', e.target.value)
                            }
                            placeholder="3. Blockers & support needed..."
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                        />
                        <textarea
                            rows={2}
                            required
                            value={weeklyForm.data.next_week_plan}
                            onChange={(e) =>
                                weeklyForm.setData('next_week_plan', e.target.value)
                            }
                            placeholder="4. Next week plan..."
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                        />
                        <button
                            type="submit"
                            className="w-full rounded-lg bg-[#101D35] py-2 text-xs font-semibold text-white"
                        >
                            Submit Weekly Report
                        </button>
                    </form>

                    <div className="space-y-3 lg:col-span-2">
                        {weeklyReports.map((wr) => (
                            <div
                                key={wr.id}
                                className="rounded-xl border border-slate-200 bg-white p-4 text-xs"
                            >
                                <div className="flex items-center justify-between font-bold text-[#101D35]">
                                    <span>
                                        {wr.user_name} — {wr.week_label}
                                    </span>
                                    <span className="text-[11px] font-normal text-slate-400">
                                        {wr.submitted_at}
                                    </span>
                                </div>
                                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 text-slate-600">
                                    <p>
                                        <strong>Done:</strong> {wr.completed_tasks_summary}
                                    </p>
                                    <p>
                                        <strong>In Progress:</strong> {wr.in_progress_summary}
                                    </p>
                                    {wr.blockers_summary && (
                                        <p className="text-rose-700">
                                            <strong>Blockers:</strong> {wr.blockers_summary}
                                        </p>
                                    )}
                                    <p>
                                        <strong>Next Week:</strong> {wr.next_week_plan}
                                    </p>
                                </div>
                            </div>
                        ))}
                        {weeklyReports.length === 0 && (
                            <div className="rounded-xl border border-dashed border-slate-200 bg-white p-10 text-center text-xs text-slate-400">
                                No weekly reports submitted yet.
                            </div>
                        )}
                    </div>
                </div>
            )}

            {tab === 'quarterly' && (
                <div className="mt-4 space-y-3">
                    {quarterlyReviews.map((qr) => (
                        <div
                            key={qr.id}
                            className="rounded-xl border border-slate-200 bg-white p-5"
                        >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                    <span className="font-mono text-xs font-bold text-[#101D35]">
                                        {qr.quarter_label} ({qr.period_range})
                                    </span>
                                    <p className="mt-0.5 text-xs text-slate-600">
                                        {qr.review_focus}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    {qr.score !== null && (
                                        <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-[#101D35]">
                                            Score: {qr.score}/100
                                        </span>
                                    )}
                                    <StatusBadge label={qr.status} />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showNewModal && canManage && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
                    <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <h2 className="text-base font-bold text-[#101D35]">Schedule Meeting</h2>
                            <button
                                type="button"
                                onClick={() => setShowNewModal(false)}
                                className="rounded p-1 text-slate-400"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                newMeetingForm.post('/governance/meetings', {
                                    onSuccess: () => {
                                        newMeetingForm.reset('focus', 'agenda');
                                        setShowNewModal(false);
                                    },
                                });
                            }}
                            className="mt-4 space-y-3"
                        >
                            <select
                                value={newMeetingForm.data.forum_name}
                                onChange={(e) =>
                                    newMeetingForm.setData('forum_name', e.target.value)
                                }
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                            >
                                {forums.map((f) => (
                                    <option key={f.id} value={f.name}>
                                        {f.name}
                                    </option>
                                ))}
                            </select>
                            <input
                                type="text"
                                required
                                value={newMeetingForm.data.focus}
                                onChange={(e) => newMeetingForm.setData('focus', e.target.value)}
                                placeholder="Meeting focus..."
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                            />
                            <div className="grid grid-cols-2 gap-2">
                                <input
                                    type="date"
                                    required
                                    value={newMeetingForm.data.scheduled_date}
                                    onChange={(e) =>
                                        newMeetingForm.setData('scheduled_date', e.target.value)
                                    }
                                    className="rounded-lg border border-slate-200 px-3 py-2 text-xs"
                                />
                                <select
                                    value={newMeetingForm.data.pic_user_id}
                                    onChange={(e) =>
                                        newMeetingForm.setData('pic_user_id', e.target.value)
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
                            <textarea
                                rows={2}
                                value={newMeetingForm.data.agenda}
                                onChange={(e) => newMeetingForm.setData('agenda', e.target.value)}
                                placeholder="H-1 Agenda (optional now, required before completion)"
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                            />
                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowNewModal(false)}
                                    className="rounded-lg border border-slate-200 px-4 py-2 text-xs"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="rounded-lg bg-[#101D35] px-4 py-2 text-xs font-semibold text-white"
                                >
                                    Schedule
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AppShell>
    );
}
