import { useEffect, useRef, useState } from 'react';
import { Bookmark } from 'lucide-react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import {
  buildMotor6DDebugGraph,
  EvaluatedPartPose,
  evaluateTriggeredMarkers,
  flattenPartTree,
} from '../engine/animationEngine';
import { createNormalizedShapeGeometry } from '../engine/robloxGeometry';
import { buildThreeMaterialForPart, createMaterialTextureCache } from '../engine/robloxMaterials';
import {
  AnimationClip,
  CameraPreset,
  PartShape,
  ROBLOX_MATERIAL_SPECS,
  StudioAttachmentNode,
  StudioEffectNode,
  StudioPartNode,
  StudioParticleEmitterEffect,
  StudioPointLightEffect,
  StudioTrailEffect,
  StudioWorkspaceMode,
  TransformMode,
} from '../engine/robloxTypes';

interface StudioViewportProps {
  parts: StudioPartNode[];
  selectedPartId: string | null;
  transformMode: TransformMode;
  studSnap: number; // 0 = off, 0.25, 0.5, 1
  showGrid: boolean;
  showAvatarRef: boolean;
  showRigDebug: boolean;
  showEffects?: boolean;
  showLights?: boolean;
  showAttachments?: boolean;
  workspaceMode: StudioWorkspaceMode;
  activeClip?: AnimationClip | null;
  currentTime?: number;
  activePoses?: Record<string, EvaluatedPartPose>;
  isPlaying: boolean;
  isScriptRunning?: boolean;
  runtimeEffectStates?: Record<string, boolean>;
  runtimeLightUpdates?: Record<string, { enabled?: boolean; brightness?: number; color?: string; range?: number }>;
  cameraPresetRequest: { preset: CameraPreset; seq: number } | null;
  burstTriggerSeq?: { effectId: string; count: number; seq: number } | null;
  pulseTriggerSeq?: { effectId: string; seq: number } | null;
  onSelectPart: (id: string | null) => void;
  onUpdatePartTransform: (id: string, patch: Partial<EvaluatedPartPose>) => void;
  onPlaybackAdvance?: (dtSec: number) => void;
}

interface PartRigEntry {
  pivotGroup: THREE.Group;
  centerGroup: THREE.Group;
  mesh: THREE.Mesh;
  matCacheKey: string;
}

interface SimParticle {
  active: boolean;
  age: number;
  life: number;
  px: number;
  py: number;
  pz: number;
  vx: number;
  vy: number;
  vz: number;
  ax: number;
  ay: number;
  az: number;
  size0: number;
  size1: number;
  r0: number;
  g0: number;
  b0: number;
  r1: number;
  g1: number;
  b1: number;
}

interface TrailSample {
  x0: number;
  y0: number;
  z0: number;
  x1: number;
  y1: number;
  z1: number;
  age: number;
}

interface TrailSlot {
  mesh: THREE.Mesh;
  geometry: THREE.BufferGeometry;
  posAttr: THREE.BufferAttribute;
  colAttr: THREE.BufferAttribute;
  samples: TrailSample[];
  sampleCount: number;
  sampleAccum: number;
}

const MAX_PARTICLES = 220;
const MAX_POINT_LIGHTS = 4;
const MAX_TRAILS = 4;
const TRAIL_SEGMENTS = 14;
const MAX_ATTACHMENT_MARKERS = 32;

const _camTargetGoal = new THREE.Vector3(0, 2.5, 0);
const _camPosGoal = new THREE.Vector3(9, 7, 11);
const _fitBox = new THREE.Box3();
const _meshBox = new THREE.Box3();
const _fitCenter = new THREE.Vector3();
const _fitSize = new THREE.Vector3();

function roundTo(val: number, step: number): number {
  if (step <= 0) return Math.round(val * 1000) / 1000;
  return Math.round(Math.round(val / step) * step * 1000) / 1000;
}

function createRobloxDummyReference(): THREE.Group {
  const dummy = new THREE.Group();
  dummy.name = '__R15ScaleRef__';
  const mat = new THREE.MeshStandardMaterial({
    color: 0x64748b,
    roughness: 0.7,
    metalness: 0.1,
    transparent: true,
    opacity: 0.42,
  });

  const addLimb = (w: number, h: number, d: number, x: number, y: number, z: number) => {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    dummy.add(mesh);
  };

  addLimb(1.0, 2.0, 1.0, -0.52, 1.0, 0);
  addLimb(1.0, 2.0, 1.0, 0.52, 1.0, 0);
  addLimb(2.0, 2.0, 1.0, 0, 3.0, 0);
  addLimb(0.95, 2.0, 1.0, -1.55, 3.0, 0);
  addLimb(0.95, 2.0, 1.0, 1.55, 3.0, 0);
  const headGeo = new THREE.CylinderGeometry(0.58, 0.58, 1.15, 16);
  const headMesh = new THREE.Mesh(headGeo, mat);
  headMesh.position.set(0, 4.62, 0);
  dummy.add(headMesh);

  dummy.position.set(-5.5, 0, 0);
  return dummy;
}

function createBaseplateTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#191e28';
    ctx.fillRect(0, 0, size, size);
    const cell = size / 4;
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.08)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x * cell, y * cell, cell, cell);
        ctx.beginPath();
        ctx.arc(x * cell + cell / 2, y * cell + cell / 2, cell * 0.24, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.035)';
        ctx.fill();
      }
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(20, 20);
  tex.anisotropy = Math.min(8, maxAnisotropy || 1);
  tex.needsUpdate = true;
  return tex;
}

function createContactShadowTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(size / 2, size / 2, 4, size / 2, size / 2, size / 2);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.55)');
    grad.addColorStop(0.55, 'rgba(0, 0, 0, 0.22)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

export function StudioViewport({
  parts,
  selectedPartId,
  transformMode,
  studSnap,
  showGrid,
  showAvatarRef,
  showRigDebug,
  showEffects = true,
  showLights = true,
  showAttachments = false,
  workspaceMode,
  activeClip = null,
  currentTime = 0,
  activePoses,
  isPlaying,
  isScriptRunning = false,
  runtimeEffectStates,
  runtimeLightUpdates,
  cameraPresetRequest,
  burstTriggerSeq = null,
  pulseTriggerSeq = null,
  onSelectPart,
  onUpdatePartTransform,
  onPlaybackAdvance,
}: StudioViewportProps) {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const [contextLost, setContextLost] = useState(false);
  const [firedMarkerToast, setFiredMarkerToast] = useState<{
    name: string;
    value: string;
    seq: number;
  } | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const callbacksRef = useRef({ onSelectPart, onUpdatePartTransform, onPlaybackAdvance });
  callbacksRef.current = { onSelectPart, onUpdatePartTransform, onPlaybackAdvance };

  const stateRef = useRef({
    parts,
    selectedPartId,
    transformMode,
    studSnap,
    showGrid,
    showAvatarRef,
    showRigDebug,
    showEffects,
    showLights,
    showAttachments,
    workspaceMode,
    activeClip,
    currentTime,
    activePoses,
    isPlaying,
    isScriptRunning,
    runtimeEffectStates,
    runtimeLightUpdates,
  });
  stateRef.current = {
    parts,
    selectedPartId,
    transformMode,
    studSnap,
    showGrid,
    showAvatarRef,
    showRigDebug,
    showEffects,
    showLights,
    showAttachments,
    workspaceMode,
    activeClip,
    currentTime,
    activePoses,
    isPlaying,
    isScriptRunning,
    runtimeEffectStates,
    runtimeLightUpdates,
  };

  const engineApiRef = useRef<{
    syncScene: () => void;
    syncControls: () => void;
    syncHelpers: () => void;
    syncRigDebug: () => void;
    applyCameraPreset: (preset: CameraPreset) => void;
    requestRender: () => void;
    resetPlaybackClock: () => void;
    emitBurstById: (effectId: string, count: number) => void;
    resetFxPlaybackState: () => void;
  } | null>(null);

  // Track previous time/clip for KeyframeMarker crossing triggers during playback
  const markerClockRef = useRef<{ clipId: string | null; prevTime: number }>({
    clipId: null,
    prevTime: 0,
  });

  useEffect(() => {
    const container = canvasMountRef.current;
    if (!container) return;

    const isSoftwareGl = (() => {
      const probe = document.createElement('canvas').getContext('webgl2');
      if (!probe) return true;
      const ext = probe.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : probe.RENDERER;
      const gpu = String(probe.getParameter(param));
      probe.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const width = Math.max(1, container.clientWidth);
    const height = Math.max(1, container.clientHeight);
    renderer.setSize(width, height);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    container.appendChild(renderer.domElement);

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      setContextLost(true);
    };
    const handleContextRestored = () => {
      setContextLost(false);
    };
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', handleContextRestored);

    const scene = new THREE.Scene();
    const bgHex = 0x11151d;
    scene.background = new THREE.Color(bgHex);
    scene.fog = new THREE.FogExp2(bgHex, 0.011);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTex = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 300);
    camera.position.set(9.5, 7.5, 11.5);

    const keyLight = new THREE.DirectionalLight(0xfff5e6, 2.1);
    keyLight.position.set(12, 18, 10);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 50;
    const d = 14;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const hemiLight = new THREE.HemisphereLight(0xa5c8ff, 0x1d222c, 0.8);
    scene.add(hemiLight);

    const rimLight = new THREE.DirectionalLight(0x93c5fd, 1.05);
    rimLight.position.set(-10, 8, -12);
    scene.add(rimLight);

    if (!isSoftwareGl) {
      RectAreaLightUniformsLib.init();
      const softbox = new THREE.RectAreaLight(0xffffff, 2.2, 8, 5);
      softbox.position.set(-7, 8, 7);
      softbox.lookAt(0, 2, 0);
      scene.add(softbox);
    }

    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const baseplateTex = createBaseplateTexture(maxAniso);
    const baseplateGeo = new THREE.PlaneGeometry(80, 80);
    const baseplateMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: baseplateTex,
      roughness: 0.86,
      metalness: 0.08,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    });
    const baseplateMesh = new THREE.Mesh(baseplateGeo, baseplateMat);
    baseplateMesh.rotation.x = -Math.PI / 2;
    baseplateMesh.position.y = 0;
    baseplateMesh.receiveShadow = true;
    scene.add(baseplateMesh);

    const gridHelper = new THREE.GridHelper(40, 40, 0x3b82f6, 0x263042);
    gridHelper.position.y = 0.015;
    scene.add(gridHelper);

    const contactTex = createContactShadowTexture();
    const contactGeo = new THREE.PlaneGeometry(10, 10);
    const contactMat = new THREE.MeshBasicMaterial({
      map: contactTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.7,
    });
    const contactPlane = new THREE.Mesh(contactGeo, contactMat);
    contactPlane.rotation.x = -Math.PI / 2;
    contactPlane.position.y = 0.025;
    scene.add(contactPlane);

    const avatarDummy = createRobloxDummyReference();
    scene.add(avatarDummy);

    const modelGroup = new THREE.Group();
    modelGroup.name = 'ModelRoot';
    scene.add(modelGroup);

    const selectionBox = new THREE.BoxHelper(new THREE.Object3D(), 0x38bdf8);
    selectionBox.visible = false;
    scene.add(selectionBox);

    const pivotAxes = new THREE.AxesHelper(0.7);
    pivotAxes.visible = false;
    scene.add(pivotAxes);

    // =========================================================================
    // Pooled FX Subsystem: PointLights + Instanced Particles + Trails + Attachments
    // =========================================================================
    const fxOverrides = new Map<string, boolean>();
    const lightPulseMap = new Map<string, { boost: number; remaining: number }>();
    const emitterAccumMap = new Map<string, number>();

    // 1. Pooled PointLights
    const pointLightPool: THREE.PointLight[] = [];
    for (let i = 0; i < MAX_POINT_LIGHTS; i++) {
      const pl = new THREE.PointLight(0xffffff, 0, 12, 1.5);
      pl.castShadow = false;
      scene.add(pl);
      pointLightPool.push(pl);
    }

    // 2. Pooled Particle InstancedMesh
    const particleGeo = new THREE.BoxGeometry(1, 1, 1);
    const particleMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.88,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const particleInstanced = new THREE.InstancedMesh(particleGeo, particleMat, MAX_PARTICLES);
    particleInstanced.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    particleInstanced.frustumCulled = false;
    particleInstanced.count = 0;
    scene.add(particleInstanced);

    const particlePool: SimParticle[] = Array.from({ length: MAX_PARTICLES }, () => ({
      active: false,
      age: 0,
      life: 1,
      px: 0,
      py: 0,
      pz: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      ax: 0,
      ay: 0,
      az: 0,
      size0: 0.2,
      size1: 0.05,
      r0: 1,
      g0: 1,
      b0: 1,
      r1: 1,
      g1: 1,
      b1: 1,
    }));
    let nextParticleSlot = 0;
    let activeParticleCount = 0;

    // 3. Pooled Trail Ribbons
    const trailMat = new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.72,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const trailSlots: TrailSlot[] = [];
    for (let tIdx = 0; tIdx < MAX_TRAILS; tIdx++) {
      const vertCount = TRAIL_SEGMENTS * 2;
      const positions = new Float32Array(vertCount * 3);
      const colors = new Float32Array(vertCount * 3);
      const indices: number[] = [];
      for (let s = 0; s < TRAIL_SEGMENTS - 1; s++) {
        const a = s * 2;
        const b = a + 1;
        const c = a + 2;
        const dIdx = a + 3;
        indices.push(a, b, c, b, dIdx, c);
      }
      const geo = new THREE.BufferGeometry();
      const posAttr = new THREE.BufferAttribute(positions, 3);
      posAttr.setUsage(THREE.DynamicDrawUsage);
      const colAttr = new THREE.BufferAttribute(colors, 3);
      colAttr.setUsage(THREE.DynamicDrawUsage);
      geo.setAttribute('position', posAttr);
      geo.setAttribute('color', colAttr);
      geo.setIndex(indices);

      const mesh = new THREE.Mesh(geo, trailMat);
      mesh.frustumCulled = false;
      mesh.visible = false;
      scene.add(mesh);

      const samples: TrailSample[] = Array.from({ length: TRAIL_SEGMENTS }, () => ({
        x0: 0,
        y0: 0,
        z0: 0,
        x1: 0,
        y1: 0,
        z1: 0,
        age: 0,
      }));
      trailSlots.push({ mesh, geometry: geo, posAttr, colAttr, samples, sampleCount: 0, sampleAccum: 0 });
    }

    // 4. Pooled Attachment Visualizers
    const attachmentsGroup = new THREE.Group();
    attachmentsGroup.name = '__AttachmentHelpers__';
    attachmentsGroup.visible = false;
    scene.add(attachmentsGroup);
    const attOctGeo = new THREE.OctahedronGeometry(0.14, 0);
    const attMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      wireframe: true,
      depthTest: false,
      transparent: true,
      opacity: 0.9,
    });
    const attMarkerPool: THREE.Mesh[] = Array.from({ length: MAX_ATTACHMENT_MARKERS }, () => {
      const m = new THREE.Mesh(attOctGeo, attMat);
      m.renderOrder = 997;
      m.visible = false;
      attachmentsGroup.add(m);
      return m;
    });

    // Scratch math objects for FX (zero per-frame allocations)
    const _fxMat = new THREE.Matrix4();
    const _fxPos = new THREE.Vector3();
    const _fxPos1 = new THREE.Vector3();
    const _fxDir = new THREE.Vector3();
    const _fxQuat = new THREE.Quaternion();
    const _fxEul = new THREE.Euler();
    const _fxScale = new THREE.Vector3();
    const _fxCol = new THREE.Color();
    const _fxCol0 = new THREE.Color();
    const _fxCol1 = new THREE.Color();
    const _fxRight = new THREE.Vector3();
    const _fxUp = new THREE.Vector3();

    // Motor6D Visual Rig Debugging Overlay
    const rigDebugGroup = new THREE.Group();
    rigDebugGroup.name = '__Motor6DDebug__';
    rigDebugGroup.visible = false;
    scene.add(rigDebugGroup);

    const dbgSphereGeo = new THREE.SphereGeometry(1, 16, 12);
    const dbgBoneGeo = new THREE.CylinderGeometry(1, 1, 1, 10);
    const dbgBoxGeo = new THREE.BoxGeometry(1, 1, 1);
    const dbgRingGeo = new THREE.TorusGeometry(1, 0.14, 8, 24);
    const dbgMatCache = new Map<string, THREE.MeshBasicMaterial>();
    const getDebugMat = (hex: string, opacity = 0.94): THREE.MeshBasicMaterial => {
      const key = `${hex}_${opacity.toFixed(2)}`;
      let mat = dbgMatCache.get(key);
      if (!mat) {
        mat = new THREE.MeshBasicMaterial({
          color: hex,
          depthTest: false,
          depthWrite: false,
          transparent: true,
          opacity,
        });
        dbgMatCache.set(key, mat);
      }
      return mat;
    };

    const dbgSpherePool: THREE.Mesh[] = [];
    const dbgBonePool: THREE.Mesh[] = [];
    const dbgBoxPool: THREE.Mesh[] = [];
    const dbgSelectedRing = new THREE.Mesh(dbgRingGeo, getDebugMat('#FACC15', 0.98));
    dbgSelectedRing.renderOrder = 1000;
    dbgSelectedRing.visible = false;
    rigDebugGroup.add(dbgSelectedRing);

    const _dbgA = new THREE.Vector3();
    const _dbgB = new THREE.Vector3();
    const _dbgDir = new THREE.Vector3();
    const _dbgMid = new THREE.Vector3();
    const _dbgUp = new THREE.Vector3(0, 1, 0);
    const _dbgQuat = new THREE.Quaternion();

    const shapeGeoCache: Partial<Record<PartShape, THREE.BufferGeometry>> = {};
    const getShapeGeo = (shape: PartShape) => {
      if (!shapeGeoCache[shape]) {
        shapeGeoCache[shape] = createNormalizedShapeGeometry(shape);
      }
      return shapeGeoCache[shape]!;
    };
    const matTextureCache = createMaterialTextureCache(maxAniso);
    const rigMap = new Map<string, PartRigEntry>();

    const orbitControls = new OrbitControls(camera, renderer.domElement);
    orbitControls.target.set(0, 2.5, 0);
    orbitControls.enableDamping = !isSoftwareGl;
    orbitControls.dampingFactor = 0.08;
    orbitControls.maxPolarAngle = Math.PI / 2 - 0.03;
    orbitControls.minDistance = 2.5;
    orbitControls.maxDistance = 65;

    const transformControls = new TransformControls(camera, renderer.domElement);
    transformControls.setSpace('world');
    transformControls.setSize(0.85);
    const gizmoHelper = transformControls.getHelper();
    scene.add(gizmoHelper);

    let frameId = 0;
    let renderBusy = false;
    let renderDirty = false;
    let cameraAnimating = false;
    let lastTime = performance.now();
    let lastPlayTick = performance.now();

    function resetPlaybackClock() {
      lastPlayTick = performance.now();
    }

    function resetFxPlaybackState() {
      fxOverrides.clear();
      lightPulseMap.clear();
      emitterAccumMap.clear();
      for (const slot of trailSlots) {
        slot.sampleCount = 0;
        slot.mesh.visible = false;
      }
    }

    function resolveAttachmentWorld(
      partId: string,
      attId: string | null | undefined,
      outPos: THREE.Vector3,
      outQuat?: THREE.Quaternion
    ): boolean {
      const rig = rigMap.get(partId);
      const part = stateRef.current.parts.find((p) => p.id === partId);
      if (!rig || !part || !part.visible) return false;
      const att: StudioAttachmentNode | undefined = attId
        ? (part.attachments ?? []).find((a) => a.id === attId)
        : undefined;

      rig.centerGroup.updateWorldMatrix(true, false);
      if (att) {
        outPos.set(att.position[0], att.position[1], att.position[2]).applyMatrix4(rig.centerGroup.matrixWorld);
        if (outQuat) {
          _fxEul.set(
            THREE.MathUtils.degToRad(att.rotation[0]),
            THREE.MathUtils.degToRad(att.rotation[1]),
            THREE.MathUtils.degToRad(att.rotation[2]),
            'XYZ'
          );
          outQuat.setFromEuler(_fxEul);
          rig.centerGroup.getWorldQuaternion(_dbgQuat);
          outQuat.premultiply(_dbgQuat);
        }
      } else {
        outPos.set(0, 0, 0).applyMatrix4(rig.centerGroup.matrixWorld);
        if (outQuat) {
          rig.centerGroup.getWorldQuaternion(outQuat);
        }
      }
      return true;
    }

    function spawnParticlesFromEmitter(
      partId: string,
      emitter: StudioParticleEmitterEffect,
      count: number
    ) {
      if (!stateRef.current.showEffects || count <= 0) return;
      if (!resolveAttachmentWorld(partId, emitter.attachmentId, _fxPos, _fxQuat)) return;

      _fxDir.set(0, 0, 1).applyQuaternion(_fxQuat).normalize();
      // Build orthonormal basis around _fxDir
      _fxUp.set(0, 1, 0);
      if (Math.abs(_fxDir.dot(_fxUp)) > 0.95) _fxUp.set(1, 0, 0);
      _fxRight.crossVectors(_fxDir, _fxUp).normalize();
      _fxUp.crossVectors(_fxRight, _fxDir).normalize();

      _fxCol0.set(emitter.color);
      _fxCol1.set(emitter.endColor);
      const spreadRad = THREE.MathUtils.degToRad(Math.max(1, emitter.spreadAngle));
      const minSpd = emitter.speed[0];
      const maxSpd = Math.max(minSpd, emitter.speed[1]);
      const minLife = Math.max(0.08, emitter.lifetime[0]);
      const maxLife = Math.max(minLife, emitter.lifetime[1]);

      for (let i = 0; i < count; i++) {
        const p = particlePool[nextParticleSlot];
        nextParticleSlot = (nextParticleSlot + 1) % MAX_PARTICLES;

        const theta = Math.random() * Math.PI * 2;
        const cone = Math.random() * spreadRad;
        const sinC = Math.sin(cone);
        const cosC = Math.cos(cone);
        const spd = minSpd + Math.random() * (maxSpd - minSpd);

        const dx = _fxDir.x * cosC + (_fxRight.x * Math.cos(theta) + _fxUp.x * Math.sin(theta)) * sinC;
        const dy = _fxDir.y * cosC + (_fxRight.y * Math.cos(theta) + _fxUp.y * Math.sin(theta)) * sinC;
        const dz = _fxDir.z * cosC + (_fxRight.z * Math.cos(theta) + _fxUp.z * Math.sin(theta)) * sinC;

        p.active = true;
        p.age = 0;
        p.life = minLife + Math.random() * (maxLife - minLife);
        p.px = _fxPos.x + (Math.random() - 0.5) * 0.12;
        p.py = _fxPos.y + (Math.random() - 0.5) * 0.12;
        p.pz = _fxPos.z + (Math.random() - 0.5) * 0.12;
        p.vx = dx * spd;
        p.vy = dy * spd;
        p.vz = dz * spd;
        p.ax = emitter.acceleration[0];
        p.ay = emitter.acceleration[1];
        p.az = emitter.acceleration[2];
        p.size0 = Math.max(0.03, emitter.sizeStart);
        p.size1 = Math.max(0.01, emitter.sizeEnd);
        p.r0 = _fxCol0.r;
        p.g0 = _fxCol0.g;
        p.b0 = _fxCol0.b;
        p.r1 = _fxCol1.r;
        p.g1 = _fxCol1.g;
        p.b1 = _fxCol1.b;
      }
      requestRender();
    }

    function emitBurstById(effectId: string, count: number) {
      for (const part of stateRef.current.parts) {
        const found = (part.effects ?? []).find((fx) => fx.id === effectId);
        if (!found) continue;
        if (found.kind === 'ParticleEmitter') {
          spawnParticlesFromEmitter(part.id, found, count);
        } else if (found.kind === 'PointLight') {
          lightPulseMap.set(found.id, { boost: 2.5, remaining: 0.55 });
          requestRender();
        }
        return;
      }
    }

    function stepFxSimulation(dt: number) {
      const { parts: currentParts, showEffects: fxVis, showLights: lightsVis, showAttachments: attVis, workspaceMode: mode } =
        stateRef.current;

      // 1. Attachment helper octahedra
      attachmentsGroup.visible = attVis;
      if (attVis) {
        let idx = 0;
        for (const p of currentParts) {
          if (!p.visible || !p.attachments) continue;
          for (const att of p.attachments) {
            if (idx >= MAX_ATTACHMENT_MARKERS) break;
            if (resolveAttachmentWorld(p.id, att.id, _fxPos)) {
              const m = attMarkerPool[idx++];
              m.position.copy(_fxPos);
              m.visible = true;
            }
          }
        }
        for (let k = idx; k < attMarkerPool.length; k++) {
          attMarkerPool[k].visible = false;
        }
      }

      // Build global attachment -> part lookup for Trails
      const attOwner = new Map<string, string>();
      for (const p of currentParts) {
        for (const a of p.attachments ?? []) {
          attOwner.set(a.id, p.id);
        }
      }

      const isFxEffectivelyEnabled = (fx: StudioEffectNode): boolean => {
        if (stateRef.current.isScriptRunning && stateRef.current.runtimeEffectStates && fx.id in stateRef.current.runtimeEffectStates) {
          return stateRef.current.runtimeEffectStates[fx.id];
        }
        if (mode === 'animate' && fxOverrides.has(fx.id)) {
          return fxOverrides.get(fx.id)!;
        }
        return fx.enabled;
      };

      // 2. PointLights
      for (const pl of pointLightPool) pl.intensity = 0;
      let lightSlot = 0;
      if (lightsVis) {
        for (const [lid, pulse] of lightPulseMap.entries()) {
          pulse.remaining -= dt;
          if (pulse.remaining <= 0) lightPulseMap.delete(lid);
        }

        for (const part of currentParts) {
          if (!part.visible || !part.effects) continue;
          for (const fx of part.effects) {
            if (fx.kind !== 'PointLight' || lightSlot >= MAX_POINT_LIGHTS) continue;
            const lightNode = fx as StudioPointLightEffect;
            const scriptLightPatch = stateRef.current.isScriptRunning
              ? stateRef.current.runtimeLightUpdates?.[lightNode.id]
              : undefined;
            const pulse = lightPulseMap.get(lightNode.id);
            const active =
              (scriptLightPatch?.enabled !== undefined ? scriptLightPatch.enabled : isFxEffectivelyEnabled(lightNode)) ||
              Boolean(pulse);
            if (!active) continue;
            if (resolveAttachmentWorld(part.id, lightNode.attachmentId, _fxPos)) {
              const pl = pointLightPool[lightSlot++];
              pl.position.copy(_fxPos);
              pl.color.set(scriptLightPatch?.color || lightNode.color);
              pl.distance = Math.max(2, scriptLightPatch?.range ?? lightNode.range);
              const baseBrightness = scriptLightPatch?.brightness ?? lightNode.brightness;
              const pulseBonus = pulse ? pulse.boost * Math.max(0, pulse.remaining / 0.55) : 0;
              pl.intensity = (baseBrightness + pulseBonus) * 1.4;
            }
          }
        }
      }

      // 3. Continuous ParticleEmitter spawning + Particle physics update
      let hasContinuousEmitter = false;
      if (fxVis) {
        for (const part of currentParts) {
          if (!part.visible || !part.effects) continue;
          for (const fx of part.effects) {
            if (fx.kind !== 'ParticleEmitter') continue;
            const em = fx as StudioParticleEmitterEffect;
            if (!isFxEffectivelyEnabled(em) || em.rate <= 0) continue;
            hasContinuousEmitter = true;
            const prevAcc = emitterAccumMap.get(em.id) ?? 0;
            const total = prevAcc + em.rate * dt;
            const spawnCount = Math.min(18, Math.floor(total));
            emitterAccumMap.set(em.id, total - spawnCount);
            if (spawnCount > 0) {
              spawnParticlesFromEmitter(part.id, em, spawnCount);
            }
          }
        }
      }

      let aliveCount = 0;
      for (let i = 0; i < MAX_PARTICLES; i++) {
        const p = particlePool[i];
        if (!p.active) continue;
        p.age += dt;
        if (p.age >= p.life) {
          p.active = false;
          continue;
        }
        p.vx += p.ax * dt;
        p.vy += p.ay * dt;
        p.vz += p.az * dt;
        p.px += p.vx * dt;
        p.py += p.vy * dt;
        p.pz += p.vz * dt;

        const u = p.age / p.life;
        const sz = p.size0 + (p.size1 - p.size0) * u;
        _fxPos.set(p.px, p.py, p.pz);
        _fxQuat.identity();
        _fxScale.set(sz, sz, sz);
        _fxMat.compose(_fxPos, _fxQuat, _fxScale);
        particleInstanced.setMatrixAt(aliveCount, _fxMat);

        _fxCol.setRGB(
          p.r0 + (p.r1 - p.r0) * u,
          p.g0 + (p.g1 - p.g0) * u,
          p.b0 + (p.b1 - p.b0) * u
        );
        particleInstanced.setColorAt(aliveCount, _fxCol);
        aliveCount++;
      }
      activeParticleCount = aliveCount;
      particleInstanced.visible = fxVis && aliveCount > 0;
      particleInstanced.count = aliveCount;
      if (aliveCount > 0) {
        particleInstanced.instanceMatrix.needsUpdate = true;
        if (particleInstanced.instanceColor) particleInstanced.instanceColor.needsUpdate = true;
      }

      // 4. Trail Ribbons
      let trailIdx = 0;
      if (fxVis) {
        for (const part of currentParts) {
          if (!part.visible || !part.effects) continue;
          for (const fx of part.effects) {
            if (fx.kind !== 'Trail' || trailIdx >= MAX_TRAILS) continue;
            const tr = fx as StudioTrailEffect;
            const slot = trailSlots[trailIdx++];
            const enabled = isFxEffectivelyEnabled(tr);

            // Age existing samples
            for (let s = 0; s < slot.sampleCount; s++) {
              slot.samples[s].age += dt;
            }
            while (slot.sampleCount > 0 && slot.samples[slot.sampleCount - 1].age > tr.lifetime) {
              slot.sampleCount--;
            }

            if (enabled) {
              const p0Id = attOwner.get(tr.attachment0Id);
              const p1Id = attOwner.get(tr.attachment1Id);
              if (
                p0Id &&
                p1Id &&
                resolveAttachmentWorld(p0Id, tr.attachment0Id, _fxPos) &&
                resolveAttachmentWorld(p1Id, tr.attachment1Id, _fxPos1)
              ) {
                slot.sampleAccum += dt;
                if (slot.sampleCount === 0 || slot.sampleAccum >= 0.03) {
                  slot.sampleAccum = 0;
                  for (let s = Math.min(TRAIL_SEGMENTS - 1, slot.sampleCount); s > 0; s--) {
                    const dst = slot.samples[s];
                    const src = slot.samples[s - 1];
                    dst.x0 = src.x0;
                    dst.y0 = src.y0;
                    dst.z0 = src.z0;
                    dst.x1 = src.x1;
                    dst.y1 = src.y1;
                    dst.z1 = src.z1;
                    dst.age = src.age;
                  }
                  const head = slot.samples[0];
                  head.x0 = _fxPos.x;
                  head.y0 = _fxPos.y;
                  head.z0 = _fxPos.z;
                  head.x1 = _fxPos1.x;
                  head.y1 = _fxPos1.y;
                  head.z1 = _fxPos1.z;
                  head.age = 0;
                  if (slot.sampleCount < TRAIL_SEGMENTS) slot.sampleCount++;
                }
              }
            }

            if (slot.sampleCount < 2) {
              slot.mesh.visible = false;
              continue;
            }

            _fxCol0.set(tr.color);
            _fxCol1.set(tr.endColor);
            const posArr = slot.posAttr.array as Float32Array;
            const colArr = slot.colAttr.array as Float32Array;

            for (let s = 0; s < TRAIL_SEGMENTS; s++) {
              const sample = slot.samples[Math.min(s, slot.sampleCount - 1)];
              const u = s / Math.max(1, slot.sampleCount - 1);
              const fade = Math.max(0, 1 - sample.age / Math.max(0.05, tr.lifetime));
              const vIdx = s * 6;

              posArr[vIdx] = sample.x0;
              posArr[vIdx + 1] = sample.y0;
              posArr[vIdx + 2] = sample.z0;
              posArr[vIdx + 3] = sample.x1;
              posArr[vIdx + 4] = sample.y1;
              posArr[vIdx + 5] = sample.z1;

              const r = (_fxCol0.r + (_fxCol1.r - _fxCol0.r) * u) * fade;
              const g = (_fxCol0.g + (_fxCol1.g - _fxCol0.g) * u) * fade;
              const b = (_fxCol0.b + (_fxCol1.b - _fxCol0.b) * u) * fade;
              colArr[vIdx] = r;
              colArr[vIdx + 1] = g;
              colArr[vIdx + 2] = b;
              colArr[vIdx + 3] = r;
              colArr[vIdx + 4] = g;
              colArr[vIdx + 5] = b;
            }

            slot.posAttr.needsUpdate = true;
            slot.colAttr.needsUpdate = true;
            slot.mesh.visible = true;
          }
        }
      }
      for (let k = trailIdx; k < trailSlots.length; k++) {
        trailSlots[k].mesh.visible = false;
      }

      if ((hasContinuousEmitter && fxVis) || aliveCount > 0 || lightPulseMap.size > 0) {
        renderDirty = true;
      }
    }

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (!gl.fenceSync) {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function requestRender() {
      if (renderBusy) {
        renderDirty = true;
        return;
      }
      renderBusy = true;
      frameId = requestAnimationFrame((now) => {
        const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
        lastTime = now;
        renderDirty = false;

        if (cameraAnimating) {
          const lambda = isSoftwareGl ? 100 : 10;
          camera.position.x = THREE.MathUtils.damp(camera.position.x, _camPosGoal.x, lambda, dt);
          camera.position.y = THREE.MathUtils.damp(camera.position.y, _camPosGoal.y, lambda, dt);
          camera.position.z = THREE.MathUtils.damp(camera.position.z, _camPosGoal.z, lambda, dt);
          orbitControls.target.x = THREE.MathUtils.damp(orbitControls.target.x, _camTargetGoal.x, lambda, dt);
          orbitControls.target.y = THREE.MathUtils.damp(orbitControls.target.y, _camTargetGoal.y, lambda, dt);
          orbitControls.target.z = THREE.MathUtils.damp(orbitControls.target.z, _camTargetGoal.z, lambda, dt);

          const dist =
            camera.position.distanceTo(_camPosGoal) + orbitControls.target.distanceTo(_camTargetGoal);
          if (dist < 0.03) {
            camera.position.copy(_camPosGoal);
            orbitControls.target.copy(_camTargetGoal);
            cameraAnimating = false;
          } else {
            renderDirty = true;
          }
        }

        orbitControls.update();
        if (selectionBox.visible && stateRef.current.selectedPartId) {
          const rig = rigMap.get(stateRef.current.selectedPartId);
          if (rig) selectionBox.setFromObject(rig.mesh);
        }
        if (rigDebugGroup.visible && dbgSelectedRing.visible) {
          dbgSelectedRing.quaternion.copy(camera.quaternion);
        }

        stepFxSimulation(dt);
        renderer.render(scene, camera);
        if (container) {
          container.dataset.renderSeq = String(Number(container.dataset.renderSeq || '0') + 1);
          container.dataset.activeParticles = String(activeParticleCount);
        }
        const done = () => {
          renderBusy = false;
          if (stateRef.current.isPlaying) {
            const pNow = performance.now();
            const pDt = Math.min(0.1, Math.max(0.016, (pNow - lastPlayTick) / 1000));
            lastPlayTick = pNow;
            callbacksRef.current.onPlaybackAdvance?.(pDt);
            requestRender();
          } else if (renderDirty) {
            requestRender();
          }
        };
        if (isSoftwareGl) afterDraw(done);
        else done();
      });
    }

    orbitControls.addEventListener('start', () => {
      cameraAnimating = false;
    });
    orbitControls.addEventListener('change', requestRender);

    transformControls.addEventListener('dragging-changed', (e) => {
      orbitControls.enabled = !e.value;
    });
    transformControls.addEventListener('change', requestRender);

    transformControls.addEventListener('objectChange', () => {
      const obj = transformControls.object;
      if (!obj || !obj.userData.partId) return;
      const partId = obj.userData.partId as string;
      const rig = rigMap.get(partId);
      const part = stateRef.current.parts.find((p) => p.id === partId);
      if (!rig || !part) return;

      const piv = part.pivotOffset ?? [0, 0, 0];
      const snap = stateRef.current.studSnap;

      if (obj.userData.isPivot) {
        const pos: [number, number, number] = [
          roundTo(rig.pivotGroup.position.x - piv[0], 0),
          roundTo(rig.pivotGroup.position.y - piv[1], 0),
          roundTo(rig.pivotGroup.position.z - piv[2], 0),
        ];
        const rot: [number, number, number] = [
          roundTo(THREE.MathUtils.radToDeg(rig.pivotGroup.rotation.x), 0),
          roundTo(THREE.MathUtils.radToDeg(rig.pivotGroup.rotation.y), 0),
          roundTo(THREE.MathUtils.radToDeg(rig.pivotGroup.rotation.z), 0),
        ];
        rig.mesh.updateWorldMatrix(true, false);
        selectionBox.setFromObject(rig.mesh);
        callbacksRef.current.onUpdatePartTransform(partId, {
          position: pos,
          rotation: rot,
        });
      } else {
        const size: [number, number, number] = [
          Math.max(0.05, roundTo(rig.mesh.scale.x, snap > 0 ? snap : 0)),
          Math.max(0.05, roundTo(rig.mesh.scale.y, snap > 0 ? snap : 0)),
          Math.max(0.05, roundTo(rig.mesh.scale.z, snap > 0 ? snap : 0)),
        ];
        rig.mesh.scale.set(size[0], size[1], size[2]);
        rig.mesh.updateWorldMatrix(true, false);
        selectionBox.setFromObject(rig.mesh);
        callbacksRef.current.onUpdatePartTransform(partId, { size });
      }
    });

    const raycaster = new THREE.Raycaster();
    const pointerNdc = new THREE.Vector2();
    let downX = 0;
    let downY = 0;

    const onPointerDown = (e: PointerEvent) => {
      downX = e.clientX;
      downY = e.clientY;
    };
    const onPointerUp = (e: PointerEvent) => {
      const dist = Math.hypot(e.clientX - downX, e.clientY - downY);
      if (dist > 5 || transformControls.dragging) return;
      if (e.button !== 0) return;

      const rect = renderer.domElement.getBoundingClientRect();
      pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointerNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointerNdc, camera);
      const pickables = Array.from(rigMap.values())
        .map((r) => r.mesh)
        .filter((m) => m.visible);
      const hits = raycaster.intersectObjects(pickables, false);
      if (hits.length > 0) {
        const hitId = hits[0].object.userData.partId as string;
        callbacksRef.current.onSelectPart(hitId);
      } else {
        callbacksRef.current.onSelectPart(null);
      }
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointerup', onPointerUp);

    function syncScene() {
      const { parts: currentParts, workspaceMode: mode, activePoses: poses } = stateRef.current;
      const incomingIds = new Set(currentParts.map((p) => p.id));

      for (const [id, rig] of rigMap.entries()) {
        if (!incomingIds.has(id)) {
          if (
            transformControls.object === rig.pivotGroup ||
            transformControls.object === rig.mesh
          ) {
            transformControls.detach();
          }
          rig.pivotGroup.parent?.remove(rig.pivotGroup);
          if (Array.isArray(rig.mesh.material)) rig.mesh.material.forEach((m) => m.dispose());
          else rig.mesh.material.dispose();
          rigMap.delete(id);
        }
      }

      for (const part of currentParts) {
        let rig = rigMap.get(part.id);
        const geo = getShapeGeo(part.shape);
        const matKey = `${part.material}|${part.reflectance.toFixed(2)}`;

        if (!rig) {
          const pivotGroup = new THREE.Group();
          pivotGroup.userData.partId = part.id;
          pivotGroup.userData.isPivot = true;

          const centerGroup = new THREE.Group();
          pivotGroup.add(centerGroup);

          const mat = buildThreeMaterialForPart(part, matTextureCache, isSoftwareGl);
          const mesh = new THREE.Mesh(geo, mat);
          mesh.userData.partId = part.id;
          mesh.userData.isPivot = false;
          centerGroup.add(mesh);

          rig = { pivotGroup, centerGroup, mesh, matCacheKey: matKey };
          rigMap.set(part.id, rig);
        } else {
          if (rig.mesh.geometry !== geo) {
            rig.mesh.geometry = geo;
          }
          if (rig.matCacheKey !== matKey) {
            const oldMat = rig.mesh.material;
            rig.mesh.material = buildThreeMaterialForPart(part, matTextureCache, isSoftwareGl);
            if (Array.isArray(oldMat)) oldMat.forEach((m) => m.dispose());
            else oldMat.dispose();
            rig.matCacheKey = matKey;
          }
        }
      }

      const ordered = flattenPartTree(currentParts);
      for (const { part } of ordered) {
        const rig = rigMap.get(part.id);
        if (!rig) continue;

        const parentRig =
          part.parentId && incomingIds.has(part.parentId) ? rigMap.get(part.parentId) : undefined;
        const desiredParent = parentRig ? parentRig.centerGroup : modelGroup;
        if (rig.pivotGroup.parent !== desiredParent) {
          desiredParent.add(rig.pivotGroup);
        }

        const useRuntimePoses = mode === 'animate' || Boolean(stateRef.current.isScriptRunning);
        const pose =
          useRuntimePoses && poses?.[part.id]
            ? poses[part.id]
            : {
                position: part.position,
                rotation: part.rotation,
                size: part.size,
                color: part.color,
                transparency: part.transparency,
              };

        const piv = part.pivotOffset ?? [0, 0, 0];
        rig.pivotGroup.name = `${part.name}_pivot`;
        rig.pivotGroup.position.set(
          pose.position[0] + piv[0],
          pose.position[1] + piv[1],
          pose.position[2] + piv[2]
        );
        rig.pivotGroup.rotation.set(
          THREE.MathUtils.degToRad(pose.rotation[0]),
          THREE.MathUtils.degToRad(pose.rotation[1]),
          THREE.MathUtils.degToRad(pose.rotation[2]),
          'XYZ'
        );
        rig.centerGroup.position.set(-piv[0], -piv[1], -piv[2]);

        const hiddenByTransparency =
          pose.transparency >= 0.99 &&
          (mode === 'animate' || part.id !== stateRef.current.selectedPartId);
        rig.mesh.name = part.name;
        rig.mesh.visible = part.visible && !hiddenByTransparency;
        rig.mesh.castShadow = !isSoftwareGl && part.castShadow;
        rig.mesh.receiveShadow = !isSoftwareGl;
        rig.mesh.scale.set(
          Math.max(0.05, pose.size[0]),
          Math.max(0.05, pose.size[1]),
          Math.max(0.05, pose.size[2])
        );

        const mat = rig.mesh.material as THREE.MeshPhysicalMaterial;
        const spec = ROBLOX_MATERIAL_SPECS[part.material] ?? ROBLOX_MATERIAL_SPECS.SmoothPlastic;
        mat.color.set(pose.color);
        if (spec.emissiveIntensity > 0) {
          mat.emissive.set(pose.color);
        } else {
          mat.emissive.setHex(0x000000);
        }
        const opacity = Math.max(
          0.02,
          (1 - pose.transparency) * (spec.opacityMultiplier ?? 1)
        );
        const isTransparent = opacity < 0.99;
        if (mat.transparent !== isTransparent) {
          mat.transparent = isTransparent;
          mat.depthWrite = !isTransparent;
          mat.needsUpdate = true;
        }
        mat.opacity = opacity;
      }

      modelGroup.updateMatrixWorld(true);
      syncControls();
      syncRigDebug();
      requestRender();
    }

    function syncRigDebug() {
      const {
        showRigDebug: enabled,
        parts: currentParts,
        workspaceMode: mode,
        activePoses: poses,
        selectedPartId: selId,
      } = stateRef.current;

      rigDebugGroup.visible = enabled;
      if (!enabled) {
        requestRender();
        return;
      }

      for (const m of dbgSpherePool) m.visible = false;
      for (const m of dbgBonePool) m.visible = false;
      for (const m of dbgBoxPool) m.visible = false;
      dbgSelectedRing.visible = false;

      const nodes = buildMotor6DDebugGraph(
        currentParts,
        mode === 'animate' || stateRef.current.isScriptRunning ? poses : undefined
      );

      let sphereIdx = 0;
      let boneIdx = 0;
      let boxIdx = 0;

      const acquireSphere = () => {
        if (sphereIdx >= dbgSpherePool.length) {
          const m = new THREE.Mesh(dbgSphereGeo, getDebugMat('#38BDF8', 0.96));
          m.renderOrder = 999;
          rigDebugGroup.add(m);
          dbgSpherePool.push(m);
        }
        return dbgSpherePool[sphereIdx++];
      };

      const acquireBone = () => {
        if (boneIdx >= dbgBonePool.length) {
          const m = new THREE.Mesh(dbgBoneGeo, getDebugMat('#38BDF8', 0.9));
          m.renderOrder = 998;
          rigDebugGroup.add(m);
          dbgBonePool.push(m);
        }
        return dbgBonePool[boneIdx++];
      };

      const acquireBox = () => {
        if (boxIdx >= dbgBoxPool.length) {
          const m = new THREE.Mesh(dbgBoxGeo, getDebugMat('#F472B6', 0.92));
          m.renderOrder = 999;
          rigDebugGroup.add(m);
          dbgBoxPool.push(m);
        }
        return dbgBoxPool[boxIdx++];
      };

      for (const node of nodes) {
        const isSelected = node.partId === selId;
        const isConnectedToSelected = isSelected || node.parentId === selId;

        const sphere = acquireSphere();
        const radius = isSelected
          ? 0.21
          : node.isRigMember
          ? node.depth === 0
            ? 0.18
            : 0.14
          : 0.095;
        sphere.position.set(node.pivotWorld[0], node.pivotWorld[1], node.pivotWorld[2]);
        sphere.scale.set(radius, radius, radius);
        sphere.material = getDebugMat(
          isSelected ? '#FACC15' : node.colorHex,
          node.isRigMember || isSelected ? 0.97 : 0.6
        );
        sphere.visible = true;

        if (isSelected) {
          dbgSelectedRing.position.set(
            node.pivotWorld[0],
            node.pivotWorld[1],
            node.pivotWorld[2]
          );
          dbgSelectedRing.scale.set(0.32, 0.32, 0.32);
          dbgSelectedRing.quaternion.copy(camera.quaternion);
          dbgSelectedRing.visible = true;
        }

        if (node.parentPivotWorld) {
          _dbgA.set(
            node.parentPivotWorld[0],
            node.parentPivotWorld[1],
            node.parentPivotWorld[2]
          );
          _dbgB.set(node.pivotWorld[0], node.pivotWorld[1], node.pivotWorld[2]);
          _dbgDir.subVectors(_dbgB, _dbgA);
          const dist = _dbgDir.length();
          if (dist > 1e-3) {
            _dbgMid.addVectors(_dbgA, _dbgB).multiplyScalar(0.5);
            _dbgDir.divideScalar(dist);
            _dbgQuat.setFromUnitVectors(_dbgUp, _dbgDir);

            const bone = acquireBone();
            const boneRadius = isConnectedToSelected ? 0.052 : 0.036;
            bone.position.copy(_dbgMid);
            bone.quaternion.copy(_dbgQuat);
            bone.scale.set(boneRadius, dist, boneRadius);
            bone.material = getDebugMat(isSelected ? '#FACC15' : node.colorHex, 0.88);
            bone.visible = true;
          }
        }

        if (node.hasPivotOffset) {
          _dbgA.set(node.pivotWorld[0], node.pivotWorld[1], node.pivotWorld[2]);
          _dbgB.set(node.centerWorld[0], node.centerWorld[1], node.centerWorld[2]);
          _dbgDir.subVectors(_dbgB, _dbgA);
          const offsetDist = _dbgDir.length();
          if (offsetDist > 1e-3) {
            _dbgMid.addVectors(_dbgA, _dbgB).multiplyScalar(0.5);
            _dbgDir.divideScalar(offsetDist);
            _dbgQuat.setFromUnitVectors(_dbgUp, _dbgDir);

            const offsetBone = acquireBone();
            offsetBone.position.copy(_dbgMid);
            offsetBone.quaternion.copy(_dbgQuat);
            offsetBone.scale.set(0.022, offsetDist, 0.022);
            offsetBone.material = getDebugMat('#F472B6', 0.85);
            offsetBone.visible = true;
          }

          const centerBox = acquireBox();
          centerBox.position.copy(_dbgB);
          centerBox.scale.set(0.11, 0.11, 0.11);
          centerBox.material = getDebugMat('#F472B6', 0.92);
          centerBox.visible = true;
        }
      }

      requestRender();
    }

    function syncControls() {
      const {
        selectedPartId: selId,
        transformMode: mode,
        studSnap: snap,
        isPlaying: playing,
      } = stateRef.current;
      const rig = selId ? rigMap.get(selId) : undefined;

      if (rig && rig.mesh.visible) {
        selectionBox.setFromObject(rig.mesh);
        selectionBox.visible = true;
        if (pivotAxes.parent !== rig.pivotGroup) {
          rig.pivotGroup.add(pivotAxes);
        }
        pivotAxes.visible = true;
      } else {
        selectionBox.visible = false;
        pivotAxes.visible = false;
      }

      if (rig && rig.mesh.visible && mode !== 'select' && !playing) {
        transformControls.setMode(mode);
        transformControls.setTranslationSnap(snap > 0 ? snap : null);
        transformControls.setRotationSnap(snap > 0 ? THREE.MathUtils.degToRad(15) : null);
        transformControls.setScaleSnap(snap > 0 ? snap : null);
        const targetObj = mode === 'scale' ? rig.mesh : rig.pivotGroup;
        if (transformControls.object !== targetObj) {
          transformControls.attach(targetObj);
        }
        gizmoHelper.visible = true;
      } else {
        transformControls.detach();
        gizmoHelper.visible = false;
      }
      requestRender();
    }

    function syncHelpers() {
      gridHelper.visible = stateRef.current.showGrid;
      avatarDummy.visible = stateRef.current.showAvatarRef;
      requestRender();
    }

    function applyCameraPreset(preset: CameraPreset, snapImmediate = false) {
      _fitBox.makeEmpty();
      let hasVisibleMesh = false;
      for (const rig of rigMap.values()) {
        if (!rig.mesh.visible) continue;
        _meshBox.setFromObject(rig.mesh);
        _fitBox.union(_meshBox);
        hasVisibleMesh = true;
      }
      if (hasVisibleMesh) {
        _fitBox.getCenter(_fitCenter);
        _fitBox.getSize(_fitSize);
      } else {
        _fitCenter.set(0, 2.6, 0);
        _fitSize.set(5, 5, 5);
      }

      const radius = Math.max(2.6, _fitSize.length() * 0.5);
      const aspectFactor = camera.aspect < 1 ? Math.max(0.58, camera.aspect) : 1;
      const dist = Math.max(11, radius * 2.25) / aspectFactor;
      _camTargetGoal.copy(_fitCenter);
      switch (preset) {
        case 'perspective':
          _camPosGoal.set(
            _fitCenter.x + dist * 0.62,
            _fitCenter.y + dist * 0.42,
            _fitCenter.z + dist * 0.72
          );
          break;
        case 'front':
          _camPosGoal.set(_fitCenter.x, _fitCenter.y + 0.4, _fitCenter.z + dist);
          break;
        case 'top':
          _camPosGoal.set(_fitCenter.x, _fitCenter.y + dist * 1.15, _fitCenter.z + 0.01);
          break;
        case 'side':
          _camPosGoal.set(_fitCenter.x + dist, _fitCenter.y + 0.4, _fitCenter.z);
          break;
      }

      if (snapImmediate) {
        camera.position.copy(_camPosGoal);
        orbitControls.target.copy(_camTargetGoal);
        orbitControls.update();
        cameraAnimating = false;
      } else {
        cameraAnimating = true;
      }
      requestRender();
    }

    // Internal marker event handler accessible by outer useEffect
    const handleTriggeredMarkerAction = (effectId: string, action: string, burstCount: number) => {
      if (action === 'enable') {
        fxOverrides.set(effectId, true);
      } else if (action === 'disable') {
        fxOverrides.set(effectId, false);
      } else if (action === 'pulse') {
        lightPulseMap.set(effectId, { boost: 2.5, remaining: 0.55 });
        emitBurstById(effectId, burstCount);
      } else {
        emitBurstById(effectId, burstCount);
      }
      requestRender();
    };
    (engineApiRef as { current: unknown }).current = {
      syncScene,
      syncControls,
      syncHelpers,
      syncRigDebug,
      applyCameraPreset,
      requestRender,
      resetPlaybackClock,
      emitBurstById,
      resetFxPlaybackState,
      handleTriggeredMarkerAction,
    };

    syncScene();
    syncHelpers();
    applyCameraPreset('perspective', true);
    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    const resizeObserver = new ResizeObserver(() => {
      if (!container) return;
      const w = Math.max(1, container.clientWidth);
      const h = Math.max(1, container.clientHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      requestRender();
    });
    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', handleContextRestored);

      transformControls.dispose();
      orbitControls.dispose();

      for (const rig of rigMap.values()) {
        if (Array.isArray(rig.mesh.material)) rig.mesh.material.forEach((m) => m.dispose());
        else rig.mesh.material.dispose();
      }
      Object.values(shapeGeoCache).forEach((g) => g?.dispose());
      Object.values(matTextureCache).forEach((t) => t?.dispose());
      baseplateGeo.dispose();
      baseplateMat.dispose();
      baseplateTex.dispose();
      contactGeo.dispose();
      contactMat.dispose();
      contactTex.dispose();
      envTex.dispose();
      selectionBox.dispose();
      pivotAxes.dispose();
      dbgSphereGeo.dispose();
      dbgBoneGeo.dispose();
      dbgBoxGeo.dispose();
      dbgRingGeo.dispose();
      dbgMatCache.forEach((m) => m.dispose());
      particleGeo.dispose();
      particleMat.dispose();
      trailMat.dispose();
      for (const slot of trailSlots) slot.geometry.dispose();
      attOctGeo.dispose();
      attMat.dispose();

      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
      engineApiRef.current = null;
    };
  }, []);

  useEffect(() => {
    engineApiRef.current?.syncScene();
  }, [parts, selectedPartId, workspaceMode, activePoses, isScriptRunning, runtimeEffectStates, runtimeLightUpdates, showEffects, showLights, showAttachments]);

  useEffect(() => {
    engineApiRef.current?.syncControls();
    engineApiRef.current?.syncRigDebug();
  }, [transformMode, studSnap, selectedPartId, isPlaying, isScriptRunning, showRigDebug]);

  useEffect(() => {
    if (isPlaying) {
      engineApiRef.current?.resetPlaybackClock();
      engineApiRef.current?.requestRender();
    } else {
      engineApiRef.current?.resetFxPlaybackState();
    }
  }, [isPlaying]);

  useEffect(() => {
    engineApiRef.current?.resetFxPlaybackState();
    markerClockRef.current = { clipId: activeClip?.id ?? null, prevTime: currentTime };
  }, [activeClip?.id]);

  // Evaluate KeyframeMarker events crossed during playback
  useEffect(() => {
    const clipId = activeClip?.id ?? null;
    const prev = markerClockRef.current;
    if (isPlaying && activeClip && prev.clipId === clipId) {
      const wrapped = currentTime < prev.prevTime - 0.05;
      const crossed = evaluateTriggeredMarkers(activeClip, prev.prevTime, currentTime, wrapped);
      if (crossed.length > 0) {
        const api = engineApiRef.current as
          | (typeof engineApiRef.current & {
              handleTriggeredMarkerAction?: (id: string, action: string, count: number) => void;
            })
          | null;
        for (const m of crossed) {
          if (m.effectId) {
            api?.handleTriggeredMarkerAction?.(
              m.effectId,
              m.effectAction ?? 'emit',
              m.burstCount ?? 22
            );
          }
          setFiredMarkerToast((old) => ({
            name: m.name,
            value: m.value,
            seq: (old?.seq ?? 0) + 1,
          }));
        }
        if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
        toastTimerRef.current = window.setTimeout(() => setFiredMarkerToast(null), 1100);
      }
    }
    markerClockRef.current = { clipId, prevTime: currentTime };
  }, [isPlaying, activeClip, currentTime]);

  useEffect(() => {
    if (burstTriggerSeq) {
      engineApiRef.current?.emitBurstById(burstTriggerSeq.effectId, burstTriggerSeq.count);
    }
  }, [burstTriggerSeq]);

  useEffect(() => {
    if (pulseTriggerSeq) {
      const api = engineApiRef.current as
        | (typeof engineApiRef.current & {
            handleTriggeredMarkerAction?: (id: string, action: string, count: number) => void;
          })
        | null;
      api?.handleTriggeredMarkerAction?.(pulseTriggerSeq.effectId, 'pulse', 10);
    }
  }, [pulseTriggerSeq]);

  useEffect(() => {
    engineApiRef.current?.syncHelpers();
  }, [showGrid, showAvatarRef]);

  useEffect(() => {
    if (cameraPresetRequest) {
      engineApiRef.current?.applyCameraPreset(cameraPresetRequest.preset);
    }
  }, [cameraPresetRequest]);

  return (
    <div className="relative w-full h-full bg-[#11151d]">
      <div
        ref={canvasMountRef}
        className="w-full h-full"
        data-testid="three-viewport"
        data-rig-debug={showRigDebug ? 'true' : 'false'}
        aria-label="3D Modeling Viewport"
      />
      {firedMarkerToast && isPlaying && (
        <div
          role="status"
          className="pointer-events-none absolute bottom-3 left-3 flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-[#0e1015]/92 border border-amber-500/50 text-xs shadow-lg"
        >
          <Bookmark className="w-3.5 h-3.5 text-amber-400 shrink-0" aria-hidden="true" />
          <span className="font-semibold text-amber-200">{firedMarkerToast.name}</span>
          {firedMarkerToast.value && (
            <span className="text-[11px] font-mono-tabular text-slate-300">
              {firedMarkerToast.value}
            </span>
          )}
        </div>
      )}
      {contextLost && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0e1015]/95 text-slate-200 p-6 text-center">
          <div className="max-w-sm space-y-2">
            <h2 className="text-base font-semibold">WebGL Context Suspended</h2>
            <p className="text-sm text-slate-400">
              Your browser temporarily paused hardware rendering. Restoring viewport automatically.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
