import type { ResolvedTheme } from '@/lib/theme';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

export interface VirtualRoomData {
    id: string;
    name: string;
    code: string;
    accent: string;
    description: string;
    capacity: number;
    primary_action: { label: string; href: string };
    secondary_action: { label: string; href: string };
    metrics: Array<{ label: string; value: string | number; hint?: string }>;
}

export interface VirtualSeatData {
    id: number;
    zone: string;
    zone_id: number;
    seat_key: string;
    pos_x: number;
    pos_y: number;
    pos_z: number;
    rotation: number;
    type: string;
    assigned_user_id: number | null;
    is_hot_desk: boolean;
    occupied_by: { user_id: number; name: string } | null;
}

export interface VirtualMemberData {
    id: number;
    user_id?: number;
    name: string;
    avatar_url: string | null;
    avatar_color: string;
    position: string;
    department: string;
    zone: string;
    seat_id?: number | null;
    seat_key?: string | null;
    pos_x?: number | null;
    pos_y?: number | null;
    pos_z?: number | null;
    status: string;
    status_key?: string;
    custom_status_text?: string | null;
    custom_status_emoji?: string | null;
    last_seen_at?: string | null;
}

export type CameraCommand =
    | { type: 'reset'; seq: number }
    | { type: 'isometric'; seq: number }
    | { type: 'topDown'; seq: number }
    | { type: 'zoomIn'; seq: number }
    | { type: 'zoomOut'; seq: number }
    | { type: 'focusRoom'; roomId: string; seq: number }
    | { type: 'focusMember'; memberId: number; seq: number };

interface OfficeScene3DProps {
    theme: ResolvedTheme;
    rooms: VirtualRoomData[];
    seats: VirtualSeatData[];
    members: VirtualMemberData[];
    myUserId: number;
    selectedRoomId: string | null;
    panelOpen: boolean;
    showLabels: boolean;
    showMembers: boolean;
    onSelectRoom: (roomId: string) => void;
    onClickFloor?: (roomId: string, x: number, z: number) => void;
    onClickSeat?: (seat: VirtualSeatData) => void;
    hasLiveMeeting?: boolean;
    onClickMeetingObject?: () => void;
    onClickInteractiveObject?: (obj: 'reception' | 'project_board' | 'coffee_machine') => void;
    followMemberId?: number | null;
    onSelectMember?: (member: VirtualMemberData) => void;
    onHoverMember?: (member: VirtualMemberData | null, pos: { x: number; y: number } | null) => void;
    cameraCommand: CameraCommand | null;
    onWebGLError?: () => void;
}

interface ZoneLayout {
    id: string;
    label: string;
    x: number;
    z: number;
    w: number;
    d: number;
    lightFloor: string;
    darkFloor: string;
    accentLight: number;
    accentDark: number;
    cameraOffset: [number, number, number];
}

const ZONE_LAYOUTS: Record<string, ZoneLayout> = {
    reception: {
        id: 'reception',
        label: 'Reception & Lobby',
        x: -7.2,
        z: 4.5,
        w: 6.8,
        d: 5.2,
        lightFloor: '#dfe7eb',
        darkFloor: '#112230',
        accentLight: 0x0f766e,
        accentDark: 0x45d8e8,
        cameraOffset: [13, 11.5, 13],
    },
    workspace: {
        id: 'workspace',
        label: 'Main Workspace',
        x: -3.5,
        z: -3.6,
        w: 13.6,
        d: 7.4,
        lightFloor: '#e3e9f2',
        darkFloor: '#121e36',
        accentLight: 0x2563eb,
        accentDark: 0x668cff,
        cameraOffset: [16, 13.5, 16],
    },
    meeting: {
        id: 'meeting',
        label: 'Meeting Room',
        x: 7.2,
        z: -3.6,
        w: 7.2,
        d: 7.4,
        lightFloor: '#e6e2f3',
        darkFloor: '#191735',
        accentLight: 0x6d28d9,
        accentDark: 0xa17aff,
        cameraOffset: [13.5, 12, 13.5],
    },
    lounge: {
        id: 'lounge',
        label: 'Lounge Area',
        x: 0.4,
        z: 4.5,
        w: 6.8,
        d: 5.2,
        lightFloor: '#e2ebe5',
        darkFloor: '#102624',
        accentLight: 0x15803d,
        accentDark: 0x42c99a,
        cameraOffset: [13, 11.5, 13],
    },
    project: {
        id: 'project',
        label: 'Project Room',
        x: 7.5,
        z: 4.5,
        w: 6.4,
        d: 5.2,
        lightFloor: '#ede5d8',
        darkFloor: '#241e18',
        accentLight: 0xb45309,
        accentDark: 0xf4b860,
        cameraOffset: [13, 11.5, 13],
    },
};

const STATUS_COLORS: Record<string, number> = {
    Online: 0x16a34a,
    Available: 0x2563eb,
    Busy: 0xdc2626,
    Dnd: 0x9333ea,
    Away: 0xf59e0b,
    Offline: 0x94a3b8,
};

function createRoundedRectShape(w: number, d: number, r: number): THREE.Shape {
    const shape = new THREE.Shape();
    const hw = w / 2;
    const hd = d / 2;
    shape.moveTo(-hw + r, -hd);
    shape.lineTo(hw - r, -hd);
    shape.quadraticCurveTo(hw, -hd, hw, -hd + r);
    shape.lineTo(hw, hd - r);
    shape.quadraticCurveTo(hw, hd, hw - r, hd);
    shape.lineTo(-hw + r, hd);
    shape.quadraticCurveTo(-hw, hd, -hw, hd - r);
    shape.lineTo(-hw, -hd + r);
    shape.quadraticCurveTo(-hw, -hd, -hw + r, -hd);
    return shape;
}

function createWoodTexture(isDark: boolean, track: THREE.Texture[]): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = isDark ? '#5c4330' : '#c69c72';
    ctx.fillRect(0, 0, 256, 256);

    // Subtle oak grain & plank seams
    for (let i = 0; i < 4; i++) {
        const y = i * 64;
        ctx.fillStyle = i % 2 === 0 ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.04)';
        ctx.fillRect(0, y, 256, 64);
        ctx.strokeStyle = isDark ? 'rgba(15,23,42,0.4)' : 'rgba(92,64,38,0.22)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(256, y);
        ctx.stroke();
    }
    ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(92,64,38,0.1)';
    ctx.lineWidth = 1;
    for (let g = 0; g < 40; g++) {
        const gy = (g * 7) % 256;
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.bezierCurveTo(85, gy + 2, 170, gy - 2, 256, gy);
        ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 2);
    tex.colorSpace = THREE.SRGBColorSpace;
    track.push(tex);
    return tex;
}

function createCarpetTileTexture(baseHex: string, isDark: boolean, track: THREE.Texture[]): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = baseHex;
    ctx.fillRect(0, 0, 128, 128);

    // Subtle architectural carpet tile grid
    ctx.fillStyle = isDark ? 'rgba(255,255,255,0.025)' : 'rgba(15,23,42,0.025)';
    ctx.fillRect(0, 0, 64, 64);
    ctx.fillRect(64, 64, 64, 64);

    ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.06)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, 63, 63);
    ctx.strokeRect(64.5, 64.5, 63, 63);

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(6, 5);
    tex.colorSpace = THREE.SRGBColorSpace;
    track.push(tex);
    return tex;
}

function createMonitorCodeTexture(accentHex: string, track: THREE.Texture[]): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 144;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 256, 144);
    // Sidebar
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, 46, 144);
    // Top bar
    ctx.fillStyle = accentHex;
    ctx.fillRect(46, 0, 210, 14);
    // Code/UI lines
    const colors = ['#60a5fa', '#34d399', '#94a3b8', '#f59e0b', '#cbd5e1'];
    for (let i = 0; i < 9; i++) {
        ctx.fillStyle = colors[i % colors.length];
        const w = 40 + ((i * 37) % 120);
        ctx.fillRect(60 + (i % 3) * 14, 26 + i * 12, w, 5);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    track.push(tex);
    return tex;
}

function createScreenTexture(isDark: boolean, track: THREE.Texture[]): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = isDark ? '#0f172a' : '#1e293b';
    ctx.fillRect(0, 0, 512, 256);

    // Header
    ctx.fillStyle = '#6d28d9';
    ctx.fillRect(0, 0, 512, 42);
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 20px Inter, system-ui, sans-serif';
    ctx.fillText('KREVIA · Weekly Sprint & Delivery', 20, 28);

    // 3 KPI cards on screen
    const cardColors = ['#2563eb', '#16a34a', '#d97706'];
    for (let i = 0; i < 3; i++) {
        const cx = 20 + i * 160;
        ctx.fillStyle = '#0b1222';
        ctx.beginPath();
        ctx.roundRect(cx, 60, 146, 72, 8);
        ctx.fill();
        ctx.fillStyle = cardColors[i];
        ctx.fillRect(cx + 12, 74, 48, 8);
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(cx + 12, 94, 80, 16);
        ctx.fillStyle = '#64748b';
        ctx.fillRect(cx + 12, 116, 110, 6);
    }

    // Bottom chart bar graph
    ctx.fillStyle = '#0b1222';
    ctx.beginPath();
    ctx.roundRect(20, 146, 472, 92, 8);
    ctx.fill();
    for (let b = 0; b < 10; b++) {
        const bh = 22 + ((b * 19) % 52);
        ctx.fillStyle = b === 9 ? '#22c55e' : '#3b82f6';
        ctx.fillRect(42 + b * 44, 224 - bh, 24, bh);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    track.push(tex);
    return tex;
}

function createKanbanBoardTexture(track: THREE.Texture[]): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, 512, 256);

    // Header
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, 512, 34);
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 16px Inter, system-ui, sans-serif';
    ctx.fillText('PROJECT KANBAN BOARD', 18, 22);

    const cols = [
        { title: 'TO DO', color: '#64748b', cards: ['#fde68a', '#bae6fd'] },
        { title: 'IN PROGRESS', color: '#2563eb', cards: ['#93c5fd', '#fcd34d', '#c4b5fd'] },
        { title: 'REVIEW', color: '#d97706', cards: ['#fed7aa'] },
        { title: 'DONE', color: '#16a34a', cards: ['#bbf7d0', '#bbf7d0'] },
    ];
    cols.forEach((col, ci) => {
        const x = 14 + ci * 123;
        ctx.fillStyle = '#e2e8f0';
        ctx.beginPath();
        ctx.roundRect(x, 46, 114, 196, 6);
        ctx.fill();

        ctx.fillStyle = col.color;
        ctx.fillRect(x + 8, 54, 98, 16);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px Inter, system-ui, sans-serif';
        ctx.fillText(col.title, x + 14, 66);

        col.cards.forEach((cc, idx) => {
            ctx.fillStyle = cc;
            ctx.beginPath();
            ctx.roundRect(x + 8, 80 + idx * 44, 98, 36, 4);
            ctx.fill();
            ctx.fillStyle = 'rgba(15,23,42,0.55)';
            ctx.fillRect(x + 14, 90 + idx * 44, 64, 5);
            ctx.fillStyle = 'rgba(15,23,42,0.28)';
            ctx.fillRect(x + 14, 100 + idx * 44, 42, 4);
        });
    });

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    track.push(tex);
    return tex;
}

function createReceptionSignTexture(isDark: boolean, track: THREE.Texture[]): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 192;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = isDark ? '#0f172a' : '#1e293b';
    ctx.fillRect(0, 0, 512, 192);
    ctx.strokeStyle = '#14b8a6';
    ctx.lineWidth = 6;
    ctx.strokeRect(10, 10, 492, 172);

    ctx.fillStyle = '#14b8a6';
    ctx.beginPath();
    ctx.arc(82, 96, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px Inter, system-ui, sans-serif';
    ctx.fillText('KREVIA', 72, 106);

    ctx.fillStyle = '#f8fafc';
    ctx.font = '700 38px Inter, system-ui, sans-serif';
    ctx.fillText('KREVIA DIGITAL', 132, 92);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '500 18px Inter, system-ui, sans-serif';
    ctx.fillText('VIRTUAL HEADQUARTERS', 134, 126);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    track.push(tex);
    return tex;
}

function createLabelSprite(text: string, dotColorHex: string, isDark: boolean): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 340;
    canvas.height = 68;
    const ctx = canvas.getContext('2d')!;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = isDark ? 'rgba(11, 18, 34, 0.94)' : 'rgba(15, 23, 42, 0.88)';
    ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.22)' : 'rgba(255, 255, 255, 0.18)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(10, 10, 320, 48, 24);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = dotColorHex;
    ctx.beginPath();
    ctx.arc(38, 34, 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#F8FAFC';
    ctx.font = '600 20px Inter, system-ui, sans-serif';
    ctx.textBaseline = 'middle';
    const label = text.length > 19 ? `${text.slice(0, 18)}…` : text;
    ctx.fillText(label, 58, 35);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(2.55, 0.51, 1);
    sprite.renderOrder = 20;
    return sprite;
}

function easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export default function OfficeScene3D({
    theme,
    seats,
    members,
    myUserId,
    selectedRoomId,
    panelOpen,
    showLabels,
    showMembers,
    onSelectRoom,
    onClickFloor,
    onClickSeat,
    hasLiveMeeting = false,
    onClickMeetingObject,
    onClickInteractiveObject,
    followMemberId = null,
    onSelectMember,
    onHoverMember,
    cameraCommand,
    onWebGLError,
}: OfficeScene3DProps) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const selectedRoomRef = useRef<string | null>(selectedRoomId);
    const showLabelsRef = useRef(showLabels);
    const showMembersRef = useRef(showMembers);
    const panelOpenRef = useRef(panelOpen);
    const membersRef = useRef<VirtualMemberData[]>(members);
    const seatsRef = useRef<VirtualSeatData[]>(seats);
    const onSelectRoomRef = useRef(onSelectRoom);
    const onClickFloorRef = useRef(onClickFloor);
    const onClickSeatRef = useRef(onClickSeat);
    const hasLiveMeetingRef = useRef(hasLiveMeeting);
    const onClickMeetingObjectRef = useRef(onClickMeetingObject);
    const onClickInteractiveObjectRef = useRef(onClickInteractiveObject);
    const followMemberIdRef = useRef(followMemberId);
    const onSelectMemberRef = useRef(onSelectMember);
    const onHoverMemberRef = useRef(onHoverMember);
    const controlsRef = useRef<OrbitControls | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const avatarPositionsRef = useRef<Record<number, THREE.Vector3>>({});
    const syncDynamicRef = useRef<(() => void) | null>(null);
    const flyAnimRef = useRef<{
        startPos: THREE.Vector3;
        endPos: THREE.Vector3;
        startTarget: THREE.Vector3;
        endTarget: THREE.Vector3;
        startTime: number;
        duration: number;
    } | null>(null);

    selectedRoomRef.current = selectedRoomId;
    showLabelsRef.current = showLabels;
    showMembersRef.current = showMembers;
    panelOpenRef.current = panelOpen;
    membersRef.current = members;
    seatsRef.current = seats;
    onSelectRoomRef.current = onSelectRoom;
    onClickFloorRef.current = onClickFloor;
    onClickSeatRef.current = onClickSeat;
    hasLiveMeetingRef.current = hasLiveMeeting;
    onClickMeetingObjectRef.current = onClickMeetingObject;
    onClickInteractiveObjectRef.current = onClickInteractiveObject;
    followMemberIdRef.current = followMemberId;
    onSelectMemberRef.current = onSelectMember;
    onHoverMemberRef.current = onHoverMember;

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const isDark = theme === 'dark';
        const reducedMotion =
            typeof window !== 'undefined' &&
            window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

        let renderer: THREE.WebGLRenderer;
        try {
            renderer = new THREE.WebGLRenderer({
                antialias: true,
                alpha: true,
                powerPreference: 'high-performance',
            });
        } catch {
            onWebGLError?.();
            return;
        }

        const width = container.clientWidth || 960;
        const height = container.clientHeight || 580;
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setSize(width, height);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = isDark ? 1.12 : 0.96;
        renderer.outputColorSpace = THREE.SRGBColorSpace;

        container.innerHTML = '';
        container.appendChild(renderer.domElement);

        const scene = new THREE.Scene();
        scene.fog = new THREE.FogExp2(isDark ? 0x070b16 : 0xe9eef5, isDark ? 0.0085 : 0.005);

        const pmrem = new THREE.PMREMGenerator(renderer);
        const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
        scene.environment = envTex;
        scene.environmentIntensity = isDark ? 0.8 : 0.45;

        const camera = new THREE.PerspectiveCamera(27, width / height, 0.5, 160);
        const offsetX = panelOpenRef.current ? 2.2 : 0;
        camera.position.set(25 + offsetX, 21.5, 25);
        cameraRef.current = camera;

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.075;
        controls.minDistance = 12;
        controls.maxDistance = 48;
        controls.minPolarAngle = 0.12;
        controls.maxPolarAngle = Math.PI / 2.22;
        controls.target.set(offsetX, 0, 0);
        controlsRef.current = controls;

        // Balanced architectural lighting (prevents white blowout, reveals wood & shadows)
        const hemiLight = new THREE.HemisphereLight(
            isDark ? 0x7b9dff : 0xf8fafc,
            isDark ? 0x070b16 : 0x94a3b8,
            isDark ? 0.8 : 0.72,
        );
        scene.add(hemiLight);

        const dirLight = new THREE.DirectionalLight(isDark ? 0xe0ecff : 0xfff8ed, isDark ? 1.4 : 1.35);
        dirLight.position.set(17, 27, 15);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.set(2048, 2048);
        dirLight.shadow.camera.near = 4;
        dirLight.shadow.camera.far = 70;
        const d = 19;
        dirLight.shadow.camera.left = -d;
        dirLight.shadow.camera.right = d;
        dirLight.shadow.camera.top = d;
        dirLight.shadow.camera.bottom = -d;
        dirLight.shadow.bias = -0.0004;
        dirLight.shadow.normalBias = 0.02;
        scene.add(dirLight);

        // Warm interior architectural accent lights
        const meetingWarmLight = new THREE.PointLight(isDark ? 0xa17aff : 0xffe4b5, isDark ? 1.1 : 0.65, 14);
        meetingWarmLight.position.set(7.2, 2.7, -3.6);
        scene.add(meetingWarmLight);

        const loungeWarmLight = new THREE.PointLight(isDark ? 0x45d8e8 : 0xffe8c2, isDark ? 0.9 : 0.5, 14);
        loungeWarmLight.position.set(0.4, 2.5, 4.5);
        scene.add(loungeWarmLight);

        // Procedural Textures
        const disposableTextures: THREE.Texture[] = [];
        const woodTex = createWoodTexture(isDark, disposableTextures);
        const screenTex = createScreenTexture(isDark, disposableTextures);
        const kanbanTex = createKanbanBoardTexture(disposableTextures);
        const receptionSignTex = createReceptionSignTexture(isDark, disposableTextures);
        const monitorTexBlue = createMonitorCodeTexture('#3b82f6', disposableTextures);
        const monitorTexTeal = createMonitorCodeTexture('#0d9488', disposableTextures);

        // Shared Architectural PBR Materials
        const baseSlabMat = new THREE.MeshStandardMaterial({
            color: isDark ? 0x0b1222 : 0xdbe3ee,
            roughness: 0.7,
            metalness: 0.1,
        });
        const plinthTrimMat = new THREE.MeshStandardMaterial({
            color: isDark ? 0x16223a : 0x334155,
            roughness: 0.45,
            metalness: 0.35,
        });
        const wallMat = new THREE.MeshStandardMaterial({
            color: isDark ? 0x131d33 : 0xf1f5f9,
            roughness: 0.85,
            metalness: 0.02,
        });
        const baseboardMat = new THREE.MeshStandardMaterial({
            color: isDark ? 0x0b1222 : 0x1e293b,
            roughness: 0.5,
            metalness: 0.25,
        });
        const woodMat = new THREE.MeshStandardMaterial({
            map: woodTex,
            roughness: 0.55,
            metalness: 0.05,
        });
        const deskTopMat = new THREE.MeshStandardMaterial({
            color: isDark ? 0x1c2c4a : 0xf8fafc,
            roughness: 0.4,
            metalness: 0.06,
        });
        const deskMattePad = new THREE.MeshStandardMaterial({
            color: isDark ? 0x0f172a : 0x334155,
            roughness: 0.9,
        });
        const metalMat = new THREE.MeshStandardMaterial({
            color: isDark ? 0x334155 : 0x475569,
            roughness: 0.32,
            metalness: 0.72,
        });
        const chairMat = new THREE.MeshStandardMaterial({
            color: isDark ? 0x1e293b : 0x1e293b,
            roughness: 0.75,
            metalness: 0.08,
        });
        const glassMat = new THREE.MeshPhysicalMaterial({
            color: isDark ? 0x8bb8ff : 0xcce7f5,
            transparent: true,
            opacity: isDark ? 0.22 : 0.36,
            roughness: 0.08,
            metalness: 0.05,
        });
        const sofaMat = new THREE.MeshStandardMaterial({
            color: isDark ? 0x223a5e : 0x475569,
            roughness: 0.88,
            metalness: 0.02,
        });
        const cushionAccentMat = new THREE.MeshStandardMaterial({
            color: isDark ? 0xd97706 : 0xe07a5f,
            roughness: 0.85,
        });
        const plantPotMat = new THREE.MeshStandardMaterial({
            color: isDark ? 0x1e293b : 0xcbd5e1,
            roughness: 0.65,
            metalness: 0.05,
        });
        const plantLeafMat = new THREE.MeshStandardMaterial({
            color: isDark ? 0x2ca87f : 0x16a34a,
            roughness: 0.7,
            metalness: 0.02,
        });
        const aoMat = new THREE.MeshBasicMaterial({
            color: 0x0f172a,
            transparent: true,
            opacity: isDark ? 0.32 : 0.12,
        });

        // Main Architectural Floor Slab + Dark Perimeter Plinth + Subtle Studio Grid
        const slabShape = createRoundedRectShape(24.6, 17.6, 0.75);
        const slabGeo = new THREE.ExtrudeGeometry(slabShape, {
            depth: 0.44,
            bevelEnabled: true,
            bevelThickness: 0.05,
            bevelSize: 0.05,
            bevelSegments: 2,
        });
        slabGeo.rotateX(Math.PI / 2);
        const floorSlab = new THREE.Mesh(slabGeo, baseSlabMat);
        floorSlab.position.set(0.2, -0.02, 0.3);
        floorSlab.receiveShadow = true;
        scene.add(floorSlab);

        const gridHelper = new THREE.GridHelper(
            40,
            40,
            isDark ? 0x1e3358 : 0xcbd5e1,
            isDark ? 0x121e38 : 0xdbe3ee,
        );
        gridHelper.position.y = -0.48;
        scene.add(gridHelper);

        // ============================================================
        // ARCHITECTURAL CUTAWAY OFFICE SHELL (Back & Left Walls + Windows + Slats)
        // ============================================================
        const shellGroup = new THREE.Group();
        const wallH = 2.95;

        // Back perimeter wall (z = -7.65, x = -10.8 .. 11.2 -> width 22.0)
        const backWall = new THREE.Mesh(new THREE.BoxGeometry(22.0, wallH, 0.24), wallMat);
        backWall.position.set(0.2, wallH / 2 + 0.05, -7.65);
        backWall.castShadow = true;
        backWall.receiveShadow = true;
        const backBase = new THREE.Mesh(new THREE.BoxGeometry(22.02, 0.16, 0.27), baseboardMat);
        backBase.position.set(0.2, 0.13, -7.65);
        shellGroup.add(backWall, backBase);

        // Left perimeter wall (x = -10.75, z = -7.65 .. 7.4 -> depth 15.05)
        const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.24, wallH, 15.1), wallMat);
        leftWall.position.set(-10.75, wallH / 2 + 0.05, -0.1);
        leftWall.castShadow = true;
        leftWall.receiveShadow = true;
        const leftBase = new THREE.Mesh(new THREE.BoxGeometry(0.27, 0.16, 15.12), baseboardMat);
        leftBase.position.set(-10.75, 0.13, -0.1);
        shellGroup.add(leftWall, leftBase);

        // Architectural Windows along Back Wall (Main Workspace)
        [-7.6, -4.6, -1.6].forEach((wx) => {
            const frame = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.55, 0.3), plinthTrimMat);
            frame.position.set(wx, 1.8, -7.65);
            const pane = new THREE.Mesh(new THREE.BoxGeometry(2.04, 1.4, 0.32), glassMat);
            pane.position.set(wx, 1.8, -7.65);
            const mullion = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.4, 0.33), plinthTrimMat);
            mullion.position.set(wx, 1.8, -7.65);
            shellGroup.add(frame, pane, mullion);
        });

        // Architectural Windows along Left Wall
        [-4.2, 4.2].forEach((wz) => {
            const frame = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.55, 2.4), plinthTrimMat);
            frame.position.set(-10.75, 1.8, wz);
            const pane = new THREE.Mesh(new THREE.BoxGeometry(0.32, 1.4, 2.24), glassMat);
            pane.position.set(-10.75, 1.8, wz);
            shellGroup.add(frame, pane);
        });

        // Warm Oak Acoustic Wall Slat Panel behind Workspace-Right & Lounge Divider
        for (let s = 0; s < 10; s++) {
            const slat = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.6, 0.06), woodMat);
            slat.position.set(1.2 + s * 0.18, 1.4, -7.5);
            slat.castShadow = true;
            shellGroup.add(slat);
        }

        // Low Architectural Partition between Reception & Lounge (x = -3.4, z = 4.5)
        const recDividerBase = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.05, 4.4), woodMat);
        recDividerBase.position.set(-3.4, 0.58, 4.5);
        recDividerBase.castShadow = true;
        const recDividerGlass = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.8, 4.2), glassMat);
        recDividerGlass.position.set(-3.4, 1.5, 4.5);
        shellGroup.add(recDividerBase, recDividerGlass);

        // Half-height Glass Partition between Lounge & Project Room (x = 4.05, z = 4.5)
        const projDividerBase = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.95, 4.4), baseboardMat);
        projDividerBase.position.set(4.05, 0.53, 4.5);
        projDividerBase.castShadow = true;
        const projDividerGlass = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.95, 4.2), glassMat);
        projDividerGlass.position.set(4.05, 1.48, 4.5);
        shellGroup.add(projDividerBase, projDividerGlass);

        scene.add(shellGroup);

        // Registries
        const interactiveMeshes: THREE.Object3D[] = [];
        const zoneVisuals: Record<
            string,
            {
                group: THREE.Group;
                floorMat: THREE.MeshStandardMaterial;
                borderMat: THREE.LineBasicMaterial;
                labelSprite: THREE.Sprite;
            }
        > = {};
        const avatarEntries: Array<{
            member: VirtualMemberData;
            group: THREE.Group;
            ring: THREE.Mesh;
            label: THREE.Sprite;
            baseY: number;
            phase: number;
        }> = [];

        const tagRoom = (obj: THREE.Object3D, roomId: string) => {
            obj.traverse((child) => {
                child.userData.roomId = roomId;
            });
            interactiveMeshes.push(obj);
        };

        const addFakeAO = (parent: THREE.Object3D, x: number, z: number, w: number, d: number) => {
            const ao = new THREE.Mesh(new THREE.PlaneGeometry(w, d), aoMat);
            ao.rotation.x = -Math.PI / 2;
            ao.position.set(x, 0.078, z);
            parent.add(ao);
        };

        const addPlanter = (parent: THREE.Group, x: number, z: number, scale = 1) => {
            const g = new THREE.Group();
            const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.2, 0.48, 16), plantPotMat);
            pot.position.y = 0.24;
            pot.castShadow = true;
            const soil = new THREE.Mesh(
                new THREE.CylinderGeometry(0.25, 0.25, 0.04, 14),
                new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.95 }),
            );
            soil.position.y = 0.47;
            const trunk = new THREE.Mesh(
                new THREE.CylinderGeometry(0.035, 0.05, 0.45, 8),
                new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.9 }),
            );
            trunk.position.y = 0.65;
            g.add(pot, soil, trunk);

            [
                [0, 0.92, 0, 0.26],
                [0.16, 0.82, 0.1, 0.2],
                [-0.14, 0.85, -0.08, 0.21],
                [0.05, 1.06, -0.06, 0.18],
            ].forEach(([lx, ly, lz, r]) => {
                const leaf = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 1), plantLeafMat);
                leaf.position.set(lx, ly, lz);
                leaf.castShadow = true;
                g.add(leaf);
            });

            g.position.set(x, 0.07, z);
            g.scale.setScalar(scale);
            parent.add(g);
        };

        const addErgonomicChair = (parent: THREE.Group, x: number, z: number, rotY = 0) => {
            const g = new THREE.Group();
            // 5-star caster base
            for (let a = 0; a < 5; a++) {
                const leg = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.03, 0.28), metalMat);
                leg.rotation.y = (a * Math.PI * 2) / 5;
                leg.position.set(Math.sin(leg.rotation.y) * 0.13, 0.05, Math.cos(leg.rotation.y) * 0.13);
                g.add(leg);
            }
            const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.035, 0.38, 10), metalMat);
            stem.position.y = 0.24;
            const seat = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.48), chairMat);
            seat.position.set(0, 0.45, 0);
            seat.castShadow = true;
            const back = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.56, 0.06), chairMat);
            back.position.set(0, 0.76, 0.21);
            back.rotation.x = -0.08;
            back.castShadow = true;
            // Armrests
            [-0.25, 0.25].forEach((ax) => {
                const armPost = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.18, 0.04), metalMat);
                armPost.position.set(ax, 0.54, 0.02);
                const armPad = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.03, 0.26), chairMat);
                armPad.position.set(ax, 0.63, 0.02);
                g.add(armPost, armPad);
            });
            g.add(stem, seat, back);
            g.position.set(x, 0, z);
            g.rotation.y = rotY;
            parent.add(g);
        };

        const addWorkstation = (
            parent: THREE.Group,
            x: number,
            z: number,
            rotY: number,
            monTex: THREE.CanvasTexture,
        ) => {
            const g = new THREE.Group();
            addFakeAO(g, 0, 0.15, 2.0, 1.6);

            // Desk top + beveled front edge
            const top = new THREE.Mesh(new THREE.BoxGeometry(1.82, 0.06, 0.88), woodMat);
            top.position.y = 0.74;
            top.castShadow = true;
            top.receiveShadow = true;
            g.add(top);

            // Sleek U-frame metal legs
            [-0.82, 0.82].forEach((lx) => {
                const leg = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.72, 0.72), metalMat);
                leg.position.set(lx, 0.36, 0);
                leg.castShadow = true;
                g.add(leg);
            });

            // Desk mat + keyboard + mouse + coffee mug
            const matPad = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.012, 0.36), deskMattePad);
            matPad.position.set(-0.04, 0.775, 0.12);
            const kb = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.02, 0.14), metalMat);
            kb.position.set(-0.1, 0.788, 0.11);
            const mouse = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.02, 0.1), metalMat);
            mouse.position.set(0.22, 0.788, 0.12);
            const mug = new THREE.Mesh(
                new THREE.CylinderGeometry(0.045, 0.04, 0.09, 12),
                new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 }),
            );
            mug.position.set(0.62, 0.815, 0.14);
            g.add(matPad, kb, mouse, mug);

            // Dual thin-bezel monitors with real UI/code screen texture
            const bezelMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3, metalness: 0.4 });
            const screenMat = new THREE.MeshStandardMaterial({
                map: monTex,
                emissive: 0xffffff,
                emissiveMap: monTex,
                emissiveIntensity: isDark ? 0.55 : 0.3,
                roughness: 0.2,
            });
            [-0.33, 0.33].forEach((mx, idx) => {
                const bezel = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.36, 0.025), bezelMat);
                bezel.position.set(mx, 1.02, -0.22);
                bezel.rotation.y = idx === 0 ? 0.12 : -0.12;
                bezel.castShadow = true;
                const display = new THREE.Mesh(new THREE.PlaneGeometry(0.54, 0.32), screenMat);
                display.position.set(0, 0, 0.014);
                bezel.add(display);

                const stand = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.16, 0.04), metalMat);
                stand.position.set(mx, 0.84, -0.25);
                g.add(bezel, stand);
            });

            // Articulated desk lamp with warm glowing shade
            const lampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.03, 12), metalMat);
            lampBase.position.set(-0.72, 0.785, -0.24);
            const lampPole = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.38, 8), metalMat);
            lampPole.position.set(-0.72, 0.97, -0.24);
            const lampShade = new THREE.Mesh(
                new THREE.ConeGeometry(0.09, 0.1, 12),
                new THREE.MeshStandardMaterial({ color: 0x1e293b, emissive: 0xfef3c7, emissiveIntensity: 0.35 }),
            );
            lampShade.position.set(-0.65, 1.14, -0.2);
            lampShade.rotation.z = 0.45;
            g.add(lampBase, lampPole, lampShade);

            addErgonomicChair(g, 0, 0.65, 0);

            g.position.set(x, 0.07, z);
            g.rotation.y = rotY;
            parent.add(g);
        };

        // Build all 5 Architectural Zone Plates + Realistic Furniture
        Object.values(ZONE_LAYOUTS).forEach((z) => {
            const zoneGroup = new THREE.Group();
            const accentColor = isDark ? z.accentDark : z.accentLight;
            const floorHex = isDark ? z.darkFloor : z.lightFloor;
            const floorTex = createCarpetTileTexture(floorHex, isDark, disposableTextures);

            const plateShape = createRoundedRectShape(z.w, z.d, 0.35);
            const plateGeo = new THREE.ExtrudeGeometry(plateShape, {
                depth: 0.06,
                bevelEnabled: true,
                bevelThickness: 0.01,
                bevelSize: 0.01,
                bevelSegments: 2,
            });
            plateGeo.rotateX(Math.PI / 2);

            const floorMat = new THREE.MeshStandardMaterial({
                map: floorTex,
                emissive: accentColor,
                emissiveIntensity: isDark ? 0.04 : 0.01,
                roughness: 0.85,
                metalness: 0.04,
            });
            const plate = new THREE.Mesh(plateGeo, floorMat);
            plate.position.set(z.x, 0.07, z.z);
            plate.receiveShadow = true;
            zoneGroup.add(plate);

            const pts = plateShape.getPoints(32).map((p) => new THREE.Vector3(p.x + z.x, 0.088, p.y + z.z));
            pts.push(pts[0].clone());
            const borderGeo = new THREE.BufferGeometry().setFromPoints(pts);
            const borderMat = new THREE.LineBasicMaterial({
                color: accentColor,
                transparent: true,
                opacity: 0.65,
            });
            const borderLine = new THREE.Line(borderGeo, borderMat);
            zoneGroup.add(borderLine);

            const hexStr = `#${accentColor.toString(16).padStart(6, '0')}`;
            const labelSprite = createLabelSprite(z.label, hexStr, isDark);
            labelSprite.position.set(z.x, 2.85, z.z);
            zoneGroup.add(labelSprite);

            if (z.id === 'reception') {
                const rug = new THREE.Mesh(
                    new THREE.BoxGeometry(3.6, 0.02, 2.2),
                    new THREE.MeshStandardMaterial({ color: isDark ? 0x153545 : 0x99f6e4, roughness: 0.95 }),
                );
                rug.position.set(z.x, 0.08, z.z + 1.15);
                zoneGroup.add(rug);

                // Wood-slat Reception Desk with dark stone top + Check-in tablet
                const counter = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.96, 0.82), woodMat);
                counter.position.set(z.x, 0.55, z.z - 0.75);
                counter.castShadow = true;
                const counterTop = new THREE.Mesh(new THREE.BoxGeometry(3.42, 0.07, 0.94), baseboardMat);
                counterTop.position.set(z.x, 1.06, z.z - 0.75);
                counterTop.castShadow = true;
                const accentStrip = new THREE.Mesh(
                    new THREE.BoxGeometry(3.32, 0.07, 0.05),
                    new THREE.MeshBasicMaterial({ color: accentColor }),
                );
                accentStrip.position.set(z.x, 0.92, z.z - 0.33);

                // Check-in Tablet on desk
                const tabletStand = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.24, 0.04), metalMat);
                tabletStand.position.set(z.x + 0.85, 1.2, z.z - 0.65);
                tabletStand.rotation.x = -0.35;

                // Plush Waiting Sofa with Backrest, Armrests & Cushions
                const sofaBase = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.34, 0.86), sofaMat);
                sofaBase.position.set(z.x, 0.24, z.z + 1.48);
                sofaBase.castShadow = true;
                const sofaBack = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.48, 0.18), sofaMat);
                sofaBack.position.set(z.x, 0.56, z.z + 1.82);
                sofaBack.castShadow = true;
                [-0.85, 0.85].forEach((px) => {
                    const pillow = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.28, 0.14), cushionAccentMat);
                    pillow.position.set(z.x + px, 0.5, z.z + 1.65);
                    pillow.rotation.z = px > 0 ? -0.15 : 0.15;
                    zoneGroup.add(pillow);
                });

                const coffee = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.06, 0.65), woodMat);
                coffee.position.set(z.x, 0.38, z.z + 0.45);
                coffee.castShadow = true;
                const coffeeLeg = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.3, 0.45), metalMat);
                coffeeLeg.position.set(z.x, 0.2, z.z + 0.45);

                // Architectural Branded Backdrop Wall ("KREVIA DIGITAL")
                const wall = new THREE.Mesh(new THREE.BoxGeometry(3.8, 2.05, 0.16), deskTopMat);
                wall.position.set(z.x, 1.1, z.z - 2.25);
                wall.castShadow = true;
                const sign = new THREE.Mesh(
                    new THREE.PlaneGeometry(3.1, 1.15),
                    new THREE.MeshBasicMaterial({ map: receptionSignTex }),
                );
                sign.position.set(z.x, 1.32, z.z - 2.16);

                counter.userData.interactiveObject = 'reception';
                counter.userData.roomId = 'reception';
                counterTop.userData.interactiveObject = 'reception';
                counterTop.userData.roomId = 'reception';
                interactiveMeshes.push(counter, counterTop);
                zoneGroup.add(counter, counterTop, accentStrip, tabletStand, sofaBase, sofaBack, coffee, coffeeLeg, wall, sign);
                addPlanter(zoneGroup, z.x - 2.7, z.z - 1.9, 1.1);
                addPlanter(zoneGroup, z.x + 2.7, z.z - 1.9, 1.0);
            }

            if (z.id === 'workspace') {
                [
                    [-7.6, -5.2, 0],
                    [-4.6, -5.2, 0],
                    [-1.6, -5.2, 0],
                    [-7.6, -1.8, Math.PI],
                    [-4.6, -1.8, Math.PI],
                    [-1.6, -1.8, Math.PI],
                ].forEach(([wx, wz, rot], idx) => {
                    addWorkstation(
                        zoneGroup,
                        wx,
                        wz,
                        rot,
                        idx % 2 === 0 ? monitorTexBlue : monitorTexTeal,
                    );
                });

                // Bookshelf / Storage Credenza with colorful book spines
                const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.48, 1.65, 2.6), woodMat);
                shelf.position.set(2.4, 0.9, -3.6);
                shelf.castShadow = true;
                zoneGroup.add(shelf);
                const bookColors = [0x2563eb, 0xd97706, 0x0d9488, 0xe11d48, 0x475569];
                for (let b = 0; b < 8; b++) {
                    const book = new THREE.Mesh(
                        new THREE.BoxGeometry(0.28, 0.28, 0.08),
                        new THREE.MeshStandardMaterial({ color: bookColors[b % bookColors.length], roughness: 0.7 }),
                    );
                    book.position.set(2.38, 1.85, -4.3 + b * 0.14);
                    zoneGroup.add(book);
                }

                addPlanter(zoneGroup, -9.8, -6.6, 1.15);
                addPlanter(zoneGroup, 2.4, -6.5, 0.95);
            }

            if (z.id === 'meeting') {
                // Frosted glass walls + dark aluminum mullions + door frame
                const wallL = new THREE.Mesh(new THREE.BoxGeometry(0.07, 2.45, 7.0), glassMat);
                wallL.position.set(3.68, 1.3, -3.6);
                const wallF = new THREE.Mesh(new THREE.BoxGeometry(7.0, 2.45, 0.07), glassMat);
                wallF.position.set(7.2, 1.3, 0.02);
                const mullionCorner = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.5, 0.14), plinthTrimMat);
                mullionCorner.position.set(3.68, 1.3, 0.02);
                const mullionTopL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 7.0), plinthTrimMat);
                mullionTopL.position.set(3.68, 2.52, -3.6);
                const mullionTopF = new THREE.Mesh(new THREE.BoxGeometry(7.0, 0.1, 0.12), plinthTrimMat);
                mullionTopF.position.set(7.2, 2.52, 0.02);
                zoneGroup.add(wallL, wallF, mullionCorner, mullionTopL, mullionTopF);

                // Executive Conference Table with dual pedestals + conference speakerphone puck
                addFakeAO(zoneGroup, 7.2, -3.6, 4.5, 2.2);
                const confTable = new THREE.Mesh(new THREE.BoxGeometry(4.3, 0.09, 1.9), woodMat);
                confTable.position.set(7.2, 0.78, -3.6);
                confTable.castShadow = true;
                confTable.userData.meetingObject = true;
                confTable.userData.roomId = 'meeting';
                interactiveMeshes.push(confTable);

                [-1.3, 1.3].forEach((px) => {
                    const ped = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.72, 0.85), metalMat);
                    ped.position.set(7.2 + px, 0.42, -3.6);
                    ped.castShadow = true;
                    zoneGroup.add(ped);
                });

                const confPuck = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.16, 0.18, 0.04, 16),
                    new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3 }),
                );
                confPuck.position.set(7.2, 0.84, -3.6);
                zoneGroup.add(confTable, confPuck);

                [-1.4, -0.45, 0.45, 1.4].forEach((offset) => {
                    [-1.25, 1.25].forEach((side) => {
                        addErgonomicChair(zoneGroup, 7.2 + offset, -3.6 + side, side > 0 ? 0 : Math.PI);
                    });
                });

                // Framed 65" Presentation Display with crisp live slide texture
                const tvFrame = new THREE.Mesh(new THREE.BoxGeometry(3.45, 1.65, 0.1), plinthTrimMat);
                tvFrame.position.set(7.2, 1.65, -7.0);
                tvFrame.castShadow = true;
                const screen = new THREE.Mesh(
                    new THREE.PlaneGeometry(3.25, 1.48),
                    new THREE.MeshStandardMaterial({
                        map: screenTex,
                        emissive: 0xffffff,
                        emissiveMap: screenTex,
                        emissiveIntensity: isDark ? 0.55 : 0.35,
                        roughness: 0.2,
                    }),
                );
                screen.position.set(7.2, 1.65, -6.94);
                screen.userData.meetingObject = true;
                screen.userData.roomId = 'meeting';
                tvFrame.userData.meetingObject = true;
                tvFrame.userData.roomId = 'meeting';
                interactiveMeshes.push(screen, tvFrame);

                const liveBeacon = new THREE.Mesh(
                    new THREE.SphereGeometry(0.16, 14, 14),
                    new THREE.MeshBasicMaterial({ color: 0xe11d48 }),
                );
                liveBeacon.position.set(7.2, 2.65, -6.92);
                liveBeacon.name = 'meetingLiveBeacon';
                liveBeacon.visible = hasLiveMeetingRef.current;
                zoneGroup.add(tvFrame, screen, liveBeacon);
                addPlanter(zoneGroup, 10.1, -6.5, 1.0);
            }

            if (z.id === 'lounge') {
                const rug = new THREE.Mesh(
                    new THREE.BoxGeometry(4.4, 0.02, 3.2),
                    new THREE.MeshStandardMaterial({ color: isDark ? 0x13332e : 0xbbf7d0, roughness: 0.95 }),
                );
                rug.position.set(z.x + 0.15, 0.08, z.z + 0.3);

                // Plush L-shaped Sectional Sofa (base + backrests + cushions)
                const sofaMainBase = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.34, 0.92), sofaMat);
                sofaMainBase.position.set(z.x, 0.24, z.z - 1.2);
                sofaMainBase.castShadow = true;
                const sofaMainBack = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.46, 0.18), sofaMat);
                sofaMainBack.position.set(z.x, 0.54, z.z - 1.56);
                sofaMainBack.castShadow = true;

                const sofaSideBase = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.34, 2.2), sofaMat);
                sofaSideBase.position.set(z.x - 1.2, 0.24, z.z + 0.25);
                sofaSideBase.castShadow = true;
                const sofaSideBack = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.46, 2.2), sofaMat);
                sofaSideBack.position.set(z.x - 1.56, 0.54, z.z + 0.25);
                sofaSideBack.castShadow = true;

                const throwPillow = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.28, 0.14), cushionAccentMat);
                throwPillow.position.set(z.x + 1.1, 0.48, z.z - 1.35);
                throwPillow.rotation.z = -0.2;

                // Round Oak Coffee Table + Cups
                const coffeeTable = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.06, 24), woodMat);
                coffeeTable.position.set(z.x + 0.55, 0.42, z.z + 0.35);
                coffeeTable.castShadow = true;
                const coffeeLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.32, 0.34, 16), metalMat);
                coffeeLeg.position.set(z.x + 0.55, 0.23, z.z + 0.35);

                // Bean bag
                const beanBag = new THREE.Mesh(
                    new THREE.SphereGeometry(0.45, 16, 12),
                    new THREE.MeshStandardMaterial({ color: accentColor, roughness: 0.9 }),
                );
                beanBag.scale.set(1.1, 0.65, 1.1);
                beanBag.position.set(z.x + 2.0, 0.32, z.z + 1.3);
                beanBag.castShadow = true;

                // Pantry Counter + Espresso Machine (clickable -> Ajak Ngopi / Break Time)
                const pantry = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.92, 0.7), woodMat);
                pantry.position.set(z.x + 2.2, 0.53, z.z - 1.8);
                pantry.castShadow = true;
                const pantryTop = new THREE.Mesh(new THREE.BoxGeometry(1.94, 0.06, 0.74), baseboardMat);
                pantryTop.position.set(z.x + 2.2, 1.01, z.z - 1.8);
                const espresso = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.34), metalMat);
                espresso.position.set(z.x + 2.05, 1.24, z.z - 1.8);
                const espressoAccent = new THREE.Mesh(
                    new THREE.BoxGeometry(0.43, 0.08, 0.35),
                    new THREE.MeshBasicMaterial({ color: accentColor }),
                );
                espressoAccent.position.set(z.x + 2.05, 1.39, z.z - 1.8);

                pantry.userData.interactiveObject = 'coffee_machine';
                pantry.userData.roomId = 'lounge';
                espresso.userData.interactiveObject = 'coffee_machine';
                espresso.userData.roomId = 'lounge';
                interactiveMeshes.push(pantry, espresso);

                zoneGroup.add(
                    rug,
                    sofaMainBase,
                    sofaMainBack,
                    sofaSideBase,
                    sofaSideBack,
                    throwPillow,
                    coffeeTable,
                    coffeeLeg,
                    beanBag,
                    pantry,
                    pantryTop,
                    espresso,
                    espressoAccent,
                );
                addPlanter(zoneGroup, z.x - 2.6, z.z + 1.8, 1.2);
            }

            if (z.id === 'project') {
                addFakeAO(zoneGroup, z.x, z.z + 0.2, 3.2, 1.8);
                const warTable = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.09, 1.55), woodMat);
                warTable.position.set(z.x, 0.78, z.z + 0.2);
                warTable.castShadow = true;
                [-0.95, 0.95].forEach((px) => {
                    const warLeg = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.7, 1.1), metalMat);
                    warLeg.position.set(z.x + px, 0.42, z.z + 0.2);
                    zoneGroup.add(warLeg);
                });
                zoneGroup.add(warTable);

                [-0.85, 0.85].forEach((ox) => {
                    [-1.05, 1.05].forEach((oz) => {
                        addErgonomicChair(zoneGroup, z.x + ox, z.z + 0.2 + oz, oz > 0 ? 0 : Math.PI);
                    });
                });

                // Framed Project Kanban Whiteboard (clickable -> Project Kanban)
                const boardFrame = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.6, 0.1), plinthTrimMat);
                boardFrame.position.set(z.x, 1.58, z.z - 2.18);
                boardFrame.castShadow = true;
                const board = new THREE.Mesh(
                    new THREE.PlaneGeometry(3.04, 1.44),
                    new THREE.MeshStandardMaterial({
                        map: kanbanTex,
                        emissive: 0xffffff,
                        emissiveMap: kanbanTex,
                        emissiveIntensity: 0.15,
                        roughness: 0.35,
                    }),
                );
                board.position.set(z.x, 1.58, z.z - 2.12);
                board.userData.interactiveObject = 'project_board';
                board.userData.roomId = 'project';
                boardFrame.userData.interactiveObject = 'project_board';
                boardFrame.userData.roomId = 'project';
                interactiveMeshes.push(board, boardFrame);
                zoneGroup.add(boardFrame, board);

                addPlanter(zoneGroup, z.x + 2.5, z.z + 1.9, 1.0);
            }

            tagRoom(zoneGroup, z.id);
            scene.add(zoneGroup);
            zoneVisuals[z.id] = { group: zoneGroup, floorMat, borderMat, labelSprite };
        });

        // Dynamic Seat Pads & Living 3D Team Avatars
        const seatsRoot = new THREE.Group();
        scene.add(seatsRoot);
        const seatMeshes: Record<number, { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; data: VirtualSeatData }> = {};

        const avatarsRoot = new THREE.Group();
        scene.add(avatarsRoot);
        const avatarMap = new Map<
            number,
            {
                member: VirtualMemberData;
                group: THREE.Group;
                ring: THREE.Mesh;
                ringMat: THREE.MeshBasicMaterial;
                label: THREE.Sprite;
                targetPos: THREE.Vector3;
                baseY: number;
                phase: number;
            }
        >();

        const computeMemberTarget = (m: VirtualMemberData, slot: number): THREE.Vector3 => {
            if (typeof m.pos_x === 'number' && typeof m.pos_z === 'number') {
                return new THREE.Vector3(m.pos_x, m.seat_id ? 0.02 : 0.08, m.pos_z);
            }
            const layout = ZONE_LAYOUTS[m.zone] ?? ZONE_LAYOUTS.workspace;
            const angle = slot * 1.65 + 0.4;
            const radius = 1.25 + (slot % 2) * 0.7;
            return new THREE.Vector3(
                layout.x + Math.cos(angle) * radius,
                0.08,
                layout.z + Math.sin(angle) * radius,
            );
        };

        const syncDynamicObjects = () => {
            seatsRef.current.forEach((s) => {
                const isMine = s.occupied_by?.user_id === myUserId;
                const isOccupied = !!s.occupied_by;
                const color = isMine ? 0x2563eb : isOccupied ? 0xf59e0b : isDark ? 0x45d8e8 : 0x16a34a;

                if (!seatMeshes[s.id]) {
                    const mat = new THREE.MeshBasicMaterial({
                        color,
                        transparent: true,
                        opacity: isOccupied ? 0.65 : 0.45,
                        side: THREE.DoubleSide,
                    });
                    const pad = new THREE.Mesh(new THREE.RingGeometry(0.24, 0.34, 24), mat);
                    pad.rotation.x = -Math.PI / 2;
                    pad.position.set(s.pos_x, 0.095, s.pos_z);
                    pad.userData.seatId = s.id;
                    pad.userData.roomId = s.zone;
                    seatsRoot.add(pad);
                    interactiveMeshes.push(pad);
                    seatMeshes[s.id] = { mesh: pad, mat, data: s };
                } else {
                    seatMeshes[s.id].data = s;
                    seatMeshes[s.id].mat.color.setHex(color);
                    seatMeshes[s.id].mat.opacity = isOccupied ? 0.65 : 0.45;
                }
            });

            const activeIds = new Set<number>();
            const zoneOffsets: Record<string, number> = {};

            membersRef.current.forEach((m, idx) => {
                activeIds.add(m.id);
                const slot = zoneOffsets[m.zone] ?? 0;
                zoneOffsets[m.zone] = slot + 1;
                const target = computeMemberTarget(m, slot);
                const statusColor = STATUS_COLORS[m.status] ?? 0x2563eb;
                const statusHex = `#${statusColor.toString(16).padStart(6, '0')}`;

                const existing = avatarMap.get(m.id);
                if (existing) {
                    existing.member = m;
                    existing.targetPos.copy(target);
                    existing.baseY = m.seat_id ? 0.02 : 0.08;
                    existing.ringMat.color.setHex(statusColor);
                    existing.group.traverse((child) => {
                        child.userData.roomId = m.zone;
                    });
                    avatarPositionsRef.current[m.id] = target.clone();
                } else {
                    const colorNum = parseInt(m.avatar_color.replace('#', ''), 16) || 0x2563eb;
                    const avatarGroup = new THREE.Group();
                    avatarGroup.position.copy(target);

                    const ringMat = new THREE.MeshBasicMaterial({
                        color: statusColor,
                        transparent: true,
                        opacity: 0.85,
                        side: THREE.DoubleSide,
                    });
                    const ring = new THREE.Mesh(new THREE.RingGeometry(0.28, 0.38, 28), ringMat);
                    ring.rotation.x = -Math.PI / 2;
                    ring.position.y = 0.02;

                    const body = new THREE.Mesh(
                        new THREE.CapsuleGeometry(0.21, 0.4, 8, 14),
                        new THREE.MeshStandardMaterial({ color: colorNum, roughness: 0.42, metalness: 0.1 }),
                    );
                    body.position.y = 0.48;
                    body.castShadow = true;

                    const collar = new THREE.Mesh(
                        new THREE.TorusGeometry(0.14, 0.035, 8, 16),
                        new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.6 }),
                    );
                    collar.rotation.x = Math.PI / 2;
                    collar.position.y = 0.76;

                    const head = new THREE.Mesh(
                        new THREE.SphereGeometry(0.18, 16, 16),
                        new THREE.MeshStandardMaterial({ color: 0xfde6c4, roughness: 0.5 }),
                    );
                    head.position.y = 0.98;
                    head.castShadow = true;

                    const hair = new THREE.Mesh(
                        new THREE.SphereGeometry(0.188, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.52),
                        new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 }),
                    );
                    hair.position.y = 1.0;

                    const label = createLabelSprite(m.name.split(' ')[0] ?? m.name, statusHex, isDark);
                    label.position.set(0, 1.56, 0);

                    avatarGroup.add(ring, body, collar, head, hair, label);
                    avatarGroup.traverse((child) => {
                        child.userData.roomId = m.zone;
                        child.userData.memberId = m.id;
                    });
                    avatarsRoot.add(avatarGroup);
                    interactiveMeshes.push(avatarGroup);
                    avatarPositionsRef.current[m.id] = target.clone();

                    avatarMap.set(m.id, {
                        member: m,
                        group: avatarGroup,
                        ring,
                        ringMat,
                        label,
                        targetPos: target,
                        baseY: m.seat_id ? 0.02 : 0.08,
                        phase: idx * 0.9,
                    });
                }
            });

            avatarMap.forEach((entry, id) => {
                if (!activeIds.has(id)) {
                    avatarsRoot.remove(entry.group);
                    avatarMap.delete(id);
                    delete avatarPositionsRef.current[id];
                }
            });
        };

        syncDynamicRef.current = syncDynamicObjects;
        syncDynamicObjects();

        // Raycasting for Room, Seat, Interactive Objects & Avatar hover/click
        const raycaster = new THREE.Raycaster();
        const pointer = new THREE.Vector2();
        let hoveredRoomId: string | null = null;
        let hoveredMemberId: number | null = null;
        let pointerDownPos = { x: 0, y: 0 };

        const pickHit = (clientX: number, clientY: number) => {
            const rect = renderer.domElement.getBoundingClientRect();
            pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
            pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
            raycaster.setFromCamera(pointer, camera);
            const hits = raycaster.intersectObjects(interactiveMeshes, true);
            const firstHit = hits[0];
            const obj = firstHit?.object;
            return {
                roomId: (obj?.userData?.roomId as string) ?? null,
                memberId: (obj?.userData?.memberId as number) ?? null,
                seatId: (obj?.userData?.seatId as number) ?? null,
                meetingObject: Boolean(obj?.userData?.meetingObject),
                interactiveObject:
                    (obj?.userData?.interactiveObject as 'reception' | 'project_board' | 'coffee_machine') ?? null,
                point: firstHit?.point ?? null,
                localX: clientX - rect.left,
                localY: clientY - rect.top,
            };
        };

        const handlePointerMove = (e: PointerEvent) => {
            const { roomId, memberId, seatId, localX, localY } = pickHit(e.clientX, e.clientY);
            hoveredRoomId = roomId;
            hoveredMemberId = memberId;
            renderer.domElement.style.cursor = roomId || memberId || seatId ? 'pointer' : 'grab';

            if (memberId && showMembersRef.current) {
                const found = membersRef.current.find((m) => m.id === memberId) ?? null;
                onHoverMemberRef.current?.(found, { x: localX, y: localY });
            } else {
                onHoverMemberRef.current?.(null, null);
            }
        };

        const handlePointerDown = (e: PointerEvent) => {
            pointerDownPos = { x: e.clientX, y: e.clientY };
            flyAnimRef.current = null;
        };

        const handlePointerUp = (e: PointerEvent) => {
            const dist = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
            if (dist > 6) return;
            const { roomId, memberId, seatId, meetingObject, interactiveObject, point } = pickHit(
                e.clientX,
                e.clientY,
            );
            if (seatId && seatMeshes[seatId]) {
                onClickSeatRef.current?.(seatMeshes[seatId].data);
                return;
            }
            if (meetingObject && onClickMeetingObjectRef.current) {
                onClickMeetingObjectRef.current();
                return;
            }
            if (interactiveObject && onClickInteractiveObjectRef.current) {
                onClickInteractiveObjectRef.current(interactiveObject);
                return;
            }
            if (memberId && showMembersRef.current) {
                const found = membersRef.current.find((m) => m.id === memberId);
                if (found) {
                    onSelectMemberRef.current?.(found);
                    return;
                }
            }
            if (roomId) {
                if (point && onClickFloorRef.current) {
                    onClickFloorRef.current(roomId, Number(point.x.toFixed(2)), Number(point.z.toFixed(2)));
                } else {
                    onSelectRoomRef.current(roomId);
                }
            }
        };

        renderer.domElement.addEventListener('pointermove', handlePointerMove);
        renderer.domElement.addEventListener('pointerdown', handlePointerDown);
        renderer.domElement.addEventListener('pointerup', handlePointerUp);

        const resizeObserver = new ResizeObserver(() => {
            if (!container) return;
            const w = container.clientWidth || 960;
            const h = container.clientHeight || 580;
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            renderer.setSize(w, h);
        });
        resizeObserver.observe(container);

        let rafId = 0;
        let isPaused = document.hidden;
        const clock = new THREE.Clock();

        const animate = () => {
            if (isPaused) return;
            rafId = requestAnimationFrame(animate);
            const t = clock.getElapsedTime();

            const anim = flyAnimRef.current;
            if (anim) {
                const elapsed = performance.now() - anim.startTime;
                const progress = Math.min(1, elapsed / anim.duration);
                const eased = easeInOutCubic(progress);
                camera.position.lerpVectors(anim.startPos, anim.endPos, eased);
                controls.target.lerpVectors(anim.startTarget, anim.endTarget, eased);
                if (progress >= 1) {
                    flyAnimRef.current = null;
                }
            }

            controls.target.x = THREE.MathUtils.clamp(controls.target.x, -12, 12);
            controls.target.z = THREE.MathUtils.clamp(controls.target.z, -9, 9);
            controls.target.y = 0;

            const followId = followMemberIdRef.current;
            if (followId && avatarPositionsRef.current[followId] && !flyAnimRef.current) {
                const targetVec = avatarPositionsRef.current[followId];
                controls.target.x += (targetVec.x - controls.target.x) * 0.1;
                controls.target.z += (targetVec.z - controls.target.z) * 0.1;
            }

            const beacon = scene.getObjectByName('meetingLiveBeacon');
            if (beacon) {
                beacon.visible = hasLiveMeetingRef.current;
                if (beacon.visible && !reducedMotion) {
                    const pulse = 1 + Math.sin(t * 5) * 0.25;
                    beacon.scale.setScalar(pulse);
                }
            }

            const activeRoom = selectedRoomRef.current;
            Object.entries(zoneVisuals).forEach(([id, vis]) => {
                const isSelected = activeRoom === id;
                const isHovered = hoveredRoomId === id;
                vis.labelSprite.visible = showLabelsRef.current;
                if (isSelected) {
                    vis.floorMat.emissiveIntensity = isDark ? 0.16 : 0.06;
                    vis.borderMat.opacity = 1;
                } else if (isHovered) {
                    vis.floorMat.emissiveIntensity = isDark ? 0.09 : 0.03;
                    vis.borderMat.opacity = 0.85;
                } else {
                    vis.floorMat.emissiveIntensity = isDark ? 0.025 : 0.005;
                    vis.borderMat.opacity = activeRoom ? 0.35 : 0.65;
                }
            });

            avatarsRoot.visible = showMembersRef.current;
            if (showMembersRef.current) {
                avatarMap.forEach((entry) => {
                    entry.label.visible = showLabelsRef.current;
                    const isHovered = hoveredMemberId === entry.member.id;
                    const bob = reducedMotion ? 0 : Math.sin(t * 2.2 + entry.phase) * 0.032;
                    const hoverLift = isHovered ? 0.16 : 0;
                    const lerpSpeed = reducedMotion ? 1 : 0.14;
                    entry.group.position.x += (entry.targetPos.x - entry.group.position.x) * lerpSpeed;
                    entry.group.position.z += (entry.targetPos.z - entry.group.position.z) * lerpSpeed;
                    entry.group.position.y += (entry.baseY + bob + hoverLift - entry.group.position.y) * 0.18;
                    const pulse = reducedMotion ? 1 : 1 + Math.sin(t * 2.8 + entry.phase) * 0.08;
                    entry.ring.scale.set(pulse, pulse, 1);
                });
            }

            controls.update();
            renderer.render(scene, camera);
        };

        const handleVisibility = () => {
            isPaused = document.hidden;
            if (!isPaused) animate();
            else cancelAnimationFrame(rafId);
        };

        document.addEventListener('visibilitychange', handleVisibility);
        animate();

        return () => {
            syncDynamicRef.current = null;
            cancelAnimationFrame(rafId);
            document.removeEventListener('visibilitychange', handleVisibility);
            resizeObserver.disconnect();
            renderer.domElement.removeEventListener('pointermove', handlePointerMove);
            renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
            renderer.domElement.removeEventListener('pointerup', handlePointerUp);
            controls.dispose();
            pmrem.dispose();
            envTex.dispose();
            disposableTextures.forEach((tx) => tx.dispose());
            scene.traverse((obj) => {
                if ((obj as THREE.Mesh).geometry) (obj as THREE.Mesh).geometry.dispose();
                const mat = (obj as THREE.Mesh).material;
                if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
                else if (mat) mat.dispose();
            });
            renderer.dispose();
        };
    }, [theme, myUserId, onWebGLError]);

    useEffect(() => {
        syncDynamicRef.current?.();
    }, [members, seats]);

    useEffect(() => {
        if (!cameraCommand || !cameraRef.current || !controlsRef.current) return;
        const cam = cameraRef.current;
        const ctrl = controlsRef.current;
        const offsetX = panelOpenRef.current ? 2.2 : 0;

        const startFly = (endPos: THREE.Vector3, endTarget: THREE.Vector3, duration = 820) => {
            flyAnimRef.current = {
                startPos: cam.position.clone(),
                endPos,
                startTarget: ctrl.target.clone(),
                endTarget,
                startTime: performance.now(),
                duration,
            };
        };

        if (cameraCommand.type === 'reset' || cameraCommand.type === 'isometric') {
            startFly(new THREE.Vector3(25 + offsetX, 21.5, 25), new THREE.Vector3(offsetX, 0, 0));
        } else if (cameraCommand.type === 'topDown') {
            startFly(new THREE.Vector3(offsetX + 0.01, 35, 0.01), new THREE.Vector3(offsetX, 0, 0));
        } else if (cameraCommand.type === 'zoomIn') {
            const dir = new THREE.Vector3().subVectors(cam.position, ctrl.target).multiplyScalar(0.76);
            startFly(ctrl.target.clone().add(dir), ctrl.target.clone(), 380);
        } else if (cameraCommand.type === 'zoomOut') {
            const dir = new THREE.Vector3().subVectors(cam.position, ctrl.target).multiplyScalar(1.28);
            startFly(ctrl.target.clone().add(dir), ctrl.target.clone(), 380);
        } else if (cameraCommand.type === 'focusRoom') {
            const layout = ZONE_LAYOUTS[cameraCommand.roomId];
            if (layout) {
                startFly(
                    new THREE.Vector3(
                        layout.x + layout.cameraOffset[0],
                        layout.cameraOffset[1],
                        layout.z + layout.cameraOffset[2],
                    ),
                    new THREE.Vector3(layout.x, 0, layout.z),
                );
            }
        } else if (cameraCommand.type === 'focusMember') {
            const pos = avatarPositionsRef.current[cameraCommand.memberId];
            if (pos) {
                startFly(
                    new THREE.Vector3(pos.x + 8.5, 7.5, pos.z + 8.5),
                    new THREE.Vector3(pos.x, 0, pos.z),
                );
            }
        }
    }, [cameraCommand]);

    return <div ref={containerRef} className="h-full w-full select-none" />;
}
