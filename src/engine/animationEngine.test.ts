import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildMotor6DDebugGraph,
  buildThreeAnimationClips,
  buildUniqueNodeNameMap,
  evaluateClipAtTime,
  evaluatePartPoseAtTime,
  evaluateRobloxEasing,
  evaluateTriggeredMarkers,
  flattenPartTree,
  getClipPriority,
  getRigDepthColor,
  getSampledClipTimes,
  lerpColorHex,
  reparentPartPreservingWorld,
  resolveWorldAttachments,
  slerpEulerDeg,
  solveWorldTransforms,
  upsertKeyframe,
  upsertMarker,
  deleteKeyframe,
  deleteMarker,
  wouldCreateCycle,
} from './animationEngine';
import { MODEL_PRESETS } from './presets';
import { AnimationClip, StudioPartNode } from './robloxTypes';

function makeNode(id: string, overrides?: Partial<StudioPartNode>): StudioPartNode {
  return {
    id,
    name: id,
    shape: 'Block',
    parentId: null,
    pivotOffset: [0, 0, 0],
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    size: [1, 1, 1],
    color: '#FFFFFF',
    material: 'SmoothPlastic',
    transparency: 0,
    reflectance: 0,
    anchored: true,
    canCollide: true,
    castShadow: true,
    visible: true,
    ...overrides,
  };
}

test('evaluateRobloxEasing satisfies boundary conditions and curve behavior', () => {
  const styles = ['Linear', 'Sine', 'Quad', 'Cubic', 'Back', 'Bounce', 'Elastic', 'Constant'] as const;
  const dirs = ['In', 'Out', 'InOut'] as const;

  for (const style of styles) {
    for (const dir of dirs) {
      const start = evaluateRobloxEasing(style, dir, 0);
      const end = evaluateRobloxEasing(style, dir, 1);
      assert.ok(Math.abs(start) < 1e-4, `${style}.${dir} at t=0 should be ~0, got ${start}`);
      assert.ok(Math.abs(end - 1) < 1e-4, `${style}.${dir} at t=1 should be ~1, got ${end}`);
    }
  }

  // Constant holds 0 until t=1
  assert.equal(evaluateRobloxEasing('Constant', 'In', 0.99), 0);
  // Back Out overshoots > 1 mid-curve
  assert.ok(evaluateRobloxEasing('Back', 'Out', 0.6) > 1.0);
  // Bounce Out stays in [0, 1]
  const bounceMid = evaluateRobloxEasing('Bounce', 'Out', 0.5);
  assert.ok(bounceMid > 0 && bounceMid <= 1);
});

test('lerpColorHex and slerpEulerDeg interpolate smoothly', () => {
  const midHex = lerpColorHex('#000000', '#FFFFFF', 0.5);
  assert.notEqual(midHex, '#000000');
  assert.notEqual(midHex, '#FFFFFF');

  const rotMid = slerpEulerDeg([0, 0, 0], [0, 90, 0], 0.5);
  assert.ok(Math.abs(rotMid[1] - 45) < 0.05);
});

test('solveWorldTransforms propagates parent rotation and child pivotOffset accurately', () => {
  const root = makeNode('root', { position: [0, 2, 0], rotation: [0, 90, 0] });
  const arm = makeNode('arm', {
    parentId: 'root',
    position: [0, 0, -2],
    rotation: [0, 0, 0],
    pivotOffset: [0, 0, 1],
  });
  const world = solveWorldTransforms([root, arm]);
  const armW = world.get('arm')!;
  // Root rotated +90 deg around Y maps local (0, 0, -2) to world (-2, 0, 0) + root (0, 2, 0)
  assert.ok(Math.abs(armW.worldPosition[0] - -2) < 1e-4);
  assert.ok(Math.abs(armW.worldPosition[1] - 2) < 1e-4);
  assert.ok(Math.abs(armW.worldPosition[2] - 0) < 1e-4);

  // Now rotate arm 90 deg around Y with pivotOffset [0, 0, 1]
  // Around pivot at local (0, 0, -1), rotating center (0, 0, -2) by +90Y puts local center at (-1, 0, -1)
  const armRot = { ...arm, rotation: [0, 90, 0] as [number, number, number] };
  const worldRot = solveWorldTransforms([root, armRot]);
  const armRotW = worldRot.get('arm')!;
  // Root has +90Y, so root * (-1, 0, -1) => (-1, 0, 1) + (0, 2, 0) = (-1, 2, 1)
  assert.ok(Math.abs(armRotW.worldPosition[0] - -1) < 1e-4);
  assert.ok(Math.abs(armRotW.worldPosition[1] - 2) < 1e-4);
  assert.ok(Math.abs(armRotW.worldPosition[2] - 1) < 1e-4);
});

test('wouldCreateCycle detects self and indirect parent loops', () => {
  const a = makeNode('a');
  const b = makeNode('b', { parentId: 'a' });
  const c = makeNode('c', { parentId: 'b' });
  const parts = [a, b, c];

  assert.equal(wouldCreateCycle(parts, 'a', 'a'), true);
  assert.equal(wouldCreateCycle(parts, 'a', 'c'), true);
  assert.equal(wouldCreateCycle(parts, 'c', 'a'), false);
  assert.equal(wouldCreateCycle(parts, 'b', null), false);
});

test('reparentPartPreservingWorld keeps child world position invariant', () => {
  const p0 = makeNode('p0', { position: [5, 2, -3], rotation: [0, 45, 0] });
  const child = makeNode('child', { position: [2, 4, 1], rotation: [15, -30, 0] });
  const before = solveWorldTransforms([p0, child]).get('child')!;

  const reparented = reparentPartPreservingWorld([p0, child], 'child', 'p0');
  const after = solveWorldTransforms(reparented).get('child')!;

  assert.ok(Math.abs(before.worldPosition[0] - after.worldPosition[0]) < 1e-2);
  assert.ok(Math.abs(before.worldPosition[1] - after.worldPosition[1]) < 1e-2);
  assert.ok(Math.abs(before.worldPosition[2] - after.worldPosition[2]) < 1e-2);
});

test('upsertKeyframe, deleteKeyframe, evaluateClipAtTime, and buildThreeAnimationClips work cleanly', () => {
  const part = makeNode('p1', { position: [0, 1, 0], color: '#000000', transparency: 0 });
  let clip: AnimationClip = {
    id: 'c1',
    name: 'TestClip',
    duration: 2,
    fps: 30,
    loop: true,
    tracks: [],
  };

  clip = upsertKeyframe(clip, 'p1', {
    time: 0,
    easingStyle: 'Linear',
    easingDirection: 'InOut',
    position: [0, 1, 0],
    color: '#000000',
    transparency: 0,
  });
  clip = upsertKeyframe(clip, 'p1', {
    time: 2,
    easingStyle: 'Linear',
    easingDirection: 'InOut',
    position: [0, 5, 0],
    color: '#FFFFFF',
    transparency: 0.8,
  });

  const mid = evaluatePartPoseAtTime(part, clip, 1.0);
  assert.ok(Math.abs(mid.position[1] - 3) < 1e-4);
  assert.ok(Math.abs(mid.transparency - 0.4) < 1e-4);

  const threeClips = buildThreeAnimationClips({
    name: 'Demo',
    primaryPartId: 'p1',
    parts: [part],
    animations: [clip],
  });
  assert.equal(threeClips.length, 1);
  assert.equal(threeClips[0].tracks.length, 3);

  const kfId = clip.tracks[0].keyframes[0].id;
  clip = deleteKeyframe(clip, 'p1', kfId);
  assert.equal(clip.tracks[0].keyframes.length, 1);
});

test('flattenPartTree returns parents before children with accurate depths', () => {
  const beacon = MODEL_PRESETS.find((p) => p.id === 'orbital-beacon')!.model;
  const ordered = flattenPartTree(beacon.parts);
  assert.equal(ordered.length, beacon.parts.length);
  const plinth = ordered.find((x) => x.part.id === 'b_plinth')!;
  const collar = ordered.find((x) => x.part.id === 'b_collar')!;
  const dish = ordered.find((x) => x.part.id === 'b_dish')!;
  assert.equal(plinth.depth, 0);
  assert.equal(collar.depth, 1);
  assert.ok(dish.depth >= 3);

  // Verify preset animation clip evaluates cleanly
  const poses = evaluateClipAtTime(beacon, beacon.animations?.[0], 1.5);
  assert.ok(poses['b_nozzle']);

  // Verify default Jade Dragon hierarchy depth & stage evaluation
  const dragon = MODEL_PRESETS[0].model;
  const dragonTree = flattenPartTree(dragon.parts);
  const pelvis = dragonTree.find((x) => x.part.id === 'd_pelvis')!;
  const breathInner = dragonTree.find((x) => x.part.id === 'd_breath_inner')!;
  assert.equal(pelvis.depth, 0);
  assert.ok(breathInner.depth >= 6);
  const breathingClip = dragon.animations?.find((c) => c.name === 'Breathing');
  const breathPoses = evaluateClipAtTime(dragon, breathingClip, 1.2);
  assert.ok(breathPoses['d_breath_inner'].transparency < 0.25);
});

test('buildMotor6DDebugGraph computes depth colors, parent-child bone pivots, and pivotOffset markers', () => {
  const turret = MODEL_PRESETS.find((p) => p.id === 'aegis-turret')!.model;
  const graph = buildMotor6DDebugGraph(turret.parts);
  assert.equal(graph.length, turret.parts.length);

  const base = graph.find((n) => n.partId === 't_base')!;
  const ring = graph.find((n) => n.partId === 't_ring')!;
  const barrel = graph.find((n) => n.partId === 't_barrel_l')!;
  const muzzle = graph.find((n) => n.partId === 't_muzzle_l')!;

  assert.equal(base.depth, 0);
  assert.equal(base.parentPivotWorld, null);
  assert.equal(base.colorHex, getRigDepthColor(0));

  assert.equal(ring.depth, 1);
  assert.equal(ring.colorHex, getRigDepthColor(1));
  assert.deepEqual(ring.parentPivotWorld, base.pivotWorld);

  assert.equal(barrel.depth, 3);
  assert.equal(barrel.hasPivotOffset, true);
  assert.notDeepEqual(barrel.pivotWorld, barrel.centerWorld);
  assert.equal(muzzle.depth, 4);
  assert.deepEqual(muzzle.parentPivotWorld, barrel.pivotWorld);
});

test('buildUniqueNodeNameMap deduplicates case-insensitively and reserves _pivot/_center and controller names', () => {
  const parts = [
    makeNode('p1', { name: 'Wing' }),
    makeNode('p2', { name: 'wing' }),
    makeNode('p3', { name: 'Wing_pivot' }),
    makeNode('p4', { name: 'AnimSaves' }),
    makeNode('p5', { name: 'AnimationController' }),
  ];

  const map = buildUniqueNodeNameMap(parts);
  const resolved = Array.from(map.values());
  const lowerSet = new Set(resolved.map((n) => n.toLowerCase()));
  assert.equal(lowerSet.size, parts.length);
  assert.equal(map.get('p1'), 'Wing');
  assert.equal(map.get('p2'), 'wing_2');
  assert.notEqual(map.get('p3')?.toLowerCase(), 'wing_pivot');
  assert.notEqual(map.get('p4')?.toLowerCase(), 'animsaves');
  assert.notEqual(map.get('p5')?.toLowerCase(), 'animationcontroller');

  // Verify buildThreeAnimationClips binds tracks to deduplicated node names
  const clip: AnimationClip = {
    id: 'c_dup',
    name: 'Flap',
    duration: 1,
    fps: 30,
    loop: true,
    tracks: [
      {
        partId: 'p2',
        keyframes: [
          { id: 'k1', time: 0, easingStyle: 'Linear', easingDirection: 'Out', rotation: [0, 0, 0] },
          { id: 'k2', time: 1, easingStyle: 'Linear', easingDirection: 'Out', rotation: [0, 30, 0] },
        ],
      },
    ],
  };
  const threeClips = buildThreeAnimationClips({
    name: 'DupModel',
    primaryPartId: 'p1',
    parts,
    animations: [clip],
  });
  assert.equal(threeClips.length, 1);
  assert.ok(threeClips[0].tracks.some((tr) => tr.name === 'wing_2_pivot.quaternion'));
  assert.ok(threeClips[0].tracks.some((tr) => tr.name === 'wing_2.scale'));
});

test('evaluatePartPoseAtTime blends toward rest pose using Pose.weight and clip.defaultWeight', () => {
  const part = makeNode('arm', { position: [0, 0, 0], rotation: [0, 0, 0] });
  const clip: AnimationClip = {
    id: 'blend_clip',
    name: 'WeightedSwipe',
    duration: 1,
    fps: 30,
    loop: false,
    defaultWeight: 0.5,
    tracks: [
      {
        partId: 'arm',
        keyframes: [
          {
            id: 'k0',
            time: 0,
            easingStyle: 'Linear',
            easingDirection: 'Out',
            position: [0, 4, 0],
            rotation: [0, 80, 0],
            weight: 0.5,
          },
          {
            id: 'k1',
            time: 1,
            easingStyle: 'Linear',
            easingDirection: 'Out',
            position: [0, 4, 0],
            rotation: [0, 80, 0],
            weight: 0.5,
          },
        ],
      },
    ],
  };

  const posed = evaluatePartPoseAtTime(part, clip, 0.5);
  // effectiveWeight = 0.5 (keyframe) * 0.5 (clip) = 0.25
  assert.ok(Math.abs((posed.weight ?? 0) - 0.25) < 1e-3);
  assert.ok(Math.abs(posed.position[1] - 1.0) < 1e-3);
  assert.ok(Math.abs(posed.rotation[1] - 20.0) < 0.1);
});

test('getClipPriority, getSampledClipTimes, marker CRUD, and evaluateTriggeredMarkers handle step and loop wrap', () => {
  assert.equal(getClipPriority({ id: '1', name: 'Idle', duration: 1, fps: 30, loop: true, tracks: [] }), 'Idle');
  assert.equal(getClipPriority({ id: '2', name: 'Flying', duration: 1, fps: 30, loop: true, tracks: [] }), 'Movement');
  assert.equal(
    getClipPriority({ id: '3', name: 'Idle', priority: 'Action4', duration: 1, fps: 30, loop: true, tracks: [] }),
    'Action4'
  );

  let clip: AnimationClip = {
    id: 'c_mkr',
    name: 'Attack',
    duration: 1.0,
    fps: 15,
    sampleMode: 'resampled',
    loop: true,
    tracks: [
      {
        partId: 'p1',
        keyframes: [
          { id: 'k0', time: 0, easingStyle: 'Linear', easingDirection: 'Out' },
          { id: 'k1', time: 1.0, easingStyle: 'Linear', easingDirection: 'Out' },
        ],
      },
    ],
    markers: [],
  };

  clip = upsertMarker(clip, { id: 'm0', time: 0, name: 'SwingStart', value: 'windup' });
  clip = upsertMarker(clip, { id: 'm1', time: 0.45, name: 'ClawImpact', value: 'hit' });
  clip = upsertMarker(clip, { id: 'm2', time: 0.92, name: 'TrailOff', value: 'end' });
  assert.equal(clip.markers?.length, 3);

  const sampled = getSampledClipTimes(clip);
  assert.ok(sampled.length >= 15, 'Resampled clip at 15 FPS should produce >= 15 timestamps');
  assert.ok(sampled.some((t) => Math.abs(t - 0.45) < 0.002));

  // Normal step starting at 0 hits m0
  const startHits = evaluateTriggeredMarkers(clip, 0, 0.08, false);
  assert.deepEqual(startHits.map((m) => m.name), ['SwingStart']);

  // Mid step hits m1
  const midHits = evaluateTriggeredMarkers(clip, 0.4, 0.5, false);
  assert.deepEqual(midHits.map((m) => m.name), ['ClawImpact']);

  // Loop wrap from 0.90 -> 0.05 crosses m2 (at 0.92) and m0 (at 0.0)
  const wrapHits = evaluateTriggeredMarkers(clip, 0.9, 0.05, true);
  assert.deepEqual(wrapHits.map((m) => m.name), ['SwingStart', 'TrailOff']);

  clip = deleteMarker(clip, 'm1');
  assert.equal(clip.markers?.length, 2);
});

test('resolveWorldAttachments computes rotated world positions and forward vectors along Motor6D chain', () => {
  const root = makeNode('root', { position: [0, 2, 0], rotation: [0, 90, 0] });
  const snout = makeNode('snout', {
    parentId: 'root',
    position: [0, 0, -2],
    rotation: [0, 0, 0],
    attachments: [
      {
        id: 'att_mouth',
        name: 'MouthEmitter',
        position: [0, 0, -1],
        rotation: [0, 0, 0],
      },
    ],
  });

  const resolved = resolveWorldAttachments([root, snout]);
  const mouth = resolved.get('att_mouth');
  assert.ok(mouth);
  // Local z=-3 from root rotated +90 deg Y -> world X = -3, Y = 2, Z = 0
  assert.ok(Math.abs(mouth.worldPosition[0] - -3) < 1e-3);
  assert.ok(Math.abs(mouth.worldPosition[1] - 2) < 1e-3);
  assert.ok(Math.abs(mouth.worldPosition[2] - 0) < 1e-3);
  // Forward local +Z (0,0,1) rotated +90 deg Y -> world +X (1,0,0)
  assert.ok(Math.abs(mouth.worldForward[0] - 1) < 1e-3);
  assert.ok(Math.abs(mouth.worldForward[2]) < 1e-3);
});


