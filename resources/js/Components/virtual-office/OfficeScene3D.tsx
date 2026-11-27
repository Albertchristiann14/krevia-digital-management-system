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

export interface VirtualMemberData {
    id: number;
    name: string;
    avatar_url: string | null;
    avatar_color: string;
    position: string;
    department: string;
    zone: string;
    status: string;
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
    members: VirtualMemberData[];
    selectedRoomId: string | null;
    panelOpen: boolean;
    showLabels: boolean;
    showMembers: boolean;
    onSelectRoom: (roomId: string) => void;
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
    lightFloor: number;
    darkFloor: number;
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
        lightFloor: 0xe6f8f6,
        darkFloor: 0x0e2330,
        accentLight: 0x0d9488,
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
        lightFloor: 0xeaf2ff,
        darkFloor: 0x101d38,
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
        lightFloor: 0xf1ecff,
        darkFloor: 0x1a1738,
        accentLight: 0x7c3aed,
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
        lightFloor: 0xe9f9ef,
        darkFloor: 0x0e2624,
        accentLight: 0x16a34a,
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
        lightFloor: 0xfef5e7,
        darkFloor: 0x261f18,
        accentLight: 0xd97706,
        accentDark: 0xf4b860,
        cameraOffset: [13, 11.5, 13],
    },
};

const STATUS_COLORS: Record<string, number> = {
    Online: 0x16a34a,
    Available: 0x2563eb,
    Busy: 0xdc2626,
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

function createLabelSprite(text: string, dotColorHex: string, isDark: boolean): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 68;
    const ctx = canvas.getContext('2d')!;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Pill background
    ctx.fillStyle = isDark ? 'rgba(11, 18, 34, 0.88)' : 'rgba(255, 255, 255, 0.94)';
    ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.16)' : 'rgba(15, 23, 42, 0.12)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(10, 10, 300, 48, 24);
    ctx.fill();
    ctx.stroke();

    // Status dot
    ctx.fillStyle = dotColorHex;
    ctx.beginPath();
    ctx.arc(36, 34, 7, 0, Math.PI * 2);
    ctx.fill();

    // Text
    ctx.fillStyle = isDark ? '#F4F7FF' : '#0F172A';
    ctx.font = '600 20px Inter, system-ui, sans-serif';
    ctx.textBaseline = 'middle';
    const label = text.length > 18 ? `${text.slice(0, 17)}…` : text;
    ctx.fillText(label, 54, 35);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(2.5, 0.53, 1);
    sprite.renderOrder = 20;
    return sprite;
}

function easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export default function OfficeScene3D({
    theme,
    members,
    selectedRoomId,
    panelOpen,
    showLabels,
    showMembers,
    onSelectRoom,
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
    const onSelectRoomRef = useRef(onSelectRoom);
    const onSelectMemberRef = useRef(onSelectMember);
    const onHoverMemberRef = useRef(onHoverMember);
    const controlsRef = useRef<OrbitControls | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const avatarPositionsRef = useRef<Record<number, THREE.Vector3>>({});
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
    onSelectRoomRef.current = onSelectRoom;
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
        renderer.toneMappingExposure = isDark ? 1.15 : 1.08;
        renderer.outputColorSpace = THREE.SRGBColorSpace;

        container.innerHTML = '';
        container.appendChild(renderer.domElement);

        const scene = new THREE.Scene();
        scene.fog = new THREE.FogExp2(isDark ? 0x070b16 : 0xf7f9fc, isDark ? 0.009 : 0.006);

        // Lightweight procedural environment for glossy PBR reflections
        const pmrem = new THREE.PMREMGenerator(renderer);
        const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
        scene.environment = envTex;

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

        // Lighting
        const hemiLight = new THREE.HemisphereLight(
            isDark ? 0x7b9dff : 0xffffff,
            isDark ? 0x070b16 : 0xdbe4f0,
            isDark ? 0.85 : 1.15,
        );
        scene.add(hemiLight);

        const dirLight = new THREE.DirectionalLight(isDark ? 0xe0ecff : 0xfffaf0, isDark ? 1.45 : 1.65);
        dirLight.position.set(18, 28, 16);
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

        if (isDark) {
            const cyanFill = new THREE.PointLight(0x45d8e8, 1.3, 24);
            cyanFill.position.set(-8, 4.5, 4);
            scene.add(cyanFill);
            const violetFill = new THREE.PointLight(0xa17aff, 1.3, 24);
            violetFill.position.set(8, 4.5, -4);
            scene.add(violetFill);
        } else {
            const warmFill = new THREE.PointLight(0xfff4e0, 0.6, 26);
            warmFill.position.set(-6, 6, 6);
            scene.add(warmFill);
        }

        // Shared PBR Materials
        const baseSlabMat = new THREE.MeshStandardMaterial({
            color: isDark ? 0x0b1222 : 0xffffff,
            roughness: isDark ? 0.55 : 0.28,
            metalness: isDark ? 0.25 : 0.05,
        });
        const woodMat = new THREE.MeshStandardMaterial({
            color: isDark ? 0x243656 : 0xd8c3a5,
            roughness: 0.48,
            metalness: 0.08,
        });
        const deskTopMat = new THREE.MeshStandardMaterial({
            color: isDark ? 0x1b2b4a : 0xf8fafc,
            roughness: 0.3,
            metalness: 0.1,
        });
        const metalMat = new THREE.MeshStandardMaterial({
            color: isDark ? 0x1e2e4f : 0x94a3b8,
            roughness: 0.28,
            metalness: 0.78,
        });
        const chairMat = new THREE.MeshStandardMaterial({
            color: isDark ? 0x2a3f66 : 0x334155,
            roughness: 0.65,
            metalness: 0.12,
        });
        const glassMat = new THREE.MeshPhysicalMaterial({
            color: isDark ? 0x8bb8ff : 0xe0f2fe,
            transparent: true,
            opacity: isDark ? 0.22 : 0.34,
            roughness: 0.1,
            metalness: 0.05,
            transmission: 0.25,
        });
        const sofaMat = new THREE.MeshStandardMaterial({
            color: isDark ? 0x223a5e : 0x64748b,
            roughness: 0.82,
            metalness: 0.05,
        });
        const plantPotMat = new THREE.MeshStandardMaterial({
            color: isDark ? 0x182742 : 0xe2e8f0,
            roughness: 0.55,
            metalness: 0.1,
        });
        const plantLeafMat = new THREE.MeshStandardMaterial({
            color: isDark ? 0x2ca87f : 0x22c55e,
            roughness: 0.65,
            metalness: 0.02,
        });
        const aoMat = new THREE.MeshBasicMaterial({
            color: 0x0f172a,
            transparent: true,
            opacity: isDark ? 0.28 : 0.08,
        });

        // Main Diorama Floor Slab + Subtle Grid
        const slabShape = createRoundedRectShape(24.4, 17.4, 0.9);
        const slabGeo = new THREE.ExtrudeGeometry(slabShape, {
            depth: 0.42,
            bevelEnabled: true,
            bevelThickness: 0.06,
            bevelSize: 0.06,
            bevelSegments: 3,
        });
        slabGeo.rotateX(Math.PI / 2);
        const floorSlab = new THREE.Mesh(slabGeo, baseSlabMat);
        floorSlab.position.set(0.2, -0.02, 0.3);
        floorSlab.receiveShadow = true;
        scene.add(floorSlab);

        const gridHelper = new THREE.GridHelper(
            36,
            36,
            isDark ? 0x1e3358 : 0xe2e8f0,
            isDark ? 0x121e38 : 0xf1f5f9,
        );
        gridHelper.position.y = -0.46;
        scene.add(gridHelper);

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
            ao.position.set(x, 0.075, z);
            parent.add(ao);
        };

        const addPlanter = (parent: THREE.Group, x: number, z: number, scale = 1) => {
            const g = new THREE.Group();
            const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.19, 0.44, 14), plantPotMat);
            pot.position.y = 0.22;
            pot.castShadow = true;
            g.add(pot);
            const foliage1 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.32, 1), plantLeafMat);
            foliage1.position.set(0, 0.62, 0);
            foliage1.castShadow = true;
            const foliage2 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.22, 1), plantLeafMat);
            foliage2.position.set(0.14, 0.78, 0.08);
            foliage2.castShadow = true;
            g.add(foliage1, foliage2);
            g.position.set(x, 0.07, z);
            g.scale.setScalar(scale);
            parent.add(g);
        };

        const addWorkstation = (parent: THREE.Group, x: number, z: number, rotY: number, screenHex: number) => {
            const g = new THREE.Group();
            addFakeAO(g, 0, 0.15, 1.9, 1.5);

            const top = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.07, 0.84), deskTopMat);
            top.position.y = 0.74;
            top.castShadow = true;
            top.receiveShadow = true;
            g.add(top);

            const legGeo = new THREE.BoxGeometry(0.06, 0.72, 0.68);
            const legL = new THREE.Mesh(legGeo, metalMat);
            legL.position.set(-0.78, 0.36, 0);
            const legR = new THREE.Mesh(legGeo, metalMat);
            legR.position.set(0.78, 0.36, 0);
            g.add(legL, legR);

            // Dual monitors with stands
            const screenMat = new THREE.MeshStandardMaterial({
                color: isDark ? 0x0b162c : 0x1e293b,
                emissive: screenHex,
                emissiveIntensity: isDark ? 0.5 : 0.25,
                roughness: 0.2,
            });
            [-0.31, 0.31].forEach((mx, idx) => {
                const mon = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.33, 0.035), screenMat);
                mon.position.set(mx, 1.0, -0.22);
                mon.rotation.y = idx === 0 ? 0.1 : -0.1;
                mon.castShadow = true;
                const stand = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.14, 0.06), metalMat);
                stand.position.set(mx, 0.82, -0.24);
                g.add(mon, stand);
            });

            // Keyboard + Desk lamp
            const kb = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.02, 0.14), metalMat);
            kb.position.set(0, 0.785, 0.08);
            const lampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.03, 10), metalMat);
            lampBase.position.set(0.68, 0.79, -0.2);
            const lampPole = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.35, 8), metalMat);
            lampPole.position.set(0.68, 0.96, -0.2);
            g.add(kb, lampBase, lampPole);

            // Ergonomic chair
            const seat = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.07, 0.48), chairMat);
            seat.position.set(0, 0.46, 0.64);
            seat.castShadow = true;
            const back = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.54, 0.07), chairMat);
            back.position.set(0, 0.75, 0.85);
            back.castShadow = true;
            const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.4, 8), metalMat);
            stem.position.set(0, 0.22, 0.64);
            g.add(seat, back, stem);

            g.position.set(x, 0.07, z);
            g.rotation.y = rotY;
            parent.add(g);
        };

        // Build all 5 Rounded Zone Plates + Furniture
        Object.values(ZONE_LAYOUTS).forEach((z) => {
            const zoneGroup = new THREE.Group();
            const accentColor = isDark ? z.accentDark : z.accentLight;
            const floorColor = isDark ? z.darkFloor : z.lightFloor;

            const plateShape = createRoundedRectShape(z.w, z.d, 0.45);
            const plateGeo = new THREE.ExtrudeGeometry(plateShape, {
                depth: 0.07,
                bevelEnabled: true,
                bevelThickness: 0.015,
                bevelSize: 0.015,
                bevelSegments: 2,
            });
            plateGeo.rotateX(Math.PI / 2);

            const floorMat = new THREE.MeshStandardMaterial({
                color: floorColor,
                emissive: accentColor,
                emissiveIntensity: isDark ? 0.05 : 0.01,
                roughness: isDark ? 0.5 : 0.35,
                metalness: isDark ? 0.2 : 0.04,
            });
            const plate = new THREE.Mesh(plateGeo, floorMat);
            plate.position.set(z.x, 0.07, z.z);
            plate.receiveShadow = true;
            zoneGroup.add(plate);

            // Glowing rounded outline
            const pts = plateShape.getPoints(32).map((p) => new THREE.Vector3(p.x + z.x, 0.09, p.y + z.z));
            pts.push(pts[0].clone());
            const borderGeo = new THREE.BufferGeometry().setFromPoints(pts);
            const borderMat = new THREE.LineBasicMaterial({
                color: accentColor,
                transparent: true,
                opacity: 0.7,
            });
            const borderLine = new THREE.Line(borderGeo, borderMat);
            zoneGroup.add(borderLine);

            // Floating Zone Label
            const hexStr = `#${accentColor.toString(16).padStart(6, '0')}`;
            const labelSprite = createLabelSprite(z.label, hexStr, isDark);
            labelSprite.position.set(z.x, 2.75, z.z);
            zoneGroup.add(labelSprite);

            // Zone-specific furniture
            if (z.id === 'reception') {
                // Rug
                const rug = new THREE.Mesh(
                    new THREE.BoxGeometry(3.4, 0.02, 2.1),
                    new THREE.MeshStandardMaterial({ color: isDark ? 0x153545 : 0xccfbf1, roughness: 0.9 }),
                );
                rug.position.set(z.x, 0.08, z.z + 1.15);
                zoneGroup.add(rug);

                // Curved/layered Reception Desk
                const counter = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.02, 0.85), woodMat);
                counter.position.set(z.x, 0.58, z.z - 0.75);
                counter.castShadow = true;
                const accentStrip = new THREE.Mesh(
                    new THREE.BoxGeometry(3.22, 0.09, 0.06),
                    new THREE.MeshBasicMaterial({ color: accentColor }),
                );
                accentStrip.position.set(z.x, 0.92, z.z - 0.31);
                // Waiting sofa + coffee table
                const sofa = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.52, 0.85), sofaMat);
                sofa.position.set(z.x, 0.33, z.z + 1.45);
                sofa.castShadow = true;
                const coffee = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.34, 0.65), deskTopMat);
                coffee.position.set(z.x, 0.24, z.z + 0.45);
                coffee.castShadow = true;
                // Krevia 3D backdrop emblem wall
                const wall = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.9, 0.12), deskTopMat);
                wall.position.set(z.x, 1.02, z.z - 2.25);
                wall.castShadow = true;
                const logoMark = new THREE.Mesh(
                    new THREE.OctahedronGeometry(0.32, 0),
                    new THREE.MeshStandardMaterial({
                        color: accentColor,
                        emissive: accentColor,
                        emissiveIntensity: 0.4,
                        metalness: 0.6,
                        roughness: 0.2,
                    }),
                );
                logoMark.position.set(z.x, 1.32, z.z - 2.1);
                zoneGroup.add(counter, accentStrip, sofa, coffee, wall, logoMark);
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
                        idx % 2 === 0 ? accentColor : isDark ? 0x45d8e8 : 0x0ea5e9,
                    );
                });
                // Storage shelf
                const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.45, 1.6, 2.4), woodMat);
                shelf.position.set(2.4, 0.87, -3.6);
                shelf.castShadow = true;
                zoneGroup.add(shelf);
                addPlanter(zoneGroup, -9.6, -6.5, 1.15);
                addPlanter(zoneGroup, 2.4, -6.4, 0.95);
            }

            if (z.id === 'meeting') {
                // Frosted glass walls + metallic mullions
                const wallL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.35, 7.0), glassMat);
                wallL.position.set(3.68, 1.25, -3.6);
                const wallF = new THREE.Mesh(new THREE.BoxGeometry(7.0, 2.35, 0.08), glassMat);
                wallF.position.set(7.2, 1.25, 0.02);
                const mullion = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.4, 0.12), metalMat);
                mullion.position.set(3.68, 1.25, 0.02);
                zoneGroup.add(wallL, wallF, mullion);

                // Executive conference table
                const confTable = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.1, 1.85), woodMat);
                confTable.position.set(7.2, 0.78, -3.6);
                confTable.castShadow = true;
                const confLeg = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.72, 0.65), metalMat);
                confLeg.position.set(7.2, 0.42, -3.6);
                zoneGroup.add(confTable, confLeg);

                [-1.4, -0.45, 0.45, 1.4].forEach((offset) => {
                    [-1.25, 1.25].forEach((side) => {
                        const c = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.56, 0.46), chairMat);
                        c.position.set(7.2 + offset, 0.48, -3.6 + side);
                        c.castShadow = true;
                        zoneGroup.add(c);
                    });
                });

                // Presentation wall screen
                const screen = new THREE.Mesh(
                    new THREE.BoxGeometry(3.2, 1.45, 0.08),
                    new THREE.MeshStandardMaterial({
                        color: isDark ? 0x101a30 : 0x1e293b,
                        emissive: accentColor,
                        emissiveIntensity: isDark ? 0.45 : 0.25,
                    }),
                );
                screen.position.set(7.2, 1.6, -7.0);
                zoneGroup.add(screen);
                addPlanter(zoneGroup, 10.1, -6.5, 1.0);
            }

            if (z.id === 'lounge') {
                const rug = new THREE.Mesh(
                    new THREE.BoxGeometry(4.2, 0.02, 3.0),
                    new THREE.MeshStandardMaterial({ color: isDark ? 0x13332e : 0xdcfce7, roughness: 0.9 }),
                );
                rug.position.set(z.x + 0.2, 0.08, z.z + 0.3);
                const sofaMain = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.56, 0.92), sofaMat);
                sofaMain.position.set(z.x, 0.35, z.z - 1.2);
                sofaMain.castShadow = true;
                const sofaSide = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.56, 2.2), sofaMat);
                sofaSide.position.set(z.x - 1.2, 0.35, z.z + 0.25);
                sofaSide.castShadow = true;
                const coffeeTable = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 0.38, 22), woodMat);
                coffeeTable.position.set(z.x + 0.55, 0.26, z.z + 0.35);
                coffeeTable.castShadow = true;
                // Bean bag
                const beanBag = new THREE.Mesh(
                    new THREE.SphereGeometry(0.45, 16, 12),
                    new THREE.MeshStandardMaterial({ color: accentColor, roughness: 0.85 }),
                );
                beanBag.scale.set(1.1, 0.65, 1.1);
                beanBag.position.set(z.x + 2.0, 0.32, z.z + 1.3);
                beanBag.castShadow = true;
                // Pantry counter + espresso machine
                const pantry = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.9, 0.65), deskTopMat);
                pantry.position.set(z.x + 2.2, 0.52, z.z - 1.8);
                pantry.castShadow = true;
                const espresso = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.36, 0.3), metalMat);
                espresso.position.set(z.x + 2.2, 1.15, z.z - 1.8);
                zoneGroup.add(rug, sofaMain, sofaSide, coffeeTable, beanBag, pantry, espresso);
                addPlanter(zoneGroup, z.x - 2.6, z.z + 1.8, 1.2);
            }

            if (z.id === 'project') {
                const warTable = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.1, 1.55), woodMat);
                warTable.position.set(z.x, 0.78, z.z + 0.2);
                warTable.castShadow = true;
                const warLeg = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.7, 0.55), metalMat);
                warLeg.position.set(z.x, 0.42, z.z + 0.2);
                zoneGroup.add(warTable, warLeg);

                [-0.85, 0.85].forEach((ox) => {
                    [-1.05, 1.05].forEach((oz) => {
                        const c = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.52, 0.46), chairMat);
                        c.position.set(z.x + ox, 0.48, z.z + 0.2 + oz);
                        c.castShadow = true;
                        zoneGroup.add(c);
                    });
                });

                // Kanban whiteboard with sticky notes
                const board = new THREE.Mesh(
                    new THREE.BoxGeometry(3.0, 1.45, 0.08),
                    new THREE.MeshStandardMaterial({
                        color: isDark ? 0x15223a : 0xffffff,
                        roughness: 0.25,
                    }),
                );
                board.position.set(z.x, 1.55, z.z - 2.15);
                board.castShadow = true;
                zoneGroup.add(board);

                const stickyColors = [0xf59e0b, 0x2563eb, 0x16a34a, 0xec4899, 0x8b5cf6];
                stickyColors.forEach((sc, si) => {
                    const note = new THREE.Mesh(
                        new THREE.BoxGeometry(0.32, 0.24, 0.02),
                        new THREE.MeshBasicMaterial({ color: sc }),
                    );
                    note.position.set(z.x - 0.9 + si * 0.45, 1.65 - (si % 2) * 0.34, z.z - 2.09);
                    zoneGroup.add(note);
                });
                addPlanter(zoneGroup, z.x + 2.5, z.z + 1.9, 1.0);
            }

            tagRoom(zoneGroup, z.id);
            scene.add(zoneGroup);
            zoneVisuals[z.id] = { group: zoneGroup, floorMat, borderMat, labelSprite };
        });

        // Stylized 3D Team Avatars with Billboard Labels & Status Pulse Rings
        const avatarsRoot = new THREE.Group();
        scene.add(avatarsRoot);
        avatarPositionsRef.current = {};

        const zoneOffsets: Record<string, number> = {};
        members.forEach((m, idx) => {
            const layout = ZONE_LAYOUTS[m.zone] ?? ZONE_LAYOUTS.workspace;
            const slot = zoneOffsets[m.zone] ?? 0;
            zoneOffsets[m.zone] = slot + 1;

            const angle = slot * 1.65 + 0.4;
            const radius = 1.25 + (slot % 2) * 0.7;
            const ax = layout.x + Math.cos(angle) * radius;
            const az = layout.z + Math.sin(angle) * radius;

            const statusColor = STATUS_COLORS[m.status] ?? 0x2563eb;
            const statusHex = `#${statusColor.toString(16).padStart(6, '0')}`;
            const colorNum = parseInt(m.avatar_color.replace('#', ''), 16) || 0x2563eb;

            const avatarGroup = new THREE.Group();
            avatarGroup.position.set(ax, 0.08, az);

            const ring = new THREE.Mesh(
                new THREE.RingGeometry(0.28, 0.38, 28),
                new THREE.MeshBasicMaterial({
                    color: statusColor,
                    transparent: true,
                    opacity: 0.85,
                    side: THREE.DoubleSide,
                }),
            );
            ring.rotation.x = -Math.PI / 2;
            ring.position.y = 0.02;

            const body = new THREE.Mesh(
                new THREE.CapsuleGeometry(0.21, 0.4, 8, 14),
                new THREE.MeshStandardMaterial({ color: colorNum, roughness: 0.32, metalness: 0.15 }),
            );
            body.position.y = 0.48;
            body.castShadow = true;

            const head = new THREE.Mesh(
                new THREE.SphereGeometry(0.18, 16, 16),
                new THREE.MeshStandardMaterial({ color: isDark ? 0xf4f7ff : 0xfef3c7, roughness: 0.38 }),
            );
            head.position.y = 0.98;
            head.castShadow = true;

            const label = createLabelSprite(m.name.split(' ')[0] ?? m.name, statusHex, isDark);
            label.position.set(0, 1.55, 0);

            avatarGroup.add(ring, body, head, label);
            avatarGroup.traverse((child) => {
                child.userData.roomId = layout.id;
                child.userData.memberId = m.id;
            });
            avatarsRoot.add(avatarGroup);
            interactiveMeshes.push(avatarGroup);
            avatarPositionsRef.current[m.id] = new THREE.Vector3(ax, 0.5, az);
            avatarEntries.push({
                member: m,
                group: avatarGroup,
                ring,
                label,
                baseY: 0.08,
                phase: idx * 0.9,
            });
        });

        // Raycasting for Room & Avatar hover/click
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
            const hit = hits[0]?.object;
            return {
                roomId: (hit?.userData?.roomId as string) ?? null,
                memberId: (hit?.userData?.memberId as number) ?? null,
                localX: clientX - rect.left,
                localY: clientY - rect.top,
            };
        };

        const handlePointerMove = (e: PointerEvent) => {
            const { roomId, memberId, localX, localY } = pickHit(e.clientX, e.clientY);
            hoveredRoomId = roomId;
            hoveredMemberId = memberId;
            renderer.domElement.style.cursor = roomId || memberId ? 'pointer' : 'grab';

            if (memberId && showMembersRef.current) {
                const found = members.find((m) => m.id === memberId) ?? null;
                onHoverMemberRef.current?.(found, { x: localX, y: localY });
            } else {
                onHoverMemberRef.current?.(null, null);
            }
        };

        const handlePointerDown = (e: PointerEvent) => {
            pointerDownPos = { x: e.clientX, y: e.clientY };
            flyAnimRef.current = null; // User drag takes over
        };

        const handlePointerUp = (e: PointerEvent) => {
            const dist = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
            if (dist > 6) return;
            const { roomId, memberId } = pickHit(e.clientX, e.clientY);
            if (memberId && showMembersRef.current) {
                const found = members.find((m) => m.id === memberId);
                if (found) {
                    onSelectMemberRef.current?.(found);
                    return;
                }
            }
            if (roomId) {
                onSelectRoomRef.current(roomId);
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

            // Smooth easeInOutCubic fly-to animation
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

            // Zone highlights & dimming of unselected zones
            const activeRoom = selectedRoomRef.current;
            Object.entries(zoneVisuals).forEach(([id, vis]) => {
                const isSelected = activeRoom === id;
                const isHovered = hoveredRoomId === id;
                vis.labelSprite.visible = showLabelsRef.current;
                if (isSelected) {
                    vis.floorMat.emissiveIntensity = isDark ? 0.2 : 0.08;
                    vis.borderMat.opacity = 1;
                } else if (isHovered) {
                    vis.floorMat.emissiveIntensity = isDark ? 0.11 : 0.04;
                    vis.borderMat.opacity = 0.85;
                } else {
                    vis.floorMat.emissiveIntensity = isDark ? 0.03 : 0.005;
                    vis.borderMat.opacity = activeRoom ? 0.35 : 0.65;
                }
            });

            // Living avatars idle animation & visibility
            avatarsRoot.visible = showMembersRef.current;
            if (showMembersRef.current) {
                avatarEntries.forEach((entry) => {
                    entry.label.visible = showLabelsRef.current;
                    const isHovered = hoveredMemberId === entry.member.id;
                    const bob = reducedMotion ? 0 : Math.sin(t * 2.2 + entry.phase) * 0.035;
                    const hoverLift = isHovered ? 0.16 : 0;
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
            cancelAnimationFrame(rafId);
            document.removeEventListener('visibilitychange', handleVisibility);
            resizeObserver.disconnect();
            renderer.domElement.removeEventListener('pointermove', handlePointerMove);
            renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
            renderer.domElement.removeEventListener('pointerup', handlePointerUp);
            controls.dispose();
            pmrem.dispose();
            envTex.dispose();
            scene.traverse((obj) => {
                if ((obj as THREE.Mesh).geometry) (obj as THREE.Mesh).geometry.dispose();
                const mat = (obj as THREE.Mesh).material;
                if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
                else if (mat) mat.dispose();
            });
            renderer.dispose();
        };
    }, [theme, members, onWebGLError]);

    // External camera commands with smooth easeInOutCubic fly-to
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
