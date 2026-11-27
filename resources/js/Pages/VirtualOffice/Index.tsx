import { UserAvatar } from '@/Components/shared/UserAvatar';
import {
    OfficeChatPanel,
    type OfficeMessageData,
} from '@/Components/virtual-office/OfficeChatPanel';
import {
    ActiveMeetingModal,
    OfficeMeetingPanel,
    type OfficeMeetingData,
    type OfficeMeetingsPayload,
} from '@/Components/virtual-office/OfficeMeetingPanel';
import {
    OfficeInteractiveModals,
    type CrmQuickOptions,
    type OfficeVisitorData,
} from '@/Components/virtual-office/OfficeInteractiveModals';
import {
    OfficeProductivityModal,
    type OfficeStandupData,
} from '@/Components/virtual-office/OfficeProductivityModal';
import type {
    CameraCommand,
    VirtualMemberData,
    VirtualRoomData,
    VirtualSeatData,
} from '@/Components/virtual-office/OfficeScene3D';
import { AppShell } from '@/Layouts/AppShell';
import { createReverbEcho, type ReverbClientConfig } from '@/lib/echo';
import { useResolvedTheme } from '@/lib/theme';
import type { PageProps } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import {
    Activity,
    ArrowUpRight,
    BarChart3,
    BellRing,
    Box,
    ClipboardList,
    Coffee,
    Compass,
    Crosshair,
    Eye,
    EyeOff,
    Hand,
    Kanban,
    Layers,
    Link2,
    Map,
    Maximize2,
    Megaphone,
    MessageSquare,
    Minimize2,
    Phone,
    Radio,
    RotateCcw,
    Search,
    Settings2,
    Tag,
    Target,
    UserPlus,
    Users,
    Video,
    Wifi,
    WifiOff,
    X,
    ZoomIn,
    ZoomOut,
} from 'lucide-react';
import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';

const OfficeScene3D = lazy(() => import('@/Components/virtual-office/OfficeScene3D'));

interface KnockData {
    id: number;
    from_user_id: number;
    from_name: string;
    from_avatar_url: string | null;
    to_user_id: number;
    to_name: string;
    message: string | null;
    status: string;
    silent_dnd?: boolean;
    expires_at: string | null;
}

interface OfficeEventData {
    id: number;
    type: string;
    actor_name: string;
    actor_avatar_url: string | null;
    zone_id: number | null;
    zone_name: string | null;
    payload: Record<string, unknown>;
    created_at: string | null;
    created_human: string | null;
}

interface VirtualOfficeProps extends PageProps {
    rooms: (VirtualRoomData & { zone_id?: number | null })[];
    seats: VirtualSeatData[];
    members: VirtualMemberData[];
    myPresence: VirtualMemberData;
    unread?: { dm: Record<string, number>; zone: Record<string, number> };
    pendingKnocks?: KnockData[];
    meetings?: OfficeMeetingsPayload;
    recentEvents?: OfficeEventData[];
    visitors?: OfficeVisitorData[];
    crmOptions?: CrmQuickOptions;
    standups?: OfficeStandupData[];
    projects?: Array<{ id: number; code: string; name: string }>;
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
    seats: initialSeats,
    members: initialMembers,
    myPresence: initialMyPresence,
    unread: initialUnread,
    pendingKnocks: initialPendingKnocks,
    meetings: initialMeetings,
    recentEvents: initialEvents,
    visitors: initialVisitors,
    crmOptions: initialCrmOptions,
    standups: initialStandups,
    projects: initialProjects,
    reverbConfig,
    recentAnnouncements,
}: VirtualOfficeProps) {
    const { auth } = usePage<PageProps>().props;
    const isAdminUser =
        auth.user?.roles?.includes('Founder & Managing Director') ||
        auth.user?.roles?.includes('Operations Director') ||
        auth.user?.permissions?.includes('organization.manage') ||
        false;
    const resolvedTheme = useResolvedTheme();
    const stageRef = useRef<HTMLDivElement | null>(null);
    const lastActivityRef = useRef<number>(Date.now());
    const moveDebounceRef = useRef<number | null>(null);
    const [members, setMembers] = useState<VirtualMemberData[]>(initialMembers);
    const [seats, setSeats] = useState<VirtualSeatData[]>(initialSeats ?? []);
    const [myPresence, setMyPresence] = useState<VirtualMemberData>(initialMyPresence);
    const [panelTab, setPanelTab] = useState<'summary' | 'chat' | 'meetings' | 'activity'>('summary');
    const [dmTarget, setDmTarget] = useState<VirtualMemberData | null>(null);
    const [meetings, setMeetings] = useState<OfficeMeetingsPayload>(
        initialMeetings ?? { live: [], upcoming: [], recent: [] },
    );
    const [events, setEvents] = useState<OfficeEventData[]>(initialEvents ?? []);
    const [visitors, setVisitors] = useState<OfficeVisitorData[]>(initialVisitors ?? []);
    const [standups, setStandups] = useState<OfficeStandupData[]>(initialStandups ?? []);
    const [productivityModal, setProductivityModal] = useState<
        'standup' | 'heatmap' | 'zone_settings' | null
    >(null);
    const [memberSearch, setMemberSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'busy' | 'dnd'>('all');
    const [incomingSummon, setIncomingSummon] = useState<{
        from_name: string;
        zone_slug: string;
        zone_name: string;
        note: string;
    } | null>(null);
    const [interactiveModal, setInteractiveModal] = useState<
        'reception' | 'project_board' | 'coffee_machine' | null
    >(null);
    const [followMemberId, setFollowMemberId] = useState<number | null>(null);
    const [activeCallMeeting, setActiveCallMeeting] = useState<OfficeMeetingData | null>(null);
    const [quickCall, setQuickCall] = useState<{
        room_code: string;
        join_url: string;
        targetName: string;
    } | null>(null);
    const [unread, setUnread] = useState<{ dm: Record<string, number>; zone: Record<string, number> }>(
        initialUnread ?? { dm: {}, zone: {} },
    );
    const [pendingKnocks, setPendingKnocks] = useState<KnockData[]>(initialPendingKnocks ?? []);
    const [incomingMsg, setIncomingMsg] = useState<OfficeMessageData | null>(null);
    const [deletedMsgId, setDeletedMsgId] = useState<number | null>(null);
    const [toastMsg, setToastMsg] = useState<{ text: string; tone: 'info' | 'error' } | null>(null);
    const [wsState, setWsState] = useState<'connected' | 'reconnecting' | 'standby'>(
        reverbConfig.enabled ? 'reconnecting' : 'standby',
    );
    const [isOffline, setIsOffline] = useState<boolean>(() =>
        typeof navigator !== 'undefined' ? !navigator.onLine : false,
    );

    useEffect(() => {
        const goOffline = () => setIsOffline(true);
        const goOnline = () => setIsOffline(false);
        window.addEventListener('offline', goOffline);
        window.addEventListener('online', goOnline);
        return () => {
            window.removeEventListener('offline', goOffline);
            window.removeEventListener('online', goOnline);
        };
    }, []);
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
                    if (Array.isArray(data.seats)) setSeats(data.seats);
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

        const applyIncomingPresence = (updated?: VirtualMemberData) => {
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
        };

        echo.join('office.presence')
            .listen('.presence.updated', (payload: { presence?: VirtualMemberData }) =>
                applyIncomingPresence(payload.presence),
            )
            .listen('.member.moved', (payload: { presence?: VirtualMemberData }) =>
                applyIncomingPresence(payload.presence),
            )
            .listen('.member.seated', (payload: { presence?: VirtualMemberData }) => {
                applyIncomingPresence(payload.presence);
                resyncSnapshot();
            })
            .listen('.meeting.updated', () => {
                fetch('/virtual-office/meetings', {
                    headers: { Accept: 'application/json' },
                    credentials: 'same-origin',
                })
                    .then((res) => (res.ok ? res.json() : null))
                    .then((json) => {
                        if (json?.meetings) {
                            setMeetings(json.meetings);
                        }
                    })
                    .catch(() => {});
            })
            .listen('.visitor.updated', (payload: { action?: string; visitor?: OfficeVisitorData }) => {
                if (payload.action === 'checked_in' && payload.visitor?.host_user_id === myPresence.id) {
                    showToast(`Tamu menunggu: ${payload.visitor.name}`);
                }
                fetch('/virtual-office/visitors', {
                    headers: { Accept: 'application/json' },
                    credentials: 'same-origin',
                })
                    .then((res) => (res.ok ? res.json() : null))
                    .then((json) => {
                        if (json?.visitors) setVisitors(json.visitors);
                    })
                    .catch(() => {});
            })
            .listen('.standup.started', (payload: { payload?: { initiated_by?: string } }) => {
                showToast(
                    `${payload.payload?.initiated_by ?? 'Lead'} memulai Standup Harian! Silakan isi update Anda.`,
                );
                setProductivityModal('standup');
            })
            .listen('.standup.submitted', (payload: { payload?: OfficeStandupData }) => {
                if (payload.payload) {
                    setStandups((prev) => {
                        const filtered = prev.filter((s) => s.user_id !== payload.payload!.user_id);
                        return [payload.payload!, ...filtered];
                    });
                }
            });

        // Private DM & Knock channel
        echo.private(`office.dm.${myPresence.id}`)
            .listen('.message.new', (payload: { message?: OfficeMessageData }) => {
                if (!payload.message) return;
                setIncomingMsg(payload.message);
                if (payload.message.sender_id !== myPresence.id && !payload.message.silent_dnd) {
                    setUnread((u) => ({
                        ...u,
                        dm: {
                            ...u.dm,
                            [String(payload.message!.sender_id)]:
                                (u.dm[String(payload.message!.sender_id)] ?? 0) + 1,
                        },
                    }));
                }
            })
            .listen('.message.edited', (payload: { message?: OfficeMessageData }) => {
                if (payload.message) setIncomingMsg(payload.message);
            })
            .listen('.message.deleted', (payload: { message?: OfficeMessageData }) => {
                if (payload.message) setDeletedMsgId(payload.message.id);
            })
            .listen('.knock.new', (payload: { knock?: KnockData }) => {
                if (!payload.knock) return;
                setPendingKnocks((prev) =>
                    prev.some((k) => k.id === payload.knock!.id) ? prev : [payload.knock!, ...prev],
                );
            })
            .listen('.knock.response', (payload: { knock?: KnockData }) => {
                if (!payload.knock) return;
                const statusLabel =
                    payload.knock.status === 'accepted'
                        ? `${payload.knock.to_name} menerima ketukan Anda!`
                        : payload.knock.status === 'later'
                          ? `${payload.knock.to_name} meminta nanti.`
                          : `${payload.knock.to_name} menolak ketukan.`;
                showToast(statusLabel, payload.knock.status === 'accepted' ? 'info' : 'error');
            })
            .listen(
                '.summon.received',
                (payload: {
                    payload?: { from_name: string; zone_slug: string; zone_name: string; note: string };
                }) => {
                    if (payload.payload) setIncomingSummon(payload.payload);
                },
            );

        return () => {
            echo.leave('office.presence');
            echo.leave(`office.dm.${myPresence.id}`);
            echo.disconnect();
        };
    }, [reverbConfig, myPresence.id]);

    // Subscribe to selected Zone Chat channel
    useEffect(() => {
        const room = rooms.find((r) => r.id === selectedRoomId);
        const zoneId = room?.zone_id;
        if (!zoneId) return;

        const echo = createReverbEcho(reverbConfig);
        if (!echo) return;

        echo.private(`office.zone.${zoneId}`)
            .listen('.message.new', (payload: { message?: OfficeMessageData }) => {
                if (!payload.message) return;
                setIncomingMsg(payload.message);
                if (payload.message.sender_id !== myPresence.id && panelTab !== 'chat') {
                    setUnread((u) => ({
                        ...u,
                        zone: {
                            ...u.zone,
                            [String(zoneId)]: (u.zone[String(zoneId)] ?? 0) + 1,
                        },
                    }));
                }
            })
            .listen('.message.edited', (payload: { message?: OfficeMessageData }) => {
                if (payload.message) setIncomingMsg(payload.message);
            })
            .listen('.message.deleted', (payload: { message?: OfficeMessageData }) => {
                if (payload.message) setDeletedMsgId(payload.message.id);
            });

        return () => {
            echo.leave(`office.zone.${zoneId}`);
            echo.disconnect();
        };
    }, [selectedRoomId, rooms, reverbConfig, myPresence.id, panelTab]);

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

    const showToast = useCallback((text: string, tone: 'info' | 'error' = 'info') => {
        setToastMsg({ text, tone });
        window.setTimeout(() => {
            setToastMsg((curr) => (curr?.text === text ? null : curr));
        }, 3500);
    }, []);

    const moveToPosition = useCallback(
        async (zoneSlug: string, posX?: number, posZ?: number) => {
            const prevMembers = members;
            const prevMine = myPresence;

            // Optimistic local update
            setMyPresence((p) => ({
                ...p,
                zone: zoneSlug,
                seat_id: null,
                pos_x: posX ?? p.pos_x,
                pos_z: posZ ?? p.pos_z,
            }));
            setMembers((prev) =>
                prev.map((m) =>
                    m.id === myPresence.id
                        ? { ...m, zone: zoneSlug, seat_id: null, pos_x: posX ?? m.pos_x, pos_z: posZ ?? m.pos_z }
                        : m,
                ),
            );

            try {
                const res = await fetch('/virtual-office/presence/move', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                        'X-XSRF-TOKEN': readXsrfToken(),
                    },
                    body: JSON.stringify({ zone_slug: zoneSlug, pos_x: posX, pos_z: posZ }),
                });
                const data = await res.json();
                if (res.ok) {
                    if (data.myPresence) setMyPresence(data.myPresence);
                    if (Array.isArray(data.members)) setMembers(data.members);
                    if (Array.isArray(data.seats)) setSeats(data.seats);
                } else {
                    setMembers(prevMembers);
                    setMyPresence(prevMine);
                    const msg =
                        data?.errors?.zone_slug?.[0] ?? data?.message ?? 'Tidak dapat berpindah ke zona ini.';
                    showToast(msg, 'error');
                }
            } catch {
                setMembers(prevMembers);
                setMyPresence(prevMine);
                showToast('Gagal menyinkronkan posisi.', 'error');
            }
        },
        [members, myPresence, showToast],
    );

    const handleClickSeat = useCallback(
        async (seat: VirtualSeatData) => {
            const isStandingUp = myPresence.seat_id === seat.id;
            const targetSeatId = isStandingUp ? null : seat.id;

            try {
                const res = await fetch('/virtual-office/presence/seat', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                        'X-XSRF-TOKEN': readXsrfToken(),
                    },
                    body: JSON.stringify({ seat_id: targetSeatId }),
                });
                const data = await res.json();
                if (res.ok) {
                    if (data.myPresence) setMyPresence(data.myPresence);
                    if (Array.isArray(data.members)) setMembers(data.members);
                    if (Array.isArray(data.seats)) setSeats(data.seats);
                    setSelectedRoomId(seat.zone);
                    showToast(isStandingUp ? 'Anda berdiri dari kursi.' : `Duduk di ${seat.seat_key}.`, 'info');
                } else {
                    const msg =
                        data?.errors?.seat_id?.[0] ??
                        data?.errors?.zone_slug?.[0] ??
                        data?.message ??
                        'Kursi tidak tersedia.';
                    showToast(msg, 'error');
                }
            } catch {
                showToast('Gagal mengubah status duduk.', 'error');
            }
        },
        [myPresence.seat_id, showToast],
    );

    const summonMember = useCallback(
        async (member: VirtualMemberData) => {
            const zoneId = (selectedRoom as { zone_id?: number | null } | undefined)?.zone_id;
            if (!zoneId) return;
            const res = await fetch('/virtual-office/summon', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-XSRF-TOKEN': readXsrfToken(),
                },
                credentials: 'same-origin',
                body: JSON.stringify({
                    target_user_id: member.id,
                    zone_id: zoneId,
                }),
            });
            if (res.ok) {
                showToast(`Panggilan ke zona dikirim ke ${member.name}.`);
            } else {
                const j = await res.json();
                showToast(j?.message ?? 'Gagal memanggil anggota.', 'error');
            }
        },
        [selectedRoomId, rooms],
    );

    const toggleFocusMode = useCallback(async () => {
        const isCurrentlyFocused =
            myPresence.status_key === 'dnd' && myPresence.custom_status_text === 'Focus Mode';
        const res = await fetch('/virtual-office/focus-mode', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                'X-XSRF-TOKEN': readXsrfToken(),
            },
            credentials: 'same-origin',
            body: JSON.stringify({ enabled: !isCurrentlyFocused }),
        });
        const json = await res.json();
        if (res.ok && json.myPresence) {
            setMyPresence((prev) => ({ ...prev, ...json.myPresence }));
            showToast(!isCurrentlyFocused ? 'Focus Mode aktif (DND).' : 'Focus Mode dimatikan.');
        }
    }, [myPresence.status_key, myPresence.custom_status_text]);

    const startQuickCall = useCallback(async (member: VirtualMemberData) => {
        const res = await fetch(`/virtual-office/call/${member.id}`, {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'X-XSRF-TOKEN': readXsrfToken(),
            },
            credentials: 'same-origin',
        });
        const json = await res.json();
        if (!res.ok) {
            showToast(json?.message ?? 'Tidak dapat memulai panggilan.', 'error');
            return;
        }
        if (json.call) {
            setQuickCall({
                room_code: json.call.room_code,
                join_url: json.call.join_url,
                targetName: member.name,
            });
        }
    }, []);

    useEffect(() => {
        if (panelTab !== 'activity') return;
        const zoneId = (selectedRoom as { zone_id?: number | null } | undefined)?.zone_id;
        const url = zoneId ? `/virtual-office/events?zone_id=${zoneId}` : '/virtual-office/events';
        fetch(url, { headers: { Accept: 'application/json' }, credentials: 'same-origin' })
            .then((res) => (res.ok ? res.json() : null))
            .then((json) => {
                if (json?.events) setEvents(json.events);
            })
            .catch(() => {});
    }, [panelTab, selectedRoomId]);

    const sendKnock = useCallback(
        async (target: VirtualMemberData) => {
            try {
                const res = await fetch('/virtual-office/knocks', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                        'X-XSRF-TOKEN': readXsrfToken(),
                    },
                    body: JSON.stringify({
                        to_user_id: target.id,
                        message: 'Permisi, boleh bicara sebentar?',
                    }),
                });
                const data = await res.json();
                if (res.ok) {
                    showToast(`Ketukan terkirim ke ${target.name}.`, 'info');
                } else {
                    showToast(
                        data?.errors?.to_user_id?.[0] ?? data?.message ?? 'Gagal mengirim ketukan.',
                        'error',
                    );
                }
            } catch {
                showToast('Gagal mengirim ketukan.', 'error');
            }
        },
        [showToast],
    );

    const respondToKnock = useCallback(
        async (knock: KnockData, status: 'accepted' | 'declined' | 'later') => {
            const res = await fetch(`/virtual-office/knocks/${knock.id}/respond`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-XSRF-TOKEN': readXsrfToken(),
                },
                body: JSON.stringify({ status }),
            });
            setPendingKnocks((prev) => prev.filter((k) => k.id !== knock.id));
            if (res.ok && status === 'accepted') {
                const sender = members.find((m) => m.id === knock.from_user_id);
                if (sender) setDmTarget(sender);
            }
        },
        [members],
    );

    const nearbyMembers = useMemo(() => {
        const myX = myPresence.pos_x;
        const myZ = myPresence.pos_z;
        if (typeof myX !== 'number' || typeof myZ !== 'number') return [];
        return onlineMembers.filter((m) => {
            if (m.id === myPresence.id) return false;
            if (typeof m.pos_x !== 'number' || typeof m.pos_z !== 'number') return false;
            return Math.hypot(m.pos_x - myX, m.pos_z - myZ) <= 3.0;
        });
    }, [onlineMembers, myPresence]);

    // WASD keyboard movement (debounced server persistence)
    useEffect(() => {
        const resolveZoneAt = (x: number, z: number): string => {
            if (z < 0.2) return x > 3.5 ? 'meeting' : 'workspace';
            if (x < -3.6) return 'reception';
            if (x > 4.0) return 'project';
            return 'lounge';
        };

        const onWasd = (e: KeyboardEvent) => {
            const tag = (e.target as HTMLElement)?.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
            const key = e.key.toLowerCase();
            if (!['w', 'a', 's', 'd'].includes(key)) return;

            const step = 0.75;
            const curX = typeof myPresence.pos_x === 'number' ? myPresence.pos_x : -3.5;
            const curZ = typeof myPresence.pos_z === 'number' ? myPresence.pos_z : -3.6;
            let nextX = curX;
            let nextZ = curZ;
            if (key === 'w') nextZ = Math.max(-7.2, curZ - step);
            if (key === 's') nextZ = Math.min(7.0, curZ + step);
            if (key === 'a') nextX = Math.max(-10.5, curX - step);
            if (key === 'd') nextX = Math.min(10.5, curX + step);
            const nextZone = resolveZoneAt(nextX, nextZ);

            setMyPresence((p) => ({ ...p, pos_x: nextX, pos_z: nextZ, zone: nextZone, seat_id: null }));
            setMembers((prev) =>
                prev.map((m) =>
                    m.id === myPresence.id
                        ? { ...m, pos_x: nextX, pos_z: nextZ, zone: nextZone, seat_id: null }
                        : m,
                ),
            );

            if (moveDebounceRef.current) window.clearTimeout(moveDebounceRef.current);
            moveDebounceRef.current = window.setTimeout(() => {
                moveToPosition(nextZone, Number(nextX.toFixed(2)), Number(nextZ.toFixed(2)));
            }, 450);
        };

        window.addEventListener('keydown', onWasd);
        return () => window.removeEventListener('keydown', onWasd);
    }, [myPresence.id, myPresence.pos_x, myPresence.pos_z, moveToPosition]);

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

                    <button
                        type="button"
                        onClick={() => setProductivityModal('standup')}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-xs transition hover:border-blue-300 dark:border-white/[0.12] dark:bg-white/[0.055] dark:text-[#F4F7FF]"
                    >
                        <ClipboardList className="h-3.5 w-3.5 text-blue-600 dark:text-[#45D8E8]" />
                        Standup
                    </button>
                    {isAdminUser && (
                        <button
                            type="button"
                            onClick={() => setProductivityModal('heatmap')}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-xs transition hover:border-emerald-300 dark:border-white/[0.12] dark:bg-white/[0.055] dark:text-[#F4F7FF]"
                        >
                            <BarChart3 className="h-3.5 w-3.5 text-emerald-600" />
                            Heatmap
                        </button>
                    )}

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

            {isOffline && (
                <div className="mb-3 flex items-center justify-between rounded-xl border border-rose-300 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-800 dark:border-rose-500/40 dark:bg-rose-500/15 dark:text-rose-200">
                    <span>Tidak ada koneksi internet — mode baca saja aktif. Aksi tulis ditolak sementara.</span>
                </div>
            )}

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
                            seats={seats}
                            members={onlineMembers}
                            myUserId={myPresence.id}
                            selectedRoomId={selectedRoomId}
                            panelOpen={!!selectedRoom}
                            showLabels={showLabels}
                            showMembers={showMembers}
                            onSelectRoom={focusRoom}
                            onClickFloor={(roomId, x, z) => {
                                setSelectedRoomId(roomId);
                                moveToPosition(roomId, x, z);
                            }}
                            onClickSeat={handleClickSeat}
                            hasLiveMeeting={meetings.live.length > 0}
                            onClickMeetingObject={() => {
                                setSelectedRoomId('meeting');
                                setPanelTab('meetings');
                            }}
                            onClickInteractiveObject={(obj) => setInteractiveModal(obj)}
                            followMemberId={followMemberId}
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

                {/* Toast, Knock Banner & Proximity Banner */}
                <div className="pointer-events-none absolute top-4 left-1/2 z-30 flex -translate-x-1/2 flex-col items-center gap-2">
                    {pendingKnocks
                        .filter((k) => !(myPresence.status_key === 'dnd' && !k.silent_dnd === false))
                        .slice(0, 1)
                        .map((k) => (
                            <div
                                key={k.id}
                                className="krevia-glass-elevated pointer-events-auto flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-xs shadow-lg"
                            >
                                <Hand className="h-4 w-4 shrink-0 text-amber-500" />
                                <div className="min-w-0">
                                    <p className="font-bold text-slate-900 dark:text-[#F4F7FF]">
                                        {k.from_name} mengetuk
                                    </p>
                                    {k.message && (
                                        <p className="truncate text-[11px] text-slate-500 dark:text-[#A7B4CB]">
                                            {k.message}
                                        </p>
                                    )}
                                </div>
                                <div className="flex shrink-0 gap-1">
                                    <button
                                        type="button"
                                        onClick={() => respondToKnock(k, 'accepted')}
                                        className="rounded-lg bg-emerald-600 px-2 py-1 text-[10px] font-semibold text-white"
                                    >
                                        Terima
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => respondToKnock(k, 'later')}
                                        className="rounded-lg border border-slate-200 px-2 py-1 text-[10px] font-semibold dark:border-white/15"
                                    >
                                        Nanti
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => respondToKnock(k, 'declined')}
                                        className="rounded-lg px-2 py-1 text-[10px] font-semibold text-rose-600"
                                    >
                                        Tolak
                                    </button>
                                </div>
                            </div>
                        ))}
                    {toastMsg && (
                        <div
                            className={`pointer-events-auto rounded-xl border px-3.5 py-2 text-xs font-semibold shadow-lg backdrop-blur-md ${
                                toastMsg.tone === 'error'
                                    ? 'border-rose-300 bg-rose-50/95 text-rose-700 dark:border-rose-500/40 dark:bg-rose-950/90 dark:text-rose-200'
                                    : 'border-blue-200 bg-white/95 text-slate-800 dark:border-white/15 dark:bg-[#101A30]/95 dark:text-[#F4F7FF]'
                            }`}
                        >
                            {toastMsg.text}
                        </div>
                    )}
                    {nearbyMembers.length > 0 && (
                        <div className="krevia-glass-elevated pointer-events-auto inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold text-slate-700 dark:text-[#F4F7FF]">
                            <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-500" />
                            <span>
                                Dekat dengan{' '}
                                {nearbyMembers
                                    .slice(0, 2)
                                    .map((m) => m.name.split(' ')[0])
                                    .join(', ')}
                                {nearbyMembers.length > 2 ? ` +${nearbyMembers.length - 2}` : ''}
                            </span>
                        </div>
                    )}
                </div>

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
                                <div className="flex items-center gap-1">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const url = `${window.location.origin}/virtual-office?zone=${encodeURIComponent(selectedRoom.id)}`;
                                            navigator.clipboard?.writeText(url);
                                            showToast('Tautan lokasi zona disalin.');
                                        }}
                                        title="Salin tautan lokasi"
                                        className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-blue-600 dark:text-[#71819C] dark:hover:bg-white/[0.08]"
                                    >
                                        <Link2 className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedRoomId(null)}
                                        className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-900 dark:text-[#71819C] dark:hover:bg-white/[0.08] dark:hover:text-[#F4F7FF]"
                                        aria-label="Close zone panel"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                            <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-slate-500 dark:text-[#A7B4CB]">
                                {selectedRoom.description}
                            </p>
                            {/* Panel Tabs: Ringkasan | Chat | Rapat | Aktivitas */}
                            <div className="mt-3 grid grid-cols-4 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-white/[0.06]">
                                <button
                                    type="button"
                                    onClick={() => setPanelTab('summary')}
                                    className={`rounded-lg py-1 text-[11px] font-semibold transition ${
                                        panelTab === 'summary'
                                            ? 'bg-white text-slate-900 shadow-xs dark:bg-[#15223A] dark:text-[#F4F7FF]'
                                            : 'text-slate-600 dark:text-[#A7B4CB]'
                                    }`}
                                >
                                    Ringkasan
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPanelTab('chat')}
                                    className={`inline-flex items-center justify-center gap-1 rounded-lg py-1 text-[11px] font-semibold transition ${
                                        panelTab === 'chat'
                                            ? 'bg-white text-slate-900 shadow-xs dark:bg-[#15223A] dark:text-[#F4F7FF]'
                                            : 'text-slate-600 dark:text-[#A7B4CB]'
                                    }`}
                                >
                                    <MessageSquare className="h-3 w-3" />
                                    Chat
                                    {(unread.zone[String((selectedRoom as { zone_id?: number }).zone_id ?? '')] ?? 0) > 0 && (
                                        <span className="rounded-full bg-rose-600 px-1 text-[9px] font-bold text-white">
                                            {unread.zone[String((selectedRoom as { zone_id?: number }).zone_id ?? '')]}
                                        </span>
                                    )}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPanelTab('meetings')}
                                    className={`inline-flex items-center justify-center gap-1 rounded-lg py-1 text-[11px] font-semibold transition ${
                                        panelTab === 'meetings'
                                            ? 'bg-white text-slate-900 shadow-xs dark:bg-[#15223A] dark:text-[#F4F7FF]'
                                            : 'text-slate-600 dark:text-[#A7B4CB]'
                                    }`}
                                >
                                    <Video className="h-3 w-3" />
                                    Rapat
                                    {meetings.live.length > 0 && (
                                        <span className="h-2 w-2 animate-pulse rounded-full bg-rose-600" />
                                    )}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPanelTab('activity')}
                                    className={`inline-flex items-center justify-center gap-1 rounded-lg py-1 text-[11px] font-semibold transition ${
                                        panelTab === 'activity'
                                            ? 'bg-white text-slate-900 shadow-xs dark:bg-[#15223A] dark:text-[#F4F7FF]'
                                            : 'text-slate-600 dark:text-[#A7B4CB]'
                                    }`}
                                >
                                    <Activity className="h-3 w-3" />
                                    Aktivitas
                                </button>
                            </div>
                        </div>

                        {/* Scrollable Middle Content */}
                        <div className="flex-1 space-y-4 overflow-y-auto p-4">
                            {panelTab === 'chat' ? (
                                <OfficeChatPanel
                                    scope="zone"
                                    zoneId={(selectedRoom as { zone_id?: number | null }).zone_id ?? null}
                                    myUserId={myPresence.id}
                                    emptyLabel="Belum ada pesan di zona ini. Sapa tim Anda!"
                                    readXsrfToken={readXsrfToken}
                                    incomingMessage={incomingMsg}
                                    deletedMessageId={deletedMsgId}
                                    onUnreadChange={setUnread}
                                />
                            ) : panelTab === 'meetings' ? (
                                <OfficeMeetingPanel
                                    meetings={meetings}
                                    zoneId={(selectedRoom as { zone_id?: number | null }).zone_id ?? null}
                                    members={members}
                                    projects={initialProjects ?? []}
                                    myUserId={myPresence.id}
                                    isAdmin={isAdminUser}
                                    readXsrfToken={readXsrfToken}
                                    onMeetingsChange={setMeetings}
                                    onOpenCallModal={(m) => setActiveCallMeeting(m)}
                                    onToast={showToast}
                                    onPresenceUpdated={(p) => setMyPresence((prev) => ({ ...prev, ...p }))}
                                />
                            ) : panelTab === 'activity' ? (
                                <div className="space-y-2">
                                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#A7B4CB]">
                                        Feed Aktivitas Zona
                                    </p>
                                    {events.length === 0 ? (
                                        <p className="rounded-xl border border-dashed border-slate-200 px-3 py-6 text-center text-xs text-slate-400 dark:border-white/10">
                                            Belum ada aktivitas tercatat di zona ini.
                                        </p>
                                    ) : (
                                        events.map((ev) => (
                                            <div
                                                key={ev.id}
                                                className="flex items-start gap-2 rounded-xl border border-slate-200/70 bg-slate-50/70 px-3 py-2 text-xs dark:border-white/10 dark:bg-white/[0.04]"
                                            >
                                                <UserAvatar name={ev.actor_name} avatarUrl={ev.actor_avatar_url} size="xs" />
                                                <div className="min-w-0 flex-1">
                                                    <p className="font-medium text-slate-800 dark:text-[#F4F7FF]">
                                                        {ev.actor_name}{' '}
                                                        <span className="font-normal text-slate-500 dark:text-[#A7B4CB]">
                                                            · {ev.type.replace(/_/g, ' ')}
                                                        </span>
                                                    </p>
                                                    {Boolean((ev.payload as { focus?: string })?.focus) && (
                                                        <p className="truncate text-[11px] text-blue-600 dark:text-blue-400">
                                                            {String((ev.payload as { focus?: string }).focus)}
                                                        </p>
                                                    )}
                                                    <p className="text-[10px] text-slate-400">
                                                        {ev.created_human ?? ev.created_at}
                                                    </p>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            ) : (
                                <>
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
                                        {isAdminUser && (
                                            <button
                                                type="button"
                                                onClick={() => setProductivityModal('zone_settings')}
                                                title="Pengaturan Zona"
                                                className="rounded p-0.5 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 dark:hover:bg-white/10"
                                            >
                                                <Settings2 className="h-3 w-3" />
                                            </button>
                                        )}
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

                                <div className="mb-2 flex gap-1.5">
                                    <div className="relative flex-1">
                                        <Search className="pointer-events-none absolute top-1/2 left-2 h-3 w-3 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type="text"
                                            value={memberSearch}
                                            onChange={(e) => setMemberSearch(e.target.value)}
                                            placeholder="Cari anggota..."
                                            className="w-full rounded-lg border border-slate-200 bg-white py-1 pr-2 pl-6 text-[11px] dark:border-white/10 dark:bg-[#091020] dark:text-[#F4F7FF]"
                                        />
                                    </div>
                                    <select
                                        value={statusFilter}
                                        onChange={(e) =>
                                            setStatusFilter(
                                                e.target.value as 'all' | 'available' | 'busy' | 'dnd',
                                            )
                                        }
                                        className="rounded-lg border border-slate-200 bg-white px-1.5 py-1 text-[11px] dark:border-white/10 dark:bg-[#091020] dark:text-[#F4F7FF]"
                                    >
                                        <option value="all">Semua</option>
                                        <option value="available">Available</option>
                                        <option value="busy">Busy</option>
                                        <option value="dnd">DND</option>
                                    </select>
                                </div>

                                {roomMembers.length === 0 ? (
                                    <p className="rounded-xl border border-slate-200/80 bg-slate-50/70 px-3 py-2 text-[11px] text-slate-500 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-[#71819C]">
                                        No members currently stationed here.
                                    </p>
                                ) : (
                                    <div className="space-y-1.5">
                                        {roomMembers
                                            .filter((m) => {
                                                const q = memberSearch.trim().toLowerCase();
                                                const matchQ =
                                                    q === '' ||
                                                    m.name.toLowerCase().includes(q) ||
                                                    m.position.toLowerCase().includes(q);
                                                const matchS =
                                                    statusFilter === 'all' || m.status_key === statusFilter;
                                                return matchQ && matchS;
                                            })
                                            .map((member) => {
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
                                                    <div className="flex shrink-0 items-center gap-1">
                                                        {member.id !== myPresence.id && (
                                                            <>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setDmTarget(member)}
                                                                    title="Kirim DM"
                                                                    className="relative rounded-lg p-1 text-slate-500 hover:bg-slate-200/70 hover:text-blue-600 dark:text-[#A7B4CB] dark:hover:bg-white/10"
                                                                >
                                                                    <MessageSquare className="h-3.5 w-3.5" />
                                                                    {(unread.dm[String(member.id)] ?? 0) > 0 && (
                                                                        <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-rose-600" />
                                                                    )}
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => sendKnock(member)}
                                                                    title="Ketuk pintu (Knock)"
                                                                    className="rounded-lg p-1 text-slate-500 hover:bg-slate-200/70 hover:text-amber-600 dark:text-[#A7B4CB] dark:hover:bg-white/10"
                                                                >
                                                                    <Hand className="h-3.5 w-3.5" />
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => startQuickCall(member)}
                                                                    title="Mulai Panggilan Video"
                                                                    className="rounded-lg p-1 text-slate-500 hover:bg-slate-200/70 hover:text-emerald-600 dark:text-[#A7B4CB] dark:hover:bg-white/10"
                                                                >
                                                                    <Phone className="h-3.5 w-3.5" />
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        setFollowMemberId((prev) =>
                                                                            prev === member.id ? null : member.id,
                                                                        )
                                                                    }
                                                                    title={
                                                                        followMemberId === member.id
                                                                            ? 'Berhenti mengikuti'
                                                                            : 'Ikuti kamera avatar'
                                                                    }
                                                                    className={`rounded-lg p-1 ${
                                                                        followMemberId === member.id
                                                                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300'
                                                                            : 'text-slate-500 hover:bg-slate-200/70 hover:text-blue-600 dark:text-[#A7B4CB] dark:hover:bg-white/10'
                                                                    }`}
                                                                >
                                                                    <Crosshair className="h-3.5 w-3.5" />
                                                                </button>
                                                                {isAdminUser && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => summonMember(member)}
                                                                        title="Panggil ke zona ini"
                                                                        className="rounded-lg p-1 text-slate-500 hover:bg-slate-200/70 hover:text-purple-600 dark:text-[#A7B4CB] dark:hover:bg-white/10"
                                                                    >
                                                                        <Megaphone className="h-3.5 w-3.5" />
                                                                    </button>
                                                                )}
                                                            </>
                                                        )}
                                                        <Link
                                                            href={`/people/${member.id}`}
                                                            title="Open profile"
                                                            className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 hover:underline dark:bg-[#42C99A]/15 dark:text-[#42C99A]"
                                                        >
                                                            {member.status}
                                                        </Link>
                                                    </div>
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
                                </>
                            )}
                        </div>

                        {/* Sticky Action Footer (Never Clipped) */}
                        <div className="shrink-0 space-y-2 border-t border-slate-200/80 bg-white/80 p-3.5 backdrop-blur-md dark:border-white/[0.1] dark:bg-[#0B1222]/85">
                            <div className="flex gap-2">
                                {myPresence.zone !== selectedRoom.id && (
                                    <button
                                        type="button"
                                        onClick={() => moveToPosition(selectedRoom.id)}
                                        className="flex-1 rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 dark:border-[#668CFF]/40 dark:bg-[#668CFF]/15 dark:text-[#8DA8FF]"
                                    >
                                        Pergi ke Zona Ini
                                    </button>
                                )}
                                {myPresence.seat_id && (
                                    <button
                                        type="button"
                                        onClick={() =>
                                            handleClickSeat({
                                                id: myPresence.seat_id!,
                                                zone: myPresence.zone,
                                                zone_id: 0,
                                                seat_key: myPresence.seat_key ?? '',
                                                pos_x: 0,
                                                pos_y: 0,
                                                pos_z: 0,
                                                rotation: 0,
                                                type: 'desk',
                                                assigned_user_id: null,
                                                is_hot_desk: true,
                                                occupied_by: null,
                                            })
                                        }
                                        className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 transition hover:bg-amber-100 dark:border-amber-400/30 dark:bg-amber-500/15 dark:text-amber-300"
                                    >
                                        Berdiri
                                    </button>
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-1.5">
                                <button
                                    type="button"
                                    onClick={toggleFocusMode}
                                    className={`inline-flex items-center justify-center gap-1 rounded-xl border px-2.5 py-1.5 text-[11px] font-semibold transition ${
                                        myPresence.status_key === 'dnd' &&
                                        myPresence.custom_status_text === 'Focus Mode'
                                            ? 'border-purple-400 bg-purple-50 text-purple-700 dark:border-purple-500/40 dark:bg-purple-500/15 dark:text-purple-300'
                                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.05] dark:text-[#A7B4CB]'
                                    }`}
                                >
                                    <Target className="h-3 w-3" />
                                    Focus Mode
                                </button>
                                <button
                                    type="button"
                                    onClick={() =>
                                        setInteractiveModal(
                                            selectedRoom.id === 'project'
                                                ? 'project_board'
                                                : selectedRoom.id === 'lounge'
                                                  ? 'coffee_machine'
                                                  : 'reception',
                                        )
                                    }
                                    className="inline-flex items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.05] dark:text-[#A7B4CB]"
                                >
                                    {selectedRoom.id === 'project' ? (
                                        <>
                                            <Kanban className="h-3 w-3 text-amber-600" />
                                            Kanban Board
                                        </>
                                    ) : selectedRoom.id === 'lounge' ? (
                                        <>
                                            <Coffee className="h-3 w-3 text-emerald-600" />
                                            Ajak Ngopi
                                        </>
                                    ) : (
                                        <>
                                            <UserPlus className="h-3 w-3 text-teal-600" />
                                            Tamu ({visitors.length})
                                        </>
                                    )}
                                </button>
                            </div>
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

                {/* 1:1 Direct Message Drawer */}
                {dmTarget && (
                    <div className="krevia-glass-elevated absolute bottom-4 left-4 z-30 flex h-96 w-80 max-w-[calc(100%-2rem)] flex-col overflow-hidden rounded-2xl p-3.5 shadow-2xl">
                        <div className="mb-2 flex items-center justify-between border-b border-slate-200/80 pb-2 dark:border-white/[0.1]">
                            <div className="flex min-w-0 items-center gap-2">
                                <UserAvatar
                                    name={dmTarget.name}
                                    avatarUrl={dmTarget.avatar_url}
                                    avatarColor={dmTarget.avatar_color}
                                    size="xs"
                                />
                                <div className="min-w-0">
                                    <p className="truncate text-xs font-bold text-slate-900 dark:text-[#F4F7FF]">
                                        {dmTarget.name}
                                    </p>
                                    <p className="text-[10px] text-slate-500 dark:text-[#71819C]">
                                        Direct Message · {dmTarget.status}
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setDmTarget(null)}
                                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <div className="min-h-0 flex-1">
                            <OfficeChatPanel
                                scope="dm"
                                otherUserId={dmTarget.id}
                                myUserId={myPresence.id}
                                canSendUrgent={isAdminUser}
                                emptyLabel={`Mulai percakapan pribadi dengan ${dmTarget.name}.`}
                                readXsrfToken={readXsrfToken}
                                incomingMessage={incomingMsg}
                                deletedMessageId={deletedMsgId}
                                onUnreadChange={setUnread}
                            />
                        </div>
                    </div>
                )}

                <ActiveMeetingModal
                    meeting={activeCallMeeting}
                    quickCall={quickCall}
                    members={members}
                    myUserId={myPresence.id}
                    readXsrfToken={readXsrfToken}
                    onClose={() => {
                        setActiveCallMeeting(null);
                        setQuickCall(null);
                    }}
                    onMeetingsChange={setMeetings}
                    onMeetingUpdated={setActiveCallMeeting}
                    onToast={showToast}
                />

                <OfficeInteractiveModals
                    activeModal={interactiveModal}
                    visitors={visitors}
                    crmOptions={initialCrmOptions ?? { companies: [], contacts: [] }}
                    members={members}
                    myUserId={myPresence.id}
                    isAdmin={isAdminUser}
                    readXsrfToken={readXsrfToken}
                    onClose={() => setInteractiveModal(null)}
                    onVisitorsChange={setVisitors}
                    onPresenceUpdated={(p) => setMyPresence((prev) => ({ ...prev, ...p }))}
                    onToast={showToast}
                />

                <OfficeProductivityModal
                    activeModal={productivityModal}
                    standups={standups}
                    selectedZone={selectedRoom ?? null}
                    projects={initialProjects ?? []}
                    myUserId={myPresence.id}
                    isAdmin={isAdminUser}
                    readXsrfToken={readXsrfToken}
                    onClose={() => setProductivityModal(null)}
                    onStandupsChange={setStandups}
                    onToast={showToast}
                />

                {incomingSummon && (
                    <div className="fixed right-4 bottom-4 z-50 max-w-sm rounded-2xl border border-purple-300 bg-white p-3.5 shadow-2xl dark:border-purple-500/40 dark:bg-[#0D1628]">
                        <p className="text-xs font-bold text-slate-900 dark:text-[#F4F7FF]">
                            📢 {incomingSummon.from_name} memanggil Anda ke {incomingSummon.zone_name}
                        </p>
                        <p className="mt-0.5 text-[11px] text-slate-500 dark:text-[#A7B4CB]">
                            {incomingSummon.note}
                        </p>
                        <div className="mt-2.5 flex gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    moveToPosition(incomingSummon.zone_slug);
                                    setSelectedRoomId(incomingSummon.zone_slug);
                                    setIncomingSummon(null);
                                }}
                                className="rounded-lg bg-purple-600 px-3 py-1 text-xs font-semibold text-white hover:bg-purple-700"
                            >
                                Pindah ke Zona
                            </button>
                            <button
                                type="button"
                                onClick={() => setIncomingSummon(null)}
                                className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 dark:border-white/10 dark:text-[#A7B4CB]"
                            >
                                Nanti
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </AppShell>
    );
}
