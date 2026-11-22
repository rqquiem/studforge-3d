import {
  RefGenerator,
  emitMapFolderXml,
  emitRiggedStudioModelXml,
  emitScriptItemXml,
} from './mapExporter';
import { MAP_PRESETS } from './mapPresets';
import { getMapServiceScriptNodes } from './mapScripts';
import { StudioMapScene } from './mapTypes';
import { MODEL_PRESETS } from './presets';
import { escapeXml, generateRbxmx, sanitizeIdentifier } from './robloxExporter';
import { StudioSceneModel, StudioScriptNode } from './robloxTypes';
import { SyncFileEntry } from './rojoPackager';
import { getDefaultScriptsForModel } from './scriptPresets';
import {
  FOLDER_ACCENT_COLORS,
  StudioWorkspace,
  WorkspaceAssetKind,
  WorkspaceFolder,
  WorkspaceMapItem,
  WorkspaceModelItem,
  WorkspaceRegistryState,
  WorkspaceValidationIssue,
  WorkspaceValidationReport,
} from './workspaceTypes';

export const WORKSPACE_STORAGE_KEY = 'studforge3d.workspaces.v1';

function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function createDefaultWorkspaceRegistry(): WorkspaceRegistryState {
  const now = Date.now();
  const dragonModel = deepClone(MODEL_PRESETS[0].model);
  const beaconModel = deepClone(MODEL_PRESETS[1]?.model ?? MODEL_PRESETS[0].model);
  const craterMap = MAP_PRESETS[0].build();
  const obbyMap = MAP_PRESETS[1]?.build() ?? MAP_PRESETS[0].build();

  const dragonScripts = deepClone(
    dragonModel.scripts ?? getDefaultScriptsForModel(dragonModel)
  ).slice(0, 3);

  const folderCore: WorkspaceFolder = {
    id: 'fld_core_systems',
    name: 'Core Gameplay',
    parentFolderId: null,
    color: FOLDER_ACCENT_COLORS[0],
    createdAt: now,
    updatedAt: now,
    scripts: [
      {
        id: 'ws_scr_welcome',
        name: 'WorkspaceBootstrap',
        className: 'Script',
        service: 'ServerScriptService',
        source: `--!strict
-- Core Gameplay / WorkspaceBootstrap
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

Players.PlayerAdded:Connect(function(player)
\tprint("[StudForge Workspace] Player joined:", player.Name)
end)
`,
        disabled: false,
        runContext: 'Server',
      },
      {
        id: 'ws_scr_utils',
        name: 'SharedConstants',
        className: 'ModuleScript',
        service: 'ReplicatedStorage',
        source: `--!strict
-- Core Gameplay / SharedConstants
return {
\tGameTitle = "StudForge Adventure",
\tDefaultWalkSpeed = 18,
\tStartingCoins = 25,
}
`,
        disabled: false,
      },
      ...dragonScripts,
    ],
    models: [
      {
        id: 'ws_mod_beacon',
        name: beaconModel.name,
        updatedAt: now,
        notes: 'Orbital checkpoint & hub landmark rig',
        model: beaconModel,
      },
    ],
    maps: [
      {
        id: 'ws_map_obby',
        name: obbyMap.name,
        updatedAt: now,
        notes: 'Skyline Obby Islands starter course',
        map: obbyMap,
      },
    ],
  };

  const folderBosses: WorkspaceFolder = {
    id: 'fld_boss_encounters',
    name: 'Boss & Dragon Encounters',
    parentFolderId: null,
    color: FOLDER_ACCENT_COLORS[1],
    createdAt: now,
    updatedAt: now,
    scripts: [
      {
        id: 'ws_scr_boss_ai',
        name: 'DragonBossController',
        className: 'Script',
        service: 'ServerScriptService',
        source: `--!strict
-- Boss & Dragon Encounters / DragonBossController
local CollectionService = game:GetService("CollectionService")

for _, boss in ipairs(CollectionService:GetTagged("BossRig")) do
\tprint("[BossController] Initialized boss rig:", boss.Name)
end
`,
        disabled: false,
        runContext: 'Server',
      },
    ],
    models: [
      {
        id: 'ws_mod_dragon',
        name: dragonModel.name,
        updatedAt: now,
        notes: 'Articulated 4-stage Motor6D boss rig',
        model: dragonModel,
      },
    ],
    maps: [
      {
        id: 'ws_map_crater',
        name: craterMap.name,
        updatedAt: now,
        notes: "Dragon's Crater caldera boss arena",
        map: craterMap,
      },
    ],
  };

  const defaultWorkspace: StudioWorkspace = {
    id: 'ws_main_studio',
    name: 'Main Studio Workspace',
    description: 'Primary multi-folder Roblox project holding scripts, rigged models, and maps.',
    createdAt: now,
    updatedAt: now,
    folders: [folderCore, folderBosses],
  };

  return {
    activeWorkspaceId: defaultWorkspace.id,
    activeFolderId: folderCore.id,
    workspaces: [defaultWorkspace],
  };
}

export function loadWorkspaceRegistryFromStorage(): WorkspaceRegistryState {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return createDefaultWorkspaceRegistry();
    }
    const raw = window.localStorage.getItem(WORKSPACE_STORAGE_KEY);
    if (!raw) {
      return createDefaultWorkspaceRegistry();
    }
    const parsed = JSON.parse(raw) as Partial<WorkspaceRegistryState>;
    if (!Array.isArray(parsed.workspaces) || parsed.workspaces.length === 0) {
      return createDefaultWorkspaceRegistry();
    }
    const activeWorkspace =
      parsed.workspaces.find((w) => w.id === parsed.activeWorkspaceId) ?? parsed.workspaces[0];
    const activeFolder =
      activeWorkspace.folders.find((f) => f.id === parsed.activeFolderId) ??
      activeWorkspace.folders[0] ??
      null;
    return {
      activeWorkspaceId: activeWorkspace.id,
      activeFolderId: activeFolder?.id ?? null,
      workspaces: parsed.workspaces,
    };
  } catch {
    return createDefaultWorkspaceRegistry();
  }
}

export function saveWorkspaceRegistryToStorage(state: WorkspaceRegistryState): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota errors gracefully
  }
}

export function getActiveWorkspace(state: WorkspaceRegistryState): StudioWorkspace {
  return (
    state.workspaces.find((w) => w.id === state.activeWorkspaceId) ?? state.workspaces[0]
  );
}

export function getActiveFolder(
  state: WorkspaceRegistryState
): WorkspaceFolder | null {
  const ws = getActiveWorkspace(state);
  if (!ws) return null;
  return ws.folders.find((f) => f.id === state.activeFolderId) ?? ws.folders[0] ?? null;
}

export function createWorkspace(
  state: WorkspaceRegistryState,
  name: string,
  description = 'Custom Roblox project workspace'
): WorkspaceRegistryState {
  const cleanName = name.trim() || `Workspace_${state.workspaces.length + 1}`;
  const now = Date.now();
  const starterFolder: WorkspaceFolder = {
    id: uid('fld'),
    name: 'General',
    parentFolderId: null,
    color: FOLDER_ACCENT_COLORS[state.workspaces.length % FOLDER_ACCENT_COLORS.length],
    createdAt: now,
    updatedAt: now,
    scripts: [],
    models: [],
    maps: [],
  };
  const nextWs: StudioWorkspace = {
    id: uid('ws'),
    name: cleanName,
    description,
    createdAt: now,
    updatedAt: now,
    folders: [starterFolder],
  };
  return {
    activeWorkspaceId: nextWs.id,
    activeFolderId: starterFolder.id,
    workspaces: [...state.workspaces, nextWs],
  };
}

export function renameWorkspace(
  state: WorkspaceRegistryState,
  workspaceId: string,
  name: string
): WorkspaceRegistryState {
  const cleanName = name.trim();
  if (!cleanName) return state;
  const now = Date.now();
  return {
    ...state,
    workspaces: state.workspaces.map((w) =>
      w.id === workspaceId ? { ...w, name: cleanName, updatedAt: now } : w
    ),
  };
}

export function selectWorkspace(
  state: WorkspaceRegistryState,
  workspaceId: string
): WorkspaceRegistryState {
  const target = state.workspaces.find((w) => w.id === workspaceId);
  if (!target) return state;
  return {
    ...state,
    activeWorkspaceId: target.id,
    activeFolderId: target.folders[0]?.id ?? null,
  };
}

export function deleteWorkspace(
  state: WorkspaceRegistryState,
  workspaceId: string
): WorkspaceRegistryState {
  if (state.workspaces.length <= 1) {
    return state;
  }
  const remaining = state.workspaces.filter((w) => w.id !== workspaceId);
  const nextActive =
    state.activeWorkspaceId === workspaceId
      ? remaining[0]
      : remaining.find((w) => w.id === state.activeWorkspaceId) ?? remaining[0];
  return {
    activeWorkspaceId: nextActive.id,
    activeFolderId:
      nextActive.folders.find((f) => f.id === state.activeFolderId)?.id ??
      nextActive.folders[0]?.id ??
      null,
    workspaces: remaining,
  };
}

export function createFolder(
  state: WorkspaceRegistryState,
  workspaceId: string,
  name: string,
  parentFolderId: string | null = null,
  color?: string
): WorkspaceRegistryState {
  const cleanName = name.trim() || 'NewFolder';
  const now = Date.now();
  const ws = state.workspaces.find((w) => w.id === workspaceId);
  if (!ws) return state;

  const newFolder: WorkspaceFolder = {
    id: uid('fld'),
    name: cleanName,
    parentFolderId,
    color:
      color ?? FOLDER_ACCENT_COLORS[ws.folders.length % FOLDER_ACCENT_COLORS.length],
    createdAt: now,
    updatedAt: now,
    scripts: [],
    models: [],
    maps: [],
  };

  return {
    ...state,
    activeWorkspaceId: workspaceId,
    activeFolderId: newFolder.id,
    workspaces: state.workspaces.map((w) =>
      w.id === workspaceId
        ? { ...w, updatedAt: now, folders: [...w.folders, newFolder] }
        : w
    ),
  };
}

export function renameFolder(
  state: WorkspaceRegistryState,
  workspaceId: string,
  folderId: string,
  name: string
): WorkspaceRegistryState {
  const cleanName = name.trim();
  if (!cleanName) return state;
  const now = Date.now();
  return {
    ...state,
    workspaces: state.workspaces.map((w) =>
      w.id === workspaceId
        ? {
            ...w,
            updatedAt: now,
            folders: w.folders.map((f) =>
              f.id === folderId ? { ...f, name: cleanName, updatedAt: now } : f
            ),
          }
        : w
    ),
  };
}

export function deleteFolder(
  state: WorkspaceRegistryState,
  workspaceId: string,
  folderId: string
): WorkspaceRegistryState {
  const ws = state.workspaces.find((w) => w.id === workspaceId);
  if (!ws) return state;

  // Gather target folder and all nested descendants
  const toDelete = new Set<string>([folderId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const f of ws.folders) {
      if (f.parentFolderId && toDelete.has(f.parentFolderId) && !toDelete.has(f.id)) {
        toDelete.add(f.id);
        changed = true;
      }
    }
  }

  const remainingFolders = ws.folders.filter((f) => !toDelete.has(f.id));
  const now = Date.now();
  const nextActiveFolderId =
    state.activeWorkspaceId === workspaceId &&
    state.activeFolderId &&
    toDelete.has(state.activeFolderId)
      ? remainingFolders[0]?.id ?? null
      : state.activeFolderId;

  return {
    ...state,
    activeFolderId: nextActiveFolderId,
    workspaces: state.workspaces.map((w) =>
      w.id === workspaceId
        ? { ...w, updatedAt: now, folders: remainingFolders }
        : w
    ),
  };
}

export function saveModelToFolder(
  state: WorkspaceRegistryState,
  workspaceId: string,
  folderId: string,
  model: StudioSceneModel,
  overwriteItemId?: string
): { nextState: WorkspaceRegistryState; savedItemId: string } {
  const now = Date.now();
  const clonedModel = deepClone(model);
  const itemId = overwriteItemId || uid('ws_mod');
  const nextItem: WorkspaceModelItem = {
    id: itemId,
    name: clonedModel.name || 'Model',
    updatedAt: now,
    model: clonedModel,
  };

  const nextState: WorkspaceRegistryState = {
    ...state,
    workspaces: state.workspaces.map((w) => {
      if (w.id !== workspaceId) return w;
      return {
        ...w,
        updatedAt: now,
        folders: w.folders.map((f) => {
          if (f.id !== folderId) return f;
          const exists = f.models.some((m) => m.id === itemId);
          return {
            ...f,
            updatedAt: now,
            models: exists
              ? f.models.map((m) => (m.id === itemId ? nextItem : m))
              : [...f.models, nextItem],
          };
        }),
      };
    }),
  };
  return { nextState, savedItemId: itemId };
}

export function saveMapToFolder(
  state: WorkspaceRegistryState,
  workspaceId: string,
  folderId: string,
  map: StudioMapScene,
  overwriteItemId?: string
): { nextState: WorkspaceRegistryState; savedItemId: string } {
  const now = Date.now();
  const clonedMap = deepClone(map);
  const itemId = overwriteItemId || uid('ws_map');
  const nextItem: WorkspaceMapItem = {
    id: itemId,
    name: clonedMap.name || 'Map',
    updatedAt: now,
    map: clonedMap,
  };

  const nextState: WorkspaceRegistryState = {
    ...state,
    workspaces: state.workspaces.map((w) => {
      if (w.id !== workspaceId) return w;
      return {
        ...w,
        updatedAt: now,
        folders: w.folders.map((f) => {
          if (f.id !== folderId) return f;
          const exists = f.maps.some((m) => m.id === itemId);
          return {
            ...f,
            updatedAt: now,
            maps: exists
              ? f.maps.map((m) => (m.id === itemId ? nextItem : m))
              : [...f.maps, nextItem],
          };
        }),
      };
    }),
  };
  return { nextState, savedItemId: itemId };
}

export function addScriptToFolder(
  state: WorkspaceRegistryState,
  workspaceId: string,
  folderId: string,
  node: Omit<StudioScriptNode, 'id'>
): { nextState: WorkspaceRegistryState; savedScriptId: string } {
  const now = Date.now();
  const id = uid('ws_scr');
  const nextNode: StudioScriptNode = {
    ...deepClone(node),
    id,
  };
  const nextState: WorkspaceRegistryState = {
    ...state,
    workspaces: state.workspaces.map((w) =>
      w.id === workspaceId
        ? {
            ...w,
            updatedAt: now,
            folders: w.folders.map((f) =>
              f.id === folderId
                ? { ...f, updatedAt: now, scripts: [...f.scripts, nextNode] }
                : f
            ),
          }
        : w
    ),
  };
  return { nextState, savedScriptId: id };
}

export function updateScriptInFolder(
  state: WorkspaceRegistryState,
  workspaceId: string,
  folderId: string,
  scriptId: string,
  patch: Partial<StudioScriptNode>
): WorkspaceRegistryState {
  const now = Date.now();
  return {
    ...state,
    workspaces: state.workspaces.map((w) =>
      w.id === workspaceId
        ? {
            ...w,
            updatedAt: now,
            folders: w.folders.map((f) =>
              f.id === folderId
                ? {
                    ...f,
                    updatedAt: now,
                    scripts: f.scripts.map((s) =>
                      s.id === scriptId ? { ...s, ...patch } : s
                    ),
                  }
                : f
            ),
          }
        : w
    ),
  };
}

export function renameItemInFolder(
  state: WorkspaceRegistryState,
  workspaceId: string,
  folderId: string,
  kind: WorkspaceAssetKind,
  itemId: string,
  newName: string
): WorkspaceRegistryState {
  const clean = newName.trim();
  if (!clean) return state;
  const now = Date.now();
  return {
    ...state,
    workspaces: state.workspaces.map((w) =>
      w.id === workspaceId
        ? {
            ...w,
            updatedAt: now,
            folders: w.folders.map((f) => {
              if (f.id !== folderId) return f;
              if (kind === 'model') {
                return {
                  ...f,
                  updatedAt: now,
                  models: f.models.map((m) =>
                    m.id === itemId
                      ? { ...m, name: clean, updatedAt: now, model: { ...m.model, name: clean } }
                      : m
                  ),
                };
              }
              if (kind === 'map') {
                return {
                  ...f,
                  updatedAt: now,
                  maps: f.maps.map((m) =>
                    m.id === itemId
                      ? { ...m, name: clean, updatedAt: now, map: { ...m.map, name: clean } }
                      : m
                  ),
                };
              }
              return {
                ...f,
                updatedAt: now,
                scripts: f.scripts.map((s) =>
                  s.id === itemId ? { ...s, name: clean } : s
                ),
              };
            }),
          }
        : w
    ),
  };
}

export function deleteItemFromFolder(
  state: WorkspaceRegistryState,
  workspaceId: string,
  folderId: string,
  kind: WorkspaceAssetKind,
  itemId: string
): WorkspaceRegistryState {
  const now = Date.now();
  return {
    ...state,
    workspaces: state.workspaces.map((w) =>
      w.id === workspaceId
        ? {
            ...w,
            updatedAt: now,
            folders: w.folders.map((f) => {
              if (f.id !== folderId) return f;
              if (kind === 'model') {
                return { ...f, updatedAt: now, models: f.models.filter((m) => m.id !== itemId) };
              }
              if (kind === 'map') {
                return { ...f, updatedAt: now, maps: f.maps.filter((m) => m.id !== itemId) };
              }
              return { ...f, updatedAt: now, scripts: f.scripts.filter((s) => s.id !== itemId) };
            }),
          }
        : w
    ),
  };
}

export function moveItemBetweenFolders(
  state: WorkspaceRegistryState,
  workspaceId: string,
  fromFolderId: string,
  toFolderId: string,
  kind: WorkspaceAssetKind,
  itemId: string
): WorkspaceRegistryState {
  if (fromFolderId === toFolderId) return state;
  const ws = state.workspaces.find((w) => w.id === workspaceId);
  if (!ws) return state;
  const src = ws.folders.find((f) => f.id === fromFolderId);
  const dst = ws.folders.find((f) => f.id === toFolderId);
  if (!src || !dst) return state;

  const now = Date.now();
  let movedModel: WorkspaceModelItem | undefined;
  let movedMap: WorkspaceMapItem | undefined;
  let movedScript: StudioScriptNode | undefined;

  if (kind === 'model') movedModel = src.models.find((m) => m.id === itemId);
  else if (kind === 'map') movedMap = src.maps.find((m) => m.id === itemId);
  else movedScript = src.scripts.find((s) => s.id === itemId);

  if (!movedModel && !movedMap && !movedScript) return state;

  return {
    ...state,
    workspaces: state.workspaces.map((w) =>
      w.id === workspaceId
        ? {
            ...w,
            updatedAt: now,
            folders: w.folders.map((f) => {
              if (f.id === fromFolderId) {
                return {
                  ...f,
                  updatedAt: now,
                  models: kind === 'model' ? f.models.filter((m) => m.id !== itemId) : f.models,
                  maps: kind === 'map' ? f.maps.filter((m) => m.id !== itemId) : f.maps,
                  scripts: kind === 'script' ? f.scripts.filter((s) => s.id !== itemId) : f.scripts,
                };
              }
              if (f.id === toFolderId) {
                return {
                  ...f,
                  updatedAt: now,
                  models: movedModel ? [...f.models, { ...movedModel, updatedAt: now }] : f.models,
                  maps: movedMap ? [...f.maps, { ...movedMap, updatedAt: now }] : f.maps,
                  scripts: movedScript ? [...f.scripts, movedScript] : f.scripts,
                };
              }
              return f;
            }),
          }
        : w
    ),
  };
}

export function getFolderPathSegments(
  folders: WorkspaceFolder[],
  folderId: string | null
): WorkspaceFolder[] {
  if (!folderId) return [];
  const byId = new Map(folders.map((f) => [f.id, f]));
  const chain: WorkspaceFolder[] = [];
  const visited = new Set<string>();
  let cur = byId.get(folderId);
  while (cur && !visited.has(cur.id)) {
    visited.add(cur.id);
    chain.unshift(cur);
    cur = cur.parentFolderId ? byId.get(cur.parentFolderId) : undefined;
  }
  return chain;
}

export function validateWorkspaceForRoblox(
  workspace: StudioWorkspace
): WorkspaceValidationReport {
  const issues: WorkspaceValidationIssue[] = [];
  const folderCount = workspace.folders.length;
  let scriptCount = 0;
  let modelCount = 0;
  let mapCount = 0;

  for (const fld of workspace.folders) {
    scriptCount += fld.scripts.length;
    modelCount += fld.models.length;
    mapCount += fld.maps.length;
  }

  if (folderCount === 0) {
    issues.push({
      severity: 'error',
      message: 'Workspace has no folders. Create at least 1 custom folder to store assets.',
    });
  } else if (scriptCount + modelCount + mapCount === 0) {
    issues.push({
      severity: 'warning',
      message: 'All folders are currently empty. Save or add scripts, models, or maps.',
    });
  } else {
    issues.push({
      severity: 'info',
      message: `Workspace ready: ${folderCount} folder(s) containing ${modelCount} model(s), ${mapCount} map(s), and ${scriptCount} script(s).`,
    });
  }

  return {
    folderCount,
    scriptCount,
    modelCount,
    mapCount,
    rbxlxReady: folderCount > 0,
    issues,
  };
}

/**
 * Exports an entire Workspace (all custom folders with nested scripts, models, and maps)
 * into a complete Roblox Studio Place XML (.rbxlx).
 */
export function generateWorkspaceRbxlx(
  workspace: StudioWorkspace,
  selectedFolderIds?: string[]
): string {
  const refs = new RefGenerator();
  const folderFilter = selectedFolderIds ? new Set(selectedFolderIds) : null;
  const activeFolders = folderFilter
    ? workspace.folders.filter((f) => folderFilter.has(f.id))
    : workspace.folders;

  const firstMap = activeFolders.flatMap((f) => f.maps)[0]?.map ?? null;

  const lines: string[] = [
    '<roblox xmlns:xmime="http://www.w3.org/2005/05/xmlmime" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="http://www.roblox.com/roblox.xsd" version="4">',
    '\t<External>null</External>',
    '\t<External>nil</External>',
  ];

  // Build folder tree helper
  const byParent = new Map<string | null, WorkspaceFolder[]>();
  const activeIdSet = new Set(activeFolders.map((f) => f.id));
  for (const fld of activeFolders) {
    const parentKey =
      fld.parentFolderId && activeIdSet.has(fld.parentFolderId) ? fld.parentFolderId : null;
    const arr = byParent.get(parentKey) ?? [];
    arr.push(fld);
    byParent.set(parentKey, arr);
  }

  // 1. Workspace (Folders -> Models, Maps, Workspace Scripts)
  lines.push(`\t<Item class="Workspace" referent="${refs.next('WS')}">`);
  lines.push('\t\t<Properties><string name="Name">Workspace</string></Properties>');
  lines.push(`\t\t<Item class="Terrain" referent="${refs.next('TER')}">`);
  lines.push('\t\t\t<Properties><string name="Name">Terrain</string></Properties>');
  lines.push('\t\t</Item>');

  const emitWorkspaceFolderTree = (parentId: string | null, indent: string) => {
    const list = byParent.get(parentId) ?? [];
    for (const fld of list) {
      lines.push(`${indent}<Item class="Folder" referent="${refs.next('FLD')}">`);
      lines.push(`${indent}\t<Properties><string name="Name">${escapeXml(sanitizeIdentifier(fld.name) || 'Folder')}</string></Properties>`);

      // Models in this folder
      fld.models.forEach((modItem, idx) => {
        emitRiggedStudioModelXml(
          lines,
          `${indent}\t`,
          refs,
          modItem.model,
          [idx * 24, 0, 0],
          0,
          1,
          modItem.name
        );
      });

      // Maps in this folder
      for (const mapItem of fld.maps) {
        emitMapFolderXml(lines, `${indent}\t`, refs, mapItem.map);
      }

      // Workspace-targeted scripts in this folder
      for (const scr of fld.scripts.filter((s) => s.service === 'WorkspaceModel')) {
        emitScriptItemXml(lines, `${indent}\t`, refs, scr);
      }

      emitWorkspaceFolderTree(fld.id, `${indent}\t`);
      lines.push(`${indent}</Item>`);
    }
  };
  emitWorkspaceFolderTree(null, '\t\t');
  lines.push('\t</Item>');

  // 2. Lighting
  lines.push(`\t<Item class="Lighting" referent="${refs.next('LGT')}">`);
  lines.push('\t\t<Properties>');
  lines.push('\t\t\t<string name="Name">Lighting</string>');
  lines.push(`\t\t\t<float name="Brightness">${firstMap?.lighting.brightness ?? 2.2}</float>`);
  lines.push(`\t\t\t<float name="ClockTime">${firstMap?.lighting.clockTime ?? 14}</float>`);
  lines.push('\t\t</Properties>');
  lines.push(`\t\t<Item class="Atmosphere" referent="${refs.next('ATMO')}">`);
  lines.push('\t\t\t<Properties><string name="Name">Atmosphere</string></Properties>');
  lines.push('\t\t</Item>');
  lines.push(`\t\t<Item class="Sky" referent="${refs.next('SKY')}">`);
  lines.push('\t\t\t<Properties><string name="Name">Sky</string></Properties>');
  lines.push('\t\t</Item>');
  lines.push('\t</Item>');

  // 3. Teams
  lines.push(`\t<Item class="Teams" referent="${refs.next('TEAMS')}">`);
  lines.push('\t\t<Properties><string name="Name">Teams</string></Properties>');
  if (firstMap) {
    for (const t of firstMap.teams) {
      lines.push(`\t\t<Item class="Team" referent="${refs.next('TEAM')}">`);
      lines.push('\t\t\t<Properties>');
      lines.push(`\t\t\t\t<string name="Name">${escapeXml(t.name)}</string>`);
      lines.push(`\t\t\t\t<bool name="AutoAssignable">${t.autoAssignable}</bool>`);
      lines.push('\t\t\t</Properties>');
      lines.push('\t\t</Item>');
    }
  }
  lines.push('\t</Item>');

  // Helper to emit service-routed custom folders containing scripts
  const emitServiceFolders = (
    serviceName: 'ReplicatedStorage' | 'ServerScriptService' | 'StarterPlayerScripts' | 'StarterCharacterScripts',
    parentId: string | null,
    indent: string
  ) => {
    const list = byParent.get(parentId) ?? [];
    for (const fld of list) {
      const folderScripts = [
        ...fld.scripts.filter((s) => s.service === serviceName),
        ...fld.maps.flatMap((m) =>
          getMapServiceScriptNodes(m.map)
            .filter((ms) => ms.service === serviceName)
            .map((ms) => ({ ...ms, name: `${sanitizeIdentifier(m.name)}_${ms.name}` }))
        ),
      ];
      const hasChildren = (byParent.get(fld.id)?.length ?? 0) > 0;
      if (folderScripts.length === 0 && !hasChildren) continue;

      lines.push(`${indent}<Item class="Folder" referent="${refs.next('SFLD')}">`);
      lines.push(`${indent}\t<Properties><string name="Name">${escapeXml(sanitizeIdentifier(fld.name) || 'Folder')}</string></Properties>`);
      for (const scr of folderScripts) {
        emitScriptItemXml(lines, `${indent}\t`, refs, scr);
      }
      emitServiceFolders(serviceName, fld.id, `${indent}\t`);
      lines.push(`${indent}</Item>`);
    }
  };

  // 4. ReplicatedStorage
  lines.push(`\t<Item class="ReplicatedStorage" referent="${refs.next('RS')}">`);
  lines.push('\t\t<Properties><string name="Name">ReplicatedStorage</string></Properties>');
  emitServiceFolders('ReplicatedStorage', null, '\t\t');
  lines.push(`\t\t<Item class="Folder" referent="${refs.next('REMS')}">`);
  lines.push('\t\t\t<Properties><string name="Name">Remotes</string></Properties>');
  for (const remName of ['RoundStateEvent', 'ShopPurchaseEvent', 'OpenShopEvent', 'MapToastEvent']) {
    lines.push(`\t\t\t<Item class="RemoteEvent" referent="${refs.next('REM')}">`);
    lines.push(`\t\t\t\t<Properties><string name="Name">${remName}</string></Properties>`);
    lines.push('\t\t\t</Item>');
  }
  lines.push('\t\t</Item>');
  lines.push('\t</Item>');

  // 5. ServerScriptService
  lines.push(`\t<Item class="ServerScriptService" referent="${refs.next('SSS')}">`);
  lines.push('\t\t<Properties><string name="Name">ServerScriptService</string></Properties>');
  emitServiceFolders('ServerScriptService', null, '\t\t');
  lines.push('\t</Item>');

  // 6. StarterGui
  lines.push(`\t<Item class="StarterGui" referent="${refs.next('SG')}">`);
  lines.push('\t\t<Properties><string name="Name">StarterGui</string></Properties>');
  lines.push('\t</Item>');

  // 7. StarterPlayer
  lines.push(`\t<Item class="StarterPlayer" referent="${refs.next('SP')}">`);
  lines.push('\t\t<Properties><string name="Name">StarterPlayer</string></Properties>');
  lines.push(`\t\t<Item class="StarterPlayerScripts" referent="${refs.next('SPS')}">`);
  lines.push('\t\t\t<Properties><string name="Name">StarterPlayerScripts</string></Properties>');
  emitServiceFolders('StarterPlayerScripts', null, '\t\t\t');
  lines.push('\t\t</Item>');
  lines.push(`\t\t<Item class="StarterCharacterScripts" referent="${refs.next('SCS')}">`);
  lines.push('\t\t\t<Properties><string name="Name">StarterCharacterScripts</string></Properties>');
  emitServiceFolders('StarterCharacterScripts', null, '\t\t\t');
  lines.push('\t\t</Item>');
  lines.push('\t</Item>');

  // 8. SoundService
  lines.push(`\t<Item class="SoundService" referent="${refs.next('SS')}">`);
  lines.push('\t\t<Properties><string name="Name">SoundService</string></Properties>');
  lines.push('\t</Item>');

  lines.push('</roblox>');
  return lines.join('\n');
}

/**
 * Builds a complete Rojo 7 + Folder Asset bundle for an entire Workspace.
 */
export function generateWorkspaceRojoBundle(workspace: StudioWorkspace): SyncFileEntry[] {
  const safeWsName = sanitizeIdentifier(workspace.name).replace(/\s+/g, '_') || 'RobloxWorkspace';
  const files: SyncFileEntry[] = [];

  const projectTree = {
    name: safeWsName,
    tree: {
      $className: 'DataModel',
      ReplicatedStorage: {
        $className: 'ReplicatedStorage',
        $path: 'src/ReplicatedStorage',
      },
      ServerScriptService: {
        $className: 'ServerScriptService',
        $path: 'src/ServerScriptService',
      },
      StarterPlayer: {
        $className: 'StarterPlayer',
        StarterPlayerScripts: {
          $className: 'StarterPlayerScripts',
          $path: 'src/StarterPlayer/StarterPlayerScripts',
        },
        StarterCharacterScripts: {
          $className: 'StarterCharacterScripts',
          $path: 'src/StarterPlayer/StarterCharacterScripts',
        },
      },
    },
  };

  files.push({
    path: 'default.project.json',
    content: JSON.stringify(projectTree, null, 2),
    encoding: 'utf8',
    category: 'rojo',
  });

  files.push({
    path: `workspace/${safeWsName}.rbxlx`,
    content: generateWorkspaceRbxlx(workspace),
    encoding: 'utf8',
    category: 'model',
  });

  files.push({
    path: `${safeWsName}.studforge-workspace.json`,
    content: JSON.stringify(workspace, null, 2),
    encoding: 'utf8',
    category: 'project',
  });

  for (const fld of workspace.folders) {
    const chain = getFolderPathSegments(workspace.folders, fld.id);
    const folderRelPath = chain
      .map((c) => sanitizeIdentifier(c.name).replace(/\s+/g, '_') || 'Folder')
      .join('/');

    for (const modItem of fld.models) {
      const safeMod = sanitizeIdentifier(modItem.name).replace(/\s+/g, '_') || 'Model';
      files.push({
        path: `folders/${folderRelPath}/models/${safeMod}_Package.rbxmx`,
        content: generateRbxmx(modItem.model, { scaleMode: 'studs', centerAtOrigin: true }),
        encoding: 'utf8',
        category: 'model',
      });
    }

    for (const mapItem of fld.maps) {
      const safeMap = sanitizeIdentifier(mapItem.name).replace(/\s+/g, '_') || 'Map';
      files.push({
        path: `folders/${folderRelPath}/maps/${safeMap}.studforge-map.json`,
        content: JSON.stringify(mapItem.map, null, 2),
        encoding: 'utf8',
        category: 'project',
      });
    }

    for (const scr of fld.scripts) {
      const serviceRoot =
        scr.service === 'ReplicatedStorage'
          ? 'src/ReplicatedStorage'
          : scr.service === 'ServerScriptService'
          ? 'src/ServerScriptService'
          : scr.service === 'StarterCharacterScripts'
          ? 'src/StarterPlayer/StarterCharacterScripts'
          : scr.service === 'StarterPlayerScripts'
          ? 'src/StarterPlayer/StarterPlayerScripts'
          : 'src/Workspace';
      const safeScr = sanitizeIdentifier(scr.name).replace(/\s+/g, '_') || 'Script';
      const ext =
        scr.className === 'Script'
          ? '.server.luau'
          : scr.className === 'LocalScript'
          ? '.client.luau'
          : '.luau';
      files.push({
        path: `${serviceRoot}/${folderRelPath}/${safeScr}${ext}`,
        content: scr.source,
        encoding: 'utf8',
        category: 'script',
      });
    }
  }

  const deduped = new Map<string, SyncFileEntry>();
  for (const f of files) deduped.set(f.path, f);
  return Array.from(deduped.values());
}
