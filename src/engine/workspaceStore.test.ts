import test from 'node:test';
import assert from 'node:assert/strict';
import { MAP_PRESETS } from './mapPresets';
import { MODEL_PRESETS } from './presets';
import {
  addScriptToFolder,
  createDefaultWorkspaceRegistry,
  createFolder,
  createWorkspace,
  deleteFolder,
  deleteItemFromFolder,
  deleteWorkspace,
  generateWorkspaceRbxlx,
  generateWorkspaceRojoBundle,
  getActiveFolder,
  getActiveWorkspace,
  getFolderPathSegments,
  moveItemBetweenFolders,
  renameFolder,
  renameItemInFolder,
  renameWorkspace,
  saveMapToFolder,
  saveModelToFolder,
  selectWorkspace,
  updateScriptInFolder,
  validateWorkspaceForRoblox,
} from './workspaceStore';

test('default workspace stores multiple folders containing scripts, models, and maps', () => {
  const reg = createDefaultWorkspaceRegistry();
  const ws = getActiveWorkspace(reg);
  assert.ok(ws.folders.length >= 2);
  for (const fld of ws.folders) {
    assert.ok(fld.scripts.length > 0, `Folder ${fld.name} should have scripts`);
    assert.ok(fld.models.length > 0, `Folder ${fld.name} should have models`);
    assert.ok(fld.maps.length > 0, `Folder ${fld.name} should have maps`);
  }
});

test('workspace lifecycle: create, rename, select, and protect last workspace from delete', () => {
  let reg = createDefaultWorkspaceRegistry();
  const firstId = reg.activeWorkspaceId;

  reg = createWorkspace(reg, 'RPG Kingdom', 'Medieval RPG');
  assert.equal(reg.workspaces.length, 2);
  const secondId = reg.activeWorkspaceId;
  assert.notEqual(secondId, firstId);
  assert.equal(getActiveWorkspace(reg).name, 'RPG Kingdom');

  reg = renameWorkspace(reg, secondId, 'Fantasy RPG');
  assert.equal(getActiveWorkspace(reg).name, 'Fantasy RPG');

  reg = selectWorkspace(reg, firstId);
  assert.equal(reg.activeWorkspaceId, firstId);

  reg = deleteWorkspace(reg, secondId);
  assert.equal(reg.workspaces.length, 1);

  // Attempting to delete last workspace keeps it intact
  const protectedReg = deleteWorkspace(reg, firstId);
  assert.equal(protectedReg.workspaces.length, 1);
});

test('custom folders support multi-folder storage, nesting, renaming, and cascading delete', () => {
  let reg = createDefaultWorkspaceRegistry();
  const wsId = reg.activeWorkspaceId;

  reg = createFolder(reg, wsId, 'Dungeon Pack');
  const dungeonFolder = getActiveFolder(reg)!;
  assert.equal(dungeonFolder.name, 'Dungeon Pack');

  reg = createFolder(reg, wsId, 'Trap Rooms', dungeonFolder.id);
  const trapFolder = getActiveFolder(reg)!;
  assert.equal(trapFolder.parentFolderId, dungeonFolder.id);
  assert.deepEqual(
    getFolderPathSegments(getActiveWorkspace(reg).folders, trapFolder.id).map((f) => f.name),
    ['Dungeon Pack', 'Trap Rooms']
  );

  reg = renameFolder(reg, wsId, trapFolder.id, 'Spike Traps');
  assert.equal(getActiveFolder(reg)!.name, 'Spike Traps');

  // Deleting parent folder removes descendant folder cleanly
  const countBefore = getActiveWorkspace(reg).folders.length;
  reg = deleteFolder(reg, wsId, dungeonFolder.id);
  assert.equal(getActiveWorkspace(reg).folders.length, countBefore - 2);
});

test('folder stores, updates, renames, moves, and deletes scripts, models, and maps', () => {
  let reg = createDefaultWorkspaceRegistry();
  const wsId = reg.activeWorkspaceId;
  reg = createFolder(reg, wsId, 'FolderA');
  const folderAId = reg.activeFolderId!;
  reg = createFolder(reg, wsId, 'FolderB');
  const folderBId = reg.activeFolderId!;

  // Save model, map, and script into FolderA
  const modRes = saveModelToFolder(reg, wsId, folderAId, MODEL_PRESETS[2].model);
  reg = modRes.nextState;

  const mapRes = saveMapToFolder(reg, wsId, folderAId, MAP_PRESETS[2].build());
  reg = mapRes.nextState;

  const scrRes = addScriptToFolder(reg, wsId, folderAId, {
    name: 'TrapTrigger',
    className: 'Script',
    service: 'ServerScriptService',
    source: 'print("Trap armed")',
    disabled: false,
    runContext: 'Server',
  });
  reg = scrRes.nextState;

  reg = updateScriptInFolder(reg, wsId, folderAId, scrRes.savedScriptId, {
    source: 'print("Updated trap")',
  });
  reg = renameItemInFolder(reg, wsId, folderAId, 'model', modRes.savedItemId, 'SentinelTurret');

  let folderA = getActiveWorkspace(reg).folders.find((f) => f.id === folderAId)!;
  assert.equal(folderA.models.length, 1);
  assert.equal(folderA.models[0].name, 'SentinelTurret');
  assert.equal(folderA.maps.length, 1);
  assert.equal(folderA.scripts.length, 1);
  assert.equal(folderA.scripts[0].source, 'print("Updated trap")');

  // Move script from FolderA to FolderB
  reg = moveItemBetweenFolders(reg, wsId, folderAId, folderBId, 'script', scrRes.savedScriptId);
  folderA = getActiveWorkspace(reg).folders.find((f) => f.id === folderAId)!;
  const folderB = getActiveWorkspace(reg).folders.find((f) => f.id === folderBId)!;
  assert.equal(folderA.scripts.length, 0);
  assert.equal(folderB.scripts.length, 1);

  // Delete model from FolderA
  reg = deleteItemFromFolder(reg, wsId, folderAId, 'model', modRes.savedItemId);
  folderA = getActiveWorkspace(reg).folders.find((f) => f.id === folderAId)!;
  assert.equal(folderA.models.length, 0);
});

test('generateWorkspaceRbxlx and generateWorkspaceRojoBundle preserve custom folders with scripts, models, and maps', () => {
  let reg = createDefaultWorkspaceRegistry();
  const wsId = reg.activeWorkspaceId;
  reg = createFolder(reg, wsId, 'CustomDungeon');
  const fldId = reg.activeFolderId!;

  reg = saveModelToFolder(reg, wsId, fldId, MODEL_PRESETS[0].model).nextState;
  reg = saveMapToFolder(reg, wsId, fldId, MAP_PRESETS[0].build()).nextState;
  reg = addScriptToFolder(reg, wsId, fldId, {
    name: 'DungeonInit',
    className: 'Script',
    service: 'ServerScriptService',
    source: 'print("CustomDungeon started")',
    disabled: false,
    runContext: 'Server',
  }).nextState;

  const ws = getActiveWorkspace(reg);
  const report = validateWorkspaceForRoblox(ws);
  assert.equal(report.rbxlxReady, true);
  assert.ok(report.folderCount >= 3);
  assert.ok(report.modelCount >= 3);
  assert.ok(report.mapCount >= 3);
  assert.ok(report.scriptCount >= 5);

  const xml = generateWorkspaceRbxlx(ws);
  assert.ok(xml.startsWith('<roblox '));
  assert.ok(xml.endsWith('</roblox>'));
  assert.ok(xml.includes('<Item class="Folder"'));
  assert.ok(xml.includes('<string name="Name">CustomDungeon</string>'));
  assert.ok(xml.includes('<string name="Name">DungeonInit</string>'));

  const bundle = generateWorkspaceRojoBundle(ws);
  const paths = bundle.map((f) => f.path);
  assert.ok(paths.includes('default.project.json'));
  assert.ok(paths.some((p) => p.endsWith('.rbxlx')));
  assert.ok(paths.some((p) => p.endsWith('.studforge-workspace.json')));
  assert.ok(paths.some((p) => p.includes('CustomDungeon/models/') && p.endsWith('_Package.rbxmx')));
  assert.ok(paths.some((p) => p.includes('CustomDungeon/maps/') && p.endsWith('.studforge-map.json')));
  assert.ok(paths.includes('src/ServerScriptService/CustomDungeon/DungeonInit.server.luau'));
});
