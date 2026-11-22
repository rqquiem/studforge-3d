import { AnimationClip, PartShape, StudioPartNode } from './robloxTypes';
import type { ModelPreset } from './presets';

function guppyPart(
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

// Bubble Guppy Palette (matched to reference creature sheet)
const SKY_MAIN = '#368ED0';
const SKY_LIGHT = '#4FA8E3';
const SKY_DEEP = '#266CA6';
const CHEEK_ICE = '#C8F1FE';
const CHEEK_SHADE = '#7ECAF0';
const BELLY_CREAM = '#D6ECE2';
const BELLY_TRIM = '#A9D6E6';
const MOUTH_NAVY = '#141E2E';
const EYE_DARK = '#111622';
const EYE_WHITE = '#F1F5F9';
const EYE_SLATE = '#426D99';
const FIN_AQUA = '#7BC7F2';
const FIN_PALE = '#BCEAFD';
const FIN_STRIPE = '#4FA8E3';
const BUBBLE_GLASS = '#DCF6FF';

const bubbleGuppyParts: StudioPartNode[] = [
  // 1. Chunky Sky-Blue Body Core, Stepped Crown, Puffy Cheeks & Cream Underbelly
  guppyPart('bg_body', 'BodyCore', 'Block', [0, 1.18, 0.3], [1.46, 1.24, 1.62], SKY_MAIN, 'Plastic', {
    anchored: true,
  }),
  guppyPart('bg_top_cap', 'BodyTopCap', 'Block', [0, 0.68, -0.02], [1.14, 0.18, 1.38], SKY_LIGHT, 'Plastic', {
    parentId: 'bg_body',
  }),
  guppyPart('bg_flank_l', 'SideFlank_L', 'Block', [-0.78, 0.04, -0.08], [0.14, 0.86, 1.28], SKY_MAIN, 'Plastic', {
    parentId: 'bg_body',
  }),
  guppyPart('bg_flank_r', 'SideFlank_R', 'Block', [0.78, 0.04, -0.08], [0.14, 0.86, 1.28], SKY_MAIN, 'Plastic', {
    parentId: 'bg_body',
  }),
  guppyPart('bg_brow_l', 'BrowRidge_L', 'Block', [-0.6, 0.36, 0.56], [0.34, 0.2, 0.62], SKY_DEEP, 'Plastic', {
    parentId: 'bg_body',
  }),
  guppyPart('bg_brow_r', 'BrowRidge_R', 'Block', [0.6, 0.36, 0.56], [0.34, 0.2, 0.62], SKY_DEEP, 'Plastic', {
    parentId: 'bg_body',
  }),

  // Puffy Aqua Cheeks
  guppyPart('bg_cheek_l', 'CheekPuff_L', 'Block', [-0.74, -0.22, 0.54], [0.42, 0.46, 0.62], CHEEK_ICE, 'Plastic', {
    parentId: 'bg_body',
  }),
  guppyPart('bg_cheek_shade_l', 'CheekTrim_L', 'Block', [-0.78, -0.34, 0.24], [0.3, 0.32, 0.36], CHEEK_SHADE, 'Plastic', {
    parentId: 'bg_body',
  }),
  guppyPart('bg_cheek_r', 'CheekPuff_R', 'Block', [0.74, -0.22, 0.54], [0.42, 0.46, 0.62], CHEEK_ICE, 'Plastic', {
    parentId: 'bg_body',
  }),
  guppyPart('bg_cheek_shade_r', 'CheekTrim_R', 'Block', [0.78, -0.34, 0.24], [0.3, 0.32, 0.36], CHEEK_SHADE, 'Plastic', {
    parentId: 'bg_body',
  }),

  // Mint-Cream Underbelly & Forehead Bridge
  guppyPart('bg_forehead', 'SnoutForehead', 'Block', [0, 0.24, 0.82], [0.84, 0.52, 0.22], SKY_MAIN, 'Plastic', {
    parentId: 'bg_body',
  }),
  guppyPart('bg_belly', 'UnderbellyPlate', 'Block', [0, -0.66, 0.04], [1.12, 0.16, 1.36], BELLY_CREAM, 'Plastic', {
    parentId: 'bg_body',
  }),
  guppyPart('bg_belly_trim', 'BellySideTrim', 'Block', [0, -0.5, -0.04], [1.34, 0.2, 1.34], BELLY_TRIM, 'Plastic', {
    parentId: 'bg_body',
  }),

  // Protruding "O" Pucker Mouth Assembly
  guppyPart('bg_mouth_group', 'MouthRingHub', 'Block', [0, -0.18, 0.92], [0.66, 0.44, 0.24], CHEEK_SHADE, 'Plastic', {
    parentId: 'bg_body',
    pivotOffset: [0, 0, -0.1],
  }),
  guppyPart('bg_mouth_top', 'MouthLipTop', 'Block', [0, 0.18, 0.04], [0.58, 0.12, 0.22], CHEEK_ICE, 'Plastic', {
    parentId: 'bg_mouth_group',
  }),
  guppyPart('bg_mouth_bot', 'MouthLipBottom', 'Block', [0, -0.18, 0.04], [0.58, 0.12, 0.22], CHEEK_ICE, 'Plastic', {
    parentId: 'bg_mouth_group',
  }),
  guppyPart('bg_mouth_cavity', 'MouthCavity', 'Block', [0, 0, 0.08], [0.42, 0.22, 0.14], MOUTH_NAVY, 'SmoothPlastic', {
    parentId: 'bg_mouth_group',
  }),

  // Large Glossy Corner Eyes
  guppyPart('bg_eye_l', 'EyeBase_L', 'Block', [-0.58, 0.08, 0.72], [0.34, 0.44, 0.26], EYE_DARK, 'SmoothPlastic', {
    parentId: 'bg_body',
  }),
  guppyPart('bg_eye_glint_l', 'EyeGlint_L', 'Block', [-0.54, 0.2, 0.84], [0.15, 0.16, 0.05], EYE_WHITE, 'SmoothPlastic', {
    parentId: 'bg_body',
  }),
  guppyPart('bg_eye_shade_l', 'EyeShade_L', 'Block', [-0.66, -0.08, 0.75], [0.14, 0.13, 0.16], EYE_SLATE, 'SmoothPlastic', {
    parentId: 'bg_body',
  }),
  guppyPart('bg_eye_r', 'EyeBase_R', 'Block', [0.58, 0.08, 0.72], [0.34, 0.44, 0.26], EYE_DARK, 'SmoothPlastic', {
    parentId: 'bg_body',
  }),
  guppyPart('bg_eye_glint_r', 'EyeGlint_R', 'Block', [0.54, 0.2, 0.84], [0.15, 0.16, 0.05], EYE_WHITE, 'SmoothPlastic', {
    parentId: 'bg_body',
  }),
  guppyPart('bg_eye_shade_r', 'EyeShade_R', 'Block', [0.66, -0.08, 0.75], [0.14, 0.13, 0.16], EYE_SLATE, 'SmoothPlastic', {
    parentId: 'bg_body',
  }),

  // 2. Stepped Dorsal Sail Fin, Pectoral Flippers & Twin Pelvic Finlets
  guppyPart('bg_dorsal', 'DorsalFinBase', 'Block', [0, 0.88, -0.14], [0.1, 0.28, 1.06], FIN_STRIPE, 'Plastic', {
    parentId: 'bg_body',
    pivotOffset: [0, -0.14, 0],
    transparency: 0.08,
  }),
  guppyPart('bg_dorsal_crest', 'DorsalFinCrest', 'Block', [0, 0.2, -0.06], [0.08, 0.2, 0.78], FIN_PALE, 'Plastic', {
    parentId: 'bg_dorsal',
    transparency: 0.14,
  }),
  guppyPart('bg_dorsal_tip', 'DorsalFinTip', 'Block', [0, 0.16, -0.34], [0.07, 0.16, 0.34], FIN_AQUA, 'Plastic', {
    parentId: 'bg_dorsal_crest',
    transparency: 0.16,
  }),

  // Pectoral Side Fins (Left & Right)
  guppyPart('bg_pec_l', 'PectoralFin_L', 'Block', [-0.84, -0.34, -0.04], [0.54, 0.08, 0.44], FIN_AQUA, 'Plastic', {
    parentId: 'bg_body',
    rotation: [0, 22, 28],
    pivotOffset: [0.24, 0, 0],
    transparency: 0.08,
  }),
  guppyPart('bg_pec_edge_l', 'PectoralFinEdge_L', 'Block', [-0.28, 0, -0.06], [0.28, 0.07, 0.54], FIN_PALE, 'Plastic', {
    parentId: 'bg_pec_l',
    transparency: 0.16,
  }),
  guppyPart('bg_pec_r', 'PectoralFin_R', 'Block', [0.84, -0.34, -0.04], [0.54, 0.08, 0.44], FIN_AQUA, 'Plastic', {
    parentId: 'bg_body',
    rotation: [0, -22, -28],
    pivotOffset: [-0.24, 0, 0],
    transparency: 0.08,
  }),
  guppyPart('bg_pec_edge_r', 'PectoralFinEdge_R', 'Block', [0.28, 0, -0.06], [0.28, 0.07, 0.54], FIN_PALE, 'Plastic', {
    parentId: 'bg_pec_r',
    transparency: 0.16,
  }),

  // Twin Slender Ventral / Pelvic Finlets
  guppyPart('bg_pelvic_l', 'PelvicFin_L', 'Block', [-0.28, -0.82, -0.12], [0.07, 0.34, 0.22], FIN_PALE, 'Plastic', {
    parentId: 'bg_body',
    rotation: [0, 0, 12],
    pivotOffset: [0, 0.16, 0],
    transparency: 0.14,
  }),
  guppyPart('bg_pelvic_r', 'PelvicFin_R', 'Block', [0.28, -0.82, -0.12], [0.07, 0.34, 0.22], FIN_PALE, 'Plastic', {
    parentId: 'bg_body',
    rotation: [0, 0, -12],
    pivotOffset: [0, 0.16, 0],
    transparency: 0.14,
  }),

  // 3. Articulated Tail Peduncle, Anal Fin & Crisp Stepped V-Forked Fan Tail
  guppyPart('bg_tail_ped', 'TailPeduncle', 'Block', [0, -0.02, -1.04], [0.76, 0.84, 0.68], SKY_MAIN, 'Plastic', {
    parentId: 'bg_body',
    pivotOffset: [0, 0, 0.32],
  }),
  guppyPart('bg_tail_ped_belly', 'TailPeduncleBelly', 'Block', [0, -0.44, 0.04], [0.58, 0.14, 0.54], BELLY_CREAM, 'Plastic', {
    parentId: 'bg_tail_ped',
  }),
  guppyPart('bg_anal_fin', 'AnalFin', 'Block', [0, -0.58, -0.06], [0.08, 0.32, 0.32], FIN_PALE, 'Plastic', {
    parentId: 'bg_tail_ped',
    pivotOffset: [0, 0.14, 0],
    transparency: 0.14,
  }),

  // Tail Fan Hub & Orthogonal Stepped V-Notched Upper/Lower Lobes
  guppyPart('bg_tail_hub', 'TailFanHub', 'Block', [0, 0.02, -0.5], [0.18, 0.54, 0.4], SKY_DEEP, 'Plastic', {
    parentId: 'bg_tail_ped',
    pivotOffset: [0, 0, 0.2],
  }),
  guppyPart('bg_tail_web', 'TailCenterWeb', 'Block', [0, 0, -0.22], [0.1, 0.58, 0.42], FIN_STRIPE, 'Plastic', {
    parentId: 'bg_tail_hub',
    transparency: 0.12,
  }),
  guppyPart('bg_tail_up_in', 'TailUpperLobeInner', 'Block', [0, 0.34, -0.46], [0.1, 0.58, 0.58], FIN_AQUA, 'Plastic', {
    parentId: 'bg_tail_hub',
    transparency: 0.1,
  }),
  guppyPart('bg_tail_up_tip', 'TailUpperLobeTip', 'Block', [0, 0.66, -0.84], [0.08, 0.54, 0.58], FIN_PALE, 'Plastic', {
    parentId: 'bg_tail_hub',
    transparency: 0.18,
  }),
  guppyPart('bg_tail_lo_in', 'TailLowerLobeInner', 'Block', [0, -0.34, -0.46], [0.1, 0.58, 0.58], FIN_AQUA, 'Plastic', {
    parentId: 'bg_tail_hub',
    transparency: 0.1,
  }),
  guppyPart('bg_tail_lo_tip', 'TailLowerLobeTip', 'Block', [0, -0.66, -0.84], [0.08, 0.54, 0.58], FIN_PALE, 'Plastic', {
    parentId: 'bg_tail_hub',
    transparency: 0.18,
  }),

  // 4. Floating Voxel Glass Bubbles (pure 3D geometric props matching sheet)
  guppyPart('bg_bubble_1', 'BubbleCube_Mouth', 'Block', [0, 0.04, 1.38], [0.22, 0.22, 0.22], BUBBLE_GLASS, 'Glass', {
    parentId: 'bg_body',
    transparency: 0.42,
    reflectance: 0.25,
    canCollide: false,
  }),
  guppyPart('bg_bubble_2', 'BubbleCube_Top', 'Block', [-0.46, 0.96, 1.02], [0.28, 0.28, 0.28], BUBBLE_GLASS, 'Glass', {
    parentId: 'bg_body',
    transparency: 0.45,
    reflectance: 0.25,
    canCollide: false,
  }),
  guppyPart('bg_bubble_3', 'BubbleCube_Side', 'Block', [1.14, 0.36, 0.64], [0.24, 0.24, 0.24], BUBBLE_GLASS, 'Glass', {
    parentId: 'bg_body',
    transparency: 0.45,
    reflectance: 0.25,
    canCollide: false,
  }),
  guppyPart('bg_bubble_4', 'BubbleCube_Rear', 'Block', [-0.88, 0.84, -1.16], [0.2, 0.2, 0.2], BUBBLE_GLASS, 'Glass', {
    parentId: 'bg_body',
    transparency: 0.48,
    reflectance: 0.2,
    canCollide: false,
  }),
];

// Stage 1: Idle — Buoyant aquatic hover, gentle pectoral flutter, tail swish & bobbing bubbles
const bubbleGuppyIdleClip: AnimationClip = {
  id: 'clip_bubble_guppy_idle',
  name: 'Idle',
  duration: 2.4,
  fps: 30,
  loop: true,
  priority: 'Idle',
  sampleMode: 'keyframes',
  fadeTime: 0.25,
  defaultWeight: 1,
  markers: [],
  tracks: [
    {
      partId: 'bg_body',
      keyframes: [
        { id: 'kf_bg_idle_bd_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', position: [0, 1.18, 0.3], rotation: [0, 0, 0] },
        { id: 'kf_bg_idle_bd_1', time: 1.2, easingStyle: 'Sine', easingDirection: 'InOut', position: [0, 1.32, 0.3], rotation: [-4, 2, 0] },
        { id: 'kf_bg_idle_bd_2', time: 2.4, easingStyle: 'Sine', easingDirection: 'InOut', position: [0, 1.18, 0.3], rotation: [0, 0, 0] },
      ],
    },
    {
      partId: 'bg_mouth_group',
      keyframes: [
        { id: 'kf_bg_idle_mo_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', size: [0.66, 0.44, 0.24] },
        { id: 'kf_bg_idle_mo_1', time: 1.2, easingStyle: 'Sine', easingDirection: 'InOut', size: [0.6, 0.5, 0.28] },
        { id: 'kf_bg_idle_mo_2', time: 2.4, easingStyle: 'Sine', easingDirection: 'InOut', size: [0.66, 0.44, 0.24] },
      ],
    },
    {
      partId: 'bg_dorsal',
      keyframes: [
        { id: 'kf_bg_idle_do_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 0, -5] },
        { id: 'kf_bg_idle_do_1', time: 1.2, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 0, 5] },
        { id: 'kf_bg_idle_do_2', time: 2.4, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 0, -5] },
      ],
    },
    {
      partId: 'bg_pec_l',
      keyframes: [
        { id: 'kf_bg_idle_pl_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 22, 28] },
        { id: 'kf_bg_idle_pl_1', time: 0.6, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 8, 16] },
        { id: 'kf_bg_idle_pl_2', time: 1.2, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 22, 28] },
        { id: 'kf_bg_idle_pl_3', time: 1.8, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 8, 16] },
        { id: 'kf_bg_idle_pl_4', time: 2.4, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 22, 28] },
      ],
    },
    {
      partId: 'bg_pec_r',
      keyframes: [
        { id: 'kf_bg_idle_pr_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, -22, -28] },
        { id: 'kf_bg_idle_pr_1', time: 0.6, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, -8, -16] },
        { id: 'kf_bg_idle_pr_2', time: 1.2, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, -22, -28] },
        { id: 'kf_bg_idle_pr_3', time: 1.8, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, -8, -16] },
        { id: 'kf_bg_idle_pr_4', time: 2.4, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, -22, -28] },
      ],
    },
    {
      partId: 'bg_tail_ped',
      keyframes: [
        { id: 'kf_bg_idle_tp_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, -8, 0] },
        { id: 'kf_bg_idle_tp_1', time: 1.2, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 8, 0] },
        { id: 'kf_bg_idle_tp_2', time: 2.4, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, -8, 0] },
      ],
    },
    {
      partId: 'bg_tail_hub',
      keyframes: [
        { id: 'kf_bg_idle_th_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, -10, 0] },
        { id: 'kf_bg_idle_th_1', time: 0.4, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, -16, 0] },
        { id: 'kf_bg_idle_th_2', time: 1.6, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 16, 0] },
        { id: 'kf_bg_idle_th_3', time: 2.4, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, -10, 0] },
      ],
    },
    {
      partId: 'bg_bubble_1',
      keyframes: [
        { id: 'kf_bg_idle_b1_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', position: [0, 0.04, 1.38] },
        { id: 'kf_bg_idle_b1_1', time: 1.2, easingStyle: 'Sine', easingDirection: 'InOut', position: [0.06, 0.32, 1.48] },
        { id: 'kf_bg_idle_b1_2', time: 2.4, easingStyle: 'Sine', easingDirection: 'InOut', position: [0, 0.04, 1.38] },
      ],
    },
    {
      partId: 'bg_bubble_2',
      keyframes: [
        { id: 'kf_bg_idle_b2_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', position: [-0.46, 0.96, 1.02] },
        { id: 'kf_bg_idle_b2_1', time: 1.2, easingStyle: 'Sine', easingDirection: 'InOut', position: [-0.52, 1.22, 1.02] },
        { id: 'kf_bg_idle_b2_2', time: 2.4, easingStyle: 'Sine', easingDirection: 'InOut', position: [-0.46, 0.96, 1.02] },
      ],
    },
    {
      partId: 'bg_bubble_3',
      keyframes: [
        { id: 'kf_bg_idle_b3_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', position: [1.14, 0.36, 0.64] },
        { id: 'kf_bg_idle_b3_1', time: 1.2, easingStyle: 'Sine', easingDirection: 'InOut', position: [1.22, 0.62, 0.64] },
        { id: 'kf_bg_idle_b3_2', time: 2.4, easingStyle: 'Sine', easingDirection: 'InOut', position: [1.14, 0.36, 0.64] },
      ],
    },
    {
      partId: 'bg_bubble_4',
      keyframes: [
        { id: 'kf_bg_idle_b4_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', position: [-0.88, 0.84, -1.16] },
        { id: 'kf_bg_idle_b4_1', time: 1.2, easingStyle: 'Sine', easingDirection: 'InOut', position: [-0.94, 1.06, -1.24] },
        { id: 'kf_bg_idle_b4_2', time: 2.4, easingStyle: 'Sine', easingDirection: 'InOut', position: [-0.88, 0.84, -1.16] },
      ],
    },
  ],
};

// Stage 2: Bubble Swim — Snappy S-curve fan-tail swim, rowing pectoral fins & bubble puff burst
const bubbleGuppySwimClip: AnimationClip = {
  id: 'clip_bubble_guppy_swim',
  name: 'Bubble Swim',
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
      partId: 'bg_body',
      keyframes: [
        { id: 'kf_bg_sw_bd_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', position: [-0.07, 1.2, 0.3], rotation: [2, -8, -4] },
        { id: 'kf_bg_sw_bd_1', time: 0.25, easingStyle: 'Sine', easingDirection: 'InOut', position: [0, 1.32, 0.34], rotation: [-3, 0, 0] },
        { id: 'kf_bg_sw_bd_2', time: 0.5, easingStyle: 'Sine', easingDirection: 'InOut', position: [0.07, 1.2, 0.3], rotation: [2, 8, 4] },
        { id: 'kf_bg_sw_bd_3', time: 0.75, easingStyle: 'Sine', easingDirection: 'InOut', position: [0, 1.32, 0.34], rotation: [-3, 0, 0] },
        { id: 'kf_bg_sw_bd_4', time: 1.0, easingStyle: 'Sine', easingDirection: 'InOut', position: [-0.07, 1.2, 0.3], rotation: [2, -8, -4] },
      ],
    },
    {
      partId: 'bg_mouth_group',
      keyframes: [
        { id: 'kf_bg_sw_mo_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', position: [0, -0.18, 0.92], size: [0.66, 0.44, 0.24] },
        { id: 'kf_bg_sw_mo_1', time: 0.4, easingStyle: 'Back', easingDirection: 'Out', position: [0, -0.16, 1.0], size: [0.58, 0.52, 0.3] },
        { id: 'kf_bg_sw_mo_2', time: 1.0, easingStyle: 'Sine', easingDirection: 'InOut', position: [0, -0.18, 0.92], size: [0.66, 0.44, 0.24] },
      ],
    },
    {
      partId: 'bg_dorsal',
      keyframes: [
        { id: 'kf_bg_sw_do_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 0, 12] },
        { id: 'kf_bg_sw_do_1', time: 0.5, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 0, -12] },
        { id: 'kf_bg_sw_do_2', time: 1.0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 0, 12] },
      ],
    },
    {
      partId: 'bg_pec_l',
      keyframes: [
        { id: 'kf_bg_sw_pl_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, -6, 20] },
        { id: 'kf_bg_sw_pl_1', time: 0.5, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 42, 34] },
        { id: 'kf_bg_sw_pl_2', time: 1.0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, -6, 20] },
      ],
    },
    {
      partId: 'bg_pec_r',
      keyframes: [
        { id: 'kf_bg_sw_pr_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, -42, -34] },
        { id: 'kf_bg_sw_pr_1', time: 0.5, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 6, -20] },
        { id: 'kf_bg_sw_pr_2', time: 1.0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, -42, -34] },
      ],
    },
    {
      partId: 'bg_tail_ped',
      keyframes: [
        { id: 'kf_bg_sw_tp_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 18, 0] },
        { id: 'kf_bg_sw_tp_1', time: 0.5, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, -18, 0] },
        { id: 'kf_bg_sw_tp_2', time: 1.0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 18, 0] },
      ],
    },
    {
      partId: 'bg_tail_hub',
      keyframes: [
        { id: 'kf_bg_sw_th_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 16, 0] },
        { id: 'kf_bg_sw_th_1', time: 0.2, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 28, 0] },
        { id: 'kf_bg_sw_th_2', time: 0.7, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, -28, 0] },
        { id: 'kf_bg_sw_th_3', time: 1.0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 16, 0] },
      ],
    },
    {
      partId: 'bg_bubble_1',
      keyframes: [
        { id: 'kf_bg_sw_b1_0', time: 0, easingStyle: 'Quad', easingDirection: 'Out', position: [0, -0.1, 1.24] },
        { id: 'kf_bg_sw_b1_1', time: 0.5, easingStyle: 'Quad', easingDirection: 'Out', position: [-0.08, 0.26, 1.54] },
        { id: 'kf_bg_sw_b1_2', time: 1.0, easingStyle: 'Quad', easingDirection: 'In', position: [0, -0.1, 1.24] },
      ],
    },
    {
      partId: 'bg_bubble_2',
      keyframes: [
        { id: 'kf_bg_sw_b2_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', position: [-0.46, 0.88, 1.04] },
        { id: 'kf_bg_sw_b2_1', time: 0.5, easingStyle: 'Sine', easingDirection: 'InOut', position: [-0.56, 1.24, 0.92] },
        { id: 'kf_bg_sw_b2_2', time: 1.0, easingStyle: 'Sine', easingDirection: 'InOut', position: [-0.46, 0.88, 1.04] },
      ],
    },
    {
      partId: 'bg_bubble_3',
      keyframes: [
        { id: 'kf_bg_sw_b3_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', position: [1.14, 0.3, 0.68] },
        { id: 'kf_bg_sw_b3_1', time: 0.5, easingStyle: 'Sine', easingDirection: 'InOut', position: [1.26, 0.64, 0.52] },
        { id: 'kf_bg_sw_b3_2', time: 1.0, easingStyle: 'Sine', easingDirection: 'InOut', position: [1.14, 0.3, 0.68] },
      ],
    },
  ],
};

export const bubbleGuppyPreset: ModelPreset = {
  id: 'bubble-guppy',
  label: 'Bubble Guppy',
  description: `${bubbleGuppyParts.length}-part rigged sky-blue blocky fish with puffy cheeks, O-mouth, forked fan tail, voxel bubbles, and Idle + Bubble Swim animations.`,
  model: {
    name: 'BubbleGuppy',
    primaryPartId: 'bg_body',
    parts: bubbleGuppyParts,
    animations: [bubbleGuppyIdleClip, bubbleGuppySwimClip],
    scripts: [],
  },
};
