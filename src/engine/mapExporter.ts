import * as THREE from 'three';
import { getSampledClipTimes, solveWorldTransforms } from './animationEngine';
import { getTerrainHalfSpan } from './mapPresets';
import { getMapServiceScriptNodes } from './mapScripts';
import {
  MapObjectNode,
  MapValidationIssue,
  MapValidationReport,
  StudioMapScene,
  TERRAIN_BIOME_SPECS,
  TerrainBiomeMaterial,
} from './mapTypes';
import { MODEL_PRESETS } from './presets';
import {
  escapeXml,
  generateRbxmx,
  hexToColor3uint8,
  hexToRgb255,
  resolveUniqueRobloxPartNames,
  sanitizeIdentifier,
  toRobloxPartTransform,
} from './robloxExporter';
import {
  ROBLOX_ANIMATION_PRIORITY_TOKENS,
  ROBLOX_MATERIAL_SPECS,
  StudioSceneModel,
  StudioScriptNode,
} from './robloxTypes';
import { SyncFileEntry } from './rojoPackager';

export interface RbxlxExportOptions {
  quantizeTerrainStep?: number;
  includeCustomModelScripts?: boolean;
}

const BRICK_COLOR_NUMBERS: Record<string, number> = {
  'Medium stone grey': 194,
  'Bright blue': 23,
  'Bright red': 21,
  'Bright green': 37,
  'Bright yellow': 24,
  'Bright orange': 106,
  'Royal purple': 1031,
  'Cyan': 1018,
  'Institutional white': 1001,
  'Really black': 1003,
};

function getBrickColorId(name: string): number {
  return BRICK_COLOR_NUMBERS[name] ?? 194;
}

function toBase64Utf8(str: string): string {
  if (typeof btoa === 'function') {
    const bytes = new TextEncoder().encode(str);
    let bin = '';
    for (let i = 0; i < bytes.length; i++) {
      bin += String.fromCharCode(bytes[i]);
    }
    return btoa(bin);
  }
  return Buffer.from(str, 'utf8').toString('base64');
}

function encodeRobloxTags(tags: string[]): string {
  if (tags.length === 0) return '';
  return toBase64Utf8(tags.join('\0'));
}

function round4(n: number): number {
  const r = Math.round(n * 1e4) / 1e4;
  return Object.is(r, -0) ? 0 : r;
}

function wrapCdata(code: string): string {
  return `<![CDATA[${code.replace(/\]\]>/g, ']]]]><![CDATA[>')}]]>`;
}

function pushColor3Xml(lines: string[], indent: string, propName: string, hex: string) {
  const [r, g, b] = hexToRgb255(hex);
  lines.push(`${indent}<Color3 name="${propName}">`);
  lines.push(`${indent}\t<R>${round4(r / 255)}</R>`);
  lines.push(`${indent}\t<G>${round4(g / 255)}</G>`);
  lines.push(`${indent}\t<B>${round4(b / 255)}</B>`);
  lines.push(`${indent}</Color3>`);
}

function pushCFrameFromPosRotDeg(
  lines: string[],
  indent: string,
  propName: string,
  pos: [number, number, number],
  rotDeg: [number, number, number]
) {
  const euler = new THREE.Euler(
    THREE.MathUtils.degToRad(rotDeg[0]),
    THREE.MathUtils.degToRad(rotDeg[1]),
    THREE.MathUtils.degToRad(rotDeg[2]),
    'XYZ'
  );
  const mat = new THREE.Matrix4().makeRotationFromEuler(euler);
  const e = mat.elements;
  lines.push(`${indent}<CoordinateFrame name="${propName}">`);
  lines.push(`${indent}\t<X>${round4(pos[0])}</X>`);
  lines.push(`${indent}\t<Y>${round4(pos[1])}</Y>`);
  lines.push(`${indent}\t<Z>${round4(pos[2])}</Z>`);
  lines.push(`${indent}\t<R00>${round4(e[0])}</R00>`);
  lines.push(`${indent}\t<R01>${round4(e[4])}</R01>`);
  lines.push(`${indent}\t<R02>${round4(e[8])}</R02>`);
  lines.push(`${indent}\t<R10>${round4(e[1])}</R10>`);
  lines.push(`${indent}\t<R11>${round4(e[5])}</R11>`);
  lines.push(`${indent}\t<R12>${round4(e[9])}</R12>`);
  lines.push(`${indent}\t<R20>${round4(e[2])}</R20>`);
  lines.push(`${indent}\t<R21>${round4(e[6])}</R21>`);
  lines.push(`${indent}\t<R22>${round4(e[10])}</R22>`);
  lines.push(`${indent}</CoordinateFrame>`);
}

function pushCFrameFromMatrix(
  lines: string[],
  indent: string,
  propName: string,
  pos: [number, number, number],
  r: number[]
) {
  lines.push(`${indent}<CoordinateFrame name="${propName}">`);
  lines.push(`${indent}\t<X>${round4(pos[0])}</X>`);
  lines.push(`${indent}\t<Y>${round4(pos[1])}</Y>`);
  lines.push(`${indent}\t<Z>${round4(pos[2])}</Z>`);
  lines.push(`${indent}\t<R00>${round4(r[0])}</R00>`);
  lines.push(`${indent}\t<R01>${round4(r[1])}</R01>`);
  lines.push(`${indent}\t<R02>${round4(r[2])}</R02>`);
  lines.push(`${indent}\t<R10>${round4(r[3])}</R10>`);
  lines.push(`${indent}\t<R11>${round4(r[4])}</R11>`);
  lines.push(`${indent}\t<R12>${round4(r[5])}</R12>`);
  lines.push(`${indent}\t<R20>${round4(r[6])}</R20>`);
  lines.push(`${indent}\t<R21>${round4(r[7])}</R21>`);
  lines.push(`${indent}\t<R22>${round4(r[8])}</R22>`);
  lines.push(`${indent}</CoordinateFrame>`);
}

export interface MergedTerrainBlock {
  x: number;
  y: number;
  z: number;
  sx: number;
  sy: number;
  sz: number;
  material: TerrainBiomeMaterial;
}

/**
 * Compresses the 2D heightfield grid into greedy-merged solid rectangular Roblox Parts
 * so the exported .rbxlx opens cleanly with immediate collisions and low part counts.
 */
export function buildMergedTerrainBlocks(
  map: StudioMapScene,
  quantizeStep = 0.5
): MergedTerrainBlock[] {
  const res = map.gridResolution;
  const cell = map.cellSizeStuds;
  const half = getTerrainHalfSpan(res, cell);
  const baseFloor = -18;

  const qHeights = new Array<number>(res * res);
  for (let i = 0; i < res * res; i++) {
    const h = map.heights[i] ?? 0;
    qHeights[i] = Math.round(h / quantizeStep) * quantizeStep;
  }

  const visited = new Uint8Array(res * res);
  const blocks: MergedTerrainBlock[] = [];

  for (let gz = 0; gz < res; gz++) {
    for (let gx = 0; gx < res; gx++) {
      const idx = gz * res + gx;
      if (visited[idx]) continue;

      const h = qHeights[idx];
      const mat = map.materials[idx] ?? 'Grass';

      let w = 1;
      while (
        gx + w < res &&
        !visited[gz * res + (gx + w)] &&
        qHeights[gz * res + (gx + w)] === h &&
        (map.materials[gz * res + (gx + w)] ?? 'Grass') === mat
      ) {
        w++;
      }

      let d = 1;
      outer: while (gz + d < res) {
        for (let ox = 0; ox < w; ox++) {
          const checkIdx = (gz + d) * res + (gx + ox);
          if (
            visited[checkIdx] ||
            qHeights[checkIdx] !== h ||
            (map.materials[checkIdx] ?? 'Grass') !== mat
          ) {
            break outer;
          }
        }
        d++;
      }

      for (let oz = 0; oz < d; oz++) {
        for (let ox = 0; ox < w; ox++) {
          visited[(gz + oz) * res + (gx + ox)] = 1;
        }
      }

      const sx = w * cell;
      const sz = d * cell;
      const sy = Math.max(1, h - baseFloor);
      const centerX = gx * cell - half + (sx - cell) * 0.5;
      const centerZ = gz * cell - half + (sz - cell) * 0.5;
      const centerY = baseFloor + sy * 0.5;

      blocks.push({
        x: round4(centerX),
        y: round4(centerY),
        z: round4(centerZ),
        sx: round4(sx),
        sy: round4(sy),
        sz: round4(sz),
        material: mat,
      });
    }
  }

  return blocks;
}

export function validateMapForRoblox(map: StudioMapScene): MapValidationReport {
  const issues: MapValidationIssue[] = [];
  const mergedTerrain = buildMergedTerrainBlocks(map);
  const activeObjects = map.objects.filter((o) => o.visible);

  const spawns = activeObjects.filter((o) => o.kind === 'SpawnLocation');
  const checkpoints = activeObjects.filter((o) => o.kind === 'Checkpoint');
  const teleporters = activeObjects.filter((o) => o.kind === 'Teleporter');
  const npcSpawners = activeObjects.filter((o) => o.kind === 'NPCSpawner');
  const stampedModels = activeObjects.filter((o) => o.kind === 'StampedModel');

  if (spawns.length === 0) {
    issues.push({
      severity: 'error',
      message: 'Map has no SpawnLocation. Add at least 1 Spawn Pad so players can spawn.',
    });
  }

  // Check Teleporter pairing
  const channelCounts = new Map<string, number>();
  for (const tp of teleporters) {
    const ch = (tp.teleporterChannel || 'Alpha').trim();
    channelCounts.set(ch, (channelCounts.get(ch) ?? 0) + 1);
  }
  for (const [ch, count] of channelCounts.entries()) {
    if (count < 2) {
      issues.push({
        severity: 'warning',
        message: `Teleporter channel "${ch}" has only ${count} pad. Place a second pad with channel "${ch}" to complete the warp link.`,
      });
    }
  }

  // Check Checkpoint stage numbering
  if (map.systems.obbySystem && checkpoints.length > 0) {
    const stages = new Set(checkpoints.map((c) => c.stageNumber ?? 1));
    if (stages.size < checkpoints.length) {
      issues.push({
        severity: 'warning',
        message: 'Duplicate Checkpoint Stage numbers detected. Ensure each checkpoint has a unique StageNumber.',
      });
    }
  }

  // Check NPC Spawners reference valid models
  for (const sp of npcSpawners) {
    const hasPreset = Boolean(
      sp.modelSnapshot || MODEL_PRESETS.some((p) => p.id === sp.modelPresetId)
    );
    if (!hasPreset) {
      issues.push({
        severity: 'warning',
        message: `NPC Spawner "${sp.name}" references an unknown model; a fallback boss rig will be used.`,
      });
    }
  }

  const stampedPartCount = stampedModels.reduce(
    (sum, o) => sum + (o.modelSnapshot?.parts.length ?? 6),
    0
  );
  const estimatedTotalParts =
    mergedTerrain.length + activeObjects.length * 2 + stampedPartCount + (map.water.enabled ? 1 : 0);

  const scripts = [...getMapServiceScriptNodes(map), ...(map.customScripts ?? [])];
  const enabledSystemsCount = Object.values(map.systems).filter(Boolean).length;

  if (issues.length === 0) {
    issues.push({
      severity: 'info',
      message: `Map validated cleanly: ${spawns.length} SpawnLocation(s), ${mergedTerrain.length} merged terrain blocks, ${scripts.length} Luau scripts ready for .rbxlx.`,
    });
  }

  return {
    terrainCells: map.gridResolution * map.gridResolution,
    terrainMergedParts: mergedTerrain.length,
    objectCount: activeObjects.length,
    stampedModelCount: stampedModels.length,
    spawnCount: spawns.length,
    checkpointCount: checkpoints.length,
    teleporterCount: teleporters.length,
    npcSpawnerCount: npcSpawners.length,
    enabledSystemsCount,
    scriptCount: scripts.length,
    estimatedTotalParts,
    rbxlxReady: spawns.length > 0,
    issues,
  };
}

export class RefGenerator {
  private counter = 1;
  next(prefix = 'RBX'): string {
    return `${prefix}_${this.counter++}`;
  }
}

function emitSimplePartXml(
  lines: string[],
  indent: string,
  refs: RefGenerator,
  opts: {
    className?: 'Part' | 'WedgePart' | 'SpawnLocation';
    name: string;
    pos: [number, number, number];
    rotDeg?: [number, number, number];
    size: [number, number, number];
    hexColor: string;
    materialEnumId: number;
    anchored?: boolean;
    canCollide?: boolean;
    transparency?: number;
    shapeToken?: number; // 0=Ball, 1=Block, 2=Cylinder
    tags?: string[];
    teamBrickColorId?: number;
    duration?: number;
    extraChildren?: (childIndent: string) => void;
  }
) {
  const cls = opts.className ?? 'Part';
  lines.push(`${indent}<Item class="${cls}" referent="${refs.next('PART')}">`);
  lines.push(`${indent}\t<Properties>`);
  lines.push(`${indent}\t\t<string name="Name">${escapeXml(opts.name)}</string>`);
  lines.push(`${indent}\t\t<bool name="Anchored">${opts.anchored ?? true}</bool>`);
  lines.push(`${indent}\t\t<bool name="CanCollide">${opts.canCollide ?? true}</bool>`);
  lines.push(`${indent}\t\t<bool name="CastShadow">true</bool>`);
  lines.push(`${indent}\t\t<Color3uint8 name="Color3uint8">${hexToColor3uint8(opts.hexColor)}</Color3uint8>`);
  pushCFrameFromPosRotDeg(lines, `${indent}\t\t`, 'CFrame', opts.pos, opts.rotDeg ?? [0, 0, 0]);
  lines.push(`${indent}\t\t<token name="Material">${opts.materialEnumId}</token>`);
  lines.push(`${indent}\t\t<float name="Transparency">${round4(opts.transparency ?? 0)}</float>`);
  lines.push(`${indent}\t\t<Vector3 name="size">`);
  lines.push(`${indent}\t\t\t<X>${round4(Math.max(0.05, opts.size[0]))}</X>`);
  lines.push(`${indent}\t\t\t<Y>${round4(Math.max(0.05, opts.size[1]))}</Y>`);
  lines.push(`${indent}\t\t\t<Z>${round4(Math.max(0.05, opts.size[2]))}</Z>`);
  lines.push(`${indent}\t\t</Vector3>`);
  if (cls !== 'WedgePart') {
    lines.push(`${indent}\t\t<token name="shape">${opts.shapeToken ?? 1}</token>`);
  }
  if (cls === 'SpawnLocation') {
    lines.push(`${indent}\t\t<bool name="Neutral">${opts.teamBrickColorId === undefined}</bool>`);
    if (opts.teamBrickColorId !== undefined) {
      lines.push(`${indent}\t\t<BrickColor name="TeamColor">${opts.teamBrickColorId}</BrickColor>`);
    }
    lines.push(`${indent}\t\t<int name="Duration">${opts.duration ?? 2}</int>`);
  }
  if (opts.tags && opts.tags.length > 0) {
    lines.push(`${indent}\t\t<BinaryString name="Tags">${encodeRobloxTags(opts.tags)}</BinaryString>`);
  }
  lines.push(`${indent}\t</Properties>`);
  if (opts.extraChildren) {
    opts.extraChildren(`${indent}\t`);
  }
  lines.push(`${indent}</Item>`);
}

function emitConfigFolderXml(
  lines: string[],
  indent: string,
  refs: RefGenerator,
  entries: { name: string; type: 'StringValue' | 'NumberValue' | 'BoolValue'; value: string | number | boolean }[]
) {
  if (entries.length === 0) return;
  lines.push(`${indent}<Item class="Folder" referent="${refs.next('CFG')}">`);
  lines.push(`${indent}\t<Properties>`);
  lines.push(`${indent}\t\t<string name="Name">Config</string>`);
  lines.push(`${indent}\t</Properties>`);
  for (const e of entries) {
    lines.push(`${indent}\t<Item class="${e.type}" referent="${refs.next('VAL')}">`);
    lines.push(`${indent}\t\t<Properties>`);
    lines.push(`${indent}\t\t\t<string name="Name">${escapeXml(e.name)}</string>`);
    if (e.type === 'StringValue') {
      lines.push(`${indent}\t\t\t<string name="Value">${escapeXml(String(e.value))}</string>`);
    } else if (e.type === 'NumberValue') {
      lines.push(`${indent}\t\t\t<double name="Value">${Number(e.value) || 0}</double>`);
    } else {
      lines.push(`${indent}\t\t\t<bool name="Value">${Boolean(e.value)}</bool>`);
    }
    lines.push(`${indent}\t\t</Properties>`);
    lines.push(`${indent}\t</Item>`);
  }
  lines.push(`${indent}</Item>`);
}

export function emitRiggedStudioModelXml(
  lines: string[],
  indent: string,
  refs: RefGenerator,
  model: StudioSceneModel,
  worldOffset: [number, number, number],
  rotYDeg = 0,
  modelScale = 1,
  overrideName?: string
) {
  const activeParts = model.parts.filter((p) => p.visible);
  if (activeParts.length === 0) return;
  const activeMap = new Map(activeParts.map((p) => [p.id, p]));
  const { nameMap: uniquePartNames } = resolveUniqueRobloxPartNames(activeParts);
  const worldMap = solveWorldTransforms(activeParts);

  const partRefs = new Map<string, string>();
  for (const p of activeParts) {
    partRefs.set(p.id, refs.next('MPART'));
  }

  const effectivePrimaryId =
    model.primaryPartId && activeMap.has(model.primaryPartId)
      ? model.primaryPartId
      : activeParts[0].id;
  const hasJoints = activeParts.some((p) => Boolean(p.parentId && activeMap.has(p.parentId)));

  const rootRot = new THREE.Matrix4().makeRotationY(THREE.MathUtils.degToRad(rotYDeg));
  const rootPosVec = new THREE.Vector3();

  lines.push(`${indent}<Item class="Model" referent="${refs.next('MODEL')}">`);
  lines.push(`${indent}\t<Properties>`);
  lines.push(`${indent}\t\t<string name="Name">${escapeXml(overrideName || model.name)}</string>`);
  lines.push(`${indent}\t\t<Ref name="PrimaryPart">${partRefs.get(effectivePrimaryId) ?? 'null'}</Ref>`);
  lines.push(`${indent}\t</Properties>`);

  for (const p of activeParts) {
    const solved = worldMap.get(p.id);
    const t = toRobloxPartTransform(p, modelScale, [0, 0, 0], solved);
    rootPosVec.set(t.position[0], t.position[1], t.position[2]).applyMatrix4(rootRot);
    const finalPos: [number, number, number] = [
      round4(rootPosVec.x + worldOffset[0]),
      round4(rootPosVec.y + worldOffset[1]),
      round4(rootPosVec.z + worldOffset[2]),
    ];

    const partRotMat = new THREE.Matrix4().set(
      t.rotationMatrix[0], t.rotationMatrix[1], t.rotationMatrix[2], 0,
      t.rotationMatrix[3], t.rotationMatrix[4], t.rotationMatrix[5], 0,
      t.rotationMatrix[6], t.rotationMatrix[7], t.rotationMatrix[8], 0,
      0, 0, 0, 1
    );
    partRotMat.premultiply(rootRot);
    const me = partRotMat.elements;
    const finalRotMat = [me[0], me[4], me[8], me[1], me[5], me[9], me[2], me[6], me[10]];

    const matSpec = ROBLOX_MATERIAL_SPECS[p.material] ?? ROBLOX_MATERIAL_SPECS.SmoothPlastic;
    const isJointedChild = Boolean(p.parentId && activeMap.has(p.parentId));
    const anchored = hasJoints ? (p.id === effectivePrimaryId ? true : !isJointedChild && p.anchored) : true;

    lines.push(`${indent}\t<Item class="${t.rbxClass}" referent="${partRefs.get(p.id)}">`);
    lines.push(`${indent}\t\t<Properties>`);
    lines.push(`${indent}\t\t\t<string name="Name">${escapeXml(uniquePartNames.get(p.id) ?? 'Part')}</string>`);
    lines.push(`${indent}\t\t\t<bool name="Anchored">${anchored}</bool>`);
    lines.push(`${indent}\t\t\t<bool name="CanCollide">${p.canCollide}</bool>`);
    lines.push(`${indent}\t\t\t<bool name="CastShadow">${p.castShadow}</bool>`);
    lines.push(`${indent}\t\t\t<Color3uint8 name="Color3uint8">${hexToColor3uint8(p.color)}</Color3uint8>`);
    pushCFrameFromMatrix(lines, `${indent}\t\t\t`, 'CFrame', finalPos, finalRotMat);
    lines.push(`${indent}\t\t\t<token name="Material">${matSpec.robloxEnumId}</token>`);
    lines.push(`${indent}\t\t\t<float name="Reflectance">${round4(p.reflectance)}</float>`);
    lines.push(`${indent}\t\t\t<float name="Transparency">${round4(p.transparency)}</float>`);
    lines.push(`${indent}\t\t\t<Vector3 name="size">`);
    lines.push(`${indent}\t\t\t\t<X>${round4(t.size[0])}</X>`);
    lines.push(`${indent}\t\t\t\t<Y>${round4(t.size[1])}</Y>`);
    lines.push(`${indent}\t\t\t\t<Z>${round4(t.size[2])}</Z>`);
    lines.push(`${indent}\t\t\t</Vector3>`);
    if (t.rbxShapeToken !== null) {
      lines.push(`${indent}\t\t\t<token name="shape">${t.rbxShapeToken}</token>`);
    }
    lines.push(`${indent}\t\t</Properties>`);

    if (p.parentId && activeMap.has(p.parentId)) {
      const piv = p.pivotOffset ?? [0, 0, 0];
      const eul = new THREE.Euler(
        THREE.MathUtils.degToRad(p.rotation[0]),
        THREE.MathUtils.degToRad(p.rotation[1]),
        THREE.MathUtils.degToRad(p.rotation[2]),
        'XYZ'
      );
      const c0Mat = new THREE.Matrix4()
        .makeTranslation((p.position[0] + piv[0]) * modelScale, (p.position[1] + piv[1]) * modelScale, (p.position[2] + piv[2]) * modelScale)
        .multiply(new THREE.Matrix4().makeRotationFromEuler(eul));
      const c0e = c0Mat.elements;
      lines.push(`${indent}\t\t<Item class="Motor6D" referent="${refs.next('M6D')}">`);
      lines.push(`${indent}\t\t\t<Properties>`);
      lines.push(`${indent}\t\t\t\t<string name="Name">Joint_${escapeXml(uniquePartNames.get(p.id) ?? 'Part')}</string>`);
      lines.push(`${indent}\t\t\t\t<Ref name="Part0">${partRefs.get(p.parentId)}</Ref>`);
      lines.push(`${indent}\t\t\t\t<Ref name="Part1">${partRefs.get(p.id)}</Ref>`);
      pushCFrameFromMatrix(
        lines,
        `${indent}\t\t\t\t`,
        'C0',
        [c0e[12], c0e[13], c0e[14]],
        [c0e[0], c0e[4], c0e[8], c0e[1], c0e[5], c0e[9], c0e[2], c0e[6], c0e[10]]
      );
      pushCFrameFromPosRotDeg(
        lines,
        `${indent}\t\t\t\t`,
        'C1',
        [piv[0] * modelScale, piv[1] * modelScale, piv[2] * modelScale],
        [0, 0, 0]
      );
      lines.push(`${indent}\t\t\t</Properties>`);
      lines.push(`${indent}\t\t</Item>`);
    }

    lines.push(`${indent}\t</Item>`);
  }

  // AnimationController + Animator
  if (hasJoints || (model.animations?.length ?? 0) > 0) {
    lines.push(`${indent}\t<Item class="AnimationController" referent="${refs.next('ANIMC')}">`);
    lines.push(`${indent}\t\t<Properties><string name="Name">AnimationController</string></Properties>`);
    lines.push(`${indent}\t\t<Item class="Animator" referent="${refs.next('ANMR')}">`);
    lines.push(`${indent}\t\t\t<Properties><string name="Name">Animator</string></Properties>`);
    lines.push(`${indent}\t\t</Item>`);
    lines.push(`${indent}\t</Item>`);

    const clips = (model.animations ?? []).filter((c) => c.tracks.length > 0);
    if (clips.length > 0) {
      lines.push(`${indent}\t<Item class="Folder" referent="${refs.next('ASAVES')}">`);
      lines.push(`${indent}\t\t<Properties><string name="Name">AnimSaves</string></Properties>`);
      for (const clip of clips) {
        const prio = ROBLOX_ANIMATION_PRIORITY_TOKENS[clip.priority ?? 'Action'] ?? 4;
        lines.push(`${indent}\t\t<Item class="KeyframeSequence" referent="${refs.next('KFS')}">`);
        lines.push(`${indent}\t\t\t<Properties>`);
        lines.push(`${indent}\t\t\t\t<string name="Name">${escapeXml(clip.name)}</string>`);
        lines.push(`${indent}\t\t\t\t<bool name="Loop">${clip.loop}</bool>`);
        lines.push(`${indent}\t\t\t\t<token name="Priority">${prio}</token>`);
        lines.push(`${indent}\t\t\t</Properties>`);
        const times = getSampledClipTimes(clip, false);
        for (let i = 0; i < times.length; i++) {
          lines.push(`${indent}\t\t\t<Item class="Keyframe" referent="${refs.next('KF')}">`);
          lines.push(`${indent}\t\t\t\t<Properties>`);
          lines.push(`${indent}\t\t\t\t\t<string name="Name">Keyframe_${i + 1}</string>`);
          lines.push(`${indent}\t\t\t\t\t<float name="Time">${round4(times[i])}</float>`);
          lines.push(`${indent}\t\t\t\t</Properties>`);
          lines.push(`${indent}\t\t\t</Item>`);
        }
        lines.push(`${indent}\t\t</Item>`);
      }
      lines.push(`${indent}\t</Item>`);
    }
  }

  lines.push(`${indent}</Item>`);
}

function emitMapObjectXml(
  lines: string[],
  indent: string,
  refs: RefGenerator,
  obj: MapObjectNode,
  map: StudioMapScene
) {
  const pos = obj.position;
  const rot = obj.rotation;
  const scl = obj.scale;

  if (obj.kind === 'SpawnLocation') {
    const team = map.teams.find((t) => t.name === obj.teamName);
    emitSimplePartXml(lines, indent, refs, {
      className: 'SpawnLocation',
      name: obj.name,
      pos,
      rotDeg: rot,
      size: scl,
      hexColor: team?.hexColor ?? obj.color,
      materialEnumId: 272,
      teamBrickColorId: team ? getBrickColorId(team.brickColorName) : undefined,
      tags: ['MapSpawn'],
    });
  } else if (obj.kind === 'Checkpoint') {
    emitSimplePartXml(lines, indent, refs, {
      name: obj.name,
      pos,
      rotDeg: rot,
      size: scl,
      hexColor: obj.color,
      materialEnumId: 288, // Neon
      tags: ['Checkpoint'],
      extraChildren: (ci) => {
        emitConfigFolderXml(lines, ci, refs, [
          { name: 'StageNumber', type: 'NumberValue', value: obj.stageNumber ?? 1 },
        ]);
        lines.push(`${ci}<Item class="ParticleEmitter" referent="${refs.next('PE')}">`);
        lines.push(`${ci}\t<Properties>`);
        lines.push(`${ci}\t\t<string name="Name">CheckpointBurst</string>`);
        lines.push(`${ci}\t\t<bool name="Enabled">false</bool>`);
        lines.push(`${ci}\t\t<float name="Rate">24</float>`);
        lines.push(`${ci}\t</Properties>`);
        lines.push(`${ci}</Item>`);
      },
    });
  } else if (obj.kind === 'KillBrick') {
    emitSimplePartXml(lines, indent, refs, {
      name: obj.name,
      pos,
      rotDeg: rot,
      size: scl,
      hexColor: obj.color,
      materialEnumId: 288,
      tags: ['KillBrick'],
    });
  } else if (obj.kind === 'JumpPad') {
    emitSimplePartXml(lines, indent, refs, {
      name: obj.name,
      pos,
      rotDeg: rot,
      size: scl,
      hexColor: obj.color,
      materialEnumId: 288,
      tags: ['JumpPad'],
      extraChildren: (ci) => {
        emitConfigFolderXml(lines, ci, refs, [
          { name: 'JumpPower', type: 'NumberValue', value: obj.jumpPower ?? 95 },
        ]);
        lines.push(`${ci}<Item class="ParticleEmitter" referent="${refs.next('PE')}">`);
        lines.push(`${ci}\t<Properties>`);
        lines.push(`${ci}\t\t<string name="Name">JumpBurst</string>`);
        lines.push(`${ci}\t\t<bool name="Enabled">false</bool>`);
        lines.push(`${ci}\t</Properties>`);
        lines.push(`${ci}</Item>`);
      },
    });
  } else if (obj.kind === 'SpeedPad') {
    emitSimplePartXml(lines, indent, refs, {
      name: obj.name,
      pos,
      rotDeg: rot,
      size: scl,
      hexColor: obj.color,
      materialEnumId: 288,
      tags: ['SpeedPad'],
      extraChildren: (ci) => {
        emitConfigFolderXml(lines, ci, refs, [
          { name: 'SpeedBoost', type: 'NumberValue', value: obj.speedBoost ?? 36 },
          { name: 'BoostDuration', type: 'NumberValue', value: obj.boostDuration ?? 4 },
        ]);
      },
    });
  } else if (obj.kind === 'InteractiveDoor') {
    lines.push(`${indent}<Item class="Model" referent="${refs.next('DOOR')}">`);
    lines.push(`${indent}\t<Properties>`);
    lines.push(`${indent}\t\t<string name="Name">${escapeXml(obj.name)}</string>`);
    lines.push(`${indent}\t\t<BinaryString name="Tags">${encodeRobloxTags(['InteractiveDoor'])}</BinaryString>`);
    lines.push(`${indent}\t</Properties>`);
    emitConfigFolderXml(lines, `${indent}\t`, refs, [
      { name: 'DoorMode', type: 'StringValue', value: obj.doorMode ?? 'hinge' },
      { name: 'DoorLockedCost', type: 'NumberValue', value: obj.doorLockedCost ?? 0 },
    ]);
    emitSimplePartXml(lines, `${indent}\t`, refs, {
      name: 'DoorLeaf',
      pos: [pos[0], pos[1] + scl[1] * 0.5, pos[2]],
      rotDeg: rot,
      size: scl,
      hexColor: obj.color,
      materialEnumId: 1088, // Metal
      extraChildren: (ci) => {
        lines.push(`${ci}<Item class="ProximityPrompt" referent="${refs.next('PP')}">`);
        lines.push(`${ci}\t<Properties>`);
        lines.push(`${ci}\t\t<string name="Name">DoorPrompt</string>`);
        lines.push(`${ci}\t\t<string name="ActionText">${escapeXml(obj.promptText || 'Open Gate')}</string>`);
        lines.push(`${ci}\t\t<string name="ObjectText">${escapeXml(obj.name)}</string>`);
        lines.push(`${ci}\t\t<float name="MaxActivationDistance">12</float>`);
        lines.push(`${ci}\t</Properties>`);
        lines.push(`${ci}</Item>`);
      },
    });
    lines.push(`${indent}</Item>`);
  } else if (obj.kind === 'Teleporter') {
    emitSimplePartXml(lines, indent, refs, {
      name: obj.name,
      pos,
      rotDeg: rot,
      size: scl,
      hexColor: obj.color,
      materialEnumId: 288,
      tags: ['TeleporterPad'],
      extraChildren: (ci) => {
        emitConfigFolderXml(lines, ci, refs, [
          { name: 'TeleporterChannel', type: 'StringValue', value: obj.teleporterChannel || 'Alpha' },
        ]);
        lines.push(`${ci}<Item class="ParticleEmitter" referent="${refs.next('PE')}">`);
        lines.push(`${ci}\t<Properties>`);
        lines.push(`${ci}\t\t<string name="Name">WarpBurst</string>`);
        lines.push(`${ci}\t\t<bool name="Enabled">false</bool>`);
        lines.push(`${ci}\t</Properties>`);
        lines.push(`${ci}</Item>`);
      },
    });
  } else if (obj.kind === 'CoinPickup') {
    emitSimplePartXml(lines, indent, refs, {
      name: obj.name,
      pos,
      rotDeg: rot,
      size: [scl[0], scl[1], scl[2]],
      hexColor: obj.color,
      materialEnumId: 288,
      canCollide: false,
      shapeToken: 2,
      tags: ['CoinPickup'],
      extraChildren: (ci) => {
        emitConfigFolderXml(lines, ci, refs, [
          { name: 'CoinValue', type: 'NumberValue', value: obj.coinValue ?? 10 },
          { name: 'RespawnSeconds', type: 'NumberValue', value: obj.respawnSeconds ?? 12 },
        ]);
        lines.push(`${ci}<Item class="PointLight" referent="${refs.next('PL')}">`);
        lines.push(`${ci}\t<Properties>`);
        lines.push(`${ci}\t\t<string name="Name">CoinGlow</string>`);
        pushColor3Xml(lines, `${ci}\t\t`, 'Color', obj.color);
        lines.push(`${ci}\t\t<float name="Brightness">1.4</float>`);
        lines.push(`${ci}\t\t<float name="Range">10</float>`);
        lines.push(`${ci}\t</Properties>`);
        lines.push(`${ci}</Item>`);
      },
    });
  } else if (obj.kind === 'ShopPad') {
    lines.push(`${indent}<Item class="Model" referent="${refs.next('SHOP')}">`);
    lines.push(`${indent}\t<Properties>`);
    lines.push(`${indent}\t\t<string name="Name">${escapeXml(obj.name)}</string>`);
    lines.push(`${indent}\t\t<BinaryString name="Tags">${encodeRobloxTags(['ShopPad'])}</BinaryString>`);
    lines.push(`${indent}\t</Properties>`);
    emitSimplePartXml(lines, `${indent}\t`, refs, {
      name: 'ShopCounter',
      pos: [pos[0], pos[1] + 1.5, pos[2]],
      rotDeg: rot,
      size: [scl[0], 3, scl[2]],
      hexColor: obj.color,
      materialEnumId: 272,
      extraChildren: (ci) => {
        lines.push(`${ci}<Item class="ProximityPrompt" referent="${refs.next('PP')}">`);
        lines.push(`${ci}\t<Properties>`);
        lines.push(`${ci}\t\t<string name="Name">OpenShopPrompt</string>`);
        lines.push(`${ci}\t\t<string name="ActionText">Open Shop</string>`);
        lines.push(`${ci}\t\t<string name="ObjectText">${escapeXml(obj.name)}</string>`);
        lines.push(`${ci}\t\t<float name="MaxActivationDistance">12</float>`);
        lines.push(`${ci}\t</Properties>`);
        lines.push(`${ci}</Item>`);
      },
    });
    lines.push(`${indent}</Item>`);
  } else if (obj.kind === 'NPCSpawner') {
    emitSimplePartXml(lines, indent, refs, {
      name: obj.name,
      pos,
      rotDeg: rot,
      size: scl,
      hexColor: obj.color,
      materialEnumId: 1088,
      tags: ['NPCSpawner'],
      extraChildren: (ci) => {
        emitConfigFolderXml(lines, ci, refs, [
          { name: 'NPCModelPresetId', type: 'StringValue', value: obj.modelPresetId || 'jade-dragon' },
          { name: 'NPCMaxHealth', type: 'NumberValue', value: obj.npcMaxHealth ?? 150 },
          { name: 'NPCAggroRange', type: 'NumberValue', value: obj.npcAggroRange ?? 48 },
          { name: 'NPCWalkSpeed', type: 'NumberValue', value: obj.npcWalkSpeed ?? 14 },
          { name: 'NPCAttackDamage', type: 'NumberValue', value: obj.npcAttackDamage ?? 15 },
          { name: 'NPCRewardCoins', type: 'NumberValue', value: obj.npcRewardCoins ?? 50 },
          { name: 'RespawnSeconds', type: 'NumberValue', value: obj.respawnSeconds ?? 15 },
        ]);
      },
    });
  } else if (obj.kind === 'SafeZone') {
    emitSimplePartXml(lines, indent, refs, {
      name: obj.name,
      pos: [pos[0], pos[1] + scl[1] * 0.4, pos[2]],
      rotDeg: rot,
      size: scl,
      hexColor: obj.color,
      materialEnumId: 1584, // ForceField
      canCollide: false,
      transparency: 0.72,
      shapeToken: 0,
      tags: ['SafeZone'],
    });
  } else if (obj.kind === 'Streetlamp') {
    lines.push(`${indent}<Item class="Model" referent="${refs.next('LAMP')}">`);
    lines.push(`${indent}\t<Properties>`);
    lines.push(`${indent}\t\t<string name="Name">${escapeXml(obj.name)}</string>`);
    lines.push(`${indent}\t\t<BinaryString name="Tags">${encodeRobloxTags(['MapLamp'])}</BinaryString>`);
    lines.push(`${indent}\t</Properties>`);
    emitSimplePartXml(lines, `${indent}\t`, refs, {
      name: 'Pole',
      pos: [pos[0], pos[1] + scl[1] * 0.45, pos[2]],
      rotDeg: rot,
      size: [0.6, scl[1] * 0.9, 0.6],
      hexColor: obj.color,
      materialEnumId: 1088,
    });
    emitSimplePartXml(lines, `${indent}\t`, refs, {
      name: 'Bulb',
      pos: [pos[0], pos[1] + scl[1] * 0.92, pos[2]],
      rotDeg: rot,
      size: [1.5, 1.5, 1.5],
      hexColor: '#FDE68A',
      materialEnumId: 288,
      extraChildren: (ci) => {
        lines.push(`${ci}<Item class="PointLight" referent="${refs.next('PL')}">`);
        lines.push(`${ci}\t<Properties>`);
        lines.push(`${ci}\t\t<string name="Name">LampLight</string>`);
        lines.push(`${ci}\t\t<bool name="Enabled">true</bool>`);
        pushColor3Xml(lines, `${ci}\t\t`, 'Color', '#FDE68A');
        lines.push(`${ci}\t\t<float name="Brightness">2.4</float>`);
        lines.push(`${ci}\t\t<float name="Range">32</float>`);
        lines.push(`${ci}\t</Properties>`);
        lines.push(`${ci}</Item>`);
      },
    });
    lines.push(`${indent}</Item>`);
  } else if (obj.kind === 'Tree') {
    lines.push(`${indent}<Item class="Model" referent="${refs.next('TREE')}">`);
    lines.push(`${indent}\t<Properties><string name="Name">${escapeXml(obj.name)}</string></Properties>`);
    emitSimplePartXml(lines, `${indent}\t`, refs, {
      name: 'Trunk',
      pos: [pos[0], pos[1] + scl[1] * 0.28, pos[2]],
      rotDeg: rot,
      size: [scl[0] * 0.28, scl[1] * 0.56, scl[2] * 0.28],
      hexColor: '#7C4A2D',
      materialEnumId: 512,
    });
    emitSimplePartXml(lines, `${indent}\t`, refs, {
      name: 'Canopy',
      pos: [pos[0], pos[1] + scl[1] * 0.72, pos[2]],
      rotDeg: rot,
      size: [scl[0], scl[1] * 0.48, scl[2]],
      hexColor: obj.color,
      materialEnumId: 256,
    });
    lines.push(`${indent}</Item>`);
  } else if (obj.kind === 'StampedModel' && obj.modelSnapshot) {
    emitRiggedStudioModelXml(
      lines,
      indent,
      refs,
      obj.modelSnapshot,
      pos,
      rot[1],
      scl[0],
      obj.name
    );
  } else {
    // Rock, Crate, fallback
    const matEnum = obj.kind === 'Rock' ? 832 : obj.kind === 'Crate' ? 512 : 272;
    emitSimplePartXml(lines, indent, refs, {
      name: obj.name,
      pos: [pos[0], pos[1] + scl[1] * 0.5, pos[2]],
      rotDeg: rot,
      size: scl,
      hexColor: obj.color,
      materialEnumId: matEnum,
    });
  }
}

export function emitScriptItemXml(
  lines: string[],
  indent: string,
  refs: RefGenerator,
  node: StudioScriptNode
) {
  lines.push(`${indent}<Item class="${node.className}" referent="${refs.next('SCR')}">`);
  lines.push(`${indent}\t<Properties>`);
  lines.push(`${indent}\t\t<string name="Name">${escapeXml(node.name)}</string>`);
  if (node.className === 'Script' || node.className === 'LocalScript') {
    lines.push(`${indent}\t\t<bool name="Disabled">${node.disabled}</bool>`);
    lines.push(`${indent}\t\t<ProtectedString name="Source">${wrapCdata(node.source)}</ProtectedString>`);
  } else if (node.className === 'ModuleScript') {
    lines.push(`${indent}\t\t<ProtectedString name="Source">${wrapCdata(node.source)}</ProtectedString>`);
  } else if (node.className === 'StringValue') {
    lines.push(`${indent}\t\t<string name="Value">${escapeXml(String(node.value ?? node.source ?? ''))}</string>`);
  } else if (node.className === 'NumberValue') {
    lines.push(`${indent}\t\t<double name="Value">${Number(node.value ?? 0) || 0}</double>`);
  } else if (node.className === 'BoolValue') {
    lines.push(`${indent}\t\t<bool name="Value">${Boolean(node.value)}</bool>`);
  }
  lines.push(`${indent}\t</Properties>`);
  lines.push(`${indent}</Item>`);
}

export function emitMapFolderXml(
  lines: string[],
  indent: string,
  refs: RefGenerator,
  map: StudioMapScene,
  options: RbxlxExportOptions = {}
) {
  const mergedBlocks = buildMergedTerrainBlocks(map, options.quantizeTerrainStep ?? 0.5);
  const activeObjects = map.objects.filter((o) => o.visible);

  lines.push(`${indent}<Item class="Folder" referent="${refs.next('MAP')}">`);
  lines.push(`${indent}\t<Properties>`);
  lines.push(`${indent}\t\t<string name="Name">${escapeXml(sanitizeIdentifier(map.name) || 'Map')}</string>`);
  lines.push(`${indent}\t</Properties>`);

  lines.push(`${indent}\t<Item class="Folder" referent="${refs.next('TCHK')}">`);
  lines.push(`${indent}\t\t<Properties><string name="Name">TerrainChunks</string></Properties>`);
  mergedBlocks.forEach((blk, idx) => {
    const spec = TERRAIN_BIOME_SPECS[blk.material] ?? TERRAIN_BIOME_SPECS.Grass;
    emitSimplePartXml(lines, `${indent}\t\t`, refs, {
      name: `Terrain_${blk.material}_${idx + 1}`,
      pos: [blk.x, blk.y, blk.z],
      size: [blk.sx, blk.sy, blk.sz],
      hexColor: spec.hexColor,
      materialEnumId: spec.robloxEnumId,
      anchored: true,
      canCollide: true,
    });
  });
  lines.push(`${indent}\t</Item>`);

  if (map.water.enabled) {
    const span = map.gridResolution * map.cellSizeStuds;
    emitSimplePartXml(lines, `${indent}\t`, refs, {
      name: 'WaterVolume',
      pos: [0, map.water.level - 2, 0],
      size: [span, 4, span],
      hexColor: map.water.color,
      materialEnumId: 1568,
      anchored: true,
      canCollide: false,
      transparency: map.water.transparency,
      tags: map.water.isHazard ? ['WaterHazard'] : [],
    });
  }

  lines.push(`${indent}\t<Item class="Folder" referent="${refs.next('OBJS')}">`);
  lines.push(`${indent}\t\t<Properties><string name="Name">MapObjects</string></Properties>`);
  for (const obj of activeObjects) {
    emitMapObjectXml(lines, `${indent}\t\t`, refs, obj, map);
  }
  lines.push(`${indent}\t</Item>`);

  lines.push(`${indent}</Item>`);
}

/**
 * Generates a full Roblox Studio Place XML (.rbxlx) containing Workspace (Terrain + Prefabs +
 * Stamped Rigged Models), Lighting/Atmosphere/Sky, Teams, ReplicatedStorage (MapConfig + Remotes +
 * NPC Templates), ServerScriptService, StarterGui, StarterPlayerScripts, and SoundService.
 */
export function generateRbxlx(map: StudioMapScene, options: RbxlxExportOptions = {}): string {
  const refs = new RefGenerator();
  const mergedBlocks = buildMergedTerrainBlocks(map, options.quantizeTerrainStep ?? 0.5);
  const activeObjects = map.objects.filter((o) => o.visible);
  const allScripts = [...getMapServiceScriptNodes(map), ...(map.customScripts ?? [])];

  const lines: string[] = [
    '<roblox xmlns:xmime="http://www.w3.org/2005/05/xmlmime" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="http://www.roblox.com/roblox.xsd" version="4">',
    '\t<External>null</External>',
    '\t<External>nil</External>',
  ];

  // 1. Workspace
  lines.push(`\t<Item class="Workspace" referent="${refs.next('WS')}">`);
  lines.push('\t\t<Properties>');
  lines.push('\t\t\t<string name="Name">Workspace</string>');
  lines.push('\t\t</Properties>');

  lines.push(`\t\t<Item class="Terrain" referent="${refs.next('TER')}">`);
  lines.push('\t\t\t<Properties>');
  lines.push('\t\t\t\t<string name="Name">Terrain</string>');
  pushColor3Xml(lines, '\t\t\t\t', 'WaterColor', map.water.color);
  lines.push(`\t\t\t\t<float name="WaterTransparency">${round4(map.water.transparency)}</float>`);
  lines.push('\t\t\t</Properties>');
  lines.push('\t\t</Item>');

  // Map Folder
  lines.push(`\t\t<Item class="Folder" referent="${refs.next('MAP')}">`);
  lines.push('\t\t\t<Properties>');
  lines.push(`\t\t\t\t<string name="Name">${escapeXml(sanitizeIdentifier(map.name) || 'Map')}</string>`);
  lines.push('\t\t\t</Properties>');

  // TerrainChunks Folder
  lines.push(`\t\t\t<Item class="Folder" referent="${refs.next('TCHK')}">`);
  lines.push('\t\t\t\t<Properties><string name="Name">TerrainChunks</string></Properties>');
  mergedBlocks.forEach((blk, idx) => {
    const spec = TERRAIN_BIOME_SPECS[blk.material] ?? TERRAIN_BIOME_SPECS.Grass;
    emitSimplePartXml(lines, '\t\t\t\t', refs, {
      name: `Terrain_${blk.material}_${idx + 1}`,
      pos: [blk.x, blk.y, blk.z],
      size: [blk.sx, blk.sy, blk.sz],
      hexColor: spec.hexColor,
      materialEnumId: spec.robloxEnumId,
      anchored: true,
      canCollide: true,
    });
  });
  lines.push('\t\t\t</Item>');

  // Water plane
  if (map.water.enabled) {
    const span = map.gridResolution * map.cellSizeStuds;
    emitSimplePartXml(lines, '\t\t\t', refs, {
      name: 'WaterVolume',
      pos: [0, map.water.level - 2, 0],
      size: [span, 4, span],
      hexColor: map.water.color,
      materialEnumId: 1568, // Glass
      anchored: true,
      canCollide: false,
      transparency: map.water.transparency,
      tags: map.water.isHazard ? ['WaterHazard'] : [],
    });
  }

  // Gameplay & Prop Objects
  lines.push(`\t\t\t<Item class="Folder" referent="${refs.next('OBJS')}">`);
  lines.push('\t\t\t\t<Properties><string name="Name">MapObjects</string></Properties>');
  for (const obj of activeObjects) {
    emitMapObjectXml(lines, '\t\t\t\t', refs, obj, map);
  }
  lines.push('\t\t\t</Item>');

  lines.push('\t\t</Item>'); // end Map Folder
  lines.push('\t</Item>'); // end Workspace

  // 2. Lighting
  lines.push(`\t<Item class="Lighting" referent="${refs.next('LGT')}">`);
  lines.push('\t\t<Properties>');
  lines.push('\t\t\t<string name="Name">Lighting</string>');
  pushColor3Xml(lines, '\t\t\t', 'Ambient', map.lighting.ambientColor);
  pushColor3Xml(lines, '\t\t\t', 'OutdoorAmbient', map.lighting.outdoorAmbient);
  pushColor3Xml(lines, '\t\t\t', 'FogColor', map.lighting.fogColor);
  lines.push(`\t\t\t<float name="Brightness">${round4(map.lighting.brightness)}</float>`);
  lines.push(`\t\t\t<float name="ClockTime">${round4(map.lighting.clockTime)}</float>`);
  lines.push(`\t\t\t<float name="FogEnd">${round4(map.lighting.fogEnd)}</float>`);
  lines.push(`\t\t\t<float name="GeographicLatitude">${round4(map.lighting.geographicLatitude)}</float>`);
  lines.push('\t\t</Properties>');
  lines.push(`\t\t<Item class="Atmosphere" referent="${refs.next('ATMO')}">`);
  lines.push('\t\t\t<Properties>');
  lines.push('\t\t\t\t<string name="Name">Atmosphere</string>');
  lines.push(`\t\t\t\t<float name="Density">${round4(map.lighting.atmosphereDensity)}</float>`);
  pushColor3Xml(lines, '\t\t\t\t', 'Color', map.lighting.fogColor);
  pushColor3Xml(lines, '\t\t\t\t', 'Decay', map.lighting.skyTopColor);
  lines.push('\t\t\t</Properties>');
  lines.push('\t\t</Item>');
  lines.push(`\t\t<Item class="Sky" referent="${refs.next('SKY')}">`);
  lines.push('\t\t\t<Properties><string name="Name">Sky</string></Properties>');
  lines.push('\t\t</Item>');
  lines.push(`\t\t<Item class="BloomEffect" referent="${refs.next('BLM')}">`);
  lines.push('\t\t\t<Properties>');
  lines.push('\t\t\t\t<string name="Name">Bloom</string>');
  lines.push('\t\t\t\t<float name="Intensity">0.45</float>');
  lines.push('\t\t\t\t<float name="Threshold">1.1</float>');
  lines.push('\t\t\t</Properties>');
  lines.push('\t\t</Item>');
  lines.push('\t</Item>');

  // 3. Teams
  lines.push(`\t<Item class="Teams" referent="${refs.next('TEAMS')}">`);
  lines.push('\t\t<Properties><string name="Name">Teams</string></Properties>');
  for (const team of map.teams) {
    lines.push(`\t\t<Item class="Team" referent="${refs.next('TEAM')}">`);
    lines.push('\t\t\t<Properties>');
    lines.push(`\t\t\t\t<string name="Name">${escapeXml(team.name)}</string>`);
    lines.push(`\t\t\t\t<BrickColor name="TeamColor">${getBrickColorId(team.brickColorName)}</BrickColor>`);
    lines.push(`\t\t\t\t<bool name="AutoAssignable">${team.autoAssignable}</bool>`);
    lines.push('\t\t\t</Properties>');
    lines.push('\t\t</Item>');
  }
  lines.push('\t</Item>');

  // 4. ReplicatedStorage (MapConfig + Remotes + NPCTemplates + user ReplicatedStorage scripts)
  lines.push(`\t<Item class="ReplicatedStorage" referent="${refs.next('RS')}">`);
  lines.push('\t\t<Properties><string name="Name">ReplicatedStorage</string></Properties>');
  for (const scr of allScripts.filter((s) => s.service === 'ReplicatedStorage')) {
    emitScriptItemXml(lines, '\t\t', refs, scr);
  }
  lines.push(`\t\t<Item class="Folder" referent="${refs.next('REMS')}">`);
  lines.push('\t\t\t<Properties><string name="Name">Remotes</string></Properties>');
  for (const remName of ['RoundStateEvent', 'ShopPurchaseEvent', 'OpenShopEvent', 'MapToastEvent']) {
    lines.push(`\t\t\t<Item class="RemoteEvent" referent="${refs.next('REM')}">`);
    lines.push(`\t\t\t\t<Properties><string name="Name">${remName}</string></Properties>`);
    lines.push('\t\t\t</Item>');
  }
  lines.push('\t\t</Item>');

  lines.push(`\t\t<Item class="Folder" referent="${refs.next('NPCT')}">`);
  lines.push('\t\t\t<Properties><string name="Name">NPCTemplates</string></Properties>');
  const emittedTemplateIds = new Set<string>();
  for (const sp of activeObjects.filter((o) => o.kind === 'NPCSpawner')) {
    const presetKey = sp.modelPresetId || 'jade-dragon';
    if (emittedTemplateIds.has(presetKey)) continue;
    emittedTemplateIds.add(presetKey);
    const modelSource =
      sp.modelSnapshot ?? MODEL_PRESETS.find((p) => p.id === presetKey)?.model;
    if (modelSource) {
      emitRiggedStudioModelXml(lines, '\t\t\t', refs, modelSource, [0, 0, 0], 0, 1, presetKey);
    }
  }
  lines.push('\t\t</Item>');
  lines.push('\t</Item>');

  // 5. ServerScriptService
  lines.push(`\t<Item class="ServerScriptService" referent="${refs.next('SSS')}">`);
  lines.push('\t\t<Properties><string name="Name">ServerScriptService</string></Properties>');
  for (const scr of allScripts.filter((s) => s.service === 'ServerScriptService')) {
    emitScriptItemXml(lines, '\t\t', refs, scr);
  }
  lines.push('\t</Item>');

  // 6. StarterGui
  lines.push(`\t<Item class="StarterGui" referent="${refs.next('SG')}">`);
  lines.push('\t\t<Properties><string name="Name">StarterGui</string></Properties>');
  lines.push('\t</Item>');

  // 7. StarterPlayer
  lines.push(`\t<Item class="StarterPlayer" referent="${refs.next('SP')}">`);
  lines.push('\t\t<Properties><string name="Name">StarterPlayer</string></Properties>');
  lines.push(`\t\t<Item class="StarterPlayerScripts" referent="${refs.next('SPS')}">`);
  lines.push('\t\t\t<Properties><string name="Name">StarterPlayerScripts</string></Properties>');
  for (const scr of allScripts.filter((s) => s.service === 'StarterPlayerScripts')) {
    emitScriptItemXml(lines, '\t\t\t', refs, scr);
  }
  lines.push('\t\t</Item>');
  lines.push(`\t\t<Item class="StarterCharacterScripts" referent="${refs.next('SCS')}">`);
  lines.push('\t\t\t<Properties><string name="Name">StarterCharacterScripts</string></Properties>');
  for (const scr of allScripts.filter((s) => s.service === 'StarterCharacterScripts')) {
    emitScriptItemXml(lines, '\t\t\t', refs, scr);
  }
  lines.push('\t\t</Item>');
  lines.push('\t</Item>');

  // 8. SoundService (MapSFX)
  lines.push(`\t<Item class="SoundService" referent="${refs.next('SS')}">`);
  lines.push('\t\t<Properties><string name="Name">SoundService</string></Properties>');
  lines.push(`\t\t<Item class="Folder" referent="${refs.next('SFX')}">`);
  lines.push('\t\t\t<Properties><string name="Name">MapSFX</string></Properties>');
  const sfxList: { name: string; soundId: string; volume: number }[] = [
    { name: 'CheckpointSFX', soundId: 'rbxassetid://4612375233', volume: 0.65 },
    { name: 'CoinSFX', soundId: 'rbxassetid://131323304', volume: 0.55 },
    { name: 'JumpPadSFX', soundId: 'rbxassetid://158149887', volume: 0.6 },
    { name: 'DoorSFX', soundId: 'rbxassetid://9114122773', volume: 0.6 },
    { name: 'TeleportSFX', soundId: 'rbxassetid://5066021887', volume: 0.7 },
    { name: 'RoundStartSFX', soundId: 'rbxassetid://1848354536', volume: 0.5 },
  ];
  for (const s of sfxList) {
    lines.push(`\t\t\t<Item class="Sound" referent="${refs.next('SND')}">`);
    lines.push('\t\t\t\t<Properties>');
    lines.push(`\t\t\t\t\t<string name="Name">${s.name}</string>`);
    lines.push(`\t\t\t\t\t<Content name="SoundId"><url>${s.soundId}</url></Content>`);
    lines.push(`\t\t\t\t\t<float name="Volume">${s.volume}</float>`);
    lines.push('\t\t\t\t</Properties>');
    lines.push('\t\t\t</Item>');
  }
  lines.push('\t\t</Item>');
  lines.push('\t</Item>');

  lines.push('</roblox>');
  return lines.join('\n');
}

export interface MapRojoBundleOptions {
  includeRbxlx?: boolean;
  includeRojoScripts?: boolean;
  includeStampedRbxmx?: boolean;
  includeStudforgeMapJson?: boolean;
}

export function generateMapRojoBundle(
  map: StudioMapScene,
  options: MapRojoBundleOptions = {}
): SyncFileEntry[] {
  const includeRbxlx = options.includeRbxlx ?? true;
  const includeRojoScripts = options.includeRojoScripts ?? true;
  const includeStampedRbxmx = options.includeStampedRbxmx ?? true;
  const includeStudforgeMapJson = options.includeStudforgeMapJson ?? true;

  const baseName = sanitizeIdentifier(map.name).replace(/\s+/g, '_') || 'RobloxMap';
  const files: SyncFileEntry[] = [];

  if (includeRojoScripts) {
    const projectTree = {
      name: baseName,
      tree: {
        $className: 'DataModel',
        ReplicatedStorage: {
          $className: 'ReplicatedStorage',
          $path: 'src/ReplicatedStorage',
          Remotes: {
            $className: 'Folder',
            RoundStateEvent: { $className: 'RemoteEvent' },
            ShopPurchaseEvent: { $className: 'RemoteEvent' },
            OpenShopEvent: { $className: 'RemoteEvent' },
            MapToastEvent: { $className: 'RemoteEvent' },
          },
        },
        ServerScriptService: {
          $className: 'ServerScriptService',
          $path: 'src/ServerScriptService',
        },
        StarterPlayer: {
          $className: 'StarterPlayer',
          StarterPlayerScripts: {
            $className: 'StarterPlayerScripts',
            $path: 'src/StarterPlayer/StarterPlayerScripts',
          },
          StarterCharacterScripts: {
            $className: 'StarterCharacterScripts',
            $path: 'src/StarterPlayer/StarterCharacterScripts',
          },
        },
      },
    };

    files.push({
      path: 'default.project.json',
      content: JSON.stringify(projectTree, null, 2),
      encoding: 'utf8',
      category: 'rojo',
    });

    const scripts = [...getMapServiceScriptNodes(map), ...(map.customScripts ?? [])];
    for (const node of scripts) {
      const folder =
        node.service === 'ReplicatedStorage'
          ? 'src/ReplicatedStorage'
          : node.service === 'ServerScriptService'
          ? 'src/ServerScriptService'
          : node.service === 'StarterCharacterScripts'
          ? 'src/StarterPlayer/StarterCharacterScripts'
          : 'src/StarterPlayer/StarterPlayerScripts';
      const safeScrName = sanitizeIdentifier(node.name).replace(/\s+/g, '_') || 'Script';
      const ext =
        node.className === 'Script'
          ? '.server.luau'
          : node.className === 'LocalScript'
          ? '.client.luau'
          : '.luau';
      files.push({
        path: `${folder}/${safeScrName}${ext}`,
        content: node.source,
        encoding: 'utf8',
        category: 'script',
      });
      if (node.disabled) {
        files.push({
          path: `${folder}/${safeScrName}.meta.json`,
          content: JSON.stringify({ properties: { Disabled: true } }, null, 2),
          encoding: 'utf8',
          category: 'rojo',
        });
      }
    }
  }

  if (includeRbxlx) {
    files.push({
      path: `map/${baseName}.rbxlx`,
      content: generateRbxlx(map),
      encoding: 'utf8',
      category: 'model',
    });
  }

  if (includeStampedRbxmx) {
    const exported = new Set<string>();
    for (const obj of map.objects) {
      const m =
        obj.modelSnapshot ??
        (obj.modelPresetId ? MODEL_PRESETS.find((p) => p.id === obj.modelPresetId)?.model : undefined);
      if (m && !exported.has(m.name)) {
        exported.add(m.name);
        const safeModel = sanitizeIdentifier(m.name).replace(/\s+/g, '_') || 'Model';
        files.push({
          path: `assets/models/${safeModel}_Package.rbxmx`,
          content: generateRbxmx(m, { scaleMode: 'studs', centerAtOrigin: true }),
          encoding: 'utf8',
          category: 'model',
        });
      }
    }
  }

  if (includeStudforgeMapJson) {
    files.push({
      path: `map/${baseName}.studforge-map.json`,
      content: JSON.stringify(map, null, 2),
      encoding: 'utf8',
      category: 'project',
    });
  }

  files.push({
    path: 'README.md',
    content: [
      `# ${map.name} — Full Roblox Studio Map & Script Suite`,
      ``,
      `Generated by StudForge 3D Map Creator.`,
      ``,
      `## Quick Open in Roblox Studio`,
      `1. Open \`map/${baseName}.rbxlx\` directly in Roblox Studio (\`File -> Open from File...\`).`,
      `2. Press **Play** to test SpawnLocations, Teams, Round Manager, Day-Night Cycle, Checkpoints, Teleporters, Doors, Coins, Shop HUD, and Rigged NPC Spawners.`,
      ``,
      `## Rojo 7 Sync`,
      `\`\`\`bash`,
      `rojo serve default.project.json`,
      `\`\`\``,
    ].join('\n'),
    encoding: 'utf8',
    category: 'project',
  });

  const deduped = new Map<string, SyncFileEntry>();
  for (const f of files) {
    deduped.set(f.path, f);
  }
  return Array.from(deduped.values());
}
