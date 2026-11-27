import { UserAvatar } from '@/Components/shared/UserAvatar';
import type {
    CameraCommand,
    VirtualMemberData,
    VirtualRoomData,
} from '@/Components/virtual-office/OfficeScene3D';
import { AppShell } from '@/Layouts/AppShell';
import type { PageProps } from '@/types';
import { Head, Link } from '@inertiajs/react';
import {
    ArrowUpRight,
    Building2,
    Compass,
    Layers,
    Maximize2,
    Radio,
    RotateCcw,
    Users,
    X,
    ZoomIn,
    ZoomOut,
} from 'lucide-react';
import { Suspense, lazy, useCallback, useMemo, useState } from 'react';

const OfficeScene3D = lazy(() => import('@/Components/virtual-office/OfficeScene3D'));

interface VirtualOfficeProps extends PageProps {
    rooms: VirtualRoomData[];
    members: VirtualMemberData[];
    recentAnnouncements: Array<{
        id: number;
        code: string;
        title: string;
        priority: string;
        published_at: string | null;
    }>;
}

export default function VirtualOfficeIndex({
    rooms,
    members,
    recentAnnouncements,
}: VirtualOfficeProps) {
    const [selectedRoomId, setSelectedRoomId] = useState<string | null>('workspace');
    const [cameraCommand, setCameraCommand] = useState<CameraCommand | null>(null);
    const [webglFailed, setWebglFailed] = useState(false);

    const selectedRoom = useMemo(
        () => rooms.find((r) => r.id === selectedRoomId) ?? null,
        [rooms, selectedRoomId],
    );

    const roomMembers = useMemo(
        () => members.filter((m) => m.zone === selectedRoomId),
        [members, selectedRoomId],
    );

    const handleSelectRoom = useCallback((roomId: string) => {
        setSelectedRoomId(roomId);
    }, []);

    const focusRoom = (roomId: string) => {
        setSelectedRoomId(roomId);
        setCameraCommand({ type: 'focusRoom', roomId, seq: Date.now() });
    };

    return (
        <AppShell
            title="Virtual Office"
            subtitle="Interactive 3D Krevia Digital Headquarters — Explore zones, team presence, and live KDMS modules"
            actions={
                <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-xl border border-[#42C99A]/35 bg-[#42C99A]/10 px-3 py-1.5 text-xs font-semibold text-[#42C99A]">
                        <span className="h-2 w-2 rounded-full bg-[#42C99A] shadow-[0_0_8px_#42C99A]" />
                        {members.length} Active Members
                    </span>
                    <Link
                        href="/dashboard"
                        className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.12] bg-white/[0.055] px-3 py-1.5 text-xs font-semibold text-[#F4F7FF] transition hover:bg-white/[0.1]"
                    >
                        <Compass className="h-3.5 w-3.5 text-[#45D8E8]" />
                        Dashboard
                    </Link>
                </div>
            }
        >
            <Head title="Virtual Office" />

            {/* Full-Width 3D Isometric Office Canvas with Floating Glass HUD */}
            <div className="relative h-[calc(100vh-13.5rem)] min-h-[540px] w-full overflow-hidden rounded-2xl border border-white/[0.12] bg-[#070B16] shadow-[0_24px_64px_-20px_rgba(0,0,0,0.85)]">
                {/* Ambient Aurora Backdrop */}
                <div
                    className="pointer-events-none absolute inset-0"
                    style={{
                        background:
                            'radial-gradient(640px circle at 15% 15%, rgba(102,140,255,0.14), transparent 55%), radial-gradient(560px circle at 85% 80%, rgba(69,216,232,0.10), transparent 55%)',
                    }}
                />

                {/* 3D Canvas or WebGL Fallback */}
                {webglFailed ? (
                    <div className="relative z-10 flex h-full flex-col items-center justify-center p-6 text-center">
                        <Building2 className="mb-3 h-10 w-10 text-[#668CFF]" />
                        <h2 className="font-display text-lg font-bold text-[#F4F7FF]">
                            3D WebGL View Unavailable
                        </h2>
                        <p className="mt-1 max-w-md text-xs text-[#A7B4CB]">
                            Your device or browser does not currently support WebGL acceleration. You can still
                            browse and jump into every Krevia Virtual Office zone below.
                        </p>
                        <div className="mt-6 grid w-full max-w-3xl gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {rooms.map((room) => (
                                <button
                                    key={room.id}
                                    type="button"
                                    onClick={() => setSelectedRoomId(room.id)}
                                    className="krevia-glass krevia-card-hover rounded-2xl p-4 text-left"
                                >
                                    <span
                                        className="text-[10px] font-bold tracking-wider uppercase"
                                        style={{ color: room.accent }}
                                    >
                                        {room.code}
                                    </span>
                                    <p className="mt-1 font-display text-sm font-bold text-[#F4F7FF]">
                                        {room.name}
                                    </p>
                                    <p className="mt-1 line-clamp-2 text-[11px] text-[#A7B4CB]">
                                        {room.description}
                                    </p>
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    <Suspense
                        fallback={
                            <div className="flex h-full items-center justify-center text-xs text-[#A7B4CB]">
                                Loading 3D Krevia Headquarters...
                            </div>
                        }
                    >
                        <OfficeScene3D
                            rooms={rooms}
                            members={members}
                            selectedRoomId={selectedRoomId}
                            onSelectRoom={handleSelectRoom}
                            cameraCommand={cameraCommand}
                            onWebGLError={() => setWebglFailed(true)}
                        />
                    </Suspense>
                )}

                {/* Top-Left: Zone Quick Jump Pills */}
                <div className="pointer-events-auto absolute top-4 left-4 z-20 flex max-w-[calc(100%-2rem)] flex-wrap items-center gap-1.5">
                    {rooms.map((room) => {
                        const active = selectedRoomId === room.id;
                        return (
                            <button
                                key={room.id}
                                type="button"
                                onClick={() => focusRoom(room.id)}
                                className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-[11px] font-semibold backdrop-blur-md transition ${
                                    active
                                        ? 'border-white/25 bg-[#15223A]/90 text-[#F4F7FF] shadow-[0_0_18px_rgba(102,140,255,0.28)]'
                                        : 'border-white/[0.11] bg-[#0B1222]/75 text-[#A7B4CB] hover:bg-[#15223A]/80 hover:text-[#F4F7FF]'
                                }`}
                            >
                                <span
                                    className="h-2 w-2 rounded-full"
                                    style={{ backgroundColor: room.accent }}
                                />
                                {room.name}
                            </button>
                        );
                    })}
                </div>

                {/* Bottom-Left: Camera Controls HUD */}
                {!webglFailed && (
                    <div className="krevia-glass-elevated absolute bottom-4 left-4 z-20 flex items-center gap-1 rounded-2xl p-1.5">
                        <button
                            type="button"
                            onClick={() => setCameraCommand({ type: 'zoomIn', seq: Date.now() })}
                            title="Zoom In"
                            className="rounded-xl p-2 text-[#A7B4CB] transition hover:bg-white/[0.1] hover:text-[#F4F7FF]"
                        >
                            <ZoomIn className="h-4 w-4" />
                        </button>
                        <button
                            type="button"
                            onClick={() => setCameraCommand({ type: 'zoomOut', seq: Date.now() })}
                            title="Zoom Out"
                            className="rounded-xl p-2 text-[#A7B4CB] transition hover:bg-white/[0.1] hover:text-[#F4F7FF]"
                        >
                            <ZoomOut className="h-4 w-4" />
                        </button>
                        <div className="mx-0.5 h-5 w-px bg-white/[0.12]" />
                        <button
                            type="button"
                            onClick={() => setCameraCommand({ type: 'topDown', seq: Date.now() })}
                            title="Top-Down View"
                            className="inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-[11px] font-semibold text-[#A7B4CB] transition hover:bg-white/[0.1] hover:text-[#F4F7FF]"
                        >
                            <Layers className="h-3.5 w-3.5 text-[#45D8E8]" />
                            <span className="hidden sm:inline">Top-Down</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setCameraCommand({ type: 'reset', seq: Date.now() })}
                            title="Reset Isometric Camera"
                            className="inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-[11px] font-semibold text-[#A7B4CB] transition hover:bg-white/[0.1] hover:text-[#F4F7FF]"
                        >
                            <RotateCcw className="h-3.5 w-3.5 text-[#668CFF]" />
                            <span className="hidden sm:inline">Reset</span>
                        </button>
                    </div>
                )}

                {/* Right Floating Glass Panel: Selected Room Details */}
                {selectedRoom && (
                    <div className="krevia-glass-elevated absolute top-16 right-4 z-20 flex max-h-[calc(100%-5rem)] w-80 max-w-[calc(100%-2rem)] flex-col overflow-y-auto rounded-2xl p-4 sm:top-4">
                        <div className="flex items-start justify-between gap-2">
                            <div>
                                <div className="flex items-center gap-2">
                                    <span
                                        className="h-2.5 w-2.5 rounded-full"
                                        style={{
                                            backgroundColor: selectedRoom.accent,
                                            boxShadow: `0 0 10px ${selectedRoom.accent}`,
                                        }}
                                    />
                                    <span className="font-mono text-[10px] font-bold tracking-wider text-[#A7B4CB] uppercase">
                                        {selectedRoom.code}
                                    </span>
                                </div>
                                <h2 className="font-display mt-1 text-base font-bold text-[#F4F7FF]">
                                    {selectedRoom.name}
                                </h2>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedRoomId(null)}
                                className="rounded-lg p-1 text-[#71819C] transition hover:bg-white/[0.08] hover:text-[#F4F7FF]"
                                aria-label="Close room panel"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <p className="mt-2 text-xs leading-relaxed text-[#A7B4CB]">
                            {selectedRoom.description}
                        </p>

                        {/* Room Metrics */}
                        <div className="mt-3 grid grid-cols-2 gap-2">
                            {selectedRoom.metrics.map((m) => (
                                <div
                                    key={m.label}
                                    className="rounded-xl border border-white/[0.09] bg-white/[0.04] px-3 py-2"
                                >
                                    <p className="text-[10px] font-medium text-[#71819C]">{m.label}</p>
                                    <p className="mt-0.5 font-mono text-sm font-bold text-[#F4F7FF] tabular-nums">
                                        {m.value}
                                    </p>
                                </div>
                            ))}
                        </div>

                        {/* Members in Room */}
                        <div className="mt-4">
                            <div className="mb-2 flex items-center justify-between text-[11px] font-semibold text-[#A7B4CB]">
                                <span className="inline-flex items-center gap-1.5">
                                    <Users className="h-3.5 w-3.5 text-[#45D8E8]" />
                                    Members in Zone
                                </span>
                                <span className="font-mono text-[#71819C]">
                                    {roomMembers.length} / {selectedRoom.capacity}
                                </span>
                            </div>
                            {roomMembers.length === 0 ? (
                                <p className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-[11px] text-[#71819C]">
                                    No members currently stationed here.
                                </p>
                            ) : (
                                <div className="space-y-1.5">
                                    {roomMembers.map((member) => (
                                        <Link
                                            key={member.id}
                                            href={`/people/${member.id}`}
                                            className="flex items-center justify-between gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-2.5 py-1.5 transition hover:border-[#668CFF]/40 hover:bg-white/[0.08]"
                                        >
                                            <div className="flex min-w-0 items-center gap-2">
                                                <UserAvatar
                                                    name={member.name}
                                                    avatarUrl={member.avatar_url}
                                                    avatarColor={member.avatar_color}
                                                    size="xs"
                                                />
                                                <div className="min-w-0">
                                                    <p className="truncate text-xs font-semibold text-[#F4F7FF]">
                                                        {member.name}
                                                    </p>
                                                    <p className="truncate text-[10px] text-[#71819C]">
                                                        {member.position}
                                                    </p>
                                                </div>
                                            </div>
                                            <span className="shrink-0 rounded-full bg-[#42C99A]/15 px-2 py-0.5 text-[10px] font-semibold text-[#42C99A]">
                                                {member.status}
                                            </span>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Contextual KDMS Actions */}
                        <div className="mt-4 flex flex-col gap-2 border-t border-white/[0.1] pt-3">
                            <Link
                                href={selectedRoom.primary_action.href}
                                className="inline-flex items-center justify-between rounded-xl bg-gradient-to-r from-[#668CFF] to-[#45D8E8] px-3.5 py-2 text-xs font-semibold text-[#070B16] transition hover:brightness-110"
                            >
                                <span>{selectedRoom.primary_action.label}</span>
                                <ArrowUpRight className="h-3.5 w-3.5" />
                            </Link>
                            <Link
                                href={selectedRoom.secondary_action.href}
                                className="inline-flex items-center justify-between rounded-xl border border-white/[0.12] bg-white/[0.05] px-3.5 py-2 text-xs font-semibold text-[#F4F7FF] transition hover:bg-white/[0.1]"
                            >
                                <span>{selectedRoom.secondary_action.label}</span>
                                <Maximize2 className="h-3.5 w-3.5 text-[#A7B4CB]" />
                            </Link>
                        </div>

                        {selectedRoom.id === 'reception' && recentAnnouncements.length > 0 && (
                            <div className="mt-3 border-t border-white/[0.1] pt-3">
                                <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold tracking-wider text-[#45D8E8] uppercase">
                                    <Radio className="h-3 w-3" />
                                    Lobby Notice Board
                                </p>
                                <div className="space-y-1.5">
                                    {recentAnnouncements.map((a) => (
                                        <Link
                                            key={a.id}
                                            href="/announcements"
                                            className="block rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1.5 text-[11px] text-[#F4F7FF] hover:bg-white/[0.07]"
                                        >
                                            <p className="line-clamp-1 font-medium">{a.title}</p>
                                            <p className="text-[10px] text-[#71819C]">
                                                {a.code} · {a.published_at ?? '—'}
                                            </p>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </AppShell>
    );
}
