import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import {
  buildThreeAnimationClips,
  buildUniqueNodeNameMap,
  flattenPartTree,
} from './animationEngine';
import {
  computeModelOriginOffset,
  getScaleFactor,
  RobloxExportOptions,
  sanitizeIdentifier,
} from './robloxExporter';
import { createNormalizedShapeGeometry } from './robloxGeometry';
import { ROBLOX_MATERIAL_SPECS, StudioSceneModel } from './robloxTypes';

/**
 * Exports the StudioSceneModel to a binary .glb (glTF 2.0) ArrayBuffer
 * preserving parent-child pivot hierarchy and AnimationClips, ready for Roblox Studio's 3D Importer.
 */
export async function exportModelToGlb(
  model: StudioSceneModel,
  options: RobloxExportOptions = { scaleMode: 'studs' }
): Promise<ArrayBuffer> {
  const scale = getScaleFactor(options.scaleMode);
  const activeParts = model.parts.filter((p) => options.includeHidden || p.visible);
  const activeIds = new Set(activeParts.map((p) => p.id));

  const originOffset: [number, number, number] = options.centerAtOrigin
    ? computeModelOriginOffset(activeParts)
    : [0, 0, 0];

  const rootGroup = new THREE.Group();
  rootGroup.name = sanitizeIdentifier(model.name);

  const createdGeometries: THREE.BufferGeometry[] = [];
  const createdMaterials: THREE.Material[] = [];
  const nodeNames = buildUniqueNodeNameMap(activeParts);
  const centerGroups = new Map<string, THREE.Group>();

  // Traverse in topological parent-first order so parent centerGroups exist
  const ordered = flattenPartTree(activeParts);

  for (const { part } of ordered) {
    const nodeName = nodeNames.get(part.id) ?? sanitizeIdentifier(part.name);
    const piv = part.pivotOffset ?? [0, 0, 0];
    const hasParent = Boolean(part.parentId && activeIds.has(part.parentId));

    const pivotGroup = new THREE.Group();
    pivotGroup.name = `${nodeName}_pivot`;
    const ox = hasParent ? 0 : originOffset[0];
    const oy = hasParent ? 0 : originOffset[1];
    const oz = hasParent ? 0 : originOffset[2];
    pivotGroup.position.set(
      (part.position[0] + piv[0] - ox) * scale,
      (part.position[1] + piv[1] - oy) * scale,
      (part.position[2] + piv[2] - oz) * scale
    );
    pivotGroup.rotation.set(
      THREE.MathUtils.degToRad(part.rotation[0]),
      THREE.MathUtils.degToRad(part.rotation[1]),
      THREE.MathUtils.degToRad(part.rotation[2]),
      'XYZ'
    );

    const centerGroup = new THREE.Group();
    centerGroup.name = `${nodeName}_center`;
    centerGroup.position.set(-piv[0] * scale, -piv[1] * scale, -piv[2] * scale);
    pivotGroup.add(centerGroup);
    centerGroups.set(part.id, centerGroup);

    const geo = createNormalizedShapeGeometry(part.shape);
    geo.name = `${nodeName}_mesh`;
    createdGeometries.push(geo);

    const spec = ROBLOX_MATERIAL_SPECS[part.material] ?? ROBLOX_MATERIAL_SPECS.SmoothPlastic;
    const baseColor = new THREE.Color(part.color);
    const opacity = Math.max(0.05, (1 - part.transparency) * (spec.opacityMultiplier ?? 1));

    const mat = new THREE.MeshStandardMaterial({
      name: `${part.material}_${part.color.replace('#', '')}`,
      color: baseColor,
      roughness: Math.max(0.05, spec.roughness - part.reflectance * 0.25),
      metalness: Math.min(1, spec.metalness + part.reflectance * 0.45),
      emissive: spec.emissiveIntensity > 0 ? baseColor.clone() : new THREE.Color(0x000000),
      emissiveIntensity: spec.emissiveIntensity > 0 ? 1.0 : 0,
      transparent: opacity < 0.99,
      opacity,
    });
    createdMaterials.push(mat);

    const mesh = new THREE.Mesh(geo, mat);
    mesh.name = nodeName;
    mesh.scale.set(
      Math.max(0.05, part.size[0]) * scale,
      Math.max(0.05, part.size[1]) * scale,
      Math.max(0.05, part.size[2]) * scale
    );
    centerGroup.add(mesh);

    const parentContainer =
      hasParent && part.parentId ? centerGroups.get(part.parentId) ?? rootGroup : rootGroup;
    parentContainer.add(pivotGroup);
  }

  const animations = buildThreeAnimationClips(model, scale, originOffset);
  const exporter = new GLTFExporter();
  try {
    const result = await new Promise<ArrayBuffer>((resolve, reject) => {
      exporter.parse(
        rootGroup,
        (output) => {
          if (output instanceof ArrayBuffer) {
            resolve(output);
          } else {
            const json = JSON.stringify(output);
            const encoded = new TextEncoder().encode(json);
            resolve(encoded.buffer);
          }
        },
        (error) => reject(error),
        { binary: true, animations }
      );
    });
    return result;
  } finally {
    createdGeometries.forEach((g) => g.dispose());
    createdMaterials.forEach((m) => m.dispose());
  }
}
