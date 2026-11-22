export type RobloxMaterial =
  | 'SmoothPlastic'
  | 'Plastic'
  | 'Metal'
  | 'Neon'
  | 'Glass'
  | 'Wood'
  | 'Granite'
  | 'Cobblestone'
  | 'DiamondPlate'
  | 'CorrodedMetal'
  | 'ForceField';

export type PartShape =
  | 'Block'
  | 'Cylinder'
  | 'Ball'
  | 'Wedge'
  | 'CornerWedge'
  | 'HexPrism'
  | 'BevelPlate'
  | 'PipeElbow'
  | 'Archway'
  | 'LatheCone';

export type TransformMode = 'select' | 'translate' | 'rotate' | 'scale';

export type StudioWorkspaceMode = 'model' | 'animate' | 'scripts' | 'map' | 'workspace';

export type RobloxServiceLocation =
  | 'WorkspaceModel'
  | 'ReplicatedStorage'
  | 'ServerScriptService'
  | 'StarterPlayerScripts'
  | 'StarterCharacterScripts';

export type RobloxScriptClassName =
  | 'Script'
  | 'LocalScript'
  | 'ModuleScript'
  | 'RemoteEvent'
  | 'BindableEvent'
  | 'Folder'
  | 'StringValue'
  | 'NumberValue'
  | 'BoolValue'
  | 'ObjectValue';

export type RobloxScriptRunContext = 'Legacy' | 'Server' | 'Client';

export interface StudioScriptNode {
  id: string;
  name: string;
  className: RobloxScriptClassName;
  service: RobloxServiceLocation;
  parentFolder?: string;
  source: string;
  disabled: boolean;
  runContext?: RobloxScriptRunContext;
  value?: string | number | boolean;
}

export const ROBLOX_SERVICE_LOCATIONS: { id: RobloxServiceLocation; label: string; shortLabel: string }[] = [
  { id: 'WorkspaceModel', label: 'Workspace / Package', shortLabel: 'Workspace' },
  { id: 'ReplicatedStorage', label: 'ReplicatedStorage', shortLabel: 'Replicated' },
  { id: 'ServerScriptService', label: 'ServerScriptService', shortLabel: 'ServerScript' },
  { id: 'StarterPlayerScripts', label: 'StarterPlayerScripts', shortLabel: 'PlayerScripts' },
  { id: 'StarterCharacterScripts', label: 'StarterCharacterScripts', shortLabel: 'CharScripts' },
];

export type CameraPreset = 'perspective' | 'front' | 'top' | 'side';

export type ExportScaleMode = 'studs' | 'meters';

export type RobloxEasingStyle =
  | 'Linear'
  | 'Sine'
  | 'Quad'
  | 'Cubic'
  | 'Back'
  | 'Bounce'
  | 'Elastic'
  | 'Constant';

export type RobloxEasingDirection = 'In' | 'Out' | 'InOut';

export const ROBLOX_EASING_STYLES: RobloxEasingStyle[] = [
  'Linear',
  'Sine',
  'Quad',
  'Cubic',
  'Back',
  'Bounce',
  'Elastic',
  'Constant',
];

export const ROBLOX_EASING_DIRECTIONS: RobloxEasingDirection[] = ['In', 'Out', 'InOut'];

export type RobloxAnimationPriority =
  | 'Core'
  | 'Idle'
  | 'Movement'
  | 'Action'
  | 'Action2'
  | 'Action3'
  | 'Action4';

export const ROBLOX_ANIMATION_PRIORITIES: RobloxAnimationPriority[] = [
  'Core',
  'Idle',
  'Movement',
  'Action',
  'Action2',
  'Action3',
  'Action4',
];

export const ROBLOX_ANIMATION_PRIORITY_TOKENS: Record<RobloxAnimationPriority, number> = {
  Idle: 0,
  Movement: 2,
  Action: 4,
  Action2: 5,
  Action3: 6,
  Action4: 7,
  Core: 1000,
};

export type AnimationSampleMode = 'keyframes' | 'resampled';

export type MarkerEffectAction = 'emit' | 'enable' | 'disable' | 'pulse';

export interface StudioAttachmentNode {
  id: string;
  name: string;
  /** Local offset relative to host part center in Studs [X, Y, Z] */
  position: [number, number, number];
  /** Local Euler XYZ degrees */
  rotation: [number, number, number];
}

export interface StudioParticleEmitterEffect {
  id: string;
  kind: 'ParticleEmitter';
  name: string;
  attachmentId?: string | null;
  enabled: boolean;
  color: string;
  endColor: string;
  sizeStart: number;
  sizeEnd: number;
  rate: number;
  lifetime: [number, number];
  speed: [number, number];
  spreadAngle: number;
  acceleration: [number, number, number];
  lightEmission: number;
  transparencyStart: number;
  transparencyEnd: number;
  textureId: string;
  burstCount: number;
}

export interface StudioTrailEffect {
  id: string;
  kind: 'Trail';
  name: string;
  attachment0Id: string;
  attachment1Id: string;
  enabled: boolean;
  color: string;
  endColor: string;
  lifetime: number;
  minLength: number;
  widthScaleStart: number;
  widthScaleEnd: number;
  transparencyStart: number;
  transparencyEnd: number;
  lightEmission: number;
}

export interface StudioPointLightEffect {
  id: string;
  kind: 'PointLight';
  name: string;
  attachmentId?: string | null;
  enabled: boolean;
  color: string;
  brightness: number;
  range: number;
  shadows: boolean;
}

export type StudioEffectNode =
  | StudioParticleEmitterEffect
  | StudioTrailEffect
  | StudioPointLightEffect;

export interface StudioSoundNode {
  id: string;
  name: string;
  soundId: string;
  volume: number;
  playbackSpeed: number;
  looped: boolean;
  rollOffMaxDistance: number;
}

export interface AnimationEventMarker {
  id: string;
  time: number;
  name: string;
  value: string;
  effectId?: string;
  effectAction?: MarkerEffectAction;
  burstCount?: number;
  soundId?: string;
}

export interface PartPoseKeyframe {
  id: string;
  /** Timestamp in seconds (>= 0) */
  time: number;
  easingStyle: RobloxEasingStyle;
  easingDirection: RobloxEasingDirection;
  /** Pose blend weight 0..1 (Roblox Pose.Weight) */
  weight?: number;
  /** Local position relative to parent (or world if parentId is null) */
  position?: [number, number, number];
  /** Local Euler XYZ degrees relative to parent */
  rotation?: [number, number, number];
  /** Dimensions in Roblox Studs */
  size?: [number, number, number];
  /** Hex color "#RRGGBB" */
  color?: string;
  /** Transparency 0..1 */
  transparency?: number;
}

export interface AnimationTrack {
  partId: string;
  keyframes: PartPoseKeyframe[];
}

export interface AnimationClip {
  id: string;
  name: string;
  duration: number;
  fps: 15 | 30 | 60;
  loop: boolean;
  priority?: RobloxAnimationPriority;
  sampleMode?: AnimationSampleMode;
  fadeTime?: number;
  defaultWeight?: number;
  markers?: AnimationEventMarker[];
  tracks: AnimationTrack[];
}

export interface StudioPartNode {
  id: string;
  name: string;
  shape: PartShape;
  /** Optional parent part ID for Motor6D hierarchy (null/undefined = root/free part) */
  parentId?: string | null;
  /** Local joint pivot offset in Studs relative to part center */
  pivotOffset?: [number, number, number];
  /** Center position in Roblox Studs [X, Y, Z] (local to parentId if parented) */
  position: [number, number, number];
  /** Euler XYZ rotation in degrees [X, Y, Z] (local to parentId if parented) */
  rotation: [number, number, number];
  /** Dimensions in Roblox Studs [X, Y, Z] */
  size: [number, number, number];
  /** Hex color string e.g. "#3B82F6" */
  color: string;
  material: RobloxMaterial;
  /** 0 = opaque, 1 = invisible (Roblox BasePart.Transparency) */
  transparency: number;
  /** 0..1 (Roblox BasePart.Reflectance) */
  reflectance: number;
  anchored: boolean;
  canCollide: boolean;
  castShadow: boolean;
  visible: boolean;
  /** Roblox Attachments anchored on this part */
  attachments?: StudioAttachmentNode[];
  /** Roblox ParticleEmitters, Trails, and PointLights parented to this part/attachments */
  effects?: StudioEffectNode[];
  /** Roblox Sound effects associated with this part (exported into Package Audio folder) */
  sounds?: StudioSoundNode[];
}

export interface StudioSceneModel {
  name: string;
  primaryPartId: string | null;
  parts: StudioPartNode[];
  animations?: AnimationClip[];
  scripts?: StudioScriptNode[];
}

export interface MaterialSpec {
  id: RobloxMaterial;
  label: string;
  /** Official Roblox Enum.Material integer token for .rbxmx */
  robloxEnumId: number;
  roughness: number;
  metalness: number;
  emissiveIntensity: number;
  clearcoat?: number;
  opacityMultiplier?: number;
  hasProceduralMap?: boolean;
}

export const ROBLOX_MATERIAL_SPECS: Record<RobloxMaterial, MaterialSpec> = {
  SmoothPlastic: {
    id: 'SmoothPlastic',
    label: 'SmoothPlastic',
    robloxEnumId: 272,
    roughness: 0.42,
    metalness: 0.04,
    emissiveIntensity: 0,
  },
  Plastic: {
    id: 'Plastic',
    label: 'Plastic (Studded)',
    robloxEnumId: 256,
    roughness: 0.62,
    metalness: 0.02,
    emissiveIntensity: 0,
    hasProceduralMap: true,
  },
  Metal: {
    id: 'Metal',
    label: 'Metal',
    robloxEnumId: 1088,
    roughness: 0.24,
    metalness: 0.88,
    emissiveIntensity: 0,
    hasProceduralMap: true,
  },
  Neon: {
    id: 'Neon',
    label: 'Neon',
    robloxEnumId: 288,
    roughness: 0.2,
    metalness: 0.0,
    emissiveIntensity: 1.45,
  },
  Glass: {
    id: 'Glass',
    label: 'Glass',
    robloxEnumId: 1568,
    roughness: 0.08,
    metalness: 0.08,
    emissiveIntensity: 0,
    clearcoat: 1.0,
    opacityMultiplier: 0.65,
  },
  Wood: {
    id: 'Wood',
    label: 'Wood',
    robloxEnumId: 512,
    roughness: 0.78,
    metalness: 0.0,
    emissiveIntensity: 0,
    hasProceduralMap: true,
  },
  Granite: {
    id: 'Granite',
    label: 'Granite',
    robloxEnumId: 832,
    roughness: 0.72,
    metalness: 0.05,
    emissiveIntensity: 0,
    hasProceduralMap: true,
  },
  Cobblestone: {
    id: 'Cobblestone',
    label: 'Cobblestone',
    robloxEnumId: 880,
    roughness: 0.88,
    metalness: 0.02,
    emissiveIntensity: 0,
    hasProceduralMap: true,
  },
  DiamondPlate: {
    id: 'DiamondPlate',
    label: 'DiamondPlate',
    robloxEnumId: 1056,
    roughness: 0.34,
    metalness: 0.82,
    emissiveIntensity: 0,
    hasProceduralMap: true,
  },
  CorrodedMetal: {
    id: 'CorrodedMetal',
    label: 'CorrodedMetal',
    robloxEnumId: 1040,
    roughness: 0.74,
    metalness: 0.65,
    emissiveIntensity: 0,
    hasProceduralMap: true,
  },
  ForceField: {
    id: 'ForceField',
    label: 'ForceField',
    robloxEnumId: 1584,
    roughness: 0.15,
    metalness: 0.1,
    emissiveIntensity: 0.7,
    opacityMultiplier: 0.38,
  },
};

export interface ShapeCatalogEntry {
  shape: PartShape;
  label: string;
  isNativeRbxPart: boolean;
  defaultSize: [number, number, number];
}

export const SHAPE_CATALOG: ShapeCatalogEntry[] = [
  { shape: 'Block', label: 'Block', isNativeRbxPart: true, defaultSize: [2, 2, 2] },
  { shape: 'Wedge', label: 'Wedge', isNativeRbxPart: true, defaultSize: [2, 2, 3] },
  { shape: 'Cylinder', label: 'Cylinder', isNativeRbxPart: true, defaultSize: [2, 3, 2] },
  { shape: 'Ball', label: 'Sphere', isNativeRbxPart: true, defaultSize: [2, 2, 2] },
  { shape: 'CornerWedge', label: 'Corner Wedge', isNativeRbxPart: true, defaultSize: [2, 2, 2] },
  { shape: 'HexPrism', label: 'Hex Core', isNativeRbxPart: false, defaultSize: [2.4, 2, 2.4] },
  { shape: 'BevelPlate', label: 'Bevel Armor', isNativeRbxPart: false, defaultSize: [3, 0.8, 3] },
  { shape: 'Archway', label: 'Arch Frame', isNativeRbxPart: false, defaultSize: [4, 3.5, 1.2] },
  { shape: 'PipeElbow', label: 'Conduit Pipe', isNativeRbxPart: false, defaultSize: [2, 2, 1] },
  { shape: 'LatheCone', label: 'Thruster Nozzle', isNativeRbxPart: false, defaultSize: [2, 2.2, 2] },
];

export const ROBLOX_COLOR_PALETTE: { name: string; hex: string }[] = [
  { name: 'Institutional White', hex: '#F8FAFC' },
  { name: 'Medium Stone Grey', hex: '#A3A2A5' },
  { name: 'Dark Stone Grey', hex: '#635F62' },
  { name: 'Smoky Grey', hex: '#393E46' },
  { name: 'Really Black', hex: '#181A1F' },
  { name: 'Bright Red', hex: '#DC2626' },
  { name: 'Deep Orange', hex: '#EA580C' },
  { name: 'Bright Yellow', hex: '#EAB308' },
  { name: 'Earth Green', hex: '#16A34A' },
  { name: 'Cyan', hex: '#06B6D4' },
  { name: 'Electric Blue', hex: '#2563EB' },
  { name: 'Royal Purple', hex: '#7C3AED' },
  { name: 'Reddish Brown', hex: '#7C4A2D' },
  { name: 'Brick Yellow', hex: '#D7C59A' },
  { name: 'Cool Bronze', hex: '#9A7B56' },
  { name: 'Steel Teal', hex: '#2E6F7E' },
];

export interface RobloxValidationIssue {
  severity: 'info' | 'warning' | 'error';
  message: string;
}

export interface RobloxValidationReport {
  partCount: number;
  visiblePartCount: number;
  totalTriangles: number;
  nativeRbxPartCount: number;
  customMeshPartCount: number;
  jointCount: number;
  animationClipCount: number;
  attachmentCount: number;
  effectCount: number;
  soundCount: number;
  markerCount: number;
  scriptCount: number;
  boundingSizeStuds: [number, number, number];
  r15HeightRatio: number;
  rbxmxReady: boolean;
  meshImportReady: boolean;
  issues: RobloxValidationIssue[];
}
