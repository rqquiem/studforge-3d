import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateFrameworkScripts,
  generateLuauAnimationScript,
  generateLuauMultiStageScript,
  generateLuauScript,
  generateObjAndMtl,
  generateRbxmx,
  hexToColor3uint8,
  hexToRgb255,
  resolveUniqueRobloxPartNames,
  toRobloxPartTransform,
  validateModelForRoblox,
} from './robloxExporter';
import { exportModelToGlb } from './glbExporter';
import { MODEL_PRESETS } from './presets';
import { StudioPartNode, StudioSceneModel } from './robloxTypes';

const samplePart = (overrides?: Partial<StudioPartNode>): StudioPartNode => ({
  id: 'p1',
  name: 'TestPart',
  shape: 'Block',
  position: [2, 3, -4],
  rotation: [0, 0, 0],
  size: [2, 4, 6],
  color: '#2563EB',
  material: 'SmoothPlastic',
  transparency: 0,
  reflectance: 0,
  anchored: true,
  canCollide: true,
  castShadow: true,
  visible: true,
  ...overrides,
});

test('hexToRgb255 and hexToColor3uint8 convert colors accurately', () => {
  assert.deepEqual(hexToRgb255('#2563EB'), [37, 99, 235]);
  // 0xFF2563EB = 4280640491
  assert.equal(hexToColor3uint8('#2563EB'), 0xff2563eb >>> 0);
});

test('toRobloxPartTransform maps Cylinder Y-up to Roblox X-axis Cylinder accurately', () => {
  const cyl = samplePart({ shape: 'Cylinder', size: [2, 6, 2], rotation: [0, 0, 0] });
  const t = toRobloxPartTransform(cyl, 1.0);
  assert.equal(t.rbxClass, 'Part');
  assert.equal(t.rbxShapeToken, 2);
  // Size X and Y swap so Roblox X-axis cylinder has height 6 and diameter 2
  assert.deepEqual(t.size, [6, 2, 2]);
  // Rotation matrix should map local X (1,0,0) -> world Y (0,1,0)
  // First column of 3x3 matrix: [R00, R10, R20]
  assert.ok(Math.abs(t.rotationMatrix[0]) < 1e-5);
  assert.ok(Math.abs(t.rotationMatrix[3] - 1) < 1e-5);
  assert.ok(Math.abs(t.rotationMatrix[6]) < 1e-5);
});

test('toRobloxPartTransform maps Wedge and CornerWedge and clamps tiny sizes', () => {
  const wedge = samplePart({ shape: 'Wedge', size: [0.001, 2, 3] });
  const tw = toRobloxPartTransform(wedge, 1.0);
  assert.equal(tw.rbxClass, 'WedgePart');
  assert.equal(tw.rbxShapeToken, null);
  assert.equal(tw.size[0], 0.05);

  const cw = samplePart({ shape: 'CornerWedge' });
  const tcw = toRobloxPartTransform(cw, 1.0);
  assert.equal(tcw.rbxClass, 'CornerWedgePart');
});

test('generateRbxmx produces valid Roblox XML with escaped names and Material enum', () => {
  const model: StudioSceneModel = {
    name: 'Beacon<Test>',
    primaryPartId: 'p1',
    parts: [
      samplePart({ id: 'p1', name: 'Core & Emitter', material: 'Neon' }),
      samplePart({ id: 'p2', name: 'HiddenPart', visible: false }),
    ],
  };
  const xml = generateRbxmx(model, { scaleMode: 'studs' });
  assert.ok(xml.includes('<roblox'));
  assert.ok(xml.includes('<Item class="Model"'));
  assert.ok(xml.includes('<string name="Name">Core &amp; Emitter</string>'));
  assert.ok(xml.includes('<token name="Material">288</token>')); // Neon = 288
  assert.ok(!xml.includes('HiddenPart'));
});

test('generateRbxmx emits Motor6D joints and AnimSaves KeyframeSequence for rigged animated presets', () => {
  const turret = MODEL_PRESETS.find((p) => p.id === 'aegis-turret')!.model;
  const xml = generateRbxmx(turret, { scaleMode: 'studs', centerAtOrigin: true });
  assert.ok(xml.includes('<Item class="Motor6D"'));
  assert.ok(xml.includes('<string name="Name">AnimSaves</string>'));
  assert.ok(xml.includes('<Item class="KeyframeSequence"'));
  assert.ok(xml.includes('<Item class="Keyframe"'));
  assert.ok(xml.includes('<Item class="Pose"'));
});

test('generateLuauScript produces executable Luau Instance builder', () => {
  const model: StudioSceneModel = {
    name: 'TurretUnit',
    primaryPartId: 'p1',
    parts: [samplePart({ id: 'p1', name: 'Base', shape: 'Ball', material: 'Metal' })],
  };
  const lua = generateLuauScript(model, { scaleMode: 'studs' });
  assert.ok(lua.includes('Instance.new("Model")'));
  assert.ok(lua.includes('Enum.PartType.Ball'));
  assert.ok(lua.includes('Enum.Material.Metal'));
  assert.ok(lua.includes('model.PrimaryPart = parts["p1"]'));
  assert.ok(lua.includes('model.Parent = workspace'));
});

test('generateLuauAnimationScript produces TweenService runner with Color, Size, Transparency, and EasingStyle', () => {
  const turret = MODEL_PRESETS.find((p) => p.id === 'aegis-turret')!.model;
  const luaAnim = generateLuauAnimationScript(turret, turret.animations?.[0]?.id, {
    scaleMode: 'studs',
    centerAtOrigin: true,
  });
  assert.ok(luaAnim.includes('TweenService:Create'));
  assert.ok(luaAnim.includes('Enum.EasingStyle.'));
  assert.ok(luaAnim.includes('Enum.EasingDirection.'));
  assert.ok(luaAnim.includes('Color = Color3.fromRGB'));
  assert.ok(luaAnim.includes('Transparency = '));
});

test('Jade Blocky Dragon preset exports all 4 animation stages to RBXMX and multi-stage Luau controller', () => {
  const dragon = MODEL_PRESETS[0];
  assert.equal(dragon.id, 'jade-dragon');
  const stageNames = (dragon.model.animations ?? []).map((c) => c.name);
  assert.deepEqual(stageNames, ['Idle', 'Flying', 'Breathing', 'Attack']);

  const xml = generateRbxmx(dragon.model, { scaleMode: 'studs', centerAtOrigin: true });
  for (const stage of stageNames) {
    assert.ok(xml.includes(`<string name="Name">${stage}</string>`), `RBXMX should include ${stage} KeyframeSequence`);
  }

  const luaMulti = generateLuauMultiStageScript(dragon.model, {
    scaleMode: 'studs',
    centerAtOrigin: true,
  });
  assert.ok(luaMulti.includes('local function playStage(stageName)'));
  for (const stage of stageNames) {
    assert.ok(luaMulti.includes(`["${stage}"] = {`), `Luau controller should include stage ${stage}`);
  }
  assert.ok(luaMulti.includes('playStage("Idle")'));
});

test('generateObjAndMtl applies 0.28 meters scale and emits valid OBJ faces', () => {
  const model: StudioSceneModel = {
    name: 'BoxModel',
    primaryPartId: 'p1',
    parts: [samplePart({ id: 'p1', position: [0, 5, 0], size: [10, 10, 10] })],
  };
  const { obj, mtl } = generateObjAndMtl(model, { scaleMode: 'meters' });
  assert.ok(obj.includes('mtllib BoxModel.mtl'));
  assert.ok(obj.includes('o TestPart\n'));
  // At 0.28 scale, size 10 becomes 2.8 -> half extent 1.4; center Y=5 becomes 1.4, so minY=0, maxY=2.8
  assert.ok(obj.includes('v 1.4 2.8 1.4'));
  assert.ok(mtl.includes('newmtl SmoothPlastic_2563EB_100'));
});

test('validateModelForRoblox reports all presets as valid, rigged, animated multi-part models', () => {
  for (const preset of MODEL_PRESETS) {
    const report = validateModelForRoblox(preset.model);
    assert.ok(report.partCount >= 10, `${preset.id} should have >= 10 parts`);
    assert.ok(report.jointCount >= 2, `${preset.id} should have Motor6D joints`);
    assert.ok(report.animationClipCount >= 1, `${preset.id} should have >= 1 animation clip`);
    assert.equal(report.rbxmxReady, true);
    assert.equal(report.meshImportReady, true);
    assert.ok(report.totalTriangles < 10000, `${preset.id} should be under 10k tris`);
    assert.ok(report.boundingSizeStuds[1] > 1, `${preset.id} height > 1 stud`);
  }
});

test('validateModelForRoblox flags empty models as error', () => {
  const report = validateModelForRoblox({
    name: 'Empty',
    primaryPartId: null,
    parts: [],
  });
  assert.equal(report.rbxmxReady, false);
  assert.equal(report.issues[0]?.severity, 'error');
});

test('all presets have zero duplicate part names and Jade Dragon includes overhauled anatomy parts', () => {
  for (const preset of MODEL_PRESETS) {
    const res = resolveUniqueRobloxPartNames(preset.model.parts);
    assert.equal(
      res.duplicateCount,
      0,
      `${preset.id} should have zero duplicate part names`
    );
  }

  const dragon = MODEL_PRESETS.find((p) => p.id === 'jade-dragon')!;
  const names = new Set(dragon.model.parts.map((p) => p.name));
  const expectedParts = [
    'PelvisCore',
    'LowerTorso',
    'MidTorso',
    'ChestCore',
    'NeckLower',
    'NeckUpper',
    'AntlerBase_L',
    'AntlerTip_L',
    'WhiskerBase_L',
    'WhiskerTip_L',
    'CheekWhisker_L',
    'UpperFang_L',
    'UpperTeeth_L',
    'LowerFang_L',
    'LowerTeeth_R',
    'MouthCore',
    'DragonPearl',
    'TailFanHub',
    'TailRayTip_1',
    'TailRayTip_4',
  ];
  for (const partName of expectedParts) {
    assert.ok(names.has(partName), `Jade Dragon should contain ${partName}`);
  }
});

test('generateRbxmx and generateLuauScript configure AnimationController + Animator and anchor only PrimaryPart on rigs', () => {
  const dragon = MODEL_PRESETS.find((p) => p.id === 'jade-dragon')!.model;
  const xml = generateRbxmx(dragon, { scaleMode: 'studs', centerAtOrigin: true });

  assert.ok(xml.includes('<Item class="AnimationController"'));
  assert.ok(xml.includes('<Item class="Animator"'));

  // PrimaryPart (PelvisCore) is Anchored = true, and all Motor6D child parts are Anchored = false
  const anchoredTrueMatches = xml.match(/<bool name="Anchored">true<\/bool>/g) ?? [];
  const anchoredFalseMatches = xml.match(/<bool name="Anchored">false<\/bool>/g) ?? [];
  assert.equal(anchoredTrueMatches.length, 1, 'Only PrimaryPart should be anchored in rigged dragon');
  assert.equal(anchoredFalseMatches.length, dragon.parts.length - 1);

  const lua = generateLuauScript(dragon, { scaleMode: 'studs', centerAtOrigin: true });
  assert.ok(lua.includes('Instance.new("AnimationController")'));
  assert.ok(lua.includes('Instance.new("Animator")'));
  const luaAnchoredTrue = lua.match(/\.Anchored = true/g) ?? [];
  const luaAnchoredFalse = lua.match(/\.Anchored = false/g) ?? [];
  assert.equal(luaAnchoredTrue.length, 1);
  assert.equal(luaAnchoredFalse.length, dragon.parts.length - 1);

  const report = validateModelForRoblox(dragon);
  assert.ok(
    report.issues.some((i) => i.message.includes('AnimationController + Animator')),
    'Validation report should confirm AnimationController + Animator rig readiness'
  );
});

test('all export formats deduplicate case-insensitive and reserved part names cleanly', async () => {
  const dupModel: StudioSceneModel = {
    name: 'DuplicateRig',
    primaryPartId: 'root',
    parts: [
      samplePart({ id: 'root', name: 'Wing', anchored: true }),
      samplePart({ id: 'c1', name: 'wing', parentId: 'root', anchored: true, position: [1, 0, 0] }),
      samplePart({ id: 'c2', name: 'WING', parentId: 'c1', anchored: true, position: [1, 0, 0] }),
      samplePart({ id: 'c3', name: 'AnimSaves', parentId: 'root', anchored: false, position: [-1, 0, 0] }),
    ],
    animations: [
      {
        id: 'clip1',
        name: 'Flap',
        duration: 1,
        fps: 30,
        loop: true,
        tracks: [
          {
            partId: 'c1',
            keyframes: [
              { id: 'k1', time: 0, easingStyle: 'Linear', easingDirection: 'Out', rotation: [0, 0, 0] },
              { id: 'k2', time: 1, easingStyle: 'Linear', easingDirection: 'Out', rotation: [0, 45, 0] },
            ],
          },
          {
            partId: 'c2',
            keyframes: [
              { id: 'k3', time: 0, easingStyle: 'Linear', easingDirection: 'Out', rotation: [0, 0, 0] },
              { id: 'k4', time: 1, easingStyle: 'Linear', easingDirection: 'Out', rotation: [0, -45, 0] },
            ],
          },
        ],
      },
      {
        id: 'clip2',
        name: 'Flap',
        duration: 1,
        fps: 30,
        loop: false,
        tracks: [
          {
            partId: 'c3',
            keyframes: [
              { id: 'k5', time: 0, easingStyle: 'Linear', easingDirection: 'Out', rotation: [0, 0, 0] },
              { id: 'k6', time: 1, easingStyle: 'Linear', easingDirection: 'Out', rotation: [15, 0, 0] },
            ],
          },
        ],
      },
    ],
  };

  const report = validateModelForRoblox(dupModel);
  assert.ok(
    report.issues.some((i) => i.severity === 'warning' && i.message.includes('duplicate part name')),
    'validateModelForRoblox should warn about duplicate part names'
  );

  // 1. RBXMX: unique BasePart names, Motor6D names, Pose names, and KeyframeSequence names
  const xml = generateRbxmx(dupModel, { scaleMode: 'studs' });
  assert.ok(xml.includes('<string name="Name">Wing</string>'));
  assert.ok(xml.includes('<string name="Name">wing_2</string>'));
  assert.ok(xml.includes('<string name="Name">WING_3</string>'));
  assert.ok(xml.includes('<string name="Name">AnimSaves_2</string>'));
  assert.ok(xml.includes('<string name="Name">Joint_wing_2</string>'));
  assert.ok(xml.includes('<string name="Name">Joint_WING_3</string>'));
  assert.ok(xml.includes('<string name="Name">Joint_AnimSaves_2</string>'));
  assert.ok(xml.includes('<string name="Name">Flap_2</string>'));

  // Verify no two BasePart items share a case-insensitive Name
  const basePartNames = [...xml.matchAll(/<Item class="(?:Part|WedgePart|CornerWedgePart)"[^>]*>\s*<Properties>\s*<string name="Name">([^<]+)<\/string>/g)].map(
    (m) => m[1].toLowerCase()
  );
  assert.equal(basePartNames.length, 4);
  assert.equal(new Set(basePartNames).size, 4);

  // 2. Luau Builder
  const lua = generateLuauScript(dupModel, { scaleMode: 'studs' });
  assert.ok(lua.includes('.Name = "Wing"'));
  assert.ok(lua.includes('.Name = "wing_2"'));
  assert.ok(lua.includes('.Name = "WING_3"'));
  assert.ok(lua.includes('.Name = "AnimSaves_2"'));

  // 3. Luau Single & Multi-Stage Animations
  const luaAnim = generateLuauAnimationScript(dupModel, 'clip1', { scaleMode: 'studs' });
  assert.ok(luaAnim.includes('model:FindFirstChild("wing_2", true)'));
  assert.ok(luaAnim.includes('model:FindFirstChild("WING_3", true)'));

  const luaMulti = generateLuauMultiStageScript(dupModel, { scaleMode: 'studs' });
  assert.ok(luaMulti.includes('model:FindFirstChild("wing_2", true)'));
  assert.ok(luaMulti.includes('model:FindFirstChild("WING_3", true)'));
  assert.ok(luaMulti.includes('model:FindFirstChild("AnimSaves_2", true)'));

  // 4. OBJ
  const { obj } = generateObjAndMtl(dupModel, { scaleMode: 'studs' });
  const objNames = [...obj.matchAll(/^o (.+)$/gm)].map((m) => m[1].toLowerCase());
  assert.deepEqual(objNames, ['wing', 'wing_2', 'wing_3', 'animsaves_2']);

  // 5. GLB binary JSON chunk inspection (polyfill FileReader in Node for GLTFExporter)
  const hadFileReader = 'FileReader' in globalThis;
  if (!hadFileReader) {
    (globalThis as Record<string, unknown>).FileReader = class {
      result: ArrayBuffer | null = null;
      onloadend: (() => void) | null = null;
      readAsArrayBuffer(blob: Blob) {
        blob.arrayBuffer().then((buf) => {
          this.result = buf;
          this.onloadend?.();
        });
      }
    };
  }
  try {
    const glbBuffer = await exportModelToGlb(dupModel, { scaleMode: 'studs' });
    const view = new DataView(glbBuffer);
    const jsonChunkLen = view.getUint32(12, true);
    const jsonBytes = new Uint8Array(glbBuffer, 20, jsonChunkLen);
    const gltf = JSON.parse(new TextDecoder().decode(jsonBytes));
    const gltfNodeNames = (gltf.nodes as Array<{ name?: string }>)
      .map((n) => n.name?.toLowerCase())
      .filter(Boolean);
    assert.equal(
      new Set(gltfNodeNames).size,
      gltfNodeNames.length,
      'All glTF node names in .glb must be unique'
    );
  } finally {
    if (!hadFileReader) {
      delete (globalThis as Record<string, unknown>).FileReader;
    }
  }
});

test('generateRbxmx emits Package Folder, Attachments, FX, Audio Folder, Scripts Folder, Priorities, Weights, and KeyframeMarkers', () => {
  const dragon = MODEL_PRESETS.find((p) => p.id === 'jade-dragon')!.model;
  const xml = generateRbxmx(dragon, {
    scaleMode: 'studs',
    centerAtOrigin: true,
    exportAsPackage: true,
    includeAudioFolder: true,
    includeScriptsFolder: true,
  });

  // Root Package Folder, Audio Folder, Scripts Folder
  assert.ok(xml.includes('<Item class="Folder" referent="RBXPKG0001">'));
  assert.ok(xml.includes('<string name="Name">JadeBlockyDragon_Package</string>'));
  assert.ok(xml.includes('<string name="Name">Audio</string>'));
  assert.ok(xml.includes('<string name="Name">Scripts</string>'));

  // Attachments, ParticleEmitter, PointLight, Trail with valid Attachment0/1 Refs
  assert.ok(xml.includes('<Item class="Attachment"'));
  assert.ok(xml.includes('<string name="Name">MouthEmitter</string>'));
  assert.ok(xml.includes('<Item class="ParticleEmitter"'));
  assert.ok(xml.includes('<string name="Name">DragonBreathParticles</string>'));
  assert.ok(xml.includes('<Item class="PointLight"'));
  assert.ok(xml.includes('<Item class="Trail"'));
  const trailAtt0 = xml.match(/<Ref name="Attachment0">([^<]+)<\/Ref>/);
  const trailAtt1 = xml.match(/<Ref name="Attachment1">([^<]+)<\/Ref>/);
  assert.ok(trailAtt0 && trailAtt0[1] !== 'null');
  assert.ok(trailAtt1 && trailAtt1[1] !== 'null');
  assert.notEqual(trailAtt0[1], trailAtt1[1]);
  assert.ok(xml.includes(`referent="${trailAtt0[1]}"`), 'Trail Attachment0 must reference an emitted Attachment');
  assert.ok(xml.includes(`referent="${trailAtt1[1]}"`), 'Trail Attachment1 must reference an emitted Attachment');

  // Audio Sound instances
  assert.ok(xml.includes('<Item class="Sound"'));
  assert.ok(xml.includes('<string name="Name">DragonRoar</string>'));

  // Framework Scripts
  assert.ok(xml.includes('<Item class="ModuleScript" referent="RBXMOD_1">'));
  assert.ok(xml.includes('<string name="Name">StageConfig</string>'));
  assert.ok(xml.includes('<string name="Name">FXController</string>'));
  assert.ok(xml.includes('<string name="Name">SoundController</string>'));
  assert.ok(xml.includes('<string name="Name">RigAnimator</string>'));
  assert.ok(xml.includes('<Item class="Script" referent="RBXRUNSCRIPT01">'));
  assert.ok(xml.includes('<string name="Name">ModelRuntime</string>'));

  // KeyframeSequence Priority tokens (Idle=0, Movement=2, Action2=5, Action3=6) + Pose Weight + KeyframeMarkers
  assert.ok(xml.includes('<token name="Priority">0</token>'));
  assert.ok(xml.includes('<token name="Priority">2</token>'));
  assert.ok(xml.includes('<token name="Priority">5</token>'));
  assert.ok(xml.includes('<token name="Priority">6</token>'));
  assert.ok(xml.includes('<float name="Weight">'));
  assert.ok(xml.includes('<Item class="KeyframeMarker"'));
  assert.ok(xml.includes('<string name="Name">BreathStart</string>'));
  assert.ok(xml.includes('<string name="Name">ClawSlash</string>'));
});

test('generateFrameworkScripts returns all 5 Luau modules wired with GetMarkerReachedSignal and Motor6D.Transform', () => {
  const dragon = MODEL_PRESETS.find((p) => p.id === 'jade-dragon')!.model;
  const modules = generateFrameworkScripts(dragon, { scaleMode: 'studs' });

  assert.ok(modules.StageConfig.includes('StageConfig.Stages'));
  assert.ok(modules.StageConfig.includes('DeltaTransform = CFrame.new'));
  assert.ok(modules.StageConfig.includes('Enum.AnimationPriority.Action3'));

  assert.ok(modules.FXController.includes('FXController.MarkerBindings'));
  assert.ok(modules.FXController.includes('ParticleEmitter'));
  assert.ok(modules.FXController.includes('emitter:Emit'));

  assert.ok(modules.SoundController.includes('SoundController.MarkerBindings'));
  assert.ok(modules.SoundController.includes('FindFirstChild("Audio")'));

  assert.ok(modules.RigAnimator.includes('GetMarkerReachedSignal'));
  assert.ok(modules.RigAnimator.includes('joint.Transform = deltaCf'));

  assert.ok(modules.ModelRuntime.includes('GetAttributeChangedSignal("Stage")'));
  assert.ok(modules.ModelRuntime.includes('animator:OnMarkerReached'));
});

test('validateModelForRoblox reports FX/Audio/Marker counts and warns on broken Trail attachments', () => {
  const dragon = MODEL_PRESETS.find((p) => p.id === 'jade-dragon')!.model;
  const report = validateModelForRoblox(dragon);
  assert.ok(report.attachmentCount >= 6);
  assert.ok(report.effectCount >= 5);
  assert.ok(report.soundCount >= 4);
  assert.ok(report.markerCount >= 8);

  const brokenTrailModel: StudioSceneModel = {
    name: 'BrokenTrailTest',
    primaryPartId: 'p1',
    parts: [
      samplePart({
        id: 'p1',
        name: 'Body',
        effects: [
          {
            id: 'tr_broken',
            kind: 'Trail',
            name: 'MissingAttTrail',
            enabled: true,
            attachment0Id: 'missing_0',
            attachment1Id: 'missing_1',
            color: '#FFFFFF',
            endColor: '#000000',
            transparencyStart: 0,
            transparencyEnd: 1,
            widthScaleStart: 1,
            widthScaleEnd: 0,
            lifetime: 0.4,
            minLength: 0.1,
            lightEmission: 0.5,
          },
        ],
      }),
    ],
  };

  const brokenReport = validateModelForRoblox(brokenTrailModel);
  assert.ok(
    brokenReport.issues.some((i) => i.severity === 'warning' && i.message.includes('Trail effect(s) require two distinct valid Attachments'))
  );
});

import { generateRojoProjectBundle } from './rojoPackager';
import { getDefaultScriptsForModel } from './scriptPresets';

test('generateRbxmx exports authored Roblox Service scripts, remotes, and values into service containers', () => {
  const dragonBase = MODEL_PRESETS.find((p) => p.id === 'jade-dragon')!.model;
  const scripts = getDefaultScriptsForModel(dragonBase);
  const dragonWithScripts: StudioSceneModel = { ...dragonBase, scripts };

  const report = validateModelForRoblox(dragonWithScripts);
  assert.equal(report.scriptCount, scripts.length);

  const xml = generateRbxmx(dragonWithScripts, {
    scaleMode: 'studs',
    centerAtOrigin: true,
    exportAsPackage: true,
    includeScriptsFolder: true,
  });

  assert.ok(xml.includes('<Item class="ReplicatedStorage"'));
  assert.ok(xml.includes('<Item class="ServerScriptService"'));
  assert.ok(xml.includes('<Item class="StarterPlayer"'));
  assert.ok(xml.includes('<Item class="StarterPlayerScripts"'));
  assert.ok(xml.includes('<Item class="RemoteEvent"'));
  assert.ok(xml.includes('<string name="Name">BreathEvent</string>'));
  assert.ok(xml.includes('<string name="Name">AttackCombo</string>'));
  assert.ok(xml.includes('<string name="Name">DragonServerHandler</string>'));
  assert.ok(xml.includes('<Item class="LocalScript"'));
  assert.ok(xml.includes('<string name="Name">DragonClientControls</string>'));
});

test('generateRojoProjectBundle generates valid Rojo 7 project JSON, Luau scripts, RBXMX, OBJ/MTL, and snapshot', async () => {
  const dragonBase = MODEL_PRESETS.find((p) => p.id === 'jade-dragon')!.model;
  const dragon: StudioSceneModel = {
    ...dragonBase,
    scripts: getDefaultScriptsForModel(dragonBase),
  };

  const files = await generateRojoProjectBundle(dragon, {
    includeRbxmx: true,
    includeRojoScripts: true,
    includeObjMtl: true,
    includeGlb: false,
    includeStudforgeJson: true,
  });

  const paths = new Set(files.map((f) => f.path));
  assert.ok(paths.has('default.project.json'));
  assert.ok(paths.has('README.md'));
  assert.ok(paths.has('model/JadeBlockyDragon_Package.rbxmx'));
  assert.ok(paths.has('model/JadeBlockyDragon.obj'));
  assert.ok(paths.has('model/JadeBlockyDragon.mtl'));
  assert.ok(paths.has('model/JadeBlockyDragon.studforge.json'));
  assert.ok(paths.has('src/ReplicatedStorage/Modules/AttackCombo.luau'));
  assert.ok(paths.has('src/ServerScriptService/DragonServerHandler.server.luau'));
  assert.ok(paths.has('src/StarterPlayer/StarterPlayerScripts/DragonClientControls.client.luau'));
  assert.ok(paths.has('src/ReplicatedStorage/Remotes/BreathEvent.meta.json'));

  const rojoEntry = files.find((f) => f.path === 'default.project.json')!;
  const rojoJson = JSON.parse(rojoEntry.content);
  assert.equal(rojoJson.name, 'JadeBlockyDragon');
  assert.equal(rojoJson.tree.$className, 'DataModel');
  assert.equal(
    rojoJson.tree.Workspace.JadeBlockyDragon.ModelPackage.$path,
    'model/JadeBlockyDragon_Package.rbxmx'
  );
  assert.equal(
    rojoJson.tree.Workspace.JadeBlockyDragon.Scripts.$path,
    'src/Workspace/JadeBlockyDragon/Scripts'
  );
  assert.equal(
    rojoJson.tree.ServerScriptService.$path,
    'src/ServerScriptService'
  );
});

test('Puddle Crab preset has pure 3D rig anatomy, Idle + Scuttle Walk animations, zero FX/scripts, and exports to RBXMX', () => {
  assert.equal(MODEL_PRESETS[0].id, 'jade-dragon');
  const crab = MODEL_PRESETS.find((p) => p.id === 'puddle-crab');
  assert.ok(crab, 'puddle-crab preset should exist in MODEL_PRESETS');
  assert.equal(crab.label, 'Puddle Crab');
  assert.equal(crab.model.name, 'PuddleCrab');
  assert.deepEqual(crab.model.scripts, [], 'Puddle Crab must have empty scripts array (pure 3D rig)');

  const partNames = new Set(crab.model.parts.map((p) => p.name));
  const expectedAnatomy = [
    'CarapaceCore',
    'CarapaceUpperCap',
    'UnderbellyPlate',
    'MouthFrownTop',
    'EyeStalk_L',
    'EyeStalk_R',
    'ArmShoulder_L',
    'ClawWrist_L',
    'PincerUpper_L',
    'PincerLower_L',
    'ArmShoulder_R',
    'ClawWrist_R',
    'PincerUpper_R',
    'PincerLower_R',
    'LegHip_FL',
    'LegShin_FL',
    'LegTip_FL',
    'LegHip_MR',
    'LegShin_MR',
    'LegTip_MR',
    'LegHip_BL',
    'LegShin_BL',
    'LegTip_BL',
    'LegHip_BR',
    'LegShin_BR',
    'LegTip_BR',
  ];
  for (const name of expectedAnatomy) {
    assert.ok(partNames.has(name), `Puddle Crab should include ${name}`);
  }

  for (const part of crab.model.parts) {
    assert.equal(part.effects?.length ?? 0, 0, `${part.name} must not contain FX`);
    assert.equal(part.sounds?.length ?? 0, 0, `${part.name} must not contain sounds`);
  }

  const animations = crab.model.animations ?? [];
  assert.deepEqual(
    animations.map((c) => c.name),
    ['Idle', 'Scuttle Walk']
  );
  for (const clip of animations) {
    assert.equal(clip.markers?.length ?? 0, 0, `${clip.name} must have no FX/sound markers`);
  }

  const report = validateModelForRoblox(crab.model);
  assert.equal(report.effectCount, 0);
  assert.equal(report.soundCount, 0);
  assert.equal(report.markerCount, 0);
  assert.equal(report.scriptCount, 0);
  assert.equal(report.rbxmxReady, true);
  assert.ok(report.boundingSizeStuds[1] > 1, 'Puddle Crab height must exceed 1 stud');

  const xml = generateRbxmx(crab.model, { scaleMode: 'studs', centerAtOrigin: true });
  assert.ok(xml.includes('<string name="Name">Idle</string>'));
  assert.ok(xml.includes('<string name="Name">Scuttle Walk</string>'));
  assert.ok(xml.includes('<Item class="Motor6D"'));
});

test('Puddle Snail preset has pure 3D rig anatomy, Idle + Glide Crawl animations, zero FX/scripts, and exports to RBXMX', () => {
  assert.equal(MODEL_PRESETS[0].id, 'jade-dragon');
  const snail = MODEL_PRESETS.find((p) => p.id === 'puddle-snail');
  assert.ok(snail, 'puddle-snail preset should exist in MODEL_PRESETS');
  assert.equal(snail.label, 'Puddle Snail');
  assert.equal(snail.model.name, 'PuddleSnail');
  assert.deepEqual(snail.model.scripts, [], 'Puddle Snail must have empty scripts array (pure 3D rig)');

  const partNames = new Set(snail.model.parts.map((p) => p.name));
  const expectedAnatomy = [
    'BodyFootCore',
    'TailTip',
    'NeckSegment',
    'HeadCube',
    'EyeStalk_L',
    'EyeTip_L',
    'EyeStalk_R',
    'EyeTip_R',
    'Feeler_L',
    'Feeler_R',
    'ShellBase',
    'ShellTopCap',
    'ShellFrontLip',
    'ShellWhorlDrum_L',
    'ShellWhorlDrum_R',
    'ShellMoss_FrontTop',
  ];
  for (const name of expectedAnatomy) {
    assert.ok(partNames.has(name), `Puddle Snail should include ${name}`);
  }

  for (const part of snail.model.parts) {
    assert.equal(part.effects?.length ?? 0, 0, `${part.name} must not contain FX`);
    assert.equal(part.sounds?.length ?? 0, 0, `${part.name} must not contain sounds`);
  }

  const animations = snail.model.animations ?? [];
  assert.deepEqual(
    animations.map((c) => c.name),
    ['Idle', 'Glide Crawl']
  );
  for (const clip of animations) {
    assert.equal(clip.markers?.length ?? 0, 0, `${clip.name} must have no FX/sound markers`);
  }

  const report = validateModelForRoblox(snail.model);
  assert.equal(report.effectCount, 0);
  assert.equal(report.soundCount, 0);
  assert.equal(report.markerCount, 0);
  assert.equal(report.scriptCount, 0);
  assert.equal(report.rbxmxReady, true);
  assert.ok(report.boundingSizeStuds[1] > 1, 'Puddle Snail height must exceed 1 stud');

  const xml = generateRbxmx(snail.model, { scaleMode: 'studs', centerAtOrigin: true });
  assert.ok(xml.includes('<string name="Name">Idle</string>'));
  assert.ok(xml.includes('<string name="Name">Glide Crawl</string>'));
  assert.ok(xml.includes('<Item class="Motor6D"'));
});

test('Soggy Tadpole preset has pure 3D rig anatomy, Idle + Swim Wiggle animations, zero FX/scripts, and exports to RBXMX', () => {
  assert.equal(MODEL_PRESETS[0].id, 'jade-dragon');
  const tadpole = MODEL_PRESETS.find((p) => p.id === 'soggy-tadpole');
  assert.ok(tadpole, 'soggy-tadpole preset should exist in MODEL_PRESETS');
  assert.equal(tadpole.label, 'Soggy Tadpole');
  assert.equal(tadpole.model.name, 'SoggyTadpole');
  assert.deepEqual(tadpole.model.scripts, [], 'Soggy Tadpole must have empty scripts array (pure 3D rig)');

  const partNames = new Set(tadpole.model.parts.map((p) => p.name));
  const expectedAnatomy = [
    'BodyCore',
    'BodyTopCap',
    'SnoutBlock',
    'UnderbellyPlate',
    'LowerJawLip',
    'EyeBase_L',
    'EyeGlint_L',
    'EyeBase_R',
    'EyeGlint_R',
    'DewDrop_TopL',
    'DewDrop_TopR',
    'DewDrop_CheekL',
    'DewDrop_CheekR',
    'FrontLimb_L',
    'FrontWeb_L',
    'FrontLimb_R',
    'FrontWeb_R',
    'HindLimb_L',
    'HindWeb_L',
    'HindLimb_R',
    'HindWeb_R',
    'TailBase',
    'TailMid',
    'TailTip',
    'TailMidFinEdge',
  ];
  for (const name of expectedAnatomy) {
    assert.ok(partNames.has(name), `Soggy Tadpole should include ${name}`);
  }

  for (const part of tadpole.model.parts) {
    assert.equal(part.effects?.length ?? 0, 0, `${part.name} must not contain FX`);
    assert.equal(part.sounds?.length ?? 0, 0, `${part.name} must not contain sounds`);
  }

  const animations = tadpole.model.animations ?? [];
  assert.deepEqual(
    animations.map((c) => c.name),
    ['Idle', 'Swim Wiggle']
  );
  for (const clip of animations) {
    assert.equal(clip.markers?.length ?? 0, 0, `${clip.name} must have no FX/sound markers`);
  }

  const report = validateModelForRoblox(tadpole.model);
  assert.equal(report.effectCount, 0);
  assert.equal(report.soundCount, 0);
  assert.equal(report.markerCount, 0);
  assert.equal(report.scriptCount, 0);
  assert.equal(report.rbxmxReady, true);
  assert.ok(report.boundingSizeStuds[1] > 1, 'Soggy Tadpole height must exceed 1 stud');

  const xml = generateRbxmx(tadpole.model, { scaleMode: 'studs', centerAtOrigin: true });
  assert.ok(xml.includes('<string name="Name">Idle</string>'));
  assert.ok(xml.includes('<string name="Name">Swim Wiggle</string>'));
  assert.ok(xml.includes('<Item class="Motor6D"'));
});

test('Bubble Guppy preset has pure 3D rig anatomy, Idle + Bubble Swim animations, zero FX/scripts, and exports to RBXMX', () => {
  assert.equal(MODEL_PRESETS[0].id, 'jade-dragon');
  const guppy = MODEL_PRESETS.find((p) => p.id === 'bubble-guppy');
  assert.ok(guppy, 'bubble-guppy preset should exist in MODEL_PRESETS');
  assert.equal(guppy.label, 'Bubble Guppy');
  assert.equal(guppy.model.name, 'BubbleGuppy');
  assert.deepEqual(guppy.model.scripts, [], 'Bubble Guppy must have empty scripts array (pure 3D rig)');

  const partNames = new Set(guppy.model.parts.map((p) => p.name));
  const expectedAnatomy = [
    'BodyCore',
    'BodyTopCap',
    'CheekPuff_L',
    'CheekPuff_R',
    'MouthRingHub',
    'MouthCavity',
    'EyeBase_L',
    'EyeGlint_L',
    'EyeBase_R',
    'EyeGlint_R',
    'DorsalFinBase',
    'DorsalFinCrest',
    'PectoralFin_L',
    'PectoralFin_R',
    'PelvicFin_L',
    'PelvicFin_R',
    'TailPeduncle',
    'AnalFin',
    'TailFanHub',
    'TailUpperLobeInner',
    'TailUpperLobeTip',
    'TailLowerLobeInner',
    'TailLowerLobeTip',
    'BubbleCube_Mouth',
  ];
  for (const name of expectedAnatomy) {
    assert.ok(partNames.has(name), `Bubble Guppy should include ${name}`);
  }

  for (const part of guppy.model.parts) {
    assert.equal(part.effects?.length ?? 0, 0, `${part.name} must not contain FX`);
    assert.equal(part.sounds?.length ?? 0, 0, `${part.name} must not contain sounds`);
  }

  const animations = guppy.model.animations ?? [];
  assert.deepEqual(
    animations.map((c) => c.name),
    ['Idle', 'Bubble Swim']
  );
  for (const clip of animations) {
    assert.equal(clip.markers?.length ?? 0, 0, `${clip.name} must have no FX/sound markers`);
  }

  const report = validateModelForRoblox(guppy.model);
  assert.equal(report.effectCount, 0);
  assert.equal(report.soundCount, 0);
  assert.equal(report.markerCount, 0);
  assert.equal(report.scriptCount, 0);
  assert.equal(report.rbxmxReady, true);
  assert.ok(report.boundingSizeStuds[1] > 1, 'Bubble Guppy height must exceed 1 stud');

  const xml = generateRbxmx(guppy.model, { scaleMode: 'studs', centerAtOrigin: true });
  assert.ok(xml.includes('<string name="Name">Idle</string>'));
  assert.ok(xml.includes('<string name="Name">Bubble Swim</string>'));
  assert.ok(xml.includes('<Item class="Motor6D"'));
});



