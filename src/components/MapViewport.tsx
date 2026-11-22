import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { solveWorldTransforms } from '../engine/animationEngine';
import {
  applyTerrainBrush,
  getTerrainHalfSpan,
  sampleTerrainHeight,
} from '../engine/mapPresets';
import {
  MapEditorTool,
  MapObjectNode,
  MapPrefabKind,
  StudioMapScene,
  TERRAIN_BIOME_SPECS,
  TerrainBiomeMaterial,
  TerrainBrushTool,
} from '../engine/mapTypes';
import { createNormalizedShapeGeometry } from '../engine/robloxGeometry';
import { buildThreeMaterialForPart, createMaterialTextureCache } from '../engine/robloxMaterials';
import { CameraPreset, StudioSceneModel, TransformMode } from '../engine/robloxTypes';

interface MapViewportProps {
  map: StudioMapScene;
  activeTool: MapEditorTool;
  transformMode: TransformMode;
  brushTool: TerrainBrushTool;
  brushRadius: number;
  brushStrength: number;
  paintMaterial: TerrainBiomeMaterial;
  activePlaceKind: MapPrefabKind;
  stampSourceModel: StudioSceneModel;
  stampPresetId?: string;
  selectedObjectId: string | null;
  studSnap: number;
  showGrid: boolean;
  simulateMap: boolean;
  cameraPresetRequest: { preset: CameraPreset; seq: number } | null;
  onSelectObject: (id: string | null) => void;
  onCommitTerrain: (heights: number[], materials: TerrainBiomeMaterial[]) => void;
  onPlaceObject: (worldPos: [number, number, number]) => void;
  onUpdateObjectTransform: (
    id: string,
    patch: Partial<Pick<MapObjectNode, 'position' | 'rotation' | 'scale'>>
  ) => void;
}

const _camPosGoal = new THREE.Vector3(82, 58, 96);
const _camTargetGoal = new THREE.Vector3(0, 2, 0);
const _rayVec = new THREE.Vector2();
const _tmpColor = new THREE.Color();
const _dawnColor = new THREE.Color('#E8A87C');
const _dayColor = new THREE.Color('#60A5FA');
const _duskColor = new THREE.Color('#6D4C94');
const _nightColor = new THREE.Color('#0E1320');
const _sunColor = new THREE.Color('#FFF4E0');
const _moonColor = new THREE.Color('#93C5FD');

function snapVal(v: number, step: number): number {
  if (step <= 0) return Math.round(v * 100) / 100;
  return Math.round(Math.round(v / step) * step * 100) / 100;
}

function createTerrainStudTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#EAEAEA';
    ctx.fillRect(0, 0, size, size);
    const cell = size / 4;
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x * cell, y * cell, cell, cell);
        ctx.beginPath();
        ctx.arc(x * cell + cell / 2, y * cell + cell / 2, cell * 0.22, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.fill();
      }
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(48, 48);
  tex.anisotropy = Math.min(8, maxAnisotropy || 1);
  tex.needsUpdate = true;
  return tex;
}

function buildCompositePrefabGroup(
  obj: MapObjectNode,
  texCache: ReturnType<typeof createMaterialTextureCache>,
  isNight: boolean,
  isSoftwareGl: boolean
): THREE.Group {
  const group = new THREE.Group();
  group.name = `MapObj_${obj.id}`;
  group.userData.mapObjectId = obj.id;

  const baseColor = new THREE.Color(obj.color || '#3B82F6');
  const [sx, sy, sz] = obj.scale;

  const addBox = (
    w: number,
    h: number,
    d: number,
    px: number,
    py: number,
    pz: number,
    color: THREE.ColorRepresentation,
    opts?: { emissive?: number; roughness?: number; metalness?: number; opacity?: number; name?: string }
  ) => {
    const mat = new THREE.MeshStandardMaterial({
      color,
      roughness: opts?.roughness ?? 0.52,
      metalness: opts?.metalness ?? 0.1,
      emissive: opts?.emissive ? new THREE.Color(color) : new THREE.Color(0x000000),
      emissiveIntensity: opts?.emissive ?? 0,
      transparent: (opts?.opacity ?? 1) < 1,
      opacity: opts?.opacity ?? 1,
    });
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(px, py, pz);
    m.castShadow = (opts?.opacity ?? 1) >= 0.9;
    m.receiveShadow = true;
    m.userData.mapObjectId = obj.id;
    if (opts?.name) m.name = opts.name;
    group.add(m);
    return m;
  };

  if (obj.kind === 'StampedModel' && obj.modelSnapshot) {
    const activeParts = obj.modelSnapshot.parts.filter((p) => p.visible);
    const worldMap = solveWorldTransforms(activeParts);
    for (const p of activeParts) {
      const solved = worldMap.get(p.id);
      const pos = solved?.worldPosition ?? p.position;
      const rot = solved?.worldRotation ?? p.rotation;
      const size = solved?.size ?? p.size;
      const geo = createNormalizedShapeGeometry(p.shape);
      const mat = buildThreeMaterialForPart(p, texCache, isSoftwareGl);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(pos[0], pos[1], pos[2]);
      mesh.rotation.set(
        THREE.MathUtils.degToRad(rot[0]),
        THREE.MathUtils.degToRad(rot[1]),
        THREE.MathUtils.degToRad(rot[2])
      );
      mesh.scale.set(size[0], size[1], size[2]);
      mesh.castShadow = p.castShadow;
      mesh.receiveShadow = true;
      mesh.userData.mapObjectId = obj.id;
      group.add(mesh);
    }
    group.scale.set(sx, sy, sz);
    return group;
  }

  switch (obj.kind) {
    case 'SpawnLocation': {
      addBox(sx, sy * 0.6, sz, 0, sy * 0.3, 0, '#1E293B', { roughness: 0.4, metalness: 0.5 });
      addBox(sx * 0.82, sy * 0.45, sz * 0.82, 0, sy * 0.65, 0, baseColor, { emissive: 0.45 });
      addBox(sx * 0.28, sy * 0.55, sz * 0.28, 0, sy * 0.9, 0, '#F8FAFC', { emissive: 0.7 });
      break;
    }
    case 'Checkpoint': {
      addBox(sx, sy * 0.6, sz, 0, sy * 0.3, 0, '#0F172A', { roughness: 0.4, metalness: 0.5 });
      addBox(sx * 0.78, sy * 0.4, sz * 0.78, 0, sy * 0.62, 0, baseColor, { emissive: 0.75 });
      // Arch pillars
      addBox(0.7, 5.2, 0.7, -sx * 0.42, 2.8, 0, '#334155', { metalness: 0.6 });
      addBox(0.7, 5.2, 0.7, sx * 0.42, 2.8, 0, '#334155', { metalness: 0.6 });
      addBox(sx * 0.92, 0.75, 0.9, 0, 5.4, 0, baseColor, { emissive: 0.6 });
      break;
    }
    case 'KillBrick': {
      addBox(sx, sy, sz, 0, sy * 0.5, 0, baseColor, { emissive: 0.9, roughness: 0.2 });
      addBox(sx * 0.92, sy * 0.25, sz * 0.92, 0, sy + 0.08, 0, '#FCA5A5', { emissive: 0.6 });
      break;
    }
    case 'JumpPad': {
      addBox(sx, sy * 0.5, sz, 0, sy * 0.25, 0, '#1E293B', { metalness: 0.7, roughness: 0.3 });
      addBox(sx * 0.78, sy * 0.45, sz * 0.78, 0, sy * 0.6, 0, baseColor, { emissive: 0.85 });
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(sx * 0.36, 0.22, 10, 24),
        new THREE.MeshStandardMaterial({
          color: '#E0F2FE',
          emissive: baseColor,
          emissiveIntensity: 1.1,
        })
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.y = sy * 1.4;
      ring.name = 'AnimPulseRing';
      ring.userData.mapObjectId = obj.id;
      group.add(ring);
      break;
    }
    case 'SpeedPad': {
      addBox(sx, sy * 0.5, sz, 0, sy * 0.25, 0, '#1E293B', { metalness: 0.6 });
      addBox(sx * 0.75, sy * 0.4, sz * 0.85, 0, sy * 0.55, 0, baseColor, { emissive: 0.8 });
      addBox(sx * 0.4, sy * 0.3, sz * 0.25, 0, sy * 0.8, -sz * 0.2, '#FEF08A', { emissive: 0.9 });
      break;
    }
    case 'InteractiveDoor': {
      const pillarW = Math.max(0.8, sx * 0.14);
      addBox(pillarW, sy, sz * 1.15, -sx * 0.5, sy * 0.5, 0, '#334155', { metalness: 0.65 });
      addBox(pillarW, sy, sz * 1.15, sx * 0.5, sy * 0.5, 0, '#334155', { metalness: 0.65 });
      addBox(sx + pillarW, 1.1, sz * 1.2, 0, sy + 0.4, 0, '#1E293B', { metalness: 0.7 });
      addBox(sx * 0.88, sy * 0.94, sz * 0.65, 0, sy * 0.48, 0, baseColor, { roughness: 0.35, metalness: 0.45 });
      addBox(sx * 0.12, sy * 0.5, sz * 0.8, 0, sy * 0.5, 0, '#38BDF8', { emissive: 0.9 });
      break;
    }
    case 'Teleporter': {
      addBox(sx, sy * 0.55, sz, 0, sy * 0.28, 0, '#1E1B4B', { metalness: 0.7, roughness: 0.25 });
      const cyl = new THREE.Mesh(
        new THREE.CylinderGeometry(sx * 0.42, sx * 0.44, sy * 0.35, 24),
        new THREE.MeshStandardMaterial({
          color: baseColor,
          emissive: baseColor,
          emissiveIntensity: 0.95,
        })
      );
      cyl.position.y = sy * 0.6;
      cyl.userData.mapObjectId = obj.id;
      group.add(cyl);
      const portalRing = new THREE.Mesh(
        new THREE.TorusGeometry(sx * 0.4, 0.2, 10, 28),
        new THREE.MeshStandardMaterial({
          color: '#DDD6FE',
          emissive: baseColor,
          emissiveIntensity: 1.2,
        })
      );
      portalRing.rotation.x = Math.PI / 2;
      portalRing.position.y = sy * 1.6;
      portalRing.name = 'AnimPulseRing';
      portalRing.userData.mapObjectId = obj.id;
      group.add(portalRing);
      break;
    }
    case 'CoinPickup': {
      const coinMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(sx * 0.5, sx * 0.5, sz * 0.5, 20),
        new THREE.MeshStandardMaterial({
          color: baseColor,
          emissive: baseColor,
          emissiveIntensity: 0.55,
          metalness: 0.85,
          roughness: 0.2,
        })
      );
      coinMesh.rotation.x = Math.PI / 2;
      coinMesh.name = 'AnimCoinSpin';
      coinMesh.userData.mapObjectId = obj.id;
      group.add(coinMesh);
      break;
    }
    case 'ShopPad': {
      addBox(sx, 0.7, sz, 0, 0.35, 0, '#0F172A', { metalness: 0.5 });
      addBox(sx * 0.88, 2.6, sz * 0.5, 0, 1.8, -sz * 0.12, '#1E293B', { roughness: 0.4 });
      addBox(sx * 0.92, 0.4, sz * 0.7, 0, 3.1, 0, baseColor, { emissive: 0.5 });
      addBox(sx * 0.18, sy, 0.4, -sx * 0.42, sy * 0.5, -sz * 0.28, '#334155');
      addBox(sx * 0.18, sy, 0.4, sx * 0.42, sy * 0.5, -sz * 0.28, '#334155');
      addBox(sx * 1.04, 0.9, sz * 0.9, 0, sy + 0.2, -sz * 0.1, baseColor, { emissive: 0.35 });
      break;
    }
    case 'NPCSpawner': {
      addBox(sx, sy * 0.6, sz, 0, sy * 0.3, 0, '#1F2937', { metalness: 0.65 });
      addBox(sx * 0.76, sy * 0.4, sz * 0.76, 0, sy * 0.65, 0, baseColor, { emissive: 0.85 });
      // Preview silhouette statue above pad
      addBox(1.8, 2.4, 1.8, 0, sy + 1.8, 0, '#F43F5E', { emissive: 0.35, opacity: 0.75 });
      break;
    }
    case 'SafeZone': {
      const dome = new THREE.Mesh(
        new THREE.SphereGeometry(sx * 0.5, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.55),
        new THREE.MeshStandardMaterial({
          color: baseColor,
          emissive: baseColor,
          emissiveIntensity: 0.35,
          transparent: true,
          opacity: 0.24,
          depthWrite: false,
          side: THREE.DoubleSide,
        })
      );
      dome.userData.mapObjectId = obj.id;
      group.add(dome);
      break;
    }
    case 'Streetlamp': {
      addBox(0.9, 0.7, 0.9, 0, 0.35, 0, '#334155', { metalness: 0.7 });
      addBox(0.55, sy * 0.9, 0.55, 0, sy * 0.45, 0, obj.color, { metalness: 0.7 });
      addBox(1.6, 1.4, 1.6, 0, sy * 0.94, 0, '#FEF08A', {
        emissive: isNight ? 1.4 : 0.25,
        roughness: 0.2,
      });
      if (isNight) {
        const pl = new THREE.PointLight('#FDE68A', 2.4, 38, 1.5);
        pl.position.set(0, sy * 0.9, 0);
        group.add(pl);
      }
      break;
    }
    case 'Tree': {
      addBox(sx * 0.26, sy * 0.55, sz * 0.26, 0, sy * 0.275, 0, '#7C4A2D', { roughness: 0.85 });
      addBox(sx, sy * 0.35, sz, 0, sy * 0.65, 0, baseColor, { roughness: 0.78 });
      addBox(sx * 0.72, sy * 0.28, sz * 0.72, 0, sy * 0.92, 0, baseColor, { roughness: 0.78 });
      break;
    }
    case 'Rock': {
      const rockMesh = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.55, 0),
        new THREE.MeshStandardMaterial({ color: baseColor, roughness: 0.85, metalness: 0.05 })
      );
      rockMesh.scale.set(sx, sy, sz);
      rockMesh.position.y = sy * 0.42;
      rockMesh.castShadow = true;
      rockMesh.receiveShadow = true;
      rockMesh.userData.mapObjectId = obj.id;
      group.add(rockMesh);
      break;
    }
    default: {
      // Crate
      addBox(sx, sy, sz, 0, sy * 0.5, 0, baseColor, { roughness: 0.78 });
      addBox(sx * 1.03, sy * 0.15, sz * 1.03, 0, sy * 0.88, 0, '#5C3A21', { roughness: 0.85 });
      addBox(sx * 1.03, sy * 0.15, sz * 1.03, 0, sy * 0.12, 0, '#5C3A21', { roughness: 0.85 });
      break;
    }
  }

  return group;
}

export function MapViewport({
  map,
  activeTool,
  transformMode,
  brushTool,
  brushRadius,
  brushStrength,
  paintMaterial,
  activePlaceKind,
  stampSourceModel,
  selectedObjectId,
  studSnap,
  showGrid,
  simulateMap,
  cameraPresetRequest,
  onSelectObject,
  onCommitTerrain,
  onPlaceObject,
  onUpdateObjectTransform,
}: MapViewportProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [contextLost, setContextLost] = useState(false);

  // Live refs for zero-restart Three.js loop
  const propsRef = useRef({
    map,
    activeTool,
    transformMode,
    brushTool,
    brushRadius,
    brushStrength,
    paintMaterial,
    activePlaceKind,
    stampSourceModel,
    selectedObjectId,
    studSnap,
    simulateMap,
    onSelectObject,
    onCommitTerrain,
    onPlaceObject,
    onUpdateObjectTransform,
  });
  propsRef.current = {
    map,
    activeTool,
    transformMode,
    brushTool,
    brushRadius,
    brushStrength,
    paintMaterial,
    activePlaceKind,
    stampSourceModel,
    selectedObjectId,
    studSnap,
    simulateMap,
    onSelectObject,
    onCommitTerrain,
    onPlaceObject,
    onUpdateObjectTransform,
  };

  const sceneRefs = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    controls: OrbitControls;
    transformControls: TransformControls;
    terrainMesh: THREE.Mesh;
    terrainGeo: THREE.PlaneGeometry;
    waterMesh: THREE.Mesh;
    gridHelper: THREE.GridHelper;
    objectsGroup: THREE.Group;
    brushRing: THREE.Mesh;
    placeGhost: THREE.Mesh;
    sunLight: THREE.DirectionalLight;
    hemiLight: THREE.HemisphereLight;
    fog: THREE.FogExp2;
    selectionBox: THREE.BoxHelper;
    texCache: ReturnType<typeof createMaterialTextureCache>;
    objectGroups: Map<string, THREE.Group>;
    workingHeights: number[];
    workingMaterials: TerrainBiomeMaterial[];
    isPainting: boolean;
    flattenTargetH: number | undefined;
    camTransitioning: boolean;
    simClockOffset: number;
    isSoftwareGl: boolean;
    requestRender: () => void;
    syncTerrainGeometry: (heights: number[], materials: TerrainBiomeMaterial[]) => void;
  } | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setSize(container.clientWidth || 800, container.clientHeight || 600);
    container.appendChild(renderer.domElement);

    const onContextLost = (e: Event) => {
      e.preventDefault();
      setContextLost(true);
    };
    const onContextRestored = () => {
      setContextLost(false);
    };
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', onContextRestored);

    const scene = new THREE.Scene();
    const fog = new THREE.FogExp2('#1E293B', 0.0024);
    scene.background = new THREE.Color('#1E293B');
    scene.fog = fog;

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    const camera = new THREE.PerspectiveCamera(
      48,
      (container.clientWidth || 800) / (container.clientHeight || 600),
      0.5,
      1200
    );
    camera.position.set(82, 58, 96);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.07;
    controls.maxPolarAngle = Math.PI * 0.485;
    controls.minDistance = 12;
    controls.maxDistance = 320;
    controls.target.set(0, 2, 0);

    const hemiLight = new THREE.HemisphereLight('#93C5FD', '#334155', 0.75);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight('#FFF4E0', 2.2);
    sunLight.position.set(70, 95, 55);
    sunLight.castShadow = !isSoftwareGl;
    sunLight.shadow.mapSize.set(2048, 2048);
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 320;
    sunLight.shadow.camera.left = -110;
    sunLight.shadow.camera.right = 110;
    sunLight.shadow.camera.top = 110;
    sunLight.shadow.camera.bottom = -110;
    sunLight.shadow.bias = -0.0005;
    sunLight.shadow.normalBias = 0.02;
    scene.add(sunLight);

    const initialMap = propsRef.current.map;
    const res = initialMap.gridResolution;
    const span = (res - 1) * initialMap.cellSizeStuds;

    const terrainGeo = new THREE.PlaneGeometry(span, span, res - 1, res - 1);
    terrainGeo.rotateX(-Math.PI / 2);
    const vertexCount = res * res;
    const colorAttr = new THREE.BufferAttribute(new Float32Array(vertexCount * 3), 3);
    terrainGeo.setAttribute('color', colorAttr);

    const studTex = createTerrainStudTexture(renderer.capabilities.getMaxAnisotropy());
    const terrainMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      map: studTex,
      roughness: 0.82,
      metalness: 0.04,
    });
    const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
    terrainMesh.receiveShadow = true;
    terrainMesh.name = 'MapTerrainMesh';
    scene.add(terrainMesh);

    const waterMat = new THREE.MeshStandardMaterial({
      color: initialMap.water.color,
      roughness: 0.14,
      metalness: 0.12,
      transparent: true,
      opacity: 1 - initialMap.water.transparency,
    });
    const waterMesh = new THREE.Mesh(new THREE.PlaneGeometry(span, span), waterMat);
    waterMesh.rotation.x = -Math.PI / 2;
    waterMesh.position.y = initialMap.water.level;
    waterMesh.visible = initialMap.water.enabled;
    scene.add(waterMesh);

    const gridHelper = new THREE.GridHelper(span, res - 1, '#38BDF8', '#334155');
    gridHelper.position.y = 0.08;
    const gridMats = Array.isArray(gridHelper.material) ? gridHelper.material : [gridHelper.material];
    gridMats.forEach((m) => {
      m.transparent = true;
      m.opacity = 0.22;
    });
    scene.add(gridHelper);

    const objectsGroup = new THREE.Group();
    scene.add(objectsGroup);

    const brushRing = new THREE.Mesh(
      new THREE.RingGeometry(0.9, 1.0, 40),
      new THREE.MeshBasicMaterial({
        color: '#38BDF8',
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85,
        depthTest: false,
      })
    );
    brushRing.rotation.x = -Math.PI / 2;
    brushRing.visible = false;
    brushRing.renderOrder = 10;
    scene.add(brushRing);

    const placeGhost = new THREE.Mesh(
      new THREE.BoxGeometry(4, 1.2, 4),
      new THREE.MeshBasicMaterial({
        color: '#3B82F6',
        wireframe: true,
        transparent: true,
        opacity: 0.7,
      })
    );
    placeGhost.visible = false;
    scene.add(placeGhost);

    const selectionBox = new THREE.BoxHelper(new THREE.Object3D(), '#38BDF8');
    selectionBox.visible = false;
    scene.add(selectionBox);

    const transformControls = new TransformControls(camera, renderer.domElement);
    transformControls.setSpace('world');
    scene.add(transformControls.getHelper());

    const texCache = createMaterialTextureCache(renderer.capabilities.getMaxAnisotropy());

    let frameId = 0;
    let renderBusy = false;
    let renderDirty = false;
    let isDisposed = false;
    let lastTickMs = performance.now();

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (!gl || typeof gl.fenceSync !== 'function') {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      if (!sync) {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      gl.flush();
      const poll = () => {
        if (isDisposed) {
          gl.deleteSync(sync);
          return;
        }
        const state = gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    const syncTerrainGeometry = (heights: number[], materials: TerrainBiomeMaterial[]) => {
      const posAttr = terrainGeo.getAttribute('position') as THREE.BufferAttribute;
      const colAttr = terrainGeo.getAttribute('color') as THREE.BufferAttribute;
      const count = Math.min(posAttr.count, heights.length);
      for (let i = 0; i < count; i++) {
        posAttr.setY(i, heights[i] ?? 0);
        const spec = TERRAIN_BIOME_SPECS[materials[i] ?? 'Grass'] ?? TERRAIN_BIOME_SPECS.Grass;
        _tmpColor.set(spec.hexColor);
        colAttr.setXYZ(i, _tmpColor.r, _tmpColor.g, _tmpColor.b);
      }
      posAttr.needsUpdate = true;
      colAttr.needsUpdate = true;
      terrainGeo.computeVertexNormals();
      terrainGeo.computeBoundingSphere();
    };

    const applyLightingForClock = (clock: number, baseBrightness: number) => {
      const angle = ((clock - 6) / 24) * Math.PI * 2;
      const sunY = Math.sin(angle) * 110;
      const sunX = Math.cos(angle) * 110;
      sunLight.position.set(sunX, Math.max(18, Math.abs(sunY) + 12), 48);

      const isNight = clock >= 18.5 || clock < 5.75;
      sunLight.color.copy(isNight ? _moonColor : _sunColor);
      sunLight.intensity = isNight ? 0.75 : baseBrightness;

      if (clock >= 5 && clock < 8) {
        _tmpColor.copy(_dawnColor).lerp(_dayColor, (clock - 5) / 3);
      } else if (clock >= 8 && clock < 17) {
        _tmpColor.copy(_dayColor);
      } else if (clock >= 17 && clock < 20) {
        _tmpColor.copy(_duskColor).lerp(_nightColor, (clock - 17) / 3);
      } else {
        _tmpColor.copy(_nightColor);
      }

      if (scene.background instanceof THREE.Color) {
        scene.background.copy(_tmpColor).multiplyScalar(isNight ? 0.85 : 0.48);
      }
      fog.color.copy(scene.background as THREE.Color);
      hemiLight.intensity = isNight ? 0.42 : 0.78;
    };

    const requestRender = () => {
      if (isDisposed) return;
      if (renderBusy) {
        renderDirty = true;
        return;
      }
      renderBusy = true;
      frameId = requestAnimationFrame(() => {
        if (isDisposed) return;
        renderDirty = false;
        const now = performance.now();
        const dt = Math.min(0.1, (now - lastTickMs) / 1000);
        lastTickMs = now;

        const st = sceneRefs.current;
        if (st) {
          if (st.camTransitioning) {
            const k = 1 - Math.exp(-8 * dt);
            camera.position.lerp(_camPosGoal, k);
            controls.target.lerp(_camTargetGoal, k);
            if (camera.position.distanceTo(_camPosGoal) < 0.2) {
              st.camTransitioning = false;
            }
          }
          controls.update();

          if (propsRef.current.simulateMap) {
            if (propsRef.current.map.systems.dayNightCycle && propsRef.current.map.lighting.cycleEnabled) {
              st.simClockOffset = (st.simClockOffset + dt * 0.65) % 24;
              const effectiveClock = (propsRef.current.map.lighting.clockTime + st.simClockOffset) % 24;
              applyLightingForClock(effectiveClock, propsRef.current.map.lighting.brightness);
            }
            const t = now * 0.001;
            st.objectGroups.forEach((grp) => {
              grp.traverse((child) => {
                if (child.name === 'AnimCoinSpin') {
                  child.rotation.z = t * 2.4;
                  child.position.y = Math.sin(t * 2.8 + grp.position.x) * 0.35;
                } else if (child.name === 'AnimPulseRing') {
                  const s = 1 + Math.sin(t * 3.2) * 0.12;
                  child.scale.set(s, s, 1);
                }
              });
            });
          }
        }

        renderer.render(scene, camera);

        const done = () => {
          renderBusy = false;
          if (!isDisposed && (renderDirty || propsRef.current.simulateMap || sceneRefs.current?.camTransitioning)) {
            requestRender();
          }
        };
        if (isSoftwareGl && (propsRef.current.simulateMap || sceneRefs.current?.camTransitioning)) {
          afterDraw(done);
        } else {
          done();
        }
      });
    };

    const stateObj = {
      scene,
      camera,
      controls,
      transformControls,
      terrainMesh,
      terrainGeo,
      waterMesh,
      gridHelper,
      objectsGroup,
      brushRing,
      placeGhost,
      sunLight,
      hemiLight,
      fog,
      selectionBox,
      texCache,
      objectGroups: new Map<string, THREE.Group>(),
      workingHeights: initialMap.heights.slice(),
      workingMaterials: initialMap.materials.slice(),
      isPainting: false,
      flattenTargetH: undefined as number | undefined,
      camTransitioning: false,
      simClockOffset: 0,
      isSoftwareGl,
      requestRender,
      syncTerrainGeometry,
    };
    sceneRefs.current = stateObj;

    syncTerrainGeometry(initialMap.heights, initialMap.materials);
    applyLightingForClock(initialMap.lighting.clockTime, initialMap.lighting.brightness);
    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    controls.addEventListener('change', requestRender);
    controls.addEventListener('start', () => {
      stateObj.camTransitioning = false;
    });

    transformControls.addEventListener('dragging-changed', (e) => {
      controls.enabled = !e.value;
    });
    transformControls.addEventListener('objectChange', () => {
      const attached = transformControls.object;
      if (!attached) return;
      const objId = attached.userData.mapObjectId as string | undefined;
      if (!objId) return;
      const cur = propsRef.current.map.objects.find((o) => o.id === objId);
      if (!cur) return;
      const snap = propsRef.current.studSnap;
      const mode = propsRef.current.transformMode;
      if (mode === 'translate') {
        propsRef.current.onUpdateObjectTransform(objId, {
          position: [
            snapVal(attached.position.x, snap),
            snapVal(attached.position.y, snap),
            snapVal(attached.position.z, snap),
          ],
        });
      } else if (mode === 'rotate') {
        propsRef.current.onUpdateObjectTransform(objId, {
          rotation: [
            Math.round(THREE.MathUtils.radToDeg(attached.rotation.x)),
            Math.round(THREE.MathUtils.radToDeg(attached.rotation.y)),
            Math.round(THREE.MathUtils.radToDeg(attached.rotation.z)),
          ],
        });
      } else if (mode === 'scale') {
        propsRef.current.onUpdateObjectTransform(objId, {
          scale: [
            Math.max(0.25, Math.round(attached.scale.x * 100) / 100),
            Math.max(0.25, Math.round(attached.scale.y * 100) / 100),
            Math.max(0.25, Math.round(attached.scale.z * 100) / 100),
          ],
        });
      }
      selectionBox.update();
      requestRender();
    });

    const raycaster = new THREE.Raycaster();
    const updateRayFromEvent = (ev: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      _rayVec.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      _rayVec.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(_rayVec, camera);
    };

    const applyStrokeAt = (pt: THREE.Vector3) => {
      const p = propsRef.current;
      const resBrush = applyTerrainBrush(
        stateObj.workingHeights,
        stateObj.workingMaterials,
        p.map.gridResolution,
        p.map.cellSizeStuds,
        pt.x,
        pt.z,
        p.brushTool,
        p.brushRadius,
        p.brushStrength,
        p.paintMaterial,
        stateObj.flattenTargetH
      );
      stateObj.workingHeights = resBrush.heights;
      stateObj.workingMaterials = resBrush.materials;
      syncTerrainGeometry(stateObj.workingHeights, stateObj.workingMaterials);
      requestRender();
    };

    const onPointerDown = (ev: PointerEvent) => {
      if (ev.button !== 0) return;
      const p = propsRef.current;
      updateRayFromEvent(ev);

      if (p.activeTool === 'brush') {
        const hits = raycaster.intersectObject(terrainMesh, false);
        if (hits.length > 0) {
          controls.enabled = false;
          stateObj.isPainting = true;
          stateObj.flattenTargetH =
            p.brushTool === 'flatten'
              ? sampleTerrainHeight(
                  stateObj.workingHeights,
                  p.map.gridResolution,
                  p.map.cellSizeStuds,
                  hits[0].point.x,
                  hits[0].point.z
                )
              : undefined;
          applyStrokeAt(hits[0].point);
        }
        return;
      }

      if (p.activeTool === 'place' || p.activeTool === 'stamp') {
        const hits = raycaster.intersectObject(terrainMesh, false);
        if (hits.length > 0) {
          const pt = hits[0].point;
          const sx = snapVal(pt.x, p.studSnap);
          const sz = snapVal(pt.z, p.studSnap);
          const sy = sampleTerrainHeight(
            stateObj.workingHeights,
            p.map.gridResolution,
            p.map.cellSizeStuds,
            sx,
            sz
          );
          p.onPlaceObject([sx, sy, sz]);
        }
        return;
      }

      // Select tool
      if (transformControls.dragging) return;
      const objHits = raycaster.intersectObjects(objectsGroup.children, true);
      if (objHits.length > 0) {
        const hitId = objHits[0].object.userData.mapObjectId as string | undefined;
        p.onSelectObject(hitId ?? null);
      } else {
        const terrainHits = raycaster.intersectObject(terrainMesh, false);
        if (terrainHits.length > 0) {
          p.onSelectObject(null);
        }
      }
    };

    const onPointerMove = (ev: PointerEvent) => {
      const p = propsRef.current;
      updateRayFromEvent(ev);

      if (p.activeTool === 'brush') {
        const hits = raycaster.intersectObject(terrainMesh, false);
        if (hits.length > 0) {
          const pt = hits[0].point;
          brushRing.visible = true;
          brushRing.position.set(pt.x, pt.y + 0.25, pt.z);
          brushRing.scale.set(p.brushRadius, p.brushRadius, 1);
          placeGhost.visible = false;
          if (stateObj.isPainting) {
            applyStrokeAt(pt);
          } else {
            requestRender();
          }
        } else {
          brushRing.visible = false;
        }
      } else if (p.activeTool === 'place' || p.activeTool === 'stamp') {
        brushRing.visible = false;
        const hits = raycaster.intersectObject(terrainMesh, false);
        if (hits.length > 0) {
          const pt = hits[0].point;
          const sx = snapVal(pt.x, p.studSnap);
          const sz = snapVal(pt.z, p.studSnap);
          const sy = sampleTerrainHeight(
            stateObj.workingHeights,
            p.map.gridResolution,
            p.map.cellSizeStuds,
            sx,
            sz
          );
          placeGhost.visible = true;
          placeGhost.position.set(sx, sy + 0.6, sz);
          requestRender();
        } else {
          placeGhost.visible = false;
        }
      } else {
        brushRing.visible = false;
        placeGhost.visible = false;
      }
    };

    const onPointerUp = () => {
      if (stateObj.isPainting) {
        stateObj.isPainting = false;
        stateObj.flattenTargetH = undefined;
        controls.enabled = true;
        propsRef.current.onCommitTerrain(
          stateObj.workingHeights.slice(),
          stateObj.workingMaterials.slice()
        );
      }
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    const resizeObserver = new ResizeObserver(() => {
      const w = container.clientWidth || 800;
      const h = container.clientHeight || 600;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      requestRender();
    });
    resizeObserver.observe(container);

    requestRender();

    return () => {
      isDisposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', onContextRestored);
      controls.dispose();
      transformControls.dispose();
      terrainGeo.dispose();
      terrainMat.dispose();
      studTex.dispose();
      waterMesh.geometry.dispose();
      waterMat.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
      sceneRefs.current = null;
    };
  }, []);

  // Sync map terrain, water, lighting, and objects whenever map or selection changes
  useEffect(() => {
    const st = sceneRefs.current;
    if (!st) return;

    if (!st.isPainting) {
      st.workingHeights = map.heights.slice();
      st.workingMaterials = map.materials.slice();
      st.syncTerrainGeometry(map.heights, map.materials);
    }

    st.waterMesh.visible = map.water.enabled;
    st.waterMesh.position.y = map.water.level;
    const wMat = st.waterMesh.material as THREE.MeshStandardMaterial;
    wMat.color.set(map.water.color);
    wMat.opacity = Math.max(0.15, 1 - map.water.transparency);

    st.gridHelper.visible = showGrid;

    const clock = map.lighting.clockTime;
    const isNight = clock >= 18.5 || clock < 5.75;
    const angle = ((clock - 6) / 24) * Math.PI * 2;
    st.sunLight.position.set(Math.cos(angle) * 110, Math.max(18, Math.abs(Math.sin(angle)) * 110 + 12), 48);
    st.sunLight.color.copy(isNight ? _moonColor : _sunColor);
    st.sunLight.intensity = isNight ? 0.75 : map.lighting.brightness;

    if (clock >= 5 && clock < 8) {
      _tmpColor.copy(_dawnColor).lerp(_dayColor, (clock - 5) / 3);
    } else if (clock >= 8 && clock < 17) {
      _tmpColor.copy(_dayColor);
    } else if (clock >= 17 && clock < 20) {
      _tmpColor.copy(_duskColor).lerp(_nightColor, (clock - 17) / 3);
    } else {
      _tmpColor.copy(_nightColor);
    }
    if (st.scene.background instanceof THREE.Color) {
      st.scene.background.copy(_tmpColor).multiplyScalar(isNight ? 0.85 : 0.48);
    }
    st.fog.color.copy(st.scene.background as THREE.Color);
    st.fog.density = 0.0012 + map.lighting.atmosphereDensity * 0.004;
    st.hemiLight.intensity = isNight ? 0.42 : 0.78;

    // Rebuild object groups cleanly
    st.transformControls.detach();
    while (st.objectsGroup.children.length > 0) {
      const child = st.objectsGroup.children[0];
      st.objectsGroup.remove(child);
    }
    st.objectGroups.clear();

    for (const obj of map.objects) {
      if (!obj.visible) continue;
      const grp = buildCompositePrefabGroup(obj, st.texCache, isNight, st.isSoftwareGl);
      grp.position.set(obj.position[0], obj.position[1], obj.position[2]);
      grp.rotation.set(
        THREE.MathUtils.degToRad(obj.rotation[0]),
        THREE.MathUtils.degToRad(obj.rotation[1]),
        THREE.MathUtils.degToRad(obj.rotation[2])
      );
      if (obj.kind === 'StampedModel') {
        grp.scale.set(obj.scale[0], obj.scale[1], obj.scale[2]);
      }
      st.objectsGroup.add(grp);
      st.objectGroups.set(obj.id, grp);
    }

    // Attach TransformControls to selected object
    const selectedGrp = selectedObjectId ? st.objectGroups.get(selectedObjectId) : undefined;
    if (selectedGrp && activeTool === 'select') {
      st.selectionBox.setFromObject(selectedGrp);
      st.selectionBox.visible = true;
      if (transformMode !== 'select') {
        st.transformControls.setMode(
          transformMode === 'translate'
            ? 'translate'
            : transformMode === 'rotate'
            ? 'rotate'
            : 'scale'
        );
        st.transformControls.attach(selectedGrp);
      }
    } else {
      st.selectionBox.visible = false;
    }

    st.requestRender();
  }, [map, selectedObjectId, activeTool, transformMode, showGrid, simulateMap]);

  // Camera preset transitions
  useEffect(() => {
    const st = sceneRefs.current;
    if (!st || !cameraPresetRequest) return;
    const half = getTerrainHalfSpan(map.gridResolution, map.cellSizeStuds);
    const dist = half * 1.15;
    if (cameraPresetRequest.preset === 'perspective') {
      _camPosGoal.set(dist * 0.78, dist * 0.56, dist * 0.88);
      _camTargetGoal.set(0, 2, 0);
    } else if (cameraPresetRequest.preset === 'top') {
      _camPosGoal.set(0, dist * 1.35, 0.1);
      _camTargetGoal.set(0, 0, 0);
    } else if (cameraPresetRequest.preset === 'front') {
      _camPosGoal.set(0, 26, dist * 1.1);
      _camTargetGoal.set(0, 4, 0);
    } else if (cameraPresetRequest.preset === 'side') {
      _camPosGoal.set(dist * 1.1, 26, 0);
      _camTargetGoal.set(0, 4, 0);
    }
    st.camTransitioning = true;
    st.requestRender();
  }, [cameraPresetRequest, map.gridResolution, map.cellSizeStuds]);

  return (
    <div className="relative w-full h-full bg-[#0e1015]">
      <div ref={containerRef} className="w-full h-full" />

      {/* Minimal non-occluding top-left map status bar */}
      <div className="pointer-events-none absolute top-3 left-3 z-10 px-2.5 py-1.5 rounded-md bg-black/55 border border-white/10 text-[11px] font-mono-tabular text-slate-200 flex items-center gap-2">
        <span>{map.name}</span>
        <span className="text-slate-500">·</span>
        <span>
          {map.gridResolution * map.cellSizeStuds}×{map.gridResolution * map.cellSizeStuds} studs
        </span>
        <span className="text-slate-500">·</span>
        <span>
          {Math.floor(map.lighting.clockTime).toString().padStart(2, '0')}:
          {Math.round((map.lighting.clockTime % 1) * 60)
            .toString()
            .padStart(2, '0')}
        </span>
        {activeTool === 'brush' && (
          <>
            <span className="text-slate-500">·</span>
            <span className="text-sky-300">
              Brush: {brushTool} ({brushRadius}u)
            </span>
          </>
        )}
        {activeTool === 'place' && (
          <>
            <span className="text-slate-500">·</span>
            <span className="text-emerald-300">Click terrain to place {activePlaceKind}</span>
          </>
        )}
        {activeTool === 'stamp' && (
          <>
            <span className="text-slate-500">·</span>
            <span className="text-amber-300">Click terrain to stamp {stampSourceModel.name}</span>
          </>
        )}
      </div>

      {contextLost && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0e1015]/90 text-xs text-slate-300 z-30">
          WebGL context lost — restoring 3D map viewport...
        </div>
      )}
    </div>
  );
}
