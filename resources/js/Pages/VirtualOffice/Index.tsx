import { UserAvatar } from '@/Components/shared/UserAvatar';
import type {
    CameraCommand,
    VirtualMemberData,
    VirtualRoomData,
} from '@/Components/virtual-office/OfficeScene3D';
import { AppShell } from '@/Layouts/AppShell';
import { createReverbEcho, type ReverbClientConfig } from '@/lib/echo';
import { useResolvedTheme } from '@/lib/theme';
import type { PageProps } from '@/types';
import { Head, Link } from '@inertiajs/react';
import {
    ArrowUpRight,
    Box,
    Compass,
    Eye,
    EyeOff,
    Layers,
    Map,
    Maximize2,
    Minimize2,
    Radio,
    RotateCcw,
    Tag,
    Users,
    Wifi,
    WifiOff,
    X,
    ZoomIn,
    ZoomOut,
} from 'lucide-react';
import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';

const OfficeScene3D = lazy(() => import('@/Components/virtual-office/OfficeScene3D'));

interface VirtualOfficeProps extends PageProps {
    rooms: VirtualRoomData[];
    members: VirtualMemberData[];
    myPresence: VirtualMemberData;
    reverbConfig: ReverbClientConfig;
    recentAnnouncements: Array<{
        id: number;
        code: string;
        title: string;
        priority: string;
        published_at: string | null;
    }>;
}

const STATUS_DOT: Record<string, string> = {
    Online: 'bg-emerald-500',
    Available: 'bg-blue-500',
    Busy: 'bg-rose-500',
    Dnd: 'bg-purple-500',
    Away: 'bg-amber-500',
    Offline: 'bg-slate-400',
};

const STATUS_OPTIONS = [
    { key: 'online', label: 'Online', dot: 'bg-emerald-500' },
    { key: 'available', label: 'Available', dot: 'bg-blue-500' },
    { key: 'busy', label: 'Busy', dot: 'bg-rose-500' },
    { key: 'dnd', label: 'Do Not Disturb', dot: 'bg-purple-500' },
    { key: 'away', label: 'Away', dot: 'bg-amber-500' },
    { key: 'offline', label: 'Offline', dot: 'bg-slate-400' },
] as const;

function readXsrfToken(): string {
    if (typeof document === 'undefined') return '';
    const match = document.cookie.split('; ').find((row) => row.startsWith('XSRF-TOKEN='));
    return match ? decodeURIComponent(match.split('=')[1]) : '';
}

export default function VirtualOfficeIndex({
    rooms,
    members: initialMembers,
    myPresence: initialMyPresence,
    reverbConfig,
    recentAnnouncements,
}: VirtualOfficeProps) {
    const resolvedTheme = useResolvedTheme();
    const stageRef = useRef<HTMLDivElement | null>(null);
    const lastActivityRef = useRef<number>(Date.now());
    const [members, setMembers] = useState<VirtualMemberData[]>(initialMembers);
    const [myPresence, setMyPresence] = useState<VirtualMemberData>(initialMyPresence);
    const [wsState, setWsState] = useState<'connected' | 'reconnecting' | 'standby'>(
        reverbConfig.enabled ? 'reconnecting' : 'standby',
    );
    const [showStatusMenu, setShowStatusMenu] = useState(false);
    const [customText, setCustomText] = useState(initialMyPresence?.custom_status_text ?? '');
    const [customEmoji, setCustomEmoji] = useState(initialMyPresence?.custom_status_emoji ?? '💻');
    const [savingStatus, setSavingStatus] = useState(false);
    const [selectedRoomId, setSelectedRoomId] = useState<string | null>(
        initialMyPresence?.zone || 'workspace',
    );
    const [focusedMemberId, setFocusedMemberId] = useState<number | null>(null);
    const [hoveredMember, setHoveredMember] = useState<{
        member: VirtualMemberData;
        pos: { x: number; y: number };
    } | null>(null);
    const [cameraCommand, setCameraCommand] = useState<CameraCommand | null>(null);
    const [showLabels, setShowLabels] = useState(true);
    const [showMembers, setShowMembers] = useState(true);
    const [showMiniMap, setShowMiniMap] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [webglFailed, setWebglFailed] = useState(false);

    // Track actual user interaction for 5-minute auto-away
    useEffect(() => {
        const markActive = () => {
            lastActivityRef.current = Date.now();
        };
        window.addEventListener('mousemove', markActive, { passive: true });
        window.addEventListener('keydown', markActive, { passive: true });
        window.addEventListener('pointerdown', markActive, { passive: true });
        return () => {
            window.removeEventListener('mousemove', markActive);
            window.removeEventListener('keydown', markActive);
            window.removeEventListener('pointerdown', markActive);
        };
    }, []);

    // Live Reverb WebSocket subscription + reconnect resync
    useEffect(() => {
        const echo = createReverbEcho(reverbConfig);
        if (!echo) {
            setWsState('standby');
            return;
        }

        const connector = (echo.connector as unknown as {
            pusher?: {
                connection?: {
                    bind: (event: string, cb: () => void) => void;
                };
            };
        });

        const resyncSnapshot = async () => {
            try {
                const res = await fetch('/virtual-office/presence/snapshot', {
                    headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                });
                if (res.ok) {
                    const data = await res.json();
                    if (Array.isArray(data.members)) setMembers(data.members);
                }
            } catch {
                // ignore transient network errors
            }
        };

        connector.pusher?.connection?.bind('connected', () => {
            setWsState('connected');
            resyncSnapshot();
        });
        connector.pusher?.connection?.bind('connecting', () => setWsState('reconnecting'));
        connector.pusher?.connection?.bind('unavailable', () => setWsState('reconnecting'));
        connector.pusher?.connection?.bind('disconnected', () => setWsState('reconnecting'));

        echo.join('office.presence').listen(
            '.presence.updated',
            (payload: { presence?: VirtualMemberData }) => {
                const updated = payload.presence;
                if (!updated) return;
                setMembers((prev) => {
                    const exists = prev.some((m) => m.id === updated.id);
                    return exists
                        ? prev.map((m) => (m.id === updated.id ? { ...m, ...updated } : m))
                        : [...prev, updated];
                });
                if (updated.id === myPresence.id) {
                    setMyPresence((prev) => ({ ...prev, ...updated }));
                }
            },
        );

        return () => {
            echo.leave('office.presence');
            echo.disconnect();
        };
    }, [reverbConfig, myPresence.id]);

    // 30-second actual heartbeat + clean disconnect on page unload
    useEffect(() => {
        const sendHeartbeat = async () => {
            const hasActivity = Date.now() - lastActivityRef.current < 300_000;
            try {
                const res = await fetch('/virtual-office/presence/heartbeat', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                        'X-XSRF-TOKEN': readXsrfToken(),
                    },
                    body: JSON.stringify({ has_activity: hasActivity }),
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data.myPresence) setMyPresence(data.myPresence);
                    if (Array.isArray(data.members)) setMembers(data.members);
                }
            } catch {
                // handled on next heartbeat or reconnect
            }
        };

        const timer = window.setInterval(sendHeartbeat, 30_000);

        const handleUnload = () => {
            fetch('/virtual-office/presence/disconnect', {
                method: 'POST',
                keepalive: true,
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-XSRF-TOKEN': readXsrfToken(),
                },
                body: '{}',
            }).catch(() => {});
        };
        window.addEventListener('pagehide', handleUnload);

        return () => {
            window.clearInterval(timer);
            window.removeEventListener('pagehide', handleUnload);
        };
    }, []);

    const updateMyStatus = async (payload: {
        status?: string;
        custom_status_text?: string | null;
        custom_status_emoji?: string | null;
        expires_in?: string;
        zone_slug?: string;
    }) => {
        setSavingStatus(true);
        const prevPresence = myPresence;
        try {
            const res = await fetch('/virtual-office/presence', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-XSRF-TOKEN': readXsrfToken(),
                },
                body: JSON.stringify(payload),
            });
            if (res.ok) {
                const data = await res.json();
                if (data.myPresence) setMyPresence(data.myPresence);
                if (Array.isArray(data.members)) setMembers(data.members);
            } else {
                setMyPresence(prevPresence);
            }
        } catch {
            setMyPresence(prevPresence);
        } finally {
            setSavingStatus(false);
        }
    };

    const onlineMembers = useMemo(
        () => members.filter((m) => (m.status_key ?? m.status.toLowerCase()) !== 'offline'),
        [members],
    );

    const selectedRoom = useMemo(
        () => rooms.find((r) => r.id === selectedRoomId) ?? null,
        [rooms, selectedRoomId],
    );

    const roomMembers = useMemo(
        () => onlineMembers.filter((m) => m.zone === selectedRoomId),
        [onlineMembers, selectedRoomId],
    );

    const memberCountsByRoom = useMemo(() => {
        const counts: Record<string, number> = {};
        onlineMembers.forEach((m) => {
            counts[m.zone] = (counts[m.zone] ?? 0) + 1;
        });
        return counts;
    }, [onlineMembers]);

    const focusRoom = useCallback((roomId: string) => {
        setSelectedRoomId(roomId);
        setFocusedMemberId(null);
        setCameraCommand({ type: 'focusRoom', roomId, seq: Date.now() });
    }, []);

    const focusMember = useCallback((member: VirtualMemberData) => {
        setSelectedRoomId(member.zone);
        setFocusedMemberId(member.id);
        setCameraCommand({ type: 'focusMember', memberId: member.id, seq: Date.now() });
    }, []);

    const handleHoverMember = useCallback(
        (member: VirtualMemberData | null, pos: { x: number; y: number } | null) => {
            if (member && pos) setHoveredMember({ member, pos });
            else setHoveredMember(null);
        },
        [],
    );

    const toggleFullscreen = useCallback(() => {
        const el = stageRef.current;
        if (!el) return;
        if (!document.fullscreenElement) {
            el.requestFullscreen?.().catch(() => {});
        } else {
            document.exitFullscreen?.().catch(() => {});
        }
    }, []);

    useEffect(() => {
        const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', onFsChange);
        return () => document.removeEventListener('fullscreenchange', onFsChange);
    }, []);

    // Keyboard shortcuts: + / - / T / I / R / F
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            const tag = (e.target as HTMLElement)?.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
            if (e.key === '+' || e.key === '=') {
                setCameraCommand({ type: 'zoomIn', seq: Date.now() });
            } else if (e.key === '-') {
                setCameraCommand({ type: 'zoomOut', seq: Date.now() });
            } else if (e.key.toLowerCase() === 't') {
                setCameraCommand({ type: 'topDown', seq: Date.now() });
            } else if (e.key.toLowerCase() === 'i') {
                setCameraCommand({ type: 'isometric', seq: Date.now() });
            } else if (e.key.toLowerCase() === 'r') {
                setCameraCommand({ type: 'reset', seq: Date.now() });
            } else if (e.key.toLowerCase() === 'f') {
                toggleFullscreen();
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [toggleFullscreen]);

    const capacityPct = selectedRoom
        ? Math.min(100, Math.round((roomMembers.length / Math.max(1, selectedRoom.capacity)) * 100))
        : 0;

    return (
        <AppShell
            title="Virtual Office"
            subtitle="Interactive 3D Krevia Digital Headquarters — Explore zones, live team presence, and KDMS modules"
            actions={
                <div className="relative flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:border-[#42C99A]/35 dark:bg-[#42C99A]/10 dark:text-[#42C99A]">
                        <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500 dark:bg-[#42C99A]" />
                        {onlineMembers.length} Online
                    </span>

                    <span className="hidden items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-slate-600 sm:inline-flex dark:border-white/[0.11] dark:bg-white/[0.04] dark:text-[#A7B4CB]">
                        {wsState === 'connected' ? (
                            <>
                                <Wifi className="h-3 w-3 text-emerald-500" />
                                Reverb Live
                            </>
                        ) : wsState === 'reconnecting' ? (
                            <>
                                <WifiOff className="h-3 w-3 text-amber-500" />
                                Menyambung kembali...
                            </>
                        ) : (
                            <>
                                <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                                Heartbeat Sync
                            </>
                        )}
                    </span>

                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setShowStatusMenu((v) => !v)}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-xs transition hover:border-blue-300 dark:border-white/[0.12] dark:bg-white/[0.055] dark:text-[#F4F7FF]"
                        >
                            <span
                                className={`h-2 w-2 rounded-full ${STATUS_DOT[myPresence?.status ?? 'Online'] ?? 'bg-emerald-500'}`}
                            />
                            <span>{myPresence?.status ?? 'Online'}</span>
                        </button>

                        {showStatusMenu && (
                            <div className="krevia-glass-elevated absolute right-0 z-40 mt-2 w-64 rounded-2xl p-3 text-left">
                                <p className="mb-2 text-[10px] font-bold tracking-wider text-slate-500 uppercase dark:text-[#71819C]">
                                    Status Saya
                                </p>
                                <div className="grid grid-cols-2 gap-1">
                                    {STATUS_OPTIONS.map((opt) => (
                                        <button
                                            key={opt.key}
                                            type="button"
                                            disabled={savingStatus}
                                            onClick={() => {
                                                updateMyStatus({ status: opt.key });
                                                setShowStatusMenu(false);
                                            }}
                                            className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-medium transition ${
                                                (myPresence?.status_key ?? 'online') === opt.key
                                                    ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200 dark:bg-[#668CFF]/20 dark:text-[#F4F7FF]'
                                                    : 'text-slate-700 hover:bg-slate-100 dark:text-[#A7B4CB] dark:hover:bg-white/[0.08]'
                                            }`}
                                        >
                                            <span className={`h-2 w-2 rounded-full ${opt.dot}`} />
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                                <div className="mt-3 space-y-2 border-t border-slate-200/80 pt-2.5 dark:border-white/[0.09]">
                                    <div className="flex gap-1.5">
                                        <input
                                            type="text"
                                            maxLength={4}
                                            value={customEmoji}
                                            onChange={(e) => setCustomEmoji(e.target.value)}
                                            className="w-10 rounded-lg border border-slate-200 px-1.5 py-1 text-center text-xs"
                                        />
                                        <input
                                            type="text"
                                            maxLength={80}
                                            value={customText}
                                            onChange={(e) => setCustomText(e.target.value)}
                                            placeholder="Fokus coding sampai 15.00..."
                                            className="flex-1 rounded-lg border border-slate-200 px-2 py-1 text-xs"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        disabled={savingStatus}
                                        onClick={() => {
                                            updateMyStatus({
                                                custom_status_text: customText,
                                                custom_status_emoji: customEmoji,
                                                expires_in: 'today',
                                            });
                                            setShowStatusMenu(false);
                                        }}
                                        className="w-full rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 px-2.5 py-1.5 text-[11px] font-semibold text-white"
                                    >
                                        Simpan Custom Status
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    <Link
                        href="/dashboard"
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs transition hover:-translate-y-0.5 hover:border-blue-300 hover:text-slate-900 dark:border-white/[0.12] dark:bg-white/[0.055] dark:text-[#F4F7FF] dark:hover:bg-white/[0.1]"
                    >
                        <Compass className="h-3.5 w-3.5 text-blue-600 dark:text-[#45D8E8]" />
                        Dashboard
                    </Link>
                </div>
            }
        >
            <Head title="Virtual Office" />

            {/* Zone Segmented Control Tabs */}
            <div
                role="tablist"
                aria-label="Virtual Office Zones"
                className="krevia-glass mb-4 flex flex-wrap items-center gap-1.5 rounded-2xl p-1.5"
            >
                {rooms.map((room, idx) => {
                    const active = selectedRoomId === room.id;
                    const count = memberCountsByRoom[room.id] ?? 0;
                    return (
                        <button
                            key={room.id}
                            role="tab"
                            aria-selected={active}
                            type="button"
                            onClick={() => focusRoom(room.id)}
                            onKeyDown={(e) => {
                                if (e.key === 'ArrowRight') {
                                    focusRoom(rooms[(idx + 1) % rooms.length].id);
                                } else if (e.key === 'ArrowLeft') {
                                    focusRoom(rooms[(idx - 1 + rooms.length) % rooms.length].id);
                                }
                            }}
                            className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition-all duration-200 ${
                                active
                                    ? 'bg-blue-50 text-blue-700 shadow-xs ring-1 ring-blue-200 dark:bg-gradient-to-r dark:from-[#668CFF]/25 dark:to-[#45D8E8]/15 dark:text-[#F4F7FF] dark:ring-[#668CFF]/40'
                                    : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 dark:text-[#A7B4CB] dark:hover:bg-white/[0.06] dark:hover:text-[#F4F7FF]'
                            }`}
                        >
                            <span
                                className="h-2.5 w-2.5 rounded-full"
                                style={{ backgroundColor: room.accent }}
                            />
                            <span>{room.name}</span>
                            <span className="rounded-md bg-slate-200/70 px-1.5 py-0.5 font-mono text-[10px] text-slate-600 dark:bg-white/[0.08] dark:text-[#A7B4CB]">
                                {count}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Full-Width 3D Architectural Diorama Stage */}
            <div
                ref={stageRef}
                className="krevia-glass relative h-[calc(100vh-16.5rem)] min-h-[540px] w-full overflow-hidden rounded-3xl"
            >
                {/* 3D Canvas or Interactive 2D Floorplan Fallback */}
                {webglFailed ? (
                    <div className="relative z-10 flex h-full flex-col items-center justify-center p-6 text-center">
                        <img
                            src="/images/krevia-mark.png"
                            alt="Krevia"
                            className="mb-3 h-10 w-10 rounded-xl bg-white p-1 shadow-sm"
                        />
                        <h2 className="font-display text-lg font-bold text-slate-900 dark:text-[#F4F7FF]">
                            Interactive 2D Office Floorplan
                        </h2>
                        <p className="mt-1 max-w-md text-xs text-slate-500 dark:text-[#A7B4CB]">
                            WebGL 3D acceleration is unavailable on this device. Click any zone below to inspect
                            its members and jump directly into KDMS modules.
                        </p>
                        <div className="mt-6 grid w-full max-w-3xl gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {rooms.map((room) => (
                                <button
                                    key={room.id}
                                    type="button"
                                    onClick={() => setSelectedRoomId(room.id)}
                                    className="krevia-glass krevia-card-hover rounded-2xl p-4 text-left"
                                >
                                    <div className="flex items-center justify-between">
                                        <span
                                            className="font-mono text-[10px] font-bold uppercase"
                                            style={{ color: room.accent }}
                                        >
                                            {room.code}
                                        </span>
                                        <span className="text-[10px] text-slate-500 dark:text-[#71819C]">
                                            {memberCountsByRoom[room.id] ?? 0} members
                                        </span>
                                    </div>
                                    <p className="mt-1 font-display text-sm font-bold text-slate-900 dark:text-[#F4F7FF]">
                                        {room.name}
                                    </p>
                                    <p className="mt-1 line-clamp-2 text-[11px] text-slate-500 dark:text-[#A7B4CB]">
                                        {room.description}
                                    </p>
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    <Suspense
                        fallback={
                            <div className="flex h-full flex-col items-center justify-center gap-3">
                                <img
                                    src="/images/krevia-mark.png"
                                    alt="Krevia Digital"
                                    className="h-11 w-11 animate-pulse rounded-xl bg-white p-1 shadow-md"
                                />
                                <div className="h-1.5 w-44 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                                    <div className="h-full w-2/3 animate-pulse rounded-full bg-gradient-to-r from-blue-600 to-cyan-400" />
                                </div>
                                <p className="text-xs font-medium text-slate-500 dark:text-[#A7B4CB]">
                                    Preparing 3D Krevia Headquarters...
                                </p>
                            </div>
                        }
                    >
                        <OfficeScene3D
                            theme={resolvedTheme}
                            rooms={rooms}
                            members={onlineMembers}
                            selectedRoomId={selectedRoomId}
                            panelOpen={!!selectedRoom}
                            showLabels={showLabels}
                            showMembers={showMembers}
                            onSelectRoom={focusRoom}
                            onSelectMember={focusMember}
                            onHoverMember={handleHoverMember}
                            cameraCommand={cameraCommand}
                            onWebGLError={() => setWebglFailed(true)}
                        />
                    </Suspense>
                )}

                {/* Hovered Avatar Mini Tooltip */}
                {hoveredMember && (
                    <div
                        className="krevia-glass-elevated pointer-events-none absolute z-30 w-52 rounded-xl p-2.5 text-left"
                        style={{
                            left: Math.min(hoveredMember.pos.x + 14, 520),
                            top: Math.max(hoveredMember.pos.y - 72, 12),
                        }}
                    >
                        <div className="flex items-center gap-2">
                            <UserAvatar
                                name={hoveredMember.member.name}
                                avatarUrl={hoveredMember.member.avatar_url}
                                avatarColor={hoveredMember.member.avatar_color}
                                size="xs"
                            />
                            <div className="min-w-0">
                                <p className="truncate text-xs font-bold text-slate-900 dark:text-[#F4F7FF]">
                                    {hoveredMember.member.name}
                                </p>
                                <p className="truncate text-[10px] text-slate-500 dark:text-[#A7B4CB]">
                                    {hoveredMember.member.position}
                                </p>
                            </div>
                        </div>
                        <div className="mt-1.5 flex items-center justify-between border-t border-slate-200/70 pt-1.5 text-[10px] dark:border-white/[0.09]">
                            <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-[#42C99A]">
                                <span
                                    className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[hoveredMember.member.status] ?? 'bg-blue-500'}`}
                                />
                                {hoveredMember.member.status}
                            </span>
                            <span className="text-slate-400 dark:text-[#71819C]">Click to focus</span>
                        </div>
                    </div>
                )}

                {/* Top-Left: Status Legend Pill */}
                <div className="krevia-glass-elevated absolute top-4 left-4 z-20 hidden items-center gap-3 rounded-xl px-3 py-1.5 text-[10px] font-medium text-slate-600 md:flex dark:text-[#A7B4CB]">
                    <span className="inline-flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" /> Online
                    </span>
                    <span className="inline-flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-blue-500" /> Available
                    </span>
                    <span className="inline-flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-amber-500" /> Away
                    </span>
                </div>

                {/* Bottom-Left: Glass Pill Camera Controls Toolbar */}
                {!webglFailed && (
                    <div className="krevia-glass-elevated absolute bottom-4 left-4 z-20 flex flex-wrap items-center gap-1 rounded-2xl p-1.5">
                        <button
                            type="button"
                            onClick={() => setCameraCommand({ type: 'zoomIn', seq: Date.now() })}
                            title="Zoom In (+)"
                            aria-label="Zoom In"
                            className="rounded-xl p-2 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-[#A7B4CB] dark:hover:bg-white/[0.1] dark:hover:text-[#F4F7FF]"
                        >
                            <ZoomIn className="h-4 w-4" />
                        </button>
                        <button
                            type="button"
                            onClick={() => setCameraCommand({ type: 'zoomOut', seq: Date.now() })}
                            title="Zoom Out (-)"
                            aria-label="Zoom Out"
                            className="rounded-xl p-2 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-[#A7B4CB] dark:hover:bg-white/[0.1] dark:hover:text-[#F4F7FF]"
                        >
                            <ZoomOut className="h-4 w-4" />
                        </button>
                        <div className="mx-0.5 h-5 w-px bg-slate-200 dark:bg-white/[0.12]" />
                        <button
                            type="button"
                            onClick={() => setCameraCommand({ type: 'topDown', seq: Date.now() })}
                            title="Top-Down View (T)"
                            aria-label="Top-Down View"
                            className="inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-[#A7B4CB] dark:hover:bg-white/[0.1] dark:hover:text-[#F4F7FF]"
                        >
                            <Layers className="h-3.5 w-3.5 text-sky-600 dark:text-[#45D8E8]" />
                            <span className="hidden sm:inline">Top-Down</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setCameraCommand({ type: 'isometric', seq: Date.now() })}
                            title="Isometric View (I)"
                            aria-label="Isometric View"
                            className="inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-[#A7B4CB] dark:hover:bg-white/[0.1] dark:hover:text-[#F4F7FF]"
                        >
                            <Box className="h-3.5 w-3.5 text-blue-600 dark:text-[#668CFF]" />
                            <span className="hidden sm:inline">Iso</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setCameraCommand({ type: 'reset', seq: Date.now() })}
                            title="Reset Camera (R)"
                            aria-label="Reset Camera"
                            className="rounded-xl p-2 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-[#A7B4CB] dark:hover:bg-white/[0.1] dark:hover:text-[#F4F7FF]"
                        >
                            <RotateCcw className="h-3.5 w-3.5" />
                        </button>
                        <div className="mx-0.5 h-5 w-px bg-slate-200 dark:bg-white/[0.12]" />
                        <button
                            type="button"
                            onClick={() => setShowLabels((v) => !v)}
                            title={showLabels ? 'Hide Labels' : 'Show Labels'}
                            aria-label="Toggle Labels"
                            className={`rounded-xl p-2 transition ${
                                showLabels
                                    ? 'bg-blue-50 text-blue-600 dark:bg-[#668CFF]/20 dark:text-[#8DA8FF]'
                                    : 'text-slate-500 hover:bg-slate-100 dark:text-[#71819C] dark:hover:bg-white/[0.1]'
                            }`}
                        >
                            <Tag className="h-3.5 w-3.5" />
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowMembers((v) => !v)}
                            title={showMembers ? 'Hide Members' : 'Show Members'}
                            aria-label="Toggle Members"
                            className={`rounded-xl p-2 transition ${
                                showMembers
                                    ? 'bg-blue-50 text-blue-600 dark:bg-[#668CFF]/20 dark:text-[#8DA8FF]'
                                    : 'text-slate-500 hover:bg-slate-100 dark:text-[#71819C] dark:hover:bg-white/[0.1]'
                            }`}
                        >
                            {showMembers ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowMiniMap((v) => !v)}
                            title="Toggle Mini-Map"
                            aria-label="Toggle Mini-Map"
                            className={`rounded-xl p-2 transition ${
                                showMiniMap
                                    ? 'bg-blue-50 text-blue-600 dark:bg-[#668CFF]/20 dark:text-[#8DA8FF]'
                                    : 'text-slate-500 hover:bg-slate-100 dark:text-[#71819C] dark:hover:bg-white/[0.1]'
                            }`}
                        >
                            <Map className="h-3.5 w-3.5" />
                        </button>
                        <button
                            type="button"
                            onClick={toggleFullscreen}
                            title="Toggle Fullscreen (F)"
                            aria-label="Toggle Fullscreen"
                            className="rounded-xl p-2 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-[#A7B4CB] dark:hover:bg-white/[0.1] dark:hover:text-[#F4F7FF]"
                        >
                            {isFullscreen ? (
                                <Minimize2 className="h-3.5 w-3.5" />
                            ) : (
                                <Maximize2 className="h-3.5 w-3.5" />
                            )}
                        </button>
                    </div>
                )}

                {/* Optional Mini-Map */}
                {showMiniMap && !selectedRoom && (
                    <div className="krevia-glass-elevated absolute right-4 bottom-4 z-20 w-52 rounded-2xl p-2.5">
                        <p className="mb-1.5 text-[10px] font-bold tracking-wider text-slate-500 uppercase dark:text-[#71819C]">
                            Office Map
                        </p>
                        <div className="grid grid-cols-3 gap-1.5 text-[9px] font-semibold">
                            {rooms.map((r) => (
                                <button
                                    key={r.id}
                                    type="button"
                                    onClick={() => focusRoom(r.id)}
                                    className="rounded-lg border border-slate-200/80 bg-white/80 p-1.5 text-left transition hover:border-blue-400 dark:border-white/[0.1] dark:bg-white/[0.04]"
                                >
                                    <span
                                        className="mb-0.5 block h-1.5 w-4 rounded-full"
                                        style={{ backgroundColor: r.accent }}
                                    />
                                    <span className="line-clamp-1 text-slate-800 dark:text-[#F4F7FF]">
                                        {r.name.split(' ')[0]}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Right Detail Panel (Desktop Slide-In, Mobile Bottom Sheet) with Sticky Action Footer */}
                {selectedRoom && (
                    <aside className="krevia-glass-elevated absolute inset-x-3 bottom-3 z-20 flex max-h-[68%] flex-col overflow-hidden rounded-2xl transition-all duration-300 sm:inset-x-auto sm:top-4 sm:right-4 sm:bottom-4 sm:max-h-none sm:w-80">
                        {/* Sticky Header */}
                        <div className="shrink-0 border-b border-slate-200/80 p-4 pb-3 dark:border-white/[0.09]">
                            <div className="flex items-start justify-between gap-2">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span
                                            className="h-2.5 w-2.5 rounded-full"
                                            style={{ backgroundColor: selectedRoom.accent }}
                                        />
                                        <span className="font-mono text-[10px] font-bold tracking-wider text-slate-500 uppercase dark:text-[#A7B4CB]">
                                            {selectedRoom.code}
                                        </span>
                                    </div>
                                    <h2 className="font-display mt-1 text-base font-bold text-slate-900 dark:text-[#F4F7FF]">
                                        {selectedRoom.name}
                                    </h2>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setSelectedRoomId(null)}
                                    className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-900 dark:text-[#71819C] dark:hover:bg-white/[0.08] dark:hover:text-[#F4F7FF]"
                                    aria-label="Close zone panel"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                            <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-slate-500 dark:text-[#A7B4CB]">
                                {selectedRoom.description}
                            </p>
                        </div>

                        {/* Scrollable Middle Content */}
                        <div className="flex-1 space-y-4 overflow-y-auto p-4">
                            {/* Stat Cards */}
                            <div className="grid grid-cols-2 gap-2">
                                {selectedRoom.metrics.map((m) => (
                                    <div
                                        key={m.label}
                                        title={m.hint}
                                        className="rounded-xl border border-slate-200/80 bg-slate-50/80 px-3 py-2 transition hover:border-blue-300 dark:border-white/[0.09] dark:bg-white/[0.04]"
                                    >
                                        <p className="truncate text-[10px] font-medium text-slate-500 dark:text-[#71819C]">
                                            {m.label}
                                        </p>
                                        <p className="mt-0.5 font-mono text-base font-bold text-slate-900 tabular-nums dark:text-[#F4F7FF]">
                                            {m.value}
                                        </p>
                                    </div>
                                ))}
                            </div>

                            {/* Capacity Progress + Members List */}
                            <div>
                                <div className="mb-1.5 flex items-center justify-between text-[11px] font-semibold text-slate-600 dark:text-[#A7B4CB]">
                                    <span className="inline-flex items-center gap-1.5">
                                        <Users className="h-3.5 w-3.5 text-blue-600 dark:text-[#45D8E8]" />
                                        Members in Zone
                                    </span>
                                    <span className="font-mono text-slate-500 dark:text-[#71819C]">
                                        {roomMembers.length} / {selectedRoom.capacity}
                                    </span>
                                </div>
                                <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-white/[0.08]">
                                    <div
                                        className="h-full rounded-full transition-all duration-300"
                                        style={{
                                            width: `${capacityPct}%`,
                                            backgroundColor: selectedRoom.accent,
                                        }}
                                    />
                                </div>

                                {roomMembers.length === 0 ? (
                                    <p className="rounded-xl border border-slate-200/80 bg-slate-50/70 px-3 py-2 text-[11px] text-slate-500 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-[#71819C]">
                                        No members currently stationed here.
                                    </p>
                                ) : (
                                    <div className="space-y-1.5">
                                        {roomMembers.map((member) => {
                                            const isFocused = focusedMemberId === member.id;
                                            return (
                                                <div
                                                    key={member.id}
                                                    className={`flex items-center justify-between gap-2 rounded-xl border px-2.5 py-1.5 transition ${
                                                        isFocused
                                                            ? 'border-blue-300 bg-blue-50/80 dark:border-[#668CFF]/50 dark:bg-[#668CFF]/15'
                                                            : 'border-slate-200/70 bg-white/80 hover:border-blue-300 hover:bg-slate-50 dark:border-white/[0.08] dark:bg-white/[0.04] dark:hover:bg-white/[0.08]'
                                                    }`}
                                                >
                                                    <button
                                                        type="button"
                                                        onClick={() => focusMember(member)}
                                                        className="flex min-w-0 flex-1 items-center gap-2 text-left"
                                                    >
                                                        <UserAvatar
                                                            name={member.name}
                                                            avatarUrl={member.avatar_url}
                                                            avatarColor={member.avatar_color}
                                                            size="xs"
                                                        />
                                                        <div className="min-w-0">
                                                            <p className="truncate text-xs font-semibold text-slate-900 dark:text-[#F4F7FF]">
                                                                {member.name}
                                                            </p>
                                                            <p className="truncate text-[10px] text-slate-500 dark:text-[#71819C]">
                                                                {member.position}
                                                            </p>
                                                        </div>
                                                    </button>
                                                    <Link
                                                        href={`/people/${member.id}`}
                                                        title="Open profile"
                                                        className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 hover:underline dark:bg-[#42C99A]/15 dark:text-[#42C99A]"
                                                    >
                                                        {member.status}
                                                    </Link>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Lobby Notice Board */}
                            {selectedRoom.id === 'reception' && recentAnnouncements.length > 0 && (
                                <div className="border-t border-slate-200/80 pt-3 dark:border-white/[0.1]">
                                    <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold tracking-wider text-teal-600 uppercase dark:text-[#45D8E8]">
                                        <Radio className="h-3 w-3" />
                                        Lobby Notice Board
                                    </p>
                                    <div className="space-y-1.5">
                                        {recentAnnouncements.map((a) => (
                                            <Link
                                                key={a.id}
                                                href="/announcements"
                                                className="block rounded-lg border border-slate-200/70 bg-slate-50/80 px-2.5 py-1.5 text-[11px] text-slate-900 hover:bg-slate-100 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-[#F4F7FF] dark:hover:bg-white/[0.07]"
                                            >
                                                <p className="line-clamp-1 font-medium">{a.title}</p>
                                                <p className="text-[10px] text-slate-500 dark:text-[#71819C]">
                                                    {a.code} · {a.published_at ?? '—'}
                                                </p>
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Sticky Action Footer (Never Clipped) */}
                        <div className="shrink-0 space-y-2 border-t border-slate-200/80 bg-white/80 p-3.5 backdrop-blur-md dark:border-white/[0.1] dark:bg-[#0B1222]/85">
                            <Link
                                href={selectedRoom.primary_action.href}
                                className="flex w-full items-center justify-between rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:brightness-105 dark:from-[#668CFF] dark:to-[#45D8E8] dark:text-[#070B16]"
                            >
                                <span>{selectedRoom.primary_action.label}</span>
                                <ArrowUpRight className="h-3.5 w-3.5" />
                            </Link>
                            <Link
                                href={selectedRoom.secondary_action.href}
                                className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-white/[0.12] dark:bg-white/[0.05] dark:text-[#F4F7FF] dark:hover:bg-white/[0.1]"
                            >
                                <span>{selectedRoom.secondary_action.label}</span>
                                <Maximize2 className="h-3.5 w-3.5 text-slate-400 dark:text-[#A7B4CB]" />
                            </Link>
                        </div>
                    </aside>
                )}
            </div>
        </AppShell>
    );
}
