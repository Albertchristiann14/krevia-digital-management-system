import { UserAvatar } from '@/Components/shared/UserAvatar';
import type { VirtualMemberData } from '@/Components/virtual-office/OfficeScene3D';
import {
    Calendar,
    CheckCircle2,
    Clock,
    ExternalLink,
    FileText,
    ListTodo,
    Lock,
    PhoneOff,
    Plus,
    Radio,
    Users,
    Video,
    X,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

export interface OfficeMeetingParticipantData {
    user_id: number;
    name: string;
    avatar_url: string | null;
    rsvp_status: 'pending' | 'accepted' | 'maybe' | 'declined';
    is_in_call: boolean;
    joined_at: string | null;
}

export interface OfficeMeetingActionItemData {
    id: number;
    title: string;
    pic_user_id: number | null;
    pic_name: string | null;
    due_date: string | null;
    status: string;
    linked_task_id: number | null;
    linked_task_code: string | null;
}

export interface OfficeMeetingData {
    id: number;
    code: string;
    forum_name: string;
    focus: string;
    scheduled_date: string | null;
    scheduled_time: string | null;
    duration_minutes: number;
    status: string;
    is_live: boolean;
    is_locked: boolean;
    live_room_code: string | null;
    join_url: string | null;
    started_at: string | null;
    ended_at: string | null;
    pic_user_id: number | null;
    pic_name: string | null;
    started_by: number | null;
    office_zone_id: number | null;
    zone_slug: string;
    zone_name: string;
    project_id: number | null;
    project_name: string | null;
    agenda: string | null;
    minute: {
        summary: string;
        decisions_summary: string | null;
        escalations: string | null;
        recorder_name: string | null;
        submitted_at: string | null;
    } | null;
    participants: OfficeMeetingParticipantData[];
    action_items: OfficeMeetingActionItemData[];
}

export interface OfficeMeetingsPayload {
    live: OfficeMeetingData[];
    upcoming: OfficeMeetingData[];
    recent: OfficeMeetingData[];
}

interface TimelineSlot {
    time: string;
    available: boolean;
    meeting_code: string | null;
    meeting_title: string | null;
}

interface OfficeMeetingPanelProps {
    meetings: OfficeMeetingsPayload;
    zoneId: number | null;
    members: VirtualMemberData[];
    projects: Array<{ id: number; code: string; name: string }>;
    myUserId: number;
    isAdmin: boolean;
    readXsrfToken: () => string;
    onMeetingsChange: (next: OfficeMeetingsPayload) => void;
    onOpenCallModal: (meeting: OfficeMeetingData) => void;
    onToast: (text: string, tone?: 'info' | 'error') => void;
    onPresenceUpdated?: (presence: VirtualMemberData) => void;
}

export function OfficeMeetingPanel({
    meetings,
    zoneId,
    members,
    projects,
    myUserId,
    isAdmin,
    readXsrfToken,
    onMeetingsChange,
    onOpenCallModal,
    onToast,
    onPresenceUpdated,
}: OfficeMeetingPanelProps) {
    const [mode, setMode] = useState<'list' | 'instant' | 'schedule'>('list');
    const [submitting, setSubmitting] = useState(false);

    // Instant meeting form
    const [focus, setFocus] = useState('');
    const [agenda, setAgenda] = useState('');
    const [projectId, setProjectId] = useState<string>('');
    const [isLocked, setIsLocked] = useState(false);
    const [inviteIds, setInviteIds] = useState<number[]>([]);

    // Schedule form extras
    const [scheduledDate, setScheduledDate] = useState(() => new Date().toISOString().slice(0, 10));
    const [scheduledTime, setScheduledTime] = useState('10:00');
    const [durationMinutes, setDurationMinutes] = useState(30);
    const [slots, setSlots] = useState<TimelineSlot[]>([]);

    useEffect(() => {
        if (mode !== 'schedule' || !zoneId || !scheduledDate) return;
        let cancelled = false;
        fetch(`/virtual-office/meetings/slots?date=${encodeURIComponent(scheduledDate)}&zone_id=${zoneId}`, {
            headers: { Accept: 'application/json' },
            credentials: 'same-origin',
        })
            .then((res) => (res.ok ? res.json() : null))
            .then((json) => {
                if (!cancelled && json?.slots) {
                    setSlots(json.slots);
                }
            })
            .catch(() => {});
        return () => {
            cancelled = true;
        };
    }, [mode, zoneId, scheduledDate]);

    const toggleInvite = (uid: number) => {
        setInviteIds((prev) => (prev.includes(uid) ? prev.filter((x) => x !== uid) : [...prev, uid]));
    };

    const handleStartInstant = useCallback(async () => {
        if (!focus.trim() || submitting) return;
        setSubmitting(true);
        try {
            const res = await fetch('/virtual-office/meetings/instant', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-XSRF-TOKEN': readXsrfToken(),
                },
                credentials: 'same-origin',
                body: JSON.stringify({
                    focus: focus.trim(),
                    agenda: agenda.trim() || null,
                    zone_id: zoneId,
                    project_id: projectId ? Number(projectId) : null,
                    is_locked: isLocked,
                    invite_user_ids: inviteIds,
                }),
            });
            const json = await res.json();
            if (!res.ok) {
                const msg =
                    json?.message ||
                    (json?.errors ? Object.values(json.errors).flat().join(' ') : 'Gagal memulai rapat.');
                onToast(String(msg), 'error');
                return;
            }
            if (json.meetings) onMeetingsChange(json.meetings);
            if (json.myPresence && onPresenceUpdated) onPresenceUpdated(json.myPresence);
            setFocus('');
            setAgenda('');
            setInviteIds([]);
            setMode('list');
            if (json.meeting) {
                onOpenCallModal(json.meeting);
            }
        } finally {
            setSubmitting(false);
        }
    }, [
        focus,
        agenda,
        zoneId,
        projectId,
        isLocked,
        inviteIds,
        submitting,
        readXsrfToken,
        onMeetingsChange,
        onPresenceUpdated,
        onOpenCallModal,
        onToast,
    ]);

    const handleSchedule = useCallback(async () => {
        if (!focus.trim() || submitting) return;
        setSubmitting(true);
        try {
            const res = await fetch('/virtual-office/meetings/schedule', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-XSRF-TOKEN': readXsrfToken(),
                },
                credentials: 'same-origin',
                body: JSON.stringify({
                    focus: focus.trim(),
                    scheduled_date: scheduledDate,
                    scheduled_time: scheduledTime,
                    duration_minutes: durationMinutes,
                    zone_id: zoneId,
                    project_id: projectId ? Number(projectId) : null,
                    agenda: agenda.trim() || null,
                    is_locked: isLocked,
                    invite_user_ids: inviteIds,
                }),
            });
            const json = await res.json();
            if (!res.ok) {
                const msg =
                    json?.message ||
                    (json?.errors ? Object.values(json.errors).flat().join(' ') : 'Gagal menjadwalkan rapat.');
                onToast(String(msg), 'error');
                return;
            }
            if (json.meetings) onMeetingsChange(json.meetings);
            setFocus('');
            setAgenda('');
            setInviteIds([]);
            setMode('list');
            onToast('Rapat berhasil dijadwalkan.');
        } finally {
            setSubmitting(false);
        }
    }, [
        focus,
        scheduledDate,
        scheduledTime,
        durationMinutes,
        zoneId,
        projectId,
        agenda,
        isLocked,
        inviteIds,
        submitting,
        readXsrfToken,
        onMeetingsChange,
        onToast,
    ]);

    const joinMeeting = useCallback(
        async (meeting: OfficeMeetingData) => {
            const res = await fetch(`/virtual-office/meetings/${meeting.id}/join`, {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'X-XSRF-TOKEN': readXsrfToken(),
                },
                credentials: 'same-origin',
            });
            const json = await res.json();
            if (!res.ok) {
                const msg =
                    json?.message ||
                    (json?.errors ? Object.values(json.errors).flat().join(' ') : 'Tidak dapat bergabung.');
                onToast(String(msg), 'error');
                return;
            }
            if (json.meetings) onMeetingsChange(json.meetings);
            if (json.myPresence && onPresenceUpdated) onPresenceUpdated(json.myPresence);
            if (json.meeting) onOpenCallModal(json.meeting);
        },
        [readXsrfToken, onMeetingsChange, onPresenceUpdated, onOpenCallModal, onToast],
    );

    const endMeeting = useCallback(
        async (meeting: OfficeMeetingData) => {
            const res = await fetch(`/virtual-office/meetings/${meeting.id}/end`, {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'X-XSRF-TOKEN': readXsrfToken(),
                },
                credentials: 'same-origin',
            });
            const json = await res.json();
            if (!res.ok) {
                onToast(json?.message ?? 'Gagal mengakhiri rapat.', 'error');
                return;
            }
            if (json.meetings) onMeetingsChange(json.meetings);
            onToast('Rapat diakhiri & ringkasan tersimpan.');
        },
        [readXsrfToken, onMeetingsChange, onToast],
    );

    const respondRsvp = useCallback(
        async (meetingId: number, status: 'accepted' | 'maybe' | 'declined') => {
            const res = await fetch(`/virtual-office/meetings/${meetingId}/rsvp`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-XSRF-TOKEN': readXsrfToken(),
                },
                credentials: 'same-origin',
                body: JSON.stringify({ status }),
            });
            const json = await res.json();
            if (res.ok && json.meetings) {
                onMeetingsChange(json.meetings);
            }
        },
        [readXsrfToken, onMeetingsChange],
    );

    if (mode === 'instant' || mode === 'schedule') {
        return (
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-[#F4F7FF]">
                        {mode === 'instant' ? 'Mulai Rapat Instan' : 'Jadwalkan Rapat'}
                    </h4>
                    <button
                        type="button"
                        onClick={() => setMode('list')}
                        className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10"
                    >
                        <X className="h-3.5 w-3.5" />
                    </button>
                </div>

                <div className="space-y-2.5 text-xs">
                    <div>
                        <label className="mb-1 block text-[11px] font-medium text-slate-500 dark:text-[#A7B4CB]">
                            Judul / Topik Rapat *
                        </label>
                        <input
                            type="text"
                            value={focus}
                            onChange={(e) => setFocus(e.target.value)}
                            placeholder="Contoh: Sprint Sync & Review"
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 dark:border-white/10 dark:bg-[#0D1628] dark:text-[#F4F7FF]"
                        />
                    </div>

                    {mode === 'schedule' && (
                        <>
                            <div className="grid grid-cols-3 gap-2">
                                <div>
                                    <label className="mb-1 block text-[10px] font-medium text-slate-500 dark:text-[#A7B4CB]">
                                        Tanggal
                                    </label>
                                    <input
                                        type="date"
                                        value={scheduledDate}
                                        onChange={(e) => setScheduledDate(e.target.value)}
                                        className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] dark:border-white/10 dark:bg-[#0D1628] dark:text-[#F4F7FF]"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-[10px] font-medium text-slate-500 dark:text-[#A7B4CB]">
                                        Jam
                                    </label>
                                    <input
                                        type="time"
                                        value={scheduledTime}
                                        onChange={(e) => setScheduledTime(e.target.value)}
                                        className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] dark:border-white/10 dark:bg-[#0D1628] dark:text-[#F4F7FF]"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-[10px] font-medium text-slate-500 dark:text-[#A7B4CB]">
                                        Durasi
                                    </label>
                                    <select
                                        value={durationMinutes}
                                        onChange={(e) => setDurationMinutes(Number(e.target.value))}
                                        className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] dark:border-white/10 dark:bg-[#0D1628] dark:text-[#F4F7FF]"
                                    >
                                        <option value={30}>30 mnt</option>
                                        <option value={60}>60 mnt</option>
                                        <option value={90}>90 mnt</option>
                                    </select>
                                </div>
                            </div>

                            {slots.length > 0 && (
                                <div>
                                    <p className="mb-1 text-[10px] font-semibold text-slate-500 dark:text-[#A7B4CB]">
                                        Slot 30 Menit ({scheduledDate}):
                                    </p>
                                    <div className="grid grid-cols-4 gap-1">
                                        {slots.slice(0, 16).map((slot) => (
                                            <button
                                                key={slot.time}
                                                type="button"
                                                disabled={!slot.available}
                                                onClick={() => setScheduledTime(slot.time)}
                                                title={
                                                    slot.available
                                                        ? `Pilih ${slot.time}`
                                                        : `Terpakai: ${slot.meeting_title}`
                                                }
                                                className={`rounded px-1.5 py-0.5 text-[10px] font-medium transition ${
                                                    !slot.available
                                                        ? 'cursor-not-allowed bg-rose-100 text-rose-500 line-through dark:bg-rose-500/15 dark:text-rose-300'
                                                        : scheduledTime === slot.time
                                                          ? 'bg-blue-600 text-white'
                                                          : 'bg-slate-100 text-slate-700 hover:bg-blue-50 dark:bg-white/[0.06] dark:text-[#A7B4CB]'
                                                }`}
                                            >
                                                {slot.time}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    <div>
                        <label className="mb-1 block text-[11px] font-medium text-slate-500 dark:text-[#A7B4CB]">
                            Tautkan ke Project (Opsional)
                        </label>
                        <select
                            value={projectId}
                            onChange={(e) => setProjectId(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs dark:border-white/10 dark:bg-[#0D1628] dark:text-[#F4F7FF]"
                        >
                            <option value="">— Tanpa project —</option>
                            {projects.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.code} · {p.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="mb-1 block text-[11px] font-medium text-slate-500 dark:text-[#A7B4CB]">
                            Agenda Singkat
                        </label>
                        <textarea
                            rows={2}
                            value={agenda}
                            onChange={(e) => setAgenda(e.target.value)}
                            placeholder="Poin yang akan dibahas..."
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs dark:border-white/10 dark:bg-[#0D1628] dark:text-[#F4F7FF]"
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-[11px] font-medium text-slate-500 dark:text-[#A7B4CB]">
                            Undang Anggota ({inviteIds.length} dipilih)
                        </label>
                        <div className="max-h-28 space-y-1 overflow-y-auto rounded-xl border border-slate-200/80 p-1.5 dark:border-white/10">
                            {members
                                .filter((m) => m.id !== myUserId)
                                .map((m) => {
                                    const checked = inviteIds.includes(m.id);
                                    return (
                                        <label
                                            key={m.id}
                                            className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1 hover:bg-slate-50 dark:hover:bg-white/[0.04]"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={checked}
                                                onChange={() => toggleInvite(m.id)}
                                                className="rounded border-slate-300 text-blue-600"
                                            />
                                            <span className="truncate text-[11px] font-medium text-slate-800 dark:text-[#F4F7FF]">
                                                {m.name}
                                            </span>
                                        </label>
                                    );
                                })}
                        </div>
                    </div>

                    <label className="flex cursor-pointer items-center gap-2 text-[11px] text-slate-600 dark:text-[#A7B4CB]">
                        <input
                            type="checkbox"
                            checked={isLocked}
                            onChange={(e) => setIsLocked(e.target.checked)}
                            className="rounded border-slate-300 text-blue-600"
                        />
                        <Lock className="h-3 w-3" />
                        Kunci ruangan (hanya peserta diundang)
                    </label>

                    <button
                        type="button"
                        disabled={!focus.trim() || submitting}
                        onClick={mode === 'instant' ? handleStartInstant : handleSchedule}
                        className="w-full rounded-xl bg-blue-600 py-2 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
                    >
                        {submitting
                            ? 'Menyimpan...'
                            : mode === 'instant'
                              ? 'Mulai Rapat Sekarang'
                              : 'Simpan Jadwal Rapat'}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-2">
                <button
                    type="button"
                    onClick={() => setMode('instant')}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-[11px] font-semibold text-white transition hover:bg-blue-700"
                >
                    <Video className="h-3.5 w-3.5" />
                    Mulai Rapat
                </button>
                <button
                    type="button"
                    onClick={() => setMode('schedule')}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.06] dark:text-[#F4F7FF]"
                >
                    <Calendar className="h-3.5 w-3.5" />
                    Jadwalkan
                </button>
            </div>

            {/* LIVE Meetings */}
            {meetings.live.length > 0 && (
                <div className="space-y-2">
                    <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                        <Radio className="h-3.5 w-3.5 animate-pulse" />
                        Sedang LIVE ({meetings.live.length})
                    </p>
                    {meetings.live.map((m) => {
                        const inCallCount = m.participants.filter((p) => p.is_in_call).length;
                        const canEnd =
                            isAdmin || m.pic_user_id === myUserId || m.started_by === myUserId;
                        return (
                            <div
                                key={m.id}
                                className="rounded-xl border border-rose-200 bg-rose-50/70 p-3 dark:border-rose-500/30 dark:bg-rose-500/10"
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-1.5">
                                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-600 px-1.5 py-0.5 text-[9px] font-bold text-white">
                                                <span className="h-1.5 w-1.5 animate-ping rounded-full bg-white" />
                                                LIVE
                                            </span>
                                            <span className="text-[10px] font-semibold text-slate-500 dark:text-[#A7B4CB]">
                                                {m.code}
                                            </span>
                                            {m.is_locked && <Lock className="h-3 w-3 text-amber-600" />}
                                        </div>
                                        <p className="mt-1 truncate text-xs font-bold text-slate-900 dark:text-[#F4F7FF]">
                                            {m.focus}
                                        </p>
                                        <p className="mt-0.5 text-[10px] text-slate-500 dark:text-[#A7B4CB]">
                                            {m.zone_name} · {inCallCount} di panggilan
                                        </p>
                                    </div>
                                </div>
                                <div className="mt-2.5 flex flex-wrap gap-1.5">
                                    <button
                                        type="button"
                                        onClick={() => joinMeeting(m)}
                                        className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg bg-rose-600 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-rose-700"
                                    >
                                        <Video className="h-3 w-3" />
                                        Gabung Rapat
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => onOpenCallModal(m)}
                                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.08] dark:text-[#F4F7FF]"
                                    >
                                        Catatan
                                    </button>
                                    {canEnd && (
                                        <button
                                            type="button"
                                            onClick={() => endMeeting(m)}
                                            className="rounded-lg border border-rose-300 px-2.5 py-1.5 text-[11px] font-semibold text-rose-700 hover:bg-rose-100 dark:border-rose-500/40 dark:text-rose-300"
                                        >
                                            Akhiri
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Upcoming */}
            <div className="space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#A7B4CB]">
                    Jadwal Rapat ({meetings.upcoming.length})
                </p>
                {meetings.upcoming.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-slate-200 px-3 py-4 text-center text-[11px] text-slate-400 dark:border-white/10">
                        Belum ada rapat terjadwal.
                    </p>
                ) : (
                    meetings.upcoming.map((m) => {
                        const myPart = m.participants.find((p) => p.user_id === myUserId);
                        return (
                            <div
                                key={m.id}
                                className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-2.5 dark:border-white/10 dark:bg-white/[0.04]"
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <p className="truncate text-xs font-semibold text-slate-900 dark:text-[#F4F7FF]">
                                            {m.focus}
                                        </p>
                                        <p className="mt-0.5 flex items-center gap-1 text-[10px] text-slate-500 dark:text-[#A7B4CB]">
                                            <Clock className="h-3 w-3" />
                                            {m.scheduled_date} {m.scheduled_time ?? ''} ({m.duration_minutes}m)
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => joinMeeting(m)}
                                        className="shrink-0 rounded-lg bg-blue-600 px-2 py-1 text-[10px] font-semibold text-white hover:bg-blue-700"
                                    >
                                        Mulai
                                    </button>
                                </div>
                                <div className="mt-2 flex items-center gap-1">
                                    {(['accepted', 'maybe', 'declined'] as const).map((st) => (
                                        <button
                                            key={st}
                                            type="button"
                                            onClick={() => respondRsvp(m.id, st)}
                                            className={`rounded-md px-2 py-0.5 text-[10px] font-medium transition ${
                                                myPart?.rsvp_status === st
                                                    ? 'bg-slate-900 text-white dark:bg-blue-600'
                                                    : 'bg-white text-slate-600 hover:bg-slate-100 dark:bg-white/[0.06] dark:text-[#A7B4CB]'
                                            }`}
                                        >
                                            {st === 'accepted' ? 'Hadir' : st === 'maybe' ? 'Mungkin' : 'Tolak'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Recent Completed */}
            {meetings.recent.length > 0 && (
                <div className="space-y-2">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#A7B4CB]">
                        Riwayat Selesai
                    </p>
                    {meetings.recent.slice(0, 4).map((m) => (
                        <button
                            key={m.id}
                            type="button"
                            onClick={() => onOpenCallModal(m)}
                            className="flex w-full items-center justify-between rounded-xl border border-slate-200/70 bg-white px-3 py-2 text-left transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.06]"
                        >
                            <div className="min-w-0">
                                <p className="truncate text-xs font-medium text-slate-800 dark:text-[#F4F7FF]">
                                    {m.focus}
                                </p>
                                <p className="text-[10px] text-slate-400">
                                    {m.code} · {m.action_items.length} action item
                                </p>
                            </div>
                            <FileText className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

interface ActiveMeetingModalProps {
    meeting: OfficeMeetingData | null;
    quickCall: { room_code: string; join_url: string; targetName: string } | null;
    members: VirtualMemberData[];
    myUserId: number;
    readXsrfToken: () => string;
    onClose: () => void;
    onMeetingsChange: (next: OfficeMeetingsPayload) => void;
    onMeetingUpdated: (next: OfficeMeetingData) => void;
    onToast: (text: string, tone?: 'info' | 'error') => void;
}

export function ActiveMeetingModal({
    meeting,
    quickCall,
    members,
    myUserId,
    readXsrfToken,
    onClose,
    onMeetingsChange,
    onMeetingUpdated,
    onToast,
}: ActiveMeetingModalProps) {
    const [showVideo, setShowVideo] = useState(true);
    const [summary, setSummary] = useState(meeting?.minute?.summary ?? '');
    const [decisionsSummary, setDecisionsSummary] = useState(meeting?.minute?.decisions_summary ?? '');
    const [savingNotes, setSavingNotes] = useState(false);

    const [newItemTitle, setNewItemTitle] = useState('');
    const [newItemPicId, setNewItemPicId] = useState<number>(myUserId);
    const [newItemDue, setNewItemDue] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() + 3);
        return d.toISOString().slice(0, 10);
    });
    const [addingItem, setAddingItem] = useState(false);

    useEffect(() => {
        setSummary(meeting?.minute?.summary ?? '');
        setDecisionsSummary(meeting?.minute?.decisions_summary ?? '');
    }, [meeting?.id, meeting?.minute?.summary, meeting?.minute?.decisions_summary]);

    if (!meeting && !quickCall) return null;

    const roomCode = meeting?.live_room_code ?? quickCall?.room_code ?? '';
    const joinUrl = meeting?.join_url ?? quickCall?.join_url ?? '';
    const title = meeting ? `${meeting.code} · ${meeting.focus}` : `Panggilan dengan ${quickCall?.targetName}`;

    const handleLeaveCall = async () => {
        if (meeting) {
            await fetch(`/virtual-office/meetings/${meeting.id}/leave`, {
                method: 'POST',
                headers: { Accept: 'application/json', 'X-XSRF-TOKEN': readXsrfToken() },
                credentials: 'same-origin',
            }).then(async (res) => {
                if (res.ok) {
                    const j = await res.json();
                    if (j.meetings) onMeetingsChange(j.meetings);
                }
            });
        }
        onClose();
    };

    const handleSaveNotes = async () => {
        if (!meeting || !summary.trim() || savingNotes) return;
        setSavingNotes(true);
        try {
            const res = await fetch(`/virtual-office/meetings/${meeting.id}/notes`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-XSRF-TOKEN': readXsrfToken(),
                },
                credentials: 'same-origin',
                body: JSON.stringify({
                    summary: summary.trim(),
                    decisions_summary: decisionsSummary.trim() || null,
                }),
            });
            const j = await res.json();
            if (res.ok) {
                if (j.meeting) onMeetingUpdated(j.meeting);
                if (j.meetings) onMeetingsChange(j.meetings);
                onToast('Catatan rapat tersimpan.');
            } else {
                onToast(j?.message ?? 'Gagal menyimpan catatan.', 'error');
            }
        } finally {
            setSavingNotes(false);
        }
    };

    const handleAddActionItem = async () => {
        if (!meeting || !newItemTitle.trim() || addingItem) return;
        setAddingItem(true);
        try {
            const res = await fetch(`/virtual-office/meetings/${meeting.id}/action-items`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-XSRF-TOKEN': readXsrfToken(),
                },
                credentials: 'same-origin',
                body: JSON.stringify({
                    title: newItemTitle.trim(),
                    pic_user_id: newItemPicId,
                    due_date: newItemDue,
                }),
            });
            const j = await res.json();
            if (res.ok) {
                setNewItemTitle('');
                if (j.meeting) onMeetingUpdated(j.meeting);
                if (j.meetings) onMeetingsChange(j.meetings);
            }
        } finally {
            setAddingItem(false);
        }
    };

    const handleConvertToTask = async (actionItemId: number) => {
        const res = await fetch(`/virtual-office/action-items/${actionItemId}/convert-task`, {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'X-XSRF-TOKEN': readXsrfToken(),
            },
            credentials: 'same-origin',
        });
        const j = await res.json();
        if (res.ok) {
            if (j.meeting) onMeetingUpdated(j.meeting);
            if (j.meetings) onMeetingsChange(j.meetings);
            onToast(`Task ${j.task?.code ?? ''} berhasil dibuat di Task Tracker!`);
        } else {
            onToast(j?.message ?? 'Gagal membuat task.', 'error');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
            <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#0D1628]">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-white/10">
                    <div className="flex items-center gap-2">
                        {meeting?.is_live && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-bold text-white">
                                LIVE
                            </span>
                        )}
                        <h3 className="text-sm font-bold text-slate-900 dark:text-[#F4F7FF]">{title}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                        {joinUrl && (
                            <a
                                href={joinUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-[#A7B4CB]"
                            >
                                <ExternalLink className="h-3.5 w-3.5" />
                                Buka di Tab Baru
                            </a>
                        )}
                        <button
                            type="button"
                            onClick={() => setShowVideo((v) => !v)}
                            className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-[#A7B4CB]"
                        >
                            {showVideo ? 'Sembunyikan Video' : 'Tampilkan Video'}
                        </button>
                        <button
                            type="button"
                            onClick={handleLeaveCall}
                            className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-3 py-1 text-xs font-semibold text-white hover:bg-rose-700"
                        >
                            <PhoneOff className="h-3.5 w-3.5" />
                            Keluar
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="grid flex-1 grid-cols-1 overflow-y-auto lg:grid-cols-12">
                    {/* Left: Jitsi Video */}
                    {showVideo && roomCode && (
                        <div className="min-h-[340px] border-b border-slate-200 bg-slate-950 lg:col-span-7 lg:border-r lg:border-b-0 dark:border-white/10">
                            <iframe
                                title="Krevia Virtual Office Video Call"
                                src={`https://meet.jit.si/${encodeURIComponent(roomCode)}#config.prejoinPageEnabled=false`}
                                allow="camera; microphone; fullscreen; display-capture; autoplay"
                                className="h-full min-h-[380px] w-full border-0"
                            />
                        </div>
                    )}

                    {/* Right: Notes, Participants & Action Items */}
                    <div
                        className={`space-y-4 overflow-y-auto p-4 ${
                            showVideo && roomCode ? 'lg:col-span-5' : 'lg:col-span-12'
                        }`}
                    >
                        {meeting ? (
                            <>
                                {/* Live Participants */}
                                <div>
                                    <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#A7B4CB]">
                                        <Users className="h-3.5 w-3.5" />
                                        Peserta ({meeting.participants.length})
                                    </p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {meeting.participants.map((p) => (
                                            <span
                                                key={p.user_id}
                                                className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] ${
                                                    p.is_in_call
                                                        ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-300'
                                                        : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-[#A7B4CB]'
                                                }`}
                                            >
                                                <UserAvatar name={p.name} avatarUrl={p.avatar_url} size="xs" />
                                                {p.name}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                {/* Collaborative Notes */}
                                <div className="space-y-2 rounded-xl border border-slate-200 p-3 dark:border-white/10">
                                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-[#F4F7FF]">
                                        Catatan Rapat Bersama
                                    </p>
                                    <textarea
                                        rows={3}
                                        value={summary}
                                        onChange={(e) => setSummary(e.target.value)}
                                        placeholder="Ringkasan pembahasan rapat..."
                                        className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs dark:border-white/10 dark:bg-[#091020] dark:text-[#F4F7FF]"
                                    />
                                    <textarea
                                        rows={2}
                                        value={decisionsSummary}
                                        onChange={(e) => setDecisionsSummary(e.target.value)}
                                        placeholder="Keputusan penting (opsional)..."
                                        className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs dark:border-white/10 dark:bg-[#091020] dark:text-[#F4F7FF]"
                                    />
                                    <button
                                        type="button"
                                        disabled={!summary.trim() || savingNotes}
                                        onClick={handleSaveNotes}
                                        className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                                    >
                                        {savingNotes ? 'Menyimpan...' : 'Simpan Catatan'}
                                    </button>
                                </div>

                                {/* Action Items -> 1-Click Task */}
                                <div className="space-y-2 rounded-xl border border-slate-200 p-3 dark:border-white/10">
                                    <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-[#F4F7FF]">
                                        <ListTodo className="h-3.5 w-3.5" />
                                        Action Items ({meeting.action_items.length})
                                    </p>

                                    <div className="space-y-1.5">
                                        {meeting.action_items.map((item) => (
                                            <div
                                                key={item.id}
                                                className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs dark:bg-white/[0.04]"
                                            >
                                                <div className="min-w-0">
                                                    <p className="truncate font-medium text-slate-800 dark:text-[#F4F7FF]">
                                                        {item.title}
                                                    </p>
                                                    <p className="text-[10px] text-slate-500 dark:text-[#A7B4CB]">
                                                        PIC: {item.pic_name ?? '—'} · Due: {item.due_date ?? '—'}
                                                    </p>
                                                </div>
                                                {item.linked_task_code ? (
                                                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                                                        <CheckCircle2 className="h-3 w-3" />
                                                        {item.linked_task_code}
                                                    </span>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleConvertToTask(item.id)}
                                                        className="shrink-0 rounded-lg bg-slate-900 px-2 py-1 text-[10px] font-semibold text-white hover:bg-blue-600 dark:bg-blue-600"
                                                    >
                                                        + Jadi Task
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Add action item */}
                                    <div className="space-y-1.5 pt-1">
                                        <input
                                            type="text"
                                            value={newItemTitle}
                                            onChange={(e) => setNewItemTitle(e.target.value)}
                                            placeholder="Tambah action item baru..."
                                            className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs dark:border-white/10 dark:bg-[#091020] dark:text-[#F4F7FF]"
                                        />
                                        <div className="flex gap-1.5">
                                            <select
                                                value={newItemPicId}
                                                onChange={(e) => setNewItemPicId(Number(e.target.value))}
                                                className="flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] dark:border-white/10 dark:bg-[#091020] dark:text-[#F4F7FF]"
                                            >
                                                {members.map((m) => (
                                                    <option key={m.id} value={m.id}>
                                                        {m.name}
                                                    </option>
                                                ))}
                                            </select>
                                            <input
                                                type="date"
                                                value={newItemDue}
                                                onChange={(e) => setNewItemDue(e.target.value)}
                                                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] dark:border-white/10 dark:bg-[#091020] dark:text-[#F4F7FF]"
                                            />
                                            <button
                                                type="button"
                                                disabled={!newItemTitle.trim() || addingItem}
                                                onClick={handleAddActionItem}
                                                className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                                            >
                                                <Plus className="h-3 w-3" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <p className="text-xs text-slate-500 dark:text-[#A7B4CB]">
                                Undangan panggilan telah dikirim ke DM {quickCall?.targetName}.
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
