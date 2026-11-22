import { useMemo, useState } from 'react';
import {
  Box,
  Check,
  Code2,
  Download,
  Edit3,
  FileCode2,
  Folder,
  FolderInput,
  FolderPlus,
  Layers,
  Map as MapIcon,
  Plus,
  Save,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import { StudioMapScene } from '../engine/mapTypes';
import {
  ROBLOX_SERVICE_LOCATIONS,
  RobloxScriptClassName,
  RobloxServiceLocation,
  StudioSceneModel,
  StudioScriptNode,
} from '../engine/robloxTypes';
import { getFolderPathSegments, validateWorkspaceForRoblox } from '../engine/workspaceStore';
import {
  FOLDER_ACCENT_COLORS,
  StudioWorkspace,
  WorkspaceAssetKind,
  WorkspaceFolder,
  WorkspaceMapItem,
  WorkspaceModelItem,
  WorkspaceRegistryState,
} from '../engine/workspaceTypes';

interface WorkspaceManagerViewProps {
  registry: WorkspaceRegistryState;
  activeStudioModel: StudioSceneModel;
  activeMapScene: StudioMapScene;
  onSelectWorkspace: (workspaceId: string) => void;
  onCreateWorkspace: (name: string) => void;
  onRenameWorkspace: (workspaceId: string, name: string) => void;
  onDeleteWorkspace: (workspaceId: string) => void;
  onSelectFolder: (folderId: string | null) => void;
  onCreateFolder: (name: string, parentFolderId?: string | null, color?: string) => void;
  onRenameFolder: (folderId: string, name: string) => void;
  onDeleteFolder: (folderId: string) => void;
  onSaveActiveModelToFolder: (folderId: string) => void;
  onSaveActiveMapToFolder: (folderId: string) => void;
  onAddScriptToFolder: (folderId: string, node: Omit<StudioScriptNode, 'id'>) => string;
  onUpdateScriptInFolder: (
    folderId: string,
    scriptId: string,
    patch: Partial<StudioScriptNode>
  ) => void;
  onRenameItemInFolder: (
    folderId: string,
    kind: WorkspaceAssetKind,
    itemId: string,
    name: string
  ) => void;
  onDeleteItemFromFolder: (
    folderId: string,
    kind: WorkspaceAssetKind,
    itemId: string
  ) => void;
  onMoveItemBetweenFolders: (
    fromFolderId: string,
    toFolderId: string,
    kind: WorkspaceAssetKind,
    itemId: string
  ) => void;
  onOpenModelInStudio: (model: StudioSceneModel) => void;
  onStampModelOnMap: (model: StudioSceneModel) => void;
  onOpenMapInStudio: (map: StudioMapScene) => void;
  onSendScriptToModel: (script: StudioScriptNode) => void;
  onExportWorkspace: () => void;
  onSyncWorkspaceGitHub: () => void;
}

const SCRIPT_CLASS_OPTIONS: { value: RobloxScriptClassName; label: string }[] = [
  { value: 'Script', label: 'Script (Server)' },
  { value: 'LocalScript', label: 'LocalScript (Client)' },
  { value: 'ModuleScript', label: 'ModuleScript' },
  { value: 'RemoteEvent', label: 'RemoteEvent' },
  { value: 'BindableEvent', label: 'BindableEvent' },
];

type SelectedAssetRef =
  | { kind: 'model'; itemId: string }
  | { kind: 'map'; itemId: string }
  | { kind: 'script'; itemId: string }
  | null;

export function WorkspaceManagerView({
  registry,
  activeStudioModel,
  activeMapScene,
  onSelectWorkspace,
  onCreateWorkspace,
  onRenameWorkspace,
  onDeleteWorkspace,
  onSelectFolder,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onSaveActiveModelToFolder,
  onSaveActiveMapToFolder,
  onAddScriptToFolder,
  onUpdateScriptInFolder,
  onRenameItemInFolder,
  onDeleteItemFromFolder,
  onMoveItemBetweenFolders,
  onOpenModelInStudio,
  onStampModelOnMap,
  onOpenMapInStudio,
  onSendScriptToModel,
  onExportWorkspace,
  onSyncWorkspaceGitHub,
}: WorkspaceManagerViewProps) {
  const activeWorkspace: StudioWorkspace =
    registry.workspaces.find((w) => w.id === registry.activeWorkspaceId) ?? registry.workspaces[0];

  const activeFolder: WorkspaceFolder | null =
    activeWorkspace.folders.find((f) => f.id === registry.activeFolderId) ??
    activeWorkspace.folders[0] ??
    null;

  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [showNewWorkspaceForm, setShowNewWorkspaceForm] = useState(false);
  const [editingWorkspaceName, setEditingWorkspaceName] = useState<string | null>(null);

  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderParentId, setNewFolderParentId] = useState<string | null>(null);
  const [newFolderColor, setNewFolderColor] = useState<string>(FOLDER_ACCENT_COLORS[0]);
  const [showNewFolderForm, setShowNewFolderForm] = useState(false);

  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null);
  const [renamingFolderText, setRenamingFolderText] = useState('');

  const [assetFilter, setAssetFilter] = useState<'all' | WorkspaceAssetKind>('all');
  const [selectedAsset, setSelectedAsset] = useState<SelectedAssetRef>(null);

  // Quick New Script form state
  const [showNewScriptForm, setShowNewScriptForm] = useState(false);
  const [newScriptName, setNewScriptName] = useState('');
  const [newScriptClass, setNewScriptClass] = useState<RobloxScriptClassName>('Script');
  const [newScriptService, setNewScriptService] =
    useState<RobloxServiceLocation>('ServerScriptService');

  // Inline item rename state
  const [renamingItem, setRenamingItem] = useState<{
    kind: WorkspaceAssetKind;
    id: string;
    value: string;
  } | null>(null);

  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  const workspaceReport = useMemo(
    () => validateWorkspaceForRoblox(activeWorkspace),
    [activeWorkspace]
  );

  // Build hierarchical folder display list
  const flattenedFolders = useMemo(() => {
    const byParent = new Map<string | null, WorkspaceFolder[]>();
    const validIds = new Set(activeWorkspace.folders.map((f) => f.id));
    for (const f of activeWorkspace.folders) {
      const pid = f.parentFolderId && validIds.has(f.parentFolderId) ? f.parentFolderId : null;
      const arr = byParent.get(pid) ?? [];
      arr.push(f);
      byParent.set(pid, arr);
    }
    const out: { folder: WorkspaceFolder; depth: number }[] = [];
    const walk = (pid: string | null, depth: number) => {
      const children = byParent.get(pid) ?? [];
      for (const child of children) {
        out.push({ folder: child, depth });
        walk(child.id, depth + 1);
      }
    };
    walk(null, 0);
    return out;
  }, [activeWorkspace.folders]);

  const folderBreadcrumb = useMemo(() => {
    if (!activeFolder) return [];
    return getFolderPathSegments(activeWorkspace.folders, activeFolder.id);
  }, [activeWorkspace.folders, activeFolder]);

  // Resolve selected item inside active folder
  const selectedModel: WorkspaceModelItem | null = useMemo(() => {
    if (!activeFolder || selectedAsset?.kind !== 'model') return null;
    return activeFolder.models.find((m) => m.id === selectedAsset.itemId) ?? null;
  }, [activeFolder, selectedAsset]);

  const selectedMap: WorkspaceMapItem | null = useMemo(() => {
    if (!activeFolder || selectedAsset?.kind !== 'map') return null;
    return activeFolder.maps.find((m) => m.id === selectedAsset.itemId) ?? null;
  }, [activeFolder, selectedAsset]);

  const selectedScript: StudioScriptNode | null = useMemo(() => {
    if (!activeFolder || selectedAsset?.kind !== 'script') return null;
    return activeFolder.scripts.find((s) => s.id === selectedAsset.itemId) ?? null;
  }, [activeFolder, selectedAsset]);

  const showNotice = (msg: string) => {
    setStatusNotice(msg);
    setTimeout(() => {
      setStatusNotice((cur) => (cur === msg ? null : cur));
    }, 2600);
  };

  const handleSubmitNewWorkspace = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkspaceName.trim()) return;
    onCreateWorkspace(newWorkspaceName.trim());
    showNotice(`Created workspace "${newWorkspaceName.trim()}"`);
    setNewWorkspaceName('');
    setShowNewWorkspaceForm(false);
  };

  const handleSubmitNewFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    onCreateFolder(newFolderName.trim(), newFolderParentId, newFolderColor);
    showNotice(`Created folder "${newFolderName.trim()}"`);
    setNewFolderName('');
    setNewFolderParentId(null);
    setShowNewFolderForm(false);
  };

  const handleSubmitNewScript = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeFolder || !newScriptName.trim()) return;
    const cleanName = newScriptName.trim();
    const createdId = onAddScriptToFolder(activeFolder.id, {
      name: cleanName,
      className: newScriptClass,
      service: newScriptService,
      source:
        newScriptClass === 'ModuleScript'
          ? `--!strict\n-- ${activeFolder.name}/${cleanName}\nlocal Module = {}\n\nreturn Module\n`
          : `--!strict\n-- ${activeFolder.name}/${cleanName}\nprint("[${activeFolder.name}] ${cleanName} running")\n`,
      disabled: false,
      runContext:
        newScriptClass === 'LocalScript'
          ? 'Client'
          : newScriptClass === 'Script'
          ? 'Server'
          : undefined,
    });
    setSelectedAsset({ kind: 'script', itemId: createdId });
    setNewScriptName('');
    setShowNewScriptForm(false);
    showNotice(`Added script "${cleanName}" to "${activeFolder.name}"`);
  };

  const otherFolders = activeWorkspace.folders.filter((f) => f.id !== activeFolder?.id);

  return (
    <div className="flex-1 min-h-0 flex bg-[#0e1015] text-slate-100 overflow-hidden">
      {/* Left Column: Workspaces & Custom Folders Tree */}
      <aside
        aria-label="Workspaces and Custom Folders"
        className="w-72 shrink-0 bg-[#151821] border-r border-white/10 flex flex-col min-h-0"
      >
        {/* Workspace Switcher & CRUD */}
        <div className="p-3 border-b border-white/10 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Workspaces ({registry.workspaces.length})
            </span>
            <button
              type="button"
              onClick={() => setShowNewWorkspaceForm((v) => !v)}
              className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 transition-colors cursor-pointer"
              aria-label="New Workspace"
            >
              <Plus className="w-3 h-3" aria-hidden="true" />
              <span>Workspace</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            {editingWorkspaceName !== null ? (
              <form
                className="flex-1 flex items-center gap-1"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (editingWorkspaceName.trim()) {
                    onRenameWorkspace(activeWorkspace.id, editingWorkspaceName.trim());
                  }
                  setEditingWorkspaceName(null);
                }}
              >
                <input
                  aria-label="Rename active workspace"
                  value={editingWorkspaceName}
                  onChange={(e) => setEditingWorkspaceName(e.target.value)}
                  className="flex-1 min-w-0 px-2 py-1 text-xs bg-[#0e1015] border border-blue-500 rounded text-white focus:outline-none"
                  autoFocus
                />
                <button
                  type="submit"
                  aria-label="Confirm workspace rename"
                  className="p-1.5 rounded bg-blue-600 text-white hover:bg-blue-500 cursor-pointer"
                >
                  <Check className="w-3 h-3" aria-hidden="true" />
                </button>
              </form>
            ) : (
              <>
                <select
                  aria-label="Active Workspace"
                  value={activeWorkspace.id}
                  onChange={(e) => {
                    onSelectWorkspace(e.target.value);
                    setSelectedAsset(null);
                  }}
                  className="flex-1 min-w-0 px-2 py-1.5 text-xs font-medium bg-[#0e1015] border border-white/10 rounded text-white focus:outline-none focus:border-blue-500"
                >
                  {registry.workspaces.map((ws) => (
                    <option key={ws.id} value={ws.id}>
                      {ws.name} ({ws.folders.length} folders)
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setEditingWorkspaceName(activeWorkspace.name)}
                  aria-label={`Rename workspace "${activeWorkspace.name}"`}
                  title="Rename Workspace"
                  className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-white/5 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
                {registry.workspaces.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      onDeleteWorkspace(activeWorkspace.id);
                      setSelectedAsset(null);
                    }}
                    aria-label={`Delete workspace "${activeWorkspace.name}"`}
                    title="Delete Workspace"
                    className="p-1.5 rounded text-slate-400 hover:text-red-400 hover:bg-red-500/10 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                )}
              </>
            )}
          </div>

          {showNewWorkspaceForm && (
            <form onSubmit={handleSubmitNewWorkspace} className="space-y-1.5 pt-1">
              <input
                aria-label="New workspace name"
                placeholder="e.g. RPG Kingdom"
                value={newWorkspaceName}
                onChange={(e) => setNewWorkspaceName(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-[#0e1015] border border-white/15 rounded text-white focus:outline-none focus:border-blue-500"
                autoFocus
              />
              <div className="flex items-center justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowNewWorkspaceForm(false)}
                  className="px-2 py-1 text-[11px] text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-2.5 py-1 text-[11px] font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded cursor-pointer"
                >
                  Create Workspace
                </button>
              </div>
            </form>
          )}

          <div className="text-[11px] text-slate-400 font-mono-tabular">
            {workspaceReport.folderCount} folders · {workspaceReport.modelCount} models ·{' '}
            {workspaceReport.mapCount} maps · {workspaceReport.scriptCount} scripts
          </div>
        </div>

        {/* Custom Folders Header & Form */}
        <div className="px-3 py-2.5 border-b border-white/10 flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Custom Folders
          </span>
          <button
            type="button"
            onClick={() => {
              setNewFolderParentId(null);
              setShowNewFolderForm((v) => !v);
            }}
            aria-label="New Custom Folder"
            className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 transition-colors cursor-pointer"
          >
            <FolderPlus className="w-3 h-3" aria-hidden="true" />
            <span>New Folder</span>
          </button>
        </div>

        {showNewFolderForm && (
          <form
            onSubmit={handleSubmitNewFolder}
            className="p-3 border-b border-white/10 bg-[#0e1015]/70 space-y-2"
          >
            <input
              aria-label="Custom folder name"
              placeholder="Folder name (e.g. Dungeon Pack)"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-[#0e1015] border border-white/15 rounded text-white focus:outline-none focus:border-emerald-500"
              autoFocus
            />
            <div className="flex items-center justify-between gap-2">
              <select
                aria-label="Parent folder"
                value={newFolderParentId ?? ''}
                onChange={(e) => setNewFolderParentId(e.target.value || null)}
                className="flex-1 min-w-0 px-2 py-1 text-[11px] bg-[#0e1015] border border-white/10 rounded text-slate-200 focus:outline-none"
              >
                <option value="">Workspace Root</option>
                {activeWorkspace.folders.map((f) => (
                  <option key={f.id} value={f.id}>
                    Inside: {f.name}
                  </option>
                ))}
              </select>
              <div className="flex items-center gap-1">
                {FOLDER_ACCENT_COLORS.map((col) => (
                  <button
                    key={col}
                    type="button"
                    onClick={() => setNewFolderColor(col)}
                    aria-label={`Folder color ${col}`}
                    className={`w-3.5 h-3.5 rounded-sm border cursor-pointer ${
                      newFolderColor === col ? 'border-white scale-110' : 'border-transparent opacity-70'
                    }`}
                    style={{ backgroundColor: col }}
                  />
                ))}
              </div>
            </div>
            <div className="flex items-center justify-end gap-1.5">
              <button
                type="button"
                onClick={() => setShowNewFolderForm(false)}
                className="px-2 py-1 text-[11px] text-slate-400 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-2.5 py-1 text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded cursor-pointer"
              >
                Add Folder
              </button>
            </div>
          </form>
        )}

        {/* Folders Tree List */}
        <div className="flex-1 overflow-y-auto studio-scroll p-2 space-y-1">
          {flattenedFolders.length === 0 ? (
            <div className="text-xs text-slate-400 p-3 text-center">
              No folders yet. Create a custom folder to store scripts, models, and maps.
            </div>
          ) : (
            flattenedFolders.map(({ folder, depth }) => {
              const isSelected = activeFolder?.id === folder.id;
              const isRenaming = renamingFolderId === folder.id;
              return (
                <div
                  key={folder.id}
                  style={{ paddingLeft: `${depth * 14 + 4}px` }}
                  className={`group flex items-center justify-between gap-1 rounded-md pr-1.5 py-1.5 transition-colors ${
                    isSelected
                      ? 'bg-blue-600/20 text-white border border-blue-500/40'
                      : 'text-slate-300 hover:bg-white/5 border border-transparent'
                  }`}
                >
                  {isRenaming ? (
                    <form
                      className="flex-1 flex items-center gap-1 px-1"
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (renamingFolderText.trim()) {
                          onRenameFolder(folder.id, renamingFolderText.trim());
                        }
                        setRenamingFolderId(null);
                      }}
                    >
                      <input
                        aria-label={`New name for folder "${folder.name}"`}
                        value={renamingFolderText}
                        onChange={(e) => setRenamingFolderText(e.target.value)}
                        className="flex-1 min-w-0 px-1.5 py-0.5 text-xs bg-[#0e1015] border border-blue-500 rounded text-white focus:outline-none"
                        autoFocus
                      />
                      <button
                        type="submit"
                        aria-label={`Save folder name "${folder.name}"`}
                        className="p-1 text-emerald-400 hover:text-emerald-300 cursor-pointer"
                      >
                        <Check className="w-3 h-3" aria-hidden="true" />
                      </button>
                    </form>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          onSelectFolder(folder.id);
                          setSelectedAsset(null);
                        }}
                        className="flex-1 min-w-0 flex items-center gap-2 text-left px-1.5 cursor-pointer"
                      >
                        <Folder
                          className="w-3.5 h-3.5 shrink-0"
                          style={{ color: folder.color }}
                          aria-hidden="true"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-medium truncate">{folder.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono-tabular">
                            {folder.models.length}M · {folder.maps.length}Map · {folder.scripts.length}Scr
                          </div>
                        </div>
                      </button>
                      <div className="flex items-center gap-0.5 opacity-80 group-hover:opacity-100 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setNewFolderParentId(folder.id);
                            setShowNewFolderForm(true);
                          }}
                          aria-label={`Add subfolder inside "${folder.name}"`}
                          title="Add Subfolder"
                          className="p-1 rounded text-slate-400 hover:text-emerald-300 hover:bg-white/5 cursor-pointer"
                        >
                          <FolderPlus className="w-3 h-3" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setRenamingFolderId(folder.id);
                            setRenamingFolderText(folder.name);
                          }}
                          aria-label={`Rename folder "${folder.name}"`}
                          title="Rename Folder"
                          className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/5 cursor-pointer"
                        >
                          <Edit3 className="w-3 h-3" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onDeleteFolder(folder.id);
                            setSelectedAsset(null);
                          }}
                          aria-label={`Delete folder "${folder.name}"`}
                          title="Delete Folder"
                          className="p-1 rounded text-slate-400 hover:text-red-400 hover:bg-red-500/10 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" aria-hidden="true" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>
      </aside>

      {/* Center Column: Folder Contents (Scripts, Models, Maps) */}
      <section
        aria-label="Folder Contents"
        className="flex-1 min-w-0 flex flex-col min-h-0"
      >
        {/* Top Action Toolbar */}
        <div className="px-4 py-3 border-b border-white/10 bg-[#151821]/60 flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-sm font-semibold text-white truncate">
              <Layers className="w-4 h-4 text-blue-400 shrink-0" aria-hidden="true" />
              <span className="truncate">{activeWorkspace.name}</span>
              {folderBreadcrumb.map((seg) => (
                <span key={seg.id} className="inline-flex items-center gap-1.5 text-slate-300">
                  <span className="text-slate-500">/</span>
                  <span className="truncate">{seg.name}</span>
                </span>
              ))}
            </div>
            {activeFolder ? (
              <p className="text-xs text-slate-400 mt-0.5 font-mono-tabular">
                {activeFolder.models.length} models · {activeFolder.maps.length} maps ·{' '}
                {activeFolder.scripts.length} scripts inside "{activeFolder.name}"
              </p>
            ) : (
              <p className="text-xs text-slate-400 mt-0.5">
                Create or select a folder to organize scripts, models, and maps.
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {activeFolder && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    onSaveActiveModelToFolder(activeFolder.id);
                    showNotice(`Saved model "${activeStudioModel.name}" to "${activeFolder.name}"`);
                  }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Save Active Model</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onSaveActiveMapToFolder(activeFolder.id);
                    showNotice(`Saved map "${activeMapScene.name}" to "${activeFolder.name}"`);
                  }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <MapIcon className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Save Active Map</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewScriptForm((v) => !v)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium bg-white/10 hover:bg-white/15 border border-white/15 text-slate-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <FileCode2 className="w-3.5 h-3.5 text-amber-300" aria-hidden="true" />
                  <span>+ New Script</span>
                </button>
              </>
            )}
            <button
              type="button"
              onClick={onSyncWorkspaceGitHub}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <UploadCloud className="w-3.5 h-3.5 text-blue-400" aria-hidden="true" />
              <span>Sync Workspace</span>
            </button>
            <button
              type="button"
              onClick={onExportWorkspace}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
              <span>Export .rbxlx</span>
            </button>
          </div>
        </div>

        {/* Status Feedback */}
        {statusNotice && (
          <div className="mx-4 mt-3 px-3 py-2 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300">
            {statusNotice}
          </div>
        )}

        {/* Inline New Script Form */}
        {showNewScriptForm && activeFolder && (
          <form
            onSubmit={handleSubmitNewScript}
            className="mx-4 mt-3 p-3 rounded-lg bg-[#151821] border border-white/12 flex flex-wrap items-end gap-2.5 text-xs"
          >
            <div className="flex-1 min-w-[160px]">
              <label className="block text-[11px] text-slate-400 mb-1">Script Name</label>
              <input
                aria-label="New script name"
                placeholder="e.g. DoorController"
                value={newScriptName}
                onChange={(e) => setNewScriptName(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-[#0e1015] border border-white/15 rounded text-white focus:outline-none focus:border-blue-500"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Class</label>
              <select
                aria-label="New script class"
                value={newScriptClass}
                onChange={(e) => setNewScriptClass(e.target.value as RobloxScriptClassName)}
                className="px-2.5 py-1.5 bg-[#0e1015] border border-white/15 rounded text-white focus:outline-none"
              >
                {SCRIPT_CLASS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Roblox Service</label>
              <select
                aria-label="New script Roblox service"
                value={newScriptService}
                onChange={(e) => setNewScriptService(e.target.value as RobloxServiceLocation)}
                className="px-2.5 py-1.5 bg-[#0e1015] border border-white/15 rounded text-white focus:outline-none"
              >
                {ROBLOX_SERVICE_LOCATIONS.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.shortLabel}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setShowNewScriptForm(false)}
                className="px-2.5 py-1.5 text-slate-400 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1.5 font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded cursor-pointer"
              >
                Add Script
              </button>
            </div>
          </form>
        )}

        {/* Filter Tabs */}
        {activeFolder && (
          <div className="px-4 pt-3 flex items-center gap-1 text-xs">
            {(
              [
                {
                  id: 'all',
                  label: `All (${activeFolder.models.length + activeFolder.maps.length + activeFolder.scripts.length})`,
                },
                { id: 'model', label: `Models (${activeFolder.models.length})` },
                { id: 'map', label: `Maps (${activeFolder.maps.length})` },
                { id: 'script', label: `Scripts (${activeFolder.scripts.length})` },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setAssetFilter(tab.id)}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  assetFilter === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-[#151821] text-slate-300 hover:text-white border border-white/10'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* Main Scrollable Contents */}
        <div className="flex-1 overflow-y-auto studio-scroll p-4 space-y-5">
          {!activeFolder ? (
            <div className="bg-[#151821] border border-white/10 rounded-lg p-6 text-center space-y-3">
              <p className="text-sm text-slate-300">No custom folder selected in "{activeWorkspace.name}".</p>
              <button
                type="button"
                onClick={() => setShowNewFolderForm(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-md cursor-pointer"
              >
                <FolderPlus className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Create First Folder</span>
              </button>
            </div>
          ) : (
            <>
              {/* MODELS SECTION */}
              {(assetFilter === 'all' || assetFilter === 'model') && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                      <Box className="w-3.5 h-3.5 text-blue-400" aria-hidden="true" />
                      <span>Models ({activeFolder.models.length})</span>
                    </span>
                  </div>
                  {activeFolder.models.length === 0 ? (
                    <div className="bg-[#151821]/60 border border-dashed border-white/10 rounded-lg px-3 py-3 text-xs text-slate-400">
                      No models stored in "{activeFolder.name}". Click &quot;Save Active Model&quot; above to add one.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {activeFolder.models.map((item) => {
                        const isSel =
                          selectedAsset?.kind === 'model' && selectedAsset.itemId === item.id;
                        const isRenamingThis =
                          renamingItem?.kind === 'model' && renamingItem.id === item.id;
                        return (
                          <div
                            key={item.id}
                            className={`bg-[#151821] border rounded-lg p-3 space-y-2.5 transition-colors ${
                              isSel ? 'border-blue-500/70' : 'border-white/10 hover:border-white/20'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              {isRenamingThis ? (
                                <form
                                  className="flex-1 flex items-center gap-1"
                                  onSubmit={(e) => {
                                    e.preventDefault();
                                    onRenameItemInFolder(
                                      activeFolder.id,
                                      'model',
                                      item.id,
                                      renamingItem.value
                                    );
                                    setRenamingItem(null);
                                  }}
                                >
                                  <input
                                    aria-label={`Rename model "${item.name}"`}
                                    value={renamingItem.value}
                                    onChange={(e) =>
                                      setRenamingItem({ ...renamingItem, value: e.target.value })
                                    }
                                    className="flex-1 min-w-0 px-2 py-0.5 text-xs bg-[#0e1015] border border-blue-500 rounded text-white focus:outline-none"
                                    autoFocus
                                  />
                                  <button
                                    type="submit"
                                    aria-label="Save model name"
                                    className="p-1 text-emerald-400 cursor-pointer"
                                  >
                                    <Check className="w-3.5 h-3.5" aria-hidden="true" />
                                  </button>
                                </form>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setSelectedAsset({ kind: 'model', itemId: item.id })
                                  }
                                  className="flex-1 min-w-0 text-left cursor-pointer"
                                >
                                  <div className="text-xs font-semibold text-white truncate">
                                    {item.name}
                                  </div>
                                  <div className="text-[11px] text-slate-400 font-mono-tabular mt-0.5">
                                    {item.model.parts.length} parts ·{' '}
                                    {item.model.animations?.length ?? 0} clips ·{' '}
                                    {item.model.scripts?.length ?? 0} scripts
                                  </div>
                                </button>
                              )}
                              <div className="flex items-center gap-0.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setRenamingItem({
                                      kind: 'model',
                                      id: item.id,
                                      value: item.name,
                                    })
                                  }
                                  aria-label={`Rename model "${item.name}"`}
                                  className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/5 cursor-pointer"
                                >
                                  <Edit3 className="w-3 h-3" aria-hidden="true" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    onDeleteItemFromFolder(activeFolder.id, 'model', item.id);
                                    if (isSel) setSelectedAsset(null);
                                  }}
                                  aria-label={`Delete model "${item.name}"`}
                                  className="p-1 rounded text-slate-400 hover:text-red-400 hover:bg-red-500/10 cursor-pointer"
                                >
                                  <Trash2 className="w-3 h-3" aria-hidden="true" />
                                </button>
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => onOpenModelInStudio(item.model)}
                                className="px-2.5 py-1 rounded text-[11px] font-semibold bg-blue-600/25 hover:bg-blue-600/40 text-blue-200 border border-blue-500/40 cursor-pointer"
                              >
                                Open in Model
                              </button>
                              <button
                                type="button"
                                onClick={() => onStampModelOnMap(item.model)}
                                className="px-2.5 py-1 rounded text-[11px] font-medium bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 cursor-pointer"
                              >
                                Stamp on Map
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* MAPS SECTION */}
              {(assetFilter === 'all' || assetFilter === 'map') && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                      <MapIcon className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                      <span>Maps ({activeFolder.maps.length})</span>
                    </span>
                  </div>
                  {activeFolder.maps.length === 0 ? (
                    <div className="bg-[#151821]/60 border border-dashed border-white/10 rounded-lg px-3 py-3 text-xs text-slate-400">
                      No maps stored in "{activeFolder.name}". Click &quot;Save Active Map&quot; above to add one.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {activeFolder.maps.map((item) => {
                        const isSel =
                          selectedAsset?.kind === 'map' && selectedAsset.itemId === item.id;
                        const isRenamingThis =
                          renamingItem?.kind === 'map' && renamingItem.id === item.id;
                        const span = (item.map.gridResolution - 1) * item.map.cellSizeStuds;
                        return (
                          <div
                            key={item.id}
                            className={`bg-[#151821] border rounded-lg p-3 space-y-2.5 transition-colors ${
                              isSel ? 'border-emerald-500/70' : 'border-white/10 hover:border-white/20'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              {isRenamingThis ? (
                                <form
                                  className="flex-1 flex items-center gap-1"
                                  onSubmit={(e) => {
                                    e.preventDefault();
                                    onRenameItemInFolder(
                                      activeFolder.id,
                                      'map',
                                      item.id,
                                      renamingItem.value
                                    );
                                    setRenamingItem(null);
                                  }}
                                >
                                  <input
                                    aria-label={`Rename map "${item.name}"`}
                                    value={renamingItem.value}
                                    onChange={(e) =>
                                      setRenamingItem({ ...renamingItem, value: e.target.value })
                                    }
                                    className="flex-1 min-w-0 px-2 py-0.5 text-xs bg-[#0e1015] border border-emerald-500 rounded text-white focus:outline-none"
                                    autoFocus
                                  />
                                  <button
                                    type="submit"
                                    aria-label="Save map name"
                                    className="p-1 text-emerald-400 cursor-pointer"
                                  >
                                    <Check className="w-3.5 h-3.5" aria-hidden="true" />
                                  </button>
                                </form>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setSelectedAsset({ kind: 'map', itemId: item.id })}
                                  className="flex-1 min-w-0 text-left cursor-pointer"
                                >
                                  <div className="text-xs font-semibold text-white truncate">
                                    {item.name}
                                  </div>
                                  <div className="text-[11px] text-slate-400 font-mono-tabular mt-0.5">
                                    {span}×{span} studs · {item.map.objects.length} objects ·{' '}
                                    {item.map.teams.length} teams
                                  </div>
                                </button>
                              )}
                              <div className="flex items-center gap-0.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setRenamingItem({
                                      kind: 'map',
                                      id: item.id,
                                      value: item.name,
                                    })
                                  }
                                  aria-label={`Rename map "${item.name}"`}
                                  className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/5 cursor-pointer"
                                >
                                  <Edit3 className="w-3 h-3" aria-hidden="true" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    onDeleteItemFromFolder(activeFolder.id, 'map', item.id);
                                    if (isSel) setSelectedAsset(null);
                                  }}
                                  aria-label={`Delete map "${item.name}"`}
                                  className="p-1 rounded text-slate-400 hover:text-red-400 hover:bg-red-500/10 cursor-pointer"
                                >
                                  <Trash2 className="w-3 h-3" aria-hidden="true" />
                                </button>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => onOpenMapInStudio(item.map)}
                                className="px-2.5 py-1 rounded text-[11px] font-semibold bg-emerald-600/25 hover:bg-emerald-600/40 text-emerald-200 border border-emerald-500/40 cursor-pointer"
                              >
                                Open in Map Editor
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* SCRIPTS SECTION */}
              {(assetFilter === 'all' || assetFilter === 'script') && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                      <Code2 className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
                      <span>Scripts ({activeFolder.scripts.length})</span>
                    </span>
                  </div>
                  {activeFolder.scripts.length === 0 ? (
                    <div className="bg-[#151821]/60 border border-dashed border-white/10 rounded-lg px-3 py-3 text-xs text-slate-400">
                      No scripts in "{activeFolder.name}". Click &quot;+ New Script&quot; above to add Luau scripts.
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {activeFolder.scripts.map((scr) => {
                        const isSel =
                          selectedAsset?.kind === 'script' && selectedAsset.itemId === scr.id;
                        const isRenamingThis =
                          renamingItem?.kind === 'script' && renamingItem.id === scr.id;
                        return (
                          <div
                            key={scr.id}
                            className={`bg-[#151821] border rounded-lg px-3 py-2 flex items-center justify-between gap-2 transition-colors ${
                              isSel ? 'border-amber-400/70' : 'border-white/10 hover:border-white/20'
                            }`}
                          >
                            {isRenamingThis ? (
                              <form
                                className="flex-1 flex items-center gap-1"
                                onSubmit={(e) => {
                                  e.preventDefault();
                                  onRenameItemInFolder(
                                    activeFolder.id,
                                    'script',
                                    scr.id,
                                    renamingItem.value
                                  );
                                  setRenamingItem(null);
                                }}
                              >
                                <input
                                  aria-label={`Rename script "${scr.name}"`}
                                  value={renamingItem.value}
                                  onChange={(e) =>
                                    setRenamingItem({ ...renamingItem, value: e.target.value })
                                  }
                                  className="flex-1 min-w-0 px-2 py-0.5 text-xs bg-[#0e1015] border border-amber-400 rounded text-white focus:outline-none"
                                  autoFocus
                                />
                                <button
                                  type="submit"
                                  aria-label="Save script name"
                                  className="p-1 text-emerald-400 cursor-pointer"
                                >
                                  <Check className="w-3.5 h-3.5" aria-hidden="true" />
                                </button>
                              </form>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setSelectedAsset({ kind: 'script', itemId: scr.id })}
                                className="flex-1 min-w-0 text-left cursor-pointer"
                              >
                                <div className="text-xs font-medium text-white truncate">
                                  {scr.name}
                                </div>
                                <div className="text-[11px] text-slate-400 font-mono-tabular">
                                  {scr.className} · {scr.service}
                                  {scr.disabled ? ' · Disabled' : ''}
                                </div>
                              </button>
                            )}
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  onSendScriptToModel(scr);
                                  showNotice(`Added "${scr.name}" to active model scripts`);
                                }}
                                className="px-2 py-1 rounded text-[11px] font-medium bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 cursor-pointer"
                              >
                                Inject to Model
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setRenamingItem({
                                    kind: 'script',
                                    id: scr.id,
                                    value: scr.name,
                                  })
                                }
                                aria-label={`Rename script "${scr.name}"`}
                                className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/5 cursor-pointer"
                              >
                                <Edit3 className="w-3 h-3" aria-hidden="true" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  onDeleteItemFromFolder(activeFolder.id, 'script', scr.id);
                                  if (isSel) setSelectedAsset(null);
                                }}
                                aria-label={`Delete script "${scr.name}"`}
                                className="p-1 rounded text-slate-400 hover:text-red-400 hover:bg-red-500/10 cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" aria-hidden="true" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* Right Column: Asset Details & Inline Luau Script Editor */}
      <aside
        aria-label="Workspace Item Inspector"
        className="hidden lg:flex w-80 xl:w-96 shrink-0 bg-[#151821] border-l border-white/10 flex-col min-h-0"
      >
        <div className="px-4 py-3 border-b border-white/10">
          <div className="text-xs font-semibold text-white">
            {selectedScript
              ? `Script: ${selectedScript.name}`
              : selectedModel
              ? `Model: ${selectedModel.name}`
              : selectedMap
              ? `Map: ${selectedMap.name}`
              : activeFolder
              ? `Folder: ${activeFolder.name}`
              : 'Workspace Inspector'}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {selectedScript
              ? `${selectedScript.className} in ${selectedScript.service}`
              : selectedModel
              ? `${selectedModel.model.parts.length} parts · Rigged Model`
              : selectedMap
              ? `${selectedMap.map.objects.length} objects · Playable Place`
              : 'Select any script, model, or map in the folder to inspect or move.'}
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto studio-scroll p-4 space-y-3 text-xs">
          {selectedScript && activeFolder ? (
            <div className="flex flex-col h-full space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Class</label>
                  <select
                    aria-label="Selected script class"
                    value={selectedScript.className}
                    onChange={(e) =>
                      onUpdateScriptInFolder(activeFolder.id, selectedScript.id, {
                        className: e.target.value as RobloxScriptClassName,
                      })
                    }
                    className="w-full px-2 py-1.5 bg-[#0e1015] border border-white/10 rounded text-white focus:outline-none"
                  >
                    {SCRIPT_CLASS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Service</label>
                  <select
                    aria-label="Selected script service"
                    value={selectedScript.service}
                    onChange={(e) =>
                      onUpdateScriptInFolder(activeFolder.id, selectedScript.id, {
                        service: e.target.value as RobloxServiceLocation,
                      })
                    }
                    className="w-full px-2 py-1.5 bg-[#0e1015] border border-white/10 rounded text-white focus:outline-none"
                  >
                    {ROBLOX_SERVICE_LOCATIONS.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.shortLabel}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedScript.disabled}
                  onChange={(e) =>
                    onUpdateScriptInFolder(activeFolder.id, selectedScript.id, {
                      disabled: e.target.checked,
                    })
                  }
                  className="accent-blue-500"
                />
                <span>Disabled in Roblox Studio</span>
              </label>

              <div className="flex-1 min-h-[240px] flex flex-col">
                <label className="block text-[11px] text-slate-400 mb-1">Luau Source</label>
                <textarea
                  aria-label="Folder script Luau source"
                  value={selectedScript.source}
                  onChange={(e) =>
                    onUpdateScriptInFolder(activeFolder.id, selectedScript.id, {
                      source: e.target.value,
                    })
                  }
                  spellCheck={false}
                  className="flex-1 w-full p-2.5 bg-[#0e1015] border border-white/10 rounded-md font-mono-tabular text-[11px] text-slate-200 focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              {otherFolders.length > 0 && (
                <div className="pt-2 border-t border-white/10">
                  <label className="block text-[11px] text-slate-400 mb-1 flex items-center gap-1">
                    <FolderInput className="w-3 h-3" aria-hidden="true" />
                    <span>Move Script to Folder</span>
                  </label>
                  <select
                    aria-label="Move script to folder"
                    value=""
                    onChange={(e) => {
                      if (!e.target.value) return;
                      onMoveItemBetweenFolders(
                        activeFolder.id,
                        e.target.value,
                        'script',
                        selectedScript.id
                      );
                      setSelectedAsset(null);
                    }}
                    className="w-full px-2 py-1.5 bg-[#0e1015] border border-white/10 rounded text-slate-200"
                  >
                    <option value="">Select destination folder...</option>
                    {otherFolders.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          ) : selectedModel && activeFolder ? (
            <div className="space-y-3">
              <div className="bg-[#0e1015] border border-white/10 rounded-lg p-3 space-y-1.5 font-mono-tabular">
                <div className="flex justify-between">
                  <span className="text-slate-400">Parts</span>
                  <span className="text-white">{selectedModel.model.parts.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Animations</span>
                  <span className="text-white">{selectedModel.model.animations?.length ?? 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Attached Scripts</span>
                  <span className="text-white">{selectedModel.model.scripts?.length ?? 0}</span>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => onOpenModelInStudio(selectedModel.model)}
                  className="w-full px-3 py-2 rounded-md font-semibold bg-blue-600 hover:bg-blue-500 text-white cursor-pointer"
                >
                  Load into Model &amp; Animate Studio
                </button>
                <button
                  type="button"
                  onClick={() => onStampModelOnMap(selectedModel.model)}
                  className="w-full px-3 py-2 rounded-md font-medium bg-white/10 hover:bg-white/15 text-white border border-white/10 cursor-pointer"
                >
                  Stamp onto Active Map
                </button>
              </div>
              {otherFolders.length > 0 && (
                <div className="pt-2 border-t border-white/10">
                  <label className="block text-[11px] text-slate-400 mb-1">Move Model to Folder</label>
                  <select
                    aria-label="Move model to folder"
                    value=""
                    onChange={(e) => {
                      if (!e.target.value) return;
                      onMoveItemBetweenFolders(
                        activeFolder.id,
                        e.target.value,
                        'model',
                        selectedModel.id
                      );
                      setSelectedAsset(null);
                    }}
                    className="w-full px-2 py-1.5 bg-[#0e1015] border border-white/10 rounded text-slate-200"
                  >
                    <option value="">Select destination folder...</option>
                    {otherFolders.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          ) : selectedMap && activeFolder ? (
            <div className="space-y-3">
              <div className="bg-[#0e1015] border border-white/10 rounded-lg p-3 space-y-1.5 font-mono-tabular">
                <div className="flex justify-between">
                  <span className="text-slate-400">Grid Size</span>
                  <span className="text-white">
                    {selectedMap.map.gridResolution}×{selectedMap.map.gridResolution}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Objects</span>
                  <span className="text-white">{selectedMap.map.objects.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Teams</span>
                  <span className="text-white">{selectedMap.map.teams.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Shop Items</span>
                  <span className="text-white">{selectedMap.map.shopItems.length}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onOpenMapInStudio(selectedMap.map)}
                className="w-full px-3 py-2 rounded-md font-semibold bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
              >
                Load into Map Editor
              </button>
              {otherFolders.length > 0 && (
                <div className="pt-2 border-t border-white/10">
                  <label className="block text-[11px] text-slate-400 mb-1">Move Map to Folder</label>
                  <select
                    aria-label="Move map to folder"
                    value=""
                    onChange={(e) => {
                      if (!e.target.value) return;
                      onMoveItemBetweenFolders(
                        activeFolder.id,
                        e.target.value,
                        'map',
                        selectedMap.id
                      );
                      setSelectedAsset(null);
                    }}
                    className="w-full px-2 py-1.5 bg-[#0e1015] border border-white/10 rounded text-slate-200"
                  >
                    <option value="">Select destination folder...</option>
                    {otherFolders.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3 text-slate-300 leading-relaxed">
              <div className="bg-[#0e1015] border border-white/10 rounded-lg p-3 space-y-1.5 font-mono-tabular">
                <div className="flex justify-between">
                  <span className="text-slate-400">Workspace</span>
                  <span className="text-white truncate max-w-[160px]">{activeWorkspace.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Custom Folders</span>
                  <span className="text-white">{workspaceReport.folderCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Models</span>
                  <span className="text-blue-300">{workspaceReport.modelCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Maps</span>
                  <span className="text-emerald-300">{workspaceReport.mapCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Scripts</span>
                  <span className="text-amber-300">{workspaceReport.scriptCount}</span>
                </div>
              </div>
              <p className="text-xs text-slate-400">
                1 Workspace stores unlimited custom folders. Inside every folder you can save Models, Maps, and Luau Scripts, load them back into the 3D editor, or export the entire folder tree to a single Roblox <span className="font-mono-tabular text-slate-200">.rbxlx</span> Place or Rojo 7 project.
              </p>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
