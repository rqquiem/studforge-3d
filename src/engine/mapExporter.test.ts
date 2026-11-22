import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildMergedTerrainBlocks,
  generateMapRojoBundle,
  generateRbxlx,
  validateMapForRoblox,
} from './mapExporter';
import {
  MAP_PRESETS,
  applyTerrainBrush,
  createMapObjectFromCatalog,
  createStampedModelObject,
  generateProceduralTerrain,
  sampleTerrainHeight,
} from './mapPresets';
import { getMapServiceScriptNodes } from './mapScripts';
import { MODEL_PRESETS } from './presets';

test('sampleTerrainHeight performs accurate bilinear interpolation', () => {
  // 3x3 grid with cellSize 4 => spans -4..4 in X and Z
  const heights = [
    0, 4, 4,
    0, 4, 4,
    0, 4, 4,
  ];
  assert.equal(sampleTerrainHeight(heights, 3, 4, -4, 0), 0);
  assert.equal(sampleTerrainHeight(heights, 3, 4, 0, 0), 4);
  assert.equal(sampleTerrainHeight(heights, 3, 4, -2, 0), 2);
});

test('applyTerrainBrush sculpts raise/lower/flatten/smooth and paints biome materials', () => {
  const res = 17;
  const cell = 4;
  const base = generateProceduralTerrain(res, cell, 'flat', 1);

  const raised = applyTerrainBrush(
    base.heights,
    base.materials,
    res,
    cell,
    0,
    0,
    'raise',
    10,
    2.0,
    'Grass'
  );
  const centerH = sampleTerrainHeight(raised.heights, res, cell, 0, 0);
  assert.ok(centerH > 1.5, `Expected center height > 1.5, got ${centerH}`);

  const lowered = applyTerrainBrush(
    raised.heights,
    raised.materials,
    res,
    cell,
    0,
    0,
    'lower',
    10,
    2.0,
    'Grass'
  );
  assert.ok(sampleTerrainHeight(lowered.heights, res, cell, 0, 0) < centerH);

  const painted = applyTerrainBrush(
    raised.heights,
    raised.materials,
    res,
    cell,
    0,
    0,
    'paint',
    12,
    1.0,
    'Lava'
  );
  const midIdx = Math.floor(res / 2) * res + Math.floor(res / 2);
  assert.equal(painted.materials[midIdx], 'Lava');

  const flattened = applyTerrainBrush(
    raised.heights,
    raised.materials,
    res,
    cell,
    0,
    0,
    'flatten',
    10,
    3.0,
    'Grass',
    0
  );
  assert.ok(sampleTerrainHeight(flattened.heights, res, cell, 0, 0) < centerH);

  const smoothed = applyTerrainBrush(
    raised.heights,
    raised.materials,
    res,
    cell,
    0,
    0,
    'smooth',
    10,
    1.5,
    'Grass'
  );
  assert.equal(smoothed.heights.length, res * res);
});

test('buildMergedTerrainBlocks merges adjacent uniform cells into fewer Roblox Parts', () => {
  const flatMap = MAP_PRESETS.find((p) => p.id === 'blank-baseplate')!.build();
  const rawCellCount = (flatMap.gridResolution - 1) * (flatMap.gridResolution - 1);
  const blocks = buildMergedTerrainBlocks(flatMap, 0.5);
  assert.ok(blocks.length > 0);
  assert.ok(
    blocks.length < rawCellCount / 10,
    `Expected greedy merge (< ${rawCellCount / 10} blocks), got ${blocks.length}`
  );
});

test('validateMapForRoblox detects missing SpawnLocation and unpaired Teleporter', () => {
  const map = MAP_PRESETS[0].build();
  const validReport = validateMapForRoblox(map);
  assert.equal(validReport.rbxlxReady, true);
  assert.ok(validReport.spawnCount >= 1);
  assert.equal(validReport.scriptCount, 9);

  const broken = {
    ...map,
    objects: [
      createMapObjectFromCatalog('Teleporter', [0, 2, 0], 0, {
        teleporterChannel: 'SoloWarp',
      }),
    ],
  };
  const brokenReport = validateMapForRoblox(broken);
  assert.equal(brokenReport.rbxlxReady, false);
  assert.ok(brokenReport.issues.some((i) => i.severity === 'error' && i.message.includes('SpawnLocation')));
  assert.ok(brokenReport.issues.some((i) => i.severity === 'warning' && i.message.includes('SoloWarp')));
});

test('generateRbxlx outputs full Roblox Studio Place XML with all 8 services, CollectionService tags, and rigged models', () => {
  const map = MAP_PRESETS[0].build();
  const stamped = createStampedModelObject(
    MODEL_PRESETS[0].model,
    [12, 4, 12],
    map.objects.length,
    MODEL_PRESETS[0].id
  );
  map.objects.push(stamped);

  const xml = generateRbxlx(map);
  assert.ok(xml.startsWith('<roblox '));
  assert.ok(xml.endsWith('</roblox>'));

  // Required Roblox Place services
  for (const service of [
    '<Item class="Workspace"',
    '<Item class="Lighting"',
    '<Item class="Teams"',
    '<Item class="ReplicatedStorage"',
    '<Item class="ServerScriptService"',
    '<Item class="StarterGui"',
    '<Item class="StarterPlayer"',
    '<Item class="StarterPlayerScripts"',
    '<Item class="SoundService"',
  ]) {
    assert.ok(xml.includes(service), `Missing Roblox Place service ${service}`);
  }

  // Atmosphere, Sky, Bloom & Gameplay elements
  assert.ok(xml.includes('<Item class="Atmosphere"'));
  assert.ok(xml.includes('<Item class="Sky"'));
  assert.ok(xml.includes('<Item class="BloomEffect"'));
  assert.ok(xml.includes('<Item class="SpawnLocation"'));
  assert.ok(xml.includes('<Item class="ProximityPrompt"'));
  assert.ok(xml.includes('<Item class="Motor6D"'));
  assert.ok(xml.includes('<BinaryString name="Tags">'));
  assert.ok(xml.includes('NPCTemplates'));

  // All 9 generated Luau scripts embedded in the Place XML
  const scripts = getMapServiceScriptNodes(map);
  assert.equal(scripts.length, 9);
  for (const scr of scripts) {
    assert.ok(
      xml.includes(`<string name="Name">${scr.name}</string>`),
      `Missing script ${scr.name} in .rbxlx`
    );
  }
});

test('generateMapRojoBundle creates default.project.json, .rbxlx, 9 .luau scripts, stamped .rbxmx, and map snapshot', () => {
  const map = MAP_PRESETS[0].build();
  const files = generateMapRojoBundle(map);
  const paths = new Set(files.map((f) => f.path));

  assert.ok(paths.has('default.project.json'));
  assert.ok(paths.has('README.md'));
  assert.ok(files.some((f) => f.path.endsWith('.rbxlx')));
  assert.ok(files.some((f) => f.path.endsWith('.studforge-map.json')));
  assert.ok(paths.has('src/ReplicatedStorage/MapConfig.luau'));
  assert.ok(paths.has('src/ServerScriptService/GameManager.server.luau'));
  assert.ok(paths.has('src/ServerScriptService/DayNightCycle.server.luau'));
  assert.ok(paths.has('src/ServerScriptService/ObbySystem.server.luau'));
  assert.ok(paths.has('src/ServerScriptService/Interactables.server.luau'));
  assert.ok(paths.has('src/ServerScriptService/EconomySystem.server.luau'));
  assert.ok(paths.has('src/ServerScriptService/NPCSpawnerSystem.server.luau'));
  assert.ok(paths.has('src/StarterPlayer/StarterPlayerScripts/MapHUD.client.luau'));
  assert.ok(paths.has('src/StarterPlayer/StarterPlayerScripts/MapClientFX.client.luau'));
  assert.ok(files.some((f) => f.path.startsWith('assets/models/') && f.path.endsWith('.rbxmx')));

  const rojoProj = JSON.parse(files.find((f) => f.path === 'default.project.json')!.content);
  assert.equal(rojoProj.tree.$className, 'DataModel');
  assert.ok(rojoProj.tree.ReplicatedStorage.Remotes.RoundStateEvent);
});
