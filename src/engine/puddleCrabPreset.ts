import { AnimationClip, PartShape, StudioPartNode } from './robloxTypes';
import type { ModelPreset } from './presets';

function crabPart(
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

// Puddle Crab Palette (matched to reference creature sheet)
const SHELL_MAIN = '#C85216';
const SHELL_LIGHT = '#DF6824';
const SHELL_HIGHLIGHT = '#EC823A';
const SHELL_RIM = '#AE4210';
const SHELL_DARK = '#94350C';
const BELLY_CREAM = '#E8C699';
const BELLY_TRIM = '#D5A774';
const MOUTH_SHADOW = '#C68B59';
const MOUTH_FROWN = '#6D3018';
const EYE_CHARCOAL = '#1E2229';
const EYE_GLINT = '#F8FAFC';

const puddleCrabParts: StudioPartNode[] = [
  // 1. Stepped Terracotta Carapace, Underbelly & Pixel Frown Face
  crabPart('pc_carapace', 'CarapaceCore', 'Block', [0, 1.12, 0], [2.5, 0.56, 2.0], SHELL_MAIN, 'Plastic', {
    anchored: true,
  }),
  crabPart('pc_upper_cap', 'CarapaceUpperCap', 'Block', [0, 0.42, -0.06], [2.06, 0.32, 1.66], SHELL_LIGHT, 'Plastic', {
    parentId: 'pc_carapace',
  }),
  crabPart('pc_top_highlight', 'CarapaceHighlight', 'Block', [0, 0.6, -0.08], [1.5, 0.1, 1.18], SHELL_HIGHLIGHT, 'Plastic', {
    parentId: 'pc_carapace',
  }),
  crabPart('pc_front_brow', 'CarapaceFrontBrow', 'Block', [0, 0.2, 0.9], [2.24, 0.22, 0.28], SHELL_LIGHT, 'Plastic', {
    parentId: 'pc_carapace',
  }),
  crabPart('pc_rear_ridge', 'CarapaceRearRidge', 'Block', [0, 0.04, -0.96], [2.26, 0.26, 0.24], SHELL_DARK, 'Plastic', {
    parentId: 'pc_carapace',
  }),
  crabPart('pc_rim_l', 'SideRim_L', 'Block', [-1.32, 0.04, -0.04], [0.28, 0.48, 1.56], SHELL_RIM, 'Plastic', {
    parentId: 'pc_carapace',
  }),
  crabPart('pc_rim_r', 'SideRim_R', 'Block', [1.32, 0.04, -0.04], [0.28, 0.48, 1.56], SHELL_RIM, 'Plastic', {
    parentId: 'pc_carapace',
  }),

  // Warm sand underbelly & grumpy pixel frown cleanly exposed beneath front carapace brow
  crabPart('pc_underbelly', 'UnderbellyPlate', 'Block', [0, -0.44, 0.08], [1.84, 0.42, 1.82], BELLY_CREAM, 'Plastic', {
    parentId: 'pc_carapace',
  }),
  crabPart('pc_underbelly_rim', 'UnderbellyRim', 'Block', [0, -0.26, 0.06], [1.96, 0.16, 1.68], BELLY_TRIM, 'Plastic', {
    parentId: 'pc_carapace',
  }),
  crabPart('pc_mouth_recess', 'MouthRecess', 'Block', [0, -0.46, 0.99], [0.78, 0.28, 0.06], MOUTH_SHADOW, 'Plastic', {
    parentId: 'pc_carapace',
  }),
  crabPart('pc_mouth_top', 'MouthFrownTop', 'Block', [0, -0.4, 1.01], [0.56, 0.11, 0.06], MOUTH_FROWN, 'Plastic', {
    parentId: 'pc_carapace',
  }),
  crabPart('pc_mouth_l', 'MouthFrown_L', 'Block', [-0.24, -0.49, 1.01], [0.13, 0.17, 0.06], MOUTH_FROWN, 'Plastic', {
    parentId: 'pc_carapace',
  }),
  crabPart('pc_mouth_r', 'MouthFrown_R', 'Block', [0.24, -0.49, 1.01], [0.13, 0.17, 0.06], MOUTH_FROWN, 'Plastic', {
    parentId: 'pc_carapace',
  }),

  // 2. Twin Upright Eye Stalks
  crabPart('pc_eye_stalk_l', 'EyeStalk_L', 'Block', [-0.52, 0.66, 0.84], [0.32, 0.62, 0.3], SHELL_RIM, 'Plastic', {
    parentId: 'pc_carapace',
    pivotOffset: [0, -0.28, 0],
  }),
  crabPart('pc_eye_orb_l', 'EyeOrb_L', 'Block', [0, 0.1, 0.11], [0.28, 0.34, 0.12], EYE_CHARCOAL, 'SmoothPlastic', {
    parentId: 'pc_eye_stalk_l',
  }),
  crabPart('pc_eye_glint_l', 'EyeGlint_L', 'Block', [-0.06, 0.09, 0.05], [0.09, 0.09, 0.04], EYE_GLINT, 'SmoothPlastic', {
    parentId: 'pc_eye_orb_l',
  }),

  crabPart('pc_eye_stalk_r', 'EyeStalk_R', 'Block', [0.52, 0.66, 0.84], [0.32, 0.62, 0.3], SHELL_RIM, 'Plastic', {
    parentId: 'pc_carapace',
    pivotOffset: [0, -0.28, 0],
  }),
  crabPart('pc_eye_orb_r', 'EyeOrb_R', 'Block', [0, 0.1, 0.11], [0.28, 0.34, 0.12], EYE_CHARCOAL, 'SmoothPlastic', {
    parentId: 'pc_eye_stalk_r',
  }),
  crabPart('pc_eye_glint_r', 'EyeGlint_R', 'Block', [-0.06, 0.09, 0.05], [0.09, 0.09, 0.04], EYE_GLINT, 'SmoothPlastic', {
    parentId: 'pc_eye_orb_r',
  }),

  // 3. Dual Articulated Pincer Arms (Shoulder -> Wrist Cube -> Split Upper/Lower Pincers)
  crabPart('pc_arm_l', 'ArmShoulder_L', 'Block', [-1.3, -0.18, 0.94], [0.46, 0.42, 0.56], SHELL_RIM, 'Plastic', {
    parentId: 'pc_carapace',
    rotation: [6, 10, 0],
    pivotOffset: [0.1, 0, -0.22],
  }),
  crabPart('pc_claw_wrist_l', 'ClawWrist_L', 'Block', [-0.08, -0.14, 0.54], [0.76, 0.74, 0.76], SHELL_MAIN, 'Plastic', {
    parentId: 'pc_arm_l',
    rotation: [4, 14, 0],
    pivotOffset: [0, 0, -0.32],
  }),
  crabPart('pc_claw_accent_l', 'ClawTopAccent_L', 'Block', [0, 0.36, 0], [0.64, 0.08, 0.64], SHELL_LIGHT, 'Plastic', {
    parentId: 'pc_claw_wrist_l',
  }),
  crabPart('pc_pincer_upper_l', 'PincerUpper_L', 'Block', [0, 0.17, 0.6], [0.34, 0.28, 0.66], SHELL_LIGHT, 'Plastic', {
    parentId: 'pc_claw_wrist_l',
    rotation: [-14, 0, 0],
    pivotOffset: [0, 0, -0.28],
  }),
  crabPart('pc_pincer_ut_l', 'PincerUpperTip_L', 'Block', [0, 0, 0.36], [0.26, 0.2, 0.18], BELLY_CREAM, 'Plastic', {
    parentId: 'pc_pincer_upper_l',
  }),
  crabPart('pc_pincer_lower_l', 'PincerLower_L', 'Block', [0, -0.17, 0.56], [0.32, 0.24, 0.6], SHELL_HIGHLIGHT, 'Plastic', {
    parentId: 'pc_claw_wrist_l',
    rotation: [14, 0, 0],
    pivotOffset: [0, 0, -0.25],
  }),
  crabPart('pc_pincer_lt_l', 'PincerLowerTip_L', 'Block', [0, 0, 0.33], [0.24, 0.16, 0.16], BELLY_CREAM, 'Plastic', {
    parentId: 'pc_pincer_lower_l',
  }),

  crabPart('pc_arm_r', 'ArmShoulder_R', 'Block', [1.3, -0.18, 0.94], [0.46, 0.42, 0.56], SHELL_RIM, 'Plastic', {
    parentId: 'pc_carapace',
    rotation: [6, -10, 0],
    pivotOffset: [-0.1, 0, -0.22],
  }),
  crabPart('pc_claw_wrist_r', 'ClawWrist_R', 'Block', [0.08, -0.14, 0.54], [0.76, 0.74, 0.76], SHELL_MAIN, 'Plastic', {
    parentId: 'pc_arm_r',
    rotation: [4, -14, 0],
    pivotOffset: [0, 0, -0.32],
  }),
  crabPart('pc_claw_accent_r', 'ClawTopAccent_R', 'Block', [0, 0.36, 0], [0.64, 0.08, 0.64], SHELL_LIGHT, 'Plastic', {
    parentId: 'pc_claw_wrist_r',
  }),
  crabPart('pc_pincer_upper_r', 'PincerUpper_R', 'Block', [0, 0.17, 0.6], [0.34, 0.28, 0.66], SHELL_LIGHT, 'Plastic', {
    parentId: 'pc_claw_wrist_r',
    rotation: [-14, 0, 0],
    pivotOffset: [0, 0, -0.28],
  }),
  crabPart('pc_pincer_ut_r', 'PincerUpperTip_R', 'Block', [0, 0, 0.36], [0.26, 0.2, 0.18], BELLY_CREAM, 'Plastic', {
    parentId: 'pc_pincer_upper_r',
  }),
  crabPart('pc_pincer_lower_r', 'PincerLower_R', 'Block', [0, -0.17, 0.56], [0.32, 0.24, 0.6], SHELL_HIGHLIGHT, 'Plastic', {
    parentId: 'pc_claw_wrist_r',
    rotation: [14, 0, 0],
    pivotOffset: [0, 0, -0.25],
  }),
  crabPart('pc_pincer_lt_r', 'PincerLowerTip_R', 'Block', [0, 0, 0.33], [0.24, 0.16, 0.16], BELLY_CREAM, 'Plastic', {
    parentId: 'pc_pincer_lower_r',
  }),

  // 4. Six Segmented Walking Legs (Hip Femur -> Knee Shin -> Peach Claw Tip touching y ≈ 0)
  // Front-Left Leg (FL)
  crabPart('pc_hip_fl', 'LegHip_FL', 'Block', [-1.46, -0.06, 0.38], [0.66, 0.24, 0.24], SHELL_RIM, 'Plastic', {
    parentId: 'pc_carapace',
    rotation: [0, 22, 20],
    pivotOffset: [0.3, 0, 0],
  }),
  crabPart('pc_shin_fl', 'LegShin_FL', 'Block', [-0.3, -0.32, 0], [0.22, 0.72, 0.22], SHELL_MAIN, 'Plastic', {
    parentId: 'pc_hip_fl',
    rotation: [0, 0, -32],
    pivotOffset: [0, 0.32, 0],
  }),
  crabPart('pc_tip_fl', 'LegTip_FL', 'Block', [0, -0.44, 0], [0.2, 0.24, 0.2], BELLY_CREAM, 'Plastic', {
    parentId: 'pc_shin_fl',
  }),

  // Mid-Left Leg (ML)
  crabPart('pc_hip_ml', 'LegHip_ML', 'Block', [-1.5, -0.06, -0.15], [0.66, 0.24, 0.24], SHELL_RIM, 'Plastic', {
    parentId: 'pc_carapace',
    rotation: [0, 0, 20],
    pivotOffset: [0.3, 0, 0],
  }),
  crabPart('pc_shin_ml', 'LegShin_ML', 'Block', [-0.3, -0.32, 0], [0.22, 0.72, 0.22], SHELL_MAIN, 'Plastic', {
    parentId: 'pc_hip_ml',
    rotation: [0, 0, -32],
    pivotOffset: [0, 0.32, 0],
  }),
  crabPart('pc_tip_ml', 'LegTip_ML', 'Block', [0, -0.44, 0], [0.2, 0.24, 0.2], BELLY_CREAM, 'Plastic', {
    parentId: 'pc_shin_ml',
  }),

  // Back-Left Leg (BL)
  crabPart('pc_hip_bl', 'LegHip_BL', 'Block', [-1.42, -0.06, -0.68], [0.66, 0.24, 0.24], SHELL_RIM, 'Plastic', {
    parentId: 'pc_carapace',
    rotation: [0, -24, 20],
    pivotOffset: [0.3, 0, 0],
  }),
  crabPart('pc_shin_bl', 'LegShin_BL', 'Block', [-0.3, -0.32, 0], [0.22, 0.72, 0.22], SHELL_MAIN, 'Plastic', {
    parentId: 'pc_hip_bl',
    rotation: [0, 0, -32],
    pivotOffset: [0, 0.32, 0],
  }),
  crabPart('pc_tip_bl', 'LegTip_BL', 'Block', [0, -0.44, 0], [0.2, 0.24, 0.2], BELLY_CREAM, 'Plastic', {
    parentId: 'pc_shin_bl',
  }),

  // Front-Right Leg (FR)
  crabPart('pc_hip_fr', 'LegHip_FR', 'Block', [1.46, -0.06, 0.38], [0.66, 0.24, 0.24], SHELL_RIM, 'Plastic', {
    parentId: 'pc_carapace',
    rotation: [0, -22, -20],
    pivotOffset: [-0.3, 0, 0],
  }),
  crabPart('pc_shin_fr', 'LegShin_FR', 'Block', [0.3, -0.32, 0], [0.22, 0.72, 0.22], SHELL_MAIN, 'Plastic', {
    parentId: 'pc_hip_fr',
    rotation: [0, 0, 32],
    pivotOffset: [0, 0.32, 0],
  }),
  crabPart('pc_tip_fr', 'LegTip_FR', 'Block', [0, -0.44, 0], [0.2, 0.24, 0.2], BELLY_CREAM, 'Plastic', {
    parentId: 'pc_shin_fr',
  }),

  // Mid-Right Leg (MR)
  crabPart('pc_hip_mr', 'LegHip_MR', 'Block', [1.5, -0.06, -0.15], [0.66, 0.24, 0.24], SHELL_RIM, 'Plastic', {
    parentId: 'pc_carapace',
    rotation: [0, 0, -20],
    pivotOffset: [-0.3, 0, 0],
  }),
  crabPart('pc_shin_mr', 'LegShin_MR', 'Block', [0.3, -0.32, 0], [0.22, 0.72, 0.22], SHELL_MAIN, 'Plastic', {
    parentId: 'pc_hip_mr',
    rotation: [0, 0, 32],
    pivotOffset: [0, 0.32, 0],
  }),
  crabPart('pc_tip_mr', 'LegTip_MR', 'Block', [0, -0.44, 0], [0.2, 0.24, 0.2], BELLY_CREAM, 'Plastic', {
    parentId: 'pc_shin_mr',
  }),

  // Back-Right Leg (BR)
  crabPart('pc_hip_br', 'LegHip_BR', 'Block', [1.42, -0.06, -0.68], [0.66, 0.24, 0.24], SHELL_RIM, 'Plastic', {
    parentId: 'pc_carapace',
    rotation: [0, 24, -20],
    pivotOffset: [-0.3, 0, 0],
  }),
  crabPart('pc_shin_br', 'LegShin_BR', 'Block', [0.3, -0.32, 0], [0.22, 0.72, 0.22], SHELL_MAIN, 'Plastic', {
    parentId: 'pc_hip_br',
    rotation: [0, 0, 32],
    pivotOffset: [0, 0.32, 0],
  }),
  crabPart('pc_tip_br', 'LegTip_BR', 'Block', [0, -0.44, 0], [0.2, 0.24, 0.2], BELLY_CREAM, 'Plastic', {
    parentId: 'pc_shin_br',
  }),
];

// Stage 1: Idle — Gentle carapace breathing bob, alternating pincer snaps, and eye-stalk tilts
const puddleCrabIdleClip: AnimationClip = {
  id: 'clip_puddle_crab_idle',
  name: 'Idle',
  duration: 2.8,
  fps: 30,
  loop: true,
  priority: 'Idle',
  sampleMode: 'keyframes',
  fadeTime: 0.25,
  defaultWeight: 1,
  markers: [],
  tracks: [
    {
      partId: 'pc_carapace',
      keyframes: [
        { id: 'kf_pc_idle_car_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', position: [0, 1.12, 0], rotation: [0, 0, 0] },
        { id: 'kf_pc_idle_car_1', time: 1.4, easingStyle: 'Sine', easingDirection: 'InOut', position: [0, 1.17, 0], rotation: [2, 0, 0] },
        { id: 'kf_pc_idle_car_2', time: 2.8, easingStyle: 'Sine', easingDirection: 'InOut', position: [0, 1.12, 0], rotation: [0, 0, 0] },
      ],
    },
    {
      partId: 'pc_eye_stalk_l',
      keyframes: [
        { id: 'kf_pc_idle_el_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 0, 0] },
        { id: 'kf_pc_idle_el_1', time: 0.85, easingStyle: 'Quad', easingDirection: 'Out', rotation: [-8, 6, 4] },
        { id: 'kf_pc_idle_el_2', time: 1.85, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [6, -4, -2] },
        { id: 'kf_pc_idle_el_3', time: 2.8, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 0, 0] },
      ],
    },
    {
      partId: 'pc_eye_stalk_r',
      keyframes: [
        { id: 'kf_pc_idle_er_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 0, 0] },
        { id: 'kf_pc_idle_er_1', time: 0.85, easingStyle: 'Quad', easingDirection: 'Out', rotation: [6, 4, 2] },
        { id: 'kf_pc_idle_er_2', time: 1.85, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [-8, -6, -4] },
        { id: 'kf_pc_idle_er_3', time: 2.8, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 0, 0] },
      ],
    },
    {
      partId: 'pc_arm_l',
      keyframes: [
        { id: 'kf_pc_idle_al_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [6, 10, 0] },
        { id: 'kf_pc_idle_al_1', time: 1.4, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [-4, 13, -4] },
        { id: 'kf_pc_idle_al_2', time: 2.8, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [6, 10, 0] },
      ],
    },
    {
      partId: 'pc_arm_r',
      keyframes: [
        { id: 'kf_pc_idle_ar_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [2, -10, 0] },
        { id: 'kf_pc_idle_ar_1', time: 1.4, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [10, -14, 4] },
        { id: 'kf_pc_idle_ar_2', time: 2.8, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [2, -10, 0] },
      ],
    },
    {
      partId: 'pc_claw_wrist_l',
      keyframes: [
        { id: 'kf_pc_idle_wl_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [4, 14, 0] },
        { id: 'kf_pc_idle_wl_1', time: 0.8, easingStyle: 'Quad', easingDirection: 'Out', rotation: [-6, 10, -6] },
        { id: 'kf_pc_idle_wl_2', time: 1.8, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [6, 16, 2] },
        { id: 'kf_pc_idle_wl_3', time: 2.8, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [4, 14, 0] },
      ],
    },
    {
      partId: 'pc_claw_wrist_r',
      keyframes: [
        { id: 'kf_pc_idle_wr_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [4, -14, 0] },
        { id: 'kf_pc_idle_wr_1', time: 1.7, easingStyle: 'Quad', easingDirection: 'Out', rotation: [-8, -10, 6] },
        { id: 'kf_pc_idle_wr_2', time: 2.3, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [5, -16, -2] },
        { id: 'kf_pc_idle_wr_3', time: 2.8, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [4, -14, 0] },
      ],
    },
    {
      partId: 'pc_pincer_upper_l',
      keyframes: [
        { id: 'kf_pc_idle_pul_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [-14, 0, 0] },
        { id: 'kf_pc_idle_pul_1', time: 0.65, easingStyle: 'Quad', easingDirection: 'Out', rotation: [-20, 0, 0] },
        { id: 'kf_pc_idle_pul_2', time: 0.82, easingStyle: 'Back', easingDirection: 'Out', rotation: [-3, 0, 0] },
        { id: 'kf_pc_idle_pul_3', time: 1.15, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [-14, 0, 0] },
        { id: 'kf_pc_idle_pul_4', time: 2.8, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [-14, 0, 0] },
      ],
    },
    {
      partId: 'pc_pincer_lower_l',
      keyframes: [
        { id: 'kf_pc_idle_pll_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [14, 0, 0] },
        { id: 'kf_pc_idle_pll_1', time: 0.65, easingStyle: 'Quad', easingDirection: 'Out', rotation: [18, 0, 0] },
        { id: 'kf_pc_idle_pll_2', time: 0.82, easingStyle: 'Back', easingDirection: 'Out', rotation: [3, 0, 0] },
        { id: 'kf_pc_idle_pll_3', time: 1.15, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [14, 0, 0] },
        { id: 'kf_pc_idle_pll_4', time: 2.8, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [14, 0, 0] },
      ],
    },
    {
      partId: 'pc_pincer_upper_r',
      keyframes: [
        { id: 'kf_pc_idle_pur_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [-14, 0, 0] },
        { id: 'kf_pc_idle_pur_1', time: 1.65, easingStyle: 'Quad', easingDirection: 'Out', rotation: [-20, 0, 0] },
        { id: 'kf_pc_idle_pur_2', time: 1.82, easingStyle: 'Back', easingDirection: 'Out', rotation: [-3, 0, 0] },
        { id: 'kf_pc_idle_pur_3', time: 2.15, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [-14, 0, 0] },
        { id: 'kf_pc_idle_pur_4', time: 2.8, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [-14, 0, 0] },
      ],
    },
    {
      partId: 'pc_pincer_lower_r',
      keyframes: [
        { id: 'kf_pc_idle_plr_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [14, 0, 0] },
        { id: 'kf_pc_idle_plr_1', time: 1.65, easingStyle: 'Quad', easingDirection: 'Out', rotation: [18, 0, 0] },
        { id: 'kf_pc_idle_plr_2', time: 1.82, easingStyle: 'Back', easingDirection: 'Out', rotation: [3, 0, 0] },
        { id: 'kf_pc_idle_plr_3', time: 2.15, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [14, 0, 0] },
        { id: 'kf_pc_idle_plr_4', time: 2.8, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [14, 0, 0] },
      ],
    },
    // Subtle leg flex matching breathing bob
    {
      partId: 'pc_hip_fl',
      keyframes: [
        { id: 'kf_pc_idle_hfl_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 22, 20] },
        { id: 'kf_pc_idle_hfl_1', time: 1.4, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 22, 24] },
        { id: 'kf_pc_idle_hfl_2', time: 2.8, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 22, 20] },
      ],
    },
    {
      partId: 'pc_hip_ml',
      keyframes: [
        { id: 'kf_pc_idle_hml_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 0, 20] },
        { id: 'kf_pc_idle_hml_1', time: 1.4, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 0, 24] },
        { id: 'kf_pc_idle_hml_2', time: 2.8, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 0, 20] },
      ],
    },
    {
      partId: 'pc_hip_bl',
      keyframes: [
        { id: 'kf_pc_idle_hbl_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, -24, 20] },
        { id: 'kf_pc_idle_hbl_1', time: 1.4, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, -24, 24] },
        { id: 'kf_pc_idle_hbl_2', time: 2.8, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, -24, 20] },
      ],
    },
    {
      partId: 'pc_hip_fr',
      keyframes: [
        { id: 'kf_pc_idle_hfr_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, -22, -20] },
        { id: 'kf_pc_idle_hfr_1', time: 1.4, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, -22, -24] },
        { id: 'kf_pc_idle_hfr_2', time: 2.8, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, -22, -20] },
      ],
    },
    {
      partId: 'pc_hip_mr',
      keyframes: [
        { id: 'kf_pc_idle_hmr_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 0, -20] },
        { id: 'kf_pc_idle_hmr_1', time: 1.4, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 0, -24] },
        { id: 'kf_pc_idle_hmr_2', time: 2.8, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 0, -20] },
      ],
    },
    {
      partId: 'pc_hip_br',
      keyframes: [
        { id: 'kf_pc_idle_hbr_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 24, -20] },
        { id: 'kf_pc_idle_hbr_1', time: 1.4, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 24, -24] },
        { id: 'kf_pc_idle_hbr_2', time: 2.8, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 24, -20] },
      ],
    },
  ],
};

// Stage 2: Scuttle Walk — Lively alternating tripod crab gait across all 6 legs
const puddleCrabScuttleClip: AnimationClip = {
  id: 'clip_puddle_crab_scuttle',
  name: 'Scuttle Walk',
  duration: 1.2,
  fps: 30,
  loop: true,
  priority: 'Movement',
  sampleMode: 'resampled',
  fadeTime: 0.18,
  defaultWeight: 1,
  markers: [],
  tracks: [
    {
      partId: 'pc_carapace',
      keyframes: [
        { id: 'kf_pc_sc_car_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', position: [-0.1, 1.13, 0], rotation: [2, -3, -4] },
        { id: 'kf_pc_sc_car_1', time: 0.3, easingStyle: 'Sine', easingDirection: 'InOut', position: [0, 1.2, 0], rotation: [4, 0, 0] },
        { id: 'kf_pc_sc_car_2', time: 0.6, easingStyle: 'Sine', easingDirection: 'InOut', position: [0.1, 1.13, 0], rotation: [2, 3, 4] },
        { id: 'kf_pc_sc_car_3', time: 0.9, easingStyle: 'Sine', easingDirection: 'InOut', position: [0, 1.2, 0], rotation: [4, 0, 0] },
        { id: 'kf_pc_sc_car_4', time: 1.2, easingStyle: 'Sine', easingDirection: 'InOut', position: [-0.1, 1.13, 0], rotation: [2, -3, -4] },
      ],
    },
    {
      partId: 'pc_eye_stalk_l',
      keyframes: [
        { id: 'kf_pc_sc_el_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [-4, 4, 4] },
        { id: 'kf_pc_sc_el_1', time: 0.6, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [4, -4, -4] },
        { id: 'kf_pc_sc_el_2', time: 1.2, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [-4, 4, 4] },
      ],
    },
    {
      partId: 'pc_eye_stalk_r',
      keyframes: [
        { id: 'kf_pc_sc_er_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [4, 4, 4] },
        { id: 'kf_pc_sc_er_1', time: 0.6, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [-4, -4, -4] },
        { id: 'kf_pc_sc_er_2', time: 1.2, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [4, 4, 4] },
      ],
    },
    // Defensive poised pincers chattering during scuttle
    {
      partId: 'pc_arm_l',
      keyframes: [
        { id: 'kf_pc_sc_al_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [-10, 16, -6] },
        { id: 'kf_pc_sc_al_1', time: 0.6, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [-4, 10, 4] },
        { id: 'kf_pc_sc_al_2', time: 1.2, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [-10, 16, -6] },
      ],
    },
    {
      partId: 'pc_arm_r',
      keyframes: [
        { id: 'kf_pc_sc_ar_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [-4, -10, -4] },
        { id: 'kf_pc_sc_ar_1', time: 0.6, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [-10, -16, 6] },
        { id: 'kf_pc_sc_ar_2', time: 1.2, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [-4, -10, -4] },
      ],
    },
    {
      partId: 'pc_pincer_upper_l',
      keyframes: [
        { id: 'kf_pc_sc_pul_0', time: 0, easingStyle: 'Quad', easingDirection: 'InOut', rotation: [-18, 0, 0] },
        { id: 'kf_pc_sc_pul_1', time: 0.3, easingStyle: 'Back', easingDirection: 'Out', rotation: [-4, 0, 0] },
        { id: 'kf_pc_sc_pul_2', time: 0.6, easingStyle: 'Quad', easingDirection: 'InOut', rotation: [-18, 0, 0] },
        { id: 'kf_pc_sc_pul_3', time: 0.9, easingStyle: 'Back', easingDirection: 'Out', rotation: [-4, 0, 0] },
        { id: 'kf_pc_sc_pul_4', time: 1.2, easingStyle: 'Quad', easingDirection: 'InOut', rotation: [-18, 0, 0] },
      ],
    },
    {
      partId: 'pc_pincer_lower_l',
      keyframes: [
        { id: 'kf_pc_sc_pll_0', time: 0, easingStyle: 'Quad', easingDirection: 'InOut', rotation: [16, 0, 0] },
        { id: 'kf_pc_sc_pll_1', time: 0.3, easingStyle: 'Back', easingDirection: 'Out', rotation: [4, 0, 0] },
        { id: 'kf_pc_sc_pll_2', time: 0.6, easingStyle: 'Quad', easingDirection: 'InOut', rotation: [16, 0, 0] },
        { id: 'kf_pc_sc_pll_3', time: 0.9, easingStyle: 'Back', easingDirection: 'Out', rotation: [4, 0, 0] },
        { id: 'kf_pc_sc_pll_4', time: 1.2, easingStyle: 'Quad', easingDirection: 'InOut', rotation: [16, 0, 0] },
      ],
    },
    {
      partId: 'pc_pincer_upper_r',
      keyframes: [
        { id: 'kf_pc_sc_pur_0', time: 0, easingStyle: 'Back', easingDirection: 'Out', rotation: [-4, 0, 0] },
        { id: 'kf_pc_sc_pur_1', time: 0.3, easingStyle: 'Quad', easingDirection: 'InOut', rotation: [-18, 0, 0] },
        { id: 'kf_pc_sc_pur_2', time: 0.6, easingStyle: 'Back', easingDirection: 'Out', rotation: [-4, 0, 0] },
        { id: 'kf_pc_sc_pur_3', time: 0.9, easingStyle: 'Quad', easingDirection: 'InOut', rotation: [-18, 0, 0] },
        { id: 'kf_pc_sc_pur_4', time: 1.2, easingStyle: 'Back', easingDirection: 'Out', rotation: [-4, 0, 0] },
      ],
    },
    {
      partId: 'pc_pincer_lower_r',
      keyframes: [
        { id: 'kf_pc_sc_plr_0', time: 0, easingStyle: 'Back', easingDirection: 'Out', rotation: [4, 0, 0] },
        { id: 'kf_pc_sc_plr_1', time: 0.3, easingStyle: 'Quad', easingDirection: 'InOut', rotation: [16, 0, 0] },
        { id: 'kf_pc_sc_plr_2', time: 0.6, easingStyle: 'Back', easingDirection: 'Out', rotation: [4, 0, 0] },
        { id: 'kf_pc_sc_plr_3', time: 0.9, easingStyle: 'Quad', easingDirection: 'InOut', rotation: [16, 0, 0] },
        { id: 'kf_pc_sc_plr_4', time: 1.2, easingStyle: 'Back', easingDirection: 'Out', rotation: [4, 0, 0] },
      ],
    },

    // Tripod A: FL + MR + BL (lift & stride on first half, plant & push on second half)
    {
      partId: 'pc_hip_fl',
      keyframes: [
        { id: 'kf_pc_sc_hfl_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 12, 24] },
        { id: 'kf_pc_sc_hfl_1', time: 0.3, easingStyle: 'Quad', easingDirection: 'Out', rotation: [0, 26, -6] },
        { id: 'kf_pc_sc_hfl_2', time: 0.6, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 34, 20] },
        { id: 'kf_pc_sc_hfl_3', time: 0.9, easingStyle: 'Linear', easingDirection: 'InOut', rotation: [0, 22, 24] },
        { id: 'kf_pc_sc_hfl_4', time: 1.2, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 12, 24] },
      ],
    },
    {
      partId: 'pc_shin_fl',
      keyframes: [
        { id: 'kf_pc_sc_sfl_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 0, -34] },
        { id: 'kf_pc_sc_sfl_1', time: 0.3, easingStyle: 'Quad', easingDirection: 'Out', rotation: [0, 0, -14] },
        { id: 'kf_pc_sc_sfl_2', time: 0.6, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 0, -32] },
        { id: 'kf_pc_sc_sfl_3', time: 1.2, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 0, -34] },
      ],
    },
    {
      partId: 'pc_hip_mr',
      keyframes: [
        { id: 'kf_pc_sc_hmr_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 10, -24] },
        { id: 'kf_pc_sc_hmr_1', time: 0.3, easingStyle: 'Quad', easingDirection: 'Out', rotation: [0, -2, 6] },
        { id: 'kf_pc_sc_hmr_2', time: 0.6, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, -12, -20] },
        { id: 'kf_pc_sc_hmr_3', time: 0.9, easingStyle: 'Linear', easingDirection: 'InOut', rotation: [0, 0, -24] },
        { id: 'kf_pc_sc_hmr_4', time: 1.2, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 10, -24] },
      ],
    },
    {
      partId: 'pc_shin_mr',
      keyframes: [
        { id: 'kf_pc_sc_smr_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 0, 34] },
        { id: 'kf_pc_sc_smr_1', time: 0.3, easingStyle: 'Quad', easingDirection: 'Out', rotation: [0, 0, 14] },
        { id: 'kf_pc_sc_smr_2', time: 0.6, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 0, 32] },
        { id: 'kf_pc_sc_smr_3', time: 1.2, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 0, 34] },
      ],
    },
    {
      partId: 'pc_hip_bl',
      keyframes: [
        { id: 'kf_pc_sc_hbl_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, -34, 24] },
        { id: 'kf_pc_sc_hbl_1', time: 0.3, easingStyle: 'Quad', easingDirection: 'Out', rotation: [0, -20, -6] },
        { id: 'kf_pc_sc_hbl_2', time: 0.6, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, -12, 20] },
        { id: 'kf_pc_sc_hbl_3', time: 0.9, easingStyle: 'Linear', easingDirection: 'InOut', rotation: [0, -24, 24] },
        { id: 'kf_pc_sc_hbl_4', time: 1.2, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, -34, 24] },
      ],
    },
    {
      partId: 'pc_shin_bl',
      keyframes: [
        { id: 'kf_pc_sc_sbl_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 0, -34] },
        { id: 'kf_pc_sc_sbl_1', time: 0.3, easingStyle: 'Quad', easingDirection: 'Out', rotation: [0, 0, -14] },
        { id: 'kf_pc_sc_sbl_2', time: 0.6, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 0, -32] },
        { id: 'kf_pc_sc_sbl_3', time: 1.2, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 0, -34] },
      ],
    },

    // Tripod B: FR + ML + BR (plant & push on first half, lift & stride on second half)
    {
      partId: 'pc_hip_fr',
      keyframes: [
        { id: 'kf_pc_sc_hfr_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, -34, -20] },
        { id: 'kf_pc_sc_hfr_1', time: 0.3, easingStyle: 'Linear', easingDirection: 'InOut', rotation: [0, -22, -24] },
        { id: 'kf_pc_sc_hfr_2', time: 0.6, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, -12, -24] },
        { id: 'kf_pc_sc_hfr_3', time: 0.9, easingStyle: 'Quad', easingDirection: 'Out', rotation: [0, -26, 6] },
        { id: 'kf_pc_sc_hfr_4', time: 1.2, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, -34, -20] },
      ],
    },
    {
      partId: 'pc_shin_fr',
      keyframes: [
        { id: 'kf_pc_sc_sfr_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 0, 32] },
        { id: 'kf_pc_sc_sfr_1', time: 0.6, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 0, 34] },
        { id: 'kf_pc_sc_sfr_2', time: 0.9, easingStyle: 'Quad', easingDirection: 'Out', rotation: [0, 0, 14] },
        { id: 'kf_pc_sc_sfr_3', time: 1.2, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 0, 32] },
      ],
    },
    {
      partId: 'pc_hip_ml',
      keyframes: [
        { id: 'kf_pc_sc_hml_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 12, 20] },
        { id: 'kf_pc_sc_hml_1', time: 0.3, easingStyle: 'Linear', easingDirection: 'InOut', rotation: [0, 0, 24] },
        { id: 'kf_pc_sc_hml_2', time: 0.6, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, -10, 24] },
        { id: 'kf_pc_sc_hml_3', time: 0.9, easingStyle: 'Quad', easingDirection: 'Out', rotation: [0, 2, -6] },
        { id: 'kf_pc_sc_hml_4', time: 1.2, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 12, 20] },
      ],
    },
    {
      partId: 'pc_shin_ml',
      keyframes: [
        { id: 'kf_pc_sc_sml_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 0, -32] },
        { id: 'kf_pc_sc_sml_1', time: 0.6, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 0, -34] },
        { id: 'kf_pc_sc_sml_2', time: 0.9, easingStyle: 'Quad', easingDirection: 'Out', rotation: [0, 0, -14] },
        { id: 'kf_pc_sc_sml_3', time: 1.2, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 0, -32] },
      ],
    },
    {
      partId: 'pc_hip_br',
      keyframes: [
        { id: 'kf_pc_sc_hbr_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 12, -20] },
        { id: 'kf_pc_sc_hbr_1', time: 0.3, easingStyle: 'Linear', easingDirection: 'InOut', rotation: [0, 24, -24] },
        { id: 'kf_pc_sc_hbr_2', time: 0.6, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 34, -24] },
        { id: 'kf_pc_sc_hbr_3', time: 0.9, easingStyle: 'Quad', easingDirection: 'Out', rotation: [0, 20, 6] },
        { id: 'kf_pc_sc_hbr_4', time: 1.2, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 12, -20] },
      ],
    },
    {
      partId: 'pc_shin_br',
      keyframes: [
        { id: 'kf_pc_sc_sbr_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 0, 32] },
        { id: 'kf_pc_sc_sbr_1', time: 0.6, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 0, 34] },
        { id: 'kf_pc_sc_sbr_2', time: 0.9, easingStyle: 'Quad', easingDirection: 'Out', rotation: [0, 0, 14] },
        { id: 'kf_pc_sc_sbr_3', time: 1.2, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 0, 32] },
      ],
    },
  ],
};

export const puddleCrabPreset: ModelPreset = {
  id: 'puddle-crab',
  label: 'Puddle Crab',
  description:
    '51-part rigged blocky terracotta crab with articulated dual pincers, 6 walking legs, and Idle + Scuttle Walk animations.',
  model: {
    name: 'PuddleCrab',
    primaryPartId: 'pc_carapace',
    parts: puddleCrabParts,
    animations: [puddleCrabIdleClip, puddleCrabScuttleClip],
    scripts: [],
  },
};
