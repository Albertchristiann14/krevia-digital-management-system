import { UserAvatar } from '@/Components/shared/UserAvatar';
import { BarChart3, ClipboardList, Play, Settings2, X } from 'lucide-react';
import { useEffect, useState } from 'react';

export interface OfficeStandupData {
    id: number;
    standup_date: string | null;
    user_id: number;
    user_name: string;
    user_avatar_url: string | null;
    yesterday: string;
    today: string;
    blockers: string | null;
    submitted_human: string | null;
}

interface HeatmapData {
    since: string;
    until: string;
    hours: number[];
    rows: Array<{
        user_id: number;
        name: string;
        hours: Record<number, number>;
        total_sessions: number;
    }>;
}

interface OfficeProductivityModalProps {
    activeModal: 'standup' | 'heatmap' | 'zone_settings' | null;
    standups: OfficeStandupData[];
    selectedZone: {
        id: string;
        zone_id?: number | null;
        name: string;
        capacity: number;
        description: string;
    } | null;
    projects: Array<{ id: number; code: string; name: string }>;
    myUserId: number;
    isAdmin: boolean;
    readXsrfToken: () => string;
    onClose: () => void;
    onStandupsChange: (next: OfficeStandupData[]) => void;
    onToast: (text: string, tone?: 'info' | 'error') => void;
}

export function OfficeProductivityModal({
    activeModal,
    standups,
    selectedZone,
    projects,
    myUserId,
    isAdmin,
    readXsrfToken,
    onClose,
    onStandupsChange,
    onToast,
}: OfficeProductivityModalProps) {
    const myToday = standups.find((s) => s.user_id === myUserId);
    const [yesterday, setYesterday] = useState(myToday?.yesterday ?? '');
    const [today, setToday] = useState(myToday?.today ?? '');
    const [blockers, setBlockers] = useState(myToday?.blockers ?? '');
    const [submitting, setSubmitting] = useState(false);

    const [heatmap, setHeatmap] = useState<HeatmapData | null>(null);

    const [capacity, setCapacity] = useState<number>(selectedZone?.capacity ?? 10);
    const [linkedProjectId, setLinkedProjectId] = useState<string>('');
    const [zoneDesc, setZoneDesc] = useState<string>(selectedZone?.description ?? '');

    useEffect(() => {
        if (activeModal === 'standup') {
            const mine = standups.find((s) => s.user_id === myUserId);
            setYesterday(mine?.yesterday ?? '');
            setToday(mine?.today ?? '');
            setBlockers(mine?.blockers ?? '');
        }
    }, [activeModal, standups, myUserId]);

    useEffect(() => {
        if (activeModal === 'zone_settings' && selectedZone) {
            setCapacity(selectedZone.capacity);
            setZoneDesc(selectedZone.description);
        }
    }, [activeModal, selectedZone]);

    useEffect(() => {
        if (activeModal !== 'heatmap' || !isAdmin) return;
        fetch('/virtual-office/attendance-heatmap', {
            headers: { Accept: 'application/json' },
            credentials: 'same-origin',
        })
            .then((r) => (r.ok ? r.json() : null))
            .then((j) => {
                if (j?.heatmap) setHeatmap(j.heatmap);
            })
            .catch(() => {});
    }, [activeModal, isAdmin]);

    if (!activeModal) return null;

    const handleStartStandup = async () => {
        const res = await fetch('/virtual-office/standups/start', {
            method: 'POST',
            headers: { Accept: 'application/json', 'X-XSRF-TOKEN': readXsrfToken() },
            credentials: 'same-origin',
        });
        if (res.ok) {
            onToast('Sesi Standup Harian dimulai & notifikasi terkirim ke seluruh tim!');
        }
    };

    const handleSubmitStandup = async () => {
        if (!yesterday.trim() || !today.trim() || submitting) return;
        setSubmitting(true);
        try {
            const res = await fetch('/virtual-office/standups', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-XSRF-TOKEN': readXsrfToken(),
                },
                credentials: 'same-origin',
                body: JSON.stringify({
                    yesterday: yesterday.trim(),
                    today: today.trim(),
                    blockers: blockers.trim() || null,
                }),
            });
            const j = await res.json();
            if (res.ok && j.standups) {
                onStandupsChange(j.standups);
                onToast('Standup harian Anda tersimpan.');
            } else {
                onToast(j?.message ?? 'Gagal menyimpan standup.', 'error');
            }
        } finally {
            setSubmitting(false);
        }
    };

    const handleSaveZone = async () => {
        if (!selectedZone?.zone_id || submitting) return;
        setSubmitting(true);
        try {
            const res = await fetch(`/virtual-office/zones/${selectedZone.zone_id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-XSRF-TOKEN': readXsrfToken(),
                },
                credentials: 'same-origin',
                body: JSON.stringify({
                    capacity,
                    linked_project_id: linkedProjectId ? Number(linkedProjectId) : null,
                    description: zoneDesc.trim(),
                }),
            });
            if (res.ok) {
                onToast('Pengaturan zona diperbarui.');
                onClose();
            } else {
                const j = await res.json();
                onToast(j?.message ?? 'Gagal menyimpan pengaturan zona.', 'error');
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm">
            <div className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#0D1628]">
                <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-white/10">
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-[#F4F7FF]">
                        {activeModal === 'standup' && (
                            <>
                                <ClipboardList className="h-4 w-4 text-blue-600" />
                                Standup Harian Tim
                            </>
                        )}
                        {activeModal === 'heatmap' && (
                            <>
                                <BarChart3 className="h-4 w-4 text-emerald-600" />
                                Peta Kehadiran Mingguan (7 Hari Terakhir)
                            </>
                        )}
                        {activeModal === 'zone_settings' && (
                            <>
                                <Settings2 className="h-4 w-4 text-amber-600" />
                                Pengaturan Zona · {selectedZone?.name}
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
                    {activeModal === 'standup' && (
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div className="space-y-2.5 rounded-xl border border-slate-200 p-3 text-xs dark:border-white/10">
                                <div className="flex items-center justify-between">
                                    <p className="font-bold text-slate-800 dark:text-[#F4F7FF]">Isi Standup Hari Ini</p>
                                    {isAdmin && (
                                        <button
                                            type="button"
                                            onClick={handleStartStandup}
                                            className="inline-flex items-center gap-1 rounded-lg bg-purple-600 px-2 py-1 text-[10px] font-semibold text-white hover:bg-purple-700"
                                        >
                                            <Play className="h-2.5 w-2.5" />
                                            Mulai Standup
                                        </button>
                                    )}
                                </div>
                                <div>
                                    <label className="mb-1 block text-[11px] font-medium text-slate-500">
                                        Kemarin dikerjakan *
                                    </label>
                                    <textarea
                                        rows={2}
                                        value={yesterday}
                                        onChange={(e) => setYesterday(e.target.value)}
                                        className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs dark:border-white/10 dark:bg-[#091020] dark:text-[#F4F7FF]"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-[11px] font-medium text-slate-500">
                                        Hari ini fokus *
                                    </label>
                                    <textarea
                                        rows={2}
                                        value={today}
                                        onChange={(e) => setToday(e.target.value)}
                                        className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs dark:border-white/10 dark:bg-[#091020] dark:text-[#F4F7FF]"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-[11px] font-medium text-slate-500">
                                        Kendala / Blocker (opsional)
                                    </label>
                                    <input
                                        type="text"
                                        value={blockers}
                                        onChange={(e) => setBlockers(e.target.value)}
                                        className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs dark:border-white/10 dark:bg-[#091020] dark:text-[#F4F7FF]"
                                    />
                                </div>
                                <button
                                    type="button"
                                    disabled={!yesterday.trim() || !today.trim() || submitting}
                                    onClick={handleSubmitStandup}
                                    className="w-full rounded-lg bg-blue-600 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {submitting ? 'Menyimpan...' : 'Kirim Standup'}
                                </button>
                            </div>

                            <div className="space-y-2">
                                <p className="text-xs font-bold text-slate-800 dark:text-[#F4F7FF]">
                                    Ringkasan Tim ({standups.length})
                                </p>
                                {standups.length === 0 ? (
                                    <p className="rounded-xl border border-dashed border-slate-200 py-8 text-center text-xs text-slate-400 dark:border-white/10">
                                        Belum ada standup masuk hari ini.
                                    </p>
                                ) : (
                                    standups.map((s) => (
                                        <div
                                            key={s.id}
                                            className="rounded-xl border border-slate-200/80 p-2.5 text-xs dark:border-white/10 dark:bg-white/[0.03]"
                                        >
                                            <div className="mb-1 flex items-center gap-2">
                                                <UserAvatar
                                                    name={s.user_name}
                                                    avatarUrl={s.user_avatar_url}
                                                    size="xs"
                                                />
                                                <span className="font-bold text-slate-900 dark:text-[#F4F7FF]">
                                                    {s.user_name}
                                                </span>
                                                <span className="ml-auto text-[10px] text-slate-400">
                                                    {s.submitted_human}
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-slate-600 dark:text-[#A7B4CB]">
                                                <strong className="text-slate-800 dark:text-[#F4F7FF]">Kemarin:</strong>{' '}
                                                {s.yesterday}
                                            </p>
                                            <p className="text-[11px] text-slate-600 dark:text-[#A7B4CB]">
                                                <strong className="text-slate-800 dark:text-[#F4F7FF]">Hari ini:</strong>{' '}
                                                {s.today}
                                            </p>
                                            {s.blockers && (
                                                <p className="text-[11px] text-rose-600 dark:text-rose-400">
                                                    <strong>Kendala:</strong> {s.blockers}
                                                </p>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    {activeModal === 'heatmap' && (
                        <div className="space-y-3 text-xs">
                            {heatmap ? (
                                <>
                                    <p className="text-slate-500 dark:text-[#A7B4CB]">
                                        Periode {heatmap.since} s/d {heatmap.until} (jam 08:00–19:00 WIB)
                                    </p>
                                    <div className="overflow-x-auto">
                                        <table className="w-full border-collapse text-[11px]">
                                            <thead>
                                                <tr className="border-b border-slate-200 dark:border-white/10">
                                                    <th className="py-1.5 text-left font-semibold">Anggota</th>
                                                    {heatmap.hours.map((h) => (
                                                        <th key={h} className="px-1 py-1.5 text-center font-medium">
                                                            {String(h).padStart(2, '0')}
                                                        </th>
                                                    ))}
                                                    <th className="py-1.5 text-right font-semibold">Total</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {heatmap.rows.map((row) => (
                                                    <tr
                                                        key={row.user_id}
                                                        className="border-b border-slate-100 dark:border-white/[0.05]"
                                                    >
                                                        <td className="py-1.5 font-medium text-slate-800 dark:text-[#F4F7FF]">
                                                            {row.name}
                                                        </td>
                                                        {heatmap.hours.map((h) => {
                                                            const count = row.hours[h] ?? 0;
                                                            return (
                                                                <td key={h} className="p-0.5 text-center">
                                                                    <span
                                                                        className={`inline-block h-5 w-5 rounded leading-5 font-semibold ${
                                                                            count === 0
                                                                                ? 'bg-slate-100 text-slate-300 dark:bg-white/[0.04] dark:text-slate-600'
                                                                                : count >= 3
                                                                                  ? 'bg-emerald-600 text-white'
                                                                                  : 'bg-emerald-200 text-emerald-900 dark:bg-emerald-500/40 dark:text-emerald-200'
                                                                        }`}
                                                                    >
                                                                        {count}
                                                                    </span>
                                                                </td>
                                                            );
                                                        })}
                                                        <td className="py-1.5 text-right font-bold">
                                                            {row.total_sessions}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </>
                            ) : (
                                <p className="py-8 text-center text-slate-400">Memuat peta kehadiran...</p>
                            )}
                        </div>
                    )}

                    {activeModal === 'zone_settings' && (
                        <div className="space-y-3 text-xs">
                            <div>
                                <label className="mb-1 block font-medium text-slate-600 dark:text-[#A7B4CB]">
                                    Kapasitas Zona (1–50)
                                </label>
                                <input
                                    type="number"
                                    min={1}
                                    max={50}
                                    value={capacity}
                                    onChange={(e) => setCapacity(Number(e.target.value))}
                                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs dark:border-white/10 dark:bg-[#091020] dark:text-[#F4F7FF]"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block font-medium text-slate-600 dark:text-[#A7B4CB]">
                                    Tautkan Project
                                </label>
                                <select
                                    value={linkedProjectId}
                                    onChange={(e) => setLinkedProjectId(e.target.value)}
                                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs dark:border-white/10 dark:bg-[#091020] dark:text-[#F4F7FF]"
                                >
                                    <option value="">— Tidak ditautkan —</option>
                                    {projects.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {p.code} · {p.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="mb-1 block font-medium text-slate-600 dark:text-[#A7B4CB]">
                                    Deskripsi Zona
                                </label>
                                <textarea
                                    rows={3}
                                    value={zoneDesc}
                                    onChange={(e) => setZoneDesc(e.target.value)}
                                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs dark:border-white/10 dark:bg-[#091020] dark:text-[#F4F7FF]"
                                />
                            </div>
                            <button
                                type="button"
                                disabled={submitting}
                                onClick={handleSaveZone}
                                className="w-full rounded-lg bg-blue-600 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                            >
                                {submitting ? 'Menyimpan...' : 'Simpan Pengaturan Zona'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
