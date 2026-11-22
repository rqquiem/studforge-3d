import { AnimationClip, PartShape, StudioPartNode } from './robloxTypes';
import type { ModelPreset } from './presets';

function snailPart(
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

// Puddle Snail Palette (matched to reference creature sheet)
const BODY_LIGHT = '#DFC6A6';
const BODY_MAIN = '#CEB08D';
const BODY_MID = '#BC9B77';
const BODY_TRIM = '#A88662';
const EYE_CHARCOAL = '#1E2229';

const STONE_HIGHLIGHT = '#89918C';
const STONE_MAIN = '#707873';
const STONE_MID = '#5D6560';
const STONE_DARK = '#444B47';
const MOSS_DARK = '#557034';
const MOSS_BRIGHT = '#6E8C43';

const puddleSnailParts: StudioPartNode[] = [
  // 1. Elongated Gastropod Foot, Stepped Skirts & Tapered Tail (bottom rests on y = 0)
  snailPart('ps_foot', 'BodyFootCore', 'Block', [0, 0.22, -0.1], [1.34, 0.44, 3.24], BODY_MAIN, 'Plastic', {
    anchored: true,
  }),
  snailPart('ps_body_mid', 'BodyMidTrim', 'Block', [0, 0.2, 0.04], [1.18, 0.24, 2.48], BODY_MID, 'Plastic', {
    parentId: 'ps_foot',
  }),
  snailPart('ps_foot_l1', 'FootSkirt_L1', 'Block', [-0.72, -0.13, 0.8], [0.16, 0.18, 0.72], BODY_TRIM, 'Plastic', {
    parentId: 'ps_foot',
  }),
  snailPart('ps_foot_l2', 'FootSkirt_L2', 'Block', [-0.72, -0.13, -0.1], [0.16, 0.18, 0.76], BODY_TRIM, 'Plastic', {
    parentId: 'ps_foot',
  }),
  snailPart('ps_foot_l3', 'FootSkirt_L3', 'Block', [-0.7, -0.13, -0.98], [0.14, 0.18, 0.64], BODY_TRIM, 'Plastic', {
    parentId: 'ps_foot',
  }),
  snailPart('ps_foot_r1', 'FootSkirt_R1', 'Block', [0.72, -0.13, 0.8], [0.16, 0.18, 0.72], BODY_TRIM, 'Plastic', {
    parentId: 'ps_foot',
  }),
  snailPart('ps_foot_r2', 'FootSkirt_R2', 'Block', [0.72, -0.13, -0.1], [0.16, 0.18, 0.76], BODY_TRIM, 'Plastic', {
    parentId: 'ps_foot',
  }),
  snailPart('ps_foot_r3', 'FootSkirt_R3', 'Block', [0.7, -0.13, -0.98], [0.14, 0.18, 0.64], BODY_TRIM, 'Plastic', {
    parentId: 'ps_foot',
  }),

  // Articulated Tapered Tail
  snailPart('ps_tail', 'TailTip', 'Block', [0, -0.04, -1.82], [0.88, 0.34, 0.62], BODY_MAIN, 'Plastic', {
    parentId: 'ps_foot',
    pivotOffset: [0, 0, 0.28],
  }),
  snailPart('ps_tail_end', 'TailEnd', 'Block', [0, -0.05, -0.36], [0.54, 0.22, 0.36], BODY_MID, 'Plastic', {
    parentId: 'ps_tail',
  }),

  // 2. Sloped Neck, Blocky Head, Upper Eye Stalks & Lower Feelers
  snailPart('ps_neck', 'NeckSegment', 'Block', [0, 0.24, 1.38], [1.14, 0.56, 0.98], BODY_MAIN, 'Plastic', {
    parentId: 'ps_foot',
    rotation: [-28, 0, 0],
    pivotOffset: [0, -0.12, -0.38],
  }),
  snailPart('ps_head', 'HeadCube', 'Block', [0, 0.24, 0.62], [1.16, 0.86, 1.04], BODY_LIGHT, 'Plastic', {
    parentId: 'ps_neck',
    rotation: [26, 0, 0],
    pivotOffset: [0, -0.22, -0.42],
  }),
  snailPart('ps_cheek_l', 'HeadCheek_L', 'Block', [-0.55, -0.05, -0.04], [0.12, 0.64, 0.82], BODY_MID, 'Plastic', {
    parentId: 'ps_head',
  }),
  snailPart('ps_cheek_r', 'HeadCheek_R', 'Block', [0.55, -0.05, -0.04], [0.12, 0.64, 0.82], BODY_MID, 'Plastic', {
    parentId: 'ps_head',
  }),
  snailPart('ps_muzzle', 'HeadMuzzle', 'Block', [0, -0.14, 0.51], [0.84, 0.42, 0.1], BODY_MAIN, 'Plastic', {
    parentId: 'ps_head',
  }),

  // Twin Long Upright Eye Stalks & Charcoal Eye Tips
  snailPart('ps_eye_stalk_l', 'EyeStalk_L', 'Block', [-0.36, 0.72, 0.28], [0.16, 0.78, 0.16], BODY_LIGHT, 'Plastic', {
    parentId: 'ps_head',
    rotation: [16, 0, 10],
    pivotOffset: [0, -0.36, 0],
  }),
  snailPart('ps_eye_tip_l', 'EyeTip_L', 'Block', [0, 0.42, 0], [0.18, 0.18, 0.18], EYE_CHARCOAL, 'SmoothPlastic', {
    parentId: 'ps_eye_stalk_l',
  }),
  snailPart('ps_eye_stalk_r', 'EyeStalk_R', 'Block', [0.36, 0.72, 0.28], [0.16, 0.78, 0.16], BODY_LIGHT, 'Plastic', {
    parentId: 'ps_head',
    rotation: [16, 0, -10],
    pivotOffset: [0, -0.36, 0],
  }),
  snailPart('ps_eye_tip_r', 'EyeTip_R', 'Block', [0, 0.42, 0], [0.18, 0.18, 0.18], EYE_CHARCOAL, 'SmoothPlastic', {
    parentId: 'ps_eye_stalk_r',
  }),

  // Twin Short Lower Feelers
  snailPart('ps_feeler_l', 'Feeler_L', 'Block', [-0.36, -0.14, 0.62], [0.15, 0.15, 0.38], BODY_LIGHT, 'Plastic', {
    parentId: 'ps_head',
    rotation: [10, -14, 0],
    pivotOffset: [0, 0, -0.17],
  }),
  snailPart('ps_feeler_r', 'Feeler_R', 'Block', [0.36, -0.14, 0.62], [0.15, 0.15, 0.38], BODY_LIGHT, 'Plastic', {
    parentId: 'ps_head',
    rotation: [10, 14, 0],
    pivotOffset: [0, 0, -0.17],
  }),

  // 3. Mossy Cobblestone Spiral Shell (articulated on saddle pivot above BodyFootCore)
  snailPart('ps_shell_base', 'ShellBase', 'Block', [0, 0.96, -0.14], [1.86, 1.54, 1.88], STONE_MAIN, 'Plastic', {
    parentId: 'ps_foot',
    pivotOffset: [0, -0.74, 0],
  }),
  snailPart('ps_shell_top', 'ShellTopCap', 'Block', [0, 0.88, -0.02], [1.5, 0.26, 1.48], STONE_HIGHLIGHT, 'Plastic', {
    parentId: 'ps_shell_base',
  }),
  snailPart('ps_shell_front', 'ShellFrontStep', 'Block', [0, 0.08, 1.0], [1.52, 1.12, 0.22], STONE_MAIN, 'Plastic', {
    parentId: 'ps_shell_base',
  }),
  snailPart('ps_shell_back', 'ShellBackStep', 'Block', [0, -0.02, -1.02], [1.54, 1.24, 0.26], STONE_MID, 'Plastic', {
    parentId: 'ps_shell_base',
  }),
  snailPart('ps_shell_lip', 'ShellFrontLip', 'Block', [0, -0.5, 1.06], [1.6, 0.34, 0.32], STONE_MID, 'Plastic', {
    parentId: 'ps_shell_base',
  }),
  snailPart('ps_shell_arch_l', 'ShellArch_L', 'Block', [-0.66, -0.34, 1.08], [0.28, 0.42, 0.24], STONE_DARK, 'Plastic', {
    parentId: 'ps_shell_base',
  }),
  snailPart('ps_shell_arch_r', 'ShellArch_R', 'Block', [0.66, -0.34, 1.08], [0.28, 0.42, 0.24], STONE_DARK, 'Plastic', {
    parentId: 'ps_shell_base',
  }),

  // Top Crown Spiral Motif (asymmetric swirl)
  snailPart('ps_top_spiral_a', 'TopSpiral_Outer', 'Block', [0, 1.03, -0.04], [0.96, 0.06, 0.96], STONE_DARK, 'Plastic', {
    parentId: 'ps_shell_base',
  }),
  snailPart('ps_top_spiral_b', 'TopSpiral_Inner', 'Block', [0.08, 1.05, 0.06], [0.6, 0.06, 0.58], STONE_HIGHLIGHT, 'Plastic', {
    parentId: 'ps_shell_base',
  }),
  snailPart('ps_top_spiral_c', 'TopSpiral_Core', 'Block', [-0.04, 1.07, -0.02], [0.26, 0.06, 0.28], STONE_DARK, 'Plastic', {
    parentId: 'ps_shell_base',
  }),

  // Left Side Spiral Whorl Medallion (offset spiral curl)
  snailPart('ps_drum_l', 'ShellWhorlDrum_L', 'Block', [-0.97, -0.08, -0.04], [0.14, 1.18, 1.22], STONE_HIGHLIGHT, 'Plastic', {
    parentId: 'ps_shell_base',
  }),
  snailPart('ps_sp_l1', 'SpiralCrevice_L1', 'Block', [-1.04, -0.08, -0.04], [0.06, 0.92, 0.94], STONE_DARK, 'Plastic', {
    parentId: 'ps_shell_base',
  }),
  snailPart('ps_sp_l2', 'SpiralCoil_L1', 'Block', [-1.06, -0.02, 0.04], [0.06, 0.64, 0.64], STONE_HIGHLIGHT, 'Plastic', {
    parentId: 'ps_shell_base',
  }),
  snailPart('ps_sp_l3', 'SpiralCrevice_L2', 'Block', [-1.08, -0.1, -0.04], [0.06, 0.36, 0.36], STONE_DARK, 'Plastic', {
    parentId: 'ps_shell_base',
  }),
  snailPart('ps_sp_l4', 'SpiralHub_L', 'Block', [-1.1, -0.06, 0.02], [0.06, 0.16, 0.16], STONE_HIGHLIGHT, 'Plastic', {
    parentId: 'ps_shell_base',
  }),

  // Right Side Spiral Whorl Medallion (offset spiral curl)
  snailPart('ps_drum_r', 'ShellWhorlDrum_R', 'Block', [0.97, -0.08, -0.04], [0.14, 1.18, 1.22], STONE_HIGHLIGHT, 'Plastic', {
    parentId: 'ps_shell_base',
  }),
  snailPart('ps_sp_r1', 'SpiralCrevice_R1', 'Block', [1.04, -0.08, -0.04], [0.06, 0.92, 0.94], STONE_DARK, 'Plastic', {
    parentId: 'ps_shell_base',
  }),
  snailPart('ps_sp_r2', 'SpiralCoil_R1', 'Block', [1.06, -0.02, 0.04], [0.06, 0.64, 0.64], STONE_HIGHLIGHT, 'Plastic', {
    parentId: 'ps_shell_base',
  }),
  snailPart('ps_sp_r3', 'SpiralCrevice_R2', 'Block', [1.08, -0.1, -0.04], [0.06, 0.36, 0.36], STONE_DARK, 'Plastic', {
    parentId: 'ps_shell_base',
  }),
  snailPart('ps_sp_r4', 'SpiralHub_R', 'Block', [1.1, -0.06, 0.02], [0.06, 0.16, 0.16], STONE_HIGHLIGHT, 'Plastic', {
    parentId: 'ps_shell_base',
  }),

  // Weathered Moss Patches Clinging Across Stone Ledges
  snailPart('ps_moss_1', 'ShellMoss_FrontTop', 'Block', [0.24, 0.56, 1.02], [0.64, 0.32, 0.24], MOSS_BRIGHT, 'Plastic', {
    parentId: 'ps_shell_base',
  }),
  snailPart('ps_moss_2', 'ShellMoss_FrontLeft', 'Block', [-0.46, 0.26, 1.04], [0.36, 0.28, 0.2], MOSS_DARK, 'Plastic', {
    parentId: 'ps_shell_base',
  }),
  snailPart('ps_moss_3', 'ShellMoss_CrownL', 'Block', [-0.52, 0.92, 0.44], [0.46, 0.18, 0.44], MOSS_BRIGHT, 'Plastic', {
    parentId: 'ps_shell_base',
  }),
  snailPart('ps_moss_4', 'ShellMoss_CrownR', 'Block', [0.56, 0.88, -0.34], [0.42, 0.22, 0.52], MOSS_DARK, 'Plastic', {
    parentId: 'ps_shell_base',
  }),
  snailPart('ps_moss_5', 'ShellMoss_ShoulderL', 'Block', [-0.88, 0.54, 0.34], [0.2, 0.34, 0.48], MOSS_DARK, 'Plastic', {
    parentId: 'ps_shell_base',
  }),
  snailPart('ps_moss_6', 'ShellMoss_ShoulderR', 'Block', [0.88, 0.48, 0.28], [0.2, 0.36, 0.44], MOSS_BRIGHT, 'Plastic', {
    parentId: 'ps_shell_base',
  }),
  snailPart('ps_moss_7', 'ShellMoss_BackTop', 'Block', [-0.18, 0.44, -1.06], [0.58, 0.34, 0.22], MOSS_DARK, 'Plastic', {
    parentId: 'ps_shell_base',
  }),
  snailPart('ps_moss_8', 'ShellMoss_BackLow', 'Block', [0.38, -0.12, -1.08], [0.44, 0.32, 0.2], MOSS_BRIGHT, 'Plastic', {
    parentId: 'ps_shell_base',
  }),
];

// Stage 1: Idle — Calm gastropod breathing sway, curious head tilt & independent eye-stalk probing
const puddleSnailIdleClip: AnimationClip = {
  id: 'clip_puddle_snail_idle',
  name: 'Idle',
  duration: 3.0,
  fps: 30,
  loop: true,
  priority: 'Idle',
  sampleMode: 'keyframes',
  fadeTime: 0.25,
  defaultWeight: 1,
  markers: [],
  tracks: [
    {
      partId: 'ps_neck',
      keyframes: [
        { id: 'kf_ps_idle_nk_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [-28, 0, 0] },
        { id: 'kf_ps_idle_nk_1', time: 1.5, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [-22, 3, 0] },
        { id: 'kf_ps_idle_nk_2', time: 3.0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [-28, 0, 0] },
      ],
    },
    {
      partId: 'ps_head',
      keyframes: [
        { id: 'kf_ps_idle_hd_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [26, 0, 0] },
        { id: 'kf_ps_idle_hd_1', time: 0.9, easingStyle: 'Quad', easingDirection: 'Out', rotation: [22, -10, 4] },
        { id: 'kf_ps_idle_hd_2', time: 2.1, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [28, 9, -4] },
        { id: 'kf_ps_idle_hd_3', time: 3.0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [26, 0, 0] },
      ],
    },
    {
      partId: 'ps_eye_stalk_l',
      keyframes: [
        { id: 'kf_ps_idle_el_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [16, 0, 10] },
        { id: 'kf_ps_idle_el_1', time: 0.75, easingStyle: 'Quad', easingDirection: 'Out', rotation: [8, -6, 16] },
        { id: 'kf_ps_idle_el_2', time: 1.65, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [24, 6, 6] },
        { id: 'kf_ps_idle_el_3', time: 3.0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [16, 0, 10] },
      ],
    },
    {
      partId: 'ps_eye_stalk_r',
      keyframes: [
        { id: 'kf_ps_idle_er_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [16, 0, -10] },
        { id: 'kf_ps_idle_er_1', time: 1.1, easingStyle: 'Quad', easingDirection: 'Out', rotation: [25, -5, -6] },
        { id: 'kf_ps_idle_er_2', time: 2.2, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [6, 8, -16] },
        { id: 'kf_ps_idle_er_3', time: 3.0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [16, 0, -10] },
      ],
    },
    {
      partId: 'ps_feeler_l',
      keyframes: [
        { id: 'kf_ps_idle_fl_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [10, -14, 0] },
        { id: 'kf_ps_idle_fl_1', time: 1.2, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [18, -22, 0] },
        { id: 'kf_ps_idle_fl_2', time: 2.3, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [4, -10, 0] },
        { id: 'kf_ps_idle_fl_3', time: 3.0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [10, -14, 0] },
      ],
    },
    {
      partId: 'ps_feeler_r',
      keyframes: [
        { id: 'kf_ps_idle_fr_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [10, 14, 0] },
        { id: 'kf_ps_idle_fr_1', time: 0.9, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [4, 10, 0] },
        { id: 'kf_ps_idle_fr_2', time: 2.0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [18, 22, 0] },
        { id: 'kf_ps_idle_fr_3', time: 3.0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [10, 14, 0] },
      ],
    },
    {
      partId: 'ps_shell_base',
      keyframes: [
        { id: 'kf_ps_idle_sh_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 0, 0] },
        { id: 'kf_ps_idle_sh_1', time: 1.5, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [-2, 0, 1.5] },
        { id: 'kf_ps_idle_sh_2', time: 3.0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 0, 0] },
      ],
    },
  ],
};

// Stage 2: Glide Crawl — Smooth undulating gastropod locomotion with shell rock & sensory sweeps
const puddleSnailCrawlClip: AnimationClip = {
  id: 'clip_puddle_snail_crawl',
  name: 'Glide Crawl',
  duration: 1.8,
  fps: 30,
  loop: true,
  priority: 'Movement',
  sampleMode: 'resampled',
  fadeTime: 0.2,
  defaultWeight: 1,
  markers: [],
  tracks: [
    {
      partId: 'ps_foot',
      keyframes: [
        { id: 'kf_ps_cr_ft_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', position: [0, 0.22, -0.14], size: [1.34, 0.44, 3.24] },
        { id: 'kf_ps_cr_ft_1', time: 0.45, easingStyle: 'Sine', easingDirection: 'InOut', position: [0, 0.21, -0.06], size: [1.28, 0.42, 3.42] },
        { id: 'kf_ps_cr_ft_2', time: 0.9, easingStyle: 'Sine', easingDirection: 'InOut', position: [0, 0.22, -0.08], size: [1.36, 0.44, 3.2] },
        { id: 'kf_ps_cr_ft_3', time: 1.35, easingStyle: 'Sine', easingDirection: 'InOut', position: [0, 0.23, -0.16], size: [1.4, 0.46, 3.08] },
        { id: 'kf_ps_cr_ft_4', time: 1.8, easingStyle: 'Sine', easingDirection: 'InOut', position: [0, 0.22, -0.14], size: [1.34, 0.44, 3.24] },
      ],
    },
    {
      partId: 'ps_neck',
      keyframes: [
        { id: 'kf_ps_cr_nk_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', position: [0, 0.24, 1.38], rotation: [-24, 0, 0] },
        { id: 'kf_ps_cr_nk_1', time: 0.45, easingStyle: 'Quad', easingDirection: 'Out', position: [0, 0.22, 1.56], rotation: [-18, 0, 0] },
        { id: 'kf_ps_cr_nk_2', time: 1.15, easingStyle: 'Sine', easingDirection: 'InOut', position: [0, 0.28, 1.3], rotation: [-34, 0, 0] },
        { id: 'kf_ps_cr_nk_3', time: 1.8, easingStyle: 'Sine', easingDirection: 'InOut', position: [0, 0.24, 1.38], rotation: [-24, 0, 0] },
      ],
    },
    {
      partId: 'ps_head',
      keyframes: [
        { id: 'kf_ps_cr_hd_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [22, -4, 0] },
        { id: 'kf_ps_cr_hd_1', time: 0.45, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [16, 4, 0] },
        { id: 'kf_ps_cr_hd_2', time: 1.15, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [32, 0, 0] },
        { id: 'kf_ps_cr_hd_3', time: 1.8, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [22, -4, 0] },
      ],
    },
    {
      partId: 'ps_tail',
      keyframes: [
        { id: 'kf_ps_cr_tl_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', position: [0, -0.04, -1.86], rotation: [0, 0, 0] },
        { id: 'kf_ps_cr_tl_1', time: 0.9, easingStyle: 'Sine', easingDirection: 'InOut', position: [0, -0.02, -1.72], rotation: [6, 0, 0] },
        { id: 'kf_ps_cr_tl_2', time: 1.8, easingStyle: 'Sine', easingDirection: 'InOut', position: [0, -0.04, -1.86], rotation: [0, 0, 0] },
      ],
    },
    {
      partId: 'ps_shell_base',
      keyframes: [
        { id: 'kf_ps_cr_sh_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [-3, 0, -2.5] },
        { id: 'kf_ps_cr_sh_1', time: 0.45, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [3, 0, 0] },
        { id: 'kf_ps_cr_sh_2', time: 0.9, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [5, 0, 2.5] },
        { id: 'kf_ps_cr_sh_3', time: 1.35, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [-1, 0, 0] },
        { id: 'kf_ps_cr_sh_4', time: 1.8, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [-3, 0, -2.5] },
      ],
    },
    {
      partId: 'ps_eye_stalk_l',
      keyframes: [
        { id: 'kf_ps_cr_el_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [20, 0, 12] },
        { id: 'kf_ps_cr_el_1', time: 0.9, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [10, -4, 8] },
        { id: 'kf_ps_cr_el_2', time: 1.8, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [20, 0, 12] },
      ],
    },
    {
      partId: 'ps_eye_stalk_r',
      keyframes: [
        { id: 'kf_ps_cr_er_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [12, 0, -8] },
        { id: 'kf_ps_cr_er_1', time: 0.9, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [22, 4, -12] },
        { id: 'kf_ps_cr_er_2', time: 1.8, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [12, 0, -8] },
      ],
    },
    {
      partId: 'ps_feeler_l',
      keyframes: [
        { id: 'kf_ps_cr_fl_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [14, -18, 0] },
        { id: 'kf_ps_cr_fl_1', time: 0.9, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [4, -10, 0] },
        { id: 'kf_ps_cr_fl_2', time: 1.8, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [14, -18, 0] },
      ],
    },
    {
      partId: 'ps_feeler_r',
      keyframes: [
        { id: 'kf_ps_cr_fr_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [4, 10, 0] },
        { id: 'kf_ps_cr_fr_1', time: 0.9, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [14, 18, 0] },
        { id: 'kf_ps_cr_fr_2', time: 1.8, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [4, 10, 0] },
      ],
    },
  ],
};

export const puddleSnailPreset: ModelPreset = {
  id: 'puddle-snail',
  label: 'Puddle Snail',
  description: `${puddleSnailParts.length}-part rigged blocky mossy stone snail with sculpted spiral shell, articulated head & stalks, and Idle + Glide Crawl animations.`,
  model: {
    name: 'PuddleSnail',
    primaryPartId: 'ps_foot',
    parts: puddleSnailParts,
    animations: [puddleSnailIdleClip, puddleSnailCrawlClip],
    scripts: [],
  },
};
