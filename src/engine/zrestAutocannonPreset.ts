import { AnimationClip, PartShape, StudioPartNode } from './robloxTypes';
import type { ModelPreset } from './presets';

function turretPart(
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

// Zrest Autocannon Palette (matched to model sheet under studio lighting)
const ARMOR_MAIN = '#565D43';
const ARMOR_LIGHT = '#666E51';
const ARMOR_TRIM = '#767F5E';
const ARMOR_DARK = '#3E4431';
const TAN_PACK = '#7A724F';
const TAN_STRAP = '#2E3128';

const METAL_LIGHT = '#626870';
const METAL_MAIN = '#4B5057';
const METAL_DARK = '#33383E';
const METAL_DEEP = '#1E2125';

const AMMO_BRASS = '#B8793B';
const OPTIC_CYAN = '#4DA2CA';
const OPTIC_GLOW = '#72C4EB';
const LED_ORANGE = '#E06A22';

// Helper to build perimeter bolts around the circular steel base plate
function buildBaseRimBolts(): StudioPartNode[] {
  const bolts: StudioPartNode[] = [];
  const count = 12;
  const radius = 2.08;
  for (let i = 0; i < count; i++) {
    const angleDeg = (i * 360) / count;
    const rad = (angleDeg * Math.PI) / 180;
    bolts.push(
      turretPart(
        `za_bolt_${i}`,
        `BaseBolt_${i + 1}`,
        'Block',
        [Math.sin(rad) * radius, 0.22, Math.cos(rad) * radius],
        [0.15, 0.08, 0.15],
        METAL_DARK,
        'Metal',
        {
          parentId: 'za_base',
          rotation: [0, angleDeg, 0],
        }
      )
    );
  }
  return bolts;
}

// Helper to build one articulated recoiling autocannon barrel assembly
function buildBarrelAssembly(
  suffix: 'UL' | 'UR' | 'LL' | 'LR',
  x: number,
  y: number,
  z: number
): StudioPartNode[] {
  const rootId = `za_barrel_${suffix.toLowerCase()}`;
  return [
    // Recoil slide root (animated along local Z)
    turretPart(rootId, `BarrelRecoil_${suffix}`, 'Cylinder', [x, y, z], [0.24, 0.28, 0.24], METAL_MAIN, 'Metal', {
      parentId: 'za_gun_pitch',
      rotation: [90, 0, 0],
      pivotOffset: [0, 0, 0],
    }),
    // Inner cooling jacket sleeve core
    turretPart(
      `za_sleeve_${suffix.toLowerCase()}`,
      `BarrelJacketCore_${suffix}`,
      'Cylinder',
      [0, 0.34, 0],
      [0.17, 0.44, 0.17],
      METAL_LIGHT,
      'Metal',
      { parentId: rootId }
    ),
    // 3 Ribbed recoil/cooling rings
    turretPart(
      `za_ring1_${suffix.toLowerCase()}`,
      `BarrelRing1_${suffix}`,
      'Cylinder',
      [0, 0.22, 0],
      [0.23, 0.07, 0.23],
      METAL_DEEP,
      'Metal',
      { parentId: rootId }
    ),
    turretPart(
      `za_ring2_${suffix.toLowerCase()}`,
      `BarrelRing2_${suffix}`,
      'Cylinder',
      [0, 0.35, 0],
      [0.23, 0.07, 0.23],
      METAL_DEEP,
      'Metal',
      { parentId: rootId }
    ),
    turretPart(
      `za_ring3_${suffix.toLowerCase()}`,
      `BarrelRing3_${suffix}`,
      'Cylinder',
      [0, 0.48, 0],
      [0.23, 0.07, 0.23],
      METAL_DEEP,
      'Metal',
      { parentId: rootId }
    ),
    // Forward long autocannon barrel tube
    turretPart(
      `za_tube_${suffix.toLowerCase()}`,
      `BarrelTube_${suffix}`,
      'Cylinder',
      [0, 1.12, 0],
      [0.125, 1.38, 0.125],
      METAL_LIGHT,
      'Metal',
      { parentId: rootId }
    ),
    // Stepped muzzle brake collar & slotted rectangular brake housing
    turretPart(
      `za_muzzle_${suffix.toLowerCase()}`,
      `MuzzleBrake_${suffix}`,
      'Block',
      [0, 1.94, 0],
      [0.18, 0.36, 0.18],
      METAL_MAIN,
      'Metal',
      { parentId: rootId }
    ),
    // Muzzle brake vent port & dark bore tip
    turretPart(
      `za_muzzle_vent_${suffix.toLowerCase()}`,
      `MuzzleVents_${suffix}`,
      'Block',
      [0, 1.94, 0],
      [0.2, 0.16, 0.09],
      METAL_DEEP,
      'Metal',
      { parentId: rootId }
    ),
    turretPart(
      `za_muzzle_bore_${suffix.toLowerCase()}`,
      `MuzzleBore_${suffix}`,
      'Block',
      [0, 2.13, 0],
      [0.09, 0.03, 0.09],
      METAL_DEEP,
      'Metal',
      { parentId: rootId }
    ),
  ];
}

const zrestAutocannonParts: StudioPartNode[] = [
  // ===========================================================================
  // 1. Heavy Circular Turntable Plinth (BasePlinth, PrimaryPart, bottom y = 0)
  // ===========================================================================
  turretPart('za_base', 'BasePlinth', 'Cylinder', [0, 0.14, 0], [4.6, 0.28, 4.6], METAL_MAIN, 'Metal', {
    anchored: true,
  }),
  turretPart('za_base_step', 'BaseTurntableStep', 'Cylinder', [0, 0.14, 0], [3.95, 0.12, 3.95], METAL_LIGHT, 'Metal', {
    parentId: 'za_base',
  }),
  turretPart('za_base_collar', 'TurntableCollar', 'Cylinder', [0, 0.31, 0], [3.15, 0.24, 3.15], METAL_DEEP, 'Metal', {
    parentId: 'za_base',
  }),
  ...buildBaseRimBolts(),

  // ===========================================================================
  // 2. Yaw Swivel Ring & Armored U-Shaped Twin-Sponson Hull
  // ===========================================================================
  turretPart('za_yaw', 'TurretYawRing', 'Cylinder', [0, 0.48, 0], [3.42, 0.18, 3.42], METAL_DARK, 'Metal', {
    parentId: 'za_base',
  }),
  // Central hull spine/yoke floor connecting left & right sponsons
  turretPart('za_hull', 'TurretChassis', 'Block', [0, 0.78, -0.44], [2.42, 1.12, 2.02], ARMOR_MAIN, 'Plastic', {
    parentId: 'za_yaw',
  }),
  // Central Gun Bay Lower Cradle & Sloped Front Chin Apron
  turretPart('za_chin_core', 'CenterBayFloor', 'Block', [0, -0.26, 1.24], [1.26, 0.62, 1.22], METAL_MAIN, 'Metal', {
    parentId: 'za_hull',
  }),
  turretPart('za_chin_slope', 'CenterBayApron', 'Wedge', [0, -0.26, 2.0], [1.26, 0.62, 0.32], METAL_DARK, 'Metal', {
    parentId: 'za_hull',
    rotation: [0, 180, 0],
  }),
  turretPart('za_chin_rib_l', 'CenterBayRib_L', 'Block', [0.54, -0.02, 1.38], [0.16, 0.88, 0.92], METAL_LIGHT, 'Metal', {
    parentId: 'za_hull',
  }),
  turretPart('za_chin_rib_r', 'CenterBayRib_R', 'Block', [-0.54, -0.02, 1.38], [0.16, 0.88, 0.92], METAL_LIGHT, 'Metal', {
    parentId: 'za_hull',
  }),

  // Top Deck Armor Plate & Circular Hatch
  turretPart('za_roof_deck', 'RoofTopDeck', 'Block', [0, 0.98, -0.34], [1.96, 0.24, 1.56], ARMOR_LIGHT, 'Plastic', {
    parentId: 'za_hull',
  }),
  turretPart('za_roof_hatch', 'RoofCircularHatch', 'Cylinder', [0, 1.12, -0.52], [0.54, 0.08, 0.54], ARMOR_TRIM, 'Plastic', {
    parentId: 'za_hull',
  }),
  turretPart('za_roof_bar_l', 'RoofRackBar_L', 'Block', [0.56, 1.14, -0.32], [0.18, 0.12, 0.86], ARMOR_DARK, 'Plastic', {
    parentId: 'za_hull',
  }),
  turretPart('za_roof_bar_r', 'RoofRackBar_R', 'Block', [-0.56, 1.14, -0.32], [0.18, 0.12, 0.86], ARMOR_DARK, 'Plastic', {
    parentId: 'za_hull',
  }),

  // Left Armored Sponson (+X, viewer's right in Front view)
  turretPart('za_sponson_low_l', 'SponsonLower_L', 'Block', [1.08, -0.24, 0.5], [0.92, 0.68, 2.66], ARMOR_MAIN, 'Plastic', {
    parentId: 'za_hull',
  }),
  turretPart('za_sponson_up_l', 'SponsonUpper_L', 'Block', [1.08, 0.6, -0.34], [0.92, 1.0, 1.26], ARMOR_LIGHT, 'Plastic', {
    parentId: 'za_hull',
  }),
  turretPart('za_sponson_slope_l', 'SponsonCheekSlope_L', 'Wedge', [1.08, 0.6, 1.06], [0.92, 1.0, 1.54], ARMOR_LIGHT, 'Plastic', {
    parentId: 'za_hull',
    rotation: [0, 180, 0],
  }),
  turretPart('za_sponson_rim_l', 'SponsonTopTrim_L', 'Block', [1.08, 1.13, -0.34], [0.8, 0.08, 1.16], ARMOR_TRIM, 'Plastic', {
    parentId: 'za_hull',
  }),
  turretPart('za_sponson_bay_l', 'SponsonInnerWall_L', 'Block', [0.64, 0.44, 0.72], [0.12, 0.94, 1.88], ARMOR_DARK, 'Plastic', {
    parentId: 'za_hull',
  }),

  // Right Armored Sponson (-X, viewer's left in Front view / main 3/4 view)
  turretPart('za_sponson_low_r', 'SponsonLower_R', 'Block', [-1.08, -0.24, 0.5], [0.92, 0.68, 2.66], ARMOR_MAIN, 'Plastic', {
    parentId: 'za_hull',
  }),
  turretPart('za_sponson_up_r', 'SponsonUpper_R', 'Block', [-1.08, 0.6, -0.34], [0.92, 1.0, 1.26], ARMOR_LIGHT, 'Plastic', {
    parentId: 'za_hull',
  }),
  turretPart('za_sponson_slope_r', 'SponsonCheekSlope_R', 'Wedge', [-1.08, 0.6, 1.06], [0.92, 1.0, 1.54], ARMOR_LIGHT, 'Plastic', {
    parentId: 'za_hull',
    rotation: [0, 180, 0],
  }),
  turretPart('za_sponson_rim_r', 'SponsonTopTrim_R', 'Block', [-1.08, 1.13, -0.34], [0.8, 0.08, 1.16], ARMOR_TRIM, 'Plastic', {
    parentId: 'za_hull',
  }),
  turretPart('za_sponson_bay_r', 'SponsonInnerWall_R', 'Block', [-0.64, 0.44, 0.72], [0.12, 0.94, 1.88], ARMOR_DARK, 'Plastic', {
    parentId: 'za_hull',
  }),

  // ===========================================================================
  // 3. Asymmetric Front Cheek Sensor Pod (-X) & Side Flank Packs / Ammo Belt
  // ===========================================================================
  // Cheek Sensor Pod on -X sloped armor face
  turretPart('za_cheek_pod', 'CheekSensorPod', 'Block', [-1.08, 0.58, 1.14], [0.46, 0.56, 0.54], ARMOR_LIGHT, 'Plastic', {
    parentId: 'za_hull',
  }),
  turretPart('za_cheek_hood', 'CheekSensorHood', 'Wedge', [-1.08, 0.94, 1.04], [0.46, 0.16, 0.42], ARMOR_TRIM, 'Plastic', {
    parentId: 'za_hull',
    rotation: [0, 180, 0],
  }),
  turretPart('za_cheek_bezel', 'CheekSensorBezel', 'Block', [-1.08, 0.58, 1.42], [0.34, 0.44, 0.06], METAL_DEEP, 'Metal', {
    parentId: 'za_hull',
  }),
  turretPart('za_cheek_lens', 'CheekSensorLens', 'Cylinder', [-1.13, 0.66, 1.46], [0.16, 0.06, 0.16], OPTIC_CYAN, 'Glass', {
    parentId: 'za_hull',
    rotation: [90, 0, 0],
  }),
  turretPart('za_cheek_led', 'CheekSensorLED', 'Block', [-1.0, 0.48, 1.46], [0.07, 0.07, 0.05], LED_ORANGE, 'SmoothPlastic', {
    parentId: 'za_hull',
  }),
  turretPart('za_cheek_aux', 'CheekSensorAux', 'Block', [-1.14, 0.48, 1.46], [0.08, 0.08, 0.05], METAL_LIGHT, 'Metal', {
    parentId: 'za_hull',
  }),

  // -X Flank: Side Louver Housing, Strapped Khaki Ammo Pack, Brass Ammo Belt & Lower Crate
  turretPart('za_flank_vent_r', 'FlankRadiator_R', 'Block', [-1.64, 0.54, -0.34], [0.3, 0.78, 0.76], ARMOR_DARK, 'Plastic', {
    parentId: 'za_hull',
  }),
  turretPart('za_flank_slats_r', 'FlankVentSlats_R', 'Block', [-1.8, 0.62, -0.34], [0.06, 0.48, 0.56], METAL_DEEP, 'Metal', {
    parentId: 'za_hull',
  }),
  turretPart('za_pack_r', 'SideAmmoPack_R', 'Block', [-1.7, 0.5, 0.18], [0.38, 0.78, 0.58], TAN_PACK, 'Plastic', {
    parentId: 'za_hull',
  }),
  turretPart('za_pack_strap1', 'PackStrap_Front', 'Block', [-1.72, 0.5, 0.34], [0.4, 0.82, 0.1], TAN_STRAP, 'Plastic', {
    parentId: 'za_hull',
  }),
  turretPart('za_pack_strap2', 'PackStrap_Rear', 'Block', [-1.72, 0.5, 0.04], [0.4, 0.82, 0.1], TAN_STRAP, 'Plastic', {
    parentId: 'za_hull',
  }),
  // Exposed curved brass shell belt feeding from pack down into lower ammo crate
  turretPart('za_belt_1', 'AmmoBeltShell_1', 'Block', [-1.66, 0.08, 0.36], [0.16, 0.12, 0.16], AMMO_BRASS, 'Metal', {
    parentId: 'za_hull',
    rotation: [22, 0, -10],
  }),
  turretPart('za_belt_2', 'AmmoBeltShell_2', 'Block', [-1.68, -0.02, 0.48], [0.16, 0.12, 0.16], METAL_DEEP, 'Metal', {
    parentId: 'za_hull',
    rotation: [32, 0, -8],
  }),
  turretPart('za_belt_3', 'AmmoBeltShell_3', 'Block', [-1.68, -0.1, 0.62], [0.16, 0.12, 0.16], AMMO_BRASS, 'Metal', {
    parentId: 'za_hull',
    rotation: [44, 0, 0],
  }),
  turretPart('za_belt_4', 'AmmoBeltShell_4', 'Block', [-1.66, -0.16, 0.76], [0.16, 0.12, 0.16], AMMO_BRASS, 'Metal', {
    parentId: 'za_hull',
    rotation: [58, 0, 0],
  }),
  // Lower latched rectangular ammo feed box on -X
  turretPart('za_lower_box_r', 'LowerAmmoCrate_R', 'Block', [-1.66, -0.26, 1.06], [0.34, 0.56, 0.86], ARMOR_MAIN, 'Plastic', {
    parentId: 'za_hull',
  }),
  turretPart('za_lower_rib_r', 'LowerCrateLatch_R', 'Block', [-1.84, -0.24, 1.06], [0.06, 0.1, 0.62], ARMOR_TRIM, 'Plastic', {
    parentId: 'za_hull',
    rotation: [18, 0, 0],
  }),

  // +X Flank: Side Armor Housing & Compact Lower Access Hatch
  turretPart('za_flank_vent_l', 'FlankArmorPod_L', 'Block', [1.62, 0.46, -0.18], [0.24, 0.74, 0.94], ARMOR_DARK, 'Plastic', {
    parentId: 'za_hull',
  }),
  turretPart('za_flank_slats_l', 'FlankVentSlats_L', 'Block', [1.75, 0.46, -0.18], [0.06, 0.44, 0.64], METAL_DEEP, 'Metal', {
    parentId: 'za_hull',
  }),
  turretPart('za_lower_box_l', 'LowerSideHatch_L', 'Block', [1.59, -0.24, 0.86], [0.18, 0.48, 0.76], ARMOR_LIGHT, 'Plastic', {
    parentId: 'za_hull',
  }),
  turretPart('za_lower_trim_l', 'LowerSideHatchTrim_L', 'Block', [1.69, -0.24, 0.86], [0.04, 0.34, 0.56], ARMOR_DARK, 'Plastic', {
    parentId: 'za_hull',
  }),

  // ===========================================================================
  // 4. Stepped Rear Bustle Housing, Radiator Louvers & Looped Hydraulic Cables
  // ===========================================================================
  turretPart('za_bustle_core', 'RearBustleCore', 'Block', [0, 0.34, -1.66], [2.44, 1.24, 0.84], ARMOR_DARK, 'Plastic', {
    parentId: 'za_hull',
  }),
  turretPart('za_bustle_back', 'RearBustlePlate', 'Block', [0, 0.34, -2.14], [2.04, 0.96, 0.24], ARMOR_MAIN, 'Plastic', {
    parentId: 'za_hull',
  }),
  turretPart('za_bustle_top_slope', 'RearBustleTopBevel', 'Wedge', [0, 1.04, -1.66], [2.04, 0.24, 0.68], ARMOR_LIGHT, 'Plastic', {
    parentId: 'za_hull',
  }),
  turretPart('za_bustle_bot_slope', 'RearBustleBotBevel', 'Wedge', [0, -0.36, -1.66], [2.04, 0.24, 0.68], ARMOR_DARK, 'Plastic', {
    parentId: 'za_hull',
    rotation: [180, 180, 0],
  }),
  // Twin vertical rear louver radiator packs (Back view)
  turretPart('za_rear_pack_l', 'RearVentPack_L', 'Block', [0.68, 0.44, -2.28], [0.54, 1.04, 0.18], METAL_DARK, 'Metal', {
    parentId: 'za_hull',
  }),
  turretPart('za_rear_grille_l', 'RearVentGrille_L', 'Block', [0.68, 0.44, -2.38], [0.38, 0.76, 0.05], METAL_DEEP, 'Metal', {
    parentId: 'za_hull',
  }),
  turretPart('za_rear_pack_r', 'RearVentPack_R', 'Block', [-0.68, 0.44, -2.28], [0.54, 1.04, 0.18], METAL_DARK, 'Metal', {
    parentId: 'za_hull',
  }),
  turretPart('za_rear_grille_r', 'RearVentGrille_R', 'Block', [-0.68, 0.44, -2.38], [0.38, 0.76, 0.05], METAL_DEEP, 'Metal', {
    parentId: 'za_hull',
  }),
  // Side rear cooling pods with stepped louvers (Side & Back views)
  turretPart('za_rear_pod_l', 'RearCoolingPod_L', 'Block', [1.4, 0.44, -1.64], [0.36, 0.92, 0.92], ARMOR_DARK, 'Plastic', {
    parentId: 'za_hull',
  }),
  turretPart('za_rear_pod_slats_l1', 'RearPodSlatTop_L', 'Block', [1.59, 0.58, -1.64], [0.06, 0.08, 0.6], METAL_DEEP, 'Metal', {
    parentId: 'za_hull',
  }),
  turretPart('za_rear_pod_slats_l2', 'RearPodSlatMid_L', 'Block', [1.59, 0.44, -1.64], [0.06, 0.08, 0.6], METAL_DEEP, 'Metal', {
    parentId: 'za_hull',
  }),
  turretPart('za_rear_pod_slats_l3', 'RearPodSlatBot_L', 'Block', [1.59, 0.3, -1.64], [0.06, 0.08, 0.6], METAL_DEEP, 'Metal', {
    parentId: 'za_hull',
  }),
  turretPart('za_rear_pod_r', 'RearCoolingPod_R', 'Block', [-1.4, 0.44, -1.64], [0.36, 0.92, 0.92], ARMOR_DARK, 'Plastic', {
    parentId: 'za_hull',
  }),
  turretPart('za_rear_pod_slats_r1', 'RearPodSlatTop_R', 'Block', [-1.59, 0.58, -1.64], [0.06, 0.08, 0.6], METAL_DEEP, 'Metal', {
    parentId: 'za_hull',
  }),
  turretPart('za_rear_pod_slats_r2', 'RearPodSlatMid_R', 'Block', [-1.59, 0.44, -1.64], [0.06, 0.08, 0.6], METAL_DEEP, 'Metal', {
    parentId: 'za_hull',
  }),
  turretPart('za_rear_pod_slats_r3', 'RearPodSlatBot_R', 'Block', [-1.59, 0.3, -1.64], [0.06, 0.08, 0.6], METAL_DEEP, 'Metal', {
    parentId: 'za_hull',
  }),
  // Twin looped rear power cables hanging underneath bustle
  turretPart('za_cable_l', 'RearPowerCable_L', 'PipeElbow', [0.76, -0.34, -1.84], [0.46, 0.42, 0.12], METAL_DEEP, 'Metal', {
    parentId: 'za_hull',
    rotation: [0, 90, 180],
  }),
  turretPart('za_cable_r', 'RearPowerCable_R', 'PipeElbow', [-0.76, -0.34, -1.84], [0.46, 0.42, 0.12], METAL_DEEP, 'Metal', {
    parentId: 'za_hull',
    rotation: [0, 90, 180],
  }),

  // ===========================================================================
  // 5. Twin Independent Roof Optic Sensors (children use local offsets!)
  // ===========================================================================
  // -X Roof Optic: Wide hooded optical display pod
  turretPart('za_optic_r', 'RoofOptic_R', 'Block', [-0.88, 1.32, 0.02], [0.54, 0.38, 0.6], ARMOR_MAIN, 'Plastic', {
    parentId: 'za_hull',
    pivotOffset: [0, -0.18, 0],
  }),
  turretPart('za_optic_r_screen', 'RoofOpticScreen_R', 'Block', [0, 0, 0.31], [0.38, 0.24, 0.06], METAL_DEEP, 'Metal', {
    parentId: 'za_optic_r',
  }),
  turretPart('za_optic_r_glass', 'RoofOpticGlass_R', 'Block', [0, 0, 0.345], [0.3, 0.18, 0.03], OPTIC_CYAN, 'Glass', {
    parentId: 'za_optic_r',
  }),

  // +X Roof Optic: Compact square gimbal camera pod with circular cyan lens
  turretPart('za_optic_l', 'RoofOptic_L', 'Block', [0.88, 1.32, -0.3], [0.42, 0.38, 0.5], ARMOR_MAIN, 'Plastic', {
    parentId: 'za_hull',
    pivotOffset: [0, -0.18, 0],
  }),
  turretPart('za_optic_l_bezel', 'RoofOpticBezel_L', 'Block', [0, 0, 0.26], [0.32, 0.28, 0.06], METAL_DEEP, 'Metal', {
    parentId: 'za_optic_l',
  }),
  turretPart('za_optic_l_lens', 'RoofOpticLens_L', 'Cylinder', [0, 0, 0.3], [0.22, 0.06, 0.22], OPTIC_GLOW, 'Glass', {
    parentId: 'za_optic_l',
    rotation: [90, 0, 0],
  }),

  // ===========================================================================
  // 6. Elevating Quad Autocannon Pod (GunPodPitchPivot + Coaxial Sight + 4 Barrels)
  // ===========================================================================
  turretPart('za_gun_pitch', 'GunPodPitchPivot', 'Block', [0, 0.44, 0.72], [0.98, 0.92, 1.24], ARMOR_MAIN, 'Plastic', {
    parentId: 'za_hull',
    pivotOffset: [0, 0, -0.16],
  }),
  turretPart('za_mantlet_cap', 'GunMantletCap', 'Block', [0, 0.51, -0.06], [0.82, 0.14, 0.98], ARMOR_LIGHT, 'Plastic', {
    parentId: 'za_gun_pitch',
  }),
  turretPart('za_mantlet_front', 'GunMantletPlate', 'Block', [0, 0, 0.64], [0.9, 0.84, 0.1], ARMOR_DARK, 'Plastic', {
    parentId: 'za_gun_pitch',
  }),
  // Large Circular Side Trunnion Drums
  turretPart('za_trunnion_l', 'TrunnionDrum_L', 'Cylinder', [0.58, 0, -0.16], [0.84, 0.22, 0.84], METAL_MAIN, 'Metal', {
    parentId: 'za_gun_pitch',
    rotation: [0, 0, 90],
  }),
  turretPart('za_trunnion_hub_l', 'TrunnionHub_L', 'Cylinder', [0.7, 0, -0.16], [0.46, 0.08, 0.46], METAL_DEEP, 'Metal', {
    parentId: 'za_gun_pitch',
    rotation: [0, 0, 90],
  }),
  turretPart('za_trunnion_r', 'TrunnionDrum_R', 'Cylinder', [-0.58, 0, -0.16], [0.84, 0.22, 0.84], METAL_MAIN, 'Metal', {
    parentId: 'za_gun_pitch',
    rotation: [0, 0, 90],
  }),
  turretPart('za_trunnion_hub_r', 'TrunnionHub_R', 'Cylinder', [-0.7, 0, -0.16], [0.46, 0.08, 0.46], METAL_DEEP, 'Metal', {
    parentId: 'za_gun_pitch',
    rotation: [0, 0, 90],
  }),
  // Feed chutes flanking the trunnions (from top-center detail callouts)
  turretPart('za_feed_l', 'GunFeedChute_L', 'Block', [0.58, -0.34, -0.12], [0.16, 0.34, 0.22], AMMO_BRASS, 'Metal', {
    parentId: 'za_gun_pitch',
    rotation: [12, 0, 0],
  }),
  turretPart('za_feed_r', 'GunFeedChute_R', 'Block', [-0.58, -0.34, -0.12], [0.16, 0.34, 0.22], AMMO_BRASS, 'Metal', {
    parentId: 'za_gun_pitch',
    rotation: [12, 0, 0],
  }),

  // Top-Mounted Coaxial Rangefinder / Auxiliary Optic Tube
  turretPart('za_coax_tube', 'CoaxialOpticTube', 'Cylinder', [0, 0.72, 0.28], [0.24, 1.32, 0.24], METAL_MAIN, 'Metal', {
    parentId: 'za_gun_pitch',
    rotation: [90, 0, 0],
  }),
  turretPart('za_coax_collar', 'CoaxialOpticCollar', 'Block', [0, 0.72, 0.1], [0.3, 0.3, 0.46], ARMOR_DARK, 'Plastic', {
    parentId: 'za_gun_pitch',
  }),
  turretPart('za_coax_lens', 'CoaxialOpticLens', 'Cylinder', [0, 0.72, 0.96], [0.16, 0.05, 0.16], OPTIC_CYAN, 'Glass', {
    parentId: 'za_gun_pitch',
    rotation: [90, 0, 0],
  }),

  // 4 Independent Recoiling 2x2 Quad Autocannon Barrels
  ...buildBarrelAssembly('UL', 0.23, 0.21, 0.78),
  ...buildBarrelAssembly('UR', -0.23, 0.21, 0.78),
  ...buildBarrelAssembly('LL', 0.23, -0.19, 0.78),
  ...buildBarrelAssembly('LR', -0.23, -0.19, 0.78),
];

// =============================================================================
// Stage 1: Idle — Subtle perimeter optic scan & gentle gun readiness poise
// =============================================================================
const zrestIdleClip: AnimationClip = {
  id: 'clip_zrest_idle',
  name: 'Idle',
  duration: 3.6,
  fps: 30,
  loop: true,
  priority: 'Idle',
  sampleMode: 'keyframes',
  fadeTime: 0.25,
  defaultWeight: 1,
  markers: [],
  tracks: [
    {
      partId: 'za_yaw',
      keyframes: [
        { id: 'kf_za_id_y0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 0, 0] },
        { id: 'kf_za_id_y1', time: 1.8, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 6, 0] },
        { id: 'kf_za_id_y2', time: 3.6, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 0, 0] },
      ],
    },
    {
      partId: 'za_gun_pitch',
      keyframes: [
        { id: 'kf_za_id_p0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 0, 0] },
        { id: 'kf_za_id_p1', time: 1.8, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [-3, 0, 0] },
        { id: 'kf_za_id_p2', time: 3.6, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 0, 0] },
      ],
    },
    {
      partId: 'za_optic_r',
      keyframes: [
        { id: 'kf_za_id_or0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 0, 0] },
        { id: 'kf_za_id_or1', time: 1.2, easingStyle: 'Quad', easingDirection: 'Out', rotation: [-4, -18, 0] },
        { id: 'kf_za_id_or2', time: 2.5, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [2, 14, 0] },
        { id: 'kf_za_id_or3', time: 3.6, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 0, 0] },
      ],
    },
    {
      partId: 'za_optic_l',
      keyframes: [
        { id: 'kf_za_id_ol0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 0, 0] },
        { id: 'kf_za_id_ol1', time: 1.2, easingStyle: 'Quad', easingDirection: 'Out', rotation: [3, 20, 0] },
        { id: 'kf_za_id_ol2', time: 2.5, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [-5, -16, 0] },
        { id: 'kf_za_id_ol3', time: 3.6, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 0, 0] },
      ],
    },
  ],
};

// =============================================================================
// Stage 2: Sentry Scan — Wide yaw patrol sweep & elevation tracking
// =============================================================================
const zrestSentryScanClip: AnimationClip = {
  id: 'clip_zrest_scan',
  name: 'Sentry Scan',
  duration: 4.0,
  fps: 30,
  loop: true,
  priority: 'Movement',
  sampleMode: 'resampled',
  fadeTime: 0.2,
  defaultWeight: 1,
  markers: [],
  tracks: [
    {
      partId: 'za_yaw',
      keyframes: [
        { id: 'kf_za_sc_y0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 0, 0] },
        { id: 'kf_za_sc_y1', time: 1.0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 42, 0] },
        { id: 'kf_za_sc_y2', time: 2.0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 0, 0] },
        { id: 'kf_za_sc_y3', time: 3.0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, -42, 0] },
        { id: 'kf_za_sc_y4', time: 4.0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 0, 0] },
      ],
    },
    {
      partId: 'za_gun_pitch',
      keyframes: [
        { id: 'kf_za_sc_p0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 0, 0] },
        { id: 'kf_za_sc_p1', time: 1.0, easingStyle: 'Quad', easingDirection: 'Out', rotation: [-10, 0, 0] },
        { id: 'kf_za_sc_p2', time: 2.0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [4, 0, 0] },
        { id: 'kf_za_sc_p3', time: 3.0, easingStyle: 'Quad', easingDirection: 'Out', rotation: [-8, 0, 0] },
        { id: 'kf_za_sc_p4', time: 4.0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 0, 0] },
      ],
    },
    {
      partId: 'za_optic_r',
      keyframes: [
        { id: 'kf_za_sc_or0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 0, 0] },
        { id: 'kf_za_sc_or1', time: 0.85, easingStyle: 'Quad', easingDirection: 'Out', rotation: [-6, 22, 0] },
        { id: 'kf_za_sc_or2', time: 2.85, easingStyle: 'Quad', easingDirection: 'Out', rotation: [-6, -24, 0] },
        { id: 'kf_za_sc_or3', time: 4.0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 0, 0] },
      ],
    },
    {
      partId: 'za_optic_l',
      keyframes: [
        { id: 'kf_za_sc_ol0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 0, 0] },
        { id: 'kf_za_sc_ol1', time: 1.0, easingStyle: 'Quad', easingDirection: 'Out', rotation: [-8, 16, 0] },
        { id: 'kf_za_sc_ol2', time: 3.0, easingStyle: 'Quad', easingDirection: 'Out', rotation: [-8, -18, 0] },
        { id: 'kf_za_sc_ol3', time: 4.0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 0, 0] },
      ],
    },
  ],
};

// Helper to create 2 rapid staggered recoil kickbacks per 1.6s burst cycle for one barrel
function makeBarrelRecoilTrack(
  partId: string,
  x: number,
  y: number,
  zRest: number,
  t1: number,
  t2: number
) {
  const zBack = zRest - 0.36;
  return {
    partId,
    keyframes: [
      { id: `kf_${partId}_0`, time: 0, easingStyle: 'Linear' as const, easingDirection: 'Out' as const, position: [x, y, zRest] as [number, number, number] },
      { id: `kf_${partId}_1`, time: t1, easingStyle: 'Quad' as const, easingDirection: 'Out' as const, position: [x, y, zRest] as [number, number, number] },
      { id: `kf_${partId}_2`, time: t1 + 0.05, easingStyle: 'Cubic' as const, easingDirection: 'Out' as const, position: [x, y, zBack] as [number, number, number] },
      { id: `kf_${partId}_3`, time: t1 + 0.24, easingStyle: 'Quad' as const, easingDirection: 'InOut' as const, position: [x, y, zRest] as [number, number, number] },
      { id: `kf_${partId}_4`, time: t2, easingStyle: 'Quad' as const, easingDirection: 'Out' as const, position: [x, y, zRest] as [number, number, number] },
      { id: `kf_${partId}_5`, time: t2 + 0.05, easingStyle: 'Cubic' as const, easingDirection: 'Out' as const, position: [x, y, zBack] as [number, number, number] },
      { id: `kf_${partId}_6`, time: t2 + 0.24, easingStyle: 'Quad' as const, easingDirection: 'InOut' as const, position: [x, y, zRest] as [number, number, number] },
      { id: `kf_${partId}_7`, time: 1.6, easingStyle: 'Linear' as const, easingDirection: 'Out' as const, position: [x, y, zRest] as [number, number, number] },
    ],
  };
}

// =============================================================================
// Stage 3: Autocannon Burst — Target lock sweep & staggered 4-barrel recoil fire
// =============================================================================
const zrestAutocannonBurstClip: AnimationClip = {
  id: 'clip_zrest_burst',
  name: 'Autocannon Burst',
  duration: 1.6,
  fps: 30,
  loop: true,
  priority: 'Action',
  sampleMode: 'resampled',
  fadeTime: 0.1,
  defaultWeight: 1,
  markers: [],
  tracks: [
    {
      partId: 'za_yaw',
      keyframes: [
        { id: 'kf_za_bt_y0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 14, 0] },
        { id: 'kf_za_bt_y1', time: 0.8, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, -14, 0] },
        { id: 'kf_za_bt_y2', time: 1.6, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [0, 14, 0] },
      ],
    },
    {
      partId: 'za_gun_pitch',
      keyframes: [
        { id: 'kf_za_bt_p0', time: 0, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [-4, 0, 0] },
        { id: 'kf_za_bt_p1', time: 0.16, easingStyle: 'Quad', easingDirection: 'Out', rotation: [-6.5, 0, 0] },
        { id: 'kf_za_bt_p2', time: 0.4, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [-4, 0, 0] },
        { id: 'kf_za_bt_p3', time: 0.96, easingStyle: 'Quad', easingDirection: 'Out', rotation: [-6.5, 0, 0] },
        { id: 'kf_za_bt_p4', time: 1.25, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [-4, 0, 0] },
        { id: 'kf_za_bt_p5', time: 1.6, easingStyle: 'Sine', easingDirection: 'InOut', rotation: [-4, 0, 0] },
      ],
    },
    {
      partId: 'za_hull',
      keyframes: [
        { id: 'kf_za_bt_h0', time: 0, easingStyle: 'Linear', easingDirection: 'Out', position: [0, 0.78, -0.44] },
        { id: 'kf_za_bt_h1', time: 0.15, easingStyle: 'Quad', easingDirection: 'Out', position: [0, 0.76, -0.46] },
        { id: 'kf_za_bt_h2', time: 0.35, easingStyle: 'Sine', easingDirection: 'InOut', position: [0, 0.78, -0.44] },
        { id: 'kf_za_bt_h3', time: 0.95, easingStyle: 'Quad', easingDirection: 'Out', position: [0, 0.76, -0.46] },
        { id: 'kf_za_bt_h4', time: 1.15, easingStyle: 'Sine', easingDirection: 'InOut', position: [0, 0.78, -0.44] },
        { id: 'kf_za_bt_h5', time: 1.6, easingStyle: 'Linear', easingDirection: 'Out', position: [0, 0.78, -0.44] },
      ],
    },
    // Staggered diagonal quad autocannon firing order: UL -> LR -> UR -> LL
    makeBarrelRecoilTrack('za_barrel_ul', 0.23, 0.21, 0.78, 0.08, 0.88),
    makeBarrelRecoilTrack('za_barrel_lr', -0.23, -0.19, 0.78, 0.24, 1.04),
    makeBarrelRecoilTrack('za_barrel_ur', -0.23, 0.21, 0.78, 0.4, 1.2),
    makeBarrelRecoilTrack('za_barrel_ll', 0.23, -0.19, 0.78, 0.56, 1.32),
  ],
};

export const zrestAutocannonPreset: ModelPreset = {
  id: 'zrest-autocannon',
  label: 'Zrest Autocannon',
  description:
    'Armored olive-drab quad-barrel turret rig with circular bolted turntable, twin roof optics, cheek targeting pod, strapped ammo pack with brass feed belt, rear radiator bustle, and Idle / Sentry Scan / Autocannon Burst animations.',
  model: {
    name: 'ZrestAutocannon',
    primaryPartId: 'za_base',
    parts: zrestAutocannonParts,
    animations: [zrestIdleClip, zrestSentryScanClip, zrestAutocannonBurstClip],
    scripts: [],
  },
};
