import { AnimationClip, PartShape, StudioPartNode } from './robloxTypes';
import type { ModelPreset } from './presets';

function tadpolePart(
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

// Soggy Tadpole Palette (matched to reference creature sheet)
const OLIVE_MAIN = '#4E4B33';
const OLIVE_LIGHT = '#5F5B3F';
const OLIVE_DARK = '#3B3826';
const OLIVE_LINING = '#2F2D1D';
const BELLY_CREAM = '#BDBB92';
const BELLY_SHADE = '#9F9D76';
const FIN_INNER = '#646748';
const FIN_MEMBRANE = '#838764';
const EYE_CHARCOAL = '#161A22';
const EYE_WHITE = '#E2E8F0';
const EYE_SLATE = '#475569';
const DEW_AQUA = '#7DD3FC';

const soggyTadpoleParts: StudioPartNode[] = [
  // 1. Bulky Swamp-Olive Head/Torso Core, Protruding Snout, Belly & Wet Droplets
  tadpolePart('st_body', 'BodyCore', 'Block', [0, 0.96, 0.65], [1.72, 1.3, 1.88], OLIVE_MAIN, 'Plastic', {
    anchored: true,
  }),
  tadpolePart('st_top_cap', 'BodyTopCap', 'Block', [0, 0.72, -0.02], [1.38, 0.2, 1.54], OLIVE_LIGHT, 'Plastic', {
    parentId: 'st_body',
  }),
  tadpolePart('st_cheek_l', 'CheekFlank_L', 'Block', [-0.92, -0.04, 0.02], [0.16, 0.94, 1.38], OLIVE_MAIN, 'Plastic', {
    parentId: 'st_body',
  }),
  tadpolePart('st_cheek_r', 'CheekFlank_R', 'Block', [0.92, -0.04, 0.02], [0.16, 0.94, 1.38], OLIVE_MAIN, 'Plastic', {
    parentId: 'st_body',
  }),
  tadpolePart('st_brow_l', 'BrowRidge_L', 'Block', [-0.72, 0.42, 0.6], [0.42, 0.22, 0.72], OLIVE_DARK, 'Plastic', {
    parentId: 'st_body',
  }),
  tadpolePart('st_brow_r', 'BrowRidge_R', 'Block', [0.72, 0.42, 0.6], [0.42, 0.22, 0.72], OLIVE_DARK, 'Plastic', {
    parentId: 'st_body',
  }),

  // Protruding Blocky Snout, Mouth & Cream Underbelly
  tadpolePart('st_snout', 'SnoutBlock', 'Block', [0, -0.04, 1.06], [1.02, 0.78, 0.42], OLIVE_MAIN, 'Plastic', {
    parentId: 'st_body',
  }),
  tadpolePart('st_snout_bridge', 'SnoutNoseBridge', 'Block', [0, 0.2, 1.18], [0.68, 0.34, 0.24], OLIVE_LIGHT, 'Plastic', {
    parentId: 'st_body',
  }),
  tadpolePart('st_mouth_line', 'MouthLine', 'Block', [0, -0.32, 1.27], [0.76, 0.09, 0.05], OLIVE_LINING, 'Plastic', {
    parentId: 'st_body',
  }),
  tadpolePart('st_belly', 'UnderbellyPlate', 'Block', [0, -0.68, 0.04], [1.38, 0.2, 1.62], BELLY_CREAM, 'Plastic', {
    parentId: 'st_body',
  }),
  tadpolePart('st_jaw_lip', 'LowerJawLip', 'Block', [0, -0.48, 0.92], [1.08, 0.24, 0.68], BELLY_CREAM, 'Plastic', {
    parentId: 'st_body',
  }),
  tadpolePart('st_belly_trim', 'BellySideTrim', 'Block', [0, -0.52, -0.02], [1.56, 0.2, 1.52], BELLY_SHADE, 'Plastic', {
    parentId: 'st_body',
  }),

  // Big Glossy Corner Eyes
  tadpolePart('st_eye_l', 'EyeBase_L', 'Block', [-0.7, 0.08, 0.88], [0.36, 0.48, 0.26], EYE_CHARCOAL, 'SmoothPlastic', {
    parentId: 'st_body',
  }),
  tadpolePart('st_eye_glint_l', 'EyeGlint_L', 'Block', [-0.66, 0.22, 1.0], [0.16, 0.18, 0.05], EYE_WHITE, 'SmoothPlastic', {
    parentId: 'st_body',
  }),
  tadpolePart('st_eye_shade_l', 'EyeShade_L', 'Block', [-0.78, -0.1, 0.92], [0.14, 0.14, 0.16], EYE_SLATE, 'SmoothPlastic', {
    parentId: 'st_body',
  }),

  tadpolePart('st_eye_r', 'EyeBase_R', 'Block', [0.7, 0.08, 0.88], [0.36, 0.48, 0.26], EYE_CHARCOAL, 'SmoothPlastic', {
    parentId: 'st_body',
  }),
  tadpolePart('st_eye_glint_r', 'EyeGlint_R', 'Block', [0.66, 0.22, 1.0], [0.16, 0.18, 0.05], EYE_WHITE, 'SmoothPlastic', {
    parentId: 'st_body',
  }),
  tadpolePart('st_eye_shade_r', 'EyeShade_R', 'Block', [0.78, -0.1, 0.92], [0.14, 0.14, 0.16], EYE_SLATE, 'SmoothPlastic', {
    parentId: 'st_body',
  }),

  // Signature Soggy Aqua Water Droplets
  tadpolePart('st_dew_tl', 'DewDrop_TopL', 'Block', [-0.36, 0.84, 0.3], [0.18, 0.14, 0.18], DEW_AQUA, 'Glass', {
    parentId: 'st_body',
    transparency: 0.18,
  }),
  tadpolePart('st_dew_tr', 'DewDrop_TopR', 'Block', [0.34, 0.84, 0.56], [0.16, 0.12, 0.16], DEW_AQUA, 'Glass', {
    parentId: 'st_body',
    transparency: 0.18,
  }),
  tadpolePart('st_dew_cl', 'DewDrop_CheekL', 'Block', [-1.02, -0.02, -0.18], [0.14, 0.18, 0.18], DEW_AQUA, 'Glass', {
    parentId: 'st_body',
    transparency: 0.18,
  }),
  tadpolePart('st_dew_cr', 'DewDrop_CheekR', 'Block', [1.02, 0.04, -0.1], [0.14, 0.18, 0.18], DEW_AQUA, 'Glass', {
    parentId: 'st_body',
    transparency: 0.18,
  }),

  // 2. Four Stubby Webbed Froglet Limbs
  // Front-Left Limb
  tadpolePart('st_arm_l', 'FrontLimb_L', 'Block', [-0.94, -0.56, 0.28], [0.44, 0.2, 0.22], OLIVE_MAIN, 'Plastic', {
    parentId: 'st_body',
    rotation: [0, -16, 36],
    pivotOffset: [0.18, 0, 0],
  }),
  tadpolePart('st_arm_web_l', 'FrontWeb_L', 'Block', [-0.28, -0.02, 0], [0.24, 0.12, 0.32], FIN_MEMBRANE, 'Plastic', {
    parentId: 'st_arm_l',
    transparency: 0.12,
  }),

  // Front-Right Limb
  tadpolePart('st_arm_r', 'FrontLimb_R', 'Block', [0.94, -0.56, 0.28], [0.44, 0.2, 0.22], OLIVE_MAIN, 'Plastic', {
    parentId: 'st_body',
    rotation: [0, 16, -36],
    pivotOffset: [-0.18, 0, 0],
  }),
  tadpolePart('st_arm_web_r', 'FrontWeb_R', 'Block', [0.28, -0.02, 0], [0.24, 0.12, 0.32], FIN_MEMBRANE, 'Plastic', {
    parentId: 'st_arm_r',
    transparency: 0.12,
  }),

  // Hind-Left Limb
  tadpolePart('st_leg_l', 'HindLimb_L', 'Block', [-0.94, -0.52, -0.6], [0.5, 0.22, 0.24], OLIVE_MAIN, 'Plastic', {
    parentId: 'st_body',
    rotation: [0, 26, 34],
    pivotOffset: [0.2, 0, 0],
  }),
  tadpolePart('st_leg_web_l', 'HindWeb_L', 'Block', [-0.32, -0.02, 0], [0.28, 0.12, 0.36], FIN_MEMBRANE, 'Plastic', {
    parentId: 'st_leg_l',
    transparency: 0.12,
  }),

  // Hind-Right Limb
  tadpolePart('st_leg_r', 'HindLimb_R', 'Block', [0.94, -0.52, -0.6], [0.5, 0.22, 0.24], OLIVE_MAIN, 'Plastic', {
    parentId: 'st_body',
    rotation: [0, -26, -34],
    pivotOffset: [-0.2, 0, 0],
  }),
  tadpolePart('st_leg_web_r', 'HindWeb_R', 'Block', [0.32, -0.02, 0], [0.28, 0.12, 0.36], FIN_MEMBRANE, 'Plastic', {
    parentId: 'st_leg_r',
    transparency: 0.12,
  }),

  // 3. Articulated 3-Segment Paddle Tail with Arched Translucent Vertical Fin
  // Segment 1: TailBase
  tadpolePart('st_tail_1', 'TailBase', 'Block', [0, 0.02, -1.3], [0.76, 0.72, 0.92], OLIVE_MAIN, 'Plastic', {
    parentId: 'st_body',
    pivotOffset: [0, 0, 0.42],
  }),
  tadpolePart('st_tail_1_fin_in', 'TailBaseFinInner', 'Block', [0, 0.02, -0.04], [0.16, 1.18, 0.86], FIN_INNER, 'Plastic', {
    parentId: 'st_tail_1',
    transparency: 0.06,
  }),
  tadpolePart('st_tail_1_fin_out', 'TailBaseFinEdge', 'Block', [0, 0.02, -0.08], [0.1, 1.38, 0.74], FIN_MEMBRANE, 'Plastic', {
    parentId: 'st_tail_1',
    transparency: 0.18,
  }),

  // Segment 2: TailMid
  tadpolePart('st_tail_2', 'TailMid', 'Block', [0, 0, -0.88], [0.46, 0.46, 0.96], OLIVE_LIGHT, 'Plastic', {
    parentId: 'st_tail_1',
    pivotOffset: [0, 0, 0.44],
  }),
  tadpolePart('st_tail_2_fin_in', 'TailMidFinInner', 'Block', [0, 0.02, 0], [0.14, 1.36, 0.94], FIN_INNER, 'Plastic', {
    parentId: 'st_tail_2',
    transparency: 0.08,
  }),
  tadpolePart('st_tail_2_fin_out', 'TailMidFinEdge', 'Block', [0, 0.02, 0], [0.08, 1.66, 0.86], FIN_MEMBRANE, 'Plastic', {
    parentId: 'st_tail_2',
    transparency: 0.2,
  }),

  // Segment 3: TailTip
  tadpolePart('st_tail_3', 'TailTip', 'Block', [0, 0, -0.82], [0.24, 0.26, 0.74], OLIVE_MAIN, 'Plastic', {
    parentId: 'st_tail_2',
    pivotOffset: [0, 0, 0.36],
  }),
  tadpolePart('st_tail_3_fin_in', 'TailTipFinInner', 'Block', [0, 0.02, -0.04], [0.1, 0.96, 0.78], FIN_INNER, 'Plastic', {
    parentId: 'st_tail_3',
    transparency: 0.1,
  }),
  tadpolePart('st_tail_3_fin_out', 'TailTipFinEdge', 'Block', [0, 0.02, -0.14], [0.07, 1.14, 0.86], FIN_MEMBRANE, 'Plastic', {
    parentId: 'st_tail_3',
    transparency: 0.22,
  }),
];

// Stage 1: Idle — Gentle puddle bob, lazy sinusoidal tail drift & soft webbed-limb flutter
const soggyTadpoleIdleClip: AnimationClip = {
  id: 'clip_soggy_tadpole_idle',
  name: 'Idle',
  duration: 2.6,
  fps: 30,
  loop: true,
  priority: 'Idle',
  sampleMode: 'keyframes',
  fadeTime: 0.25,
  defaultWeight: 1,
  markers: [],
  tracks: [
    {
      partId: 'st_body',
      keyframes: [
        { id: 'kf_st_idle_bd_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', position: [0, 0.96, 0.65], rotation: [0, 0, 0] },
        { id: 'kf_st_idle_bd_1', time: 1.3, easingStyle: 'Sine', easingDirection: 'InOut', position: [0, 1.05, 0.65], rotation: [-3, 2, 0] },
        { id: 'kf_st_idle_bd_2', time: 2.6, easingStyle: 'Sine', easingDirection: 'InOut', position: [0, 0.96, 0.65], rotation: [0, 0, 0] },
      ],
    },
    {
      partId: 'st_tail_1',
      keyframes: [
        { id: 'kf_st_idle_t1_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, -7, 0] },
        { id: 'kf_st_idle_t1_1', time: 1.3, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 7, 0] },
        { id: 'kf_st_idle_t1_2', time: 2.6, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, -7, 0] },
      ],
    },
    {
      partId: 'st_tail_2',
      keyframes: [
        { id: 'kf_st_idle_t2_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, -10, 0] },
        { id: 'kf_st_idle_t2_1', time: 0.45, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, -14, 0] },
        { id: 'kf_st_idle_t2_2', time: 1.75, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 14, 0] },
        { id: 'kf_st_idle_t2_3', time: 2.6, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, -10, 0] },
      ],
    },
    {
      partId: 'st_tail_3',
      keyframes: [
        { id: 'kf_st_idle_t3_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, -8, 0] },
        { id: 'kf_st_idle_t3_1', time: 0.7, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, -18, 0] },
        { id: 'kf_st_idle_t3_2', time: 2.0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 18, 0] },
        { id: 'kf_st_idle_t3_3', time: 2.6, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, -8, 0] },
      ],
    },
    {
      partId: 'st_arm_l',
      keyframes: [
        { id: 'kf_st_idle_al_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, -16, 36] },
        { id: 'kf_st_idle_al_1', time: 1.3, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, -24, 26] },
        { id: 'kf_st_idle_al_2', time: 2.6, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, -16, 36] },
      ],
    },
    {
      partId: 'st_arm_r',
      keyframes: [
        { id: 'kf_st_idle_ar_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 16, -36] },
        { id: 'kf_st_idle_ar_1', time: 1.3, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 24, -26] },
        { id: 'kf_st_idle_ar_2', time: 2.6, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 16, -36] },
      ],
    },
    {
      partId: 'st_leg_l',
      keyframes: [
        { id: 'kf_st_idle_ll_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 26, 34] },
        { id: 'kf_st_idle_ll_1', time: 1.3, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 18, 28] },
        { id: 'kf_st_idle_ll_2', time: 2.6, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 26, 34] },
      ],
    },
    {
      partId: 'st_leg_r',
      keyframes: [
        { id: 'kf_st_idle_lr_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, -26, -34] },
        { id: 'kf_st_idle_lr_1', time: 1.3, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, -18, -28] },
        { id: 'kf_st_idle_lr_2', time: 2.6, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, -26, -34] },
      ],
    },
  ],
};

// Stage 2: Swim Wiggle — Snappy S-wave tail propulsion & alternating froglet paddle stroke
const soggyTadpoleSwimClip: AnimationClip = {
  id: 'clip_soggy_tadpole_swim',
  name: 'Swim Wiggle',
  duration: 1.0,
  fps: 30,
  loop: true,
  priority: 'Movement',
  sampleMode: 'resampled',
  fadeTime: 0.16,
  defaultWeight: 1,
  markers: [],
  tracks: [
    {
      partId: 'st_body',
      keyframes: [
        { id: 'kf_st_sw_bd_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', position: [-0.08, 0.98, 0.65], rotation: [2, -9, -4] },
        { id: 'kf_st_sw_bd_1', time: 0.25, easingStyle: 'Sine', easingDirection: 'InOut', position: [0, 1.06, 0.68], rotation: [-2, 0, 0] },
        { id: 'kf_st_sw_bd_2', time: 0.5, easingStyle: 'Sine', easingDirection: 'InOut', position: [0.08, 0.98, 0.65], rotation: [2, 9, 4] },
        { id: 'kf_st_sw_bd_3', time: 0.75, easingStyle: 'Sine', easingDirection: 'InOut', position: [0, 1.06, 0.68], rotation: [-2, 0, 0] },
        { id: 'kf_st_sw_bd_4', time: 1.0, easingStyle: 'Sine', easingDirection: 'InOut', position: [-0.08, 0.98, 0.65], rotation: [2, -9, -4] },
      ],
    },
    {
      partId: 'st_tail_1',
      keyframes: [
        { id: 'kf_st_sw_t1_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 16, 0] },
        { id: 'kf_st_sw_t1_1', time: 0.5, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, -16, 0] },
        { id: 'kf_st_sw_t1_2', time: 1.0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 16, 0] },
      ],
    },
    {
      partId: 'st_tail_2',
      keyframes: [
        { id: 'kf_st_sw_t2_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 18, 0] },
        { id: 'kf_st_sw_t2_1', time: 0.16, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 26, 0] },
        { id: 'kf_st_sw_t2_2', time: 0.66, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, -26, 0] },
        { id: 'kf_st_sw_t2_3', time: 1.0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 18, 0] },
      ],
    },
    {
      partId: 'st_tail_3',
      keyframes: [
        { id: 'kf_st_sw_t3_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 14, 0] },
        { id: 'kf_st_sw_t3_1', time: 0.3, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 34, 0] },
        { id: 'kf_st_sw_t3_2', time: 0.8, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, -34, 0] },
        { id: 'kf_st_sw_t3_3', time: 1.0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 14, 0] },
      ],
    },
    {
      partId: 'st_arm_l',
      keyframes: [
        { id: 'kf_st_sw_al_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 12, 34] },
        { id: 'kf_st_sw_al_1', time: 0.5, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 36, 46] },
        { id: 'kf_st_sw_al_2', time: 1.0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 12, 34] },
      ],
    },
    {
      partId: 'st_arm_r',
      keyframes: [
        { id: 'kf_st_sw_ar_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, -36, -46] },
        { id: 'kf_st_sw_ar_1', time: 0.5, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, -12, -34] },
        { id: 'kf_st_sw_ar_2', time: 1.0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, -36, -46] },
      ],
    },
    {
      partId: 'st_leg_l',
      keyframes: [
        { id: 'kf_st_sw_ll_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 44, 34] },
        { id: 'kf_st_sw_ll_1', time: 0.5, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 20, 44] },
        { id: 'kf_st_sw_ll_2', time: 1.0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 44, 34] },
      ],
    },
    {
      partId: 'st_leg_r',
      keyframes: [
        { id: 'kf_st_sw_lr_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, -20, -44] },
        { id: 'kf_st_sw_lr_1', time: 0.5, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, -44, -34] },
        { id: 'kf_st_sw_lr_2', time: 1.0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, -20, -44] },
      ],
    },
  ],
};

export const soggyTadpolePreset: ModelPreset = {
  id: 'soggy-tadpole',
  label: 'Soggy Tadpole',
  description: `${soggyTadpoleParts.length}-part rigged swamp-olive tadpole with wet droplets, webbed limb buds, 3-joint paddle tail, and Idle + Swim Wiggle animations.`,
  model: {
    name: 'SoggyTadpole',
    primaryPartId: 'st_body',
    parts: soggyTadpoleParts,
    animations: [soggyTadpoleIdleClip, soggyTadpoleSwimClip],
    scripts: [],
  },
};
