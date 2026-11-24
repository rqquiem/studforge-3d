import { AnimationClip, PartShape, StudioPartNode } from './robloxTypes';
import type { ModelPreset } from './presets';

function newtPart(
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

// Driftwood Newt Palette (matched to reference creature sheet)
const BARK_MAIN = '#7C5D44';
const BARK_LIGHT = '#987759';
const BARK_PALE = '#B39170';
const BARK_DARK = '#573F2D';
const BARK_DEEP = '#38261B';
const BELLY_CREAM = '#C7AD89';
const BELLY_TRIM = '#AE926C';
const MOSS_BRIGHT = '#618C2A';
const MOSS_DARK = '#42631D';
const SPROUT_STEM = '#73A334';
const SPROUT_TIP = '#95C447';
const MUSH_STEM = '#E8DFCE';
const MUSH_RED = '#C83E2B';
const MUSH_SHADE = '#A42D1E';
const MUSH_SPOT = '#F5F0E6';
const EYE_PUPIL = '#171A21';
const EYE_WHITE = '#F1F5F9';

const driftwoodNewtParts: StudioPartNode[] = [
  // ===========================================================================
  // 1. Weathered Driftwood Torso, Knotholes, Dorsal Ridge, Moss, Mushrooms & Sprouts
  // ===========================================================================
  newtPart('dn_torso', 'TorsoCore', 'Block', [0, 0.94, 0.0], [1.56, 0.98, 2.52], BARK_MAIN, 'Plastic', {
    anchored: true,
  }),
  newtPart('dn_back_cap', 'TorsoTopCap', 'Block', [0, 0.48, -0.02], [1.28, 0.22, 2.28], BARK_MAIN, 'Plastic', {
    parentId: 'dn_torso',
  }),
  newtPart('dn_belly', 'UnderbellyPlate', 'Block', [0, -0.49, 0.04], [1.26, 0.16, 2.26], BELLY_CREAM, 'Plastic', {
    parentId: 'dn_torso',
  }),
  newtPart('dn_belly_trim', 'BellySideTrim', 'Block', [0, -0.38, 0.0], [1.42, 0.18, 2.34], BELLY_TRIM, 'Plastic', {
    parentId: 'dn_torso',
  }),
  newtPart('dn_flank_l', 'FlankBark_L', 'Block', [-0.81, 0.04, 0.0], [0.14, 0.72, 2.22], BARK_MAIN, 'Plastic', {
    parentId: 'dn_torso',
  }),
  newtPart('dn_flank_r', 'FlankBark_R', 'Block', [0.81, 0.04, 0.0], [0.14, 0.72, 2.22], BARK_MAIN, 'Plastic', {
    parentId: 'dn_torso',
  }),

  // Longitudinal Wood Bark Grain Streaks
  newtPart('dn_grain_top_l', 'BarkGrainTop_L', 'Block', [-0.38, 0.59, 0.1], [0.22, 0.06, 1.85], BARK_LIGHT, 'Plastic', {
    parentId: 'dn_torso',
  }),
  newtPart('dn_grain_top_r', 'BarkGrainTop_R', 'Block', [0.38, 0.59, -0.15], [0.22, 0.06, 1.72], BARK_LIGHT, 'Plastic', {
    parentId: 'dn_torso',
  }),
  newtPart('dn_grain_fl_a', 'BarkGrainFlank_L1', 'Block', [-0.87, 0.22, 0.45], [0.06, 0.14, 0.95], BARK_LIGHT, 'Plastic', {
    parentId: 'dn_torso',
  }),
  newtPart('dn_grain_fl_b', 'BarkGrainFlank_L2', 'Block', [-0.87, -0.14, -0.55], [0.06, 0.12, 0.85], BARK_DARK, 'Plastic', {
    parentId: 'dn_torso',
  }),
  newtPart('dn_grain_fr_a', 'BarkGrainFlank_R1', 'Block', [0.87, 0.22, 0.45], [0.06, 0.14, 0.95], BARK_LIGHT, 'Plastic', {
    parentId: 'dn_torso',
  }),
  newtPart('dn_grain_fr_b', 'BarkGrainFlank_R2', 'Block', [0.87, -0.14, -0.55], [0.06, 0.12, 0.85], BARK_DARK, 'Plastic', {
    parentId: 'dn_torso',
  }),

  // Signature Dark Wood Knotholes on Flanks
  newtPart('dn_knot_ring_l', 'KnotRing_L', 'Block', [-0.87, 0.02, -0.12], [0.07, 0.36, 0.42], BARK_LIGHT, 'Plastic', {
    parentId: 'dn_torso',
  }),
  newtPart('dn_knot_core_l', 'KnotCore_L', 'Block', [-0.9, 0.02, -0.12], [0.05, 0.2, 0.24], BARK_DEEP, 'Plastic', {
    parentId: 'dn_torso',
  }),
  newtPart('dn_knot_ring_r', 'KnotRing_R', 'Block', [0.87, 0.02, -0.12], [0.07, 0.36, 0.42], BARK_LIGHT, 'Plastic', {
    parentId: 'dn_torso',
  }),
  newtPart('dn_knot_core_r', 'KnotCore_R', 'Block', [0.9, 0.02, -0.12], [0.05, 0.2, 0.24], BARK_DEEP, 'Plastic', {
    parentId: 'dn_torso',
  }),

  // Raised Stepped Dorsal Driftwood Spine Ridge
  newtPart('dn_ridge_1', 'DorsalRidge_Front', 'Block', [0, 0.64, 0.62], [0.18, 0.18, 0.72], BARK_DARK, 'Plastic', {
    parentId: 'dn_torso',
  }),
  newtPart('dn_ridge_2', 'DorsalRidge_Mid', 'Block', [0, 0.71, -0.02], [0.2, 0.24, 0.76], BARK_MAIN, 'Plastic', {
    parentId: 'dn_torso',
  }),
  newtPart('dn_ridge_crest', 'DorsalRidge_Crest', 'Block', [0, 0.8, -0.04], [0.14, 0.12, 0.46], BARK_DARK, 'Plastic', {
    parentId: 'dn_torso',
  }),
  newtPart('dn_ridge_3', 'DorsalRidge_Rear', 'Block', [0, 0.65, -0.78], [0.18, 0.2, 0.72], BARK_DARK, 'Plastic', {
    parentId: 'dn_torso',
  }),

  // Terraced Green Moss Clumps
  newtPart('dn_moss_fl_front', 'TorsoMoss_FrontL', 'Block', [-0.58, 0.56, 0.74], [0.52, 0.14, 0.66], MOSS_BRIGHT, 'Plastic', {
    parentId: 'dn_torso',
  }),
  newtPart('dn_moss_fl_side', 'TorsoMoss_SideL', 'Block', [-0.78, 0.36, 0.68], [0.2, 0.26, 0.52], MOSS_DARK, 'Plastic', {
    parentId: 'dn_torso',
  }),
  newtPart('dn_moss_fr_mid', 'TorsoMoss_MidR', 'Block', [0.54, 0.57, 0.24], [0.56, 0.14, 0.72], MOSS_BRIGHT, 'Plastic', {
    parentId: 'dn_torso',
  }),
  newtPart('dn_moss_fr_side', 'TorsoMoss_SideR', 'Block', [0.78, 0.36, 0.18], [0.2, 0.24, 0.46], MOSS_DARK, 'Plastic', {
    parentId: 'dn_torso',
  }),
  newtPart('dn_moss_back_l', 'TorsoMoss_BackL', 'Block', [-0.52, 0.56, -0.68], [0.54, 0.15, 0.74], MOSS_DARK, 'Plastic', {
    parentId: 'dn_torso',
  }),
  newtPart('dn_moss_back_r', 'TorsoMoss_BackR', 'Block', [0.46, 0.57, -0.76], [0.48, 0.14, 0.58], MOSS_BRIGHT, 'Plastic', {
    parentId: 'dn_torso',
  }),

  // Three Red-and-White Spotted Mushrooms on the Back
  // Large Mushroom (Mid-Left)
  newtPart('dn_mush1_stem', 'MushroomLarge_Stem', 'Block', [-0.26, 0.74, -0.14], [0.14, 0.26, 0.14], MUSH_STEM, 'Plastic', {
    parentId: 'dn_torso',
  }),
  newtPart('dn_mush1_cap', 'MushroomLarge_Cap', 'Block', [-0.26, 0.9, -0.14], [0.44, 0.14, 0.44], MUSH_RED, 'Plastic', {
    parentId: 'dn_torso',
  }),
  newtPart('dn_mush1_top', 'MushroomLarge_Crown', 'Block', [-0.26, 0.98, -0.14], [0.28, 0.08, 0.28], MUSH_SHADE, 'Plastic', {
    parentId: 'dn_torso',
  }),
  newtPart('dn_mush1_spot1', 'MushroomLarge_Spot1', 'Block', [-0.38, 0.94, -0.02], [0.1, 0.08, 0.1], MUSH_SPOT, 'Plastic', {
    parentId: 'dn_torso',
  }),
  newtPart('dn_mush1_spot2', 'MushroomLarge_Spot2', 'Block', [-0.14, 0.94, -0.26], [0.1, 0.08, 0.1], MUSH_SPOT, 'Plastic', {
    parentId: 'dn_torso',
  }),
  newtPart('dn_mush1_spot3', 'MushroomLarge_Spot3', 'Block', [-0.24, 1.01, -0.1], [0.09, 0.05, 0.09], MUSH_SPOT, 'Plastic', {
    parentId: 'dn_torso',
  }),

  // Medium Mushroom (Rear-Right)
  newtPart('dn_mush2_stem', 'MushroomMid_Stem', 'Block', [0.32, 0.71, -0.64], [0.11, 0.2, 0.11], MUSH_STEM, 'Plastic', {
    parentId: 'dn_torso',
  }),
  newtPart('dn_mush2_cap', 'MushroomMid_Cap', 'Block', [0.32, 0.84, -0.64], [0.34, 0.11, 0.34], MUSH_RED, 'Plastic', {
    parentId: 'dn_torso',
  }),
  newtPart('dn_mush2_top', 'MushroomMid_Crown', 'Block', [0.32, 0.9, -0.64], [0.2, 0.06, 0.2], MUSH_SHADE, 'Plastic', {
    parentId: 'dn_torso',
  }),
  newtPart('dn_mush2_spot1', 'MushroomMid_Spot1', 'Block', [0.23, 0.87, -0.55], [0.08, 0.07, 0.08], MUSH_SPOT, 'Plastic', {
    parentId: 'dn_torso',
  }),
  newtPart('dn_mush2_spot2', 'MushroomMid_Spot2', 'Block', [0.4, 0.87, -0.72], [0.08, 0.07, 0.08], MUSH_SPOT, 'Plastic', {
    parentId: 'dn_torso',
  }),

  // Small Mushroom (Rear-Left)
  newtPart('dn_mush3_stem', 'MushroomSmall_Stem', 'Block', [-0.42, 0.69, -0.74], [0.09, 0.16, 0.09], MUSH_STEM, 'Plastic', {
    parentId: 'dn_torso',
  }),
  newtPart('dn_mush3_cap', 'MushroomSmall_Cap', 'Block', [-0.42, 0.79, -0.74], [0.26, 0.09, 0.26], MUSH_RED, 'Plastic', {
    parentId: 'dn_torso',
  }),
  newtPart('dn_mush3_spot1', 'MushroomSmall_Spot1', 'Block', [-0.48, 0.82, -0.68], [0.07, 0.06, 0.07], MUSH_SPOT, 'Plastic', {
    parentId: 'dn_torso',
  }),
  newtPart('dn_mush3_spot2', 'MushroomSmall_Spot2', 'Block', [-0.36, 0.82, -0.8], [0.07, 0.06, 0.07], MUSH_SPOT, 'Plastic', {
    parentId: 'dn_torso',
  }),

  // Leafy Green Sprouts on the Back
  newtPart('dn_sprout_b1', 'BackSprout_L', 'Block', [-0.58, 0.72, 0.66], [0.06, 0.22, 0.06], SPROUT_STEM, 'Plastic', {
    parentId: 'dn_torso',
    pivotOffset: [0, -0.1, 0],
  }),
  newtPart('dn_sprout_b1_leaf', 'BackSproutLeaf_L', 'Block', [-0.05, 0.1, 0], [0.12, 0.07, 0.07], SPROUT_TIP, 'Plastic', {
    parentId: 'dn_sprout_b1',
  }),
  newtPart('dn_sprout_b2', 'BackSprout_R', 'Block', [0.56, 0.72, 0.34], [0.06, 0.24, 0.06], SPROUT_STEM, 'Plastic', {
    parentId: 'dn_torso',
    pivotOffset: [0, -0.1, 0],
  }),
  newtPart('dn_sprout_b2_leaf', 'BackSproutLeaf_R', 'Block', [0.05, 0.11, 0], [0.12, 0.07, 0.07], SPROUT_TIP, 'Plastic', {
    parentId: 'dn_sprout_b2',
  }),
  newtPart('dn_sprout_b3', 'BackSprout_Mid', 'Block', [-0.34, 0.72, 0.42], [0.05, 0.18, 0.05], SPROUT_STEM, 'Plastic', {
    parentId: 'dn_torso',
    pivotOffset: [0, -0.08, 0],
  }),
  newtPart('dn_sprout_b3_leaf', 'BackSproutLeaf_Mid', 'Block', [0.04, 0.08, 0.02], [0.1, 0.06, 0.06], SPROUT_TIP, 'Plastic', {
    parentId: 'dn_sprout_b3',
  }),

  // ===========================================================================
  // 2. Stepped Neck, Broad Driftwood Head, Snout, Heavy Brows & Eyes
  // ===========================================================================
  newtPart('dn_neck', 'NeckCollar', 'Block', [0, 0.02, 1.32], [1.26, 0.78, 0.44], BARK_MAIN, 'Plastic', {
    parentId: 'dn_torso',
    pivotOffset: [0, 0, -0.18],
  }),
  newtPart('dn_neck_belly', 'NeckThroat', 'Block', [0, -0.34, 0.0], [1.06, 0.18, 0.42], BELLY_CREAM, 'Plastic', {
    parentId: 'dn_neck',
  }),

  newtPart('dn_head', 'HeadCore', 'Block', [0, 0.04, 0.68], [1.52, 0.72, 1.18], BARK_MAIN, 'Plastic', {
    parentId: 'dn_neck',
    pivotOffset: [0, -0.05, -0.45],
  }),
  newtPart('dn_head_cap', 'HeadTopCap', 'Block', [0, 0.38, -0.04], [1.34, 0.14, 1.04], BARK_LIGHT, 'Plastic', {
    parentId: 'dn_head',
  }),
  newtPart('dn_head_moss_l', 'HeadMoss_L', 'Block', [-0.48, 0.43, -0.24], [0.42, 0.1, 0.46], MOSS_BRIGHT, 'Plastic', {
    parentId: 'dn_head',
  }),
  newtPart('dn_head_moss_r', 'HeadMoss_R', 'Block', [0.46, 0.43, 0.18], [0.38, 0.1, 0.42], MOSS_DARK, 'Plastic', {
    parentId: 'dn_head',
  }),
  newtPart('dn_head_sprout_l', 'HeadSprout_L', 'Block', [-0.46, 0.56, -0.18], [0.06, 0.22, 0.06], SPROUT_STEM, 'Plastic', {
    parentId: 'dn_head',
    pivotOffset: [0, -0.1, 0],
  }),
  newtPart('dn_head_sprout_l_tip', 'HeadSproutTip_L', 'Block', [-0.05, 0.1, 0], [0.12, 0.07, 0.07], SPROUT_TIP, 'Plastic', {
    parentId: 'dn_head_sprout_l',
  }),
  newtPart('dn_head_sprout_r', 'HeadSprout_R', 'Block', [0.42, 0.56, 0.14], [0.06, 0.22, 0.06], SPROUT_STEM, 'Plastic', {
    parentId: 'dn_head',
    pivotOffset: [0, -0.1, 0],
  }),
  newtPart('dn_head_sprout_r_tip', 'HeadSproutTip_R', 'Block', [0.05, 0.1, 0], [0.12, 0.07, 0.07], SPROUT_TIP, 'Plastic', {
    parentId: 'dn_head_sprout_r',
  }),

  // Lower Jaw, Cheek Accents & Protruding Rectangular Snout
  newtPart('dn_jaw_lower', 'LowerJawPlate', 'Block', [0, -0.32, 0.14], [1.46, 0.22, 1.16], BELLY_CREAM, 'Plastic', {
    parentId: 'dn_head',
  }),
  newtPart('dn_cheek_l', 'HeadCheek_L', 'Block', [-0.75, 0.02, -0.14], [0.08, 0.34, 0.68], BARK_DARK, 'Plastic', {
    parentId: 'dn_head',
  }),
  newtPart('dn_cheek_r', 'HeadCheek_R', 'Block', [0.75, 0.02, -0.14], [0.08, 0.34, 0.68], BARK_DARK, 'Plastic', {
    parentId: 'dn_head',
  }),
  newtPart('dn_snout', 'SnoutBlock', 'Block', [0, -0.05, 0.72], [0.98, 0.44, 0.46], BARK_LIGHT, 'Plastic', {
    parentId: 'dn_head',
  }),
  newtPart('dn_snout_bridge', 'SnoutBridge', 'Block', [0, 0.16, 0.66], [0.76, 0.12, 0.42], BARK_MAIN, 'Plastic', {
    parentId: 'dn_head',
  }),
  newtPart('dn_nostril_l', 'Nostril_L', 'Block', [-0.24, 0.02, 0.95], [0.12, 0.1, 0.05], BARK_DEEP, 'Plastic', {
    parentId: 'dn_head',
  }),
  newtPart('dn_nostril_r', 'Nostril_R', 'Block', [0.24, 0.02, 0.95], [0.12, 0.1, 0.05], BARK_DEEP, 'Plastic', {
    parentId: 'dn_head',
  }),
  newtPart('dn_mouth_slit', 'MouthSlit', 'Block', [0, -0.22, 0.7], [1.04, 0.08, 0.56], BARK_DEEP, 'Plastic', {
    parentId: 'dn_head',
  }),
  newtPart('dn_chin_tip', 'ChinTip', 'Block', [0, -0.32, 0.74], [0.94, 0.16, 0.4], BELLY_CREAM, 'Plastic', {
    parentId: 'dn_head',
  }),

  // Heavy-Browed Corner Eyes (Dark Pupil + White Outer/Lower Sclera + Specular Glint)
  newtPart('dn_brow_l', 'EyeBrow_L', 'Block', [-0.6, 0.21, 0.45], [0.42, 0.14, 0.44], BARK_DARK, 'Plastic', {
    parentId: 'dn_head',
  }),
  newtPart('dn_eye_pupil_l', 'EyePupil_L', 'Block', [-0.615, 0.08, 0.55], [0.34, 0.18, 0.2], EYE_PUPIL, 'SmoothPlastic', {
    parentId: 'dn_head',
  }),
  newtPart('dn_eye_sclera_l', 'EyeSclera_L', 'Block', [-0.71, 0.0, 0.42], [0.17, 0.16, 0.28], EYE_WHITE, 'SmoothPlastic', {
    parentId: 'dn_head',
  }),
  newtPart('dn_eye_glint_l', 'EyeGlint_L', 'Block', [-0.53, 0.13, 0.655], [0.06, 0.06, 0.03], EYE_WHITE, 'SmoothPlastic', {
    parentId: 'dn_head',
  }),
  newtPart('dn_eye_rim_l', 'EyeLowerRim_L', 'Block', [-0.63, -0.1, 0.46], [0.38, 0.07, 0.42], BARK_DARK, 'Plastic', {
    parentId: 'dn_head',
  }),

  newtPart('dn_brow_r', 'EyeBrow_R', 'Block', [0.6, 0.21, 0.45], [0.42, 0.14, 0.44], BARK_DARK, 'Plastic', {
    parentId: 'dn_head',
  }),
  newtPart('dn_eye_pupil_r', 'EyePupil_R', 'Block', [0.615, 0.08, 0.55], [0.34, 0.18, 0.2], EYE_PUPIL, 'SmoothPlastic', {
    parentId: 'dn_head',
  }),
  newtPart('dn_eye_sclera_r', 'EyeSclera_R', 'Block', [0.71, 0.0, 0.42], [0.17, 0.16, 0.28], EYE_WHITE, 'SmoothPlastic', {
    parentId: 'dn_head',
  }),
  newtPart('dn_eye_glint_r', 'EyeGlint_R', 'Block', [0.53, 0.13, 0.655], [0.06, 0.06, 0.03], EYE_WHITE, 'SmoothPlastic', {
    parentId: 'dn_head',
  }),
  newtPart('dn_eye_rim_r', 'EyeLowerRim_R', 'Block', [0.63, -0.1, 0.46], [0.38, 0.07, 0.42], BARK_DARK, 'Plastic', {
    parentId: 'dn_head',
  }),

  // ===========================================================================
  // 3. Four Splayed Articulated Driftwood Legs with 3-Toed Feet (bottom y = 0)
  // ===========================================================================
  // Front-Left Leg (FL)
  newtPart('dn_leg_fl_upper', 'LegUpper_FL', 'Block', [-1.04, -0.22, 0.74], [0.62, 0.24, 0.26], BARK_MAIN, 'Plastic', {
    parentId: 'dn_torso',
    rotation: [0, 14, 24],
    pivotOffset: [0.26, 0, 0],
  }),
  newtPart('dn_leg_fl_bark', 'LegBark_FL', 'Block', [0, 0.12, 0], [0.5, 0.06, 0.18], BARK_LIGHT, 'Plastic', {
    parentId: 'dn_leg_fl_upper',
  }),
  newtPart('dn_leg_fl_lower', 'LegLower_FL', 'Block', [-0.26, -0.24, 0], [0.24, 0.52, 0.24], BARK_DARK, 'Plastic', {
    parentId: 'dn_leg_fl_upper',
    rotation: [0, 0, -24],
    pivotOffset: [0, 0.22, 0],
  }),
  newtPart('dn_foot_fl', 'FootHub_FL', 'Block', [-0.04, -0.25, 0.06], [0.32, 0.1, 0.28], BARK_MAIN, 'Plastic', {
    parentId: 'dn_leg_fl_lower',
  }),
  newtPart('dn_toe_fl_1', 'ToeInner_FL', 'Block', [0.08, -0.01, 0.22], [0.1, 0.08, 0.22], BARK_LIGHT, 'Plastic', {
    parentId: 'dn_foot_fl',
    rotation: [0, -18, 0],
  }),
  newtPart('dn_toe_fl_2', 'ToeMid_FL', 'Block', [-0.06, -0.01, 0.24], [0.1, 0.08, 0.24], BARK_PALE, 'Plastic', {
    parentId: 'dn_foot_fl',
  }),
  newtPart('dn_toe_fl_3', 'ToeOuter_FL', 'Block', [-0.2, -0.01, 0.16], [0.1, 0.08, 0.22], BARK_LIGHT, 'Plastic', {
    parentId: 'dn_foot_fl',
    rotation: [0, 26, 0],
  }),

  // Front-Right Leg (FR)
  newtPart('dn_leg_fr_upper', 'LegUpper_FR', 'Block', [1.04, -0.22, 0.74], [0.62, 0.24, 0.26], BARK_MAIN, 'Plastic', {
    parentId: 'dn_torso',
    rotation: [0, -14, -24],
    pivotOffset: [-0.26, 0, 0],
  }),
  newtPart('dn_leg_fr_bark', 'LegBark_FR', 'Block', [0, 0.12, 0], [0.5, 0.06, 0.18], BARK_LIGHT, 'Plastic', {
    parentId: 'dn_leg_fr_upper',
  }),
  newtPart('dn_leg_fr_lower', 'LegLower_FR', 'Block', [0.26, -0.24, 0], [0.24, 0.52, 0.24], BARK_DARK, 'Plastic', {
    parentId: 'dn_leg_fr_upper',
    rotation: [0, 0, 24],
    pivotOffset: [0, 0.22, 0],
  }),
  newtPart('dn_foot_fr', 'FootHub_FR', 'Block', [0.04, -0.25, 0.06], [0.32, 0.1, 0.28], BARK_MAIN, 'Plastic', {
    parentId: 'dn_leg_fr_lower',
  }),
  newtPart('dn_toe_fr_1', 'ToeInner_FR', 'Block', [-0.08, -0.01, 0.22], [0.1, 0.08, 0.22], BARK_LIGHT, 'Plastic', {
    parentId: 'dn_foot_fr',
    rotation: [0, 18, 0],
  }),
  newtPart('dn_toe_fr_2', 'ToeMid_FR', 'Block', [0.06, -0.01, 0.24], [0.1, 0.08, 0.24], BARK_PALE, 'Plastic', {
    parentId: 'dn_foot_fr',
  }),
  newtPart('dn_toe_fr_3', 'ToeOuter_FR', 'Block', [0.2, -0.01, 0.16], [0.1, 0.08, 0.22], BARK_LIGHT, 'Plastic', {
    parentId: 'dn_foot_fr',
    rotation: [0, -26, 0],
  }),

  // Hind-Left Leg (BL)
  newtPart('dn_leg_bl_upper', 'LegUpper_BL', 'Block', [-1.04, -0.22, -0.76], [0.64, 0.26, 0.28], BARK_MAIN, 'Plastic', {
    parentId: 'dn_torso',
    rotation: [0, -10, 24],
    pivotOffset: [0.26, 0, 0],
  }),
  newtPart('dn_leg_bl_bark', 'LegBark_BL', 'Block', [0, 0.13, 0], [0.52, 0.06, 0.18], BARK_LIGHT, 'Plastic', {
    parentId: 'dn_leg_bl_upper',
  }),
  newtPart('dn_leg_bl_lower', 'LegLower_BL', 'Block', [-0.26, -0.24, 0], [0.24, 0.52, 0.24], BARK_DARK, 'Plastic', {
    parentId: 'dn_leg_bl_upper',
    rotation: [0, 0, -24],
    pivotOffset: [0, 0.22, 0],
  }),
  newtPart('dn_foot_bl', 'FootHub_BL', 'Block', [-0.04, -0.25, 0.06], [0.34, 0.1, 0.28], BARK_MAIN, 'Plastic', {
    parentId: 'dn_leg_bl_lower',
  }),
  newtPart('dn_toe_bl_1', 'ToeInner_BL', 'Block', [0.08, -0.01, 0.22], [0.1, 0.08, 0.22], BARK_LIGHT, 'Plastic', {
    parentId: 'dn_foot_bl',
    rotation: [0, -18, 0],
  }),
  newtPart('dn_toe_bl_2', 'ToeMid_BL', 'Block', [-0.06, -0.01, 0.24], [0.1, 0.08, 0.24], BARK_PALE, 'Plastic', {
    parentId: 'dn_foot_bl',
  }),
  newtPart('dn_toe_bl_3', 'ToeOuter_BL', 'Block', [-0.2, -0.01, 0.16], [0.1, 0.08, 0.22], BARK_LIGHT, 'Plastic', {
    parentId: 'dn_foot_bl',
    rotation: [0, 26, 0],
  }),

  // Hind-Right Leg (BR)
  newtPart('dn_leg_br_upper', 'LegUpper_BR', 'Block', [1.04, -0.22, -0.76], [0.64, 0.26, 0.28], BARK_MAIN, 'Plastic', {
    parentId: 'dn_torso',
    rotation: [0, 10, -24],
    pivotOffset: [-0.26, 0, 0],
  }),
  newtPart('dn_leg_br_bark', 'LegBark_BR', 'Block', [0, 0.13, 0], [0.52, 0.06, 0.18], BARK_LIGHT, 'Plastic', {
    parentId: 'dn_leg_br_upper',
  }),
  newtPart('dn_leg_br_lower', 'LegLower_BR', 'Block', [0.26, -0.24, 0], [0.24, 0.52, 0.24], BARK_DARK, 'Plastic', {
    parentId: 'dn_leg_br_upper',
    rotation: [0, 0, 24],
    pivotOffset: [0, 0.22, 0],
  }),
  newtPart('dn_foot_br', 'FootHub_BR', 'Block', [0.04, -0.25, 0.06], [0.34, 0.1, 0.28], BARK_MAIN, 'Plastic', {
    parentId: 'dn_leg_br_lower',
  }),
  newtPart('dn_toe_br_1', 'ToeInner_BR', 'Block', [-0.08, -0.01, 0.22], [0.1, 0.08, 0.22], BARK_LIGHT, 'Plastic', {
    parentId: 'dn_foot_br',
    rotation: [0, 18, 0],
  }),
  newtPart('dn_toe_br_2', 'ToeMid_BR', 'Block', [0.06, -0.01, 0.24], [0.1, 0.08, 0.24], BARK_PALE, 'Plastic', {
    parentId: 'dn_foot_br',
  }),
  newtPart('dn_toe_br_3', 'ToeOuter_BR', 'Block', [0.2, -0.01, 0.16], [0.1, 0.08, 0.22], BARK_LIGHT, 'Plastic', {
    parentId: 'dn_foot_br',
    rotation: [0, -26, 0],
  }),

  // ===========================================================================
  // 4. Articulated 3-Segment Splintered Driftwood Tail & Broken Twig Prongs
  // ===========================================================================
  // Segment 1: TailBase
  newtPart('dn_tail_1', 'TailBase', 'Block', [0, -0.04, -1.56], [0.98, 0.72, 0.88], BARK_MAIN, 'Plastic', {
    parentId: 'dn_torso',
    pivotOffset: [0, 0, 0.42],
  }),
  newtPart('dn_tail_1_belly', 'TailBaseBelly', 'Block', [0, -0.34, 0.02], [0.76, 0.14, 0.8], BELLY_TRIM, 'Plastic', {
    parentId: 'dn_tail_1',
  }),
  newtPart('dn_tail_1_ridge', 'TailBaseRidge', 'Block', [0, 0.42, 0.0], [0.16, 0.16, 0.78], BARK_DARK, 'Plastic', {
    parentId: 'dn_tail_1',
  }),
  newtPart('dn_tail_1_moss', 'TailMoss_Base', 'Block', [-0.26, 0.36, 0.14], [0.36, 0.12, 0.48], MOSS_BRIGHT, 'Plastic', {
    parentId: 'dn_tail_1',
  }),
  newtPart('dn_tail_1_sprout', 'TailSprout', 'Block', [0.28, 0.44, 0.12], [0.05, 0.18, 0.05], SPROUT_STEM, 'Plastic', {
    parentId: 'dn_tail_1',
    pivotOffset: [0, -0.08, 0],
  }),
  newtPart('dn_tail_1_sprout_tip', 'TailSproutTip', 'Block', [0.04, 0.08, 0], [0.1, 0.06, 0.06], SPROUT_TIP, 'Plastic', {
    parentId: 'dn_tail_1_sprout',
  }),

  // Segment 2: TailMid (with signature upward broken driftwood twig prong!)
  newtPart('dn_tail_2', 'TailMid', 'Block', [0, -0.02, -0.82], [0.56, 0.56, 0.94], BARK_MAIN, 'Plastic', {
    parentId: 'dn_tail_1',
    pivotOffset: [0, 0, 0.44],
  }),
  newtPart('dn_tail_2_fin', 'TailMidFin', 'Block', [0, 0.04, 0.0], [0.18, 0.74, 0.84], BARK_DARK, 'Plastic', {
    parentId: 'dn_tail_2',
  }),
  newtPart('dn_tail_2_moss', 'TailMoss_Mid', 'Block', [0.14, 0.3, 0.16], [0.26, 0.1, 0.42], MOSS_DARK, 'Plastic', {
    parentId: 'dn_tail_2',
  }),
  newtPart('dn_tail_2_grain_l', 'TailMidGrain_L', 'Block', [-0.3, -0.06, -0.04], [0.08, 0.22, 0.78], BARK_LIGHT, 'Plastic', {
    parentId: 'dn_tail_2',
  }),
  newtPart('dn_tail_2_grain_r', 'TailMidGrain_R', 'Block', [0.3, -0.04, -0.06], [0.08, 0.2, 0.74], BARK_LIGHT, 'Plastic', {
    parentId: 'dn_tail_2',
  }),
  // Broken upward branch/twig prong jutting from TailMid
  newtPart('dn_tail_twig_base', 'TailTwig_Base', 'Block', [0.04, 0.38, -0.08], [0.1, 0.11, 0.64], BARK_DARK, 'Plastic', {
    parentId: 'dn_tail_2',
    rotation: [38, -10, 0],
    pivotOffset: [0, 0, 0.24],
  }),
  newtPart('dn_tail_twig_fork', 'TailTwig_Fork', 'Block', [-0.08, 0.07, -0.2], [0.08, 0.08, 0.32], BARK_LIGHT, 'Plastic', {
    parentId: 'dn_tail_twig_base',
    rotation: [22, 28, 0],
  }),

  // Segment 3: TailTip (Jagged uneven splintered driftwood end)
  newtPart('dn_tail_3', 'TailTip', 'Block', [0, 0.0, -0.78], [0.2, 0.34, 0.64], BARK_MAIN, 'Plastic', {
    parentId: 'dn_tail_2',
    pivotOffset: [0, 0, 0.34],
  }),
  newtPart('dn_tail_3_upper', 'TailSplinter_Upper', 'Block', [0, 0.18, -0.18], [0.14, 0.16, 0.68], BARK_PALE, 'Plastic', {
    parentId: 'dn_tail_3',
  }),
  newtPart('dn_tail_3_point', 'TailSplinter_Point', 'Block', [0, 0.04, -0.52], [0.12, 0.16, 0.52], BARK_PALE, 'Plastic', {
    parentId: 'dn_tail_3',
  }),
  newtPart('dn_tail_3_mid', 'TailSplinter_Mid', 'Block', [0, -0.06, -0.26], [0.14, 0.16, 0.62], BARK_LIGHT, 'Plastic', {
    parentId: 'dn_tail_3',
  }),
  newtPart('dn_tail_3_lower', 'TailSplinter_Lower', 'Block', [0, -0.2, -0.08], [0.14, 0.14, 0.5], BARK_DARK, 'Plastic', {
    parentId: 'dn_tail_3',
  }),
];

// =============================================================================
// Stage 1: Idle — Calm amphibian breathing, curious head look & lazy tail drift
// =============================================================================
const driftwoodNewtIdleClip: AnimationClip = {
  id: 'clip_driftwood_newt_idle',
  name: 'Idle',
  duration: 3.2,
  fps: 30,
  loop: true,
  priority: 'Idle',
  sampleMode: 'keyframes',
  fadeTime: 0.25,
  defaultWeight: 1,
  markers: [],
  tracks: [
    {
      partId: 'dn_torso',
      keyframes: [
        { id: 'kf_dn_idle_tor_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', position: [0, 0.94, 0], rotation: [0, 0, 0] },
        { id: 'kf_dn_idle_tor_1', time: 1.6, easingStyle: 'Sine', easingDirection: 'InOut', position: [0, 0.98, 0], rotation: [-1.5, 0, 0] },
        { id: 'kf_dn_idle_tor_2', time: 3.2, easingStyle: 'Sine', easingDirection: 'InOut', position: [0, 0.94, 0], rotation: [0, 0, 0] },
      ],
    },
    // Subtle shoulder/hip compensation so feet stay planted during torso breath
    {
      partId: 'dn_leg_fl_upper',
      keyframes: [
        { id: 'kf_dn_idle_fl_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 14, 24] },
        { id: 'kf_dn_idle_fl_1', time: 1.6, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 14, 28] },
        { id: 'kf_dn_idle_fl_2', time: 3.2, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 14, 24] },
      ],
    },
    {
      partId: 'dn_leg_fr_upper',
      keyframes: [
        { id: 'kf_dn_idle_fr_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, -14, -24] },
        { id: 'kf_dn_idle_fr_1', time: 1.6, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, -14, -28] },
        { id: 'kf_dn_idle_fr_2', time: 3.2, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, -14, -24] },
      ],
    },
    {
      partId: 'dn_leg_bl_upper',
      keyframes: [
        { id: 'kf_dn_idle_bl_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, -10, 24] },
        { id: 'kf_dn_idle_bl_1', time: 1.6, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, -10, 28] },
        { id: 'kf_dn_idle_bl_2', time: 3.2, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, -10, 24] },
      ],
    },
    {
      partId: 'dn_leg_br_upper',
      keyframes: [
        { id: 'kf_dn_idle_br_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 10, -24] },
        { id: 'kf_dn_idle_br_1', time: 1.6, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 10, -28] },
        { id: 'kf_dn_idle_br_2', time: 3.2, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 10, -24] },
      ],
    },
    {
      partId: 'dn_neck',
      keyframes: [
        { id: 'kf_dn_idle_nk_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 0, 0] },
        { id: 'kf_dn_idle_nk_1', time: 0.9, easingStyle: 'Quad', easingDirection: 'Out', rotation: [-4, 5, 0] },
        { id: 'kf_dn_idle_nk_2', time: 2.2, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [2, -5, 0] },
        { id: 'kf_dn_idle_nk_3', time: 3.2, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 0, 0] },
      ],
    },
    {
      partId: 'dn_head',
      keyframes: [
        { id: 'kf_dn_idle_hd_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 0, 0] },
        { id: 'kf_dn_idle_hd_1', time: 0.9, easingStyle: 'Quad', easingDirection: 'Out', rotation: [-6, 8, -3] },
        { id: 'kf_dn_idle_hd_2', time: 2.2, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [3, -8, 3] },
        { id: 'kf_dn_idle_hd_3', time: 3.2, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 0, 0] },
      ],
    },
    {
      partId: 'dn_tail_1',
      keyframes: [
        { id: 'kf_dn_idle_t1_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, -5, 0] },
        { id: 'kf_dn_idle_t1_1', time: 1.6, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 5, 0] },
        { id: 'kf_dn_idle_t1_2', time: 3.2, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, -5, 0] },
      ],
    },
    {
      partId: 'dn_tail_2',
      keyframes: [
        { id: 'kf_dn_idle_t2_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, -6, 0] },
        { id: 'kf_dn_idle_t2_1', time: 0.55, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, -9, 0] },
        { id: 'kf_dn_idle_t2_2', time: 2.15, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 9, 0] },
        { id: 'kf_dn_idle_t2_3', time: 3.2, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, -6, 0] },
      ],
    },
    {
      partId: 'dn_tail_3',
      keyframes: [
        { id: 'kf_dn_idle_t3_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, -5, 0] },
        { id: 'kf_dn_idle_t3_1', time: 0.9, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, -12, 0] },
        { id: 'kf_dn_idle_t3_2', time: 2.5, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 12, 0] },
        { id: 'kf_dn_idle_t3_3', time: 3.2, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, -5, 0] },
      ],
    },
    {
      partId: 'dn_head_sprout_l',
      keyframes: [
        { id: 'kf_dn_idle_sl_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 0, -4] },
        { id: 'kf_dn_idle_sl_1', time: 1.6, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [4, 0, 5] },
        { id: 'kf_dn_idle_sl_2', time: 3.2, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 0, -4] },
      ],
    },
    {
      partId: 'dn_head_sprout_r',
      keyframes: [
        { id: 'kf_dn_idle_sr_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [3, 0, 4] },
        { id: 'kf_dn_idle_sr_1', time: 1.6, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [-3, 0, -5] },
        { id: 'kf_dn_idle_sr_2', time: 3.2, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [3, 0, 4] },
      ],
    },
  ],
};

// =============================================================================
// Stage 2: Driftwood Walk — Amphibious diagonal gait + S-wave spine & tail sweep
// =============================================================================
const driftwoodNewtWalkClip: AnimationClip = {
  id: 'clip_driftwood_newt_walk',
  name: 'Driftwood Walk',
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
      partId: 'dn_torso',
      keyframes: [
        { id: 'kf_dn_wk_tor_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', position: [-0.05, 0.95, 0], rotation: [0, -6, -2.5] },
        { id: 'kf_dn_wk_tor_1', time: 0.3, easingStyle: 'Sine', easingDirection: 'InOut', position: [0, 1.0, 0.03], rotation: [1.5, 0, 0] },
        { id: 'kf_dn_wk_tor_2', time: 0.6, easingStyle: 'Sine', easingDirection: 'InOut', position: [0.05, 0.95, 0], rotation: [0, 6, 2.5] },
        { id: 'kf_dn_wk_tor_3', time: 0.9, easingStyle: 'Sine', easingDirection: 'InOut', position: [0, 1.0, 0.03], rotation: [1.5, 0, 0] },
        { id: 'kf_dn_wk_tor_4', time: 1.2, easingStyle: 'Sine', easingDirection: 'InOut', position: [-0.05, 0.95, 0], rotation: [0, -6, -2.5] },
      ],
    },
    // Counter-steering neck & head so gaze stays steady forward
    {
      partId: 'dn_neck',
      keyframes: [
        { id: 'kf_dn_wk_nk_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 4, 1.5] },
        { id: 'kf_dn_wk_nk_1', time: 0.6, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, -4, -1.5] },
        { id: 'kf_dn_wk_nk_2', time: 1.2, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 4, 1.5] },
      ],
    },
    {
      partId: 'dn_head',
      keyframes: [
        { id: 'kf_dn_wk_hd_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [-2, 3, 1.5] },
        { id: 'kf_dn_wk_hd_1', time: 0.3, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [2, 0, 0] },
        { id: 'kf_dn_wk_hd_2', time: 0.6, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [-2, -3, -1.5] },
        { id: 'kf_dn_wk_hd_3', time: 0.9, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [2, 0, 0] },
        { id: 'kf_dn_wk_hd_4', time: 1.2, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [-2, 3, 1.5] },
      ],
    },

    // Diagonal Pair A: Front-Left (FL) + Hind-Right (BR) stride forward on [0 -> 0.6], push back on [0.6 -> 1.2]
    {
      partId: 'dn_leg_fl_upper',
      keyframes: [
        { id: 'kf_dn_wk_fl_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 32, 24] },
        { id: 'kf_dn_wk_fl_1', time: 0.3, easingStyle: 'Quad', easingDirection: 'Out', rotation: [0, 8, -4] },
        { id: 'kf_dn_wk_fl_2', time: 0.6, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, -14, 24] },
        { id: 'kf_dn_wk_fl_3', time: 0.9, easingStyle: 'Linear', easingDirection: 'InOut', rotation: [0, 10, 26] },
        { id: 'kf_dn_wk_fl_4', time: 1.2, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 32, 24] },
      ],
    },
    {
      partId: 'dn_leg_fl_lower',
      keyframes: [
        { id: 'kf_dn_wk_fll_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 0, -24] },
        { id: 'kf_dn_wk_fll_1', time: 0.3, easingStyle: 'Quad', easingDirection: 'Out', rotation: [-10, 0, -6] },
        { id: 'kf_dn_wk_fll_2', time: 0.6, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [6, 0, -24] },
        { id: 'kf_dn_wk_fll_3', time: 1.2, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 0, -24] },
      ],
    },
    {
      partId: 'dn_leg_br_upper',
      keyframes: [
        { id: 'kf_dn_wk_br_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 28, -24] },
        { id: 'kf_dn_wk_br_1', time: 0.3, easingStyle: 'Quad', easingDirection: 'Out', rotation: [0, 4, 4] },
        { id: 'kf_dn_wk_br_2', time: 0.6, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, -18, -24] },
        { id: 'kf_dn_wk_br_3', time: 0.9, easingStyle: 'Linear', easingDirection: 'InOut', rotation: [0, 6, -26] },
        { id: 'kf_dn_wk_br_4', time: 1.2, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 28, -24] },
      ],
    },
    {
      partId: 'dn_leg_br_lower',
      keyframes: [
        { id: 'kf_dn_wk_brl_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 0, 24] },
        { id: 'kf_dn_wk_brl_1', time: 0.3, easingStyle: 'Quad', easingDirection: 'Out', rotation: [-10, 0, 6] },
        { id: 'kf_dn_wk_brl_2', time: 0.6, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [6, 0, 24] },
        { id: 'kf_dn_wk_brl_3', time: 1.2, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 0, 24] },
      ],
    },

    // Diagonal Pair B: Front-Right (FR) + Hind-Left (BL) push back on [0 -> 0.6], lift & stride forward on [0.6 -> 1.2]
    {
      partId: 'dn_leg_fr_upper',
      keyframes: [
        { id: 'kf_dn_wk_fr_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 14, -24] },
        { id: 'kf_dn_wk_fr_1', time: 0.3, easingStyle: 'Linear', easingDirection: 'InOut', rotation: [0, -10, -26] },
        { id: 'kf_dn_wk_fr_2', time: 0.6, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, -32, -24] },
        { id: 'kf_dn_wk_fr_3', time: 0.9, easingStyle: 'Quad', easingDirection: 'Out', rotation: [0, -8, 4] },
        { id: 'kf_dn_wk_fr_4', time: 1.2, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 14, -24] },
      ],
    },
    {
      partId: 'dn_leg_fr_lower',
      keyframes: [
        { id: 'kf_dn_wk_frl_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [6, 0, 24] },
        { id: 'kf_dn_wk_frl_1', time: 0.6, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 0, 24] },
        { id: 'kf_dn_wk_frl_2', time: 0.9, easingStyle: 'Quad', easingDirection: 'Out', rotation: [-10, 0, 6] },
        { id: 'kf_dn_wk_frl_3', time: 1.2, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [6, 0, 24] },
      ],
    },
    {
      partId: 'dn_leg_bl_upper',
      keyframes: [
        { id: 'kf_dn_wk_bl_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 18, 24] },
        { id: 'kf_dn_wk_bl_1', time: 0.3, easingStyle: 'Linear', easingDirection: 'InOut', rotation: [0, -6, 26] },
        { id: 'kf_dn_wk_bl_2', time: 0.6, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, -28, 24] },
        { id: 'kf_dn_wk_bl_3', time: 0.9, easingStyle: 'Quad', easingDirection: 'Out', rotation: [0, -4, -4] },
        { id: 'kf_dn_wk_bl_4', time: 1.2, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 18, 24] },
      ],
    },
    {
      partId: 'dn_leg_bl_lower',
      keyframes: [
        { id: 'kf_dn_wk_bll_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [6, 0, -24] },
        { id: 'kf_dn_wk_bll_1', time: 0.6, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 0, -24] },
        { id: 'kf_dn_wk_bll_2', time: 0.9, easingStyle: 'Quad', easingDirection: 'Out', rotation: [-10, 0, -6] },
        { id: 'kf_dn_wk_bll_3', time: 1.2, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [6, 0, -24] },
      ],
    },

    // Phase-lagged S-wave tail sweep
    {
      partId: 'dn_tail_1',
      keyframes: [
        { id: 'kf_dn_wk_t1_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 14, 0] },
        { id: 'kf_dn_wk_t1_1', time: 0.6, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, -14, 0] },
        { id: 'kf_dn_wk_t1_2', time: 1.2, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 14, 0] },
      ],
    },
    {
      partId: 'dn_tail_2',
      keyframes: [
        { id: 'kf_dn_wk_t2_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 16, 0] },
        { id: 'kf_dn_wk_t2_1', time: 0.2, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 22, 0] },
        { id: 'kf_dn_wk_t2_2', time: 0.8, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, -22, 0] },
        { id: 'kf_dn_wk_t2_3', time: 1.2, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 16, 0] },
      ],
    },
    {
      partId: 'dn_tail_3',
      keyframes: [
        { id: 'kf_dn_wk_t3_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 12, 0] },
        { id: 'kf_dn_wk_t3_1', time: 0.35, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 28, 0] },
        { id: 'kf_dn_wk_t3_2', time: 0.95, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, -28, 0] },
        { id: 'kf_dn_wk_t3_3', time: 1.2, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 12, 0] },
      ],
    },
  ],
};

export const driftwoodNewtPreset: ModelPreset = {
  id: 'driftwood-newt',
  label: 'Driftwood Newt',
  description: `${driftwoodNewtParts.length}-part rigged blocky mossy driftwood newt with knotholes, red spotted mushrooms, leafy sprouts, 4 splayed legs, splintered tail, and Idle + Driftwood Walk animations.`,
  model: {
    name: 'DriftwoodNewt',
    primaryPartId: 'dn_torso',
    parts: driftwoodNewtParts,
    animations: [driftwoodNewtIdleClip, driftwoodNewtWalkClip],
    scripts: [],
  },
};
