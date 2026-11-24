import { AnimationClip, PartShape, StudioPartNode, StudioScriptNode } from './robloxTypes';
import type { ModelPreset } from './presets';

function hermitPart(
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

// Kelp Hermit Palette (matched closely to reference creature sheet)
const CRAB_MAIN = '#D44A20';
const CRAB_LIGHT = '#E66335';
const CRAB_HIGHLIGHT = '#F1804E';
const CRAB_DARK = '#A83515';
const BELLY_WARM = '#DF7B52';
const MOUTH_DARK = '#4A180D';
const EYE_DARK = '#1C1618';
const EYE_WHITE = '#F7F3EA';

const CUP_RIM = '#F2EFE9';
const CUP_WHITE = '#E7E2D6';
const CUP_SHADE = '#D2CCC0';
const CUP_INNER = '#A8A196';
const CUP_DEEP = '#7E7870';
const CUP_CRACK = '#686A70';
const GLAZE_BLUE = '#3B66A8';
const GLAZE_LIGHT = '#5A87C9';

const KELP_LIGHT = '#749142';
const KELP_MAIN = '#597232';
const KELP_DARK = '#3F5222';

// Helper to build one wall segment of the compact hollow octagonal porcelain teacup
function buildCupWallPanel(
  suffix: string,
  pos: [number, number, number],
  rotZ: number,
  includeDiamond: boolean,
  includeRimLine = true
): StudioPartNode[] {
  const nodes: StudioPartNode[] = [
    // Compact porcelain barrel wall (outer radius 1.02, inner radius 0.82, length 1.56)
    hermitPart(`kh_cup_w_${suffix}`, `CupWall_${suffix}`, 'Block', pos, [0.82, 0.2, 1.56], CUP_WHITE, 'Plastic', {
      parentId: 'kh_cup',
      rotation: [0, 0, rotZ],
    }),
    // Stepped porcelain outer rim lip at +Z opening
    hermitPart(
      `kh_cup_r_${suffix}`,
      `CupRim_${suffix}`,
      'Block',
      [pos[0] * 1.015, pos[1] * 1.015, 0.74],
      [0.83, 0.21, 0.12],
      CUP_RIM,
      'SmoothPlastic',
      {
        parentId: 'kh_cup',
        rotation: [0, 0, rotZ],
      }
    ),
  ];

  // Radial offset along wall outward normal (local +Y of wall rotated by rotZ)
  const rad = (rotZ * Math.PI) / 180;
  const nx = -Math.sin(rad);
  const ny = Math.cos(rad);

  if (includeRimLine) {
    nodes.push(
      hermitPart(
        `kh_cup_bl_${suffix}`,
        `CupBlueLine_${suffix}`,
        'Block',
        [pos[0] + nx * 0.105, pos[1] + ny * 0.105, 0.56],
        [0.78, 0.03, 0.09],
        GLAZE_LIGHT,
        'SmoothPlastic',
        {
          parentId: 'kh_cup',
          rotation: [0, 0, rotZ],
        }
      ),
      hermitPart(
        `kh_cup_bbl_${suffix}`,
        `CupBlueBaseLine_${suffix}`,
        'Block',
        [pos[0] + nx * 0.105, pos[1] + ny * 0.105, -0.56],
        [0.78, 0.03, 0.08],
        GLAZE_LIGHT,
        'SmoothPlastic',
        {
          parentId: 'kh_cup',
          rotation: [0, 0, rotZ],
        }
      )
    );
  }

  if (includeDiamond) {
    // Cobalt blue floral diamond cross-stitch band
    nodes.push(
      hermitPart(
        `kh_cup_bdh_${suffix}`,
        `CupBlueMotifH_${suffix}`,
        'Block',
        [pos[0] + nx * 0.105, pos[1] + ny * 0.105, 0.16],
        [0.28, 0.03, 0.1],
        GLAZE_BLUE,
        'SmoothPlastic',
        {
          parentId: 'kh_cup',
          rotation: [0, 0, rotZ],
        }
      ),
      hermitPart(
        `kh_cup_bdv_${suffix}`,
        `CupBlueMotifV_${suffix}`,
        'Block',
        [pos[0] + nx * 0.105, pos[1] + ny * 0.105, 0.16],
        [0.1, 0.03, 0.28],
        GLAZE_BLUE,
        'SmoothPlastic',
        {
          parentId: 'kh_cup',
          rotation: [0, 0, rotZ],
        }
      ),
      hermitPart(
        `kh_cup_bdc_${suffix}`,
        `CupBlueCore_${suffix}`,
        'Block',
        [pos[0] + nx * 0.108, pos[1] + ny * 0.108, 0.16],
        [0.1, 0.035, 0.1],
        CUP_RIM,
        'SmoothPlastic',
        {
          parentId: 'kh_cup',
          rotation: [0, 0, rotZ],
        }
      )
    );
  }

  return nodes;
}

const kelpHermitParts: StudioPartNode[] = [
  // ===========================================================================
  // 1. Coral Hermit Crab Thorax / Carapace (PrimaryPart), Belly & Frown Face
  // ===========================================================================
  hermitPart('kh_body', 'CrabCarapace', 'Block', [0, 0.56, 0.36], [1.34, 0.54, 1.06], CRAB_MAIN, 'Plastic', {
    anchored: true,
  }),
  hermitPart('kh_body_top', 'CrabCarapaceTop', 'Block', [0, 0.29, -0.02], [1.14, 0.08, 0.92], CRAB_LIGHT, 'Plastic', {
    parentId: 'kh_body',
  }),
  hermitPart('kh_belly', 'CrabBellyPlate', 'Block', [0, -0.24, 0.04], [1.1, 0.14, 0.86], BELLY_WARM, 'Plastic', {
    parentId: 'kh_body',
  }),
  hermitPart('kh_mouth_recess', 'CrabMouthRecess', 'Block', [0, -0.09, 0.53], [0.64, 0.2, 0.05], BELLY_WARM, 'Plastic', {
    parentId: 'kh_body',
  }),
  hermitPart('kh_mouth_top', 'CrabMouthFrownTop', 'Block', [0, -0.04, 0.55], [0.46, 0.08, 0.05], MOUTH_DARK, 'Plastic', {
    parentId: 'kh_body',
  }),
  hermitPart('kh_mouth_nl', 'CrabMouthFrown_L', 'Block', [0.18, -0.11, 0.55], [0.1, 0.12, 0.05], MOUTH_DARK, 'Plastic', {
    parentId: 'kh_body',
  }),
  hermitPart('kh_mouth_nr', 'CrabMouthFrown_R', 'Block', [-0.18, -0.11, 0.55], [0.1, 0.12, 0.05], MOUTH_DARK, 'Plastic', {
    parentId: 'kh_body',
  }),

  // ===========================================================================
  // 2. Twin Upright Eye Stalks (+X Left / Viewer Right, -X Right / Viewer Left)
  // ===========================================================================
  hermitPart('kh_eye_l', 'EyeStalk_L', 'Block', [0.27, 0.48, 0.36], [0.22, 0.44, 0.22], CRAB_DARK, 'Plastic', {
    parentId: 'kh_body',
    pivotOffset: [0, -0.2, 0],
  }),
  hermitPart('kh_eye_orb_l', 'EyeOrb_L', 'Block', [-0.02, 0.09, 0.09], [0.16, 0.24, 0.08], EYE_DARK, 'SmoothPlastic', {
    parentId: 'kh_eye_l',
  }),
  hermitPart('kh_eye_white_l', 'EyeWhite_L', 'Block', [0.06, 0.09, 0.09], [0.07, 0.22, 0.07], EYE_WHITE, 'SmoothPlastic', {
    parentId: 'kh_eye_l',
  }),
  hermitPart('kh_eye_glint_l', 'EyeGlint_L', 'Block', [-0.04, 0.15, 0.13], [0.06, 0.06, 0.02], EYE_WHITE, 'SmoothPlastic', {
    parentId: 'kh_eye_l',
  }),

  hermitPart('kh_eye_r', 'EyeStalk_R', 'Block', [-0.27, 0.48, 0.36], [0.22, 0.44, 0.22], CRAB_DARK, 'Plastic', {
    parentId: 'kh_body',
    pivotOffset: [0, -0.2, 0],
  }),
  hermitPart('kh_eye_orb_r', 'EyeOrb_R', 'Block', [0.02, 0.09, 0.09], [0.16, 0.24, 0.08], EYE_DARK, 'SmoothPlastic', {
    parentId: 'kh_eye_r',
  }),
  hermitPart('kh_eye_white_r', 'EyeWhite_R', 'Block', [-0.06, 0.09, 0.09], [0.07, 0.22, 0.07], EYE_WHITE, 'SmoothPlastic', {
    parentId: 'kh_eye_r',
  }),
  hermitPart('kh_eye_glint_r', 'EyeGlint_R', 'Block', [0.04, 0.15, 0.13], [0.06, 0.06, 0.02], EYE_WHITE, 'SmoothPlastic', {
    parentId: 'kh_eye_r',
  }),

  // ===========================================================================
  // 3. Asymmetric Articulated Pincer Claws (Left/+X Larger, Right/-X Compact)
  // ===========================================================================
  // Large Left Claw (+X, viewer's right in Front view)
  hermitPart('kh_arm_l', 'ArmShoulder_L', 'Block', [0.76, -0.06, 0.4], [0.34, 0.28, 0.42], CRAB_DARK, 'Plastic', {
    parentId: 'kh_body',
    rotation: [8, -14, 0],
    pivotOffset: [-0.14, 0, -0.16],
  }),
  hermitPart('kh_wrist_l', 'ClawPalm_L', 'Block', [0.06, -0.04, 0.44], [0.58, 0.54, 0.6], CRAB_MAIN, 'Plastic', {
    parentId: 'kh_arm_l',
    rotation: [4, -10, 0],
    pivotOffset: [0, 0, -0.26],
  }),
  hermitPart('kh_palm_top_l', 'ClawTopAccent_L', 'Block', [0, 0.26, 0], [0.48, 0.08, 0.5], CRAB_LIGHT, 'Plastic', {
    parentId: 'kh_wrist_l',
  }),
  hermitPart('kh_pin_up_l', 'PincerUpper_L', 'Block', [0, 0.14, 0.46], [0.28, 0.22, 0.46], CRAB_LIGHT, 'Plastic', {
    parentId: 'kh_wrist_l',
    rotation: [-10, 0, 0],
    pivotOffset: [0, 0, -0.2],
  }),
  hermitPart('kh_pin_ut_l', 'PincerUpperTip_L', 'Block', [0, -0.03, 0.21], [0.22, 0.16, 0.14], CRAB_HIGHLIGHT, 'Plastic', {
    parentId: 'kh_pin_up_l',
  }),
  hermitPart('kh_pin_lo_l', 'PincerLower_L', 'Block', [0, -0.13, 0.44], [0.26, 0.2, 0.42], CRAB_HIGHLIGHT, 'Plastic', {
    parentId: 'kh_wrist_l',
    rotation: [10, 0, 0],
    pivotOffset: [0, 0, -0.18],
  }),
  hermitPart('kh_pin_lt_l', 'PincerLowerTip_L', 'Block', [0, 0.03, 0.19], [0.2, 0.14, 0.14], BELLY_WARM, 'Plastic', {
    parentId: 'kh_pin_lo_l',
  }),

  // Compact Right Claw (-X, viewer's left in Front view, near handle side)
  hermitPart('kh_arm_r', 'ArmShoulder_R', 'Block', [-0.72, -0.08, 0.36], [0.3, 0.26, 0.36], CRAB_DARK, 'Plastic', {
    parentId: 'kh_body',
    rotation: [10, 18, 0],
    pivotOffset: [0.12, 0, -0.14],
  }),
  hermitPart('kh_wrist_r', 'ClawPalm_R', 'Block', [-0.04, -0.06, 0.38], [0.48, 0.46, 0.5], CRAB_MAIN, 'Plastic', {
    parentId: 'kh_arm_r',
    rotation: [6, 12, 0],
    pivotOffset: [0, 0, -0.22],
  }),
  hermitPart('kh_palm_top_r', 'ClawTopAccent_R', 'Block', [0, 0.22, 0], [0.4, 0.07, 0.42], CRAB_LIGHT, 'Plastic', {
    parentId: 'kh_wrist_r',
  }),
  hermitPart('kh_pin_up_r', 'PincerUpper_R', 'Block', [0, 0.12, 0.38], [0.24, 0.19, 0.38], CRAB_LIGHT, 'Plastic', {
    parentId: 'kh_wrist_r',
    rotation: [-10, 0, 0],
    pivotOffset: [0, 0, -0.16],
  }),
  hermitPart('kh_pin_ut_r', 'PincerUpperTip_R', 'Block', [0, -0.02, 0.18], [0.18, 0.14, 0.12], CRAB_HIGHLIGHT, 'Plastic', {
    parentId: 'kh_pin_up_r',
  }),
  hermitPart('kh_pin_lo_r', 'PincerLower_R', 'Block', [0, -0.11, 0.36], [0.22, 0.17, 0.34], CRAB_HIGHLIGHT, 'Plastic', {
    parentId: 'kh_wrist_r',
    rotation: [10, 0, 0],
    pivotOffset: [0, 0, -0.14],
  }),
  hermitPart('kh_pin_lt_r', 'PincerLowerTip_R', 'Block', [0, 0.02, 0.16], [0.16, 0.12, 0.12], BELLY_WARM, 'Plastic', {
    parentId: 'kh_pin_lo_r',
  }),

  // ===========================================================================
  // 4. Six Small Jointed Ground-Scurrying Crab Legs (Bottom y ≈ 0.00)
  // ===========================================================================
  // Left Legs (+X): Front L1, Mid L2, Rear L3
  hermitPart('kh_hip_l1', 'LegHip_L1', 'Block', [0.78, -0.14, 0.24], [0.48, 0.16, 0.16], CRAB_DARK, 'Plastic', {
    parentId: 'kh_body',
    rotation: [0, -24, 18],
    pivotOffset: [-0.22, 0, 0],
  }),
  hermitPart('kh_shin_l1', 'LegShin_L1', 'Block', [0.22, -0.2, 0], [0.15, 0.46, 0.15], CRAB_MAIN, 'Plastic', {
    parentId: 'kh_hip_l1',
    rotation: [0, 0, -28],
    pivotOffset: [0, 0.2, 0],
  }),
  hermitPart('kh_tip_l1', 'LegTip_L1', 'Block', [0, -0.25, 0], [0.14, 0.12, 0.14], CRAB_LIGHT, 'Plastic', {
    parentId: 'kh_shin_l1',
  }),

  hermitPart('kh_hip_l2', 'LegHip_L2', 'Block', [0.82, -0.14, -0.06], [0.48, 0.16, 0.16], CRAB_DARK, 'Plastic', {
    parentId: 'kh_body',
    rotation: [0, 0, 18],
    pivotOffset: [-0.22, 0, 0],
  }),
  hermitPart('kh_shin_l2', 'LegShin_L2', 'Block', [0.22, -0.2, 0], [0.15, 0.46, 0.15], CRAB_MAIN, 'Plastic', {
    parentId: 'kh_hip_l2',
    rotation: [0, 0, -28],
    pivotOffset: [0, 0.2, 0],
  }),
  hermitPart('kh_tip_l2', 'LegTip_L2', 'Block', [0, -0.25, 0], [0.14, 0.12, 0.14], CRAB_LIGHT, 'Plastic', {
    parentId: 'kh_shin_l2',
  }),

  hermitPart('kh_hip_l3', 'LegHip_L3', 'Block', [0.78, -0.14, -0.36], [0.48, 0.16, 0.16], CRAB_DARK, 'Plastic', {
    parentId: 'kh_body',
    rotation: [0, 24, 18],
    pivotOffset: [-0.22, 0, 0],
  }),
  hermitPart('kh_shin_l3', 'LegShin_L3', 'Block', [0.22, -0.2, 0], [0.15, 0.46, 0.15], CRAB_MAIN, 'Plastic', {
    parentId: 'kh_hip_l3',
    rotation: [0, 0, -28],
    pivotOffset: [0, 0.2, 0],
  }),
  hermitPart('kh_tip_l3', 'LegTip_L3', 'Block', [0, -0.25, 0], [0.14, 0.12, 0.14], CRAB_LIGHT, 'Plastic', {
    parentId: 'kh_shin_l3',
  }),

  // Right Legs (-X): Front R1, Mid R2, Rear R3
  hermitPart('kh_hip_r1', 'LegHip_R1', 'Block', [-0.78, -0.14, 0.24], [0.48, 0.16, 0.16], CRAB_DARK, 'Plastic', {
    parentId: 'kh_body',
    rotation: [0, 24, -18],
    pivotOffset: [0.22, 0, 0],
  }),
  hermitPart('kh_shin_r1', 'LegShin_R1', 'Block', [-0.22, -0.2, 0], [0.15, 0.46, 0.15], CRAB_MAIN, 'Plastic', {
    parentId: 'kh_hip_r1',
    rotation: [0, 0, 28],
    pivotOffset: [0, 0.2, 0],
  }),
  hermitPart('kh_tip_r1', 'LegTip_R1', 'Block', [0, -0.25, 0], [0.14, 0.12, 0.14], CRAB_LIGHT, 'Plastic', {
    parentId: 'kh_shin_r1',
  }),

  hermitPart('kh_hip_r2', 'LegHip_R2', 'Block', [-0.82, -0.14, -0.06], [0.48, 0.16, 0.16], CRAB_DARK, 'Plastic', {
    parentId: 'kh_body',
    rotation: [0, 0, -18],
    pivotOffset: [0.22, 0, 0],
  }),
  hermitPart('kh_shin_r2', 'LegShin_R2', 'Block', [-0.22, -0.2, 0], [0.15, 0.46, 0.15], CRAB_MAIN, 'Plastic', {
    parentId: 'kh_hip_r2',
    rotation: [0, 0, 28],
    pivotOffset: [0, 0.2, 0],
  }),
  hermitPart('kh_tip_r2', 'LegTip_R2', 'Block', [0, -0.25, 0], [0.14, 0.12, 0.14], CRAB_LIGHT, 'Plastic', {
    parentId: 'kh_shin_r2',
  }),

  hermitPart('kh_hip_r3', 'LegHip_R3', 'Block', [-0.78, -0.14, -0.36], [0.48, 0.16, 0.16], CRAB_DARK, 'Plastic', {
    parentId: 'kh_body',
    rotation: [0, -24, -18],
    pivotOffset: [0.22, 0, 0],
  }),
  hermitPart('kh_shin_r3', 'LegShin_R3', 'Block', [-0.22, -0.2, 0], [0.15, 0.46, 0.15], CRAB_MAIN, 'Plastic', {
    parentId: 'kh_hip_r3',
    rotation: [0, 0, 28],
    pivotOffset: [0, 0.2, 0],
  }),
  hermitPart('kh_tip_r3', 'LegTip_R3', 'Block', [0, -0.25, 0], [0.14, 0.12, 0.14], CRAB_LIGHT, 'Plastic', {
    parentId: 'kh_shin_r3',
  }),

  // ===========================================================================
  // 5. Compact Hollow Porcelain Teacup Shell, Blue Floral Glaze, Handle & Kelp
  //    (Invisible saddle pivot root so cup tilts, wobbles, and drops flat!)
  // ===========================================================================
  hermitPart('kh_cup', 'TeacupShell', 'Block', [0, 0.88, -0.7], [0.24, 0.24, 0.24], CUP_DEEP, 'Plastic', {
    parentId: 'kh_body',
    rotation: [18, 0, 0],
    pivotOffset: [0, -0.48, 0],
    transparency: 1,
    canCollide: false,
    castShadow: false,
  }),

  // Closed Octagonal Porcelain Cup Bottom & Compact Foot Ring (-Z Rear)
  hermitPart('kh_cup_back_inner', 'CupInnerBase', 'Block', [0, 0, -0.74], [1.42, 1.42, 0.14], CUP_DEEP, 'Plastic', {
    parentId: 'kh_cup',
  }),
  hermitPart('kh_cup_back_inner_oct', 'CupInnerBaseOct', 'Block', [0, 0, -0.74], [1.42, 1.42, 0.14], CUP_DEEP, 'Plastic', {
    parentId: 'kh_cup',
    rotation: [0, 0, 45],
  }),
  hermitPart('kh_cup_back_core', 'CupOuterBase', 'Block', [0, 0, -0.84], [1.44, 1.44, 0.15], CUP_SHADE, 'Plastic', {
    parentId: 'kh_cup',
  }),
  hermitPart('kh_cup_back_core_oct', 'CupOuterBaseOct', 'Block', [0, 0, -0.84], [1.44, 1.44, 0.15], CUP_SHADE, 'Plastic', {
    parentId: 'kh_cup',
    rotation: [0, 0, 45],
  }),
  hermitPart('kh_cup_back_step', 'CupBaseBevel', 'Block', [0, 0, -0.93], [1.24, 1.24, 0.1], CUP_WHITE, 'Plastic', {
    parentId: 'kh_cup',
  }),
  hermitPart('kh_cup_foot_ring', 'CupFootRing', 'Block', [0, 0, -1.0], [0.98, 0.98, 0.1], CUP_RIM, 'Plastic', {
    parentId: 'kh_cup',
  }),
  hermitPart('kh_cup_foot_well', 'CupFootWell', 'Block', [0, 0, -1.03], [0.66, 0.66, 0.06], CUP_INNER, 'Plastic', {
    parentId: 'kh_cup',
  }),

  // 8-Sided Compact Hollow Porcelain Cup Barrel + Cobalt Blue Floral Band
  ...buildCupWallPanel('Top', [0, 0.92, 0], 0, true, true),
  ...buildCupWallPanel('TopL', [0.65, 0.65, 0], -45, true, true),
  ...buildCupWallPanel('TopR', [-0.65, 0.65, 0], 45, true, true),
  ...buildCupWallPanel('SideL', [0.92, 0, 0], -90, true, true),
  ...buildCupWallPanel('SideR', [-0.92, 0, 0], 90, false, true),
  ...buildCupWallPanel('BotL', [0.65, -0.65, 0], -135, true, true),
  ...buildCupWallPanel('BotR', [-0.65, -0.65, 0], 135, true, true),
  ...buildCupWallPanel('Bottom', [0, -0.92, 0], 180, false, false),

  // Interior Dark Porcelain Shading Plates (creating cozy shadow depth behind crab)
  hermitPart('kh_cup_in_top', 'CupInnerCeiling', 'Block', [0, 0.79, -0.1], [1.12, 0.06, 1.22], CUP_INNER, 'Plastic', {
    parentId: 'kh_cup',
  }),
  hermitPart('kh_cup_in_l', 'CupInnerWall_L', 'Block', [0.79, 0, -0.1], [0.06, 1.12, 1.22], CUP_INNER, 'Plastic', {
    parentId: 'kh_cup',
  }),
  hermitPart('kh_cup_in_r', 'CupInnerWall_R', 'Block', [-0.79, 0, -0.1], [0.06, 1.12, 1.22], CUP_INNER, 'Plastic', {
    parentId: 'kh_cup',
  }),

  // Subtle Porcelain Hairline Crack Accent (matching top-center cup reference)
  hermitPart('kh_cup_crack1', 'CupCrack_1', 'Block', [0.18, 1.02, -0.26], [0.22, 0.03, 0.07], CUP_CRACK, 'Plastic', {
    parentId: 'kh_cup',
    rotation: [0, 26, 0],
  }),
  hermitPart('kh_cup_crack2', 'CupCrack_2', 'Block', [-0.03, 1.02, -0.36], [0.24, 0.03, 0.07], CUP_CRACK, 'Plastic', {
    parentId: 'kh_cup',
    rotation: [0, -24, 0],
  }),

  // Compact Porcelain D-Handle on -X Side (viewer's left in Front view, right in Rear view)
  hermitPart('kh_handle_top', 'CupHandle_Top', 'Block', [-1.14, 0.34, -0.04], [0.38, 0.18, 0.22], CUP_RIM, 'SmoothPlastic', {
    parentId: 'kh_cup',
  }),
  hermitPart('kh_handle_outer', 'CupHandle_Outer', 'Block', [-1.3, 0.0, -0.04], [0.18, 0.68, 0.22], CUP_WHITE, 'SmoothPlastic', {
    parentId: 'kh_cup',
  }),
  hermitPart('kh_handle_bot', 'CupHandle_Bottom', 'Block', [-1.14, -0.34, -0.04], [0.38, 0.18, 0.22], CUP_SHADE, 'SmoothPlastic', {
    parentId: 'kh_cup',
  }),

  // Draped Olive-Green Kelp / Seaweed Ribbons over Cup Top, Lip, Handle Side & Rear Base
  hermitPart('kh_kelp_front', 'KelpFrontLip', 'Block', [0.38, 0.74, 0.81], [0.18, 0.48, 0.09], KELP_MAIN, 'Plastic', {
    parentId: 'kh_cup',
    rotation: [6, 0, -10],
  }),
  hermitPart('kh_kelp_front_tip', 'KelpFrontTip', 'Block', [0.44, 0.44, 0.83], [0.14, 0.24, 0.07], KELP_DARK, 'Plastic', {
    parentId: 'kh_cup',
    rotation: [4, 0, 8],
  }),
  hermitPart('kh_kelp_crown1', 'KelpCrown_A', 'Block', [0.2, 1.03, 0.38], [0.28, 0.07, 0.8], KELP_LIGHT, 'Plastic', {
    parentId: 'kh_cup',
    rotation: [0, -24, 0],
  }),
  hermitPart('kh_kelp_crown2', 'KelpCrown_B', 'Block', [-0.14, 1.03, -0.18], [0.32, 0.08, 0.84], KELP_MAIN, 'Plastic', {
    parentId: 'kh_cup',
    rotation: [0, -36, 0],
  }),
  hermitPart('kh_kelp_side1', 'KelpSideDrape_1', 'Block', [-0.68, 0.76, -0.22], [0.2, 0.5, 0.3], KELP_LIGHT, 'Plastic', {
    parentId: 'kh_cup',
    rotation: [0, 0, 44],
  }),
  hermitPart('kh_kelp_side2', 'KelpSideDrape_2', 'Block', [-1.02, 0.18, -0.3], [0.1, 0.8, 0.28], KELP_MAIN, 'Plastic', {
    parentId: 'kh_cup',
    rotation: [-8, 0, 0],
  }),
  hermitPart('kh_kelp_tail', 'KelpTrailingTip', 'Block', [-1.1, -0.42, -0.46], [0.1, 0.52, 0.22], KELP_DARK, 'Plastic', {
    parentId: 'kh_cup',
    rotation: [-30, 14, 16],
  }),
  hermitPart('kh_kelp_rear1', 'KelpRearDrop_1', 'Block', [-0.22, 0.52, -0.96], [0.24, 0.88, 0.12], KELP_MAIN, 'Plastic', {
    parentId: 'kh_cup',
    rotation: [0, 0, 8],
  }),
  hermitPart('kh_kelp_rear2', 'KelpRearDrop_2', 'Block', [-0.4, -0.06, -1.03], [0.18, 0.74, 0.1], KELP_DARK, 'Plastic', {
    parentId: 'kh_cup',
    rotation: [0, 0, 14],
  }),
];

// =============================================================================
// Stage 1: Idle — Cautious eye-stalk peek, light claw twitch & heavy cup settle
// =============================================================================
const kelpHermitIdleClip: AnimationClip = {
  id: 'clip_kelp_hermit_idle',
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
      partId: 'kh_body',
      keyframes: [
        { id: 'kf_kh_id_b0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', position: [0, 0.56, 0.36], rotation: [0, 0, 0] },
        { id: 'kf_kh_id_b1', time: 1.6, easingStyle: 'Sine', easingDirection: 'InOut', position: [0, 0.58, 0.36], rotation: [1.5, 0, 0] },
        { id: 'kf_kh_id_b2', time: 3.2, easingStyle: 'Sine', easingDirection: 'InOut', position: [0, 0.56, 0.36], rotation: [0, 0, 0] },
      ],
    },
    {
      partId: 'kh_cup',
      keyframes: [
        { id: 'kf_kh_id_c0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', position: [0, 0.88, -0.7], rotation: [18, 0, 0] },
        { id: 'kf_kh_id_c1', time: 1.6, easingStyle: 'Sine', easingDirection: 'InOut', position: [0, 0.87, -0.71], rotation: [16.5, 0, -1.5] },
        { id: 'kf_kh_id_c2', time: 3.2, easingStyle: 'Sine', easingDirection: 'InOut', position: [0, 0.88, -0.7], rotation: [18, 0, 0] },
      ],
    },
    {
      partId: 'kh_eye_l',
      keyframes: [
        { id: 'kf_kh_id_el0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 0, 0] },
        { id: 'kf_kh_id_el1', time: 1.0, easingStyle: 'Quad', easingDirection: 'Out', rotation: [-6, -8, -4] },
        { id: 'kf_kh_id_el2', time: 2.2, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [4, 6, 3] },
        { id: 'kf_kh_id_el3', time: 3.2, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 0, 0] },
      ],
    },
    {
      partId: 'kh_eye_r',
      keyframes: [
        { id: 'kf_kh_id_er0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 0, 0] },
        { id: 'kf_kh_id_er1', time: 1.0, easingStyle: 'Quad', easingDirection: 'Out', rotation: [4, -6, -3] },
        { id: 'kf_kh_id_er2', time: 2.2, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [-6, 8, 4] },
        { id: 'kf_kh_id_er3', time: 3.2, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 0, 0] },
      ],
    },
    {
      partId: 'kh_arm_l',
      keyframes: [
        { id: 'kf_kh_id_al0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [8, -14, 0] },
        { id: 'kf_kh_id_al1', time: 1.6, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [2, -10, -4] },
        { id: 'kf_kh_id_al2', time: 3.2, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [8, -14, 0] },
      ],
    },
    {
      partId: 'kh_arm_r',
      keyframes: [
        { id: 'kf_kh_id_ar0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [10, 18, 0] },
        { id: 'kf_kh_id_ar1', time: 1.6, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [14, 14, 3] },
        { id: 'kf_kh_id_ar2', time: 3.2, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [10, 18, 0] },
      ],
    },
  ],
};

// =============================================================================
// Stage 2: Waddle Walk — Clumsy heavy waddle, dragging heavy teacup while
//                        small jointed legs scurry briskly on the ground
// =============================================================================
const kelpHermitWaddleClip: AnimationClip = {
  id: 'clip_kelp_hermit_waddle',
  name: 'Waddle Walk',
  duration: 1.6,
  fps: 30,
  loop: true,
  priority: 'Movement',
  sampleMode: 'resampled',
  fadeTime: 0.16,
  defaultWeight: 1,
  markers: [],
  tracks: [
    // Heavy side-to-side waddle roll on crab body
    {
      partId: 'kh_body',
      keyframes: [
        { id: 'kf_kh_wk_b0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', position: [-0.08, 0.56, 0.36], rotation: [2, -5, 5] },
        { id: 'kf_kh_wk_b1', time: 0.4, easingStyle: 'Quad', easingDirection: 'Out', position: [0, 0.61, 0.4], rotation: [4, 0, 0] },
        { id: 'kf_kh_wk_b2', time: 0.8, easingStyle: 'Sine', easingDirection: 'InOut', position: [0.08, 0.55, 0.36], rotation: [2, 5, -5] },
        { id: 'kf_kh_wk_b3', time: 1.2, easingStyle: 'Quad', easingDirection: 'Out', position: [0, 0.61, 0.4], rotation: [4, 0, 0] },
        { id: 'kf_kh_wk_b4', time: 1.6, easingStyle: 'Sine', easingDirection: 'InOut', position: [-0.08, 0.56, 0.36], rotation: [2, -5, 5] },
      ],
    },
    // Compact teacup lags slightly & rolls with mechanical weight behind crab
    {
      partId: 'kh_cup',
      keyframes: [
        { id: 'kf_kh_wk_c0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', position: [0, 0.86, -0.72], rotation: [20, 4, -7] },
        { id: 'kf_kh_wk_c1', time: 0.4, easingStyle: 'Sine', easingDirection: 'InOut', position: [0, 0.84, -0.74], rotation: [15, 2, -2] },
        { id: 'kf_kh_wk_c2', time: 0.8, easingStyle: 'Sine', easingDirection: 'InOut', position: [0, 0.86, -0.72], rotation: [20, -4, 7] },
        { id: 'kf_kh_wk_c3', time: 1.2, easingStyle: 'Sine', easingDirection: 'InOut', position: [0, 0.84, -0.74], rotation: [15, -2, 2] },
        { id: 'kf_kh_wk_c4', time: 1.6, easingStyle: 'Sine', easingDirection: 'InOut', position: [0, 0.86, -0.72], rotation: [20, 4, -7] },
      ],
    },
    {
      partId: 'kh_arm_l',
      keyframes: [
        { id: 'kf_kh_wk_al0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [12, -16, -4] },
        { id: 'kf_kh_wk_al1', time: 0.8, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [2, -10, 4] },
        { id: 'kf_kh_wk_al2', time: 1.6, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [12, -16, -4] },
      ],
    },
    {
      partId: 'kh_arm_r',
      keyframes: [
        { id: 'kf_kh_wk_ar0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [4, 12, -4] },
        { id: 'kf_kh_wk_ar1', time: 0.8, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [14, 18, 4] },
        { id: 'kf_kh_wk_ar2', time: 1.6, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [4, 12, -4] },
      ],
    },
    // Tripod A (L1, R2, L3) — 2 fast scurries per 1.6s waddle cycle
    {
      partId: 'kh_hip_l1',
      keyframes: [
        { id: 'kf_kh_wk_l1_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, -12, 18] },
        { id: 'kf_kh_wk_l1_1', time: 0.2, easingStyle: 'Quad', easingDirection: 'Out', rotation: [0, -26, 36] },
        { id: 'kf_kh_wk_l1_2', time: 0.4, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, -36, 18] },
        { id: 'kf_kh_wk_l1_3', time: 0.8, easingStyle: 'Linear', easingDirection: 'InOut', rotation: [0, -12, 18] },
        { id: 'kf_kh_wk_l1_4', time: 1.0, easingStyle: 'Quad', easingDirection: 'Out', rotation: [0, -26, 36] },
        { id: 'kf_kh_wk_l1_5', time: 1.2, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, -36, 18] },
        { id: 'kf_kh_wk_l1_6', time: 1.6, easingStyle: 'Linear', easingDirection: 'InOut', rotation: [0, -12, 18] },
      ],
    },
    {
      partId: 'kh_hip_r2',
      keyframes: [
        { id: 'kf_kh_wk_r2_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 14, -18] },
        { id: 'kf_kh_wk_r2_1', time: 0.2, easingStyle: 'Quad', easingDirection: 'Out', rotation: [0, 0, -36] },
        { id: 'kf_kh_wk_r2_2', time: 0.4, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, -14, -18] },
        { id: 'kf_kh_wk_r2_3', time: 0.8, easingStyle: 'Linear', easingDirection: 'InOut', rotation: [0, 14, -18] },
        { id: 'kf_kh_wk_r2_4', time: 1.0, easingStyle: 'Quad', easingDirection: 'Out', rotation: [0, 0, -36] },
        { id: 'kf_kh_wk_r2_5', time: 1.2, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, -14, -18] },
        { id: 'kf_kh_wk_r2_6', time: 1.6, easingStyle: 'Linear', easingDirection: 'InOut', rotation: [0, 14, -18] },
      ],
    },
    {
      partId: 'kh_hip_l3',
      keyframes: [
        { id: 'kf_kh_wk_l3_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 36, 18] },
        { id: 'kf_kh_wk_l3_1', time: 0.2, easingStyle: 'Quad', easingDirection: 'Out', rotation: [0, 22, 36] },
        { id: 'kf_kh_wk_l3_2', time: 0.4, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 12, 18] },
        { id: 'kf_kh_wk_l3_3', time: 0.8, easingStyle: 'Linear', easingDirection: 'InOut', rotation: [0, 36, 18] },
        { id: 'kf_kh_wk_l3_4', time: 1.0, easingStyle: 'Quad', easingDirection: 'Out', rotation: [0, 22, 36] },
        { id: 'kf_kh_wk_l3_5', time: 1.2, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 12, 18] },
        { id: 'kf_kh_wk_l3_6', time: 1.6, easingStyle: 'Linear', easingDirection: 'InOut', rotation: [0, 36, 18] },
      ],
    },
    // Tripod B (R1, L2, R3) — alternating phase
    {
      partId: 'kh_hip_r1',
      keyframes: [
        { id: 'kf_kh_wk_r1_0', time: 0, easingStyle: 'Linear', easingDirection: 'InOut', rotation: [0, 36, -18] },
        { id: 'kf_kh_wk_r1_1', time: 0.4, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 12, -18] },
        { id: 'kf_kh_wk_r1_2', time: 0.6, easingStyle: 'Quad', easingDirection: 'Out', rotation: [0, 26, -36] },
        { id: 'kf_kh_wk_r1_3', time: 0.8, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 36, -18] },
        { id: 'kf_kh_wk_r1_4', time: 1.2, easingStyle: 'Linear', easingDirection: 'InOut', rotation: [0, 12, -18] },
        { id: 'kf_kh_wk_r1_5', time: 1.4, easingStyle: 'Quad', easingDirection: 'Out', rotation: [0, 26, -36] },
        { id: 'kf_kh_wk_r1_6', time: 1.6, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 36, -18] },
      ],
    },
    {
      partId: 'kh_hip_l2',
      keyframes: [
        { id: 'kf_kh_wk_l2_0', time: 0, easingStyle: 'Linear', easingDirection: 'InOut', rotation: [0, -14, 18] },
        { id: 'kf_kh_wk_l2_1', time: 0.4, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 14, 18] },
        { id: 'kf_kh_wk_l2_2', time: 0.6, easingStyle: 'Quad', easingDirection: 'Out', rotation: [0, 0, 36] },
        { id: 'kf_kh_wk_l2_3', time: 0.8, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, -14, 18] },
        { id: 'kf_kh_wk_l2_4', time: 1.2, easingStyle: 'Linear', easingDirection: 'InOut', rotation: [0, 14, 18] },
        { id: 'kf_kh_wk_l2_5', time: 1.4, easingStyle: 'Quad', easingDirection: 'Out', rotation: [0, 0, 36] },
        { id: 'kf_kh_wk_l2_6', time: 1.6, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, -14, 18] },
      ],
    },
    {
      partId: 'kh_hip_r3',
      keyframes: [
        { id: 'kf_kh_wk_r3_0', time: 0, easingStyle: 'Linear', easingDirection: 'InOut', rotation: [0, -12, -18] },
        { id: 'kf_kh_wk_r3_1', time: 0.4, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, -36, -18] },
        { id: 'kf_kh_wk_r3_2', time: 0.6, easingStyle: 'Quad', easingDirection: 'Out', rotation: [0, -22, -36] },
        { id: 'kf_kh_wk_r3_3', time: 0.8, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, -12, -18] },
        { id: 'kf_kh_wk_r3_4', time: 1.2, easingStyle: 'Linear', easingDirection: 'InOut', rotation: [0, -36, -18] },
        { id: 'kf_kh_wk_r3_5', time: 1.4, easingStyle: 'Quad', easingDirection: 'Out', rotation: [0, -22, -36] },
        { id: 'kf_kh_wk_r3_6', time: 1.6, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, -12, -18] },
      ],
    },
  ],
};

// =============================================================================
// Stage 3: Turn Wobble — Sharp direction shifts causing the bulky teacup to
//                        tilt and wobble with heavy mechanical inertia
// =============================================================================
const kelpHermitTurnWobbleClip: AnimationClip = {
  id: 'clip_kelp_hermit_turn',
  name: 'Turn Wobble',
  duration: 2.2,
  fps: 30,
  loop: true,
  priority: 'Movement',
  sampleMode: 'resampled',
  fadeTime: 0.16,
  defaultWeight: 1,
  markers: [],
  tracks: [
    {
      partId: 'kh_body',
      keyframes: [
        { id: 'kf_kh_tn_b0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', position: [0, 0.56, 0.36], rotation: [0, 0, 0] },
        { id: 'kf_kh_tn_b1', time: 0.45, easingStyle: 'Quad', easingDirection: 'Out', position: [-0.08, 0.58, 0.38], rotation: [2, -26, 4] },
        { id: 'kf_kh_tn_b2', time: 1.1, easingStyle: 'Sine', easingDirection: 'InOut', position: [0, 0.56, 0.36], rotation: [0, 0, 0] },
        { id: 'kf_kh_tn_b3', time: 1.55, easingStyle: 'Quad', easingDirection: 'Out', position: [0.08, 0.58, 0.38], rotation: [2, 26, -4] },
        { id: 'kf_kh_tn_b4', time: 2.2, easingStyle: 'Sine', easingDirection: 'InOut', position: [0, 0.56, 0.36], rotation: [0, 0, 0] },
      ],
    },
    // Cup tilts & overshoots out-of-phase with mechanical lag + secondary wobble
    {
      partId: 'kh_cup',
      keyframes: [
        { id: 'kf_kh_tn_c0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', position: [0, 0.88, -0.7], rotation: [18, 0, 0] },
        { id: 'kf_kh_tn_c1', time: 0.55, easingStyle: 'Back', easingDirection: 'Out', position: [0.08, 0.83, -0.72], rotation: [24, 14, -15] },
        { id: 'kf_kh_tn_c2', time: 0.82, easingStyle: 'Sine', easingDirection: 'InOut', position: [-0.04, 0.89, -0.7], rotation: [14, -6, 7] },
        { id: 'kf_kh_tn_c3', time: 1.1, easingStyle: 'Sine', easingDirection: 'InOut', position: [0, 0.88, -0.7], rotation: [18, 0, 0] },
        { id: 'kf_kh_tn_c4', time: 1.65, easingStyle: 'Back', easingDirection: 'Out', position: [-0.08, 0.83, -0.72], rotation: [24, -14, 15] },
        { id: 'kf_kh_tn_c5', time: 1.92, easingStyle: 'Sine', easingDirection: 'InOut', position: [0.04, 0.89, -0.7], rotation: [14, 6, -7] },
        { id: 'kf_kh_tn_c6', time: 2.2, easingStyle: 'Sine', easingDirection: 'InOut', position: [0, 0.88, -0.7], rotation: [18, 0, 0] },
      ],
    },
    {
      partId: 'kh_eye_l',
      keyframes: [
        { id: 'kf_kh_tn_el0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 0, 0] },
        { id: 'kf_kh_tn_el1', time: 0.5, easingStyle: 'Quad', easingDirection: 'Out', rotation: [-4, -14, -8] },
        { id: 'kf_kh_tn_el2', time: 1.6, easingStyle: 'Quad', easingDirection: 'Out', rotation: [-4, 14, 8] },
        { id: 'kf_kh_tn_el3', time: 2.2, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 0, 0] },
      ],
    },
    {
      partId: 'kh_eye_r',
      keyframes: [
        { id: 'kf_kh_tn_er0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 0, 0] },
        { id: 'kf_kh_tn_er1', time: 0.5, easingStyle: 'Quad', easingDirection: 'Out', rotation: [4, -14, -8] },
        { id: 'kf_kh_tn_er2', time: 1.6, easingStyle: 'Quad', easingDirection: 'Out', rotation: [4, 14, 8] },
        { id: 'kf_kh_tn_er3', time: 2.2, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 0, 0] },
      ],
    },
    // Quick pivot stepping on front/rear legs during turn
    {
      partId: 'kh_hip_l1',
      keyframes: [
        { id: 'kf_kh_tn_l1_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, -24, 18] },
        { id: 'kf_kh_tn_l1_1', time: 0.35, easingStyle: 'Quad', easingDirection: 'Out', rotation: [0, -34, 34] },
        { id: 'kf_kh_tn_l1_2', time: 0.7, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, -24, 18] },
        { id: 'kf_kh_tn_l1_3', time: 1.45, easingStyle: 'Quad', easingDirection: 'Out', rotation: [0, -14, 34] },
        { id: 'kf_kh_tn_l1_4', time: 2.2, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, -24, 18] },
      ],
    },
    {
      partId: 'kh_hip_r1',
      keyframes: [
        { id: 'kf_kh_tn_r1_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 24, -18] },
        { id: 'kf_kh_tn_r1_1', time: 0.35, easingStyle: 'Quad', easingDirection: 'Out', rotation: [0, 14, -34] },
        { id: 'kf_kh_tn_r1_2', time: 0.7, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 24, -18] },
        { id: 'kf_kh_tn_r1_3', time: 1.45, easingStyle: 'Quad', easingDirection: 'Out', rotation: [0, 34, -34] },
        { id: 'kf_kh_tn_r1_4', time: 2.2, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 24, -18] },
      ],
    },
  ],
};

// =============================================================================
// Stage 4: Startled Retract — Crab snaps entirely inside the teacup, cup drops
//          flat to ground & rocks gently, then claws & eye stalks peek back out
// =============================================================================
const kelpHermitStartleClip: AnimationClip = {
  id: 'clip_kelp_hermit_startle',
  name: 'Startled Retract',
  duration: 4.2,
  fps: 30,
  loop: true,
  priority: 'Action',
  sampleMode: 'resampled',
  fadeTime: 0.12,
  defaultWeight: 1,
  markers: [],
  tracks: [
    // 1. Crab body flinches, snaps deep inside compact teacup (-Z), waits, then peeks back out
    {
      partId: 'kh_body',
      keyframes: [
        { id: 'kf_kh_st_b0', time: 0, easingStyle: 'Quad', easingDirection: 'Out', position: [0, 0.56, 0.36], rotation: [0, 0, 0] },
        { id: 'kf_kh_st_b1', time: 0.14, easingStyle: 'Quad', easingDirection: 'Out', position: [0, 0.62, 0.28], rotation: [-8, 0, 0] },
        { id: 'kf_kh_st_b2', time: 0.36, easingStyle: 'Cubic', easingDirection: 'In', position: [0, 0.62, -0.34], rotation: [0, 0, 0] },
        { id: 'kf_kh_st_b3', time: 2.45, easingStyle: 'Sine', easingDirection: 'InOut', position: [0, 0.62, -0.34], rotation: [0, 0, 0] },
        { id: 'kf_kh_st_b4', time: 3.15, easingStyle: 'Sine', easingDirection: 'InOut', position: [0, 0.58, 0.04], rotation: [0, 0, 0] },
        { id: 'kf_kh_st_b5', time: 3.65, easingStyle: 'Back', easingDirection: 'Out', position: [0, 0.56, 0.36], rotation: [0, 0, 0] },
        { id: 'kf_kh_st_b6', time: 4.2, easingStyle: 'Linear', easingDirection: 'InOut', position: [0, 0.56, 0.36], rotation: [0, 0, 0] },
      ],
    },
    // 2. Compact porcelain teacup drops flat onto floor (rx=0°, world y=1.02), rocks gently, then lifts
    {
      partId: 'kh_cup',
      keyframes: [
        { id: 'kf_kh_st_c0', time: 0, easingStyle: 'Quad', easingDirection: 'Out', position: [0, 0.88, -0.7], rotation: [18, 0, 0] },
        { id: 'kf_kh_st_c1', time: 0.14, easingStyle: 'Quad', easingDirection: 'Out', position: [0, 0.9, -0.64], rotation: [24, 0, 0] },
        { id: 'kf_kh_st_c2', time: 0.42, easingStyle: 'Bounce', easingDirection: 'Out', position: [0, 0.4, 0.0], rotation: [0, 0, -4.5] },
        { id: 'kf_kh_st_c3', time: 0.92, easingStyle: 'Sine', easingDirection: 'InOut', position: [0, 0.4, 0.0], rotation: [0, 0, 4.0] },
        { id: 'kf_kh_st_c4', time: 1.45, easingStyle: 'Sine', easingDirection: 'InOut', position: [0, 0.4, 0.0], rotation: [0, 0, -2.5] },
        { id: 'kf_kh_st_c5', time: 2.0, easingStyle: 'Sine', easingDirection: 'InOut', position: [0, 0.4, 0.0], rotation: [0, 0, 1.5] },
        { id: 'kf_kh_st_c6', time: 2.45, easingStyle: 'Sine', easingDirection: 'InOut', position: [0, 0.4, 0.0], rotation: [0, 0, 0] },
        { id: 'kf_kh_st_c7', time: 3.15, easingStyle: 'Sine', easingDirection: 'InOut', position: [0, 0.72, -0.42], rotation: [14, 0, 0] },
        { id: 'kf_kh_st_c8', time: 3.65, easingStyle: 'Sine', easingDirection: 'InOut', position: [0, 0.88, -0.7], rotation: [18, 0, 0] },
        { id: 'kf_kh_st_c9', time: 4.2, easingStyle: 'Linear', easingDirection: 'InOut', position: [0, 0.88, -0.7], rotation: [18, 0, 0] },
      ],
    },
    // 3. Eye stalks duck flat inside, then poke back out FIRST to check coast is clear
    {
      partId: 'kh_eye_l',
      keyframes: [
        { id: 'kf_kh_st_el0', time: 0, easingStyle: 'Quad', easingDirection: 'Out', position: [0.27, 0.48, 0.36], rotation: [0, 0, 0] },
        { id: 'kf_kh_st_el1', time: 0.32, easingStyle: 'Quad', easingDirection: 'In', position: [0.24, 0.24, 0.14], rotation: [-78, 0, 0] },
        { id: 'kf_kh_st_el2', time: 2.45, easingStyle: 'Sine', easingDirection: 'InOut', position: [0.24, 0.24, 0.14], rotation: [-78, 0, 0] },
        { id: 'kf_kh_st_el3', time: 2.95, easingStyle: 'Sine', easingDirection: 'Out', position: [0.27, 0.44, 0.32], rotation: [-10, -12, -4] },
        { id: 'kf_kh_st_el4', time: 3.45, easingStyle: 'Back', easingDirection: 'Out', position: [0.27, 0.48, 0.36], rotation: [0, 0, 0] },
        { id: 'kf_kh_st_el5', time: 4.2, easingStyle: 'Linear', easingDirection: 'InOut', position: [0.27, 0.48, 0.36], rotation: [0, 0, 0] },
      ],
    },
    {
      partId: 'kh_eye_r',
      keyframes: [
        { id: 'kf_kh_st_er0', time: 0, easingStyle: 'Quad', easingDirection: 'Out', position: [-0.27, 0.48, 0.36], rotation: [0, 0, 0] },
        { id: 'kf_kh_st_er1', time: 0.32, easingStyle: 'Quad', easingDirection: 'In', position: [-0.24, 0.24, 0.14], rotation: [-78, 0, 0] },
        { id: 'kf_kh_st_er2', time: 2.45, easingStyle: 'Sine', easingDirection: 'InOut', position: [-0.24, 0.24, 0.14], rotation: [-78, 0, 0] },
        { id: 'kf_kh_st_er3', time: 2.95, easingStyle: 'Sine', easingDirection: 'Out', position: [-0.27, 0.44, 0.32], rotation: [-10, 12, 4] },
        { id: 'kf_kh_st_er4', time: 3.45, easingStyle: 'Back', easingDirection: 'Out', position: [-0.27, 0.48, 0.36], rotation: [0, 0, 0] },
        { id: 'kf_kh_st_er5', time: 4.2, easingStyle: 'Linear', easingDirection: 'InOut', position: [-0.27, 0.48, 0.36], rotation: [0, 0, 0] },
      ],
    },
    // 4. Pincer arms + wrists tuck tightly inward & backward inside the compact cup, then cautiously extend
    {
      partId: 'kh_arm_l',
      keyframes: [
        { id: 'kf_kh_st_al0', time: 0, easingStyle: 'Quad', easingDirection: 'Out', position: [0.76, -0.06, 0.4], rotation: [8, -14, 0] },
        { id: 'kf_kh_st_al1', time: 0.34, easingStyle: 'Cubic', easingDirection: 'In', position: [0.46, 0.08, -0.16], rotation: [-22, -46, -6] },
        { id: 'kf_kh_st_al2', time: 2.55, easingStyle: 'Sine', easingDirection: 'InOut', position: [0.46, 0.08, -0.16], rotation: [-22, -46, -6] },
        { id: 'kf_kh_st_al3', time: 3.25, easingStyle: 'Sine', easingDirection: 'Out', position: [0.68, -0.04, 0.28], rotation: [2, -28, 0] },
        { id: 'kf_kh_st_al4', time: 3.65, easingStyle: 'Back', easingDirection: 'Out', position: [0.76, -0.06, 0.4], rotation: [8, -14, 0] },
        { id: 'kf_kh_st_al5', time: 4.2, easingStyle: 'Linear', easingDirection: 'InOut', position: [0.76, -0.06, 0.4], rotation: [8, -14, 0] },
      ],
    },
    {
      partId: 'kh_wrist_l',
      keyframes: [
        { id: 'kf_kh_st_wl0', time: 0, easingStyle: 'Quad', easingDirection: 'Out', rotation: [4, -10, 0] },
        { id: 'kf_kh_st_wl1', time: 0.34, easingStyle: 'Cubic', easingDirection: 'In', rotation: [8, -12, 0] },
        { id: 'kf_kh_st_wl2', time: 2.55, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [8, -12, 0] },
        { id: 'kf_kh_st_wl3', time: 3.65, easingStyle: 'Back', easingDirection: 'Out', rotation: [4, -10, 0] },
      ],
    },
    {
      partId: 'kh_arm_r',
      keyframes: [
        { id: 'kf_kh_st_ar0', time: 0, easingStyle: 'Quad', easingDirection: 'Out', position: [-0.72, -0.08, 0.36], rotation: [10, 18, 0] },
        { id: 'kf_kh_st_ar1', time: 0.34, easingStyle: 'Cubic', easingDirection: 'In', position: [-0.44, -0.02, -0.14], rotation: [-10, 52, 6] },
        { id: 'kf_kh_st_ar2', time: 2.55, easingStyle: 'Sine', easingDirection: 'InOut', position: [-0.44, -0.02, -0.14], rotation: [-10, 52, 6] },
        { id: 'kf_kh_st_ar3', time: 3.25, easingStyle: 'Sine', easingDirection: 'Out', position: [-0.64, -0.06, 0.24], rotation: [4, 30, 0] },
        { id: 'kf_kh_st_ar4', time: 3.65, easingStyle: 'Back', easingDirection: 'Out', position: [-0.72, -0.08, 0.36], rotation: [10, 18, 0] },
        { id: 'kf_kh_st_ar5', time: 4.2, easingStyle: 'Linear', easingDirection: 'InOut', position: [-0.72, -0.08, 0.36], rotation: [10, 18, 0] },
      ],
    },
    {
      partId: 'kh_wrist_r',
      keyframes: [
        { id: 'kf_kh_st_wr0', time: 0, easingStyle: 'Quad', easingDirection: 'Out', rotation: [6, 12, 0] },
        { id: 'kf_kh_st_wr1', time: 0.34, easingStyle: 'Cubic', easingDirection: 'In', rotation: [6, 12, 0] },
        { id: 'kf_kh_st_wr2', time: 2.55, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [6, 12, 0] },
        { id: 'kf_kh_st_wr3', time: 3.65, easingStyle: 'Back', easingDirection: 'Out', rotation: [6, 12, 0] },
      ],
    },
    // 5. All 6 legs curl inward & up inside the teacup cavity, then unfold back onto ground
    {
      partId: 'kh_hip_l1',
      keyframes: [
        { id: 'kf_kh_st_hl1_0', time: 0, easingStyle: 'Quad', easingDirection: 'Out', rotation: [0, -24, 18] },
        { id: 'kf_kh_st_hl1_1', time: 0.32, easingStyle: 'Cubic', easingDirection: 'In', rotation: [0, -78, 62] },
        { id: 'kf_kh_st_hl1_2', time: 2.55, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, -78, 62] },
        { id: 'kf_kh_st_hl1_3', time: 3.55, easingStyle: 'Sine', easingDirection: 'Out', rotation: [0, -24, 18] },
        { id: 'kf_kh_st_hl1_4', time: 4.2, easingStyle: 'Linear', easingDirection: 'InOut', rotation: [0, -24, 18] },
      ],
    },
    {
      partId: 'kh_hip_l2',
      keyframes: [
        { id: 'kf_kh_st_hl2_0', time: 0, easingStyle: 'Quad', easingDirection: 'Out', rotation: [0, 0, 18] },
        { id: 'kf_kh_st_hl2_1', time: 0.32, easingStyle: 'Cubic', easingDirection: 'In', rotation: [0, -68, 66] },
        { id: 'kf_kh_st_hl2_2', time: 2.55, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, -68, 66] },
        { id: 'kf_kh_st_hl2_3', time: 3.55, easingStyle: 'Sine', easingDirection: 'Out', rotation: [0, 0, 18] },
        { id: 'kf_kh_st_hl2_4', time: 4.2, easingStyle: 'Linear', easingDirection: 'InOut', rotation: [0, 0, 18] },
      ],
    },
    {
      partId: 'kh_hip_l3',
      keyframes: [
        { id: 'kf_kh_st_hl3_0', time: 0, easingStyle: 'Quad', easingDirection: 'Out', rotation: [0, 24, 18] },
        { id: 'kf_kh_st_hl3_1', time: 0.32, easingStyle: 'Cubic', easingDirection: 'In', rotation: [0, -56, 68] },
        { id: 'kf_kh_st_hl3_2', time: 2.55, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, -56, 68] },
        { id: 'kf_kh_st_hl3_3', time: 3.55, easingStyle: 'Sine', easingDirection: 'Out', rotation: [0, 24, 18] },
        { id: 'kf_kh_st_hl3_4', time: 4.2, easingStyle: 'Linear', easingDirection: 'InOut', rotation: [0, 24, 18] },
      ],
    },
    {
      partId: 'kh_hip_r1',
      keyframes: [
        { id: 'kf_kh_st_hr1_0', time: 0, easingStyle: 'Quad', easingDirection: 'Out', rotation: [0, 24, -18] },
        { id: 'kf_kh_st_hr1_1', time: 0.32, easingStyle: 'Cubic', easingDirection: 'In', rotation: [0, 78, -62] },
        { id: 'kf_kh_st_hr1_2', time: 2.55, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 78, -62] },
        { id: 'kf_kh_st_hr1_3', time: 3.55, easingStyle: 'Sine', easingDirection: 'Out', rotation: [0, 24, -18] },
        { id: 'kf_kh_st_hr1_4', time: 4.2, easingStyle: 'Linear', easingDirection: 'InOut', rotation: [0, 24, -18] },
      ],
    },
    {
      partId: 'kh_hip_r2',
      keyframes: [
        { id: 'kf_kh_st_hr2_0', time: 0, easingStyle: 'Quad', easingDirection: 'Out', rotation: [0, 0, -18] },
        { id: 'kf_kh_st_hr2_1', time: 0.32, easingStyle: 'Cubic', easingDirection: 'In', rotation: [0, 68, -66] },
        { id: 'kf_kh_st_hr2_2', time: 2.55, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 68, -66] },
        { id: 'kf_kh_st_hr2_3', time: 3.55, easingStyle: 'Sine', easingDirection: 'Out', rotation: [0, 0, -18] },
        { id: 'kf_kh_st_hr2_4', time: 4.2, easingStyle: 'Linear', easingDirection: 'InOut', rotation: [0, 0, -18] },
      ],
    },
    {
      partId: 'kh_hip_r3',
      keyframes: [
        { id: 'kf_kh_st_hr3_0', time: 0, easingStyle: 'Quad', easingDirection: 'Out', rotation: [0, -24, -18] },
        { id: 'kf_kh_st_hr3_1', time: 0.32, easingStyle: 'Cubic', easingDirection: 'In', rotation: [0, 56, -68] },
        { id: 'kf_kh_st_hr3_2', time: 2.55, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 56, -68] },
        { id: 'kf_kh_st_hr3_3', time: 3.55, easingStyle: 'Sine', easingDirection: 'Out', rotation: [0, -24, -18] },
        { id: 'kf_kh_st_hr3_4', time: 4.2, easingStyle: 'Linear', easingDirection: 'InOut', rotation: [0, -24, -18] },
      ],
    },
    // Shins curl inward under the crab body so feet stay hidden inside cup
    {
      partId: 'kh_shin_l1',
      keyframes: [
        { id: 'kf_kh_st_sl1_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 0, -28] },
        { id: 'kf_kh_st_sl1_1', time: 0.32, easingStyle: 'Cubic', easingDirection: 'In', rotation: [0, 0, -108] },
        { id: 'kf_kh_st_sl1_2', time: 2.55, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 0, -108] },
        { id: 'kf_kh_st_sl1_3', time: 3.55, easingStyle: 'Sine', easingDirection: 'Out', rotation: [0, 0, -28] },
      ],
    },
    {
      partId: 'kh_shin_l2',
      keyframes: [
        { id: 'kf_kh_st_sl2_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 0, -28] },
        { id: 'kf_kh_st_sl2_1', time: 0.32, easingStyle: 'Cubic', easingDirection: 'In', rotation: [0, 0, -108] },
        { id: 'kf_kh_st_sl2_2', time: 2.55, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 0, -108] },
        { id: 'kf_kh_st_sl2_3', time: 3.55, easingStyle: 'Sine', easingDirection: 'Out', rotation: [0, 0, -28] },
      ],
    },
    {
      partId: 'kh_shin_l3',
      keyframes: [
        { id: 'kf_kh_st_sl3_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 0, -28] },
        { id: 'kf_kh_st_sl3_1', time: 0.32, easingStyle: 'Cubic', easingDirection: 'In', rotation: [0, 0, -108] },
        { id: 'kf_kh_st_sl3_2', time: 2.55, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 0, -108] },
        { id: 'kf_kh_st_sl3_3', time: 3.55, easingStyle: 'Sine', easingDirection: 'Out', rotation: [0, 0, -28] },
      ],
    },
    {
      partId: 'kh_shin_r1',
      keyframes: [
        { id: 'kf_kh_st_sr1_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 0, 28] },
        { id: 'kf_kh_st_sr1_1', time: 0.32, easingStyle: 'Cubic', easingDirection: 'In', rotation: [0, 0, 108] },
        { id: 'kf_kh_st_sr1_2', time: 2.55, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 0, 108] },
        { id: 'kf_kh_st_sr1_3', time: 3.55, easingStyle: 'Sine', easingDirection: 'Out', rotation: [0, 0, 28] },
      ],
    },
    {
      partId: 'kh_shin_r2',
      keyframes: [
        { id: 'kf_kh_st_sr2_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 0, 28] },
        { id: 'kf_kh_st_sr2_1', time: 0.32, easingStyle: 'Cubic', easingDirection: 'In', rotation: [0, 0, 108] },
        { id: 'kf_kh_st_sr2_2', time: 2.55, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 0, 108] },
        { id: 'kf_kh_st_sr2_3', time: 3.55, easingStyle: 'Sine', easingDirection: 'Out', rotation: [0, 0, 28] },
      ],
    },
    {
      partId: 'kh_shin_r3',
      keyframes: [
        { id: 'kf_kh_st_sr3_0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 0, 28] },
        { id: 'kf_kh_st_sr3_1', time: 0.32, easingStyle: 'Cubic', easingDirection: 'In', rotation: [0, 0, 108] },
        { id: 'kf_kh_st_sr3_2', time: 2.55, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 0, 108] },
        { id: 'kf_kh_st_sr3_3', time: 3.55, easingStyle: 'Sine', easingDirection: 'Out', rotation: [0, 0, 28] },
      ],
    },
  ],
};

// =============================================================================
// Luau Behaviour Scripts (Heavy Waddle + Turn Cup Inertia + Startled Retract)
// =============================================================================
const kelpHermitScripts: StudioScriptNode[] = [
  {
    id: 'kh_rem_startle',
    name: 'StartleEvent',
    className: 'RemoteEvent',
    service: 'ReplicatedStorage',
    parentFolder: 'Remotes',
    source: '',
    disabled: false,
    runContext: 'Legacy',
  },
  {
    id: 'kh_rem_turn',
    name: 'TurnDirectionEvent',
    className: 'RemoteEvent',
    service: 'ReplicatedStorage',
    parentFolder: 'Remotes',
    source: '',
    disabled: false,
    runContext: 'Legacy',
  },
  {
    id: 'kh_mod_config',
    name: 'KelpHermitConfig',
    className: 'ModuleScript',
    service: 'ReplicatedStorage',
    parentFolder: 'Modules',
    disabled: false,
    runContext: 'Legacy',
    source: `-- KelpHermitConfig (ModuleScript)
-- Locomotion weights, teacup mechanical inertia, and startled shell retreat timings
local KelpHermitConfig = {}

KelpHermitConfig.Stages = {
	Idle = "Idle",
	Waddle = "Waddle Walk",
	Turn = "Turn Wobble",
	Startle = "Startled Retract",
}

KelpHermitConfig.CupWeightLag = 0.32
KelpHermitConfig.TurnWobbleDuration = 2.2
KelpHermitConfig.StartledDuration = 4.2

return KelpHermitConfig
`,
  },
  {
    id: 'kh_srv_ai',
    name: 'KelpHermitServer',
    className: 'Script',
    service: 'ServerScriptService',
    disabled: false,
    runContext: 'Server',
    source: `-- KelpHermitServer (Script)
-- Coordinates heavy waddle locomotion, directional teacup wobble, and startled shell retreat
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Config = require(ReplicatedStorage:WaitForChild("Modules"):WaitForChild("KelpHermitConfig"))
local remotes = ReplicatedStorage:WaitForChild("Remotes")
local startleEvent = remotes:WaitForChild("StartleEvent")
local turnEvent = remotes:WaitForChild("TurnDirectionEvent")

local model = workspace:FindFirstChild("KelpHermit") or workspace:FindFirstChildWhichIsA("Model")
local isStartled = false

local function setStage(stageName: string)
	if model then
		model:SetAttribute("Stage", stageName)
	end
end

startleEvent.OnServerEvent:Connect(function(player)
	if isStartled then return end
	isStartled = true
	print("[KelpHermit] Startled! Crab snaps inside teacup and drops flat to ground.")
	setStage(Config.Stages.Startle)
	task.delay(Config.StartledDuration, function()
		isStartled = false
		print("[KelpHermit] Cautiously poking claws & eye stalks back out -> resuming Waddle Walk")
		setStage(Config.Stages.Waddle)
	end)
end)

turnEvent.OnServerEvent:Connect(function(player, dir)
	if isStartled then return end
	print("[KelpHermit] Changing direction (" .. tostring(dir or "Right") .. ") -> heavy teacup tilt & wobble")
	setStage(Config.Stages.Turn)
	task.delay(Config.TurnWobbleDuration, function()
		if not isStartled then
			setStage(Config.Stages.Waddle)
		end
	end)
end)

setStage(Config.Stages.Waddle)
print("[KelpHermitServer] Behaviour ready: [F] Startle | [E] Turn Wobble | [R] Waddle/Idle")
`,
  },
  {
    id: 'kh_cli_controls',
    name: 'KelpHermitControls',
    className: 'LocalScript',
    service: 'StarterPlayerScripts',
    disabled: false,
    runContext: 'Client',
    source: `-- KelpHermitControls (LocalScript)
-- Trigger Kelp Hermit behaviours with [F] Startle, [E] Direction Change Wobble, [R] Toggle Idle/Waddle
local UserInputService = game:GetService("UserInputService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local remotes = ReplicatedStorage:WaitForChild("Remotes")
local startleEvent = remotes:WaitForChild("StartleEvent")
local turnEvent = remotes:WaitForChild("TurnDirectionEvent")
local model = workspace:FindFirstChild("KelpHermit") or workspace:FindFirstChildWhichIsA("Model")

UserInputService.InputBegan:Connect(function(input, gameProcessed)
	if gameProcessed then return end
	if input.KeyCode == Enum.KeyCode.F then
		startleEvent:FireServer()
	elseif input.KeyCode == Enum.KeyCode.E then
		turnEvent:FireServer("SharpTurn")
	elseif input.KeyCode == Enum.KeyCode.R and model then
		local cur = model:GetAttribute("Stage")
		local nextStage = if cur == "Idle" then "Waddle Walk" else "Idle"
		model:SetAttribute("Stage", nextStage)
		print("[Client] Toggled Kelp Hermit stage ->", nextStage)
	end
end)

print("[KelpHermitControls] Keys bound: [F] Startle, [E] Turn Wobble, [R] Idle/Waddle")
`,
  },
  {
    id: 'kh_ws_behavior',
    name: 'KelpHermitBehavior',
    className: 'Script',
    service: 'WorkspaceModel',
    parentFolder: 'Scripts',
    disabled: false,
    runContext: 'Legacy',
    source: `-- KelpHermitBehavior (Workspace Script)
-- Plays active animation stage and applies mechanical teacup inertia wobble on Heartbeat
local RunService = game:GetService("RunService")

local model = workspace:FindFirstChild("KelpHermit") or workspace:FindFirstChildWhichIsA("Model")
local animator = if model then model:FindFirstChild("Animator", true) else nil
local cupJoint = if model then model:FindFirstChild("Joint_TeacupShell", true) else nil

local activeTrack = nil
local currentStage = "Waddle Walk"
local wobbleTime = 0

local function playStage(stageName: string)
	currentStage = stageName
	if activeTrack and activeTrack.IsPlaying then
		activeTrack:Stop(0.15)
	end
	if animator then
		local track = animator:LoadAnimation(stageName)
		if track then
			track:Play(0.15)
			activeTrack = track
		end
	end
end

if model then
	model:GetAttributeChangedSignal("Stage"):Connect(function()
		local nextStage = model:GetAttribute("Stage")
		if typeof(nextStage) == "string" and nextStage ~= "" then
			playStage(nextStage)
		end
	end)
end

RunService.Heartbeat:Connect(function(dt)
	wobbleTime += dt
	if cupJoint then
		if currentStage == "Turn Wobble" then
			cupJoint.Transform = CFrame.Angles(math.sin(wobbleTime * 6.5) * 0.04, math.sin(wobbleTime * 3.2) * 0.05, math.cos(wobbleTime * 5.8) * 0.08)
		elseif currentStage == "Waddle Walk" then
			cupJoint.Transform = CFrame.Angles(math.sin(wobbleTime * 4.0) * 0.025, 0, math.cos(wobbleTime * 4.0) * 0.04)
		elseif currentStage == "Startled Retract" then
			cupJoint.Transform = CFrame.Angles(0, 0, math.sin(wobbleTime * 3.5) * 0.02)
		else
			cupJoint.Transform = CFrame.Angles(0, 0, 0)
		end
	end
end)

playStage("Waddle Walk")
`,
  },
];

export const kelpHermitPreset: ModelPreset = {
  id: 'kelp-hermit',
  label: 'Kelp Hermit',
  description:
    'Rigged coral hermit crab inside an antique cobalt-patterned porcelain teacup draped with olive kelp, featuring Waddle Walk, Turn Wobble, Startled Retract (snap inside + flat ground rock + cautious peek), Idle, and interactive Luau behaviour scripts.',
  model: {
    name: 'KelpHermit',
    primaryPartId: 'kh_body',
    parts: kelpHermitParts,
    animations: [
      kelpHermitIdleClip,
      kelpHermitWaddleClip,
      kelpHermitTurnWobbleClip,
      kelpHermitStartleClip,
    ],
    scripts: kelpHermitScripts,
  },
};
