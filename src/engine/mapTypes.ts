import { RobloxMaterial, StudioSceneModel, StudioScriptNode } from './robloxTypes';

export type TerrainBiomeMaterial =
  | 'Grass'
  | 'Sand'
  | 'Rock'
  | 'Snow'
  | 'Cobblestone'
  | 'Lava';

export interface TerrainBiomeSpec {
  id: TerrainBiomeMaterial;
  label: string;
  hexColor: string;
  robloxMaterial: RobloxMaterial;
  robloxEnumId: number;
  roughness: number;
  emissive?: boolean;
}

export const TERRAIN_BIOME_SPECS: Record<TerrainBiomeMaterial, TerrainBiomeSpec> = {
  Grass: {
    id: 'Grass',
    label: 'Grass',
    hexColor: '#3D7A47',
    robloxMaterial: 'Plastic',
    robloxEnumId: 1280, // Enum.Material.Grass
    roughness: 0.85,
  },
  Sand: {
    id: 'Sand',
    label: 'Sand',
    hexColor: '#D6B87C',
    robloxMaterial: 'SmoothPlastic',
    robloxEnumId: 1296, // Enum.Material.Sand
    roughness: 0.88,
  },
  Rock: {
    id: 'Rock',
    label: 'Slate Rock',
    hexColor: '#5B626E',
    robloxMaterial: 'Granite',
    robloxEnumId: 896, // Enum.Material.Rock
    roughness: 0.78,
  },
  Snow: {
    id: 'Snow',
    label: 'Snow',
    hexColor: '#E8EEF5',
    robloxMaterial: 'SmoothPlastic',
    robloxEnumId: 1328, // Enum.Material.Snow
    roughness: 0.72,
  },
  Cobblestone: {
    id: 'Cobblestone',
    label: 'Cobble Path',
    hexColor: '#767980',
    robloxMaterial: 'Cobblestone',
    robloxEnumId: 880, // Enum.Material.Cobblestone
    roughness: 0.86,
  },
  Lava: {
    id: 'Lava',
    label: 'Magma / Hazard',
    hexColor: '#EA4C1D',
    robloxMaterial: 'Neon',
    robloxEnumId: 288, // Enum.Material.Neon
    roughness: 0.25,
    emissive: true,
  },
};

export const TERRAIN_BIOME_LIST: TerrainBiomeSpec[] = Object.values(TERRAIN_BIOME_SPECS);

export type TerrainBrushTool = 'raise' | 'lower' | 'flatten' | 'smooth' | 'paint';

export type MapEditorTool = 'select' | 'brush' | 'place' | 'stamp';

export type MapPrefabKind =
  | 'SpawnLocation'
  | 'Checkpoint'
  | 'KillBrick'
  | 'JumpPad'
  | 'SpeedPad'
  | 'InteractiveDoor'
  | 'Teleporter'
  | 'CoinPickup'
  | 'ShopPad'
  | 'NPCSpawner'
  | 'Streetlamp'
  | 'Tree'
  | 'Rock'
  | 'Crate'
  | 'SafeZone'
  | 'StampedModel';

export interface MapPrefabCatalogEntry {
  kind: MapPrefabKind;
  label: string;
  category: 'gameplay' | 'interactable' | 'economy' | 'props';
  defaultColor: string;
  defaultScale: [number, number, number];
  description: string;
}

export const MAP_PREFAB_CATALOG: MapPrefabCatalogEntry[] = [
  {
    kind: 'SpawnLocation',
    label: 'Spawn Pad',
    category: 'gameplay',
    defaultColor: '#2563EB',
    defaultScale: [6, 1, 6],
    description: 'Player SpawnLocation with optional Team assignment.',
  },
  {
    kind: 'Checkpoint',
    label: 'Checkpoint',
    category: 'gameplay',
    defaultColor: '#10B981',
    defaultScale: [6, 1, 6],
    description: 'Obby stage checkpoint that saves respawn progress & Stage stat.',
  },
  {
    kind: 'KillBrick',
    label: 'Kill Brick',
    category: 'gameplay',
    defaultColor: '#DC2626',
    defaultScale: [8, 1, 4],
    description: 'Glowing hazard brick that eliminates players on contact.',
  },
  {
    kind: 'JumpPad',
    label: 'Jump Pad',
    category: 'gameplay',
    defaultColor: '#06B6D4',
    defaultScale: [5, 1, 5],
    description: 'Launches players upward with impulse velocity & FX.',
  },
  {
    kind: 'SpeedPad',
    label: 'Speed Pad',
    category: 'gameplay',
    defaultColor: '#F59E0B',
    defaultScale: [5, 0.8, 7],
    description: 'Grants temporary WalkSpeed burst when stepped on.',
  },
  {
    kind: 'InteractiveDoor',
    label: 'Smart Door',
    category: 'interactable',
    defaultColor: '#64748B',
    defaultScale: [8, 9, 1.5],
    description: 'ProximityPrompt animated door with optional Coin unlock cost.',
  },
  {
    kind: 'Teleporter',
    label: 'Teleporter',
    category: 'interactable',
    defaultColor: '#8B5CF6',
    defaultScale: [5, 1, 5],
    description: 'Paired warp pad linked by Teleporter Channel ID.',
  },
  {
    kind: 'CoinPickup',
    label: 'Coin / Gem',
    category: 'economy',
    defaultColor: '#FACC15',
    defaultScale: [2.2, 2.2, 0.8],
    description: 'Spinning collectible that awards Coins to leaderstats and respawns.',
  },
  {
    kind: 'ShopPad',
    label: 'Shop Kiosk',
    category: 'economy',
    defaultColor: '#14B8A6',
    defaultScale: [6, 5, 5],
    description: 'Opens the in-game ShopHUD via ProximityPrompt.',
  },
  {
    kind: 'NPCSpawner',
    label: 'NPC Spawner',
    category: 'gameplay',
    defaultColor: '#E11D48',
    defaultScale: [6, 1, 6],
    description: 'Spawns an animated StudForge rigged NPC/Boss with AI & health bar.',
  },
  {
    kind: 'SafeZone',
    label: 'Safe Zone',
    category: 'gameplay',
    defaultColor: '#38BDF8',
    defaultScale: [12, 8, 12],
    description: 'Protective forcefield dome that heals players inside.',
  },
  {
    kind: 'Streetlamp',
    label: 'Streetlamp',
    category: 'props',
    defaultColor: '#475569',
    defaultScale: [1.8, 11, 1.8],
    description: 'Dusk-activated PointLight streetlamp synced to Day-Night Cycle.',
  },
  {
    kind: 'Tree',
    label: 'Blocky Tree',
    category: 'props',
    defaultColor: '#2E7D32',
    defaultScale: [5, 11, 5],
    description: 'Multi-part blocky Roblox tree for environment dressing.',
  },
  {
    kind: 'Rock',
    label: 'Boulder',
    category: 'props',
    defaultColor: '#6B7280',
    defaultScale: [5, 3.5, 4.5],
    description: 'Faceted stone boulder prop.',
  },
  {
    kind: 'Crate',
    label: 'Supply Crate',
    category: 'props',
    defaultColor: '#926239',
    defaultScale: [3.5, 3.5, 3.5],
    description: 'Timber-framed supply crate prop.',
  },
];

export interface MapObjectNode {
  id: string;
  name: string;
  kind: MapPrefabKind;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  color: string;
  visible: boolean;
  // Gameplay parameters
  teamName?: string;
  stageNumber?: number;
  jumpPower?: number;
  speedBoost?: number;
  boostDuration?: number;
  doorMode?: 'hinge' | 'slide';
  doorLockedCost?: number;
  promptText?: string;
  teleporterChannel?: string;
  coinValue?: number;
  respawnSeconds?: number;
  // Stamped StudForge model / NPC Spawner configuration
  modelPresetId?: string;
  modelSnapshot?: StudioSceneModel;
  npcMaxHealth?: number;
  npcAggroRange?: number;
  npcWalkSpeed?: number;
  npcAttackDamage?: number;
  npcRewardCoins?: number;
}

export interface MapTeamConfig {
  id: string;
  name: string;
  brickColorName: string;
  hexColor: string;
  autoAssignable: boolean;
}

export interface MapShopItem {
  id: string;
  name: string;
  description: string;
  cost: number;
  effectType: 'SpeedCoil' | 'JumpBoost' | 'Heal' | 'TrailAura';
  value: number;
  color: string;
}

export interface MapLightingConfig {
  clockTime: number; // 0..24 hours
  brightness: number;
  geographicLatitude: number;
  fogEnd: number;
  fogColor: string;
  ambientColor: string;
  outdoorAmbient: string;
  skyTopColor: string;
  atmosphereDensity: number;
  cycleEnabled: boolean;
  cycleMinutesPerDay: number;
}

export interface MapWaterConfig {
  enabled: boolean;
  level: number;
  color: string;
  transparency: number;
  isHazard: boolean;
}

export interface MapRoundConfig {
  lobbySeconds: number;
  roundSeconds: number;
  intermissionSeconds: number;
  minPlayers: number;
  winRewardCoins: number;
}

export interface MapSystemsConfig {
  roundManager: boolean;
  dayNightCycle: boolean;
  obbySystem: boolean;
  interactables: boolean;
  economyShop: boolean;
  npcSpawner: boolean;
}

export interface StudioMapScene {
  id: string;
  name: string;
  description: string;
  gridResolution: number;
  cellSizeStuds: number;
  heights: number[];
  materials: TerrainBiomeMaterial[];
  water: MapWaterConfig;
  lighting: MapLightingConfig;
  teams: MapTeamConfig[];
  roundConfig: MapRoundConfig;
  systems: MapSystemsConfig;
  shopItems: MapShopItem[];
  objects: MapObjectNode[];
  customScripts?: StudioScriptNode[];
}

export interface MapValidationIssue {
  severity: 'info' | 'warning' | 'error';
  message: string;
}

export interface MapValidationReport {
  terrainCells: number;
  terrainMergedParts: number;
  objectCount: number;
  stampedModelCount: number;
  spawnCount: number;
  checkpointCount: number;
  teleporterCount: number;
  npcSpawnerCount: number;
  enabledSystemsCount: number;
  scriptCount: number;
  estimatedTotalParts: number;
  rbxlxReady: boolean;
  issues: MapValidationIssue[];
}
