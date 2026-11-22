import * as THREE from 'three';
import {
  AnimationClip,
  AnimationEventMarker,
  PartPoseKeyframe,
  RobloxAnimationPriority,
  RobloxEasingDirection,
  RobloxEasingStyle,
  StudioAttachmentNode,
  StudioPartNode,
  StudioSceneModel,
} from './robloxTypes';

export interface EvaluatedPartPose {
  position: [number, number, number];
  rotation: [number, number, number];
  size: [number, number, number];
  color: string;
  transparency: number;
  weight?: number;
}

export interface SolvedWorldTransform {
  partId: string;
  /** World center position of the part */
  worldPosition: [number, number, number];
  /** World Euler XYZ degrees */
  worldRotation: [number, number, number];
  /** World Quaternion */
  worldQuaternion: [number, number, number, number];
  /** World 4x4 matrix */
  worldMatrix: THREE.Matrix4;
  /** Effective size */
  size: [number, number, number];
  /** Effective color */
  color: string;
  /** Effective transparency */
  transparency: number;
}

function easeInByStyle(style: RobloxEasingStyle, t: number): number {
  switch (style) {
    case 'Linear':
      return t;
    case 'Constant':
      return t >= 1 ? 1 : 0;
    case 'Sine':
      return 1 - Math.cos((t * Math.PI) / 2);
    case 'Quad':
      return t * t;
    case 'Cubic':
      return t * t * t;
    case 'Back': {
      const c1 = 1.70158;
      const c3 = c1 + 1;
      return c3 * t * t * t - c1 * t * t;
    }
    case 'Elastic': {
      if (t <= 0) return 0;
      if (t >= 1) return 1;
      const c4 = (2 * Math.PI) / 3;
      return -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * c4);
    }
    case 'Bounce':
      return 1 - bounceOut(1 - t);
  }
}

function bounceOut(t: number): number {
  const n1 = 7.5625;
  const d1 = 2.75;
  if (t < 1 / d1) {
    return n1 * t * t;
  } else if (t < 2 / d1) {
    const u = t - 1.5 / d1;
    return n1 * u * u + 0.75;
  } else if (t < 2.5 / d1) {
    const u = t - 2.25 / d1;
    return n1 * u * u + 0.9375;
  } else {
    const u = t - 2.625 / d1;
    return n1 * u * u + 0.984375;
  }
}

/**
 * Evaluates Roblox-accurate EasingStyle + EasingDirection for normalized t in [0, 1].
 */
export function evaluateRobloxEasing(
  style: RobloxEasingStyle,
  direction: RobloxEasingDirection,
  t: number
): number {
  const u = Math.max(0, Math.min(1, t));
  if (style === 'Linear' || style === 'Constant') {
    return easeInByStyle(style, u);
  }
  if (direction === 'In') {
    return easeInByStyle(style, u);
  }
  if (direction === 'Out') {
    return 1 - easeInByStyle(style, 1 - u);
  }
  // InOut
  return u < 0.5
    ? easeInByStyle(style, u * 2) / 2
    : 1 - easeInByStyle(style, (1 - u) * 2) / 2;
}

export function lerpVec3(
  a: [number, number, number],
  b: [number, number, number],
  alpha: number
): [number, number, number] {
  return [
    a[0] + (b[0] - a[0]) * alpha,
    a[1] + (b[1] - a[1]) * alpha,
    a[2] + (b[2] - a[2]) * alpha,
  ];
}

const _qA = new THREE.Quaternion();
const _qB = new THREE.Quaternion();
const _eA = new THREE.Euler();
const _eB = new THREE.Euler();

export function slerpEulerDeg(
  aDeg: [number, number, number],
  bDeg: [number, number, number],
  alpha: number
): [number, number, number] {
  _eA.set(
    THREE.MathUtils.degToRad(aDeg[0]),
    THREE.MathUtils.degToRad(aDeg[1]),
    THREE.MathUtils.degToRad(aDeg[2]),
    'XYZ'
  );
  _eB.set(
    THREE.MathUtils.degToRad(bDeg[0]),
    THREE.MathUtils.degToRad(bDeg[1]),
    THREE.MathUtils.degToRad(bDeg[2]),
    'XYZ'
  );
  _qA.setFromEuler(_eA);
  _qB.setFromEuler(_eB);
  _qA.slerp(_qB, alpha);
  _eA.setFromQuaternion(_qA, 'XYZ');
  return [
    THREE.MathUtils.radToDeg(_eA.x),
    THREE.MathUtils.radToDeg(_eA.y),
    THREE.MathUtils.radToDeg(_eA.z),
  ];
}

const _cA = new THREE.Color();
const _cB = new THREE.Color();

export function lerpColorHex(hexA: string, hexB: string, alpha: number): string {
  _cA.set(hexA);
  _cB.set(hexB);
  const clamped = Math.max(0, Math.min(1, alpha));
  _cA.lerp(_cB, clamped);
  return `#${_cA.getHexString().toUpperCase()}`;
}

/**
 * Evaluates a single part's local pose at timestamp `time` in an AnimationClip.
 */
export function evaluatePartPoseAtTime(
  part: StudioPartNode,
  clip: AnimationClip | null | undefined,
  time: number
): EvaluatedPartPose {
  const basePose: EvaluatedPartPose = {
    position: [...part.position],
    rotation: [...part.rotation],
    size: [...part.size],
    color: part.color,
    transparency: part.transparency,
  };
  if (!clip) return basePose;

  const track = clip.tracks.find((tr) => tr.partId === part.id);
  if (!track || track.keyframes.length === 0) return basePose;

  const sorted = [...track.keyframes].sort((a, b) => a.time - b.time);
  const t = Math.max(0, Math.min(clip.duration, time));

  const evalChannel = <T,>(
    getter: (kf: PartPoseKeyframe) => T | undefined,
    fallback: T,
    lerper: (a: T, b: T, alpha: number) => T
  ): T => {
    const channelKfs = sorted.filter((kf) => getter(kf) !== undefined);
    if (channelKfs.length === 0) return fallback;
    if (t <= channelKfs[0].time) return getter(channelKfs[0])!;
    const last = channelKfs[channelKfs.length - 1];
    if (t >= last.time) return getter(last)!;

    for (let i = 0; i < channelKfs.length - 1; i++) {
      const k0 = channelKfs[i];
      const k1 = channelKfs[i + 1];
      if (t >= k0.time && t <= k1.time) {
        const span = k1.time - k0.time;
        if (span <= 1e-6) return getter(k1)!;
        const linearT = (t - k0.time) / span;
        const eased = evaluateRobloxEasing(k0.easingStyle, k0.easingDirection, linearT);
        return lerper(getter(k0)!, getter(k1)!, eased);
      }
    }
    return fallback;
  };

  const evalWeight = evalChannel(
    (k) => k.weight,
    1,
    (a, b, alpha) => a + (b - a) * alpha
  );
  const clipWeight = clip.defaultWeight ?? 1;
  const effectiveWeight = Math.max(0, Math.min(1, evalWeight * clipWeight));

  const rawPos = evalChannel((k) => k.position, basePose.position, lerpVec3);
  const rawRot = evalChannel((k) => k.rotation, basePose.rotation, slerpEulerDeg);
  const rawSize = evalChannel((k) => k.size, basePose.size, lerpVec3);
  const rawColor = evalChannel((k) => k.color, basePose.color, lerpColorHex);
  const rawTransp = evalChannel(
    (k) => k.transparency,
    basePose.transparency,
    (a, b, alpha) => Math.max(0, Math.min(0.99, a + (b - a) * alpha))
  );

  if (effectiveWeight >= 0.999) {
    return {
      position: rawPos,
      rotation: rawRot,
      size: rawSize,
      color: rawColor,
      transparency: rawTransp,
      weight: 1,
    };
  }

  if (effectiveWeight <= 1e-4) {
    return { ...basePose, weight: 0 };
  }

  return {
    position: lerpVec3(basePose.position, rawPos, effectiveWeight),
    rotation: slerpEulerDeg(basePose.rotation, rawRot, effectiveWeight),
    size: lerpVec3(basePose.size, rawSize, effectiveWeight),
    color: lerpColorHex(basePose.color, rawColor, effectiveWeight),
    transparency: Math.max(
      0,
      Math.min(0.99, basePose.transparency + (rawTransp - basePose.transparency) * effectiveWeight)
    ),
    weight: round3(effectiveWeight),
  };
}

/**
 * Evaluates all parts in a model at timestamp `time`.
 */
export function evaluateClipAtTime(
  model: StudioSceneModel,
  clip: AnimationClip | null | undefined,
  time: number
): Record<string, EvaluatedPartPose> {
  const result: Record<string, EvaluatedPartPose> = {};
  for (const part of model.parts) {
    result[part.id] = evaluatePartPoseAtTime(part, clip, time);
  }
  return result;
}

/**
 * Checks whether setting `childId.parentId = candidateParentId` would introduce a cycle.
 */
export function wouldCreateCycle(
  parts: StudioPartNode[],
  childId: string,
  candidateParentId: string | null
): boolean {
  if (!candidateParentId) return false;
  if (candidateParentId === childId) return true;
  const map = new Map(parts.map((p) => [p.id, p]));
  let cur: string | null | undefined = candidateParentId;
  const visited = new Set<string>([childId]);
  while (cur) {
    if (visited.has(cur)) return true;
    visited.add(cur);
    cur = map.get(cur)?.parentId ?? null;
  }
  return false;
}

/**
 * Solves exact world transforms for a Motor6D-style parent-child rig with local pivotOffsets.
 *
 * Hierarchy convention:
 *   Part local matrix = T(pos + pivot) * R(rot) * T(-pivot)
 *   Child inherits its parent's world matrix (placed at parent's center frame).
 */
export function solveWorldTransforms(
  parts: StudioPartNode[],
  poses?: Record<string, EvaluatedPartPose>
): Map<string, SolvedWorldTransform> {
  const partMap = new Map(parts.map((p) => [p.id, p]));
  const solved = new Map<string, SolvedWorldTransform>();
  const visiting = new Set<string>();

  const buildLocalCenterMatrix = (
    part: StudioPartNode,
    pose: EvaluatedPartPose
  ): THREE.Matrix4 => {
    const piv = part.pivotOffset ?? [0, 0, 0];
    const eul = new THREE.Euler(
      THREE.MathUtils.degToRad(pose.rotation[0]),
      THREE.MathUtils.degToRad(pose.rotation[1]),
      THREE.MathUtils.degToRad(pose.rotation[2]),
      'XYZ'
    );
    const tToPivot = new THREE.Matrix4().makeTranslation(
      pose.position[0] + piv[0],
      pose.position[1] + piv[1],
      pose.position[2] + piv[2]
    );
    const rMat = new THREE.Matrix4().makeRotationFromEuler(eul);
    const tBack = new THREE.Matrix4().makeTranslation(-piv[0], -piv[1], -piv[2]);
    return tToPivot.multiply(rMat).multiply(tBack);
  };

  const resolvePart = (id: string): SolvedWorldTransform | null => {
    const existing = solved.get(id);
    if (existing) return existing;
    const part = partMap.get(id);
    if (!part) return null;

    if (visiting.has(id)) {
      // Break unexpected cycle safely
      return null;
    }
    visiting.add(id);

    const pose: EvaluatedPartPose = poses?.[id] ?? {
      position: part.position,
      rotation: part.rotation,
      size: part.size,
      color: part.color,
      transparency: part.transparency,
    };

    const localMat = buildLocalCenterMatrix(part, pose);
    let worldMat = localMat;

    if (part.parentId && partMap.has(part.parentId)) {
      const parentSolved = resolvePart(part.parentId);
      if (parentSolved) {
        worldMat = new THREE.Matrix4().multiplyMatrices(parentSolved.worldMatrix, localMat);
      }
    }

    const posVec = new THREE.Vector3();
    const quat = new THREE.Quaternion();
    const scaleVec = new THREE.Vector3();
    worldMat.decompose(posVec, quat, scaleVec);
    const eul = new THREE.Euler().setFromQuaternion(quat, 'XYZ');

    const entry: SolvedWorldTransform = {
      partId: id,
      worldPosition: [posVec.x, posVec.y, posVec.z],
      worldRotation: [
        THREE.MathUtils.radToDeg(eul.x),
        THREE.MathUtils.radToDeg(eul.y),
        THREE.MathUtils.radToDeg(eul.z),
      ],
      worldQuaternion: [quat.x, quat.y, quat.z, quat.w],
      worldMatrix: worldMat,
      size: [...pose.size],
      color: pose.color,
      transparency: pose.transparency,
    };

    visiting.delete(id);
    solved.set(id, entry);
    return entry;
  };

  for (const part of parts) {
    resolvePart(part.id);
  }

  return solved;
}

/**
 * Reparents a part while preserving its visual world position & orientation.
 */
export function reparentPartPreservingWorld(
  parts: StudioPartNode[],
  partId: string,
  newParentId: string | null
): StudioPartNode[] {
  if (wouldCreateCycle(parts, partId, newParentId)) {
    return parts;
  }
  const worldBefore = solveWorldTransforms(parts);
  const childWorld = worldBefore.get(partId);
  const targetPart = parts.find((p) => p.id === partId);
  if (!childWorld || !targetPart) return parts;

  let nextLocalMat = childWorld.worldMatrix.clone();
  if (newParentId) {
    const parentWorld = worldBefore.get(newParentId);
    if (parentWorld) {
      const invParent = parentWorld.worldMatrix.clone().invert();
      nextLocalMat = invParent.multiply(childWorld.worldMatrix);
    }
  }

  // Note: when pivotOffset is non-zero, centerMatrix = T(pos+piv) * R * T(-piv)
  // => R matches nextLocalMat's rotation, and pos+piv - R*piv = translation => pos = translation - piv + R*piv
  const piv = targetPart.pivotOffset ?? [0, 0, 0];
  const trans = new THREE.Vector3();
  const quat = new THREE.Quaternion();
  const scl = new THREE.Vector3();
  nextLocalMat.decompose(trans, quat, scl);
  const eul = new THREE.Euler().setFromQuaternion(quat, 'XYZ');

  const rotatedPiv = new THREE.Vector3(piv[0], piv[1], piv[2]).applyQuaternion(quat);
  const nextPos: [number, number, number] = [
    round3(trans.x - piv[0] + rotatedPiv.x),
    round3(trans.y - piv[1] + rotatedPiv.y),
    round3(trans.z - piv[2] + rotatedPiv.z),
  ];
  const nextRot: [number, number, number] = [
    round3(THREE.MathUtils.radToDeg(eul.x)),
    round3(THREE.MathUtils.radToDeg(eul.y)),
    round3(THREE.MathUtils.radToDeg(eul.z)),
  ];

  return parts.map((p) =>
    p.id === partId
      ? {
          ...p,
          parentId: newParentId,
          position: nextPos,
          rotation: nextRot,
        }
      : p
  );
}

function round3(n: number): number {
  const r = Math.round(n * 1000) / 1000;
  return Object.is(r, -0) ? 0 : r;
}

/**
 * Inserts or updates a keyframe at `time` (within 0.015s tolerance) on a part track.
 */
export function upsertKeyframe(
  clip: AnimationClip,
  partId: string,
  keyframe: Omit<PartPoseKeyframe, 'id'> & { id?: string }
): AnimationClip {
  const snappedTime = Math.max(0, Math.min(clip.duration, Math.round(keyframe.time * 1000) / 1000));
  const tracks = [...clip.tracks];
  let trackIdx = tracks.findIndex((t) => t.partId === partId);
  if (trackIdx === -1) {
    tracks.push({ partId, keyframes: [] });
    trackIdx = tracks.length - 1;
  }
  const track = { ...tracks[trackIdx], keyframes: [...tracks[trackIdx].keyframes] };
  const existingIdx = track.keyframes.findIndex(
    (k) => (keyframe.id && k.id === keyframe.id) || Math.abs(k.time - snappedTime) < 0.015
  );

  if (existingIdx >= 0) {
    const prev = track.keyframes[existingIdx];
    track.keyframes[existingIdx] = {
      ...prev,
      ...keyframe,
      id: prev.id,
      time: snappedTime,
    };
  } else {
    track.keyframes.push({
      ...keyframe,
      id: keyframe.id ?? `kf_${Date.now().toString(36)}_${track.keyframes.length}`,
      time: snappedTime,
    });
  }
  track.keyframes.sort((a, b) => a.time - b.time);
  tracks[trackIdx] = track;
  return { ...clip, tracks };
}

export function deleteKeyframe(
  clip: AnimationClip,
  partId: string,
  keyframeId: string
): AnimationClip {
  const tracks = clip.tracks
    .map((tr) =>
      tr.partId === partId
        ? { ...tr, keyframes: tr.keyframes.filter((k) => k.id !== keyframeId) }
        : tr
    )
    .filter((tr) => tr.keyframes.length > 0);
  return { ...clip, tracks };
}

export function getClipPriority(clip: AnimationClip): RobloxAnimationPriority {
  if (clip.priority) return clip.priority;
  const lower = clip.name.toLowerCase();
  if (lower.includes('idle')) return 'Idle';
  if (lower.includes('fly') || lower.includes('walk') || lower.includes('run')) return 'Movement';
  return 'Action';
}

export function getUniqueKeyframeTimes(clip: AnimationClip): number[] {
  const set = new Set<number>();
  for (const tr of clip.tracks) {
    for (const kf of tr.keyframes) {
      set.add(Math.round(kf.time * 1000) / 1000);
    }
  }
  for (const m of clip.markers ?? []) {
    set.add(Math.round(m.time * 1000) / 1000);
  }
  return Array.from(set).sort((a, b) => a - b);
}

/**
 * Computes exported keyframe sample timestamps based on clip.sampleMode & clip.fps.
 */
export function getSampledClipTimes(
  clip: AnimationClip,
  forceResample = false
): number[] {
  const baseTimes = getUniqueKeyframeTimes(clip);
  const useDense = forceResample || clip.sampleMode === 'resampled';
  if (!useDense) {
    return baseTimes.length > 0 ? baseTimes : [0];
  }

  const fps = Math.max(10, Math.min(60, clip.fps || 30));
  const step = 1 / fps;
  const all = new Set<number>(baseTimes);
  for (let t = 0; t < clip.duration - 1e-4; t += step) {
    all.add(Math.round(t * 1000) / 1000);
  }
  all.add(Math.round(clip.duration * 1000) / 1000);

  const sorted = Array.from(all).sort((a, b) => a - b);
  const deduped: number[] = [];
  for (const t of sorted) {
    if (deduped.length === 0 || t - deduped[deduped.length - 1] > 0.002) {
      deduped.push(t);
    }
  }
  return deduped.length > 0 ? deduped : [0];
}

export function upsertMarker(
  clip: AnimationClip,
  marker: Omit<AnimationEventMarker, 'id'> & { id?: string }
): AnimationClip {
  const snappedTime = Math.max(0, Math.min(clip.duration, Math.round(marker.time * 1000) / 1000));
  const markers = [...(clip.markers ?? [])];
  const existingIdx = marker.id ? markers.findIndex((m) => m.id === marker.id) : -1;
  if (existingIdx >= 0) {
    markers[existingIdx] = {
      ...markers[existingIdx],
      ...marker,
      id: markers[existingIdx].id,
      time: snappedTime,
    };
  } else {
    markers.push({
      ...marker,
      id: marker.id ?? `mkr_${Date.now().toString(36)}_${markers.length}`,
      time: snappedTime,
    });
  }
  markers.sort((a, b) => a.time - b.time);
  return { ...clip, markers };
}

export function deleteMarker(clip: AnimationClip, markerId: string): AnimationClip {
  const markers = (clip.markers ?? []).filter((m) => m.id !== markerId);
  return { ...clip, markers };
}

/**
 * Returns event markers crossed while advancing playhead from prevTime to nextTime.
 */
export function evaluateTriggeredMarkers(
  clip: AnimationClip | null | undefined,
  prevTime: number,
  nextTime: number,
  isLoopWrap = false
): AnimationEventMarker[] {
  if (!clip || !clip.markers || clip.markers.length === 0) return [];
  const sorted = [...clip.markers].sort((a, b) => a.time - b.time);

  if (isLoopWrap) {
    return sorted.filter(
      (m) =>
        (m.time > prevTime && m.time <= clip.duration + 1e-5) ||
        (m.time >= 0 && m.time <= nextTime + 1e-5)
    );
  }
  if (Math.abs(nextTime - prevTime) < 1e-6) {
    return [];
  }
  return sorted.filter((m) =>
    prevTime <= 1e-6
      ? m.time >= 0 && m.time <= nextTime + 1e-5
      : m.time > prevTime && m.time <= nextTime + 1e-5
  );
}

export interface WorldAttachmentTransform {
  attachment: StudioAttachmentNode;
  partId: string;
  worldPosition: [number, number, number];
  worldForward: [number, number, number];
  worldUp: [number, number, number];
}

const _attPos = new THREE.Vector3();
const _attDir = new THREE.Vector3();
const _attUp = new THREE.Vector3();
const _attQuat = new THREE.Quaternion();
const _attEuler = new THREE.Euler();
const _partQuat = new THREE.Quaternion();

/**
 * Solves world-space position & orientation vectors for every Attachment on visible parts.
 */
export function resolveWorldAttachments(
  parts: StudioPartNode[],
  worldTransforms?: Map<string, SolvedWorldTransform>
): Map<string, WorldAttachmentTransform> {
  const worldMap = worldTransforms ?? solveWorldTransforms(parts);
  const out = new Map<string, WorldAttachmentTransform>();

  for (const part of parts) {
    if (!part.visible || !part.attachments || part.attachments.length === 0) continue;
    const solved = worldMap.get(part.id);
    if (!solved) continue;
    _partQuat.set(
      solved.worldQuaternion[0],
      solved.worldQuaternion[1],
      solved.worldQuaternion[2],
      solved.worldQuaternion[3]
    );

    for (const att of part.attachments) {
      _attPos.set(att.position[0], att.position[1], att.position[2]).applyMatrix4(solved.worldMatrix);
      _attEuler.set(
        THREE.MathUtils.degToRad(att.rotation[0]),
        THREE.MathUtils.degToRad(att.rotation[1]),
        THREE.MathUtils.degToRad(att.rotation[2]),
        'XYZ'
      );
      _attQuat.setFromEuler(_attEuler).premultiply(_partQuat);

      _attDir.set(0, 0, 1).applyQuaternion(_attQuat).normalize();
      _attUp.set(0, 1, 0).applyQuaternion(_attQuat).normalize();

      out.set(att.id, {
        attachment: att,
        partId: part.id,
        worldPosition: [round3(_attPos.x), round3(_attPos.y), round3(_attPos.z)],
        worldForward: [round3(_attDir.x), round3(_attDir.y), round3(_attDir.z)],
        worldUp: [round3(_attUp.x), round3(_attUp.y), round3(_attUp.z)],
      });
    }
  }

  return out;
}

/**
 * Computes depth-first hierarchy order for rendering Explorer tree indentation cleanly.
 */
export interface PartTreeItem {
  part: StudioPartNode;
  depth: number;
}

export function flattenPartTree(parts: StudioPartNode[]): PartTreeItem[] {
  const idSet = new Set(parts.map((p) => p.id));
  const childrenByParent = new Map<string | null, StudioPartNode[]>();
  for (const p of parts) {
    const pid = p.parentId && idSet.has(p.parentId) ? p.parentId : null;
    const list = childrenByParent.get(pid) ?? [];
    list.push(p);
    childrenByParent.set(pid, list);
  }

  const out: PartTreeItem[] = [];
  const visit = (parentId: string | null, depth: number, seen: Set<string>) => {
    const children = childrenByParent.get(parentId) ?? [];
    for (const child of children) {
      if (seen.has(child.id)) continue;
      seen.add(child.id);
      out.push({ part: child, depth });
      visit(child.id, depth + 1, seen);
    }
  };
  visit(null, 0, new Set());
  return out;
}

export function buildUniqueNodeNameMap(parts: StudioPartNode[]): Map<string, string> {
  const map = new Map<string, string>();
  const usedLower = new Set<string>(['animsaves', 'animationcontroller', 'animator']);
  parts.forEach((p, idx) => {
    const base = sanitizeNodeName(p.name, p.id);
    let candidate = base;
    let suffix = 2;
    while (
      usedLower.has(candidate.toLowerCase()) ||
      usedLower.has(`${candidate}_pivot`.toLowerCase()) ||
      usedLower.has(`${candidate}_center`.toLowerCase())
    ) {
      candidate = `${base}_${suffix++}`;
    }
    if (!candidate) candidate = `Part_${idx + 1}`;
    usedLower.add(candidate.toLowerCase());
    usedLower.add(`${candidate}_pivot`.toLowerCase());
    usedLower.add(`${candidate}_center`.toLowerCase());
    map.set(p.id, candidate);
  });
  return map;
}

/**
 * Converts StudForge AnimationClips into Three.js AnimationClips (sampled at clip.fps)
 * targeting node names for GLTFExporter.
 */
export function buildThreeAnimationClips(
  model: StudioSceneModel,
  scaleFactor = 1.0,
  originOffset: [number, number, number] = [0, 0, 0]
): THREE.AnimationClip[] {
  const clips = model.animations ?? [];
  const threeClips: THREE.AnimationClip[] = [];
  const activeParts = model.parts.filter((p) => p.visible);
  const activeIds = new Set(activeParts.map((p) => p.id));
  const nodeNames = buildUniqueNodeNameMap(activeParts);

  for (const clip of clips) {
    if (clip.tracks.length === 0) continue;
    const sampleStep = 1 / Math.min(30, clip.fps);
    const times: number[] = [];
    for (let t = 0; t < clip.duration - 1e-4; t += sampleStep) {
      times.push(round3(t));
    }
    times.push(round3(clip.duration));

    const tracks: THREE.KeyframeTrack[] = [];

    for (const animTrack of clip.tracks) {
      const part = model.parts.find((p) => p.id === animTrack.partId);
      if (!part || !part.visible) continue;
      const nodeName = nodeNames.get(part.id) ?? sanitizeNodeName(part.name, part.id);
      const piv = part.pivotOffset ?? [0, 0, 0];
      const isRoot = !part.parentId || !activeIds.has(part.parentId);

      const posValues: number[] = [];
      const quatValues: number[] = [];
      const scaleValues: number[] = [];

      const q = new THREE.Quaternion();
      const eul = new THREE.Euler();

      for (const t of times) {
        const pose = evaluatePartPoseAtTime(part, clip, t);
        const ox = isRoot ? originOffset[0] : 0;
        const oy = isRoot ? originOffset[1] : 0;
        const oz = isRoot ? originOffset[2] : 0;

        posValues.push(
          (pose.position[0] + piv[0] - ox) * scaleFactor,
          (pose.position[1] + piv[1] - oy) * scaleFactor,
          (pose.position[2] + piv[2] - oz) * scaleFactor
        );
        eul.set(
          THREE.MathUtils.degToRad(pose.rotation[0]),
          THREE.MathUtils.degToRad(pose.rotation[1]),
          THREE.MathUtils.degToRad(pose.rotation[2]),
          'XYZ'
        );
        q.setFromEuler(eul);
        quatValues.push(q.x, q.y, q.z, q.w);

        scaleValues.push(
          Math.max(0.05, pose.size[0]) * scaleFactor,
          Math.max(0.05, pose.size[1]) * scaleFactor,
          Math.max(0.05, pose.size[2]) * scaleFactor
        );
      }

      tracks.push(
        new THREE.VectorKeyframeTrack(`${nodeName}_pivot.position`, times, posValues),
        new THREE.QuaternionKeyframeTrack(`${nodeName}_pivot.quaternion`, times, quatValues),
        new THREE.VectorKeyframeTrack(`${nodeName}.scale`, times, scaleValues)
      );
    }

    if (tracks.length > 0) {
      threeClips.push(new THREE.AnimationClip(clip.name, clip.duration, tracks));
    }
  }

  return threeClips;
}

export function sanitizeNodeName(name: string, fallbackId: string): string {
  const clean = name.replace(/[^a-zA-Z0-9_]/g, '_').replace(/^_+/, '');
  return clean || `Part_${fallbackId.replace(/[^a-zA-Z0-9_]/g, '')}`;
}

export interface Motor6DDebugNode {
  partId: string;
  partName: string;
  parentId: string | null;
  depth: number;
  isRigMember: boolean;
  colorHex: string;
  pivotWorld: [number, number, number];
  centerWorld: [number, number, number];
  parentPivotWorld: [number, number, number] | null;
  hasPivotOffset: boolean;
}

const RIG_DEPTH_PALETTE = [
  '#E2E8F0', // Depth 0: Root anchor (Slate-200)
  '#38BDF8', // Depth 1: Primary joint (Sky-400)
  '#A855F7', // Depth 2: Secondary joint (Purple-500)
  '#F59E0B', // Depth 3: Tertiary joint (Amber-500)
  '#10B981', // Depth 4+: Tip / distal joint (Emerald-500)
] as const;

export function getRigDepthColor(depth: number): string {
  const idx = Math.max(0, Math.min(RIG_DEPTH_PALETTE.length - 1, Math.floor(depth)));
  return RIG_DEPTH_PALETTE[idx];
}

const _pivScratch = new THREE.Vector3();

/**
 * Computes world-space joint pivot positions, parent-child bone lines, and depth colors
 * for Motor6D hierarchy visual debugging in StudioViewport.
 */
export function buildMotor6DDebugGraph(
  parts: StudioPartNode[],
  poses?: Record<string, EvaluatedPartPose>
): Motor6DDebugNode[] {
  const visibleParts = parts.filter((p) => p.visible);
  if (visibleParts.length === 0) return [];

  const visibleIds = new Set(visibleParts.map((p) => p.id));
  const hasChildrenSet = new Set<string>();
  for (const p of visibleParts) {
    if (p.parentId && visibleIds.has(p.parentId)) {
      hasChildrenSet.add(p.parentId);
    }
  }

  const worldMap = solveWorldTransforms(visibleParts, poses);
  const ordered = flattenPartTree(visibleParts);
  const pivotById = new Map<string, [number, number, number]>();
  const result: Motor6DDebugNode[] = [];

  for (const { part, depth } of ordered) {
    const solved = worldMap.get(part.id);
    if (!solved) continue;

    const piv = part.pivotOffset ?? [0, 0, 0];
    const hasPivotOffset = Math.hypot(piv[0], piv[1], piv[2]) > 1e-3;
    _pivScratch.set(piv[0], piv[1], piv[2]).applyMatrix4(solved.worldMatrix);
    const pivotWorld: [number, number, number] = [
      round3(_pivScratch.x),
      round3(_pivScratch.y),
      round3(_pivScratch.z),
    ];
    const centerWorld: [number, number, number] = [
      round3(solved.worldPosition[0]),
      round3(solved.worldPosition[1]),
      round3(solved.worldPosition[2]),
    ];

    pivotById.set(part.id, pivotWorld);

    const validParentId =
      part.parentId && visibleIds.has(part.parentId) ? part.parentId : null;
    const parentPivotWorld = validParentId ? pivotById.get(validParentId) ?? null : null;
    const isRigMember = validParentId !== null || hasChildrenSet.has(part.id);

    result.push({
      partId: part.id,
      partName: part.name,
      parentId: validParentId,
      depth,
      isRigMember,
      colorHex: isRigMember ? getRigDepthColor(depth) : '#64748B',
      pivotWorld,
      centerWorld,
      parentPivotWorld,
      hasPivotOffset,
    });
  }

  return result;
}
