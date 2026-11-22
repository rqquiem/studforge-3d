import * as THREE from 'three';
import {
  AnimationClip,
  ExportScaleMode,
  PartPoseKeyframe,
  PartShape,
  ROBLOX_ANIMATION_PRIORITY_TOKENS,
  ROBLOX_MATERIAL_SPECS,
  RobloxEasingDirection,
  RobloxEasingStyle,
  RobloxScriptRunContext,
  RobloxServiceLocation,
  RobloxValidationIssue,
  RobloxValidationReport,
  SHAPE_CATALOG,
  StudioEffectNode,
  StudioPartNode,
  StudioSceneModel,
  StudioScriptNode,
} from './robloxTypes';
import {
  evaluateClipAtTime,
  evaluatePartPoseAtTime,
  getClipPriority,
  getSampledClipTimes,
  getUniqueKeyframeTimes,
  SolvedWorldTransform,
  solveWorldTransforms,
} from './animationEngine';
import { createNormalizedShapeGeometry, estimateShapeTriangles } from './robloxGeometry';
import {
  collectModelEffectsAndSounds,
  generateAllFrameworkModules,
  GeneratedFrameworkModules,
} from './robloxScriptFramework';

export interface RobloxExportOptions {
  scaleMode: ExportScaleMode; // 'studs' = 1.0, 'meters' = 0.28
  includeHidden?: boolean;
  centerAtOrigin?: boolean;
  exportAsPackage?: boolean;
  includeAudioFolder?: boolean;
  includeScriptsFolder?: boolean;
  resampleTransforms?: boolean;
}

export function getScaleFactor(scaleMode: ExportScaleMode): number {
  return scaleMode === 'meters' ? 0.28 : 1.0;
}

export function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function sanitizeIdentifier(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9_ -]/g, '').trim();
  return cleaned.length > 0 ? cleaned : 'Part';
}

const RESERVED_ROBLOX_NAMES = new Set([
  'animsaves',
  'animationcontroller',
  'animator',
  'humanoid',
]);

/**
 * Resolves case-insensitive unique part names for Roblox Studio so BaseParts, Motor6Ds,
 * and AnimSaves Poses never trigger "this rig contains multiple parts which share the same name".
 */
export function resolveUniqueRobloxPartNames(parts: StudioPartNode[]): {
  nameMap: Map<string, string>;
  duplicateCount: number;
} {
  const nameMap = new Map<string, string>();
  const usedLower = new Set<string>(RESERVED_ROBLOX_NAMES);
  const rawSeenLower = new Set<string>();
  let duplicateCount = 0;

  parts.forEach((part, idx) => {
    const rawBase = part.name.trim() || `Part_${idx + 1}`;
    const rawLower = rawBase.toLowerCase();
    if (rawSeenLower.has(rawLower)) {
      duplicateCount++;
    }
    rawSeenLower.add(rawLower);

    let candidate = rawBase;
    let suffix = 2;
    while (usedLower.has(candidate.toLowerCase())) {
      candidate = `${rawBase}_${suffix++}`;
    }
    usedLower.add(candidate.toLowerCase());
    nameMap.set(part.id, candidate);
  });

  return { nameMap, duplicateCount };
}

function resolveUniqueClipNames(clips: AnimationClip[]): Map<string, string> {
  const map = new Map<string, string>();
  const usedLower = new Set<string>();
  clips.forEach((clip, idx) => {
    const base = clip.name.trim() || `Animation_${idx + 1}`;
    let candidate = base;
    let suffix = 2;
    while (usedLower.has(candidate.toLowerCase())) {
      candidate = `${base}_${suffix++}`;
    }
    usedLower.add(candidate.toLowerCase());
    map.set(clip.id, candidate);
  });
  return map;
}

export function hexToRgb255(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return [163, 162, 165];
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return [
    Number.isFinite(r) ? r : 163,
    Number.isFinite(g) ? g : 162,
    Number.isFinite(b) ? b : 165,
  ];
}

/**
 * Converts "#RRGGBB" into Roblox XML Color3uint8 unsigned 32-bit integer (0xFFRRGGBB).
 */
export function hexToColor3uint8(hex: string): number {
  const [r, g, b] = hexToRgb255(hex);
  return ((255 << 24) | (r << 16) | (g << 8) | b) >>> 0;
}

export interface RobloxPartTransform {
  rbxClass: 'Part' | 'WedgePart' | 'CornerWedgePart';
  rbxShapeToken: number | null; // 0 = Ball, 1 = Block, 2 = Cylinder
  position: [number, number, number];
  size: [number, number, number];
  /** Row-major 3x3 rotation matrix [R00, R01, R02, R10, R11, R12, R20, R21, R22] */
  rotationMatrix: [number, number, number, number, number, number, number, number, number];
  /** Euler XYZ in radians for Luau CFrame.Angles */
  eulerRadians: [number, number, number];
  isApproximatedCustomMesh: boolean;
}

const _rotMat = new THREE.Matrix4();
const _cylOffset = new THREE.Matrix4().makeRotationZ(Math.PI / 2);
const _euler = new THREE.Euler();

function usesCylinderAxisSwap(shape: PartShape): boolean {
  return shape === 'Cylinder' || shape === 'LatheCone';
}

/**
 * Converts a StudioPartNode's transform into exact Roblox Studio Part class, Size, and CFrame orientation.
 * Handles the Y-up Cylinder (Three.js) -> X-axis Cylinder (Roblox) orientation mapping.
 */
export function toRobloxPartTransform(
  part: StudioPartNode,
  scaleFactor = 1.0,
  originOffset: [number, number, number] = [0, 0, 0],
  worldOverride?: Pick<SolvedWorldTransform, 'worldPosition' | 'worldRotation' | 'size'>
): RobloxPartTransform {
  const pos = worldOverride ? worldOverride.worldPosition : part.position;
  const rot = worldOverride ? worldOverride.worldRotation : part.rotation;
  const rawSize = worldOverride ? worldOverride.size : part.size;

  const euler = new THREE.Euler(
    THREE.MathUtils.degToRad(rot[0]),
    THREE.MathUtils.degToRad(rot[1]),
    THREE.MathUtils.degToRad(rot[2]),
    'XYZ'
  );
  _rotMat.makeRotationFromEuler(euler);

  let rbxClass: 'Part' | 'WedgePart' | 'CornerWedgePart' = 'Part';
  let rbxShapeToken: number | null = 1; // Block
  let size: [number, number, number] = [
    Math.max(0.05, rawSize[0] * scaleFactor),
    Math.max(0.05, rawSize[1] * scaleFactor),
    Math.max(0.05, rawSize[2] * scaleFactor),
  ];
  let isApproximatedCustomMesh = false;

  if (part.shape === 'Wedge') {
    rbxClass = 'WedgePart';
    rbxShapeToken = null;
  } else if (part.shape === 'CornerWedge') {
    rbxClass = 'CornerWedgePart';
    rbxShapeToken = null;
  } else if (part.shape === 'Ball') {
    rbxClass = 'Part';
    rbxShapeToken = 0; // Ball
  } else if (part.shape === 'Cylinder') {
    rbxClass = 'Part';
    rbxShapeToken = 2; // Cylinder (Roblox cylinder axis is X; rotate local Z +90deg & swap X/Y size)
    _rotMat.multiply(_cylOffset);
    size = [size[1], size[0], size[2]];
  } else if (part.shape !== 'Block') {
    // Procedural sculpted shapes (BevelPlate, HexPrism, Archway, PipeElbow, LatheCone)
    // Exported in .rbxmx as bounding Block/Cylinder fallback, and full geometry in .glb / .obj
    rbxClass = 'Part';
    rbxShapeToken = part.shape === 'LatheCone' ? 2 : 1;
    if (part.shape === 'LatheCone') {
      _rotMat.multiply(_cylOffset);
      size = [size[1], size[0], size[2]];
    }
    isApproximatedCustomMesh = true;
  }

  const e = _rotMat.elements; // column-major
  const rotationMatrix: [number, number, number, number, number, number, number, number, number] = [
    round6(e[0]), round6(e[4]), round6(e[8]),
    round6(e[1]), round6(e[5]), round6(e[9]),
    round6(e[2]), round6(e[6]), round6(e[10]),
  ];

  _euler.setFromRotationMatrix(_rotMat, 'XYZ');

  return {
    rbxClass,
    rbxShapeToken,
    position: [
      round6((pos[0] - originOffset[0]) * scaleFactor),
      round6((pos[1] - originOffset[1]) * scaleFactor),
      round6((pos[2] - originOffset[2]) * scaleFactor),
    ],
    size: [round6(size[0]), round6(size[1]), round6(size[2])],
    rotationMatrix,
    eulerRadians: [round6(_euler.x), round6(_euler.y), round6(_euler.z)],
    isApproximatedCustomMesh,
  };
}

function round6(n: number): number {
  const r = Math.round(n * 1e6) / 1e6;
  return Object.is(r, -0) ? 0 : r;
}

export function computeModelOriginOffset(parts: StudioPartNode[]): [number, number, number] {
  if (parts.length === 0) return [0, 0, 0];
  const worldMap = solveWorldTransforms(parts);
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxZ = -Infinity;
  for (const p of parts) {
    const solved = worldMap.get(p.id);
    const pos = solved ? solved.worldPosition : p.position;
    const sz = solved ? solved.size : p.size;
    minX = Math.min(minX, pos[0] - sz[0] / 2);
    maxX = Math.max(maxX, pos[0] + sz[0] / 2);
    minY = Math.min(minY, pos[1] - sz[1] / 2);
    minZ = Math.min(minZ, pos[2] - sz[2] / 2);
    maxZ = Math.max(maxZ, pos[2] + sz[2] / 2);
  }
  return [(minX + maxX) / 2, minY, (minZ + maxZ) / 2];
}

function pushCoordinateFrameXml(
  lines: string[],
  indent: string,
  propName: string,
  pos: [number, number, number],
  rotMat: [number, number, number, number, number, number, number, number, number]
) {
  lines.push(`${indent}<CoordinateFrame name="${propName}">`);
  lines.push(`${indent}\t<X>${round6(pos[0])}</X>`);
  lines.push(`${indent}\t<Y>${round6(pos[1])}</Y>`);
  lines.push(`${indent}\t<Z>${round6(pos[2])}</Z>`);
  lines.push(`${indent}\t<R00>${round6(rotMat[0])}</R00>`);
  lines.push(`${indent}\t<R01>${round6(rotMat[1])}</R01>`);
  lines.push(`${indent}\t<R02>${round6(rotMat[2])}</R02>`);
  lines.push(`${indent}\t<R10>${round6(rotMat[3])}</R10>`);
  lines.push(`${indent}\t<R11>${round6(rotMat[4])}</R11>`);
  lines.push(`${indent}\t<R12>${round6(rotMat[5])}</R12>`);
  lines.push(`${indent}\t<R20>${round6(rotMat[6])}</R20>`);
  lines.push(`${indent}\t<R21>${round6(rotMat[7])}</R21>`);
  lines.push(`${indent}\t<R22>${round6(rotMat[8])}</R22>`);
  lines.push(`${indent}</CoordinateFrame>`);
}

function matrix4ToPosAndRot(mat: THREE.Matrix4, posScale = 1): {
  pos: [number, number, number];
  rotMat: [number, number, number, number, number, number, number, number, number];
} {
  const e = mat.elements;
  return {
    pos: [round6(e[12] * posScale), round6(e[13] * posScale), round6(e[14] * posScale)],
    rotMat: [
      round6(e[0]), round6(e[4]), round6(e[8]),
      round6(e[1]), round6(e[5]), round6(e[9]),
      round6(e[2]), round6(e[6]), round6(e[10]),
    ],
  };
}

function makePivotTransformMatrix(
  pos: [number, number, number],
  rotDeg: [number, number, number],
  piv: [number, number, number],
  scaleFactor = 1
): THREE.Matrix4 {
  const eul = new THREE.Euler(
    THREE.MathUtils.degToRad(rotDeg[0]),
    THREE.MathUtils.degToRad(rotDeg[1]),
    THREE.MathUtils.degToRad(rotDeg[2]),
    'XYZ'
  );
  const t = new THREE.Matrix4().makeTranslation(
    (pos[0] + piv[0]) * scaleFactor,
    (pos[1] + piv[1]) * scaleFactor,
    (pos[2] + piv[2]) * scaleFactor
  );
  const r = new THREE.Matrix4().makeRotationFromEuler(eul);
  return t.multiply(r);
}

/** Roblox PoseEasingStyle Enum integer tokens */
const POSE_EASING_STYLE_TOKEN: Record<RobloxEasingStyle, number> = {
  Linear: 0,
  Constant: 1,
  Elastic: 2,
  Cubic: 3,
  Bounce: 4,
  Sine: 3, // Mapped to Cubic in native Pose (exact Sine preserved in Luau & GLB)
  Quad: 3,
  Back: 3,
};

/** Roblox PoseEasingDirection Enum integer tokens */
const POSE_EASING_DIRECTION_TOKEN: Record<RobloxEasingDirection, number> = {
  In: 0,
  Out: 1,
  InOut: 2,
};

function findActiveKeyframeForTime(
  keyframes: PartPoseKeyframe[],
  time: number
): PartPoseKeyframe | null {
  if (keyframes.length === 0) return null;
  const sorted = [...keyframes].sort((a, b) => a.time - b.time);
  const exact = sorted.find((k) => Math.abs(k.time - time) < 0.015);
  if (exact) return exact;
  let prev = sorted[0];
  for (const k of sorted) {
    if (k.time <= time) prev = k;
  }
  return prev;
}

function pushColorSequenceXml(lines: string[], indent: string, propName: string, startHex: string, endHex: string) {
  const [r0, g0, b0] = hexToRgb255(startHex);
  const [r1, g1, b1] = hexToRgb255(endHex);
  lines.push(
    `${indent}<ColorSequence name="${propName}">0 ${round6(r0 / 255)} ${round6(g0 / 255)} ${round6(b0 / 255)} 0 1 ${round6(r1 / 255)} ${round6(g1 / 255)} ${round6(b1 / 255)} 0 </ColorSequence>`
  );
}

function pushNumberSequenceXml(lines: string[], indent: string, propName: string, v0: number, v1: number) {
  lines.push(`${indent}<NumberSequence name="${propName}">0 ${round6(v0)} 0 1 ${round6(v1)} 0 </NumberSequence>`);
}

function pushColor3Xml(lines: string[], indent: string, propName: string, hex: string) {
  const [r, g, b] = hexToRgb255(hex);
  lines.push(`${indent}<Color3 name="${propName}">`);
  lines.push(`${indent}\t<R>${round6(r / 255)}</R>`);
  lines.push(`${indent}\t<G>${round6(g / 255)}</G>`);
  lines.push(`${indent}\t<B>${round6(b / 255)}</B>`);
  lines.push(`${indent}</Color3>`);
}

function wrapCdata(code: string): string {
  return `<![CDATA[${code.replace(/\]\]>/g, ']]]]><![CDATA[>')}]]>`;
}

function emitEffectItemXml(
  lines: string[],
  indent: string,
  fx: StudioEffectNode,
  fxRef: string,
  attRefMap: Map<string, string>,
  scale: number
) {
  if (fx.kind === 'ParticleEmitter') {
    lines.push(`${indent}<Item class="ParticleEmitter" referent="${fxRef}">`);
    lines.push(`${indent}\t<Properties>`);
    lines.push(`${indent}\t\t<string name="Name">${escapeXml(fx.name)}</string>`);
    lines.push(`${indent}\t\t<bool name="Enabled">${fx.enabled}</bool>`);
    pushColorSequenceXml(lines, `${indent}\t\t`, 'Color', fx.color, fx.endColor);
    pushNumberSequenceXml(lines, `${indent}\t\t`, 'Size', fx.sizeStart * scale, fx.sizeEnd * scale);
    pushNumberSequenceXml(lines, `${indent}\t\t`, 'Transparency', fx.transparencyStart, fx.transparencyEnd);
    lines.push(`${indent}\t\t<NumberRange name="Lifetime">${round6(fx.lifetime[0])} ${round6(fx.lifetime[1])} </NumberRange>`);
    lines.push(`${indent}\t\t<NumberRange name="Speed">${round6(fx.speed[0] * scale)} ${round6(fx.speed[1] * scale)} </NumberRange>`);
    lines.push(`${indent}\t\t<float name="Rate">${round6(fx.rate)}</float>`);
    lines.push(`${indent}\t\t<float name="LightEmission">${round6(fx.lightEmission)}</float>`);
    lines.push(`${indent}\t\t<Vector2 name="SpreadAngle"><X>${round6(fx.spreadAngle)}</X><Y>${round6(fx.spreadAngle)}</Y></Vector2>`);
    lines.push(`${indent}\t\t<Vector3 name="Acceleration"><X>${round6(fx.acceleration[0] * scale)}</X><Y>${round6(fx.acceleration[1] * scale)}</Y><Z>${round6(fx.acceleration[2] * scale)}</Z></Vector3>`);
    lines.push(`${indent}\t\t<Content name="Texture"><url>${escapeXml(fx.textureId)}</url></Content>`);
    lines.push(`${indent}\t</Properties>`);
    lines.push(`${indent}</Item>`);
  } else if (fx.kind === 'PointLight') {
    lines.push(`${indent}<Item class="PointLight" referent="${fxRef}">`);
    lines.push(`${indent}\t<Properties>`);
    lines.push(`${indent}\t\t<string name="Name">${escapeXml(fx.name)}</string>`);
    lines.push(`${indent}\t\t<bool name="Enabled">${fx.enabled}</bool>`);
    pushColor3Xml(lines, `${indent}\t\t`, 'Color', fx.color);
    lines.push(`${indent}\t\t<float name="Brightness">${round6(fx.brightness)}</float>`);
    lines.push(`${indent}\t\t<float name="Range">${round6(fx.range * scale)}</float>`);
    lines.push(`${indent}\t\t<bool name="Shadows">${fx.shadows}</bool>`);
    lines.push(`${indent}\t</Properties>`);
    lines.push(`${indent}</Item>`);
  } else if (fx.kind === 'Trail') {
    const ref0 = attRefMap.get(fx.attachment0Id) ?? 'null';
    const ref1 = attRefMap.get(fx.attachment1Id) ?? 'null';
    lines.push(`${indent}<Item class="Trail" referent="${fxRef}">`);
    lines.push(`${indent}\t<Properties>`);
    lines.push(`${indent}\t\t<string name="Name">${escapeXml(fx.name)}</string>`);
    lines.push(`${indent}\t\t<Ref name="Attachment0">${ref0}</Ref>`);
    lines.push(`${indent}\t\t<Ref name="Attachment1">${ref1}</Ref>`);
    lines.push(`${indent}\t\t<bool name="Enabled">${fx.enabled}</bool>`);
    pushColorSequenceXml(lines, `${indent}\t\t`, 'Color', fx.color, fx.endColor);
    pushNumberSequenceXml(lines, `${indent}\t\t`, 'Transparency', fx.transparencyStart, fx.transparencyEnd);
    pushNumberSequenceXml(lines, `${indent}\t\t`, 'WidthScale', fx.widthScaleStart, fx.widthScaleEnd);
    lines.push(`${indent}\t\t<float name="Lifetime">${round6(fx.lifetime)}</float>`);
    lines.push(`${indent}\t\t<float name="MinLength">${round6(fx.minLength * scale)}</float>`);
    lines.push(`${indent}\t\t<float name="LightEmission">${round6(fx.lightEmission)}</float>`);
    lines.push(`${indent}\t</Properties>`);
    lines.push(`${indent}</Item>`);
  }
}

/**
 * Generates a complete Roblox Studio XML Package (.rbxmx):
 * - Root Folder (`<ModelName>_Package`) containing rigged `Model` (Parts, Motor6Ds, Attachments,
 *   ParticleEmitters, Trails, PointLights, AnimationController, AnimSaves with KeyframeMarkers),
 * - `Audio` Folder (`Sound` instances),
 * - `Scripts` Folder (`StageConfig`, `FXController`, `SoundController`, `RigAnimator`, `ModelRuntime`).
 */
export function generateRbxmx(
  model: StudioSceneModel,
  options: RobloxExportOptions = { scaleMode: 'studs' }
): string {
  const scale = getScaleFactor(options.scaleMode);
  const activeParts = model.parts.filter((p) => options.includeHidden || p.visible);
  const activePartMap = new Map(activeParts.map((p) => [p.id, p]));
  const { nameMap: uniquePartNames } = resolveUniqueRobloxPartNames(activeParts);
  const worldMap = solveWorldTransforms(activeParts);
  const originOffset: [number, number, number] = options.centerAtOrigin
    ? computeModelOriginOffset(activeParts)
    : [0, 0, 0];

  const exportAsPackage = options.exportAsPackage ?? true;
  const includeAudioFolder = options.includeAudioFolder ?? true;
  const includeScriptsFolder = options.includeScriptsFolder ?? true;
  const baseIndent = exportAsPackage ? '\t\t' : '\t';

  const modelReferent = 'RBXMODEL0001';
  const refFor = (id: string) => `RBXPART_${id.replace(/[^a-zA-Z0-9_]/g, '')}`;
  const effectivePrimaryId =
    model.primaryPartId && activePartMap.has(model.primaryPartId)
      ? model.primaryPartId
      : activeParts[0]?.id ?? null;
  const primaryRef = effectivePrimaryId ? refFor(effectivePrimaryId) : 'null';

  const attRefMap = new Map<string, string>();
  let attCounter = 1;
  for (const part of activeParts) {
    for (const att of part.attachments ?? []) {
      attRefMap.set(att.id, `RBXATT_${attCounter++}_${att.id.replace(/[^a-zA-Z0-9_]/g, '')}`);
    }
  }

  const hasRigJoints = activeParts.some((p) => Boolean(p.parentId && activePartMap.has(p.parentId)));
  const animations = (model.animations ?? []).filter(
    (c) => c.tracks.length > 0 || (c.markers?.length ?? 0) > 0
  );
  const clipNameMap = resolveUniqueClipNames(animations);
  const { sounds } = collectModelEffectsAndSounds(activeParts);

  const safeModelName = model.name.trim() || 'Model';
  const lines: string[] = [
    '<roblox xmlns:xmime="http://www.w3.org/2005/05/xmlmime" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="http://www.roblox.com/roblox.xsd" version="4">',
    '\t<External>null</External>',
    '\t<External>nil</External>',
  ];

  if (exportAsPackage) {
    lines.push(`\t<Item class="Folder" referent="RBXPKG0001">`);
    lines.push('\t\t<Properties>');
    lines.push(`\t\t\t<string name="Name">${escapeXml(`${safeModelName}_Package`)}</string>`);
    lines.push('\t\t</Properties>');
  }

  lines.push(`${baseIndent}<Item class="Model" referent="${modelReferent}">`);
  lines.push(`${baseIndent}\t<Properties>`);
  lines.push(`${baseIndent}\t\t<string name="Name">${escapeXml(safeModelName)}</string>`);
  lines.push(`${baseIndent}\t\t<Ref name="PrimaryPart">${primaryRef}</Ref>`);
  lines.push(`${baseIndent}\t</Properties>`);

  const invCylOffset = new THREE.Matrix4().makeRotationZ(-Math.PI / 2);
  let fxCounter = 1;

  for (const part of activeParts) {
    const worldSolved = worldMap.get(part.id);
    const t = toRobloxPartTransform(part, scale, originOffset, worldSolved);
    const matSpec = ROBLOX_MATERIAL_SPECS[part.material] ?? ROBLOX_MATERIAL_SPECS.SmoothPlastic;
    const colorUint8 = hexToColor3uint8(part.color);
    const partRef = refFor(part.id);
    const uniquePartName = uniquePartNames.get(part.id) ?? 'Part';
    const isJointedChild = Boolean(part.parentId && activePartMap.has(part.parentId));
    const exportAnchored = hasRigJoints
      ? part.id === effectivePrimaryId
        ? true
        : isJointedChild
        ? false
        : part.anchored
      : part.anchored;

    const pIndent = `${baseIndent}\t`;
    lines.push(`${pIndent}<Item class="${t.rbxClass}" referent="${partRef}">`);
    lines.push(`${pIndent}\t<Properties>`);
    lines.push(`${pIndent}\t\t<string name="Name">${escapeXml(uniquePartName)}</string>`);
    lines.push(`${pIndent}\t\t<bool name="Anchored">${exportAnchored}</bool>`);
    lines.push(`${pIndent}\t\t<bool name="CanCollide">${part.canCollide}</bool>`);
    lines.push(`${pIndent}\t\t<bool name="CastShadow">${part.castShadow}</bool>`);
    lines.push(`${pIndent}\t\t<Color3uint8 name="Color3uint8">${colorUint8}</Color3uint8>`);
    pushCoordinateFrameXml(lines, `${pIndent}\t\t`, 'CFrame', t.position, t.rotationMatrix);
    lines.push(`${pIndent}\t\t<token name="Material">${matSpec.robloxEnumId}</token>`);
    lines.push(`${pIndent}\t\t<float name="Reflectance">${round6(part.reflectance)}</float>`);
    lines.push(`${pIndent}\t\t<float name="Transparency">${round6(part.transparency)}</float>`);
    lines.push(`${pIndent}\t\t<Vector3 name="size">`);
    lines.push(`${pIndent}\t\t\t<X>${t.size[0]}</X>`);
    lines.push(`${pIndent}\t\t\t<Y>${t.size[1]}</Y>`);
    lines.push(`${pIndent}\t\t\t<Z>${t.size[2]}</Z>`);
    lines.push(`${pIndent}\t\t</Vector3>`);
    if (t.rbxShapeToken !== null) {
      lines.push(`${pIndent}\t\t<token name="shape">${t.rbxShapeToken}</token>`);
    }
    lines.push(`${pIndent}\t</Properties>`);

    // Emit Motor6D joint connecting parent (Part0) -> this child part (Part1)
    if (part.parentId && activePartMap.has(part.parentId)) {
      const parentPart = activePartMap.get(part.parentId)!;
      const piv = part.pivotOffset ?? [0, 0, 0];

      const c0Mat = makePivotTransformMatrix(part.position, part.rotation, piv, scale);
      if (usesCylinderAxisSwap(parentPart.shape)) {
        c0Mat.premultiply(invCylOffset);
      }
      const c0 = matrix4ToPosAndRot(c0Mat, 1);

      const c1Mat = new THREE.Matrix4().makeTranslation(
        piv[0] * scale,
        piv[1] * scale,
        piv[2] * scale
      );
      if (usesCylinderAxisSwap(part.shape)) {
        c1Mat.premultiply(invCylOffset);
      }
      const c1 = matrix4ToPosAndRot(c1Mat, 1);

      const jointRef = `RBXJOINT_${part.id.replace(/[^a-zA-Z0-9_]/g, '')}`;
      lines.push(`${pIndent}\t<Item class="Motor6D" referent="${jointRef}">`);
      lines.push(`${pIndent}\t\t<Properties>`);
      lines.push(`${pIndent}\t\t\t<string name="Name">Joint_${escapeXml(uniquePartName)}</string>`);
      lines.push(`${pIndent}\t\t\t<Ref name="Part0">${refFor(parentPart.id)}</Ref>`);
      lines.push(`${pIndent}\t\t\t<Ref name="Part1">${partRef}</Ref>`);
      pushCoordinateFrameXml(lines, `${pIndent}\t\t\t`, 'C0', c0.pos, c0.rotMat);
      pushCoordinateFrameXml(lines, `${pIndent}\t\t\t`, 'C1', c1.pos, c1.rotMat);
      lines.push(`${pIndent}\t\t</Properties>`);
      lines.push(`${pIndent}\t</Item>`);
    }

    // Emit Attachments & attachment-bound FX (ParticleEmitter / PointLight)
    const partEffects = part.effects ?? [];
    for (const att of part.attachments ?? []) {
      const attRef = attRefMap.get(att.id)!;
      const attMat = makePivotTransformMatrix(att.position, att.rotation, [0, 0, 0], scale);
      if (usesCylinderAxisSwap(part.shape)) {
        attMat.premultiply(invCylOffset);
      }
      const attCf = matrix4ToPosAndRot(attMat, 1);

      lines.push(`${pIndent}\t<Item class="Attachment" referent="${attRef}">`);
      lines.push(`${pIndent}\t\t<Properties>`);
      lines.push(`${pIndent}\t\t\t<string name="Name">${escapeXml(att.name)}</string>`);
      pushCoordinateFrameXml(lines, `${pIndent}\t\t\t`, 'CFrame', attCf.pos, attCf.rotMat);
      lines.push(`${pIndent}\t\t</Properties>`);

      for (const fx of partEffects) {
        if (fx.kind !== 'Trail' && fx.attachmentId === att.id) {
          emitEffectItemXml(lines, `${pIndent}\t\t`, fx, `RBXFX_${fxCounter++}`, attRefMap, scale);
        }
      }
      lines.push(`${pIndent}\t</Item>`);
    }

    // Emit BasePart-level ParticleEmitters, PointLights (without attachmentId), and Trails
    for (const fx of partEffects) {
      if (fx.kind === 'Trail' || !fx.attachmentId || !attRefMap.has(fx.attachmentId)) {
        emitEffectItemXml(lines, `${pIndent}\t`, fx, `RBXFX_${fxCounter++}`, attRefMap, scale);
      }
    }

    lines.push(`${pIndent}</Item>`);
  }

  // Include AnimationController + Animator so Roblox Studio Animation Editor opens custom Motor6D rigs directly
  if ((hasRigJoints || animations.length > 0) && activeParts.length > 0) {
    lines.push(`${baseIndent}\t<Item class="AnimationController" referent="RBXANIMCTRL01">`);
    lines.push(`${baseIndent}\t\t<Properties>`);
    lines.push(`${baseIndent}\t\t\t<string name="Name">AnimationController</string>`);
    lines.push(`${baseIndent}\t\t</Properties>`);
    lines.push(`${baseIndent}\t\t<Item class="Animator" referent="RBXANIMATOR01">`);
    lines.push(`${baseIndent}\t\t\t<Properties>`);
    lines.push(`${baseIndent}\t\t\t\t<string name="Name">Animator</string>`);
    lines.push(`${baseIndent}\t\t\t</Properties>`);
    lines.push(`${baseIndent}\t\t</Item>`);
    lines.push(`${baseIndent}\t</Item>`);
  }

  // Emit AnimSaves Folder with KeyframeSequences, Priority, Pose Weights, and KeyframeMarkers
  if (animations.length > 0 && activeParts.length > 0) {
    lines.push(`${baseIndent}\t<Item class="Folder" referent="RBXANIMSAVES01">`);
    lines.push(`${baseIndent}\t\t<Properties>`);
    lines.push(`${baseIndent}\t\t\t<string name="Name">AnimSaves</string>`);
    lines.push(`${baseIndent}\t\t</Properties>`);

    const childrenByParent = new Map<string | null, StudioPartNode[]>();
    for (const p of activeParts) {
      const pid = p.parentId && activePartMap.has(p.parentId) ? p.parentId : null;
      const arr = childrenByParent.get(pid) ?? [];
      arr.push(p);
      childrenByParent.set(pid, arr);
    }

    animations.forEach((clip, clipIdx) => {
      const seqRef = `RBXKFSEQ_${clipIdx + 1}`;
      const uniqueClipName = clipNameMap.get(clip.id) ?? 'Animation';
      const priorityEnum = getClipPriority(clip);
      const priorityToken = ROBLOX_ANIMATION_PRIORITY_TOKENS[priorityEnum] ?? 4;

      lines.push(`${baseIndent}\t\t<Item class="KeyframeSequence" referent="${seqRef}">`);
      lines.push(`${baseIndent}\t\t\t<Properties>`);
      lines.push(`${baseIndent}\t\t\t\t<string name="Name">${escapeXml(uniqueClipName)}</string>`);
      lines.push(`${baseIndent}\t\t\t\t<bool name="Loop">${clip.loop}</bool>`);
      lines.push(`${baseIndent}\t\t\t\t<token name="Priority">${priorityToken}</token>`);
      lines.push(`${baseIndent}\t\t\t</Properties>`);

      const trackPartIds = new Set(clip.tracks.map((tr) => tr.partId));
      const hasAnimatedDescendant = (partId: string): boolean => {
        if (trackPartIds.has(partId)) return true;
        const kids = childrenByParent.get(partId) ?? [];
        return kids.some((k) => hasAnimatedDescendant(k.id));
      };

      const times = getSampledClipTimes(clip, options.resampleTransforms);
      const markers = clip.markers ?? [];
      const emittedMarkerIds = new Set<string>();

      let poseCounter = 1;
      let markerCounter = 1;
      const emitPoseTree = (part: StudioPartNode, time: number, indent: string) => {
        if (!hasAnimatedDescendant(part.id)) return;
        const track = clip.tracks.find((tr) => tr.partId === part.id);
        const kf = track ? findActiveKeyframeForTime(track.keyframes, time) : null;
        const poseAtT = evaluatePartPoseAtTime(part, { ...clip, defaultWeight: 1 }, time);
        const piv = part.pivotOffset ?? [0, 0, 0];

        const restMat = makePivotTransformMatrix(part.position, part.rotation, piv, scale);
        const poseMat = makePivotTransformMatrix(poseAtT.position, poseAtT.rotation, piv, scale);
        const deltaMat = restMat.clone().invert().multiply(poseMat);
        const delta = matrix4ToPosAndRot(deltaMat, 1);

        const easingStyleToken = POSE_EASING_STYLE_TOKEN[kf?.easingStyle ?? 'Linear'] ?? 0;
        const easingDirToken = POSE_EASING_DIRECTION_TOKEN[kf?.easingDirection ?? 'Out'] ?? 1;
        const poseWeight = track ? round6(kf?.weight ?? poseAtT.weight ?? 1) : 0;
        const poseRef = `RBXPOSE_${clipIdx + 1}_${poseCounter++}`;
        const uniquePartName = uniquePartNames.get(part.id) ?? 'Part';

        lines.push(`${indent}<Item class="Pose" referent="${poseRef}">`);
        lines.push(`${indent}\t<Properties>`);
        lines.push(`${indent}\t\t<string name="Name">${escapeXml(uniquePartName)}</string>`);
        pushCoordinateFrameXml(lines, `${indent}\t\t`, 'CFrame', delta.pos, delta.rotMat);
        lines.push(`${indent}\t\t<token name="EasingDirection">${easingDirToken}</token>`);
        lines.push(`${indent}\t\t<token name="EasingStyle">${easingStyleToken}</token>`);
        lines.push(`${indent}\t\t<float name="Weight">${poseWeight}</float>`);
        lines.push(`${indent}\t</Properties>`);

        const kids = childrenByParent.get(part.id) ?? [];
        for (const kid of kids) {
          emitPoseTree(kid, time, `${indent}\t`);
        }

        lines.push(`${indent}</Item>`);
      };

      times.forEach((time, kfIdx) => {
        const kfRef = `RBXKF_${clipIdx + 1}_${kfIdx + 1}`;
        lines.push(`${baseIndent}\t\t\t<Item class="Keyframe" referent="${kfRef}">`);
        lines.push(`${baseIndent}\t\t\t\t<Properties>`);
        lines.push(`${baseIndent}\t\t\t\t\t<string name="Name">Keyframe_${kfIdx + 1}</string>`);
        lines.push(`${baseIndent}\t\t\t\t\t<float name="Time">${round6(time)}</float>`);
        lines.push(`${baseIndent}\t\t\t\t</Properties>`);

        const roots = childrenByParent.get(null) ?? [];
        for (const root of roots) {
          emitPoseTree(root, time, `${baseIndent}\t\t\t\t`);
        }

        // Emit KeyframeMarker children matching this Keyframe timestamp for GetMarkerReachedSignal
        for (const m of markers) {
          if (!emittedMarkerIds.has(m.id) && Math.abs(m.time - time) <= 0.015) {
            emittedMarkerIds.add(m.id);
            const mkRef = `RBXMK_${clipIdx + 1}_${markerCounter++}`;
            lines.push(`${baseIndent}\t\t\t\t<Item class="KeyframeMarker" referent="${mkRef}">`);
            lines.push(`${baseIndent}\t\t\t\t\t<Properties>`);
            lines.push(`${baseIndent}\t\t\t\t\t\t<string name="Name">${escapeXml(m.name)}</string>`);
            lines.push(`${baseIndent}\t\t\t\t\t\t<string name="Value">${escapeXml(m.value ?? '')}</string>`);
            lines.push(`${baseIndent}\t\t\t\t\t</Properties>`);
            lines.push(`${baseIndent}\t\t\t\t</Item>`);
          }
        }

        lines.push(`${baseIndent}\t\t\t</Item>`);
      });

      lines.push(`${baseIndent}\t\t</Item>`);
    });

    lines.push(`${baseIndent}\t</Item>`);
  }

  lines.push(`${baseIndent}</Item>`);

  if (exportAsPackage) {
    // Package Audio Folder
    if (includeAudioFolder) {
      lines.push('\t\t<Item class="Folder" referent="RBXAUDIO0001">');
      lines.push('\t\t\t<Properties>');
      lines.push('\t\t\t\t<string name="Name">Audio</string>');
      lines.push('\t\t\t</Properties>');
      sounds.forEach((entry, sIdx) => {
        const s = entry.sound;
        lines.push(`\t\t\t<Item class="Sound" referent="RBXSND_${sIdx + 1}">`);
        lines.push('\t\t\t\t<Properties>');
        lines.push(`\t\t\t\t\t<string name="Name">${escapeXml(s.name)}</string>`);
        lines.push(`\t\t\t\t\t<Content name="SoundId"><url>${escapeXml(s.soundId)}</url></Content>`);
        lines.push(`\t\t\t\t\t<float name="Volume">${round6(s.volume)}</float>`);
        lines.push(`\t\t\t\t\t<float name="PlaybackSpeed">${round6(s.playbackSpeed)}</float>`);
        lines.push(`\t\t\t\t\t<bool name="Looped">${s.looped}</bool>`);
        lines.push(`\t\t\t\t\t<float name="RollOffMaxDistance">${round6(s.rollOffMaxDistance)}</float>`);
        lines.push('\t\t\t\t</Properties>');
        lines.push('\t\t\t</Item>');
      });
      lines.push('\t\t</Item>');
    }

    // Package Scripts Folder
    if (includeScriptsFolder) {
      const modules = generateAllFrameworkModules({
        model,
        activeParts,
        uniquePartNames,
        scale,
        resampleTransforms: options.resampleTransforms,
      });

      lines.push('\t\t<Item class="Folder" referent="RBXSCRIPTS0001">');
      lines.push('\t\t\t<Properties>');
      lines.push('\t\t\t\t<string name="Name">Scripts</string>');
      lines.push('\t\t\t</Properties>');

      const moduleNames: (keyof GeneratedFrameworkModules)[] = [
        'StageConfig',
        'FXController',
        'SoundController',
        'RigAnimator',
      ];
      moduleNames.forEach((modName, mIdx) => {
        lines.push(`\t\t\t<Item class="ModuleScript" referent="RBXMOD_${mIdx + 1}">`);
        lines.push('\t\t\t\t<Properties>');
        lines.push(`\t\t\t\t\t<string name="Name">${modName}</string>`);
        lines.push(`\t\t\t\t\t<ProtectedString name="Source">${wrapCdata(modules[modName])}</ProtectedString>`);
        lines.push('\t\t\t\t</Properties>');
        lines.push('\t\t\t</Item>');
      });

      lines.push('\t\t\t<Item class="Script" referent="RBXRUNSCRIPT01">');
      lines.push('\t\t\t\t<Properties>');
      lines.push('\t\t\t\t\t<string name="Name">ModelRuntime</string>');
      lines.push(`\t\t\t\t\t<ProtectedString name="Source">${wrapCdata(modules.ModelRuntime)}</ProtectedString>`);
      lines.push('\t\t\t\t</Properties>');
      lines.push('\t\t\t</Item>');

      // Also emit user WorkspaceModel scripts whose folder is Scripts or empty when packaged
      for (const sNode of (model.scripts ?? []).filter((n) => n.service === 'WorkspaceModel')) {
        emitScriptNodeXml(lines, '\t\t\t', sNode);
      }

      lines.push('\t\t</Item>');
    } else {
      for (const sNode of (model.scripts ?? []).filter((n) => n.service === 'WorkspaceModel')) {
        emitScriptNodeXml(lines, '\t\t', sNode);
      }
    }

    lines.push('\t</Item>');
  } else {
    for (const sNode of (model.scripts ?? []).filter((n) => n.service === 'WorkspaceModel')) {
      emitScriptNodeXml(lines, '\t', sNode);
    }
  }

  // Emit authored Roblox Service Containers (ReplicatedStorage, ServerScriptService, StarterPlayer)
  const serviceNodes = model.scripts ?? [];
  const emitServiceNodes = (svc: RobloxServiceLocation, containerClass: string, containerName: string, outerIndent: string) => {
    const nodes = serviceNodes.filter((n) => n.service === svc);
    if (nodes.length === 0) return;
    const refSvc = `RBXSVC_${svc.toUpperCase()}`;
    lines.push(`${outerIndent}<Item class="${containerClass}" referent="${refSvc}">`);
    lines.push(`${outerIndent}\t<Properties>`);
    lines.push(`${outerIndent}\t\t<string name="Name">${escapeXml(containerName)}</string>`);
    lines.push(`${outerIndent}\t</Properties>`);
    emitFolderGroupedScripts(lines, `${outerIndent}\t`, nodes);
    lines.push(`${outerIndent}</Item>`);
  };

  emitServiceNodes('ReplicatedStorage', 'ReplicatedStorage', 'ReplicatedStorage', '\t');
  emitServiceNodes('ServerScriptService', 'ServerScriptService', 'ServerScriptService', '\t');

  const playerNodes = serviceNodes.filter((n) => n.service === 'StarterPlayerScripts');
  const charNodes = serviceNodes.filter((n) => n.service === 'StarterCharacterScripts');
  if (playerNodes.length > 0 || charNodes.length > 0) {
    lines.push(`\t<Item class="StarterPlayer" referent="RBXSVC_STARTERPLAYER">`);
    lines.push(`\t\t<Properties>`);
    lines.push(`\t\t\t<string name="Name">StarterPlayer</string>`);
    lines.push(`\t\t</Properties>`);
    if (playerNodes.length > 0) {
      lines.push(`\t\t<Item class="StarterPlayerScripts" referent="RBXSVC_STARTERPLAYERSCRIPTS">`);
      lines.push(`\t\t\t<Properties>`);
      lines.push(`\t\t\t\t<string name="Name">StarterPlayerScripts</string>`);
      lines.push(`\t\t\t</Properties>`);
      emitFolderGroupedScripts(lines, '\t\t\t', playerNodes);
      lines.push(`\t\t</Item>`);
    }
    if (charNodes.length > 0) {
      lines.push(`\t\t<Item class="StarterCharacterScripts" referent="RBXSVC_STARTERCHARSCRIPTS">`);
      lines.push(`\t\t\t<Properties>`);
      lines.push(`\t\t\t\t<string name="Name">StarterCharacterScripts</string>`);
      lines.push(`\t\t\t</Properties>`);
      emitFolderGroupedScripts(lines, '\t\t\t', charNodes);
      lines.push(`\t\t</Item>`);
    }
    lines.push(`\t</Item>`);
  }

  lines.push('</roblox>');
  return lines.join('\n');
}

const RUN_CONTEXT_TOKEN: Record<RobloxScriptRunContext, number> = {
  Legacy: 0,
  Server: 1,
  Client: 2,
};

function emitScriptNodeXml(lines: string[], indent: string, node: StudioScriptNode) {
  const ref = `RBXSCR_${node.id.replace(/[^a-zA-Z0-9_]/g, '')}`;
  lines.push(`${indent}<Item class="${node.className}" referent="${ref}">`);
  lines.push(`${indent}\t<Properties>`);
  lines.push(`${indent}\t\t<string name="Name">${escapeXml(node.name)}</string>`);
  if (node.className === 'Script' || node.className === 'LocalScript') {
    lines.push(`${indent}\t\t<bool name="Disabled">${node.disabled}</bool>`);
    if (node.className === 'Script' && node.runContext) {
      lines.push(`${indent}\t\t<token name="RunContext">${RUN_CONTEXT_TOKEN[node.runContext] ?? 0}</token>`);
    }
    lines.push(`${indent}\t\t<ProtectedString name="Source">${wrapCdata(node.source)}</ProtectedString>`);
  } else if (node.className === 'ModuleScript') {
    lines.push(`${indent}\t\t<ProtectedString name="Source">${wrapCdata(node.source)}</ProtectedString>`);
  } else if (node.className === 'StringValue') {
    lines.push(`${indent}\t\t<string name="Value">${escapeXml(String(node.value ?? ''))}</string>`);
  } else if (node.className === 'NumberValue') {
    lines.push(`${indent}\t\t<double name="Value">${Number(node.value ?? 0) || 0}</double>`);
  } else if (node.className === 'BoolValue') {
    lines.push(`${indent}\t\t<bool name="Value">${Boolean(node.value)}</bool>`);
  }
  lines.push(`${indent}\t</Properties>`);
  lines.push(`${indent}</Item>`);
}

function emitFolderGroupedScripts(lines: string[], indent: string, nodes: StudioScriptNode[]) {
  const rootNodes: StudioScriptNode[] = [];
  const folders = new Map<string, StudioScriptNode[]>();
  for (const n of nodes) {
    const folder = n.parentFolder?.trim();
    if (!folder) {
      rootNodes.push(n);
    } else {
      const list = folders.get(folder) ?? [];
      list.push(n);
      folders.set(folder, list);
    }
  }
  for (const n of rootNodes) {
    emitScriptNodeXml(lines, indent, n);
  }
  let folderIdx = 1;
  for (const [folderName, list] of folders.entries()) {
    lines.push(`${indent}<Item class="Folder" referent="RBXFLD_${folderName.replace(/[^a-zA-Z0-9_]/g, '')}_${folderIdx++}">`);
    lines.push(`${indent}\t<Properties>`);
    lines.push(`${indent}\t\t<string name="Name">${escapeXml(folderName)}</string>`);
    lines.push(`${indent}\t</Properties>`);
    for (const n of list) {
      emitScriptNodeXml(lines, `${indent}\t`, n);
    }
    lines.push(`${indent}</Item>`);
  }
}

export function generateFrameworkScripts(
  model: StudioSceneModel,
  options: RobloxExportOptions = { scaleMode: 'studs' }
): GeneratedFrameworkModules {
  const scale = getScaleFactor(options.scaleMode);
  const activeParts = model.parts.filter((p) => options.includeHidden || p.visible);
  const { nameMap: uniquePartNames } = resolveUniqueRobloxPartNames(activeParts);
  return generateAllFrameworkModules({
    model,
    activeParts,
    uniquePartNames,
    scale,
    resampleTransforms: options.resampleTransforms,
  });
}

/**
 * Generates a ready-to-run Luau script for Roblox Studio Command Bar (creates Parts + Motor6D joints).
 */
export function generateLuauScript(
  model: StudioSceneModel,
  options: RobloxExportOptions = { scaleMode: 'studs' }
): string {
  const scale = getScaleFactor(options.scaleMode);
  const activeParts = model.parts.filter((p) => options.includeHidden || p.visible);
  const activePartMap = new Map(activeParts.map((p) => [p.id, p]));
  const { nameMap: uniquePartNames } = resolveUniqueRobloxPartNames(activeParts);
  const worldMap = solveWorldTransforms(activeParts);
  const originOffset: [number, number, number] = options.centerAtOrigin
    ? computeModelOriginOffset(activeParts)
    : [0, 0, 0];

  const effectivePrimaryId =
    model.primaryPartId && activePartMap.has(model.primaryPartId)
      ? model.primaryPartId
      : activeParts[0]?.id ?? null;
  const jointed = activeParts.filter((p) => p.parentId && activePartMap.has(p.parentId));
  const hasRigJoints = jointed.length > 0;
  const hasAnimations = (model.animations ?? []).some((c) => c.tracks.length > 0);

  const safeModelName = model.name.trim() || 'Model';
  const lines: string[] = [
    `-- Generated by StudForge 3D for Roblox Studio`,
    `-- Paste into Roblox Studio Command Bar (View -> Command Bar) and press Enter`,
    `local model = Instance.new("Model")`,
    `model.Name = ${JSON.stringify(safeModelName)}`,
    ``,
    `local parts = {}`,
  ];

  activeParts.forEach((part, idx) => {
    const t = toRobloxPartTransform(part, scale, originOffset, worldMap.get(part.id));
    const [r, g, b] = hexToRgb255(part.color);
    const varName = `p${idx + 1}`;
    const uniquePartName = uniquePartNames.get(part.id) ?? 'Part';
    const isJointedChild = Boolean(part.parentId && activePartMap.has(part.parentId));
    const exportAnchored = hasRigJoints
      ? part.id === effectivePrimaryId
        ? true
        : isJointedChild
        ? false
        : part.anchored
      : part.anchored;

    lines.push(`do`);
    lines.push(`\tlocal ${varName} = Instance.new("${t.rbxClass}")`);
    lines.push(`\t${varName}.Name = ${JSON.stringify(uniquePartName)}`);
    if (t.rbxClass === 'Part' && t.rbxShapeToken !== null) {
      const shapeEnum =
        t.rbxShapeToken === 0 ? 'Ball' : t.rbxShapeToken === 2 ? 'Cylinder' : 'Block';
      lines.push(`\t${varName}.Shape = Enum.PartType.${shapeEnum}`);
    }
    lines.push(`\t${varName}.Size = Vector3.new(${t.size[0]}, ${t.size[1]}, ${t.size[2]})`);
    lines.push(
      `\t${varName}.CFrame = CFrame.new(${t.position[0]}, ${t.position[1]}, ${t.position[2]}, ` +
        `${t.rotationMatrix[0]}, ${t.rotationMatrix[1]}, ${t.rotationMatrix[2]}, ` +
        `${t.rotationMatrix[3]}, ${t.rotationMatrix[4]}, ${t.rotationMatrix[5]}, ` +
        `${t.rotationMatrix[6]}, ${t.rotationMatrix[7]}, ${t.rotationMatrix[8]})`
    );
    lines.push(`\t${varName}.Color = Color3.fromRGB(${r}, ${g}, ${b})`);
    lines.push(`\t${varName}.Material = Enum.Material.${part.material}`);
    lines.push(`\t${varName}.Transparency = ${round6(part.transparency)}`);
    lines.push(`\t${varName}.Reflectance = ${round6(part.reflectance)}`);
    lines.push(`\t${varName}.Anchored = ${exportAnchored}`);
    lines.push(`\t${varName}.CanCollide = ${part.canCollide}`);
    lines.push(`\t${varName}.CastShadow = ${part.castShadow}`);
    lines.push(`\t${varName}.Parent = model`);
    lines.push(`\tparts[${JSON.stringify(part.id)}] = ${varName}`);
    lines.push(`end`);
  });

  // Create Motor6D joints in Luau
  const invCylOffset = new THREE.Matrix4().makeRotationZ(-Math.PI / 2);
  if (jointed.length > 0) {
    lines.push(``);
    lines.push(`-- Motor6D Rig Hierarchy`);
    for (const part of jointed) {
      const parentPart = activePartMap.get(part.parentId!)!;
      const piv = part.pivotOffset ?? [0, 0, 0];
      const c0Mat = makePivotTransformMatrix(part.position, part.rotation, piv, scale);
      if (usesCylinderAxisSwap(parentPart.shape)) c0Mat.premultiply(invCylOffset);
      const c0 = matrix4ToPosAndRot(c0Mat, 1);

      const c1Mat = new THREE.Matrix4().makeTranslation(
        piv[0] * scale,
        piv[1] * scale,
        piv[2] * scale
      );
      if (usesCylinderAxisSwap(part.shape)) c1Mat.premultiply(invCylOffset);
      const c1 = matrix4ToPosAndRot(c1Mat, 1);
      const uniquePartName = uniquePartNames.get(part.id) ?? 'Part';

      lines.push(`do`);
      lines.push(`\tlocal j = Instance.new("Motor6D")`);
      lines.push(`\tj.Name = ${JSON.stringify(`Joint_${uniquePartName}`)}`);
      lines.push(`\tj.Part0 = parts[${JSON.stringify(parentPart.id)}]`);
      lines.push(`\tj.Part1 = parts[${JSON.stringify(part.id)}]`);
      lines.push(
        `\tj.C0 = CFrame.new(${c0.pos[0]}, ${c0.pos[1]}, ${c0.pos[2]}, ` +
          `${c0.rotMat.join(', ')})`
      );
      lines.push(
        `\tj.C1 = CFrame.new(${c1.pos[0]}, ${c1.pos[1]}, ${c1.pos[2]}, ` +
          `${c1.rotMat.join(', ')})`
      );
      lines.push(`\tj.Parent = parts[${JSON.stringify(part.id)}]`);
      lines.push(`end`);
    }
  }

  if ((hasRigJoints || hasAnimations) && activeParts.length > 0) {
    lines.push(`local animController = Instance.new("AnimationController")`);
    lines.push(`animController.Name = "AnimationController"`);
    lines.push(`animController.Parent = model`);
    lines.push(`local animator = Instance.new("Animator")`);
    lines.push(`animator.Name = "Animator"`);
    lines.push(`animator.Parent = animController`);
  }

  if (effectivePrimaryId) {
    lines.push(`model.PrimaryPart = parts[${JSON.stringify(effectivePrimaryId)}]`);
  }
  lines.push(`model.Parent = workspace`);
  return lines.join('\n');
}

function collectAffectedPartIds(
  activeParts: StudioPartNode[],
  clips: AnimationClip[]
): Set<string> {
  const activeMap = new Map(activeParts.map((p) => [p.id, p]));
  const directTrackedIds = new Set(clips.flatMap((c) => c.tracks.map((t) => t.partId)));
  const animatedIds = new Set<string>();
  const isPartAffected = (partId: string): boolean => {
    let cur: string | null | undefined = partId;
    const seen = new Set<string>();
    while (cur && !seen.has(cur)) {
      if (directTrackedIds.has(cur)) return true;
      seen.add(cur);
      cur = activeMap.get(cur)?.parentId ?? null;
    }
    return false;
  };
  for (const p of activeParts) {
    if (isPartAffected(p.id)) animatedIds.add(p.id);
  }
  return animatedIds;
}

function appendClipKeyframesLuau(
  lines: string[],
  model: StudioSceneModel,
  clip: AnimationClip,
  activeParts: StudioPartNode[],
  animatedIds: Set<string>,
  scale: number,
  originOffset: [number, number, number],
  indentPrefix: string
) {
  const times = getUniqueKeyframeTimes(clip);
  if (times.length === 0 || times[0] > 0.001) times.unshift(0);
  if (times[times.length - 1] < clip.duration - 0.001) times.push(round6(clip.duration));

  for (let i = 0; i < times.length; i++) {
    const t = times[i];
    const dt = i === 0 ? 0 : round6(Math.max(0.01, t - times[i - 1]));
    const poses = evaluateClipAtTime(model, clip, t);
    const worldAtT = solveWorldTransforms(activeParts, poses);

    let segStyle: RobloxEasingStyle = 'Linear';
    let segDir: RobloxEasingDirection = 'Out';
    if (i > 0) {
      for (const tr of clip.tracks) {
        const k0 = findActiveKeyframeForTime(tr.keyframes, times[i - 1]);
        if (k0) {
          segStyle = k0.easingStyle;
          segDir = k0.easingDirection;
          break;
        }
      }
    }

    lines.push(`${indentPrefix}{`);
    lines.push(`${indentPrefix}\tduration = ${dt},`);
    lines.push(`${indentPrefix}\tisConstant = ${segStyle === 'Constant'},`);
    lines.push(
      `${indentPrefix}\teasingStyle = Enum.EasingStyle.${segStyle === 'Constant' ? 'Linear' : segStyle},`
    );
    lines.push(`${indentPrefix}\teasingDirection = Enum.EasingDirection.${segDir},`);
    lines.push(`${indentPrefix}\tposes = {`);

    for (const part of activeParts) {
      if (!animatedIds.has(part.id)) continue;
      const world = worldAtT.get(part.id);
      const rbx = toRobloxPartTransform(part, scale, originOffset, world);
      const pose = poses[part.id];
      const [r, g, b] = hexToRgb255(pose.color);
      lines.push(`${indentPrefix}\t\t[${JSON.stringify(part.id)}] = {`);
      lines.push(
        `${indentPrefix}\t\t\tCFrame = CFrame.new(${rbx.position[0]}, ${rbx.position[1]}, ${rbx.position[2]}, ` +
          `${rbx.rotationMatrix.join(', ')}),`
      );
      lines.push(`${indentPrefix}\t\t\tSize = Vector3.new(${rbx.size[0]}, ${rbx.size[1]}, ${rbx.size[2]}),`);
      lines.push(`${indentPrefix}\t\t\tColor = Color3.fromRGB(${r}, ${g}, ${b}),`);
      lines.push(`${indentPrefix}\t\t\tTransparency = ${round6(pose.transparency)},`);
      lines.push(`${indentPrefix}\t\t},`);
    }

    lines.push(`${indentPrefix}\t},`);
    lines.push(`${indentPrefix}},`);
  }
}

/**
 * Generates a Roblox Luau TweenService animation player script supporting
 * hierarchical CFrame transforms, Size, Color, Transparency, and Roblox EasingStyles.
 */
export function generateLuauAnimationScript(
  model: StudioSceneModel,
  clipId?: string | null,
  options: RobloxExportOptions = { scaleMode: 'studs' }
): string {
  const animations = model.animations ?? [];
  const clip: AnimationClip | undefined =
    (clipId ? animations.find((c) => c.id === clipId) : undefined) ?? animations[0];

  const safeModelName = model.name.trim() || 'Model';
  if (!clip || clip.tracks.length === 0) {
    return [
      `-- StudForge 3D Luau Animation Player`,
      `-- Add keyframes in the Animate tab to generate a TweenService timeline for "${safeModelName}".`,
      `local TweenService = game:GetService("TweenService")`,
      `local model = script.Parent:IsA("Model") and script.Parent or workspace:WaitForChild(${JSON.stringify(safeModelName)})`,
    ].join('\n');
  }

  const scale = getScaleFactor(options.scaleMode);
  const activeParts = model.parts.filter((p) => options.includeHidden || p.visible);
  const originOffset: [number, number, number] = options.centerAtOrigin
    ? computeModelOriginOffset(activeParts)
    : [0, 0, 0];

  const { nameMap: uniquePartNames } = resolveUniqueRobloxPartNames(activeParts);
  const animatedIds = collectAffectedPartIds(activeParts, [clip]);

  const lines: string[] = [
    `-- Generated by StudForge 3D — Roblox Studio TweenService Animation Player`,
    `-- Clip: "${clip.name}" | Duration: ${clip.duration.toFixed(2)}s | Loop: ${clip.loop}`,
    `-- Place this Script directly inside "${safeModelName}" (or in ServerScriptService pointing to workspace).`,
    `local TweenService = game:GetService("TweenService")`,
    `local model = script.Parent:IsA("Model") and script.Parent or workspace:WaitForChild(${JSON.stringify(safeModelName)})`,
    ``,
    `local partRefs = {}`,
  ];

  for (const part of activeParts) {
    if (!animatedIds.has(part.id)) continue;
    const uniqueName = uniquePartNames.get(part.id) ?? 'Part';
    lines.push(
      `partRefs[${JSON.stringify(part.id)}] = model:FindFirstChild(${JSON.stringify(uniqueName)}, true)`
    );
  }

  lines.push(``);
  lines.push(`local keyframes = {`);
  appendClipKeyframesLuau(lines, model, clip, activeParts, animatedIds, scale, originOffset, '\t');
  lines.push(`}`);
  lines.push(``);
  lines.push(`local function playOnce()`);
  lines.push(`\tfor _, kf in ipairs(keyframes) do`);
  lines.push(`\t\tif kf.duration <= 0 or kf.isConstant then`);
  lines.push(`\t\t\tif kf.duration > 0 then task.wait(kf.duration) end`);
  lines.push(`\t\t\tfor id, props in pairs(kf.poses) do`);
  lines.push(`\t\t\t\tlocal inst = partRefs[id]`);
  lines.push(`\t\t\t\tif inst and inst:IsA("BasePart") then`);
  lines.push(`\t\t\t\t\tinst.CFrame = props.CFrame`);
  lines.push(`\t\t\t\t\tinst.Size = props.Size`);
  lines.push(`\t\t\t\t\tinst.Color = props.Color`);
  lines.push(`\t\t\t\t\tinst.Transparency = props.Transparency`);
  lines.push(`\t\t\t\tend`);
  lines.push(`\t\t\tend`);
  lines.push(`\t\telse`);
  lines.push(
    `\t\t\tlocal info = TweenInfo.new(kf.duration, kf.easingStyle, kf.easingDirection)`
  );
  lines.push(`\t\t\tlocal activeTweens = {}`);
  lines.push(`\t\t\tfor id, props in pairs(kf.poses) do`);
  lines.push(`\t\t\t\tlocal inst = partRefs[id]`);
  lines.push(`\t\t\t\tif inst and inst:IsA("BasePart") then`);
  lines.push(`\t\t\t\t\tlocal tw = TweenService:Create(inst, info, props)`);
  lines.push(`\t\t\t\t\ttw:Play()`);
  lines.push(`\t\t\t\t\ttable.insert(activeTweens, tw)`);
  lines.push(`\t\t\t\tend`);
  lines.push(`\t\t\tend`);
  lines.push(`\t\t\tif #activeTweens > 0 then`);
  lines.push(`\t\t\t\tactiveTweens[1].Completed:Wait()`);
  lines.push(`\t\t\telse`);
  lines.push(`\t\t\t\ttask.wait(kf.duration)`);
  lines.push(`\t\t\tend`);
  lines.push(`\t\tend`);
  lines.push(`\tend`);
  lines.push(`end`);
  lines.push(``);

  if (clip.loop) {
    lines.push(`while model.Parent do`);
    lines.push(`\tplayOnce()`);
    lines.push(`end`);
  } else {
    lines.push(`playOnce()`);
  }

  return lines.join('\n');
}

/**
 * Generates a unified multi-stage Roblox Luau TweenService controller containing all animation
 * stages (e.g. Idle, Flying, Breathing, Attack) and a playStage(stageName) API.
 */
export function generateLuauMultiStageScript(
  model: StudioSceneModel,
  options: RobloxExportOptions = { scaleMode: 'studs' }
): string {
  const animations = (model.animations ?? []).filter((c) => c.tracks.length > 0);
  const safeModelName = model.name.trim() || 'Model';

  if (animations.length === 0) {
    return generateLuauAnimationScript(model, null, options);
  }
  if (animations.length === 1) {
    return generateLuauAnimationScript(model, animations[0].id, options);
  }

  const scale = getScaleFactor(options.scaleMode);
  const activeParts = model.parts.filter((p) => options.includeHidden || p.visible);
  const originOffset: [number, number, number] = options.centerAtOrigin
    ? computeModelOriginOffset(activeParts)
    : [0, 0, 0];

  const { nameMap: uniquePartNames } = resolveUniqueRobloxPartNames(activeParts);
  const animatedIds = collectAffectedPartIds(activeParts, animations);
  const stageNames = animations.map((c) => c.name || 'Stage');

  const lines: string[] = [
    `-- Generated by StudForge 3D — Roblox Studio Multi-Stage Animation Controller`,
    `-- Stages: ${stageNames.join(', ')}`,
    `-- Place this Script directly inside "${safeModelName}" and call playStage("Attack") etc.`,
    `local TweenService = game:GetService("TweenService")`,
    `local model = script.Parent:IsA("Model") and script.Parent or workspace:WaitForChild(${JSON.stringify(safeModelName)})`,
    ``,
    `local partRefs = {}`,
  ];

  for (const part of activeParts) {
    if (!animatedIds.has(part.id)) continue;
    const uniqueName = uniquePartNames.get(part.id) ?? 'Part';
    lines.push(
      `partRefs[${JSON.stringify(part.id)}] = model:FindFirstChild(${JSON.stringify(uniqueName)}, true)`
    );
  }

  lines.push(``);
  lines.push(`local stages = {`);
  for (const clip of animations) {
    const stageName = clip.name || 'Stage';
    lines.push(`\t[${JSON.stringify(stageName)}] = {`);
    lines.push(`\t\tloop = ${clip.loop},`);
    lines.push(`\t\tkeyframes = {`);
    appendClipKeyframesLuau(lines, model, clip, activeParts, animatedIds, scale, originOffset, '\t\t\t');
    lines.push(`\t\t},`);
    lines.push(`\t},`);
  }
  lines.push(`}`);
  lines.push(``);
  lines.push(`local stageToken = 0`);
  lines.push(`local runningTweens = {}`);
  lines.push(``);
  lines.push(`local function stopActiveTweens()`);
  lines.push(`\tfor _, tw in ipairs(runningTweens) do`);
  lines.push(`\t\ttw:Cancel()`);
  lines.push(`\tend`);
  lines.push(`\trunningTweens = {}`);
  lines.push(`end`);
  lines.push(``);
  lines.push(`local function playStage(stageName)`);
  lines.push(`\tlocal stage = stages[stageName]`);
  lines.push(`\tif not stage then`);
  lines.push(`\t\twarn("Unknown animation stage:", stageName)`);
  lines.push(`\t\treturn`);
  lines.push(`\tend`);
  lines.push(`\tstageToken += 1`);
  lines.push(`\tlocal myToken = stageToken`);
  lines.push(`\tstopActiveTweens()`);
  lines.push(``);
  lines.push(`\ttask.spawn(function()`);
  lines.push(`\t\trepeat`);
  lines.push(`\t\t\tfor _, kf in ipairs(stage.keyframes) do`);
  lines.push(`\t\t\t\tif myToken ~= stageToken or not model.Parent then return end`);
  lines.push(`\t\t\t\tif kf.duration <= 0 or kf.isConstant then`);
  lines.push(`\t\t\t\t\tif kf.duration > 0 then task.wait(kf.duration) end`);
  lines.push(`\t\t\t\t\tif myToken ~= stageToken then return end`);
  lines.push(`\t\t\t\t\tfor id, props in pairs(kf.poses) do`);
  lines.push(`\t\t\t\t\t\tlocal inst = partRefs[id]`);
  lines.push(`\t\t\t\t\t\tif inst and inst:IsA("BasePart") then`);
  lines.push(`\t\t\t\t\t\t\tinst.CFrame = props.CFrame`);
  lines.push(`\t\t\t\t\t\t\tinst.Size = props.Size`);
  lines.push(`\t\t\t\t\t\t\tinst.Color = props.Color`);
  lines.push(`\t\t\t\t\t\t\tinst.Transparency = props.Transparency`);
  lines.push(`\t\t\t\t\t\tend`);
  lines.push(`\t\t\t\t\tend`);
  lines.push(`\t\t\t\telse`);
  lines.push(`\t\t\t\t\tlocal info = TweenInfo.new(kf.duration, kf.easingStyle, kf.easingDirection)`);
  lines.push(`\t\t\t\t\trunningTweens = {}`);
  lines.push(`\t\t\t\t\tfor id, props in pairs(kf.poses) do`);
  lines.push(`\t\t\t\t\t\tlocal inst = partRefs[id]`);
  lines.push(`\t\t\t\t\t\tif inst and inst:IsA("BasePart") then`);
  lines.push(`\t\t\t\t\t\t\tlocal tw = TweenService:Create(inst, info, props)`);
  lines.push(`\t\t\t\t\t\t\ttw:Play()`);
  lines.push(`\t\t\t\t\t\t\ttable.insert(runningTweens, tw)`);
  lines.push(`\t\t\t\t\t\tend`);
  lines.push(`\t\t\t\t\tend`);
  lines.push(`\t\t\t\t\tif #runningTweens > 0 then`);
  lines.push(`\t\t\t\t\t\trunningTweens[1].Completed:Wait()`);
  lines.push(`\t\t\t\t\telse`);
  lines.push(`\t\t\t\t\t\ttask.wait(kf.duration)`);
  lines.push(`\t\t\t\t\tend`);
  lines.push(`\t\t\t\tend`);
  lines.push(`\t\t\tend`);
  lines.push(`\t\tuntil not stage.loop or myToken ~= stageToken or not model.Parent`);
  lines.push(`\tend)`);
  lines.push(`end`);
  lines.push(``);
  lines.push(`-- Start in default stage (switch dynamically via playStage("Flying"), playStage("Breathing"), playStage("Attack"))`);
  lines.push(`playStage(${JSON.stringify(stageNames[0])})`);

  return lines.join('\n');
}

/**
 * Exports all model parts as Wavefront OBJ + MTL with world transforms baked in,
 * ready for Roblox Studio MeshPart / 3D Importer.
 */
export function generateObjAndMtl(
  model: StudioSceneModel,
  options: RobloxExportOptions = { scaleMode: 'studs' },
  geometryCache?: Partial<Record<PartShape, THREE.BufferGeometry>>
): { obj: string; mtl: string } {
  const scale = getScaleFactor(options.scaleMode);
  const activeParts = model.parts.filter((p) => options.includeHidden || p.visible);
  const { nameMap: uniquePartNames } = resolveUniqueRobloxPartNames(activeParts);
  const worldMap = solveWorldTransforms(activeParts);
  const originOffset: [number, number, number] = options.centerAtOrigin
    ? computeModelOriginOffset(activeParts)
    : [0, 0, 0];

  const mtlName = `${sanitizeIdentifier(model.name).replace(/\s+/g, '_')}.mtl`;
  const objLines: string[] = [
    `# Exported by StudForge 3D for Roblox Studio`,
    `# Scale: ${options.scaleMode === 'meters' ? '0.28 m/stud (Roblox 1:1 meters)' : '1.0 unit/stud'}`,
    `mtllib ${mtlName}`,
  ];
  const mtlLines: string[] = [`# Material Library for ${sanitizeIdentifier(model.name)}`];
  const definedMaterials = new Map<string, string>();
  const usedObjNames = new Set<string>();

  let vertexOffset = 1;
  let uvOffset = 1;
  let normalOffset = 1;

  const mat4 = new THREE.Matrix4();
  const normalMat3 = new THREE.Matrix3();
  const posVec = new THREE.Vector3();
  const normVec = new THREE.Vector3();
  const q = new THREE.Quaternion();
  const tVec = new THREE.Vector3();
  const sVec = new THREE.Vector3();

  for (let pIdx = 0; pIdx < activeParts.length; pIdx++) {
    const part = activeParts[pIdx];
    const solved = worldMap.get(part.id);
    const geo = geometryCache?.[part.shape] ?? createNormalizedShapeGeometry(part.shape);
    const posAttr = geo.getAttribute('position');
    const normAttr = geo.getAttribute('normal');
    const uvAttr = geo.getAttribute('uv');
    const indexAttr = geo.getIndex();

    if (!posAttr) continue;

    if (solved) {
      q.set(
        solved.worldQuaternion[0],
        solved.worldQuaternion[1],
        solved.worldQuaternion[2],
        solved.worldQuaternion[3]
      );
      tVec.set(
        (solved.worldPosition[0] - originOffset[0]) * scale,
        (solved.worldPosition[1] - originOffset[1]) * scale,
        (solved.worldPosition[2] - originOffset[2]) * scale
      );
      sVec.set(solved.size[0] * scale, solved.size[1] * scale, solved.size[2] * scale);
    } else {
      const eul = new THREE.Euler(
        THREE.MathUtils.degToRad(part.rotation[0]),
        THREE.MathUtils.degToRad(part.rotation[1]),
        THREE.MathUtils.degToRad(part.rotation[2]),
        'XYZ'
      );
      q.setFromEuler(eul);
      tVec.set(
        (part.position[0] - originOffset[0]) * scale,
        (part.position[1] - originOffset[1]) * scale,
        (part.position[2] - originOffset[2]) * scale
      );
      sVec.set(part.size[0] * scale, part.size[1] * scale, part.size[2] * scale);
    }

    mat4.compose(tVec, q, sVec);
    normalMat3.getNormalMatrix(mat4);

    const matKey = `${part.material}_${part.color.replace('#', '')}_${Math.round(
      (1 - part.transparency) * 100
    )}`;
    if (!definedMaterials.has(matKey)) {
      definedMaterials.set(matKey, matKey);
      const [r, g, b] = hexToRgb255(part.color);
      const spec = ROBLOX_MATERIAL_SPECS[part.material] ?? ROBLOX_MATERIAL_SPECS.SmoothPlastic;
      const kdR = round6(r / 255);
      const kdG = round6(g / 255);
      const kdB = round6(b / 255);
      const ks = round6(0.1 + spec.metalness * 0.7);
      const ns = Math.round((1 - spec.roughness) * 120 + 10);
      const opacity = round6(Math.max(0.05, 1 - part.transparency));

      mtlLines.push(`newmtl ${matKey}`);
      mtlLines.push(`Kd ${kdR} ${kdG} ${kdB}`);
      mtlLines.push(`Ks ${ks} ${ks} ${ks}`);
      mtlLines.push(`Ns ${ns}`);
      mtlLines.push(`d ${opacity}`);
      if (spec.emissiveIntensity > 0) {
        mtlLines.push(`Ke ${kdR} ${kdG} ${kdB}`);
      }
      mtlLines.push('');
    }

    const baseObjName = sanitizeIdentifier(uniquePartNames.get(part.id) ?? part.name).replace(/\s+/g, '_');
    let uniqueObjName = baseObjName;
    let objSuffix = 2;
    while (usedObjNames.has(uniqueObjName.toLowerCase())) {
      uniqueObjName = `${baseObjName}_${objSuffix++}`;
    }
    usedObjNames.add(uniqueObjName.toLowerCase());
    objLines.push(`o ${uniqueObjName}`);
    objLines.push(`usemtl ${matKey}`);

    const vCount = posAttr.count;
    for (let i = 0; i < vCount; i++) {
      posVec.fromBufferAttribute(posAttr, i).applyMatrix4(mat4);
      objLines.push(`v ${round6(posVec.x)} ${round6(posVec.y)} ${round6(posVec.z)}`);
    }

    const hasUv = Boolean(uvAttr);
    if (hasUv && uvAttr) {
      for (let i = 0; i < uvAttr.count; i++) {
        objLines.push(`vt ${round6(uvAttr.getX(i))} ${round6(uvAttr.getY(i))}`);
      }
    }

    const hasNorm = Boolean(normAttr);
    if (hasNorm && normAttr) {
      for (let i = 0; i < normAttr.count; i++) {
        normVec.fromBufferAttribute(normAttr, i).applyMatrix3(normalMat3).normalize();
        objLines.push(`vn ${round6(normVec.x)} ${round6(normVec.y)} ${round6(normVec.z)}`);
      }
    }

    const triCount = indexAttr ? indexAttr.count : vCount;
    for (let i = 0; i < triCount; i += 3) {
      const a = indexAttr ? indexAttr.getX(i) : i;
      const b = indexAttr ? indexAttr.getX(i + 1) : i + 1;
      const c = indexAttr ? indexAttr.getX(i + 2) : i + 2;

      const fmt = (idx: number) => {
        const vi = vertexOffset + idx;
        if (hasUv && hasNorm) return `${vi}/${uvOffset + idx}/${normalOffset + idx}`;
        if (hasNorm) return `${vi}//${normalOffset + idx}`;
        if (hasUv) return `${vi}/${uvOffset + idx}`;
        return `${vi}`;
      };
      objLines.push(`f ${fmt(a)} ${fmt(b)} ${fmt(c)}`);
    }

    vertexOffset += vCount;
    if (hasUv && uvAttr) uvOffset += uvAttr.count;
    if (hasNorm && normAttr) normalOffset += normAttr.count;

    if (!geometryCache?.[part.shape]) {
      geo.dispose();
    }
  }

  return {
    obj: objLines.join('\n'),
    mtl: mtlLines.join('\n'),
  };
}

/**
 * Validates the scene model against Roblox Studio import constraints.
 */
export function validateModelForRoblox(model: StudioSceneModel): RobloxValidationReport {
  const activeParts = model.parts.filter((p) => p.visible);
  const activeIds = new Set(activeParts.map((p) => p.id));
  const worldMap = solveWorldTransforms(activeParts);

  let totalTriangles = 0;
  let nativeRbxPartCount = 0;
  let customMeshPartCount = 0;
  let jointCount = 0;

  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  const issues: RobloxValidationIssue[] = [];
  let tinyPartCount = 0;

  for (const p of activeParts) {
    totalTriangles += estimateShapeTriangles(p.shape);
    const catalogEntry = SHAPE_CATALOG.find((c) => c.shape === p.shape);
    if (catalogEntry?.isNativeRbxPart) {
      nativeRbxPartCount++;
    } else {
      customMeshPartCount++;
    }

    if (p.parentId && activeIds.has(p.parentId)) {
      jointCount++;
    }

    if (p.size[0] < 0.05 || p.size[1] < 0.05 || p.size[2] < 0.05) {
      tinyPartCount++;
    }

    const solved = worldMap.get(p.id);
    const pos = solved ? solved.worldPosition : p.position;
    const sz = solved ? solved.size : p.size;

    minX = Math.min(minX, pos[0] - sz[0] / 2);
    maxX = Math.max(maxX, pos[0] + sz[0] / 2);
    minY = Math.min(minY, pos[1] - sz[1] / 2);
    maxY = Math.max(maxY, pos[1] + sz[1] / 2);
    minZ = Math.min(minZ, pos[2] - sz[2] / 2);
    maxZ = Math.max(maxZ, pos[2] + sz[2] / 2);
  }

  const boundingSizeStuds: [number, number, number] =
    activeParts.length > 0
      ? [
          round6(maxX - minX),
          round6(maxY - minY),
          round6(maxZ - minZ),
        ]
      : [0, 0, 0];

  const r15HeightRatio = boundingSizeStuds[1] > 0 ? round6(boundingSizeStuds[1] / 5.5) : 0;
  const animationClipCount = (model.animations ?? []).filter(
    (c) => c.tracks.length > 0 || (c.markers?.length ?? 0) > 0
  ).length;
  const markerCount = (model.animations ?? []).reduce(
    (sum, clip) => sum + (clip.markers?.length ?? 0),
    0
  );
  const allAttachmentIds = new Set(
    activeParts.flatMap((p) => (p.attachments ?? []).map((a) => a.id))
  );
  const attachmentCount = allAttachmentIds.size;
  let effectCount = 0;
  let soundCount = 0;
  let brokenTrailCount = 0;
  for (const p of activeParts) {
    for (const fx of p.effects ?? []) {
      effectCount++;
      if (
        fx.kind === 'Trail' &&
        (!allAttachmentIds.has(fx.attachment0Id) ||
          !allAttachmentIds.has(fx.attachment1Id) ||
          fx.attachment0Id === fx.attachment1Id)
      ) {
        brokenTrailCount++;
      }
    }
    soundCount += p.sounds?.length ?? 0;
  }

  const hasAppearanceChannels = (model.animations ?? []).some((clip) =>
    clip.tracks.some((tr) =>
      tr.keyframes.some(
        (kf) => kf.size !== undefined || kf.color !== undefined || kf.transparency !== undefined
      )
    )
  );

  const { duplicateCount } = resolveUniqueRobloxPartNames(activeParts);

  if (activeParts.length === 0) {
    issues.push({
      severity: 'error',
      message: 'No visible parts to export. Add or unhide at least one part.',
    });
  }
  if (duplicateCount > 0) {
    issues.push({
      severity: 'warning',
      message: `${duplicateCount} duplicate part name(s) found — exports automatically assign unique names so Roblox Studio Animation Editor opens cleanly.`,
    });
  }
  if (brokenTrailCount > 0) {
    issues.push({
      severity: 'warning',
      message: `${brokenTrailCount} Trail effect(s) require two distinct valid Attachments to render in Roblox Studio.`,
    });
  }
  if (jointCount > 0) {
    issues.push({
      severity: 'info',
      message: `Rig configured for Roblox Animation Editor: PrimaryPart anchored, ${jointCount} Motor6D child part(s) unanchored, and AnimationController + Animator included.`,
    });
  }
  if (effectCount > 0 || soundCount > 0 || markerCount > 0) {
    issues.push({
      severity: 'info',
      message: `Package ready: ${attachmentCount} Attachment(s), ${effectCount} FX (ParticleEmitter/Trail/Light), ${soundCount} Sound(s), and ${markerCount} KeyframeMarker(s) wired to GetMarkerReachedSignal.`,
    });
  }
  if (totalTriangles > 10000) {
    issues.push({
      severity: 'warning',
      message: `Merged mesh exceeds Roblox single-MeshPart limit (${totalTriangles.toLocaleString()} / 10,000 tris). Use .rbxmx or .glb split import.`,
    });
  }
  if (customMeshPartCount > 0) {
    issues.push({
      severity: 'info',
      message: `${customMeshPartCount} sculpted MeshPart(s) included — export as .glb or .obj for exact beveled/curved geometry in Studio.`,
    });
  }
  if (animationClipCount > 0) {
    issues.push({
      severity: 'info',
      message: hasAppearanceChannels
        ? `${animationClipCount} animation clip(s) included — .rbxmx exports Motor6D KeyframeSequences, while the Luau Animation Script also tweens Size, Color & Transparency.`
        : `${animationClipCount} animation clip(s) ready for .rbxmx KeyframeSequence, Luau Motor6D.Transform, and animated .glb export.`,
    });
  }
  if (tinyPartCount > 0) {
    issues.push({
      severity: 'warning',
      message: `${tinyPartCount} part(s) have a dimension below Roblox's 0.05 stud minimum and will be clamped on export.`,
    });
  }
  if (issues.length === 0) {
    issues.push({
      severity: 'info',
      message: 'All parts are 100% native Roblox primitives within Studio limits.',
    });
  }

  return {
    partCount: model.parts.length,
    visiblePartCount: activeParts.length,
    totalTriangles,
    nativeRbxPartCount,
    customMeshPartCount,
    jointCount,
    animationClipCount,
    attachmentCount,
    effectCount,
    soundCount,
    markerCount,
    scriptCount: (model.scripts ?? []).length,
    boundingSizeStuds,
    r15HeightRatio,
    rbxmxReady: activeParts.length > 0,
    meshImportReady: activeParts.length > 0,
    issues,
  };
}
