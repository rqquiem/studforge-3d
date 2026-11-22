import * as THREE from 'three';
import { ROBLOX_MATERIAL_SPECS, RobloxMaterial, StudioPartNode } from './robloxTypes';

type TextureCache = Partial<Record<RobloxMaterial, THREE.CanvasTexture>>;

/**
 * Generates procedural grayscale bump/surface CanvasTextures for Roblox material finishes
 * so zero external images/404s are ever required.
 */
export function createMaterialTextureCache(maxAnisotropy: number): TextureCache {
  const cache: TextureCache = {};

  const makeTex = (draw: (ctx: CanvasRenderingContext2D, size: number) => void, repeat = 2) => {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (ctx) draw(ctx, size);
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeat, repeat);
    tex.anisotropy = Math.min(8, maxAnisotropy || 1);
    tex.needsUpdate = true;
    return tex;
  };

  // Plastic: subtle Roblox stud top bump grid
  cache.Plastic = makeTex((ctx, s) => {
    ctx.fillStyle = '#c8c8c8';
    ctx.fillRect(0, 0, s, s);
    const step = s / 2;
    for (let y = 0; y < 2; y++) {
      for (let x = 0; x < 2; x++) {
        const cx = x * step + step / 2;
        const cy = y * step + step / 2;
        ctx.beginPath();
        ctx.arc(cx, cy, step * 0.28, 0, Math.PI * 2);
        ctx.fillStyle = '#f8f8f8';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#909090';
        ctx.stroke();
      }
    }
  }, 2);

  // Metal: fine brushed anisotropic streaks
  cache.Metal = makeTex((ctx, s) => {
    ctx.fillStyle = '#b4b4b4';
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 180; i++) {
      const y = (i * 17) % s;
      const shade = 155 + ((i * 29) % 60);
      ctx.fillStyle = `rgb(${shade},${shade},${shade})`;
      ctx.fillRect(0, y, s, 1);
    }
  }, 2);

  // Wood: directional wood grain planks
  cache.Wood = makeTex((ctx, s) => {
    ctx.fillStyle = '#b0b0b0';
    ctx.fillRect(0, 0, s, s);
    for (let y = 0; y < s; y += 2) {
      const wave = Math.sin(y * 0.22) * 24 + Math.cos(y * 0.08) * 14;
      const v = Math.max(90, Math.min(230, Math.round(170 + wave)));
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.fillRect(0, y, s, 2);
    }
    ctx.fillStyle = '#555555';
    ctx.fillRect(0, s / 2 - 1, s, 2);
  }, 2);

  // Granite: speckled mineral grain
  cache.Granite = makeTex((ctx, s) => {
    ctx.fillStyle = '#a8a8a8';
    ctx.fillRect(0, 0, s, s);
    let seed = 42;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 0xffffffff;
    };
    for (let i = 0; i < 600; i++) {
      const v = Math.round(95 + rand() * 140);
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.fillRect(rand() * s, rand() * s, 3, 3);
    }
  }, 2);

  // Cobblestone: stone block cells
  cache.Cobblestone = makeTex((ctx, s) => {
    ctx.fillStyle = '#606060';
    ctx.fillRect(0, 0, s, s);
    const blocks = [
      [4, 4, 56, 36],
      [66, 4, 58, 36],
      [4, 46, 36, 36],
      [46, 46, 78, 36],
      [4, 88, 66, 36],
      [76, 88, 48, 36],
    ];
    blocks.forEach(([x, y, w, h], idx) => {
      const shade = 165 + (idx % 3) * 22;
      ctx.fillStyle = `rgb(${shade},${shade},${shade})`;
      ctx.fillRect(x, y, w, h);
    });
  }, 2);

  // DiamondPlate: industrial tread pattern
  cache.DiamondPlate = makeTex((ctx, s) => {
    ctx.fillStyle = '#909090';
    ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = '#ececec';
    const step = 32;
    for (let y = 8; y < s; y += step) {
      for (let x = 8; x < s; x += step) {
        ctx.save();
        ctx.translate(x + ((y / step) % 2 ? 16 : 0), y);
        ctx.rotate(((x + y) % 64 === 0 ? 1 : -1) * (Math.PI / 4));
        ctx.fillRect(-3, -10, 6, 20);
        ctx.restore();
      }
    }
  }, 2);

  // CorrodedMetal: mottled pitted surface
  cache.CorrodedMetal = makeTex((ctx, s) => {
    ctx.fillStyle = '#9c9c9c';
    ctx.fillRect(0, 0, s, s);
    let seed = 1337;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 0xffffffff;
    };
    for (let i = 0; i < 240; i++) {
      const v = Math.round(70 + rand() * 140);
      ctx.fillStyle = `rgba(${v},${v},${v},0.65)`;
      ctx.beginPath();
      ctx.arc(rand() * s, rand() * s, 2 + rand() * 6, 0, Math.PI * 2);
      ctx.fill();
    }
  }, 2);

  return cache;
}

export function buildThreeMaterialForPart(
  part: StudioPartNode,
  textureCache: TextureCache,
  isSoftwareGl: boolean
): THREE.MeshPhysicalMaterial {
  const spec = ROBLOX_MATERIAL_SPECS[part.material] ?? ROBLOX_MATERIAL_SPECS.SmoothPlastic;
  const baseColor = new THREE.Color(part.color);
  const effectiveOpacity = Math.max(0.05, (1 - part.transparency) * (spec.opacityMultiplier ?? 1));
  const isTransparent = effectiveOpacity < 0.99;

  const isGlass = part.material === 'Glass';
  const bumpTex = textureCache[part.material] ?? null;

  const mat = new THREE.MeshPhysicalMaterial({
    color: baseColor,
    roughness: Math.max(0.05, spec.roughness - part.reflectance * 0.25),
    metalness: Math.min(1, spec.metalness + part.reflectance * 0.45),
    clearcoat: spec.clearcoat ?? (part.reflectance > 0.1 ? 0.6 : 0),
    clearcoatRoughness: 0.12,
    bumpMap: bumpTex,
    bumpScale: part.material === 'Plastic' ? 0.035 : part.material === 'Cobblestone' ? 0.06 : 0.025,
    emissive:
      spec.emissiveIntensity > 0
        ? baseColor.clone()
        : new THREE.Color('#000000'),
    emissiveIntensity: spec.emissiveIntensity > 0 ? spec.emissiveIntensity : 0,
    transparent: isTransparent,
    opacity: isGlass && !isSoftwareGl ? 1 : effectiveOpacity,
    transmission: isGlass && !isSoftwareGl ? 0.85 : 0,
    ior: isGlass ? 1.52 : 1.45,
    thickness: isGlass ? 0.6 : 0,
    depthWrite: !isTransparent || (isGlass && !isSoftwareGl),
    wireframe: part.material === 'ForceField',
  });

  if (part.material === 'Metal') {
    mat.anisotropy = 0.7;
  }

  return mat;
}
