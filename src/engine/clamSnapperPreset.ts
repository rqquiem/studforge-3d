import { AnimationClip, PartShape, StudioPartNode } from './robloxTypes';
import type { ModelPreset } from './presets';

function clamPart(
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

// Clam Snapper Palette (matched to reference creature sheet)
const SHELL_BRIGHT = '#9B7BDB';
const SHELL_LIGHT = '#8968CA';
const SHELL_MAIN = '#7151B2';
const SHELL_MID = '#5B3E97';
const SHELL_DARK = '#442C77';
const SHELL_DEEP = '#2C1B52';
const INNER_MAUVE = '#7D4F62';
const INNER_DARK = '#5C3748';
const PEARL_IVORY = '#FAF7EF';
const PEARL_PURE = '#FFFFFF';
const FLESH_LIGHT = '#F0A084';
const FLESH_MAIN = '#E38869';
const FLESH_DARK = '#C4684F';
const FLESH_DEEP = '#8C3F34';
const EYE_PUPIL = '#181C26';
const EYE_WHITE = '#F8FAFC';

const clamSnapperParts: StudioPartNode[] = [
  // ===========================================================================
  // 1. Lower Scalloped Shell Bowl, Stepped Underside, Inner Tray & Teeth
  // ===========================================================================
  clamPart('cs_lower_shell', 'LowerShellCore', 'Block', [0, 0.56, 0], [2.52, 0.3, 2.22], SHELL_MAIN, 'Plastic', {
    anchored: true,
  }),
  clamPart('cs_lower_tier1', 'LowerShellTier1', 'Block', [0, -0.2, -0.02], [2.14, 0.16, 1.86], SHELL_MID, 'Plastic', {
    parentId: 'cs_lower_shell',
  }),
  clamPart('cs_lower_tier2', 'LowerShellTier2', 'Block', [0, -0.31, -0.04], [1.7, 0.12, 1.48], SHELL_DARK, 'Plastic', {
    parentId: 'cs_lower_shell',
  }),
  clamPart('cs_lower_inner', 'LowerCavityFloor', 'Block', [0, 0.15, 0.04], [2.14, 0.06, 1.84], INNER_MAUVE, 'Plastic', {
    parentId: 'cs_lower_shell',
  }),
  clamPart('cs_lower_inner_lip', 'LowerCavityLip', 'Block', [0, 0.18, 0.08], [2.22, 0.06, 1.9], INNER_DARK, 'Plastic', {
    parentId: 'cs_lower_shell',
  }),

  // Raised Scalloped Lower Rim Walls & Fluted Purple Ribs (low front center notch reveals pearl & mouth)
  clamPart('cs_lower_rim_front', 'LowerRim_Front', 'Block', [0, 0.13, 1.07], [2.14, 0.14, 0.26], SHELL_MAIN, 'Plastic', {
    parentId: 'cs_lower_shell',
  }),
  clamPart('cs_lower_rim_l', 'LowerRim_L', 'Block', [-1.22, 0.2, 0.02], [0.24, 0.22, 2.04], SHELL_MAIN, 'Plastic', {
    parentId: 'cs_lower_shell',
  }),
  clamPart('cs_lower_rim_r', 'LowerRim_R', 'Block', [1.22, 0.2, 0.02], [0.24, 0.22, 2.04], SHELL_MAIN, 'Plastic', {
    parentId: 'cs_lower_shell',
  }),
  clamPart('cs_lower_rim_back', 'LowerRim_Back', 'Block', [0, 0.22, -1.06], [2.04, 0.24, 0.24], SHELL_MID, 'Plastic', {
    parentId: 'cs_lower_shell',
  }),

  // Front & Corner Scallop Ribs (Lower Shell)
  clamPart('cs_lrib_fm', 'LowerRib_FrontMid', 'Block', [0, 0.07, 1.2], [0.44, 0.28, 0.22], SHELL_LIGHT, 'Plastic', {
    parentId: 'cs_lower_shell',
  }),
  clamPart('cs_lrib_fl', 'LowerRib_FrontL', 'Block', [-0.64, 0.1, 1.18], [0.38, 0.32, 0.22], SHELL_BRIGHT, 'Plastic', {
    parentId: 'cs_lower_shell',
  }),
  clamPart('cs_lrib_fr', 'LowerRib_FrontR', 'Block', [0.64, 0.1, 1.18], [0.38, 0.32, 0.22], SHELL_BRIGHT, 'Plastic', {
    parentId: 'cs_lower_shell',
  }),
  clamPart('cs_lrib_cl', 'LowerRib_CornerL', 'Block', [-1.14, 0.13, 0.94], [0.26, 0.38, 0.34], SHELL_MAIN, 'Plastic', {
    parentId: 'cs_lower_shell',
    rotation: [0, -28, 0],
  }),
  clamPart('cs_lrib_cr', 'LowerRib_CornerR', 'Block', [1.14, 0.13, 0.94], [0.26, 0.38, 0.34], SHELL_MAIN, 'Plastic', {
    parentId: 'cs_lower_shell',
    rotation: [0, 28, 0],
  }),
  clamPart('cs_lrib_l1', 'LowerRib_SideL1', 'Block', [-1.34, 0.16, 0.42], [0.18, 0.4, 0.34], SHELL_LIGHT, 'Plastic', {
    parentId: 'cs_lower_shell',
  }),
  clamPart('cs_lrib_l2', 'LowerRib_SideL2', 'Block', [-1.36, 0.16, -0.14], [0.2, 0.4, 0.34], SHELL_MID, 'Plastic', {
    parentId: 'cs_lower_shell',
  }),
  clamPart('cs_lrib_l3', 'LowerRib_SideL3', 'Block', [-1.32, 0.15, -0.68], [0.18, 0.38, 0.32], SHELL_LIGHT, 'Plastic', {
    parentId: 'cs_lower_shell',
  }),
  clamPart('cs_lrib_r1', 'LowerRib_SideR1', 'Block', [1.34, 0.16, 0.42], [0.18, 0.4, 0.34], SHELL_LIGHT, 'Plastic', {
    parentId: 'cs_lower_shell',
  }),
  clamPart('cs_lrib_r2', 'LowerRib_SideR2', 'Block', [1.36, 0.16, -0.14], [0.2, 0.4, 0.34], SHELL_MID, 'Plastic', {
    parentId: 'cs_lower_shell',
  }),
  clamPart('cs_lrib_r3', 'LowerRib_SideR3', 'Block', [1.32, 0.15, -0.68], [0.18, 0.38, 0.32], SHELL_LIGHT, 'Plastic', {
    parentId: 'cs_lower_shell',
  }),

  // Lower Ivory Teeth along Inner Rim (framing tongue/pearl cleanly without blocking front view)
  clamPart('cs_ltooth_l1', 'LowerTooth_L1', 'Block', [-0.58, 0.25, 1.0], [0.12, 0.16, 0.12], PEARL_IVORY, 'SmoothPlastic', {
    parentId: 'cs_lower_shell',
  }),
  clamPart('cs_ltooth_l2', 'LowerTooth_L2', 'Block', [-0.96, 0.28, 0.78], [0.12, 0.18, 0.12], PEARL_IVORY, 'SmoothPlastic', {
    parentId: 'cs_lower_shell',
  }),
  clamPart('cs_ltooth_l3', 'LowerTooth_L3', 'Block', [-1.06, 0.3, 0.32], [0.12, 0.18, 0.12], PEARL_IVORY, 'SmoothPlastic', {
    parentId: 'cs_lower_shell',
  }),
  clamPart('cs_ltooth_l4', 'LowerTooth_L4', 'Block', [-1.06, 0.3, -0.18], [0.12, 0.16, 0.12], PEARL_IVORY, 'SmoothPlastic', {
    parentId: 'cs_lower_shell',
  }),
  clamPart('cs_ltooth_r1', 'LowerTooth_R1', 'Block', [0.58, 0.25, 1.0], [0.12, 0.16, 0.12], PEARL_IVORY, 'SmoothPlastic', {
    parentId: 'cs_lower_shell',
  }),
  clamPart('cs_ltooth_r2', 'LowerTooth_R2', 'Block', [0.96, 0.28, 0.78], [0.12, 0.18, 0.12], PEARL_IVORY, 'SmoothPlastic', {
    parentId: 'cs_lower_shell',
  }),
  clamPart('cs_ltooth_r3', 'LowerTooth_R3', 'Block', [1.06, 0.3, 0.32], [0.12, 0.18, 0.12], PEARL_IVORY, 'SmoothPlastic', {
    parentId: 'cs_lower_shell',
  }),
  clamPart('cs_ltooth_r4', 'LowerTooth_R4', 'Block', [1.06, 0.3, -0.18], [0.12, 0.16, 0.12], PEARL_IVORY, 'SmoothPlastic', {
    parentId: 'cs_lower_shell',
  }),

  // ===========================================================================
  // 2. Rear Shell Hinge & Socket Detail
  // ===========================================================================
  clamPart('cs_hinge', 'ShellHingeBlock', 'Block', [0, 0.37, -1.24], [1.08, 0.46, 0.4], SHELL_MID, 'Plastic', {
    parentId: 'cs_lower_shell',
  }),
  clamPart('cs_hinge_band', 'ShellHingeBand', 'Block', [0, 0.37, -1.43], [0.92, 0.14, 0.08], SHELL_LIGHT, 'Plastic', {
    parentId: 'cs_lower_shell',
  }),
  clamPart('cs_hinge_socket', 'ShellHingeSocket', 'Block', [0, 0.37, -1.46], [0.24, 0.18, 0.05], SHELL_DEEP, 'Plastic', {
    parentId: 'cs_lower_shell',
  }),

  // ===========================================================================
  // 3. Four Splayed Stubby 3-Toed Peach Legs (bottom y = 0.00)
  // ===========================================================================
  // Front-Left Leg (FL)
  clamPart('cs_leg_fl', 'LegUpper_FL', 'Block', [-0.88, -0.34, 0.62], [0.54, 0.22, 0.28], FLESH_MAIN, 'Plastic', {
    parentId: 'cs_lower_shell',
    rotation: [0, -34, 20],
    pivotOffset: [0.24, 0.08, 0],
  }),
  clamPart('cs_foot_fl', 'FootHub_FL', 'Block', [-0.18, -0.073, 0], [0.38, 0.12, 0.32], FLESH_DARK, 'Plastic', {
    parentId: 'cs_leg_fl',
    rotation: [0, 0, -20],
  }),
  clamPart('cs_toe_fl_1', 'ToeFront_FL', 'Block', [-0.22, -0.01, 0.11], [0.2, 0.1, 0.09], FLESH_LIGHT, 'Plastic', {
    parentId: 'cs_foot_fl',
  }),
  clamPart('cs_toe_fl_2', 'ToeMid_FL', 'Block', [-0.24, -0.01, 0.0], [0.22, 0.1, 0.09], FLESH_MAIN, 'Plastic', {
    parentId: 'cs_foot_fl',
  }),
  clamPart('cs_toe_fl_3', 'ToeRear_FL', 'Block', [-0.22, -0.01, -0.11], [0.2, 0.1, 0.09], FLESH_LIGHT, 'Plastic', {
    parentId: 'cs_foot_fl',
  }),

  // Front-Right Leg (FR)
  clamPart('cs_leg_fr', 'LegUpper_FR', 'Block', [0.88, -0.34, 0.62], [0.54, 0.22, 0.28], FLESH_MAIN, 'Plastic', {
    parentId: 'cs_lower_shell',
    rotation: [0, 34, -20],
    pivotOffset: [-0.24, 0.08, 0],
  }),
  clamPart('cs_foot_fr', 'FootHub_FR', 'Block', [0.18, -0.073, 0], [0.38, 0.12, 0.32], FLESH_DARK, 'Plastic', {
    parentId: 'cs_leg_fr',
    rotation: [0, 0, 20],
  }),
  clamPart('cs_toe_fr_1', 'ToeFront_FR', 'Block', [0.22, -0.01, 0.11], [0.2, 0.1, 0.09], FLESH_LIGHT, 'Plastic', {
    parentId: 'cs_foot_fr',
  }),
  clamPart('cs_toe_fr_2', 'ToeMid_FR', 'Block', [0.24, -0.01, 0.0], [0.22, 0.1, 0.09], FLESH_MAIN, 'Plastic', {
    parentId: 'cs_foot_fr',
  }),
  clamPart('cs_toe_fr_3', 'ToeRear_FR', 'Block', [0.22, -0.01, -0.11], [0.2, 0.1, 0.09], FLESH_LIGHT, 'Plastic', {
    parentId: 'cs_foot_fr',
  }),

  // Hind-Left Leg (BL)
  clamPart('cs_leg_bl', 'LegUpper_BL', 'Block', [-0.88, -0.34, -0.62], [0.54, 0.22, 0.28], FLESH_MAIN, 'Plastic', {
    parentId: 'cs_lower_shell',
    rotation: [0, 32, 20],
    pivotOffset: [0.24, 0.08, 0],
  }),
  clamPart('cs_foot_bl', 'FootHub_BL', 'Block', [-0.18, -0.073, 0], [0.38, 0.12, 0.32], FLESH_DARK, 'Plastic', {
    parentId: 'cs_leg_bl',
    rotation: [0, 0, -20],
  }),
  clamPart('cs_toe_bl_1', 'ToeFront_BL', 'Block', [-0.22, -0.01, 0.11], [0.2, 0.1, 0.09], FLESH_LIGHT, 'Plastic', {
    parentId: 'cs_foot_bl',
  }),
  clamPart('cs_toe_bl_2', 'ToeMid_BL', 'Block', [-0.24, -0.01, 0.0], [0.22, 0.1, 0.09], FLESH_MAIN, 'Plastic', {
    parentId: 'cs_foot_bl',
  }),
  clamPart('cs_toe_bl_3', 'ToeRear_BL', 'Block', [-0.22, -0.01, -0.11], [0.2, 0.1, 0.09], FLESH_LIGHT, 'Plastic', {
    parentId: 'cs_foot_bl',
  }),

  // Hind-Right Leg (BR)
  clamPart('cs_leg_br', 'LegUpper_BR', 'Block', [0.88, -0.34, -0.62], [0.54, 0.22, 0.28], FLESH_MAIN, 'Plastic', {
    parentId: 'cs_lower_shell',
    rotation: [0, -32, -20],
    pivotOffset: [-0.24, 0.08, 0],
  }),
  clamPart('cs_foot_br', 'FootHub_BR', 'Block', [0.18, -0.073, 0], [0.38, 0.12, 0.32], FLESH_DARK, 'Plastic', {
    parentId: 'cs_leg_br',
    rotation: [0, 0, 20],
  }),
  clamPart('cs_toe_br_1', 'ToeFront_BR', 'Block', [0.22, -0.01, 0.11], [0.2, 0.1, 0.09], FLESH_LIGHT, 'Plastic', {
    parentId: 'cs_foot_br',
  }),
  clamPart('cs_toe_br_2', 'ToeMid_BR', 'Block', [0.24, -0.01, 0.0], [0.22, 0.1, 0.09], FLESH_MAIN, 'Plastic', {
    parentId: 'cs_foot_br',
  }),
  clamPart('cs_toe_br_3', 'ToeRear_BR', 'Block', [0.22, -0.01, -0.11], [0.2, 0.1, 0.09], FLESH_LIGHT, 'Plastic', {
    parentId: 'cs_foot_br',
  }),

  // ===========================================================================
  // 4. Fleshy Peach Clam Head, Square Eyes, Protruding Tongue & Luminous Pearl
  // ===========================================================================
  clamPart('cs_head', 'ClamHead', 'Block', [0, 0.56, -0.06], [1.3, 0.62, 1.12], FLESH_MAIN, 'Plastic', {
    parentId: 'cs_lower_shell',
    pivotOffset: [0, -0.28, 0],
  }),
  clamPart('cs_head_crown', 'ClamHeadCrown', 'Block', [0, 0.31, 0.02], [1.12, 0.08, 0.94], FLESH_LIGHT, 'Plastic', {
    parentId: 'cs_head',
  }),
  clamPart('cs_mantle_collar', 'ClamMantleBase', 'Block', [0, -0.32, 0.04], [1.68, 0.18, 1.4], FLESH_DARK, 'Plastic', {
    parentId: 'cs_head',
  }),
  clamPart('cs_mouth_slit', 'ClamMouthSlit', 'Block', [0, -0.15, 0.57], [0.78, 0.07, 0.06], FLESH_DEEP, 'Plastic', {
    parentId: 'cs_head',
  }),

  // Eyes (Dark square pupil + outer white sclera + specular glint)
  clamPart('cs_eye_pupil_l', 'ClamEyePupil_L', 'Block', [-0.31, 0.07, 0.57], [0.2, 0.22, 0.07], EYE_PUPIL, 'SmoothPlastic', {
    parentId: 'cs_head',
  }),
  clamPart('cs_eye_sclera_l', 'ClamEyeSclera_L', 'Block', [-0.43, 0.07, 0.56], [0.09, 0.22, 0.06], EYE_WHITE, 'SmoothPlastic', {
    parentId: 'cs_head',
  }),
  clamPart('cs_eye_glint_l', 'ClamEyeGlint_L', 'Block', [-0.26, 0.13, 0.61], [0.06, 0.06, 0.02], EYE_WHITE, 'SmoothPlastic', {
    parentId: 'cs_head',
  }),

  clamPart('cs_eye_pupil_r', 'ClamEyePupil_R', 'Block', [0.31, 0.07, 0.57], [0.2, 0.22, 0.07], EYE_PUPIL, 'SmoothPlastic', {
    parentId: 'cs_head',
  }),
  clamPart('cs_eye_sclera_r', 'ClamEyeSclera_R', 'Block', [0.43, 0.07, 0.56], [0.09, 0.22, 0.06], EYE_WHITE, 'SmoothPlastic', {
    parentId: 'cs_head',
  }),
  clamPart('cs_eye_glint_r', 'ClamEyeGlint_R', 'Block', [0.26, 0.13, 0.61], [0.06, 0.06, 0.02], EYE_WHITE, 'SmoothPlastic', {
    parentId: 'cs_head',
  }),

  // Protruding Flat Peach Tongue + Luminous White Pearl
  clamPart('cs_tongue', 'ClamTongue', 'Block', [0, -0.18, 0.78], [0.64, 0.13, 0.54], FLESH_LIGHT, 'Plastic', {
    parentId: 'cs_head',
    pivotOffset: [0, 0, -0.26],
  }),
  clamPart('cs_tongue_tip', 'ClamTongueTip', 'Block', [0, -0.02, 0.28], [0.52, 0.1, 0.12], FLESH_MAIN, 'Plastic', {
    parentId: 'cs_tongue',
  }),
  clamPart('cs_pearl', 'ClamPearl', 'Block', [0, 0.18, 0.07], [0.27, 0.25, 0.27], PEARL_IVORY, 'SmoothPlastic', {
    parentId: 'cs_tongue',
  }),
  clamPart('cs_pearl_glow', 'ClamPearlHighlight', 'Block', [0, 0.13, 0.0], [0.17, 0.04, 0.17], PEARL_PURE, 'SmoothPlastic', {
    parentId: 'cs_pearl',
  }),

  // ===========================================================================
  // 5. Hinged Upper Scalloped Shell Lid, Stepped Dome, Flutes & Upper Teeth
  //    (Rest pose tilted open -27° around rear hinge; -1° = snapped shut!)
  // ===========================================================================
  clamPart('cs_upper_shell', 'UpperShellLid', 'Block', [0, 0.54, -0.02], [2.52, 0.34, 2.22], SHELL_MAIN, 'Plastic', {
    parentId: 'cs_lower_shell',
    rotation: [-27, 0, 0],
    pivotOffset: [0, -0.16, -1.14],
  }),
  clamPart('cs_upper_inner', 'UpperShellInner', 'Block', [0, -0.16, 0.04], [2.14, 0.08, 1.86], INNER_MAUVE, 'Plastic', {
    parentId: 'cs_upper_shell',
  }),
  clamPart('cs_upper_dome1', 'UpperDomeStep1', 'Block', [0, 0.22, -0.04], [2.12, 0.22, 1.86], SHELL_MAIN, 'Plastic', {
    parentId: 'cs_upper_shell',
  }),
  clamPart('cs_upper_dome2', 'UpperDomeStep2', 'Block', [0, 0.38, -0.08], [1.6, 0.18, 1.46], SHELL_LIGHT, 'Plastic', {
    parentId: 'cs_upper_shell',
  }),
  clamPart('cs_upper_crest', 'UpperDomeCrest', 'Block', [0, 0.49, -0.1], [0.74, 0.12, 1.24], SHELL_BRIGHT, 'Plastic', {
    parentId: 'cs_upper_shell',
  }),
  clamPart('cs_upper_rear', 'UpperRearLip', 'Block', [0, -0.08, -1.12], [1.46, 0.26, 0.24], SHELL_DARK, 'Plastic', {
    parentId: 'cs_upper_shell',
  }),

  // Dome Radial Ridge Stripes
  clamPart('cs_uridge_mid', 'UpperRidge_Mid', 'Block', [0, 0.42, 0.42], [0.36, 0.14, 0.96], SHELL_LIGHT, 'Plastic', {
    parentId: 'cs_upper_shell',
  }),
  clamPart('cs_uridge_l', 'UpperRidge_L', 'Block', [-0.62, 0.32, 0.2], [0.3, 0.18, 1.3], SHELL_BRIGHT, 'Plastic', {
    parentId: 'cs_upper_shell',
  }),
  clamPart('cs_uridge_r', 'UpperRidge_R', 'Block', [0.62, 0.32, 0.2], [0.3, 0.18, 1.3], SHELL_BRIGHT, 'Plastic', {
    parentId: 'cs_upper_shell',
  }),

  // Scalloped Front & Side Overhanging Brow Ribs (Upper Shell)
  clamPart('cs_urib_fm', 'UpperRib_FrontMid', 'Block', [0, 0.02, 1.16], [0.42, 0.4, 0.22], SHELL_BRIGHT, 'Plastic', {
    parentId: 'cs_upper_shell',
  }),
  clamPart('cs_urib_fl', 'UpperRib_FrontL', 'Block', [-0.64, 0.0, 1.12], [0.38, 0.44, 0.22], SHELL_LIGHT, 'Plastic', {
    parentId: 'cs_upper_shell',
  }),
  clamPart('cs_urib_fr', 'UpperRib_FrontR', 'Block', [0.64, 0.0, 1.12], [0.38, 0.44, 0.22], SHELL_LIGHT, 'Plastic', {
    parentId: 'cs_upper_shell',
  }),
  clamPart('cs_urib_cl', 'UpperRib_CornerL', 'Block', [-1.14, -0.02, 0.92], [0.26, 0.42, 0.34], SHELL_MAIN, 'Plastic', {
    parentId: 'cs_upper_shell',
    rotation: [0, -28, 0],
  }),
  clamPart('cs_urib_cr', 'UpperRib_CornerR', 'Block', [1.14, -0.02, 0.92], [0.26, 0.42, 0.34], SHELL_MAIN, 'Plastic', {
    parentId: 'cs_upper_shell',
    rotation: [0, 28, 0],
  }),
  clamPart('cs_urib_l1', 'UpperRib_SideL1', 'Block', [-1.32, 0.02, 0.4], [0.18, 0.42, 0.34], SHELL_LIGHT, 'Plastic', {
    parentId: 'cs_upper_shell',
  }),
  clamPart('cs_urib_l2', 'UpperRib_SideL2', 'Block', [-1.34, 0.04, -0.16], [0.2, 0.42, 0.34], SHELL_MID, 'Plastic', {
    parentId: 'cs_upper_shell',
  }),
  clamPart('cs_urib_l3', 'UpperRib_SideL3', 'Block', [-1.3, 0.04, -0.7], [0.18, 0.38, 0.32], SHELL_LIGHT, 'Plastic', {
    parentId: 'cs_upper_shell',
  }),
  clamPart('cs_urib_r1', 'UpperRib_SideR1', 'Block', [1.32, 0.02, 0.4], [0.18, 0.42, 0.34], SHELL_LIGHT, 'Plastic', {
    parentId: 'cs_upper_shell',
  }),
  clamPart('cs_urib_r2', 'UpperRib_SideR2', 'Block', [1.34, 0.04, -0.16], [0.2, 0.42, 0.34], SHELL_MID, 'Plastic', {
    parentId: 'cs_upper_shell',
  }),
  clamPart('cs_urib_r3', 'UpperRib_SideR3', 'Block', [1.3, 0.04, -0.7], [0.18, 0.38, 0.32], SHELL_LIGHT, 'Plastic', {
    parentId: 'cs_upper_shell',
  }),

  // Upper Ivory Teeth hanging down from Inner Rim
  clamPart('cs_utooth_l1', 'UpperTooth_L1', 'Block', [-0.34, -0.26, 1.02], [0.12, 0.2, 0.12], PEARL_IVORY, 'SmoothPlastic', {
    parentId: 'cs_upper_shell',
  }),
  clamPart('cs_utooth_l2', 'UpperTooth_L2', 'Block', [-0.76, -0.26, 0.92], [0.12, 0.2, 0.12], PEARL_IVORY, 'SmoothPlastic', {
    parentId: 'cs_upper_shell',
  }),
  clamPart('cs_utooth_l3', 'UpperTooth_L3', 'Block', [-1.04, -0.26, 0.56], [0.12, 0.2, 0.12], PEARL_IVORY, 'SmoothPlastic', {
    parentId: 'cs_upper_shell',
  }),
  clamPart('cs_utooth_l4', 'UpperTooth_L4', 'Block', [-1.06, -0.26, 0.08], [0.12, 0.18, 0.12], PEARL_IVORY, 'SmoothPlastic', {
    parentId: 'cs_upper_shell',
  }),
  clamPart('cs_utooth_r1', 'UpperTooth_R1', 'Block', [0.34, -0.26, 1.02], [0.12, 0.2, 0.12], PEARL_IVORY, 'SmoothPlastic', {
    parentId: 'cs_upper_shell',
  }),
  clamPart('cs_utooth_r2', 'UpperTooth_R2', 'Block', [0.76, -0.26, 0.92], [0.12, 0.2, 0.12], PEARL_IVORY, 'SmoothPlastic', {
    parentId: 'cs_upper_shell',
  }),
  clamPart('cs_utooth_r3', 'UpperTooth_R3', 'Block', [1.04, -0.26, 0.56], [0.12, 0.2, 0.12], PEARL_IVORY, 'SmoothPlastic', {
    parentId: 'cs_upper_shell',
  }),
  clamPart('cs_utooth_r4', 'UpperTooth_R4', 'Block', [1.06, -0.26, 0.08], [0.12, 0.18, 0.12], PEARL_IVORY, 'SmoothPlastic', {
    parentId: 'cs_upper_shell',
  }),
];

// =============================================================================
// Stage 1: Idle — Gentle bivalve breathing, curious peek & pearl tongue bob
// =============================================================================
const clamSnapperIdleClip: AnimationClip = {
  id: 'clip_clam_snapper_idle',
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
      partId: 'cs_lower_shell',
      keyframes: [
        { id: 'kf_cs_idle_base_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', position: [0, 0.56, 0], rotation: [0, 0, 0] },
        { id: 'kf_cs_idle_base_1', time: 1.6, easingStyle: 'Sine', easingDirection: 'InOut', position: [0, 0.59, 0], rotation: [-1.5, 0, 0] },
        { id: 'kf_cs_idle_base_2', time: 3.2, easingStyle: 'Sine', easingDirection: 'InOut', position: [0, 0.56, 0], rotation: [0, 0, 0] },
      ],
    },
    {
      partId: 'cs_upper_shell',
      keyframes: [
        { id: 'kf_cs_idle_lid_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [-27, 0, 0] },
        { id: 'kf_cs_idle_lid_1', time: 1.0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [-20, 0, 0] },
        { id: 'kf_cs_idle_lid_2', time: 2.1, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [-30, 0, 0] },
        { id: 'kf_cs_idle_lid_3', time: 3.2, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [-27, 0, 0] },
      ],
    },
    {
      partId: 'cs_head',
      keyframes: [
        { id: 'kf_cs_idle_hd_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', position: [0, 0.56, -0.06], rotation: [0, 0, 0] },
        { id: 'kf_cs_idle_hd_1', time: 1.0, easingStyle: 'Quad', easingDirection: 'Out', position: [0, 0.54, -0.08], rotation: [2, 6, 0] },
        { id: 'kf_cs_idle_hd_2', time: 2.2, easingStyle: 'Sine', easingDirection: 'InOut', position: [0, 0.59, -0.04], rotation: [-2, -6, 0] },
        { id: 'kf_cs_idle_hd_3', time: 3.2, easingStyle: 'Sine', easingDirection: 'InOut', position: [0, 0.56, -0.06], rotation: [0, 0, 0] },
      ],
    },
    {
      partId: 'cs_tongue',
      keyframes: [
        { id: 'kf_cs_idle_tg_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 0, 0] },
        { id: 'kf_cs_idle_tg_1', time: 1.6, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [-4, 0, 0] },
        { id: 'kf_cs_idle_tg_2', time: 3.2, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 0, 0] },
      ],
    },
    // Subtle leg angle compensation so feet remain planted during idle breath
    {
      partId: 'cs_leg_fl',
      keyframes: [
        { id: 'kf_cs_idle_fl_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, -34, 20] },
        { id: 'kf_cs_idle_fl_1', time: 1.6, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, -34, 24] },
        { id: 'kf_cs_idle_fl_2', time: 3.2, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, -34, 20] },
      ],
    },
    {
      partId: 'cs_leg_fr',
      keyframes: [
        { id: 'kf_cs_idle_fr_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 34, -20] },
        { id: 'kf_cs_idle_fr_1', time: 1.6, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 34, -24] },
        { id: 'kf_cs_idle_fr_2', time: 3.2, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 34, -20] },
      ],
    },
    {
      partId: 'cs_leg_bl',
      keyframes: [
        { id: 'kf_cs_idle_bl_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 32, 20] },
        { id: 'kf_cs_idle_bl_1', time: 1.6, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 32, 24] },
        { id: 'kf_cs_idle_bl_2', time: 3.2, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 32, 20] },
      ],
    },
    {
      partId: 'cs_leg_br',
      keyframes: [
        { id: 'kf_cs_idle_br_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, -32, -20] },
        { id: 'kf_cs_idle_br_1', time: 1.6, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, -32, -24] },
        { id: 'kf_cs_idle_br_2', time: 3.2, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, -32, -20] },
      ],
    },
  ],
};

// =============================================================================
// Stage 2: Snap Walk — Diagonal scuttle gait + crisp clam jaw snap cycle
// =============================================================================
const clamSnapperWalkClip: AnimationClip = {
  id: 'clip_clam_snapper_walk',
  name: 'Snap Walk',
  duration: 1.6,
  fps: 30,
  loop: true,
  priority: 'Movement',
  sampleMode: 'resampled',
  fadeTime: 0.16,
  defaultWeight: 1,
  markers: [],
  tracks: [
    {
      partId: 'cs_lower_shell',
      keyframes: [
        { id: 'kf_cs_wk_base_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', position: [-0.04, 0.56, 0], rotation: [0, -4, -3] },
        { id: 'kf_cs_wk_base_1', time: 0.4, easingStyle: 'Quad', easingDirection: 'Out', position: [0, 0.64, 0.04], rotation: [2, 0, 0] },
        { id: 'kf_cs_wk_base_2', time: 0.8, easingStyle: 'Sine', easingDirection: 'InOut', position: [0.04, 0.54, 0], rotation: [-3, 4, 3] },
        { id: 'kf_cs_wk_base_3', time: 1.2, easingStyle: 'Quad', easingDirection: 'Out', position: [0, 0.64, 0.04], rotation: [2, 0, 0] },
        { id: 'kf_cs_wk_base_4', time: 1.6, easingStyle: 'Sine', easingDirection: 'InOut', position: [-0.04, 0.56, 0], rotation: [0, -4, -3] },
      ],
    },
    // Signature crisp jaw snap shut at t = 0.80s, then spring back open!
    {
      partId: 'cs_upper_shell',
      keyframes: [
        { id: 'kf_cs_wk_lid_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [-27, 0, 0] },
        { id: 'kf_cs_wk_lid_1', time: 0.55, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [-31, 0, 0] },
        { id: 'kf_cs_wk_lid_2', time: 0.8, easingStyle: 'Quad', easingDirection: 'In', rotation: [-1, 0, 0] },
        { id: 'kf_cs_wk_lid_3', time: 1.05, easingStyle: 'Back', easingDirection: 'Out', rotation: [-29, 0, 0] },
        { id: 'kf_cs_wk_lid_4', time: 1.6, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [-27, 0, 0] },
      ],
    },
    {
      partId: 'cs_head',
      keyframes: [
        { id: 'kf_cs_wk_hd_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', position: [0, 0.56, -0.06], rotation: [0, 3, 2] },
        { id: 'kf_cs_wk_hd_1', time: 0.55, easingStyle: 'Sine', easingDirection: 'InOut', position: [0, 0.59, -0.03], rotation: [-3, 0, 0] },
        { id: 'kf_cs_wk_hd_2', time: 0.8, easingStyle: 'Quad', easingDirection: 'In', position: [0, 0.36, -0.18], rotation: [6, -3, -2] },
        { id: 'kf_cs_wk_hd_3', time: 1.05, easingStyle: 'Back', easingDirection: 'Out', position: [0, 0.58, -0.04], rotation: [-2, 0, 0] },
        { id: 'kf_cs_wk_hd_4', time: 1.6, easingStyle: 'Sine', easingDirection: 'InOut', position: [0, 0.56, -0.06], rotation: [0, 3, 2] },
      ],
    },
    {
      partId: 'cs_tongue',
      keyframes: [
        { id: 'kf_cs_wk_tg_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 0, 0] },
        { id: 'kf_cs_wk_tg_1', time: 0.8, easingStyle: 'Quad', easingDirection: 'In', rotation: [12, 0, 0] },
        { id: 'kf_cs_wk_tg_2', time: 1.08, easingStyle: 'Back', easingDirection: 'Out', rotation: [-6, 0, 0] },
        { id: 'kf_cs_wk_tg_3', time: 1.6, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 0, 0] },
      ],
    },
    // Diagonal Pair A: Front-Left (FL) + Hind-Right (BR)
    {
      partId: 'cs_leg_fl',
      keyframes: [
        { id: 'kf_cs_wk_fl_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, -14, 20] },
        { id: 'kf_cs_wk_fl_1', time: 0.4, easingStyle: 'Quad', easingDirection: 'Out', rotation: [0, -36, -8] },
        { id: 'kf_cs_wk_fl_2', time: 0.8, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, -54, 20] },
        { id: 'kf_cs_wk_fl_3', time: 1.2, easingStyle: 'Linear', easingDirection: 'InOut', rotation: [0, -34, 22] },
        { id: 'kf_cs_wk_fl_4', time: 1.6, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, -14, 20] },
      ],
    },
    {
      partId: 'cs_leg_br',
      keyframes: [
        { id: 'kf_cs_wk_br_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, -52, -20] },
        { id: 'kf_cs_wk_br_1', time: 0.4, easingStyle: 'Quad', easingDirection: 'Out', rotation: [0, -30, 8] },
        { id: 'kf_cs_wk_br_2', time: 0.8, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, -12, -20] },
        { id: 'kf_cs_wk_br_3', time: 1.2, easingStyle: 'Linear', easingDirection: 'InOut', rotation: [0, -32, -22] },
        { id: 'kf_cs_wk_br_4', time: 1.6, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, -52, -20] },
      ],
    },
    // Diagonal Pair B: Front-Right (FR) + Hind-Left (BL)
    {
      partId: 'cs_leg_fr',
      keyframes: [
        { id: 'kf_cs_wk_fr_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 54, -20] },
        { id: 'kf_cs_wk_fr_1', time: 0.4, easingStyle: 'Linear', easingDirection: 'InOut', rotation: [0, 34, -22] },
        { id: 'kf_cs_wk_fr_2', time: 0.8, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 14, -20] },
        { id: 'kf_cs_wk_fr_3', time: 1.2, easingStyle: 'Quad', easingDirection: 'Out', rotation: [0, 36, 8] },
        { id: 'kf_cs_wk_fr_4', time: 1.6, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 54, -20] },
      ],
    },
    {
      partId: 'cs_leg_bl',
      keyframes: [
        { id: 'kf_cs_wk_bl_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 12, 20] },
        { id: 'kf_cs_wk_bl_1', time: 0.4, easingStyle: 'Linear', easingDirection: 'InOut', rotation: [0, 32, 22] },
        { id: 'kf_cs_wk_bl_2', time: 0.8, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 52, 20] },
        { id: 'kf_cs_wk_bl_3', time: 1.2, easingStyle: 'Quad', easingDirection: 'Out', rotation: [0, 30, -8] },
        { id: 'kf_cs_wk_bl_4', time: 1.6, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 12, 20] },
      ],
    },
  ],
};

export const clamSnapperPreset: ModelPreset = {
  id: 'clam-snapper',
  label: 'Clam Snapper',
  description: `${clamSnapperParts.length}-part rigged blocky purple scalloped clam creature with hinged upper jaw shell, ivory teeth, fleshy peach face, pearl on tongue, 4 stubby splayed legs, and Idle + Snap Walk animations.`,
  model: {
    name: 'ClamSnapper',
    primaryPartId: 'cs_lower_shell',
    parts: clamSnapperParts,
    animations: [clamSnapperIdleClip, clamSnapperWalkClip],
    scripts: [],
  },
};
