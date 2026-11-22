import * as THREE from 'three';
import { PartShape } from './robloxTypes';

/**
 * Builds a normalized 1x1x1 unit BufferGeometry centered at (0,0,0) for each PartShape.
 * Scaling the resulting mesh by [sizeX, sizeY, sizeZ] maps 1:1 to Roblox BasePart.Size in Studs.
 */
export function createNormalizedShapeGeometry(shape: PartShape): THREE.BufferGeometry {
  switch (shape) {
    case 'Block':
      return new THREE.BoxGeometry(1, 1, 1, 1, 1, 1);

    case 'Ball':
      return new THREE.SphereGeometry(0.5, 24, 16);

    case 'Cylinder':
      // Y-up in Three.js viewport; exporter rotates CFrame to match Roblox's X-axis Cylinder
      return new THREE.CylinderGeometry(0.5, 0.5, 1, 24, 1);

    case 'HexPrism':
      return new THREE.CylinderGeometry(0.5, 0.5, 1, 6, 1);

    case 'Wedge':
      return buildRobloxWedgeGeometry();

    case 'CornerWedge':
      return buildRobloxCornerWedgeGeometry();

    case 'BevelPlate':
      return buildBevelPlateGeometry();

    case 'Archway':
      return buildArchwayGeometry();

    case 'PipeElbow':
      return buildPipeElbowGeometry();

    case 'LatheCone':
      return buildLatheNozzleGeometry();
  }
}

/**
 * Exact Roblox WedgePart geometry in a normalized 1x1x1 box [-0.5, 0.5]^3.
 * Back face is at +Z (full height), sloping down toward -Z at bottom -Y.
 */
function buildRobloxWedgeGeometry(): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry();
  // 5 faces: bottom, back (+Z), left (-X), right (+X), slope
  const positions = new Float32Array([
    // Bottom (-Y): (-0.5,-0.5,-0.5) -> (0.5,-0.5,-0.5) -> (0.5,-0.5,0.5) -> (-0.5,-0.5,0.5)
    -0.5, -0.5, -0.5,  0.5, -0.5, -0.5,  0.5, -0.5,  0.5,
    -0.5, -0.5, -0.5,  0.5, -0.5,  0.5, -0.5, -0.5,  0.5,
    // Back (+Z)
    -0.5, -0.5,  0.5,  0.5, -0.5,  0.5,  0.5,  0.5,  0.5,
    -0.5, -0.5,  0.5,  0.5,  0.5,  0.5, -0.5,  0.5,  0.5,
    // Slope (top-back to bottom-front, normal points -Z/+Y)
    -0.5,  0.5,  0.5,  0.5,  0.5,  0.5,  0.5, -0.5, -0.5,
    -0.5,  0.5,  0.5,  0.5, -0.5, -0.5, -0.5, -0.5, -0.5,
    // Left (-X)
    -0.5, -0.5, -0.5, -0.5, -0.5,  0.5, -0.5,  0.5,  0.5,
    // Right (+X)
     0.5, -0.5,  0.5,  0.5, -0.5, -0.5,  0.5,  0.5,  0.5,
  ]);

  const uvs = new Float32Array([
    0, 0, 1, 0, 1, 1,
    0, 0, 1, 1, 0, 1,
    0, 0, 1, 0, 1, 1,
    0, 0, 1, 1, 0, 1,
    0, 1, 1, 1, 1, 0,
    0, 1, 1, 0, 0, 0,
    0, 0, 1, 0, 1, 1,
    0, 0, 1, 0, 0, 1,
  ]);

  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.computeVertexNormals();
  return geo;
}

/**
 * Exact Roblox CornerWedgePart geometry in normalized [-0.5, 0.5]^3.
 * Apex at (+0.5, +0.5, -0.5) or standard pyramid corner over square base.
 */
function buildRobloxCornerWedgeGeometry(): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array([
    // Bottom (-Y)
    -0.5, -0.5, -0.5,  0.5, -0.5, -0.5,  0.5, -0.5,  0.5,
    -0.5, -0.5, -0.5,  0.5, -0.5,  0.5, -0.5, -0.5,  0.5,
    // Right (+X) vertical triangle
     0.5, -0.5,  0.5,  0.5, -0.5, -0.5,  0.5,  0.5,  0.5,
    // Back (+Z) vertical triangle
    -0.5, -0.5,  0.5,  0.5, -0.5,  0.5,  0.5,  0.5,  0.5,
    // Sloped front (-Z)
    -0.5, -0.5, -0.5,  0.5,  0.5,  0.5,  0.5, -0.5, -0.5,
    // Sloped left (-X)
    -0.5, -0.5,  0.5,  0.5,  0.5,  0.5, -0.5, -0.5, -0.5,
  ]);
  const uvs = new Float32Array([
    0, 0, 1, 0, 1, 1,
    0, 0, 1, 1, 0, 1,
    0, 0, 1, 0, 0, 1,
    0, 0, 1, 0, 1, 1,
    0, 0, 1, 1, 1, 0,
    0, 0, 1, 1, 0, 0,
  ]);
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.computeVertexNormals();
  return geo;
}

/**
 * Chamfered armor plate using ExtrudeGeometry normalized to 1x1x1.
 */
function buildBevelPlateGeometry(): THREE.BufferGeometry {
  const w = 0.76;
  const h = 0.76;
  const r = 0.12;
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2 + r, -h / 2);
  shape.lineTo(w / 2 - r, -h / 2);
  shape.lineTo(w / 2, -h / 2 + r);
  shape.lineTo(w / 2, h / 2 - r);
  shape.lineTo(w / 2 - r, h / 2);
  shape.lineTo(-w / 2 + r, h / 2);
  shape.lineTo(-w / 2, h / 2 - r);
  shape.lineTo(-w / 2, -h / 2 + r);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.76,
    bevelEnabled: true,
    bevelThickness: 0.12,
    bevelSize: 0.12,
    bevelSegments: 2,
  });
  geo.rotateX(Math.PI / 2);
  normalizeGeometryToUnitBox(geo);
  return geo;
}

/**
 * Architectural archway normalized to 1x1x1.
 */
function buildArchwayGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-0.5, -0.5);
  shape.lineTo(-0.26, -0.5);
  shape.lineTo(-0.26, 0.08);
  shape.absarc(0, 0.08, 0.26, Math.PI, 0, true);
  shape.lineTo(0.26, -0.5);
  shape.lineTo(0.5, -0.5);
  shape.lineTo(0.5, 0.5);
  shape.lineTo(-0.5, 0.5);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.88,
    bevelEnabled: true,
    bevelThickness: 0.06,
    bevelSize: 0.04,
    bevelSegments: 2,
    curveSegments: 16,
  });
  normalizeGeometryToUnitBox(geo);
  return geo;
}

/**
 * Curved conduit pipe elbow via TubeGeometry normalized to 1x1x1.
 */
function buildPipeElbowGeometry(): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.45, -0.45, 0),
    new THREE.Vector3(-0.45, 0.12, 0),
    new THREE.Vector3(-0.12, 0.45, 0),
    new THREE.Vector3(0.45, 0.45, 0),
  ]);
  const geo = new THREE.TubeGeometry(curve, 20, 0.16, 12, false);
  normalizeGeometryToUnitBox(geo);
  return geo;
}

/**
 * Stepped thruster/beacon nozzle via LatheGeometry normalized to 1x1x1.
 */
function buildLatheNozzleGeometry(): THREE.BufferGeometry {
  const points = [
    new THREE.Vector2(0.0, -0.5),
    new THREE.Vector2(0.5, -0.5),
    new THREE.Vector2(0.42, -0.25),
    new THREE.Vector2(0.32, 0.05),
    new THREE.Vector2(0.38, 0.25),
    new THREE.Vector2(0.24, 0.5),
    new THREE.Vector2(0.0, 0.5),
  ];
  const geo = new THREE.LatheGeometry(points, 20);
  normalizeGeometryToUnitBox(geo);
  return geo;
}

function normalizeGeometryToUnitBox(geo: THREE.BufferGeometry): void {
  geo.computeBoundingBox();
  if (!geo.boundingBox) return;
  const center = new THREE.Vector3();
  const size = new THREE.Vector3();
  geo.boundingBox.getCenter(center);
  geo.boundingBox.getSize(size);
  geo.translate(-center.x, -center.y, -center.z);
  geo.scale(
    size.x > 1e-5 ? 1 / size.x : 1,
    size.y > 1e-5 ? 1 / size.y : 1,
    size.z > 1e-5 ? 1 / size.z : 1
  );
  geo.computeBoundingBox();
  geo.computeBoundingSphere();
}

export function estimateShapeTriangles(shape: PartShape): number {
  switch (shape) {
    case 'Block':
      return 12;
    case 'Wedge':
      return 8;
    case 'CornerWedge':
      return 6;
    case 'Cylinder':
      return 96;
    case 'HexPrism':
      return 24;
    case 'Ball':
      return 720;
    case 'BevelPlate':
      return 164;
    case 'Archway':
      return 296;
    case 'PipeElbow':
      return 480;
    case 'LatheCone':
      return 240;
  }
}
