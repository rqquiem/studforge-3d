import {
  MAP_PREFAB_CATALOG,
  MapObjectNode,
  MapPrefabKind,
  MapShopItem,
  MapTeamConfig,
  StudioMapScene,
  TerrainBiomeMaterial,
  TerrainBrushTool,
} from './mapTypes';
import { MODEL_PRESETS } from './presets';
import { StudioSceneModel } from './robloxTypes';

export type TerrainGenStyle = 'crater' | 'islands' | 'basin' | 'flat';

function seededNoise2D(x: number, z: number, seed: number): number {
  const n = Math.sin(x * 12.9898 + z * 78.233 + seed * 37.719) * 43758.5453;
  return (n - Math.floor(n)) * 2 - 1;
}

function smoothNoise2D(x: number, z: number, seed: number): number {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx);
  const uz = fz * fz * (3 - 2 * fz);

  const a = seededNoise2D(ix, iz, seed);
  const b = seededNoise2D(ix + 1, iz, seed);
  const c = seededNoise2D(ix, iz + 1, seed);
  const d = seededNoise2D(ix + 1, iz + 1, seed);

  return a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz;
}

function fbm2D(x: number, z: number, seed: number, octaves = 3): number {
  let value = 0;
  let amp = 0.5;
  let freq = 1;
  for (let i = 0; i < octaves; i++) {
    value += amp * smoothNoise2D(x * freq, z * freq, seed + i * 19);
    freq *= 2.05;
    amp *= 0.5;
  }
  return value;
}

export function getTerrainHalfSpan(gridResolution: number, cellSizeStuds: number): number {
  return ((gridResolution - 1) * cellSizeStuds) / 2;
}

export function sampleTerrainHeight(
  heights: number[],
  gridResolution: number,
  cellSizeStuds: number,
  worldX: number,
  worldZ: number
): number {
  if (heights.length < gridResolution * gridResolution || gridResolution < 2) return 0;
  const half = getTerrainHalfSpan(gridResolution, cellSizeStuds);
  const gx = Math.max(0, Math.min(gridResolution - 1.0001, (worldX + half) / cellSizeStuds));
  const gz = Math.max(0, Math.min(gridResolution - 1.0001, (worldZ + half) / cellSizeStuds));

  const x0 = Math.floor(gx);
  const z0 = Math.floor(gz);
  const x1 = Math.min(gridResolution - 1, x0 + 1);
  const z1 = Math.min(gridResolution - 1, z0 + 1);
  const tx = gx - x0;
  const tz = gz - z0;

  const h00 = heights[z0 * gridResolution + x0] ?? 0;
  const h10 = heights[z0 * gridResolution + x1] ?? 0;
  const h01 = heights[z1 * gridResolution + x0] ?? 0;
  const h11 = heights[z1 * gridResolution + x1] ?? 0;

  const hx0 = h00 + (h10 - h00) * tx;
  const hx1 = h01 + (h11 - h01) * tx;
  return Math.round((hx0 + (hx1 - hx0) * tz) * 100) / 100;
}

export function applyTerrainBrush(
  heights: number[],
  materials: TerrainBiomeMaterial[],
  gridResolution: number,
  cellSizeStuds: number,
  worldX: number,
  worldZ: number,
  tool: TerrainBrushTool,
  radiusStuds: number,
  strength: number,
  paintMaterial: TerrainBiomeMaterial,
  flattenTargetHeight?: number
): { heights: number[]; materials: TerrainBiomeMaterial[] } {
  const nextHeights = heights.slice();
  const nextMaterials = materials.slice();
  const half = getTerrainHalfSpan(gridResolution, cellSizeStuds);
  const r = Math.max(2, radiusStuds);
  const rSq = r * r;

  const minGx = Math.max(0, Math.floor((worldX - r + half) / cellSizeStuds));
  const maxGx = Math.min(gridResolution - 1, Math.ceil((worldX + r + half) / cellSizeStuds));
  const minGz = Math.max(0, Math.floor((worldZ - r + half) / cellSizeStuds));
  const maxGz = Math.min(gridResolution - 1, Math.ceil((worldZ + r + half) / cellSizeStuds));

  const centerH =
    flattenTargetHeight !== undefined
      ? flattenTargetHeight
      : sampleTerrainHeight(heights, gridResolution, cellSizeStuds, worldX, worldZ);

  for (let gz = minGz; gz <= maxGz; gz++) {
    const cz = gz * cellSizeStuds - half;
    for (let gx = minGx; gx <= maxGx; gx++) {
      const cx = gx * cellSizeStuds - half;
      const distSq = (cx - worldX) * (cx - worldX) + (cz - worldZ) * (cz - worldZ);
      if (distSq > rSq) continue;

      const idx = gz * gridResolution + gx;
      const t = 1 - Math.sqrt(distSq) / r;
      const falloff = t * t * (3 - 2 * t);

      if (tool === 'raise') {
        nextHeights[idx] = Math.min(48, Math.round((heights[idx] + strength * 1.4 * falloff) * 100) / 100);
      } else if (tool === 'lower') {
        nextHeights[idx] = Math.max(-16, Math.round((heights[idx] - strength * 1.4 * falloff) * 100) / 100);
      } else if (tool === 'flatten') {
        const blend = Math.min(1, falloff * Math.min(1, strength * 0.45));
        nextHeights[idx] = Math.round((heights[idx] + (centerH - heights[idx]) * blend) * 100) / 100;
      } else if (tool === 'smooth') {
        let sum = 0;
        let count = 0;
        for (let oz = -1; oz <= 1; oz++) {
          for (let ox = -1; ox <= 1; ox++) {
            const nx = gx + ox;
            const nz = gz + oz;
            if (nx >= 0 && nx < gridResolution && nz >= 0 && nz < gridResolution) {
              sum += heights[nz * gridResolution + nx];
              count++;
            }
          }
        }
        const avg = count > 0 ? sum / count : heights[idx];
        const blend = Math.min(1, falloff * Math.min(1, strength * 0.5));
        nextHeights[idx] = Math.round((heights[idx] + (avg - heights[idx]) * blend) * 100) / 100;
      } else if (tool === 'paint') {
        if (falloff > 0.15) {
          nextMaterials[idx] = paintMaterial;
        }
      }
    }
  }

  return { heights: nextHeights, materials: nextMaterials };
}

export function generateProceduralTerrain(
  gridResolution: number,
  cellSizeStuds: number,
  style: TerrainGenStyle,
  seed = 42
): { heights: number[]; materials: TerrainBiomeMaterial[] } {
  const total = gridResolution * gridResolution;
  const heights = new Array<number>(total).fill(0);
  const materials = new Array<TerrainBiomeMaterial>(total).fill('Grass');
  const half = getTerrainHalfSpan(gridResolution, cellSizeStuds);

  for (let gz = 0; gz < gridResolution; gz++) {
    const wz = gz * cellSizeStuds - half;
    for (let gx = 0; gx < gridResolution; gx++) {
      const wx = gx * cellSizeStuds - half;
      const idx = gz * gridResolution + gx;
      const dist = Math.sqrt(wx * wx + wz * wz);
      const normDist = dist / Math.max(1, half);
      const noise = fbm2D(wx * 0.032, wz * 0.032, seed, 3);

      if (style === 'flat') {
        heights[idx] = 0;
        materials[idx] = Math.abs(wx) < 10 || Math.abs(wz) < 10 ? 'Cobblestone' : 'Grass';
      } else if (style === 'crater') {
        // Outer high rim + sunken moat + central boss dais
        const rim = Math.exp(-Math.pow((normDist - 0.72) / 0.18, 2)) * 16;
        const moat = -Math.exp(-Math.pow((normDist - 0.44) / 0.11, 2)) * 6.5;
        const dais = normDist < 0.24 ? 3.5 * (1 - normDist / 0.24) : 0;
        const spawnPlatform =
          wx > -18 && wx < 18 && wz > 46 && wz < 76 ? 4.5 : 0;
        const h = Math.max(
          -6,
          rim + moat + dais + spawnPlatform + noise * (normDist > 0.25 ? 4.5 : 0.8)
        );
        heights[idx] = Math.round(h * 100) / 100;

        if (h < -1.5) materials[idx] = 'Sand';
        else if (normDist < 0.25) materials[idx] = 'Cobblestone';
        else if (h > 13.5) materials[idx] = 'Snow';
        else if (h > 8.2) materials[idx] = 'Rock';
        else if (wx > -14 && wx < 14 && wz > 44 && wz < 74) materials[idx] = 'Cobblestone';
        else materials[idx] = 'Grass';
      } else if (style === 'islands') {
        // Floating plateaus separated by water abyss
        const islands = [
          { cx: 0, cz: 58, r: 18, h: 4 },
          { cx: -30, cz: 22, r: 14, h: 7 },
          { cx: 28, cz: 10, r: 15, h: 10 },
          { cx: -14, cz: -26, r: 14, h: 13 },
          { cx: 18, cz: -56, r: 19, h: 16 },
        ];
        let best = -6.5;
        let onIsland = false;
        for (const isl of islands) {
          const d = Math.hypot(wx - isl.cx, wz - isl.cz);
          if (d < isl.r) {
            onIsland = true;
            const edge = Math.min(1, (isl.r - d) / 4);
            best = Math.max(best, isl.h * edge - 1.5 * (1 - edge) + noise * 0.9);
          }
        }
        heights[idx] = Math.round(best * 100) / 100;
        if (!onIsland) materials[idx] = 'Sand';
        else if (best > 14) materials[idx] = 'Snow';
        else if (best > 9) materials[idx] = 'Cobblestone';
        else materials[idx] = 'Grass';
      } else {
        // Symmetrical basin for Team Capture
        const hills = Math.pow(Math.min(1, normDist), 2.1) * 14 + noise * 3.5;
        const river = Math.exp(-Math.pow(wx / 12, 2)) * -4.2;
        const h = Math.round((hills + river) * 100) / 100;
        heights[idx] = h;
        if (h < -1.2) materials[idx] = 'Sand';
        else if (Math.abs(wx) < 10 && Math.abs(wz) < 10) materials[idx] = 'Cobblestone';
        else if (h > 9.5) materials[idx] = 'Rock';
        else materials[idx] = 'Grass';
      }
    }
  }

  return { heights, materials };
}

export function createMapObjectFromCatalog(
  kind: MapPrefabKind,
  position: [number, number, number],
  existingCount: number,
  extra?: Partial<MapObjectNode>
): MapObjectNode {
  const catalog = MAP_PREFAB_CATALOG.find((c) => c.kind === kind) ?? MAP_PREFAB_CATALOG[0];
  const uid = `mobj_${Date.now().toString(36)}_${existingCount}_${Math.random().toString(36).slice(2, 5)}`;

  const base: MapObjectNode = {
    id: uid,
    name: `${catalog.label.replace(/\s+/g, '')}_${existingCount + 1}`,
    kind,
    position,
    rotation: [0, 0, 0],
    scale: [...catalog.defaultScale],
    color: catalog.defaultColor,
    visible: true,
    ...(kind === 'SpawnLocation' ? { teamName: '' } : {}),
    ...(kind === 'Checkpoint' ? { stageNumber: existingCount + 1 } : {}),
    ...(kind === 'JumpPad' ? { jumpPower: 95 } : {}),
    ...(kind === 'SpeedPad' ? { speedBoost: 36, boostDuration: 4 } : {}),
    ...(kind === 'InteractiveDoor'
      ? { doorMode: 'hinge', doorLockedCost: 0, promptText: 'Open Gate' }
      : {}),
    ...(kind === 'Teleporter' ? { teleporterChannel: 'Alpha' } : {}),
    ...(kind === 'CoinPickup' ? { coinValue: 10, respawnSeconds: 12 } : {}),
    ...(kind === 'NPCSpawner'
      ? {
          modelPresetId: MODEL_PRESETS[0]?.id ?? 'jade-dragon',
          npcMaxHealth: 150,
          npcAggroRange: 48,
          npcWalkSpeed: 14,
          npcAttackDamage: 15,
          npcRewardCoins: 50,
          respawnSeconds: 15,
        }
      : {}),
    ...extra,
  };

  return base;
}

export function createStampedModelObject(
  sourceModel: StudioSceneModel,
  position: [number, number, number],
  existingCount: number,
  presetId?: string
): MapObjectNode {
  const uid = `mstamp_${Date.now().toString(36)}_${existingCount}_${Math.random().toString(36).slice(2, 5)}`;
  const clonedSnapshot: StudioSceneModel = JSON.parse(JSON.stringify(sourceModel));
  return {
    id: uid,
    name: `${sourceModel.name.replace(/\s+/g, '')}_${existingCount + 1}`,
    kind: 'StampedModel',
    position,
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    color: sourceModel.parts[0]?.color ?? '#16A34A',
    visible: true,
    modelPresetId: presetId,
    modelSnapshot: clonedSnapshot,
  };
}

const DEFAULT_SHOP_ITEMS: MapShopItem[] = [
  {
    id: 'shop_speed_coil',
    name: 'Hyper Speed Coil',
    description: 'Boosts character WalkSpeed from 16 to 28 studs/s.',
    cost: 25,
    effectType: 'SpeedCoil',
    value: 28,
    color: '#06B6D4',
  },
  {
    id: 'shop_jump_coil',
    name: 'Gravity Jump Coil',
    description: 'Boosts character JumpPower from 50 to 85.',
    cost: 40,
    effectType: 'JumpBoost',
    value: 85,
    color: '#A855F7',
  },
  {
    id: 'shop_medkit',
    name: 'Instant Full Heal',
    description: 'Restores Humanoid Health to MaxHealth immediately.',
    cost: 15,
    effectType: 'Heal',
    value: 100,
    color: '#10B981',
  },
  {
    id: 'shop_trail_aura',
    name: 'Jade Dragon Aura',
    description: 'Attaches a glowing neon Trail between character feet & torso.',
    cost: 60,
    effectType: 'TrailAura',
    value: 1,
    color: '#FACC15',
  },
];

const DEFAULT_TEAMS: MapTeamConfig[] = [
  {
    id: 'team_lobby',
    name: 'Lobby',
    brickColorName: 'Medium stone grey',
    hexColor: '#94A3B8',
    autoAssignable: true,
  },
  {
    id: 'team_explorers',
    name: 'Explorers',
    brickColorName: 'Bright blue',
    hexColor: '#2563EB',
    autoAssignable: false,
  },
  {
    id: 'team_raiders',
    name: 'Raiders',
    brickColorName: 'Bright red',
    hexColor: '#DC2626',
    autoAssignable: false,
  },
];

function buildDragonsCraterMap(): StudioMapScene {
  const res = 48;
  const cell = 4;
  const { heights, materials } = generateProceduralTerrain(res, cell, 'crater', 17);
  const hAt = (x: number, z: number) => sampleTerrainHeight(heights, res, cell, x, z);

  const objects: MapObjectNode[] = [
    createMapObjectFromCatalog('SpawnLocation', [0, hAt(0, 62) + 0.5, 62], 0, {
      name: 'LobbySpawn',
      teamName: 'Lobby',
    }),
    createMapObjectFromCatalog('SpawnLocation', [-10, hAt(-10, 56) + 0.5, 56], 1, {
      name: 'ExplorerSpawn',
      teamName: 'Explorers',
      color: '#3B82F6',
    }),
    createMapObjectFromCatalog('ShopPad', [14, hAt(14, 56), 56], 2, {
      name: 'CraterOutfitterShop',
    }),
    createMapObjectFromCatalog('SafeZone', [0, hAt(0, 60), 60], 3, {
      name: 'LobbySafeZone',
      scale: [18, 10, 14],
    }),
    createMapObjectFromCatalog('Checkpoint', [0, hAt(0, 42) + 0.5, 42], 4, {
      name: 'Checkpoint_1',
      stageNumber: 1,
    }),
    createMapObjectFromCatalog('Teleporter', [-16, hAt(-16, 44) + 0.5, 44], 5, {
      name: 'MoatWarp_In',
      teleporterChannel: 'CraterCore',
    }),
    createMapObjectFromCatalog('Teleporter', [-14, hAt(-14, 14) + 0.5, 14], 6, {
      name: 'MoatWarp_Out',
      teleporterChannel: 'CraterCore',
    }),
    createMapObjectFromCatalog('JumpPad', [0, hAt(0, 34) + 0.5, 34], 7, {
      name: 'MoatJumpPad',
      jumpPower: 105,
    }),
    createMapObjectFromCatalog('KillBrick', [0, hAt(0, 26) + 0.6, 26], 8, {
      name: 'LavaTrenchHazard',
      scale: [14, 1, 5],
    }),
    createMapObjectFromCatalog('Checkpoint', [0, hAt(0, 18) + 0.5, 18], 9, {
      name: 'Checkpoint_2',
      stageNumber: 2,
    }),
    createMapObjectFromCatalog('InteractiveDoor', [0, hAt(0, 12), 12], 10, {
      name: 'SanctumGate',
      doorMode: 'slide',
      doorLockedCost: 0,
      promptText: 'Open Dragon Sanctum',
      scale: [10, 10, 1.8],
    }),
    createMapObjectFromCatalog('NPCSpawner', [0, hAt(0, -4) + 0.5, -4], 11, {
      name: 'JadeDragonBossSpawner',
      modelPresetId: MODEL_PRESETS[0]?.id ?? 'jade-dragon',
      npcMaxHealth: 250,
      npcAggroRange: 52,
      npcWalkSpeed: 15,
      npcAttackDamage: 20,
      npcRewardCoins: 100,
      respawnSeconds: 20,
    }),
    createMapObjectFromCatalog('Checkpoint', [0, hAt(0, -18) + 0.5, -18], 12, {
      name: 'Checkpoint_3',
      stageNumber: 3,
    }),
    createMapObjectFromCatalog('SpeedPad', [14, hAt(14, 24) + 0.5, 24], 13, {
      name: 'FlankSpeedPad',
      rotation: [0, -15, 0],
    }),
    // Coins scattered along the route
    createMapObjectFromCatalog('CoinPickup', [-6, hAt(-6, 48) + 2.2, 48], 14, {
      name: 'Coin_1',
      coinValue: 10,
    }),
    createMapObjectFromCatalog('CoinPickup', [6, hAt(6, 48) + 2.2, 48], 15, {
      name: 'Coin_2',
      coinValue: 10,
    }),
    createMapObjectFromCatalog('CoinPickup', [14, hAt(14, 14) + 2.2, 14], 16, {
      name: 'Coin_3',
      coinValue: 15,
    }),
    createMapObjectFromCatalog('CoinPickup', [0, hAt(0, -12) + 2.2, -12], 17, {
      name: 'BossGem_4',
      coinValue: 30,
      color: '#38BDF8',
    }),
    // Streetlamps & environment props
    createMapObjectFromCatalog('Streetlamp', [-9, hAt(-9, 52), 52], 18, { name: 'Lamp_LobbyL' }),
    createMapObjectFromCatalog('Streetlamp', [9, hAt(9, 52), 52], 19, { name: 'Lamp_LobbyR' }),
    createMapObjectFromCatalog('Streetlamp', [-9, hAt(-9, 14), 14], 20, { name: 'Lamp_GateL' }),
    createMapObjectFromCatalog('Streetlamp', [9, hAt(9, 14), 14], 21, { name: 'Lamp_GateR' }),
    createMapObjectFromCatalog('Tree', [-32, hAt(-32, 46), 46], 22, { name: 'Pine_1' }),
    createMapObjectFromCatalog('Tree', [34, hAt(34, 42), 42], 23, { name: 'Pine_2' }),
    createMapObjectFromCatalog('Rock', [-26, hAt(-26, -12), -12], 24, { name: 'CraterBoulder_1' }),
    createMapObjectFromCatalog('Crate', [18, hAt(18, 52), 52], 25, { name: 'SupplyCrate_1' }),
  ];

  // Stamp Timber Watchtower on the rim as a decorative structure
  const towerPreset = MODEL_PRESETS.find((p) => p.id === 'timber-watchtower');
  if (towerPreset) {
    objects.push(
      createStampedModelObject(towerPreset.model, [-26, hAt(-26, 38), 38], 26, towerPreset.id)
    );
  }

  return {
    id: 'dragons-crater',
    name: 'DragonsCraterArena',
    description:
      'Caldera arena with water moat, lobby & shop, obby jumps, teleporters, sanctum gate, and a Jade Blocky Dragon Boss Spawner.',
    gridResolution: res,
    cellSizeStuds: cell,
    heights,
    materials,
    water: {
      enabled: true,
      level: -1.4,
      color: '#0EA5E9',
      transparency: 0.38,
      isHazard: false,
    },
    lighting: {
      clockTime: 16.5,
      brightness: 2.2,
      geographicLatitude: 36,
      fogEnd: 360,
      fogColor: '#1E293B',
      ambientColor: '#475569',
      outdoorAmbient: '#64748B',
      skyTopColor: '#1D4ED8',
      atmosphereDensity: 0.32,
      cycleEnabled: true,
      cycleMinutesPerDay: 6,
    },
    teams: DEFAULT_TEAMS.map((t) => ({ ...t })),
    roundConfig: {
      lobbySeconds: 12,
      roundSeconds: 180,
      intermissionSeconds: 8,
      minPlayers: 1,
      winRewardCoins: 75,
    },
    systems: {
      roundManager: true,
      dayNightCycle: true,
      obbySystem: true,
      interactables: true,
      economyShop: true,
      npcSpawner: true,
    },
    shopItems: DEFAULT_SHOP_ITEMS.map((s) => ({ ...s })),
    objects,
  };
}

function buildSkylineObbyMap(): StudioMapScene {
  const res = 48;
  const cell = 4;
  const { heights, materials } = generateProceduralTerrain(res, cell, 'islands', 91);
  const hAt = (x: number, z: number) => sampleTerrainHeight(heights, res, cell, x, z);

  const objects: MapObjectNode[] = [
    createMapObjectFromCatalog('SpawnLocation', [0, hAt(0, 60) + 0.5, 60], 0, {
      name: 'ObbyStartSpawn',
      teamName: 'Explorers',
    }),
    createMapObjectFromCatalog('Checkpoint', [0, hAt(0, 48) + 0.5, 48], 1, {
      name: 'Stage_1',
      stageNumber: 1,
    }),
    createMapObjectFromCatalog('JumpPad', [-10, hAt(-10, 42) + 0.5, 42], 2, {
      name: 'Launch_To_Island2',
      jumpPower: 115,
    }),
    createMapObjectFromCatalog('Checkpoint', [-30, hAt(-30, 24) + 0.5, 24], 3, {
      name: 'Stage_2',
      stageNumber: 2,
    }),
    createMapObjectFromCatalog('KillBrick', [-14, hAt(-14, 18) + 1.2, 18], 4, {
      name: 'LaserBeam_1',
      scale: [12, 1, 2],
    }),
    createMapObjectFromCatalog('SpeedPad', [-24, hAt(-24, 18) + 0.5, 18], 5, {
      name: 'DashPad_2',
      rotation: [0, -60, 0],
    }),
    createMapObjectFromCatalog('Checkpoint', [28, hAt(28, 12) + 0.5, 12], 6, {
      name: 'Stage_3',
      stageNumber: 3,
    }),
    createMapObjectFromCatalog('Teleporter', [30, hAt(30, 4) + 0.5, 4], 7, {
      name: 'SkyWarp_A',
      teleporterChannel: 'Summit',
    }),
    createMapObjectFromCatalog('Teleporter', [-14, hAt(-14, -24) + 0.5, -24], 8, {
      name: 'SkyWarp_B',
      teleporterChannel: 'Summit',
    }),
    createMapObjectFromCatalog('Checkpoint', [-14, hAt(-14, -30) + 0.5, -30], 9, {
      name: 'Stage_4',
      stageNumber: 4,
    }),
    createMapObjectFromCatalog('InteractiveDoor', [8, hAt(8, -44), -44], 10, {
      name: 'SummitVaultDoor',
      doorLockedCost: 20,
      promptText: 'Unlock Summit (20 Coins)',
    }),
    createMapObjectFromCatalog('Checkpoint', [18, hAt(18, -56) + 0.5, -56], 11, {
      name: 'Stage_5_Finish',
      stageNumber: 5,
      color: '#FACC15',
    }),
    createMapObjectFromCatalog('ShopPad', [10, hAt(10, 58), 58], 12, {
      name: 'SkylineShop',
    }),
    createMapObjectFromCatalog('CoinPickup', [-28, hAt(-28, 16) + 2.2, 16], 13, { coinValue: 15 }),
    createMapObjectFromCatalog('CoinPickup', [26, hAt(26, 8) + 2.2, 8], 14, { coinValue: 15 }),
    createMapObjectFromCatalog('CoinPickup', [18, hAt(18, -62) + 2.2, -62], 15, { coinValue: 50 }),
  ];

  return {
    id: 'skyline-obby',
    name: 'SkylineObbyIslands',
    description:
      'Floating island obstacle course with 5 sequential checkpoints, jump/speed pads, coin-locked summit gate, and hazard water.',
    gridResolution: res,
    cellSizeStuds: cell,
    heights,
    materials,
    water: {
      enabled: true,
      level: -3.5,
      color: '#0284C7',
      transparency: 0.45,
      isHazard: true,
    },
    lighting: {
      clockTime: 10.5,
      brightness: 2.5,
      geographicLatitude: 28,
      fogEnd: 420,
      fogColor: '#38BDF8',
      ambientColor: '#64748B',
      outdoorAmbient: '#94A3B8',
      skyTopColor: '#0284C7',
      atmosphereDensity: 0.22,
      cycleEnabled: false,
      cycleMinutesPerDay: 8,
    },
    teams: DEFAULT_TEAMS.slice(0, 2).map((t) => ({ ...t })),
    roundConfig: {
      lobbySeconds: 8,
      roundSeconds: 240,
      intermissionSeconds: 10,
      minPlayers: 1,
      winRewardCoins: 100,
    },
    systems: {
      roundManager: true,
      dayNightCycle: false,
      obbySystem: true,
      interactables: true,
      economyShop: true,
      npcSpawner: false,
    },
    shopItems: DEFAULT_SHOP_ITEMS.map((s) => ({ ...s })),
    objects,
  };
}

function buildOutpostBasinMap(): StudioMapScene {
  const res = 48;
  const cell = 4;
  const { heights, materials } = generateProceduralTerrain(res, cell, 'basin', 55);
  const hAt = (x: number, z: number) => sampleTerrainHeight(heights, res, cell, x, z);

  const objects: MapObjectNode[] = [
    createMapObjectFromCatalog('SpawnLocation', [-48, hAt(-48, 0) + 0.5, 0], 0, {
      name: 'DefendersSpawn',
      teamName: 'Explorers',
      color: '#2563EB',
    }),
    createMapObjectFromCatalog('SpawnLocation', [48, hAt(48, 0) + 0.5, 0], 1, {
      name: 'RaidersSpawn',
      teamName: 'Raiders',
      color: '#DC2626',
    }),
    createMapObjectFromCatalog('SafeZone', [-48, hAt(-48, 0), 0], 2, {
      name: 'DefenderBaseZone',
    }),
    createMapObjectFromCatalog('ShopPad', [-36, hAt(-36, 12), 12], 3, {
      name: 'ArmoryShop',
    }),
    createMapObjectFromCatalog('InteractiveDoor', [-24, hAt(-24, 0), 0], 4, {
      name: 'OutpostBlastDoor',
      doorMode: 'hinge',
      promptText: 'Cycle Blast Door',
    }),
    createMapObjectFromCatalog('Teleporter', [-38, hAt(-38, -14) + 0.5, -14], 5, {
      name: 'FlankPortal_W',
      teleporterChannel: 'Ridge',
    }),
    createMapObjectFromCatalog('Teleporter', [38, hAt(38, 14) + 0.5, 14], 6, {
      name: 'FlankPortal_E',
      teleporterChannel: 'Ridge',
    }),
    createMapObjectFromCatalog('NPCSpawner', [0, hAt(0, 0) + 0.5, 0], 7, {
      name: 'CenterTurretBoss',
      modelPresetId: 'aegis-turret',
      npcMaxHealth: 180,
      npcAggroRange: 44,
      npcWalkSpeed: 0,
      npcAttackDamage: 18,
      npcRewardCoins: 60,
    }),
    createMapObjectFromCatalog('CoinPickup', [0, hAt(0, 12) + 2.2, 12], 8, { coinValue: 20 }),
    createMapObjectFromCatalog('CoinPickup', [0, hAt(0, -12) + 2.2, -12], 9, { coinValue: 20 }),
    createMapObjectFromCatalog('Streetlamp', [-20, hAt(-20, 8), 8], 10),
    createMapObjectFromCatalog('Streetlamp', [20, hAt(20, -8), -8], 11),
  ];

  const beacon = MODEL_PRESETS.find((p) => p.id === 'orbital-beacon');
  if (beacon) {
    objects.push(createStampedModelObject(beacon.model, [0, hAt(0, -28), -28], 12, beacon.id));
  }

  return {
    id: 'outpost-basin',
    name: 'OutpostCaptureBasin',
    description:
      'Symmetrical two-team valley with opposing bases, blast doors, ridge teleporters, and an Aegis Turret center guardian.',
    gridResolution: res,
    cellSizeStuds: cell,
    heights,
    materials,
    water: {
      enabled: true,
      level: -2.0,
      color: '#0E7490',
      transparency: 0.35,
      isHazard: false,
    },
    lighting: {
      clockTime: 18.2,
      brightness: 1.9,
      geographicLatitude: 42,
      fogEnd: 340,
      fogColor: '#312E81',
      ambientColor: '#4338CA',
      outdoorAmbient: '#64748B',
      skyTopColor: '#1E1B4B',
      atmosphereDensity: 0.38,
      cycleEnabled: true,
      cycleMinutesPerDay: 5,
    },
    teams: DEFAULT_TEAMS.map((t) => ({ ...t })),
    roundConfig: {
      lobbySeconds: 10,
      roundSeconds: 180,
      intermissionSeconds: 8,
      minPlayers: 1,
      winRewardCoins: 80,
    },
    systems: {
      roundManager: true,
      dayNightCycle: true,
      obbySystem: false,
      interactables: true,
      economyShop: true,
      npcSpawner: true,
    },
    shopItems: DEFAULT_SHOP_ITEMS.map((s) => ({ ...s })),
    objects,
  };
}

function buildBlankBaseplateMap(): StudioMapScene {
  const res = 48;
  const cell = 4;
  const { heights, materials } = generateProceduralTerrain(res, cell, 'flat', 1);
  return {
    id: 'blank-baseplate',
    name: 'CustomRobloxMap',
    description: 'Clean flat grass & cobble terrain ready for brush sculpting and prefab placement.',
    gridResolution: res,
    cellSizeStuds: cell,
    heights,
    materials,
    water: {
      enabled: false,
      level: -2,
      color: '#0EA5E9',
      transparency: 0.38,
      isHazard: false,
    },
    lighting: {
      clockTime: 14,
      brightness: 2.2,
      geographicLatitude: 35,
      fogEnd: 500,
      fogColor: '#60A5FA',
      ambientColor: '#64748B',
      outdoorAmbient: '#94A3B8',
      skyTopColor: '#2563EB',
      atmosphereDensity: 0.25,
      cycleEnabled: false,
      cycleMinutesPerDay: 6,
    },
    teams: DEFAULT_TEAMS.slice(0, 2).map((t) => ({ ...t })),
    roundConfig: {
      lobbySeconds: 10,
      roundSeconds: 180,
      intermissionSeconds: 8,
      minPlayers: 1,
      winRewardCoins: 50,
    },
    systems: {
      roundManager: true,
      dayNightCycle: true,
      obbySystem: true,
      interactables: true,
      economyShop: true,
      npcSpawner: true,
    },
    shopItems: DEFAULT_SHOP_ITEMS.map((s) => ({ ...s })),
    objects: [
      createMapObjectFromCatalog('SpawnLocation', [0, 0.5, 0], 0, {
        name: 'StartSpawn',
        teamName: '',
      }),
    ],
  };
}

export interface MapPresetDescriptor {
  id: string;
  label: string;
  description: string;
  build: () => StudioMapScene;
}

export const MAP_PRESETS: MapPresetDescriptor[] = [
  {
    id: 'dragons-crater',
    label: "Dragon's Crater Arena",
    description: 'Sculpted caldera, moat, obby jumps, teleporters, shop, and Dragon Boss Spawner.',
    build: buildDragonsCraterMap,
  },
  {
    id: 'skyline-obby',
    label: 'Skyline Obby Islands',
    description: 'Floating plateau course with 5 checkpoints, jump/speed pads, and coin-locked vault.',
    build: buildSkylineObbyMap,
  },
  {
    id: 'outpost-basin',
    label: 'Outpost Capture Basin',
    description: 'Two-team tactical valley with blast doors, ridge teleporters, and turret boss.',
    build: buildOutpostBasinMap,
  },
  {
    id: 'blank-baseplate',
    label: 'Blank Baseplate',
    description: 'Clean 192×192 stud sculptable terrain with SpawnLocation and all gameplay scripts.',
    build: buildBlankBaseplateMap,
  },
];
