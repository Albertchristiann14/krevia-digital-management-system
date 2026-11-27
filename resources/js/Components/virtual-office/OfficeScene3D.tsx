import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export interface VirtualRoomData {
    id: string;
    name: string;
    code: string;
    accent: string;
    description: string;
    capacity: number;
    primary_action: { label: string; href: string };
    secondary_action: { label: string; href: string };
    metrics: Array<{ label: string; value: string | number }>;
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
    | { type: 'topDown'; seq: number }
    | { type: 'zoomIn'; seq: number }
    | { type: 'zoomOut'; seq: number }
    | { type: 'focusRoom'; roomId: string; seq: number };

interface OfficeScene3DProps {
    rooms: VirtualRoomData[];
    members: VirtualMemberData[];
    selectedRoomId: string | null;
    onSelectRoom: (roomId: string) => void;
    cameraCommand: CameraCommand | null;
    onWebGLError?: () => void;
}

interface ZoneLayout {
    id: string;
    x: number;
    z: number;
    w: number;
    d: number;
    accent: number;
    cameraOffset: [number, number, number];
}

const ZONE_LAYOUTS: Record<string, ZoneLayout> = {
    reception: { id: 'reception', x: -7.2, z: 4.5, w: 6.8, d: 5.2, accent: 0x45d8e8, cameraOffset: [15, 13, 15] },
    workspace: { id: 'workspace', x: -3.5, z: -3.6, w: 13.6, d: 7.4, accent: 0x668cff, cameraOffset: [18, 15, 18] },
    meeting: { id: 'meeting', x: 7.2, z: -3.6, w: 7.2, d: 7.4, accent: 0xa17aff, cameraOffset: [15, 13, 15] },
    lounge: { id: 'lounge', x: 0.4, z: 4.5, w: 6.8, d: 5.2, accent: 0x42c99a, cameraOffset: [15, 13, 15] },
    project: { id: 'project', x: 7.5, z: 4.5, w: 6.4, d: 5.2, accent: 0xf4b860, cameraOffset: [15, 13, 15] },
};

export default function OfficeScene3D({
    members,
    selectedRoomId,
    onSelectRoom,
    cameraCommand,
    onWebGLError,
}: OfficeScene3DProps) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const selectedRoomRef = useRef<string | null>(selectedRoomId);
    const onSelectRoomRef = useRef(onSelectRoom);
    const controlsRef = useRef<OrbitControls | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const targetGoalRef = useRef<{ pos: THREE.Vector3; target: THREE.Vector3 } | null>(null);

    selectedRoomRef.current = selectedRoomId;
    onSelectRoomRef.current = onSelectRoom;

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

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
        const height = container.clientHeight || 560;
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setSize(width, height);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.15;

        container.innerHTML = '';
        container.appendChild(renderer.domElement);

        const scene = new THREE.Scene();
        scene.fog = new THREE.FogExp2(0x070b16, 0.011);

        const camera = new THREE.PerspectiveCamera(28, width / height, 0.5, 140);
        camera.position.set(25, 21, 25);
        cameraRef.current = camera;

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.08;
        controls.minDistance = 13;
        controls.maxDistance = 46;
        controls.minPolarAngle = 0.12;
        controls.maxPolarAngle = Math.PI / 2.25;
        controls.target.set(0, 0, 0);
        controlsRef.current = controls;

        // Lighting: Deep midnight corporate ambiance + cyan/blue/violet rim lights
        const ambientLight = new THREE.AmbientLight(0x9bb4ff, 0.72);
        scene.add(ambientLight);

        const hemiLight = new THREE.HemisphereLight(0x668cff, 0x070b16, 0.75);
        scene.add(hemiLight);

        const dirLight = new THREE.DirectionalLight(0xeef4ff, 1.5);
        dirLight.position.set(18, 26, 16);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.set(1024, 1024);
        dirLight.shadow.camera.near = 4;
        dirLight.shadow.camera.far = 65;
        const d = 18;
        dirLight.shadow.camera.left = -d;
        dirLight.shadow.camera.right = d;
        dirLight.shadow.camera.top = d;
        dirLight.shadow.camera.bottom = -d;
        dirLight.shadow.bias = -0.0005;
        scene.add(dirLight);

        const cyanFill = new THREE.PointLight(0x45d8e8, 1.4, 24);
        cyanFill.position.set(-8, 4.5, 4);
        scene.add(cyanFill);

        const violetFill = new THREE.PointLight(0xa17aff, 1.4, 24);
        violetFill.position.set(8, 4.5, -4);
        scene.add(violetFill);

        // Shared Materials
        const baseSlabMat = new THREE.MeshStandardMaterial({
            color: 0x0b1222,
            roughness: 0.65,
            metalness: 0.25,
        });
        const darkMetalMat = new THREE.MeshStandardMaterial({
            color: 0x182540,
            roughness: 0.35,
            metalness: 0.75,
        });
        const deskTopMat = new THREE.MeshStandardMaterial({
            color: 0x1c2c4a,
            roughness: 0.4,
            metalness: 0.3,
        });
        const chairMat = new THREE.MeshStandardMaterial({
            color: 0x263859,
            roughness: 0.55,
            metalness: 0.2,
        });
        const glassMat = new THREE.MeshPhysicalMaterial({
            color: 0x8bb8ff,
            transparent: true,
            opacity: 0.22,
            roughness: 0.12,
            metalness: 0.1,
            transmission: 0.25,
        });
        const sofaMat = new THREE.MeshStandardMaterial({
            color: 0x1e3354,
            roughness: 0.75,
            metalness: 0.1,
        });
        const plantPotMat = new THREE.MeshStandardMaterial({
            color: 0x15223a,
            roughness: 0.6,
            metalness: 0.2,
        });
        const plantLeafMat = new THREE.MeshStandardMaterial({
            color: 0x2ca87f,
            roughness: 0.65,
            metalness: 0.05,
        });

        // Main Architectural Floor Slab & Grid
        const floorSlab = new THREE.Mesh(new THREE.BoxGeometry(24, 0.4, 17), baseSlabMat);
        floorSlab.position.set(0.2, -0.25, 0.3);
        floorSlab.receiveShadow = true;
        scene.add(floorSlab);

        const gridHelper = new THREE.GridHelper(32, 32, 0x2a406e, 0x14203b);
        gridHelper.position.y = -0.04;
        scene.add(gridHelper);

        // Interactive Room Meshes Registry
        const interactiveMeshes: THREE.Object3D[] = [];
        const zoneVisuals: Record<
            string,
            { floorMat: THREE.MeshStandardMaterial; borderMat: THREE.MeshBasicMaterial }
        > = {};

        const tagRoom = (obj: THREE.Object3D, roomId: string) => {
            obj.traverse((child) => {
                child.userData.roomId = roomId;
            });
            interactiveMeshes.push(obj);
        };

        // Helper builders for realistic furniture
        const addPlanter = (x: number, z: number, roomId: string) => {
            const g = new THREE.Group();
            const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.2, 0.45, 12), plantPotMat);
            pot.position.y = 0.225;
            pot.castShadow = true;
            g.add(pot);

            const foliage = new THREE.Mesh(new THREE.DodecahedronGeometry(0.36, 1), plantLeafMat);
            foliage.position.y = 0.68;
            foliage.scale.set(1, 1.25, 1);
            foliage.castShadow = true;
            g.add(foliage);

            g.position.set(x, 0, z);
            tagRoom(g, roomId);
            scene.add(g);
        };

        const addWorkstation = (x: number, z: number, rotY: number, roomId: string, screenColor = 0x45d8e8) => {
            const g = new THREE.Group();
            // Desk top
            const top = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.08, 0.85), deskTopMat);
            top.position.y = 0.74;
            top.castShadow = true;
            top.receiveShadow = true;
            g.add(top);

            // Desk legs
            const legGeo = new THREE.BoxGeometry(0.07, 0.72, 0.72);
            const legL = new THREE.Mesh(legGeo, darkMetalMat);
            legL.position.set(-0.78, 0.36, 0);
            legL.castShadow = true;
            const legR = new THREE.Mesh(legGeo, darkMetalMat);
            legR.position.set(0.78, 0.36, 0);
            legR.castShadow = true;
            g.add(legL, legR);

            // Dual glowing monitors
            const monitorMat = new THREE.MeshStandardMaterial({
                color: 0x0b162c,
                emissive: screenColor,
                emissiveIntensity: 0.45,
                roughness: 0.2,
            });
            [-0.32, 0.32].forEach((mx, idx) => {
                const mon = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.34, 0.04), monitorMat);
                mon.position.set(mx, 1.0, -0.22);
                mon.rotation.y = idx === 0 ? 0.12 : -0.12;
                mon.castShadow = true;
                g.add(mon);
            });

            // Ergonomic chair
            const seat = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.08, 0.5), chairMat);
            seat.position.set(0, 0.46, 0.66);
            seat.castShadow = true;
            const back = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.56, 0.08), chairMat);
            back.position.set(0, 0.76, 0.88);
            back.castShadow = true;
            const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.42, 8), darkMetalMat);
            stem.position.set(0, 0.22, 0.66);
            g.add(seat, back, stem);

            g.position.set(x, 0, z);
            g.rotation.y = rotY;
            tagRoom(g, roomId);
            scene.add(g);
        };

        // Build each of the 5 Zones
        Object.values(ZONE_LAYOUTS).forEach((z) => {
            const floorMat = new THREE.MeshStandardMaterial({
                color: 0x101a30,
                emissive: z.accent,
                emissiveIntensity: 0.04,
                roughness: 0.55,
                metalness: 0.25,
            });
            const zoneFloor = new THREE.Mesh(new THREE.BoxGeometry(z.w, 0.08, z.d), floorMat);
            zoneFloor.position.set(z.x, 0.01, z.z);
            zoneFloor.receiveShadow = true;
            tagRoom(zoneFloor, z.id);
            scene.add(zoneFloor);

            // Glowing perimeter outline
            const edges = new THREE.EdgesGeometry(new THREE.BoxGeometry(z.w, 0.09, z.d));
            const borderMat = new THREE.MeshBasicMaterial({
                color: z.accent,
                transparent: true,
                opacity: 0.55,
            });
            const border = new THREE.LineSegments(edges, borderMat);
            border.position.set(z.x, 0.02, z.z);
            scene.add(border);

            zoneVisuals[z.id] = { floorMat, borderMat };
        });

        // 1. Reception & Lobby Furniture
        {
            const recGroup = new THREE.Group();
            const counter = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.05, 0.9), deskTopMat);
            counter.position.set(-7.2, 0.53, 3.8);
            counter.castShadow = true;
            recGroup.add(counter);

            const glowStrip = new THREE.Mesh(
                new THREE.BoxGeometry(3.22, 0.08, 0.05),
                new THREE.MeshBasicMaterial({ color: 0x45d8e8 }),
            );
            glowStrip.position.set(-7.2, 0.88, 4.26);
            recGroup.add(glowStrip);

            const sofa = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.55, 0.9), sofaMat);
            sofa.position.set(-7.2, 0.28, 6.0);
            sofa.castShadow = true;
            recGroup.add(sofa);

            tagRoom(recGroup, 'reception');
            scene.add(recGroup);
            addPlanter(-9.8, 2.5, 'reception');
            addPlanter(-4.5, 2.5, 'reception');
        }

        // 2. Main Workspace (6 workstations + glass divider)
        [
            [-7.6, -5.2, 0],
            [-4.6, -5.2, 0],
            [-1.6, -5.2, 0],
            [-7.6, -1.8, Math.PI],
            [-4.6, -1.8, Math.PI],
            [-1.6, -1.8, Math.PI],
        ].forEach(([wx, wz, rot], idx) => {
            addWorkstation(wx, wz, rot, 'workspace', idx % 2 === 0 ? 0x668cff : 0x45d8e8);
        });
        addPlanter(-9.6, -6.5, 'workspace');

        // 3. Meeting Room (Glass walls + conference table + chairs + screen)
        {
            const meetGroup = new THREE.Group();
            const wallL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.4, 7.0), glassMat);
            wallL.position.set(3.65, 1.2, -3.6);
            const wallF = new THREE.Mesh(new THREE.BoxGeometry(7.0, 2.4, 0.08), glassMat);
            wallF.position.set(7.2, 1.2, 0.05);
            meetGroup.add(wallL, wallF);

            const confTable = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.1, 1.8), deskTopMat);
            confTable.position.set(7.2, 0.76, -3.6);
            confTable.castShadow = true;
            meetGroup.add(confTable);

            const tableLeg = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.72, 0.7), darkMetalMat);
            tableLeg.position.set(7.2, 0.36, -3.6);
            meetGroup.add(tableLeg);

            // Chairs around table
            [-1.4, -0.45, 0.45, 1.4].forEach((offset) => {
                [-1.25, 1.25].forEach((side) => {
                    const c = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.55, 0.48), chairMat);
                    c.position.set(7.2 + offset, 0.48, -3.6 + side);
                    c.castShadow = true;
                    meetGroup.add(c);
                });
            });

            // Glowing presentation screen on back wall
            const screen = new THREE.Mesh(
                new THREE.BoxGeometry(3.2, 1.5, 0.08),
                new THREE.MeshStandardMaterial({
                    color: 0x101a30,
                    emissive: 0xa17aff,
                    emissiveIntensity: 0.45,
                }),
            );
            screen.position.set(7.2, 1.6, -7.0);
            meetGroup.add(screen);

            tagRoom(meetGroup, 'meeting');
            scene.add(meetGroup);
        }

        // 4. Lounge Area (L-sofa + coffee table + greenery)
        {
            const loungeGroup = new THREE.Group();
            const sofaMain = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.58, 0.95), sofaMat);
            sofaMain.position.set(0.4, 0.3, 3.2);
            sofaMain.castShadow = true;
            const sofaSide = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.58, 2.2), sofaMat);
            sofaSide.position.set(-0.82, 0.3, 4.75);
            sofaSide.castShadow = true;
            const coffeeTable = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.42, 20), deskTopMat);
            coffeeTable.position.set(1.0, 0.22, 4.8);
            coffeeTable.castShadow = true;
            loungeGroup.add(sofaMain, sofaSide, coffeeTable);

            tagRoom(loungeGroup, 'lounge');
            scene.add(loungeGroup);
            addPlanter(3.0, 2.8, 'lounge');
        }

        // 5. Project Room (War-room table + Kanban wall display)
        {
            const projGroup = new THREE.Group();
            const warTable = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.1, 1.6), deskTopMat);
            warTable.position.set(7.5, 0.76, 4.6);
            warTable.castShadow = true;
            const warLeg = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.72, 0.6), darkMetalMat);
            warLeg.position.set(7.5, 0.36, 4.6);
            projGroup.add(warTable, warLeg);

            [-0.8, 0.8].forEach((ox) => {
                [-1.1, 1.1].forEach((oz) => {
                    const c = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.52, 0.48), chairMat);
                    c.position.set(7.5 + ox, 0.46, 4.6 + oz);
                    c.castShadow = true;
                    projGroup.add(c);
                });
            });

            const board = new THREE.Mesh(
                new THREE.BoxGeometry(2.8, 1.35, 0.08),
                new THREE.MeshStandardMaterial({
                    color: 0x101a30,
                    emissive: 0xf4b860,
                    emissiveIntensity: 0.38,
                }),
            );
            board.position.set(7.5, 1.55, 2.1);
            projGroup.add(board);

            tagRoom(projGroup, 'project');
            scene.add(projGroup);
            addPlanter(10.0, 6.4, 'project');
        }

        // Stylized 3D Team Member Avatars in their current zones
        const zoneOffsets: Record<string, number> = {};
        members.forEach((m) => {
            const layout = ZONE_LAYOUTS[m.zone] ?? ZONE_LAYOUTS.workspace;
            const slot = zoneOffsets[m.zone] ?? 0;
            zoneOffsets[m.zone] = slot + 1;

            const angle = slot * 1.4;
            const radius = 1.1 + (slot % 2) * 0.65;
            const ax = layout.x + Math.cos(angle) * radius;
            const az = layout.z + Math.sin(angle) * radius;

            const colorNum = parseInt(m.avatar_color.replace('#', ''), 16) || 0x668cff;
            const avatarGroup = new THREE.Group();

            const ring = new THREE.Mesh(
                new THREE.RingGeometry(0.28, 0.36, 24),
                new THREE.MeshBasicMaterial({ color: colorNum, side: THREE.DoubleSide }),
            );
            ring.rotation.x = -Math.PI / 2;
            ring.position.y = 0.06;

            const body = new THREE.Mesh(
                new THREE.CapsuleGeometry(0.2, 0.42, 6, 12),
                new THREE.MeshStandardMaterial({ color: colorNum, roughness: 0.35, metalness: 0.2 }),
            );
            body.position.y = 0.55;
            body.castShadow = true;

            const head = new THREE.Mesh(
                new THREE.SphereGeometry(0.18, 14, 14),
                new THREE.MeshStandardMaterial({ color: 0xf4f7ff, roughness: 0.4 }),
            );
            head.position.y = 1.06;
            head.castShadow = true;

            avatarGroup.add(ring, body, head);
            avatarGroup.position.set(ax, 0, az);
            tagRoom(avatarGroup, layout.id);
            scene.add(avatarGroup);
        });

        // Raycasting for hover & click room selection
        const raycaster = new THREE.Raycaster();
        const pointer = new THREE.Vector2();
        let hoveredRoomId: string | null = null;
        let pointerDownPos = { x: 0, y: 0 };

        const pickRoom = (clientX: number, clientY: number): string | null => {
            const rect = renderer.domElement.getBoundingClientRect();
            pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
            pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
            raycaster.setFromCamera(pointer, camera);
            const hits = raycaster.intersectObjects(interactiveMeshes, true);
            return (hits[0]?.object?.userData?.roomId as string) ?? null;
        };

        const handlePointerMove = (e: PointerEvent) => {
            const nextHover = pickRoom(e.clientX, e.clientY);
            hoveredRoomId = nextHover;
            renderer.domElement.style.cursor = nextHover ? 'pointer' : 'grab';
        };

        const handlePointerDown = (e: PointerEvent) => {
            pointerDownPos = { x: e.clientX, y: e.clientY };
        };

        const handlePointerUp = (e: PointerEvent) => {
            const dist = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
            if (dist > 6) return; // Ignore drags
            const clicked = pickRoom(e.clientX, e.clientY);
            if (clicked) {
                onSelectRoomRef.current(clicked);
            }
        };

        renderer.domElement.addEventListener('pointermove', handlePointerMove);
        renderer.domElement.addEventListener('pointerdown', handlePointerDown);
        renderer.domElement.addEventListener('pointerup', handlePointerUp);

        // ResizeObserver
        const resizeObserver = new ResizeObserver(() => {
            if (!container) return;
            const w = container.clientWidth || 960;
            const h = container.clientHeight || 560;
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            renderer.setSize(w, h);
        });
        resizeObserver.observe(container);

        // Render loop with visibility pause
        let rafId = 0;
        let isPaused = document.hidden;

        const animate = () => {
            if (isPaused) return;
            rafId = requestAnimationFrame(animate);

            // Smooth camera transition if commanded
            const goal = targetGoalRef.current;
            if (goal) {
                camera.position.lerp(goal.pos, 0.1);
                controls.target.lerp(goal.target, 0.1);
                if (
                    camera.position.distanceTo(goal.pos) < 0.08 &&
                    controls.target.distanceTo(goal.target) < 0.08
                ) {
                    targetGoalRef.current = null;
                }
            }

            // Clamp pan boundaries
            controls.target.x = THREE.MathUtils.clamp(controls.target.x, -11, 11);
            controls.target.z = THREE.MathUtils.clamp(controls.target.z, -8, 8);
            controls.target.y = 0;

            // Update room highlight intensities
            Object.entries(zoneVisuals).forEach(([id, vis]) => {
                const isSelected = selectedRoomRef.current === id;
                const isHovered = hoveredRoomId === id;
                vis.floorMat.emissiveIntensity = isSelected ? 0.22 : isHovered ? 0.12 : 0.04;
                vis.borderMat.opacity = isSelected ? 1 : isHovered ? 0.85 : 0.45;
            });

            controls.update();
            renderer.render(scene, camera);
        };

        const handleVisibility = () => {
            isPaused = document.hidden;
            if (!isPaused) {
                animate();
            } else {
                cancelAnimationFrame(rafId);
            }
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
            scene.traverse((obj) => {
                if ((obj as THREE.Mesh).geometry) {
                    (obj as THREE.Mesh).geometry.dispose();
                }
                const mat = (obj as THREE.Mesh).material;
                if (Array.isArray(mat)) {
                    mat.forEach((m) => m.dispose());
                } else if (mat) {
                    mat.dispose();
                }
            });
            renderer.dispose();
        };
    }, [members, onWebGLError]);

    // Handle external camera control buttons & room focus
    useEffect(() => {
        if (!cameraCommand || !cameraRef.current || !controlsRef.current) return;

        if (cameraCommand.type === 'reset') {
            targetGoalRef.current = {
                pos: new THREE.Vector3(25, 21, 25),
                target: new THREE.Vector3(0, 0, 0),
            };
        } else if (cameraCommand.type === 'topDown') {
            targetGoalRef.current = {
                pos: new THREE.Vector3(0.01, 34, 0.01),
                target: new THREE.Vector3(0, 0, 0),
            };
        } else if (cameraCommand.type === 'zoomIn') {
            const dir = new THREE.Vector3()
                .subVectors(cameraRef.current.position, controlsRef.current.target)
                .multiplyScalar(0.78);
            targetGoalRef.current = {
                pos: controlsRef.current.target.clone().add(dir),
                target: controlsRef.current.target.clone(),
            };
        } else if (cameraCommand.type === 'zoomOut') {
            const dir = new THREE.Vector3()
                .subVectors(cameraRef.current.position, controlsRef.current.target)
                .multiplyScalar(1.25);
            targetGoalRef.current = {
                pos: controlsRef.current.target.clone().add(dir),
                target: controlsRef.current.target.clone(),
            };
        } else if (cameraCommand.type === 'focusRoom') {
            const layout = ZONE_LAYOUTS[cameraCommand.roomId];
            if (layout) {
                targetGoalRef.current = {
                    pos: new THREE.Vector3(
                        layout.x + layout.cameraOffset[0],
                        layout.cameraOffset[1],
                        layout.z + layout.cameraOffset[2],
                    ),
                    target: new THREE.Vector3(layout.x, 0, layout.z),
                };
            }
        }
    }, [cameraCommand]);

    return <div ref={containerRef} className="h-full w-full select-none" />;
}
