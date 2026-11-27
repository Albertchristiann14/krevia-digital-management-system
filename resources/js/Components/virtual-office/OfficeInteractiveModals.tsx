import type { VirtualMemberData } from '@/Components/virtual-office/OfficeScene3D';
import { Link } from '@inertiajs/react';
import { Coffee, ExternalLink, Kanban, UserCheck, UserPlus, X } from 'lucide-react';
import { useEffect, useState } from 'react';

export interface OfficeVisitorData {
    id: number;
    name: string;
    company_name: string | null;
    company_id: number | null;
    contact_id: number | null;
    purpose: string;
    host_user_id: number;
    host_name: string;
    zone_id: number | null;
    zone_slug: string;
    zone_name: string;
    status: 'waiting' | 'admitted' | 'delayed' | 'checked_out' | 'expired';
    host_note: string | null;
    checked_in_human: string | null;
}

export interface CrmQuickOptions {
    companies: Array<{ id: number; name: string; industry?: string | null }>;
    contacts: Array<{ id: number; company_id: number | null; company_name?: string | null; name: string }>;
}

interface OfficeInteractiveModalsProps {
    activeModal: 'reception' | 'project_board' | 'coffee_machine' | null;
    visitors: OfficeVisitorData[];
    crmOptions: CrmQuickOptions;
    members: VirtualMemberData[];
    myUserId: number;
    isAdmin: boolean;
    readXsrfToken: () => string;
    onClose: () => void;
    onVisitorsChange: (next: OfficeVisitorData[]) => void;
    onPresenceUpdated: (next: VirtualMemberData) => void;
    onToast: (text: string, tone?: 'info' | 'error') => void;
}

export function OfficeInteractiveModals({
    activeModal,
    visitors,
    crmOptions,
    members,
    myUserId,
    isAdmin,
    readXsrfToken,
    onClose,
    onVisitorsChange,
    onPresenceUpdated,
    onToast,
}: OfficeInteractiveModalsProps) {
    // Visitor check-in state
    const [vName, setVName] = useState('');
    const [vCompanyId, setVCompanyId] = useState('');
    const [vCompanyName, setVCompanyName] = useState('');
    const [vPurpose, setVPurpose] = useState('');
    const [vHostId, setVHostId] = useState<number>(myUserId);
    const [submitting, setSubmitting] = useState(false);

    // Project Kanban state
    const [kanbanProjectId, setKanbanProjectId] = useState<string>('');
    const [kanbanData, setKanbanData] = useState<{
        can_view: boolean;
        selected_project: { id: number; code: string; name: string; progress_pct: number } | null;
        projects: Array<{ id: number; code: string; name: string }>;
        columns: Record<'todo' | 'in_progress' | 'review' | 'done', Array<{
            id: number;
            code: string;
            title: string;
            priority: string;
            pic_name: string;
            deadline: string | null;
        }>>;
    } | null>(null);

    // Coffee invite state
    const [coffeeTargetId, setCoffeeTargetId] = useState<number>(() => {
        const other = members.find((m) => m.id !== myUserId && m.status_key !== 'offline');
        return other?.id ?? 0;
    });
    const [coffeeNote, setCoffeeNote] = useState('');

    useEffect(() => {
        if (activeModal !== 'project_board') return;
        const url = kanbanProjectId
            ? `/virtual-office/project-kanban?project_id=${kanbanProjectId}`
            : '/virtual-office/project-kanban';
        fetch(url, { headers: { Accept: 'application/json' }, credentials: 'same-origin' })
            .then((r) => (r.ok ? r.json() : null))
            .then((j) => {
                if (j?.kanban) setKanbanData(j.kanban);
            })
            .catch(() => {});
    }, [activeModal, kanbanProjectId]);

    if (!activeModal) return null;

    const handleCheckIn = async () => {
        if (!vName.trim() || !vPurpose.trim() || submitting) return;
        setSubmitting(true);
        try {
            const res = await fetch('/virtual-office/visitors', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-XSRF-TOKEN': readXsrfToken(),
                },
                credentials: 'same-origin',
                body: JSON.stringify({
                    name: vName.trim(),
                    company_id: vCompanyId ? Number(vCompanyId) : null,
                    company_name: vCompanyName.trim() || null,
                    purpose: vPurpose.trim(),
                    host_user_id: vHostId,
                }),
            });
            const j = await res.json();
            if (!res.ok) {
                onToast(j?.message ?? 'Gagal check-in tamu.', 'error');
                return;
            }
            if (j.visitors) onVisitorsChange(j.visitors);
            setVName('');
            setVCompanyId('');
            setVCompanyName('');
            setVPurpose('');
            onToast('Tamu berhasil check-in & host telah dinotifikasi.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleRespondVisitor = async (visitorId: number, action: 'admit' | 'delay' | 'checkout') => {
        const res = await fetch(`/virtual-office/visitors/${visitorId}/respond`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                'X-XSRF-TOKEN': readXsrfToken(),
            },
            credentials: 'same-origin',
            body: JSON.stringify({ action }),
        });
        const j = await res.json();
        if (res.ok && j.visitors) {
            onVisitorsChange(j.visitors);
            onToast(
                action === 'admit'
                    ? 'Tamu diterima masuk.'
                    : action === 'delay'
                      ? 'Status tamu ditunda.'
                      : 'Tamu telah check-out.',
            );
        } else {
            onToast(j?.message ?? 'Gagal memperbarui status tamu.', 'error');
        }
    };

    const handleInviteCoffee = async () => {
        if (!coffeeTargetId || submitting) return;
        setSubmitting(true);
        try {
            const res = await fetch(`/virtual-office/coffee/${coffeeTargetId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-XSRF-TOKEN': readXsrfToken(),
                },
                credentials: 'same-origin',
                body: JSON.stringify({ note: coffeeNote.trim() || null }),
            });
            if (res.ok) {
                setCoffeeNote('');
                onToast('Undangan ngopi terkirim lewat DM!');
                onClose();
            } else {
                const j = await res.json();
                onToast(j?.message ?? 'Gagal mengirim undangan.', 'error');
            }
        } finally {
            setSubmitting(false);
        }
    };

    const handleBreakTime = async () => {
        const res = await fetch('/virtual-office/break-time', {
            method: 'POST',
            headers: { Accept: 'application/json', 'X-XSRF-TOKEN': readXsrfToken() },
            credentials: 'same-origin',
        });
        const j = await res.json();
        if (res.ok && j.myPresence) {
            onPresenceUpdated(j.myPresence);
            onToast('Break Time (15m) aktif — posisi pindah ke Lounge.');
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm">
            <div className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#0D1628]">
                <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-white/10">
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-[#F4F7FF]">
                        {activeModal === 'reception' && (
                            <>
                                <UserPlus className="h-4 w-4 text-teal-600" />
                                Reception Desk · Check-in Tamu & Klien (CRM)
                            </>
                        )}
                        {activeModal === 'project_board' && (
                            <>
                                <Kanban className="h-4 w-4 text-amber-600" />
                                Project Room Whiteboard · Live Kanban
                            </>
                        )}
                        {activeModal === 'coffee_machine' && (
                            <>
                                <Coffee className="h-4 w-4 text-emerald-600" />
                                Lounge Pantry · Ajak Ngopi & Break Time
                            </>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                    {activeModal === 'reception' && (
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div className="space-y-2.5 rounded-xl border border-slate-200 p-3 text-xs dark:border-white/10">
                                <p className="font-bold text-slate-800 dark:text-[#F4F7FF]">Check-in Tamu Baru</p>
                                <input
                                    type="text"
                                    value={vName}
                                    onChange={(e) => setVName(e.target.value)}
                                    placeholder="Nama Tamu *"
                                    className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs dark:border-white/10 dark:bg-[#091020] dark:text-[#F4F7FF]"
                                />
                                <select
                                    value={vCompanyId}
                                    onChange={(e) => setVCompanyId(e.target.value)}
                                    className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs dark:border-white/10 dark:bg-[#091020] dark:text-[#F4F7FF]"
                                >
                                    <option value="">— Pilih Perusahaan CRM (Opsional) —</option>
                                    {crmOptions.companies.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.name}
                                        </option>
                                    ))}
                                </select>
                                {!vCompanyId && (
                                    <input
                                        type="text"
                                        value={vCompanyName}
                                        onChange={(e) => setVCompanyName(e.target.value)}
                                        placeholder="Atau ketik nama perusahaan"
                                        className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs dark:border-white/10 dark:bg-[#091020] dark:text-[#F4F7FF]"
                                    />
                                )}
                                <input
                                    type="text"
                                    value={vPurpose}
                                    onChange={(e) => setVPurpose(e.target.value)}
                                    placeholder="Tujuan kunjungan *"
                                    className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs dark:border-white/10 dark:bg-[#091020] dark:text-[#F4F7FF]"
                                />
                                <select
                                    value={vHostId}
                                    onChange={(e) => setVHostId(Number(e.target.value))}
                                    className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs dark:border-white/10 dark:bg-[#091020] dark:text-[#F4F7FF]"
                                >
                                    {members.map((m) => (
                                        <option key={m.id} value={m.id}>
                                            Host: {m.name}
                                        </option>
                                    ))}
                                </select>
                                <button
                                    type="button"
                                    disabled={!vName.trim() || !vPurpose.trim() || submitting}
                                    onClick={handleCheckIn}
                                    className="w-full rounded-lg bg-teal-600 py-2 text-xs font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
                                >
                                    {submitting ? 'Memproses...' : 'Check-in Tamu'}
                                </button>
                            </div>

                            <div className="space-y-2">
                                <p className="text-xs font-bold text-slate-800 dark:text-[#F4F7FF]">
                                    Daftar Tamu Aktif ({visitors.length})
                                </p>
                                {visitors.length === 0 ? (
                                    <p className="rounded-xl border border-dashed border-slate-200 py-8 text-center text-xs text-slate-400 dark:border-white/10">
                                        Belum ada tamu menunggu hari ini.
                                    </p>
                                ) : (
                                    visitors.map((v) => {
                                        const canRespond = isAdmin || v.host_user_id === myUserId;
                                        return (
                                            <div
                                                key={v.id}
                                                className="rounded-xl border border-slate-200/80 p-2.5 text-xs dark:border-white/10 dark:bg-white/[0.03]"
                                            >
                                                <div className="flex items-start justify-between gap-2">
                                                    <div>
                                                        <p className="font-bold text-slate-900 dark:text-[#F4F7FF]">
                                                            {v.name}{' '}
                                                            {v.company_name && (
                                                                <span className="font-normal text-slate-500">
                                                                    · {v.company_name}
                                                                </span>
                                                            )}
                                                        </p>
                                                        <p className="text-[11px] text-slate-500 dark:text-[#A7B4CB]">
                                                            {v.purpose} · Host: {v.host_name}
                                                        </p>
                                                    </div>
                                                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-500/20 dark:text-amber-300">
                                                        {v.status}
                                                    </span>
                                                </div>
                                                {canRespond && (
                                                    <div className="mt-2 flex gap-1.5">
                                                        {v.status !== 'admitted' && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRespondVisitor(v.id, 'admit')}
                                                                className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2 py-1 text-[10px] font-semibold text-white"
                                                            >
                                                                <UserCheck className="h-3 w-3" />
                                                                Terima
                                                            </button>
                                                        )}
                                                        {v.status === 'waiting' && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRespondVisitor(v.id, 'delay')}
                                                                className="rounded-lg border border-slate-200 px-2 py-1 text-[10px] font-semibold text-slate-700 dark:border-white/10 dark:text-[#A7B4CB]"
                                                            >
                                                                Tunda
                                                            </button>
                                                        )}
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRespondVisitor(v.id, 'checkout')}
                                                            className="rounded-lg border border-rose-200 px-2 py-1 text-[10px] font-semibold text-rose-700 dark:border-rose-500/30 dark:text-rose-300"
                                                        >
                                                            Check-out
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    )}

                    {activeModal === 'project_board' && (
                        <div className="space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <select
                                    value={kanbanProjectId}
                                    onChange={(e) => setKanbanProjectId(e.target.value)}
                                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs dark:border-white/10 dark:bg-[#091020] dark:text-[#F4F7FF]"
                                >
                                    <option value="">Semua / Project Aktif Pertama</option>
                                    {kanbanData?.projects.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {p.code} · {p.name}
                                        </option>
                                    ))}
                                </select>
                                {kanbanData?.selected_project && (
                                    <Link
                                        href={`/projects/${kanbanData.selected_project.id}`}
                                        className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline"
                                    >
                                        Buka Project ({kanbanData.selected_project.progress_pct}%)
                                        <ExternalLink className="h-3 w-3" />
                                    </Link>
                                )}
                            </div>

                            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                                {(
                                    [
                                        ['todo', 'To Do'],
                                        ['in_progress', 'In Progress'],
                                        ['review', 'Review'],
                                        ['done', 'Done'],
                                    ] as const
                                ).map(([key, label]) => {
                                    const items = kanbanData?.columns[key] ?? [];
                                    return (
                                        <div
                                            key={key}
                                            className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-2.5 dark:border-white/10 dark:bg-white/[0.03]"
                                        >
                                            <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-[#A7B4CB]">
                                                {label} ({items.length})
                                            </p>
                                            <div className="space-y-1.5">
                                                {items.slice(0, 6).map((t) => (
                                                    <Link
                                                        key={t.id}
                                                        href={`/tasks/${t.id}`}
                                                        className="block rounded-lg border border-slate-200 bg-white p-2 text-xs transition hover:border-blue-400 dark:border-white/10 dark:bg-[#0D1628]"
                                                    >
                                                        <p className="font-semibold text-slate-900 dark:text-[#F4F7FF]">
                                                            {t.code} · {t.title}
                                                        </p>
                                                        <p className="mt-0.5 text-[10px] text-slate-500">
                                                            {t.pic_name} {t.deadline ? `· ${t.deadline}` : ''}
                                                        </p>
                                                    </Link>
                                                ))}
                                                {items.length === 0 && (
                                                    <p className="py-3 text-center text-[10px] text-slate-400">
                                                        Kosong
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {activeModal === 'coffee_machine' && (
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div className="space-y-3 rounded-xl border border-slate-200 p-3 text-xs dark:border-white/10">
                                <p className="font-bold text-slate-800 dark:text-[#F4F7FF]">
                                    Ajak Rekan Ngopi di Lounge
                                </p>
                                <select
                                    value={coffeeTargetId}
                                    onChange={(e) => setCoffeeTargetId(Number(e.target.value))}
                                    className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs dark:border-white/10 dark:bg-[#091020] dark:text-[#F4F7FF]"
                                >
                                    {members
                                        .filter((m) => m.id !== myUserId)
                                        .map((m) => (
                                            <option key={m.id} value={m.id}>
                                                {m.name} ({m.status})
                                            </option>
                                        ))}
                                </select>
                                <input
                                    type="text"
                                    value={coffeeNote}
                                    onChange={(e) => setCoffeeNote(e.target.value)}
                                    placeholder="Pesan santai (opsional)..."
                                    className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs dark:border-white/10 dark:bg-[#091020] dark:text-[#F4F7FF]"
                                />
                                <button
                                    type="button"
                                    disabled={!coffeeTargetId || submitting}
                                    onClick={handleInviteCoffee}
                                    className="w-full rounded-lg bg-emerald-600 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                                >
                                    Kirim Ajakan Ngopi
                                </button>
                            </div>

                            <div className="flex flex-col justify-between rounded-xl border border-slate-200 p-3 text-xs dark:border-white/10">
                                <div>
                                    <p className="font-bold text-slate-800 dark:text-[#F4F7FF]">Mode Istirahat</p>
                                    <p className="mt-1 text-slate-500 dark:text-[#A7B4CB]">
                                        Aktifkan status Break Time (15 menit) dan pindahkan avatar Anda ke Lounge Area.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleBreakTime}
                                    className="mt-4 w-full rounded-lg bg-amber-600 py-2 text-xs font-semibold text-white hover:bg-amber-700"
                                >
                                    ☕ Mulai Break Time (15m)
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
