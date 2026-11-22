import { AnimationClip, PartShape, StudioPartNode } from './robloxTypes';
import type { ModelPreset } from './presets';

function dragonPart(
  id: string,
  name: string,
  shape: PartShape,
  position: [number, number, number],
  size: [number, number, number],
  color: string,
  material: StudioPartNode['material'],
  extra?: Partial<StudioPartNode>
): StudioPartNode {
  return {
    id,
    name,
    shape,
    parentId: null,
    pivotOffset: [0, 0, 0],
    position,
    rotation: [0, 0, 0],
    size,
    color,
    material,
    transparency: 0,
    reflectance: 0,
    anchored: extra?.parentId ? false : true,
    canCollide: true,
    castShadow: true,
    visible: true,
    ...extra,
  };
}

// Micro-block Jade Dragon Color Palette (matched to reference artwork)
const JADE = '#116149';
const JADE_BRIGHT = '#16805E';
const CREAM = '#EFE3C6';
const GOLD_CREAM = '#FDE68A';
const AMBER_GLASS = '#FDE047';
const RUBY_GLASS = '#EF4444';
const TEETH_WHITE = '#F8FAFC';
const TONGUE_RED = '#DC2626';
const EYE_GLOW = '#F97316';
const PEARL_ORANGE = '#F97316';

const dragonParts: StudioPartNode[] = [
  // 1. Root Pelvis & S-Curved Upright Torso
  dragonPart('d_pelvis', 'PelvisCore', 'Block', [0, 1.85, -0.75], [1.78, 1.32, 1.62], JADE, 'Plastic', {
    rotation: [10, 0, 0],
    anchored: true,
  }),
  dragonPart('d_pelvis_belly', 'PelvisBelly', 'Block', [0, -0.14, 0.72], [1.3, 1.04, 0.34], CREAM, 'Plastic', {
    parentId: 'd_pelvis',
  }),
  dragonPart('d_pelvis_fin', 'PelvisSpineFin', 'Wedge', [0, 0.24, -0.92], [0.32, 0.86, 0.9], RUBY_GLASS, 'Glass', {
    parentId: 'd_pelvis',
    rotation: [-78, 180, 0],
    transparency: 0.06,
    reflectance: 0.15,
  }),

  dragonPart('d_lower_torso', 'LowerTorso', 'Block', [0, 1.15, 0.1], [1.84, 1.28, 1.54], JADE, 'Plastic', {
    parentId: 'd_pelvis',
    rotation: [-16, 0, 0],
    pivotOffset: [0, -0.56, 0],
  }),
  dragonPart('d_lower_belly', 'LowerTorsoBelly', 'Block', [0, 0, 0.68], [1.34, 1.14, 0.34], CREAM, 'Plastic', {
    parentId: 'd_lower_torso',
  }),
  dragonPart('d_lower_fin', 'LowerTorsoFin', 'Wedge', [0, 0.12, -0.88], [0.32, 0.88, 0.88], RUBY_GLASS, 'Glass', {
    parentId: 'd_lower_torso',
    rotation: [-82, 180, 0],
    transparency: 0.06,
    reflectance: 0.15,
  }),

  dragonPart('d_mid_spine', 'MidTorso', 'Block', [0, 1.16, 0.08], [1.94, 1.32, 1.58], JADE, 'Plastic', {
    parentId: 'd_lower_torso',
    rotation: [-8, 0, 0],
    pivotOffset: [0, -0.54, 0],
  }),
  dragonPart('d_mid_belly', 'MidBellyPlate', 'Block', [0, 0, 0.72], [1.42, 1.18, 0.36], CREAM, 'Plastic', {
    parentId: 'd_mid_spine',
  }),
  dragonPart('d_mid_fin', 'MidSpineFin', 'Wedge', [0, 0.12, -0.9], [0.34, 0.92, 0.92], RUBY_GLASS, 'Glass', {
    parentId: 'd_mid_spine',
    rotation: [-84, 180, 0],
    transparency: 0.06,
    reflectance: 0.15,
  }),

  dragonPart('d_chest', 'ChestCore', 'Block', [0, 1.22, 0.05], [2.04, 1.42, 1.62], JADE, 'Plastic', {
    parentId: 'd_mid_spine',
    rotation: [10, 0, 0],
    pivotOffset: [0, -0.58, 0],
    sounds: [
      {
        id: 'snd_wing_whoosh',
        name: 'SerpentWingWhoosh',
        soundId: 'rbxassetid://911342077',
        volume: 0.65,
        playbackSpeed: 0.9,
        looped: false,
        rollOffMaxDistance: 70,
      },
    ],
  }),
  dragonPart('d_chest_belly', 'ChestBellyArmor', 'Block', [0, 0.02, 0.74], [1.5, 1.26, 0.38], CREAM, 'Plastic', {
    parentId: 'd_chest',
  }),
  dragonPart('d_chest_fin', 'ChestSpineFin', 'Wedge', [0, 0.14, -0.92], [0.34, 0.94, 0.94], RUBY_GLASS, 'Glass', {
    parentId: 'd_chest',
    rotation: [-80, 180, 0],
    transparency: 0.06,
    reflectance: 0.15,
  }),

  // 2. Arched Serpentine Neck
  dragonPart('d_neck_low', 'NeckLower', 'Block', [0, 1.2, 0.06], [1.54, 1.22, 1.4], JADE, 'Plastic', {
    parentId: 'd_chest',
    rotation: [22, 0, 0],
    pivotOffset: [0, -0.54, 0],
  }),
  dragonPart('d_neck_low_belly', 'NeckLowerBelly', 'Block', [0, 0, 0.64], [1.1, 1.1, 0.32], CREAM, 'Plastic', {
    parentId: 'd_neck_low',
  }),
  dragonPart('d_neck_low_fin', 'NeckLowerFin', 'Wedge', [0, 0.12, -0.82], [0.3, 0.88, 0.88], RUBY_GLASS, 'Glass', {
    parentId: 'd_neck_low',
    rotation: [-80, 180, 0],
    transparency: 0.06,
    reflectance: 0.15,
  }),

  dragonPart('d_neck_up', 'NeckUpper', 'Block', [0, 1.08, 0.08], [1.36, 1.12, 1.3], JADE, 'Plastic', {
    parentId: 'd_neck_low',
    rotation: [18, 0, 0],
    pivotOffset: [0, -0.5, 0],
  }),
  dragonPart('d_neck_up_belly', 'NeckUpperBelly', 'Block', [0, 0, 0.59], [0.96, 1.0, 0.3], CREAM, 'Plastic', {
    parentId: 'd_neck_up',
  }),
  dragonPart('d_neck_up_fin', 'NeckUpperFin', 'Wedge', [0, 0.14, -0.78], [0.28, 0.86, 0.84], RUBY_GLASS, 'Glass', {
    parentId: 'd_neck_up',
    rotation: [-78, 180, 0],
    transparency: 0.06,
    reflectance: 0.15,
  }),

  // 3. Sculpted Dragon Head, Stepped Antlers, Curved Whiskers, Fangs & Open Crimson Jaw
  dragonPart('d_head', 'DragonSkull', 'Block', [0, 0.82, 0.42], [1.66, 0.9, 1.6], JADE, 'Plastic', {
    parentId: 'd_neck_up',
    rotation: [-30, 0, 0],
    pivotOffset: [0, -0.32, -0.45],
  }),
  dragonPart('d_crown_fin', 'CrownSpineFin', 'Wedge', [0, 0.54, -0.52], [0.3, 0.72, 0.8], RUBY_GLASS, 'Glass', {
    parentId: 'd_head',
    rotation: [-55, 180, 0],
    transparency: 0.06,
    reflectance: 0.15,
  }),
  dragonPart('d_snout', 'UpperSnout', 'Block', [0, -0.1, 1.16], [1.24, 0.54, 1.14], JADE, 'Plastic', {
    parentId: 'd_head',
    attachments: [
      {
        id: 'att_mouth_emitter',
        name: 'MouthEmitter',
        position: [0, -0.15, 0.62],
        rotation: [0, 0, 0],
      },
    ],
    effects: [
      {
        id: 'fx_breath_particles',
        kind: 'ParticleEmitter',
        name: 'DragonBreathParticles',
        attachmentId: 'att_mouth_emitter',
        enabled: false,
        color: '#34D399',
        endColor: '#EA580C',
        sizeStart: 0.42,
        sizeEnd: 0.98,
        rate: 48,
        lifetime: [0.45, 0.85],
        speed: [5.5, 9.5],
        spreadAngle: 18,
        acceleration: [0, 1.4, 0],
        lightEmission: 0.9,
        transparencyStart: 0.1,
        transparencyEnd: 0.95,
        textureId: 'rbxassetid://241685484',
        burstCount: 36,
      },
      {
        id: 'fx_mouth_light',
        kind: 'PointLight',
        name: 'MouthFireLight',
        attachmentId: 'att_mouth_emitter',
        enabled: false,
        color: '#F59E0B',
        brightness: 2.8,
        range: 14,
        shadows: false,
      },
    ],
    sounds: [
      {
        id: 'snd_dragon_roar',
        name: 'DragonRoar',
        soundId: 'rbxassetid://138087186',
        volume: 0.85,
        playbackSpeed: 0.95,
        looped: false,
        rollOffMaxDistance: 80,
      },
      {
        id: 'snd_fire_breath',
        name: 'FireBreathStream',
        soundId: 'rbxassetid://9118823101',
        volume: 0.75,
        playbackSpeed: 1.0,
        looped: false,
        rollOffMaxDistance: 75,
      },
    ],
  }),
  dragonPart('d_snout_tip', 'SnoutTip', 'Block', [0, -0.1, 0.66], [1.02, 0.42, 0.34], JADE_BRIGHT, 'Plastic', {
    parentId: 'd_snout',
  }),
  dragonPart('d_nostril_l', 'Nostril_L', 'Block', [-0.34, 0.3, 0.4], [0.28, 0.24, 0.3], JADE_BRIGHT, 'Plastic', {
    parentId: 'd_snout',
  }),
  dragonPart('d_nostril_r', 'Nostril_R', 'Block', [0.34, 0.3, 0.4], [0.28, 0.24, 0.3], JADE_BRIGHT, 'Plastic', {
    parentId: 'd_snout',
  }),
  dragonPart('d_brow_l', 'BrowCrest_L', 'Block', [-0.56, 0.48, 0.36], [0.5, 0.26, 0.64], GOLD_CREAM, 'Plastic', {
    parentId: 'd_head',
    rotation: [0, 0, 10],
  }),
  dragonPart('d_brow_r', 'BrowCrest_R', 'Block', [0.56, 0.48, 0.36], [0.5, 0.26, 0.64], GOLD_CREAM, 'Plastic', {
    parentId: 'd_head',
    rotation: [0, 0, -10],
  }),
  dragonPart('d_eye_l', 'DragonEye_L', 'Block', [-0.82, 0.14, 0.42], [0.16, 0.26, 0.34], EYE_GLOW, 'Neon', {
    parentId: 'd_head',
  }),
  dragonPart('d_eye_r', 'DragonEye_R', 'Block', [0.82, 0.14, 0.42], [0.16, 0.26, 0.34], EYE_GLOW, 'Neon', {
    parentId: 'd_head',
  }),

  // Stepped 2-block swept golden antlers
  dragonPart('d_horn_l', 'AntlerBase_L', 'Block', [-0.46, 0.68, -0.4], [0.32, 0.74, 0.4], GOLD_CREAM, 'Plastic', {
    parentId: 'd_head',
    rotation: [-36, 0, 14],
  }),
  dragonPart('d_horn_tip_l', 'AntlerTip_L', 'Block', [0, 0.5, -0.22], [0.26, 0.82, 0.3], GOLD_CREAM, 'Plastic', {
    parentId: 'd_horn_l',
    rotation: [-16, 0, 0],
  }),
  dragonPart('d_horn_r', 'AntlerBase_R', 'Block', [0.46, 0.68, -0.4], [0.32, 0.74, 0.4], GOLD_CREAM, 'Plastic', {
    parentId: 'd_head',
    rotation: [-36, 0, -14],
  }),
  dragonPart('d_horn_tip_r', 'AntlerTip_R', 'Block', [0, 0.5, -0.22], [0.26, 0.82, 0.3], GOLD_CREAM, 'Plastic', {
    parentId: 'd_horn_r',
    rotation: [-16, 0, 0],
  }),

  // J-Curved Upward Snout Whiskers + Swept Cheek Whiskers (Glass)
  dragonPart('d_whisker_l', 'WhiskerBase_L', 'Block', [-0.82, 0.08, 0.38], [0.9, 0.16, 0.18], AMBER_GLASS, 'Glass', {
    parentId: 'd_snout',
    rotation: [10, -18, -12],
    pivotOffset: [0.35, 0, 0],
    transparency: 0.1,
    reflectance: 0.2,
  }),
  dragonPart('d_whisker_tip_l', 'WhiskerTip_L', 'Block', [-0.42, 0.4, 0.06], [0.16, 0.78, 0.16], AMBER_GLASS, 'Glass', {
    parentId: 'd_whisker_l',
    rotation: [0, 0, 14],
    transparency: 0.1,
    reflectance: 0.2,
  }),
  dragonPart('d_whisker_r', 'WhiskerBase_R', 'Block', [0.82, 0.08, 0.38], [0.9, 0.16, 0.18], AMBER_GLASS, 'Glass', {
    parentId: 'd_snout',
    rotation: [10, 18, 12],
    pivotOffset: [-0.35, 0, 0],
    transparency: 0.1,
    reflectance: 0.2,
  }),
  dragonPart('d_whisker_tip_r', 'WhiskerTip_R', 'Block', [0.42, 0.4, 0.06], [0.16, 0.78, 0.16], AMBER_GLASS, 'Glass', {
    parentId: 'd_whisker_r',
    rotation: [0, 0, -14],
    transparency: 0.1,
    reflectance: 0.2,
  }),
  dragonPart('d_cheek_whisker_l', 'CheekWhisker_L', 'Block', [-0.88, -0.05, -0.26], [0.18, 0.18, 1.1], AMBER_GLASS, 'Glass', {
    parentId: 'd_head',
    rotation: [12, -26, 0],
    transparency: 0.1,
    reflectance: 0.2,
  }),
  dragonPart('d_cheek_whisker_r', 'CheekWhisker_R', 'Block', [0.88, -0.05, -0.26], [0.18, 0.18, 1.1], AMBER_GLASS, 'Glass', {
    parentId: 'd_head',
    rotation: [12, 26, 0],
    transparency: 0.1,
    reflectance: 0.2,
  }),

  // Discrete Upper Fangs & Cheek Teeth
  dragonPart('d_upper_fang_l', 'UpperFang_L', 'Block', [-0.45, -0.35, 0.48], [0.18, 0.26, 0.18], TEETH_WHITE, 'SmoothPlastic', {
    parentId: 'd_snout',
  }),
  dragonPart('d_upper_fang_r', 'UpperFang_R', 'Block', [0.45, -0.35, 0.48], [0.18, 0.26, 0.18], TEETH_WHITE, 'SmoothPlastic', {
    parentId: 'd_snout',
  }),
  dragonPart('d_upper_teeth_l', 'UpperTeeth_L', 'Block', [-0.46, -0.32, -0.06], [0.18, 0.18, 0.7], TEETH_WHITE, 'SmoothPlastic', {
    parentId: 'd_snout',
  }),
  dragonPart('d_upper_teeth_r', 'UpperTeeth_R', 'Block', [0.46, -0.32, -0.06], [0.18, 0.18, 0.7], TEETH_WHITE, 'SmoothPlastic', {
    parentId: 'd_snout',
  }),

  // Articulated Lower Jaw, Crimson Tongue & Lower Fangs
  dragonPart('d_jaw', 'LowerJaw', 'Block', [0, -0.52, 0.6], [1.14, 0.34, 1.54], JADE, 'Plastic', {
    parentId: 'd_head',
    rotation: [28, 0, 0],
    pivotOffset: [0, 0.14, -0.68],
  }),
  dragonPart('d_tongue', 'MouthCore', 'Block', [0, 0.2, 0.04], [0.7, 0.16, 1.14], TONGUE_RED, 'SmoothPlastic', {
    parentId: 'd_jaw',
  }),
  dragonPart('d_lower_fang_l', 'LowerFang_L', 'Block', [-0.4, 0.26, 0.6], [0.16, 0.22, 0.16], TEETH_WHITE, 'SmoothPlastic', {
    parentId: 'd_jaw',
  }),
  dragonPart('d_lower_fang_r', 'LowerFang_R', 'Block', [0.4, 0.26, 0.6], [0.16, 0.22, 0.16], TEETH_WHITE, 'SmoothPlastic', {
    parentId: 'd_jaw',
  }),
  dragonPart('d_lower_teeth_l', 'LowerTeeth_L', 'Block', [-0.42, 0.22, 0.08], [0.16, 0.16, 0.66], TEETH_WHITE, 'SmoothPlastic', {
    parentId: 'd_jaw',
  }),
  dragonPart('d_lower_teeth_r', 'LowerTeeth_R', 'Block', [0.42, 0.22, 0.08], [0.16, 0.16, 0.66], TEETH_WHITE, 'SmoothPlastic', {
    parentId: 'd_jaw',
  }),

  // Rigged Translucent Breath & Flame FX (hidden at rest, animated via Size/Color/Transparency)
  dragonPart('d_breath_core', 'BreathCore', 'Ball', [0, -0.24, 1.35], [0.45, 0.45, 0.6], '#FEF08A', 'Neon', {
    parentId: 'd_head',
    transparency: 1,
    canCollide: false,
    castShadow: false,
  }),
  dragonPart('d_breath_inner', 'BreathFlameInner', 'LatheCone', [0, -0.26, 2.3], [0.45, 1.2, 0.45], '#34D399', 'Neon', {
    parentId: 'd_head',
    rotation: [-90, 0, 0],
    transparency: 1,
    canCollide: false,
    castShadow: false,
  }),
  dragonPart('d_breath_outer', 'BreathFlameOuter', 'LatheCone', [0, -0.26, 2.9], [0.8, 1.8, 0.8], '#EA580C', 'Glass', {
    parentId: 'd_head',
    rotation: [-90, 0, 0],
    transparency: 1,
    canCollide: false,
    castShadow: false,
  }),

  // 4. Four Clawed Limbs & Glowing Dragon Pearl
  dragonPart('d_arm_l', 'FrontArm_L', 'Block', [-1.18, -0.14, 0.52], [0.56, 0.92, 0.72], JADE, 'Plastic', {
    parentId: 'd_chest',
    rotation: [26, 20, -18],
    pivotOffset: [0.25, 0.24, -0.15],
  }),
  dragonPart('d_hand_l', 'FrontHand_L', 'Block', [-0.04, -0.5, 0.36], [0.52, 0.32, 0.5], JADE_BRIGHT, 'Plastic', {
    parentId: 'd_arm_l',
    rotation: [16, 0, 0],
  }),
  dragonPart('d_claw_la', 'FrontClawA_L', 'Block', [-0.16, -0.05, 0.34], [0.16, 0.2, 0.34], GOLD_CREAM, 'SmoothPlastic', {
    parentId: 'd_hand_l',
  }),
  dragonPart('d_claw_lb', 'FrontClawB_L', 'Block', [0.16, -0.05, 0.34], [0.16, 0.2, 0.34], GOLD_CREAM, 'SmoothPlastic', {
    parentId: 'd_hand_l',
  }),

  dragonPart('d_arm_r', 'FrontArm_R', 'Block', [1.18, -0.1, 0.58], [0.56, 0.92, 0.72], JADE, 'Plastic', {
    parentId: 'd_chest',
    rotation: [18, -28, 20],
    pivotOffset: [-0.25, 0.24, -0.15],
  }),
  dragonPart('d_hand_r', 'FrontHand_R', 'Block', [0.04, -0.48, 0.42], [0.52, 0.32, 0.5], JADE_BRIGHT, 'Plastic', {
    parentId: 'd_arm_r',
    rotation: [10, -18, 0],
    attachments: [
      { id: 'att_claw_a', name: 'ClawEdge_A', position: [-0.24, -0.04, 0.52], rotation: [0, 0, 0] },
      { id: 'att_claw_b', name: 'ClawEdge_B', position: [0.24, -0.04, 0.52], rotation: [0, 0, 0] },
    ],
    effects: [
      {
        id: 'fx_claw_trail',
        kind: 'Trail',
        name: 'ClawSlashTrail',
        attachment0Id: 'att_claw_a',
        attachment1Id: 'att_claw_b',
        enabled: false,
        color: '#FEF08A',
        endColor: '#F97316',
        lifetime: 0.35,
        minLength: 0.1,
        widthScaleStart: 1.0,
        widthScaleEnd: 0.0,
        transparencyStart: 0.1,
        transparencyEnd: 1.0,
        lightEmission: 0.9,
      },
    ],
    sounds: [
      {
        id: 'snd_claw_impact',
        name: 'ClawStrikeImpact',
        soundId: 'rbxassetid://9114221580',
        volume: 0.9,
        playbackSpeed: 1.05,
        looped: false,
        rollOffMaxDistance: 65,
      },
    ],
  }),
  dragonPart('d_claw_ra', 'FrontClawA_R', 'Block', [-0.16, -0.04, 0.36], [0.16, 0.2, 0.34], GOLD_CREAM, 'SmoothPlastic', {
    parentId: 'd_hand_r',
  }),
  dragonPart('d_claw_rb', 'FrontClawB_R', 'Block', [0.16, -0.04, 0.36], [0.16, 0.2, 0.34], GOLD_CREAM, 'SmoothPlastic', {
    parentId: 'd_hand_r',
  }),
  dragonPart('d_pearl', 'DragonPearl', 'Ball', [-0.1, 0.14, 0.44], [0.76, 0.76, 0.76], PEARL_ORANGE, 'Neon', {
    parentId: 'd_hand_r',
    reflectance: 0.2,
    attachments: [
      {
        id: 'att_pearl_core',
        name: 'PearlCore',
        position: [0, 0, 0],
        rotation: [0, 0, 0],
      },
    ],
    effects: [
      {
        id: 'fx_pearl_sparks',
        kind: 'ParticleEmitter',
        name: 'PearlAuraSparks',
        attachmentId: 'att_pearl_core',
        enabled: true,
        color: '#FEF08A',
        endColor: '#F97316',
        sizeStart: 0.18,
        sizeEnd: 0.04,
        rate: 12,
        lifetime: [0.6, 1.2],
        speed: [0.6, 1.6],
        spreadAngle: 180,
        acceleration: [0, 0.8, 0],
        lightEmission: 1.0,
        transparencyStart: 0.15,
        transparencyEnd: 1.0,
        textureId: 'rbxassetid://243660364',
        burstCount: 22,
      },
      {
        id: 'fx_pearl_glow',
        kind: 'PointLight',
        name: 'DragonPearlGlow',
        attachmentId: 'att_pearl_core',
        enabled: true,
        color: '#F97316',
        brightness: 2.2,
        range: 12,
        shadows: false,
      },
    ],
  }),

  dragonPart('d_leg_bl', 'HindLeg_L', 'Block', [-1.1, -0.26, -0.06], [0.58, 0.96, 0.76], JADE, 'Plastic', {
    parentId: 'd_pelvis',
    rotation: [16, 18, -12],
    pivotOffset: [0.25, 0.26, 0],
  }),
  dragonPart('d_foot_bl', 'HindFoot_L', 'Block', [0, -0.52, 0.32], [0.52, 0.32, 0.5], JADE_BRIGHT, 'Plastic', {
    parentId: 'd_leg_bl',
  }),
  dragonPart('d_claw_bla', 'HindClawA_L', 'Block', [-0.16, -0.04, 0.34], [0.16, 0.18, 0.32], GOLD_CREAM, 'SmoothPlastic', {
    parentId: 'd_foot_bl',
  }),
  dragonPart('d_claw_blb', 'HindClawB_L', 'Block', [0.16, -0.04, 0.34], [0.16, 0.18, 0.32], GOLD_CREAM, 'SmoothPlastic', {
    parentId: 'd_foot_bl',
  }),

  dragonPart('d_leg_br', 'HindLeg_R', 'Block', [1.1, -0.26, -0.06], [0.58, 0.96, 0.76], JADE, 'Plastic', {
    parentId: 'd_pelvis',
    rotation: [16, -18, 12],
    pivotOffset: [-0.25, 0.26, 0],
  }),
  dragonPart('d_foot_br', 'HindFoot_R', 'Block', [0, -0.52, 0.32], [0.52, 0.32, 0.5], JADE_BRIGHT, 'Plastic', {
    parentId: 'd_leg_br',
  }),
  dragonPart('d_claw_bra', 'HindClawA_R', 'Block', [-0.16, -0.04, 0.34], [0.16, 0.18, 0.32], GOLD_CREAM, 'SmoothPlastic', {
    parentId: 'd_foot_br',
  }),
  dragonPart('d_claw_brb', 'HindClawB_R', 'Block', [0.16, -0.04, 0.34], [0.16, 0.18, 0.32], GOLD_CREAM, 'SmoothPlastic', {
    parentId: 'd_foot_br',
  }),

  // 5. Coiled Serpentine Tail & 4-Ray Jade-Tipped Fan
  dragonPart('d_tail_1', 'TailBase', 'Block', [-0.26, -0.56, -1.46], [1.5, 1.02, 1.7], JADE, 'Plastic', {
    parentId: 'd_pelvis',
    rotation: [-16, -24, 0],
    pivotOffset: [0.12, 0.1, 0.7],
  }),
  dragonPart('d_tail_1_belly', 'TailBaseBelly', 'Block', [0, -0.44, 0], [1.15, 0.28, 1.56], CREAM, 'Plastic', {
    parentId: 'd_tail_1',
  }),
  dragonPart('d_tail_1_fin', 'TailBaseFin', 'Wedge', [0, 0.8, 0], [0.3, 0.74, 1.12], RUBY_GLASS, 'Glass', {
    parentId: 'd_tail_1',
    rotation: [0, 180, 0],
    transparency: 0.06,
    reflectance: 0.15,
  }),

  dragonPart('d_tail_2', 'TailMid', 'Block', [-0.12, -0.22, -1.5], [1.26, 0.86, 1.6], JADE, 'Plastic', {
    parentId: 'd_tail_1',
    rotation: [12, -32, 0],
    pivotOffset: [0.08, 0, 0.7],
  }),
  dragonPart('d_tail_2_belly', 'TailMidBelly', 'Block', [0, -0.36, 0], [0.95, 0.24, 1.46], CREAM, 'Plastic', {
    parentId: 'd_tail_2',
  }),
  dragonPart('d_tail_2_fin', 'TailMidFin', 'Wedge', [0, 0.68, 0], [0.26, 0.68, 1.04], RUBY_GLASS, 'Glass', {
    parentId: 'd_tail_2',
    rotation: [0, 180, 0],
    transparency: 0.06,
    reflectance: 0.15,
  }),

  dragonPart('d_tail_3', 'TailCurve', 'Block', [0.12, 0.04, -1.34], [1.02, 0.74, 1.4], JADE, 'Plastic', {
    parentId: 'd_tail_2',
    rotation: [8, 36, 0],
    pivotOffset: [-0.05, 0, 0.64],
  }),
  dragonPart('d_tail_3_belly', 'TailCurveBelly', 'Block', [0, -0.3, 0], [0.76, 0.2, 1.26], CREAM, 'Plastic', {
    parentId: 'd_tail_3',
  }),
  dragonPart('d_tail_3_fin', 'TailCurveFin', 'Wedge', [0, 0.6, 0], [0.24, 0.6, 0.94], RUBY_GLASS, 'Glass', {
    parentId: 'd_tail_3',
    rotation: [0, 180, 0],
    transparency: 0.06,
    reflectance: 0.15,
  }),

  dragonPart('d_tail_4', 'TailTip', 'Block', [0.1, 0.08, -1.14], [0.84, 0.62, 1.16], JADE, 'Plastic', {
    parentId: 'd_tail_3',
    rotation: [6, 28, 0],
    pivotOffset: [0, 0, 0.54],
  }),
  dragonPart('d_tail_4_fin', 'TailTipFin', 'Wedge', [0, 0.52, 0], [0.22, 0.54, 0.82], RUBY_GLASS, 'Glass', {
    parentId: 'd_tail_4',
    rotation: [0, 180, 0],
    transparency: 0.06,
    reflectance: 0.15,
  }),

  dragonPart('d_tail_fan', 'TailFanHub', 'Block', [0.06, 0.06, -0.8], [0.78, 0.54, 0.7], JADE, 'Plastic', {
    parentId: 'd_tail_4',
    rotation: [8, 14, 0],
    pivotOffset: [0, 0, 0.32],
    attachments: [
      { id: 'att_tail_l', name: 'TailRibbon_L', position: [-0.45, 0.12, -0.35], rotation: [0, 0, 0] },
      { id: 'att_tail_r', name: 'TailRibbon_R', position: [0.45, 0.12, -0.35], rotation: [0, 0, 0] },
    ],
    effects: [
      {
        id: 'fx_tail_trail',
        kind: 'Trail',
        name: 'SerpentTailTrail',
        attachment0Id: 'att_tail_l',
        attachment1Id: 'att_tail_r',
        enabled: false,
        color: '#34D399',
        endColor: '#FACC15',
        lifetime: 0.55,
        minLength: 0.12,
        widthScaleStart: 1.0,
        widthScaleEnd: 0.1,
        transparencyStart: 0.25,
        transparencyEnd: 1.0,
        lightEmission: 0.75,
      },
    ],
  }),
  dragonPart('d_tail_fan_fin', 'TailFanFin', 'Wedge', [0, 0.44, 0], [0.22, 0.46, 0.62], RUBY_GLASS, 'Glass', {
    parentId: 'd_tail_fan',
    rotation: [0, 180, 0],
    transparency: 0.06,
    reflectance: 0.15,
  }),
  dragonPart('d_ray_1', 'TailRay_1', 'Block', [-0.5, 0.14, -0.88], [0.2, 0.2, 1.24], AMBER_GLASS, 'Glass', {
    parentId: 'd_tail_fan',
    rotation: [8, 30, 0],
    transparency: 0.1,
    reflectance: 0.2,
  }),
  dragonPart('d_ray_tip_1', 'TailRayTip_1', 'Block', [0, 0, -0.7], [0.26, 0.24, 0.3], JADE, 'Plastic', {
    parentId: 'd_ray_1',
  }),
  dragonPart('d_ray_2', 'TailRay_2', 'Block', [-0.16, 0.18, -1.0], [0.2, 0.2, 1.38], AMBER_GLASS, 'Glass', {
    parentId: 'd_tail_fan',
    rotation: [12, 10, 0],
    transparency: 0.1,
    reflectance: 0.2,
  }),
  dragonPart('d_ray_tip_2', 'TailRayTip_2', 'Block', [0, 0, -0.76], [0.26, 0.24, 0.3], JADE, 'Plastic', {
    parentId: 'd_ray_2',
  }),
  dragonPart('d_ray_3', 'TailRay_3', 'Block', [0.2, 0.16, -1.0], [0.2, 0.2, 1.38], AMBER_GLASS, 'Glass', {
    parentId: 'd_tail_fan',
    rotation: [12, -10, 0],
    transparency: 0.1,
    reflectance: 0.2,
  }),
  dragonPart('d_ray_tip_3', 'TailRayTip_3', 'Block', [0, 0, -0.76], [0.26, 0.24, 0.3], JADE, 'Plastic', {
    parentId: 'd_ray_3',
  }),
  dragonPart('d_ray_4', 'TailRay_4', 'Block', [0.54, 0.1, -0.88], [0.2, 0.2, 1.24], AMBER_GLASS, 'Glass', {
    parentId: 'd_tail_fan',
    rotation: [8, -30, 0],
    transparency: 0.1,
    reflectance: 0.2,
  }),
  dragonPart('d_ray_tip_4', 'TailRayTip_4', 'Block', [0, 0, -0.7], [0.26, 0.24, 0.3], JADE, 'Plastic', {
    parentId: 'd_ray_4',
  }),
];

// Stage 1: Idle — Calm rhythmic hover, jaw breathing, tail sway & pearl pulse
const dragonIdleClip: AnimationClip = {
  id: 'clip_dragon_idle',
  name: 'Idle',
  duration: 3.2,
  fps: 30,
  loop: true,
  priority: 'Idle',
  sampleMode: 'keyframes',
  fadeTime: 0.3,
  defaultWeight: 1,
  markers: [
    {
      id: 'mkr_di_pearl',
      time: 1.6,
      name: 'PearlShimmer',
      value: 'AuraPulse',
      effectId: 'fx_pearl_sparks',
      effectAction: 'emit',
      burstCount: 16,
    },
  ],
  tracks: [
    {
      partId: 'd_pelvis',
      keyframes: [
        { id: 'kf_di_pel_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', position: [0, 1.85, -0.75], rotation: [10, 0, 0] },
        { id: 'kf_di_pel_1', time: 1.6, easingStyle: 'Sine', easingDirection: 'InOut', position: [0, 2.02, -0.75], rotation: [7, 3, 0] },
        { id: 'kf_di_pel_2', time: 3.2, easingStyle: 'Sine', easingDirection: 'InOut', position: [0, 1.85, -0.75], rotation: [10, 0, 0] },
      ],
    },
    {
      partId: 'd_chest',
      keyframes: [
        { id: 'kf_di_ch_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [10, 0, 0] },
        { id: 'kf_di_ch_1', time: 1.6, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [6, -4, 0] },
        { id: 'kf_di_ch_2', time: 3.2, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [10, 0, 0] },
      ],
    },
    {
      partId: 'd_neck_up',
      keyframes: [
        { id: 'kf_di_nu_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [18, -3, 0] },
        { id: 'kf_di_nu_1', time: 1.6, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [22, 4, 0] },
        { id: 'kf_di_nu_2', time: 3.2, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [18, -3, 0] },
      ],
    },
    {
      partId: 'd_head',
      keyframes: [
        { id: 'kf_di_hd_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [-30, 3, 0] },
        { id: 'kf_di_hd_1', time: 1.6, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [-24, -5, 2] },
        { id: 'kf_di_hd_2', time: 3.2, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [-30, 3, 0] },
      ],
    },
    {
      partId: 'd_jaw',
      keyframes: [
        { id: 'kf_di_jaw_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [24, 0, 0] },
        { id: 'kf_di_jaw_1', time: 1.6, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [33, 0, 0] },
        { id: 'kf_di_jaw_2', time: 3.2, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [24, 0, 0] },
      ],
    },
    {
      partId: 'd_tail_1',
      keyframes: [
        { id: 'kf_di_t1_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [-16, -24, 0] },
        { id: 'kf_di_t1_1', time: 1.6, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [-13, -15, 0] },
        { id: 'kf_di_t1_2', time: 3.2, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [-16, -24, 0] },
      ],
    },
    {
      partId: 'd_tail_2',
      keyframes: [
        { id: 'kf_di_t2_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [12, -32, 0] },
        { id: 'kf_di_t2_1', time: 1.6, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [15, -20, 0] },
        { id: 'kf_di_t2_2', time: 3.2, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [12, -32, 0] },
      ],
    },
    {
      partId: 'd_tail_fan',
      keyframes: [
        { id: 'kf_di_tf_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [8, 14, -4] },
        { id: 'kf_di_tf_1', time: 1.6, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [14, 24, 4] },
        { id: 'kf_di_tf_2', time: 3.2, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [8, 14, -4] },
      ],
    },
    {
      partId: 'd_pearl',
      keyframes: [
        { id: 'kf_di_pr_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', color: '#F97316', size: [0.76, 0.76, 0.76] },
        { id: 'kf_di_pr_1', time: 1.6, easingStyle: 'Sine', easingDirection: 'InOut', color: '#FACC15', size: [0.86, 0.86, 0.86] },
        { id: 'kf_di_pr_2', time: 3.2, easingStyle: 'Sine', easingDirection: 'InOut', color: '#F97316', size: [0.76, 0.76, 0.76] },
      ],
    },
  ],
};

// Stage 2: Flying — Aerial serpentine S-wave glide with tucked limbs & tail undulation
const dragonFlyingClip: AnimationClip = {
  id: 'clip_dragon_flying',
  name: 'Flying',
  duration: 2.4,
  fps: 30,
  loop: true,
  priority: 'Movement',
  sampleMode: 'resampled',
  fadeTime: 0.25,
  defaultWeight: 1,
  markers: [
    {
      id: 'mkr_df_trail',
      time: 0.05,
      name: 'TailTrailOn',
      value: 'FlightWake',
      effectId: 'fx_tail_trail',
      effectAction: 'enable',
    },
    {
      id: 'mkr_df_whoosh1',
      time: 0.6,
      name: 'WingWhoosh',
      value: 'Upstroke',
      effectId: 'fx_pearl_sparks',
      effectAction: 'emit',
      burstCount: 14,
      soundId: 'snd_wing_whoosh',
    },
    {
      id: 'mkr_df_whoosh2',
      time: 1.8,
      name: 'WingWhoosh',
      value: 'Downstroke',
      effectId: 'fx_tail_trail',
      effectAction: 'enable',
      soundId: 'snd_wing_whoosh',
    },
  ],
  tracks: [
    {
      partId: 'd_pelvis',
      keyframes: [
        { id: 'kf_df_pel_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', position: [0, 3.25, -0.45], rotation: [24, 0, -7] },
        { id: 'kf_df_pel_1', time: 0.6, easingStyle: 'Sine', easingDirection: 'InOut', position: [0.35, 3.65, -0.4], rotation: [28, 8, 0] },
        { id: 'kf_df_pel_2', time: 1.2, easingStyle: 'Sine', easingDirection: 'InOut', position: [0, 3.3, -0.45], rotation: [24, 0, 7] },
        { id: 'kf_df_pel_3', time: 1.8, easingStyle: 'Sine', easingDirection: 'InOut', position: [-0.35, 2.95, -0.5], rotation: [20, -8, 0] },
        { id: 'kf_df_pel_4', time: 2.4, easingStyle: 'Sine', easingDirection: 'InOut', position: [0, 3.25, -0.45], rotation: [24, 0, -7] },
      ],
    },
    {
      partId: 'd_lower_torso',
      keyframes: [
        { id: 'kf_df_lt_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [6, -10, 0] },
        { id: 'kf_df_lt_1', time: 1.2, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [12, 10, 0] },
        { id: 'kf_df_lt_2', time: 2.4, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [6, -10, 0] },
      ],
    },
    {
      partId: 'd_mid_spine',
      keyframes: [
        { id: 'kf_df_ms_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [8, 12, 0] },
        { id: 'kf_df_ms_1', time: 1.2, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [2, -12, 0] },
        { id: 'kf_df_ms_2', time: 2.4, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [8, 12, 0] },
      ],
    },
    {
      partId: 'd_chest',
      keyframes: [
        { id: 'kf_df_ch_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [18, 10, 0] },
        { id: 'kf_df_ch_1', time: 1.2, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [12, -10, 0] },
        { id: 'kf_df_ch_2', time: 2.4, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [18, 10, 0] },
      ],
    },
    {
      partId: 'd_neck_low',
      keyframes: [
        { id: 'kf_df_nl_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [24, -8, 0] },
        { id: 'kf_df_nl_1', time: 1.2, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [18, 8, 0] },
        { id: 'kf_df_nl_2', time: 2.4, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [24, -8, 0] },
      ],
    },
    {
      partId: 'd_neck_up',
      keyframes: [
        { id: 'kf_df_nu_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [16, 10, 0] },
        { id: 'kf_df_nu_1', time: 1.2, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [24, -10, 0] },
        { id: 'kf_df_nu_2', time: 2.4, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [16, 10, 0] },
      ],
    },
    {
      partId: 'd_head',
      keyframes: [
        { id: 'kf_df_hd_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [-76, -4, 4] },
        { id: 'kf_df_hd_1', time: 1.2, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [-68, 4, -4] },
        { id: 'kf_df_hd_2', time: 2.4, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [-76, -4, 4] },
      ],
    },
    {
      partId: 'd_arm_l',
      keyframes: [
        { id: 'kf_df_al_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [58, 22, -24] },
        { id: 'kf_df_al_1', time: 1.2, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [68, 28, -20] },
        { id: 'kf_df_al_2', time: 2.4, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [58, 22, -24] },
      ],
    },
    {
      partId: 'd_arm_r',
      keyframes: [
        { id: 'kf_df_ar_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [46, -24, 24] },
        { id: 'kf_df_ar_1', time: 1.2, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [56, -30, 20] },
        { id: 'kf_df_ar_2', time: 2.4, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [46, -24, 24] },
      ],
    },
    {
      partId: 'd_leg_bl',
      keyframes: [
        { id: 'kf_df_bl_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [58, 14, -14] },
        { id: 'kf_df_bl_1', time: 1.2, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [68, 20, -10] },
        { id: 'kf_df_bl_2', time: 2.4, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [58, 14, -14] },
      ],
    },
    {
      partId: 'd_leg_br',
      keyframes: [
        { id: 'kf_df_br_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [58, -14, 14] },
        { id: 'kf_df_br_1', time: 1.2, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [68, -20, 10] },
        { id: 'kf_df_br_2', time: 2.4, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [58, -14, 14] },
      ],
    },
    {
      partId: 'd_tail_1',
      keyframes: [
        { id: 'kf_df_t1_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [-24, -22, 0] },
        { id: 'kf_df_t1_1', time: 1.2, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [-12, 18, 0] },
        { id: 'kf_df_t1_2', time: 2.4, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [-24, -22, 0] },
      ],
    },
    {
      partId: 'd_tail_2',
      keyframes: [
        { id: 'kf_df_t2_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [-8, 22, 0] },
        { id: 'kf_df_t2_1', time: 1.2, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [12, -24, 0] },
        { id: 'kf_df_t2_2', time: 2.4, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [-8, 22, 0] },
      ],
    },
    {
      partId: 'd_tail_3',
      keyframes: [
        { id: 'kf_df_t3_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [14, -26, 0] },
        { id: 'kf_df_t3_1', time: 1.2, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [-8, 26, 0] },
        { id: 'kf_df_t3_2', time: 2.4, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [14, -26, 0] },
      ],
    },
    {
      partId: 'd_tail_fan',
      keyframes: [
        { id: 'kf_df_tf_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [8, 16, -12] },
        { id: 'kf_df_tf_1', time: 1.2, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [-8, -16, 12] },
        { id: 'kf_df_tf_2', time: 2.4, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [8, 16, -12] },
      ],
    },
  ],
};

// Stage 3: Breathing — Wind-up + wide jaw + blazing jade/amber fire breath stream
const dragonBreathingClip: AnimationClip = {
  id: 'clip_dragon_breathing',
  name: 'Breathing',
  duration: 3.0,
  fps: 30,
  loop: true,
  priority: 'Action2',
  sampleMode: 'resampled',
  fadeTime: 0.18,
  defaultWeight: 1,
  markers: [
    {
      id: 'mkr_db_roar',
      time: 0.5,
      name: 'Roar',
      value: 'InhaleWindup',
      effectId: 'fx_mouth_light',
      effectAction: 'pulse',
      burstCount: 14,
      soundId: 'snd_dragon_roar',
    },
    {
      id: 'mkr_db_start',
      time: 0.85,
      name: 'BreathStart',
      value: 'IgniteStream',
      effectId: 'fx_breath_particles',
      effectAction: 'enable',
      burstCount: 38,
      soundId: 'snd_fire_breath',
    },
    {
      id: 'mkr_db_burst',
      time: 1.45,
      name: 'BreathBurst',
      value: 'PeakFlame',
      effectId: 'fx_breath_particles',
      effectAction: 'emit',
      burstCount: 44,
    },
    {
      id: 'mkr_db_stop',
      time: 2.45,
      name: 'BreathStop',
      value: 'Extinguish',
      effectId: 'fx_breath_particles',
      effectAction: 'disable',
    },
  ],
  tracks: [
    {
      partId: 'd_neck_low',
      keyframes: [
        { id: 'kf_db_nl_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [22, 0, 0] },
        { id: 'kf_db_nl_1', time: 0.55, easingStyle: 'Back', easingDirection: 'Out', rotation: [-2, 0, 0] },
        { id: 'kf_db_nl_2', time: 0.9, easingStyle: 'Cubic', easingDirection: 'Out', rotation: [32, 0, 0] },
        { id: 'kf_db_nl_3', time: 2.0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [28, 0, 0] },
        { id: 'kf_db_nl_4', time: 3.0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [22, 0, 0] },
      ],
    },
    {
      partId: 'd_neck_up',
      keyframes: [
        { id: 'kf_db_nu_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [18, 0, 0] },
        { id: 'kf_db_nu_1', time: 0.55, easingStyle: 'Back', easingDirection: 'Out', rotation: [4, 0, 0] },
        { id: 'kf_db_nu_2', time: 0.9, easingStyle: 'Cubic', easingDirection: 'Out', rotation: [30, 0, 0] },
        { id: 'kf_db_nu_3', time: 2.0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [26, 0, 0] },
        { id: 'kf_db_nu_4', time: 3.0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [18, 0, 0] },
      ],
    },
    {
      partId: 'd_head',
      keyframes: [
        { id: 'kf_db_hd_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [-30, 0, 0] },
        { id: 'kf_db_hd_1', time: 0.55, easingStyle: 'Back', easingDirection: 'Out', rotation: [-46, 0, 0] },
        { id: 'kf_db_hd_2', time: 0.9, easingStyle: 'Cubic', easingDirection: 'Out', rotation: [-36, -8, 0] },
        { id: 'kf_db_hd_3', time: 1.5, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [-34, 8, 0] },
        { id: 'kf_db_hd_4', time: 2.0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [-32, 0, 0] },
        { id: 'kf_db_hd_5', time: 3.0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [-30, 0, 0] },
      ],
    },
    {
      partId: 'd_jaw',
      keyframes: [
        { id: 'kf_db_jaw_0', time: 0, easingStyle: 'Quad', easingDirection: 'Out', rotation: [28, 0, 0] },
        { id: 'kf_db_jaw_1', time: 0.55, easingStyle: 'Back', easingDirection: 'Out', rotation: [56, 0, 0] },
        { id: 'kf_db_jaw_2', time: 2.0, easingStyle: 'Quad', easingDirection: 'InOut', rotation: [54, 0, 0] },
        { id: 'kf_db_jaw_3', time: 3.0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [28, 0, 0] },
      ],
    },
    {
      partId: 'd_breath_core',
      keyframes: [
        { id: 'kf_db_bc_0', time: 0, easingStyle: 'Quad', easingDirection: 'Out', size: [0.35, 0.35, 0.45], color: '#FEF08A', transparency: 1 },
        { id: 'kf_db_bc_1', time: 0.55, easingStyle: 'Cubic', easingDirection: 'Out', size: [0.75, 0.75, 0.95], color: '#FEF08A', transparency: 0.15 },
        { id: 'kf_db_bc_2', time: 1.15, easingStyle: 'Sine', easingDirection: 'InOut', size: [1.05, 1.05, 1.4], color: '#FFFFFF', transparency: 0.05 },
        { id: 'kf_db_bc_3', time: 2.1, easingStyle: 'Quad', easingDirection: 'InOut', size: [0.85, 0.85, 1.1], color: '#34D399', transparency: 0.2 },
        { id: 'kf_db_bc_4', time: 2.6, easingStyle: 'Quad', easingDirection: 'Out', size: [0.35, 0.35, 0.45], color: '#FEF08A', transparency: 1 },
      ],
    },
    {
      partId: 'd_breath_inner',
      keyframes: [
        { id: 'kf_db_bi_0', time: 0.55, easingStyle: 'Cubic', easingDirection: 'Out', position: [0, -0.25, 1.65], size: [0.35, 0.6, 0.35], color: '#FEF08A', transparency: 1 },
        { id: 'kf_db_bi_1', time: 0.9, easingStyle: 'Cubic', easingDirection: 'Out', position: [0, -0.28, 3.1], size: [1.25, 3.5, 1.25], color: '#34D399', transparency: 0.08 },
        { id: 'kf_db_bi_2', time: 1.95, easingStyle: 'Sine', easingDirection: 'InOut', position: [0, -0.28, 3.35], size: [1.45, 4.1, 1.45], color: '#10B981', transparency: 0.12 },
        { id: 'kf_db_bi_3', time: 2.55, easingStyle: 'Quad', easingDirection: 'InOut', position: [0, -0.25, 1.8], size: [0.4, 0.8, 0.4], color: '#34D399', transparency: 1 },
      ],
    },
    {
      partId: 'd_breath_outer',
      keyframes: [
        { id: 'kf_db_bo_0', time: 0.6, easingStyle: 'Cubic', easingDirection: 'Out', position: [0, -0.28, 2.0], size: [0.55, 0.9, 0.55], color: '#FACC15', transparency: 1 },
        { id: 'kf_db_bo_1', time: 1.0, easingStyle: 'Cubic', easingDirection: 'Out', position: [0, -0.32, 3.9], size: [2.1, 5.2, 2.1], color: '#EA580C', transparency: 0.28 },
        { id: 'kf_db_bo_2', time: 2.0, easingStyle: 'Sine', easingDirection: 'InOut', position: [0, -0.32, 4.2], size: [2.35, 5.8, 2.35], color: '#F59E0B', transparency: 0.32 },
        { id: 'kf_db_bo_3', time: 2.65, easingStyle: 'Quad', easingDirection: 'InOut', position: [0, -0.28, 2.1], size: [0.6, 1.0, 0.6], color: '#EA580C', transparency: 1 },
      ],
    },
    {
      partId: 'd_pearl',
      keyframes: [
        { id: 'kf_db_pr_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', color: '#F97316', size: [0.76, 0.76, 0.76] },
        { id: 'kf_db_pr_1', time: 0.9, easingStyle: 'Cubic', easingDirection: 'Out', color: '#FEF08A', size: [1.05, 1.05, 1.05] },
        { id: 'kf_db_pr_2', time: 3.0, easingStyle: 'Sine', easingDirection: 'InOut', color: '#F97316', size: [0.76, 0.76, 0.76] },
      ],
    },
  ],
};

// Stage 4: Attack — Coiled strike lunge, jaw bite, claw slash & Dragon Pearl flare
const dragonAttackClip: AnimationClip = {
  id: 'clip_dragon_attack',
  name: 'Attack',
  duration: 2.2,
  fps: 30,
  loop: true,
  priority: 'Action3',
  sampleMode: 'resampled',
  fadeTime: 0.12,
  defaultWeight: 1,
  markers: [
    {
      id: 'mkr_da_windup',
      time: 0.42,
      name: 'WindUp',
      value: 'CoilStrike',
      effectId: 'fx_claw_trail',
      effectAction: 'enable',
      soundId: 'snd_dragon_roar',
    },
    {
      id: 'mkr_da_slash',
      time: 0.8,
      name: 'ClawSlash',
      value: 'Impact',
      effectId: 'fx_pearl_glow',
      effectAction: 'pulse',
      burstCount: 34,
      soundId: 'snd_claw_impact',
    },
    {
      id: 'mkr_da_recover',
      time: 1.45,
      name: 'Recovery',
      value: 'SheatheClaws',
      effectId: 'fx_claw_trail',
      effectAction: 'disable',
    },
  ],
  tracks: [
    {
      partId: 'd_pelvis',
      keyframes: [
        { id: 'kf_da_pel_0', time: 0, easingStyle: 'Quad', easingDirection: 'Out', position: [0, 1.85, -0.75], rotation: [10, 0, 0] },
        { id: 'kf_da_pel_1', time: 0.45, easingStyle: 'Back', easingDirection: 'Out', position: [0, 2.15, -1.35], rotation: [-6, -12, 0] },
        { id: 'kf_da_pel_2', time: 0.8, easingStyle: 'Cubic', easingDirection: 'Out', position: [0, 2.25, 0.65], rotation: [26, 10, 0] },
        { id: 'kf_da_pel_3', time: 1.4, easingStyle: 'Sine', easingDirection: 'InOut', position: [0, 1.98, 0.05], rotation: [14, 4, 0] },
        { id: 'kf_da_pel_4', time: 2.2, easingStyle: 'Sine', easingDirection: 'InOut', position: [0, 1.85, -0.75], rotation: [10, 0, 0] },
      ],
    },
    {
      partId: 'd_chest',
      keyframes: [
        { id: 'kf_da_ch_0', time: 0, easingStyle: 'Quad', easingDirection: 'Out', rotation: [10, 0, 0] },
        { id: 'kf_da_ch_1', time: 0.45, easingStyle: 'Back', easingDirection: 'Out', rotation: [-8, -22, 0] },
        { id: 'kf_da_ch_2', time: 0.8, easingStyle: 'Cubic', easingDirection: 'Out', rotation: [24, 18, 0] },
        { id: 'kf_da_ch_3', time: 2.2, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [10, 0, 0] },
      ],
    },
    {
      partId: 'd_head',
      keyframes: [
        { id: 'kf_da_hd_0', time: 0, easingStyle: 'Quad', easingDirection: 'Out', rotation: [-30, 0, 0] },
        { id: 'kf_da_hd_1', time: 0.45, easingStyle: 'Back', easingDirection: 'Out', rotation: [-48, -10, 0] },
        { id: 'kf_da_hd_2', time: 0.8, easingStyle: 'Cubic', easingDirection: 'Out', rotation: [-12, 6, 0] },
        { id: 'kf_da_hd_3', time: 2.2, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [-30, 0, 0] },
      ],
    },
    {
      partId: 'd_jaw',
      keyframes: [
        { id: 'kf_da_jaw_0', time: 0, easingStyle: 'Quad', easingDirection: 'Out', rotation: [28, 0, 0] },
        { id: 'kf_da_jaw_1', time: 0.45, easingStyle: 'Back', easingDirection: 'Out', rotation: [54, 0, 0] },
        { id: 'kf_da_jaw_2', time: 0.82, easingStyle: 'Cubic', easingDirection: 'Out', rotation: [6, 0, 0] },
        { id: 'kf_da_jaw_3', time: 2.2, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [28, 0, 0] },
      ],
    },
    {
      partId: 'd_arm_r',
      keyframes: [
        { id: 'kf_da_ar_0', time: 0, easingStyle: 'Quad', easingDirection: 'Out', rotation: [18, -28, 20] },
        { id: 'kf_da_ar_1', time: 0.45, easingStyle: 'Back', easingDirection: 'Out', rotation: [-65, -36, 34] },
        { id: 'kf_da_ar_2', time: 0.82, easingStyle: 'Cubic', easingDirection: 'Out', rotation: [38, 22, -16] },
        { id: 'kf_da_ar_3', time: 2.2, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [18, -28, 20] },
      ],
    },
    {
      partId: 'd_arm_l',
      keyframes: [
        { id: 'kf_da_al_0', time: 0, easingStyle: 'Quad', easingDirection: 'Out', rotation: [26, 20, -18] },
        { id: 'kf_da_al_1', time: 0.45, easingStyle: 'Back', easingDirection: 'Out', rotation: [-28, 32, -26] },
        { id: 'kf_da_al_2', time: 0.82, easingStyle: 'Cubic', easingDirection: 'Out', rotation: [44, -14, 12] },
        { id: 'kf_da_al_3', time: 2.2, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [26, 20, -18] },
      ],
    },
    {
      partId: 'd_pearl',
      keyframes: [
        { id: 'kf_da_pr_0', time: 0, easingStyle: 'Quad', easingDirection: 'Out', color: '#F97316', size: [0.76, 0.76, 0.76] },
        { id: 'kf_da_pr_1', time: 0.45, easingStyle: 'Cubic', easingDirection: 'Out', color: '#FEF08A', size: [1.05, 1.05, 1.05] },
        { id: 'kf_da_pr_2', time: 0.82, easingStyle: 'Elastic', easingDirection: 'Out', color: '#FFFFFF', size: [1.28, 1.28, 1.28] },
        { id: 'kf_da_pr_3', time: 1.5, easingStyle: 'Quad', easingDirection: 'InOut', color: '#F97316', size: [0.76, 0.76, 0.76] },
        { id: 'kf_da_pr_4', time: 2.2, easingStyle: 'Linear', easingDirection: 'Out', color: '#F97316', size: [0.76, 0.76, 0.76] },
      ],
    },
    {
      partId: 'd_breath_core',
      keyframes: [
        { id: 'kf_da_bc_0', time: 0.65, easingStyle: 'Cubic', easingDirection: 'Out', size: [0.4, 0.4, 0.4], color: '#FACC15', transparency: 1 },
        { id: 'kf_da_bc_1', time: 0.82, easingStyle: 'Cubic', easingDirection: 'Out', size: [1.15, 1.15, 1.5], color: '#FEF08A', transparency: 0.12 },
        { id: 'kf_da_bc_2', time: 1.25, easingStyle: 'Quad', easingDirection: 'Out', size: [0.4, 0.4, 0.4], color: '#EA580C', transparency: 1 },
      ],
    },
    {
      partId: 'd_tail_1',
      keyframes: [
        { id: 'kf_da_t1_0', time: 0, easingStyle: 'Quad', easingDirection: 'Out', rotation: [-16, -24, 0] },
        { id: 'kf_da_t1_1', time: 0.8, easingStyle: 'Cubic', easingDirection: 'Out', rotation: [6, 26, 0] },
        { id: 'kf_da_t1_2', time: 2.2, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [-16, -24, 0] },
      ],
    },
  ],
};

export const jadeDragonPreset: ModelPreset = {
  id: 'jade-dragon',
  label: 'Jade Blocky Dragon',
  description:
    'Micro-block Motor6D rigged Eastern dragon with stepped antlers, curved amber whiskers, discrete fangs, Dragon Pearl, breath FX, and 4 stages.',
  model: {
    name: 'JadeBlockyDragon',
    primaryPartId: 'd_pelvis',
    parts: dragonParts,
    animations: [
      dragonIdleClip,
      dragonFlyingClip,
      dragonBreathingClip,
      dragonAttackClip,
    ],
  },
};
