import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Code2,
  Copy,
  Download,
  FileBox,
  FolderTree,
  Info,
  UploadCloud,
  X,
} from 'lucide-react';
import { exportModelToGlb } from '../engine/glbExporter';
import {
  generateRbxlx,
  validateMapForRoblox,
} from '../engine/mapExporter';
import { getMapServiceScriptNodes } from '../engine/mapScripts';
import { StudioMapScene } from '../engine/mapTypes';
import {
  generateFrameworkScripts,
  generateLuauAnimationScript,
  generateLuauMultiStageScript,
  generateLuauScript,
  generateObjAndMtl,
  generateRbxmx,
  sanitizeIdentifier,
  validateModelForRoblox,
} from '../engine/robloxExporter';
import { FrameworkModuleId } from '../engine/robloxScriptFramework';
import { ExportScaleMode, StudioSceneModel } from '../engine/robloxTypes';
import {
  generateWorkspaceRbxlx,
  validateWorkspaceForRoblox,
} from '../engine/workspaceStore';
import { StudioWorkspace } from '../engine/workspaceTypes';

interface RobloxExportModalProps {
  model: StudioSceneModel;
  map?: StudioMapScene;
  workspace?: StudioWorkspace;
  defaultScope?: 'model' | 'map' | 'workspace';
  onClose: () => void;
  onOpenGitHubSync?: () => void;
}

type ExportTab = 'rbxmx' | 'framework' | 'luau-anim' | 'glb' | 'obj' | 'luau';
type MapExportTab = 'rbxlx' | 'map-scripts' | 'map-json';
type WorkspaceExportTab = 'ws-rbxlx' | 'ws-json';

const FRAMEWORK_MODULES: { id: FrameworkModuleId; kind: 'Script' | 'ModuleScript'; desc: string }[] = [
  {
    id: 'ModelRuntime',
    kind: 'Script',
    desc: 'Entry Server/Model Script wiring RigAnimator, FXController, SoundController, and Package Stage attributes.',
  },
  {
    id: 'RigAnimator',
    kind: 'ModuleScript',
    desc: 'Hybrid Animator (GetMarkerReachedSignal) + procedural Motor6D.Transform weighted playback loop.',
  },
  {
    id: 'FXController',
    kind: 'ModuleScript',
    desc: 'Controls ParticleEmitters, Trails, and PointLights with marker-driven Emit / Enable / Pulse triggers.',
  },
  {
    id: 'SoundController',
    kind: 'ModuleScript',
    desc: 'Resolves Audio Folder Sound instances and plays keyframe-synced SFX with pitch jitter.',
  },
  {
    id: 'StageConfig',
    kind: 'ModuleScript',
    desc: 'Generated AnimationPriority, FadeTime, DefaultWeight, Markers, and Motor6D Transform keyframes.',
  },
];

function triggerFileDownload(filename: string, content: BlobPart, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function RobloxExportModal({
  model,
  map,
  workspace,
  defaultScope = 'model',
  onClose,
  onOpenGitHubSync,
}: RobloxExportModalProps) {
  const [exportScope, setExportScope] = useState<'model' | 'map' | 'workspace'>(() => {
    if (workspace && defaultScope === 'workspace') return 'workspace';
    if (map && defaultScope === 'map') return 'map';
    return 'model';
  });
  const [activeTab, setActiveTab] = useState<ExportTab>('rbxmx');
  const [activeMapTab, setActiveMapTab] = useState<MapExportTab>('rbxlx');
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<WorkspaceExportTab>('ws-rbxlx');
  const [activeMapScriptId, setActiveMapScriptId] = useState<string>('map_scr_gamemanager');
  const [activeModuleId, setActiveModuleId] = useState<FrameworkModuleId>('ModelRuntime');
  const [scaleMode, setScaleMode] = useState<ExportScaleMode>('studs');
  const [centerAtOrigin, setCenterAtOrigin] = useState(true);
  const [includeHidden, setIncludeHidden] = useState(false);
  const [exportAsPackage, setExportAsPackage] = useState(true);
  const [includeAudioFolder, setIncludeAudioFolder] = useState(true);
  const [includeScriptsFolder, setIncludeScriptsFolder] = useState(true);
  const [resampleTransforms, setResampleTransforms] = useState(false);

  const [selectedClipId, setSelectedClipId] = useState<string>(
    () => model.animations?.[0]?.id ?? ''
  );
  const [luauAnimScope, setLuauAnimScope] = useState<'all' | 'single'>(() =>
    (model.animations?.filter((c) => c.tracks.length > 0).length ?? 0) > 1 ? 'all' : 'single'
  );
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isExportingGlb, setIsExportingGlb] = useState(false);
  const [lastExportStatus, setLastExportStatus] = useState<string | null>(null);

  const report = useMemo(() => validateModelForRoblox(model), [model]);
  const animations = model.animations ?? [];

  const exportOpts = useMemo(
    () => ({
      scaleMode,
      centerAtOrigin,
      includeHidden,
      exportAsPackage,
      includeAudioFolder,
      includeScriptsFolder,
      resampleTransforms,
    }),
    [
      scaleMode,
      centerAtOrigin,
      includeHidden,
      exportAsPackage,
      includeAudioFolder,
      includeScriptsFolder,
      resampleTransforms,
    ]
  );

  const rbxmxContent = useMemo(() => generateRbxmx(model, exportOpts), [model, exportOpts]);
  const frameworkModules = useMemo(
    () => generateFrameworkScripts(model, exportOpts),
    [model, exportOpts]
  );
  const luauContent = useMemo(() => generateLuauScript(model, exportOpts), [model, exportOpts]);
  const luauAnimContent = useMemo(
    () =>
      luauAnimScope === 'all' && animations.length > 1
        ? generateLuauMultiStageScript(model, exportOpts)
        : generateLuauAnimationScript(model, selectedClipId || animations[0]?.id, exportOpts),
    [model, luauAnimScope, selectedClipId, animations, exportOpts]
  );
  const baseFilename = sanitizeIdentifier(model.name).replace(/\s+/g, '_') || 'RobloxModel';

  // Full Roblox Map Export Data
  const mapReport = useMemo(() => (map ? validateMapForRoblox(map) : null), [map]);
  const mapScripts = useMemo(() => (map ? getMapServiceScriptNodes(map) : []), [map]);
  const rbxlxContent = useMemo(
    () => (map && exportScope === 'map' ? generateRbxlx(map) : ''),
    [map, exportScope]
  );
  const mapBaseFilename = useMemo(
    () => (map ? sanitizeIdentifier(map.name).replace(/\s+/g, '_') || 'RobloxMap' : 'RobloxMap'),
    [map]
  );
  const mapJsonContent = useMemo(
    () => (map && exportScope === 'map' ? JSON.stringify(map, null, 2) : ''),
    [map, exportScope]
  );
  const activeMapScript = useMemo(
    () => mapScripts.find((s) => s.id === activeMapScriptId) ?? mapScripts[0] ?? null,
    [mapScripts, activeMapScriptId]
  );

  // Full Workspace Export Data (multi-folder scripts, models, and maps)
  const workspaceReport = useMemo(
    () => (workspace ? validateWorkspaceForRoblox(workspace) : null),
    [workspace]
  );
  const workspaceBaseFilename = useMemo(
    () =>
      workspace
        ? sanitizeIdentifier(workspace.name).replace(/\s+/g, '_') || 'RobloxWorkspace'
        : 'RobloxWorkspace',
    [workspace]
  );
  const workspaceRbxlxContent = useMemo(
    () => (workspace && exportScope === 'workspace' ? generateWorkspaceRbxlx(workspace) : ''),
    [workspace, exportScope]
  );
  const workspaceJsonContent = useMemo(
    () => (workspace && exportScope === 'workspace' ? JSON.stringify(workspace, null, 2) : ''),
    [workspace, exportScope]
  );

  const handleDownloadRbxmx = () => {
    const suffix = exportAsPackage ? '_Package' : '';
    triggerFileDownload(`${baseFilename}${suffix}.rbxmx`, rbxmxContent, 'application/xml');
    setLastExportStatus(`Downloaded ${baseFilename}${suffix}.rbxmx`);
  };

  const handleDownloadRbxlx = () => {
    if (!rbxlxContent) return;
    triggerFileDownload(`${mapBaseFilename}.rbxlx`, rbxlxContent, 'application/xml');
    setLastExportStatus(`Downloaded ${mapBaseFilename}.rbxlx (Full Roblox Studio Place)`);
  };

  const handleDownloadMapJson = () => {
    if (!mapJsonContent) return;
    triggerFileDownload(
      `${mapBaseFilename}.studforge-map.json`,
      mapJsonContent,
      'application/json'
    );
    setLastExportStatus(`Downloaded ${mapBaseFilename}.studforge-map.json`);
  };

  const handleDownloadWorkspaceRbxlx = () => {
    if (!workspaceRbxlxContent) return;
    triggerFileDownload(
      `${workspaceBaseFilename}.rbxlx`,
      workspaceRbxlxContent,
      'application/xml'
    );
    setLastExportStatus(`Downloaded ${workspaceBaseFilename}.rbxlx (Multi-Folder Workspace Place)`);
  };

  const handleDownloadWorkspaceJson = () => {
    if (!workspaceJsonContent) return;
    triggerFileDownload(
      `${workspaceBaseFilename}.studforge-workspace.json`,
      workspaceJsonContent,
      'application/json'
    );
    setLastExportStatus(`Downloaded ${workspaceBaseFilename}.studforge-workspace.json`);
  };

  const handleDownloadObjAndMtl = () => {
    const { obj, mtl } = generateObjAndMtl(model, exportOpts);
    triggerFileDownload(`${baseFilename}.obj`, obj, 'text/plain');
    setTimeout(() => {
      triggerFileDownload(`${baseFilename}.mtl`, mtl, 'text/plain');
    }, 150);
    setLastExportStatus(`Downloaded ${baseFilename}.obj & .mtl`);
  };

  const handleDownloadGlb = async () => {
    setIsExportingGlb(true);
    setLastExportStatus(null);
    try {
      const buffer = await exportModelToGlb(model, exportOpts);
      triggerFileDownload(`${baseFilename}.glb`, buffer, 'model/gltf-binary');
      setLastExportStatus(`Downloaded ${baseFilename}.glb`);
    } catch (err) {
      setLastExportStatus(
        err instanceof Error ? `GLB export error: ${err.message}` : 'Failed to export GLB'
      );
    } finally {
      setIsExportingGlb(false);
    }
  };

  const handleCopyText = async (text: string, id: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
      setLastExportStatus(`Copied ${label}`);
    } catch {
      setLastExportStatus('Clipboard unavailable; download the .luau file instead.');
    }
  };

  const handleDownloadLuau = (content: string, suffix: string, customBase?: string) => {
    const prefix = customBase ?? baseFilename;
    triggerFileDownload(`${prefix}${suffix}.luau`, content, 'text/plain');
    setLastExportStatus(`Downloaded ${prefix}${suffix}.luau`);
  };

  const activeModuleMeta =
    FRAMEWORK_MODULES.find((m) => m.id === activeModuleId) ?? FRAMEWORK_MODULES[0];
  const activeModuleCode = frameworkModules[activeModuleId];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-modal-title"
    >
      <div className="w-full max-w-4xl bg-[#151821] border border-white/12 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/10 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="export-modal-title" className="text-base font-semibold text-white">
              Export for Roblox Studio
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {exportScope === 'workspace' && workspace && workspaceReport
                ? `${workspace.name} · ${workspaceReport.folderCount} custom folders · ${workspaceReport.modelCount} models · ${workspaceReport.mapCount} maps · ${workspaceReport.scriptCount} scripts`
                : exportScope === 'map' && map && mapReport
                ? `${map.name} · ${mapReport.terrainMergedParts} terrain chunks · ${mapReport.objectCount} objects · ${mapReport.spawnCount} spawns · ${mapReport.stampedModelCount} rigs · ${mapReport.scriptCount} scripts`
                : `${model.name} · ${report.visiblePartCount} parts · ${report.jointCount} Motor6D · ${report.effectCount} FX · ${report.soundCount} Sounds · ${report.markerCount} Markers · ${report.scriptCount} Scripts`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {(map || workspace) && (
              <div className="inline-flex bg-[#0e1015] border border-white/10 rounded-lg p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setExportScope('model');
                    setLastExportStatus(null);
                  }}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    exportScope === 'model'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Active Model
                </button>
                {map && (
                  <button
                    type="button"
                    onClick={() => {
                      setExportScope('map');
                      setLastExportStatus(null);
                    }}
                    className={`px-2.5 py-1 rounded-md font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      exportScope === 'map'
                        ? 'bg-emerald-600 text-white'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    Full Map (.rbxlx)
                  </button>
                )}
                {workspace && (
                  <button
                    type="button"
                    onClick={() => {
                      setExportScope('workspace');
                      setLastExportStatus(null);
                    }}
                    className={`px-2.5 py-1 rounded-md font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      exportScope === 'workspace'
                        ? 'bg-violet-600 text-white'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    Workspace (.rbxlx)
                  </button>
                )}
              </div>
            )}
            {onOpenGitHubSync && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenGitHubSync();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white/10 hover:bg-white/15 border border-white/15 text-slate-100 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <UploadCloud className="w-3.5 h-3.5 text-blue-400" aria-hidden="true" />
                <span>GitHub / Rojo Sync</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
              aria-label="Close export modal"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto studio-scroll p-5 space-y-4">
          {exportScope === 'workspace' && workspace && workspaceReport ? (
            <>
              {/* Workspace Validation Summary */}
              <div className="bg-[#0e1015] border border-white/10 rounded-lg p-3.5 space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono-tabular">
                  <div>
                    <div className="text-slate-400 text-[11px]">Custom Folders</div>
                    <div className="text-slate-100 font-semibold mt-0.5">
                      {workspaceReport.folderCount}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-400 text-[11px]">Models</div>
                    <div className="text-blue-300 font-semibold mt-0.5">
                      {workspaceReport.modelCount}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-400 text-[11px]">Maps</div>
                    <div className="text-emerald-300 font-semibold mt-0.5">
                      {workspaceReport.mapCount}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-400 text-[11px]">Luau Scripts</div>
                    <div className="text-amber-300 font-semibold mt-0.5">
                      {workspaceReport.scriptCount}
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-white/10 space-y-1.5">
                  {workspaceReport.issues.map((issue, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs">
                      {issue.severity === 'error' ? (
                        <AlertTriangle
                          className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5"
                          aria-hidden="true"
                        />
                      ) : issue.severity === 'warning' ? (
                        <AlertTriangle
                          className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5"
                          aria-hidden="true"
                        />
                      ) : (
                        <Info
                          className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5"
                          aria-hidden="true"
                        />
                      )}
                      <span
                        className={
                          issue.severity === 'error'
                            ? 'text-red-300'
                            : issue.severity === 'warning'
                            ? 'text-amber-200'
                            : 'text-slate-300'
                        }
                      >
                        {issue.message}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Workspace Format Tabs */}
              <div className="flex flex-wrap items-center gap-1 p-1 bg-[#0e1015] border border-white/10 rounded-lg">
                {(
                  [
                    { id: 'ws-rbxlx', label: '.rbxlx Multi-Folder Roblox Place' },
                    { id: 'ws-json', label: '.studforge-workspace.json' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveWorkspaceTab(tab.id)}
                    className={`flex-1 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      activeWorkspaceTab === tab.id
                        ? 'bg-violet-600 text-white'
                        : 'text-slate-400 hover:text-slate-100'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {activeWorkspaceTab === 'ws-rbxlx' && (
                <div className="space-y-3">
                  <div className="bg-[#0e1015] border border-white/10 rounded-lg p-3 text-xs text-slate-300 leading-relaxed flex items-start gap-2.5">
                    <FolderTree
                      className="w-4 h-4 text-violet-400 shrink-0 mt-0.5"
                      aria-hidden="true"
                    />
                    <div>
                      Exports the entire <span className="font-mono-tabular text-white">{workspace.name}</span>{' '}
                      folder hierarchy into{' '}
                      <span className="font-mono-tabular text-white">{workspaceBaseFilename}.rbxlx</span>. Each custom folder becomes a Roblox{' '}
                      <span className="font-mono-tabular text-violet-300">Folder</span> instance inside{' '}
                      <span className="font-mono-tabular text-slate-100">Workspace</span>,{' '}
                      <span className="font-mono-tabular text-emerald-300">ServerScriptService</span>,{' '}
                      <span className="font-mono-tabular text-slate-100">ReplicatedStorage</span>, and{' '}
                      <span className="font-mono-tabular text-cyan-300">StarterPlayerScripts</span>{' '}
                      containing all stored models, maps, and Luau scripts.
                    </div>
                  </div>

                  <pre className="bg-[#0e1015] border border-white/10 rounded-lg p-3 text-[11px] font-mono-tabular text-slate-300 max-h-48 overflow-auto studio-scroll">
                    {workspaceRbxlxContent.split('\n').slice(0, 44).join('\n')}
                    {workspaceRbxlxContent.split('\n').length > 44 ? '\n...' : ''}
                  </pre>

                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      type="button"
                      disabled={!workspaceReport.rbxlxReady}
                      onClick={handleDownloadWorkspaceRbxlx}
                      className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white rounded-lg transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Download {workspaceBaseFilename}.rbxlx</span>
                    </button>
                    {onOpenGitHubSync && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenGitHubSync();
                        }}
                        className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 rounded-lg transition-colors cursor-pointer"
                      >
                        <UploadCloud className="w-3.5 h-3.5 text-blue-400" aria-hidden="true" />
                        <span>Export Rojo 7 Workspace Bundle</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {activeWorkspaceTab === 'ws-json' && (
                <div className="space-y-3">
                  <div className="text-xs text-slate-300 leading-relaxed">
                    Complete portable StudForge Workspace JSON backup containing all custom folders, nested subfolders, Luau scripts, rigged models, and full terrain maps.
                  </div>
                  <pre className="bg-[#0e1015] border border-white/10 rounded-lg p-3 text-[11px] font-mono-tabular text-slate-300 max-h-52 overflow-auto studio-scroll">
                    {workspaceJsonContent.split('\n').slice(0, 48).join('\n')}
                    {workspaceJsonContent.split('\n').length > 48 ? '\n...' : ''}
                  </pre>
                  <button
                    type="button"
                    onClick={handleDownloadWorkspaceJson}
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Download {workspaceBaseFilename}.studforge-workspace.json</span>
                  </button>
                </div>
              )}
            </>
          ) : exportScope === 'map' && map && mapReport ? (
            <>
              {/* Map Validation Summary */}
              <div className="bg-[#0e1015] border border-white/10 rounded-lg p-3.5 space-y-3">
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 text-xs font-mono-tabular">
                  <div>
                    <div className="text-slate-400 text-[11px]">Terrain Chunks</div>
                    <div className="text-slate-100 font-semibold mt-0.5">
                      {mapReport.terrainMergedParts}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-400 text-[11px]">Map Objects</div>
                    <div className="text-slate-100 font-semibold mt-0.5">
                      {mapReport.objectCount}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-400 text-[11px]">Spawns</div>
                    <div className="text-blue-300 font-semibold mt-0.5">
                      {mapReport.spawnCount}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-400 text-[11px]">Checkpoints</div>
                    <div className="text-emerald-300 font-semibold mt-0.5">
                      {mapReport.checkpointCount}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-400 text-[11px]">Stamped Rigs</div>
                    <div className="text-amber-300 font-semibold mt-0.5">
                      {mapReport.stampedModelCount + mapReport.npcSpawnerCount}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-400 text-[11px]">Luau Scripts</div>
                    <div className="text-cyan-300 font-semibold mt-0.5">
                      {mapReport.scriptCount}
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-white/10 space-y-1.5">
                  {mapReport.issues.map((issue, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs">
                      {issue.severity === 'error' ? (
                        <AlertTriangle
                          className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5"
                          aria-hidden="true"
                        />
                      ) : issue.severity === 'warning' ? (
                        <AlertTriangle
                          className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5"
                          aria-hidden="true"
                        />
                      ) : (
                        <Info
                          className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5"
                          aria-hidden="true"
                        />
                      )}
                      <span
                        className={
                          issue.severity === 'error'
                            ? 'text-red-300'
                            : issue.severity === 'warning'
                            ? 'text-amber-200'
                            : 'text-slate-300'
                        }
                      >
                        {issue.message}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Map Format Tabs */}
              <div className="flex flex-wrap items-center gap-1 p-1 bg-[#0e1015] border border-white/10 rounded-lg">
                {(
                  [
                    { id: 'rbxlx', label: '.rbxlx Full Roblox Place' },
                    { id: 'map-scripts', label: `Full Map Scripts (${mapScripts.length})` },
                    { id: 'map-json', label: '.studforge-map.json' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveMapTab(tab.id)}
                    className={`flex-1 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      activeMapTab === tab.id
                        ? 'bg-emerald-600 text-white'
                        : 'text-slate-400 hover:text-slate-100'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {activeMapTab === 'rbxlx' && (
                <div className="space-y-3">
                  <div className="bg-[#0e1015] border border-white/10 rounded-lg p-3 text-xs text-slate-300 leading-relaxed flex items-start gap-2.5">
                    <FolderTree
                      className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5"
                      aria-hidden="true"
                    />
                    <div>
                      Exports a complete playable Roblox Studio Place{' '}
                      <span className="font-mono-tabular text-white">{mapBaseFilename}.rbxlx</span>{' '}
                      containing{' '}
                      <span className="font-mono-tabular text-slate-100">Workspace</span>{' '}
                      (greedy-merged Terrain blocks, Water, Gameplay Prefabs, Rigged Stamped Models),{' '}
                      <span className="font-mono-tabular text-slate-100">Lighting</span>{' '}
                      (Atmosphere, Sky, BloomEffect),{' '}
                      <span className="font-mono-tabular text-slate-100">Teams</span>,{' '}
                      <span className="font-mono-tabular text-slate-100">ReplicatedStorage</span>{' '}
                      (MapConfig, Remotes, NPCTemplates),{' '}
                      <span className="font-mono-tabular text-emerald-300">ServerScriptService</span>{' '}
                      (6 Server Scripts),{' '}
                      <span className="font-mono-tabular text-cyan-300">StarterPlayerScripts</span>{' '}
                      (MapHUD + MapClientFX), and{' '}
                      <span className="font-mono-tabular text-slate-100">SoundService</span>.
                    </div>
                  </div>

                  <pre className="bg-[#0e1015] border border-white/10 rounded-lg p-3 text-[11px] font-mono-tabular text-slate-300 max-h-48 overflow-auto studio-scroll">
                    {rbxlxContent.split('\n').slice(0, 44).join('\n')}
                    {rbxlxContent.split('\n').length > 44 ? '\n...' : ''}
                  </pre>

                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      type="button"
                      disabled={!mapReport.rbxlxReady}
                      onClick={handleDownloadRbxlx}
                      className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-lg transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Download {mapBaseFilename}.rbxlx</span>
                    </button>
                    {onOpenGitHubSync && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenGitHubSync();
                        }}
                        className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 rounded-lg transition-colors cursor-pointer"
                      >
                        <UploadCloud className="w-3.5 h-3.5 text-blue-400" aria-hidden="true" />
                        <span>Export Rojo 7 Map Bundle</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {activeMapTab === 'map-scripts' && activeMapScript && (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {mapScripts.map((scr) => (
                      <button
                        key={scr.id}
                        type="button"
                        onClick={() => setActiveMapScriptId(scr.id)}
                        className={`px-2.5 py-1.5 rounded-md text-xs font-medium border transition-colors cursor-pointer whitespace-nowrap ${
                          activeMapScript.id === scr.id
                            ? 'bg-emerald-600/25 border-emerald-400/60 text-emerald-200'
                            : 'bg-[#0e1015] border-white/10 text-slate-300 hover:text-white'
                        }`}
                      >
                        <span>{scr.name}</span>
                        <span className="ml-1.5 text-[10px] opacity-70">
                          ({scr.className === 'Script' ? 'Server' : scr.className === 'LocalScript' ? 'Client' : 'Module'})
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300 bg-[#0e1015]/60 border border-white/10 rounded-lg px-3 py-2">
                    <span>
                      Target: <span className="font-mono-tabular text-white">{activeMapScript.service}/{activeMapScript.name}</span> ·{' '}
                      <span className="font-mono-tabular text-slate-400">{activeMapScript.className}</span>
                    </span>
                    <span className="font-mono-tabular text-[11px] text-slate-400">
                      {activeMapScript.disabled ? 'Disabled by system toggle' : 'Active'}
                    </span>
                  </div>

                  <pre className="bg-[#0e1015] border border-white/10 rounded-lg p-3 text-[11px] font-mono-tabular text-slate-300 max-h-56 overflow-auto studio-scroll">
                    {activeMapScript.source}
                  </pre>

                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() =>
                        handleCopyText(
                          activeMapScript.source,
                          `map_${activeMapScript.id}`,
                          `${activeMapScript.name}.luau`
                        )
                      }
                      className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors cursor-pointer"
                    >
                      {copiedId === `map_${activeMapScript.id}` ? (
                        <Check className="w-3.5 h-3.5" aria-hidden="true" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                      )}
                      <span>
                        {copiedId === `map_${activeMapScript.id}`
                          ? `Copied ${activeMapScript.name}`
                          : `Copy ${activeMapScript.name}.luau`}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleDownloadLuau(activeMapScript.source, `_${activeMapScript.name}`, mapBaseFilename)
                      }
                      className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 rounded-lg transition-colors cursor-pointer"
                    >
                      <Code2 className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Download {activeMapScript.name}.luau</span>
                    </button>
                  </div>
                </div>
              )}

              {activeMapTab === 'map-json' && (
                <div className="space-y-3">
                  <div className="text-xs text-slate-300 leading-relaxed">
                    Complete StudForge Map JSON snapshot including terrain heightfield, biome paint grid, objects, teams, shop items, and gameplay toggles.
                  </div>
                  <pre className="bg-[#0e1015] border border-white/10 rounded-lg p-3 text-[11px] font-mono-tabular text-slate-300 max-h-52 overflow-auto studio-scroll">
                    {mapJsonContent.split('\n').slice(0, 48).join('\n')}
                    {mapJsonContent.split('\n').length > 48 ? '\n...' : ''}
                  </pre>
                  <button
                    type="button"
                    onClick={handleDownloadMapJson}
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Download {mapBaseFilename}.studforge-map.json</span>
                  </button>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Validation Summary */}
          <div className="bg-[#0e1015] border border-white/10 rounded-lg p-3.5 space-y-3">
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 text-xs font-mono-tabular">
              <div>
                <div className="text-slate-400 text-[11px]">Native Parts</div>
                <div className="text-slate-100 font-semibold mt-0.5">
                  {report.nativeRbxPartCount} / {report.visiblePartCount}
                </div>
              </div>
              <div>
                <div className="text-slate-400 text-[11px]">Motor6D</div>
                <div className="text-slate-100 font-semibold mt-0.5">{report.jointCount}</div>
              </div>
              <div>
                <div className="text-slate-400 text-[11px]">Attachments</div>
                <div className="text-emerald-300 font-semibold mt-0.5">
                  {report.attachmentCount}
                </div>
              </div>
              <div>
                <div className="text-slate-400 text-[11px]">FX / Lights</div>
                <div className="text-amber-300 font-semibold mt-0.5">{report.effectCount}</div>
              </div>
              <div>
                <div className="text-slate-400 text-[11px]">Sounds</div>
                <div className="text-cyan-300 font-semibold mt-0.5">{report.soundCount}</div>
              </div>
              <div>
                <div className="text-slate-400 text-[11px]">Markers</div>
                <div className="text-slate-100 font-semibold mt-0.5">
                  {report.markerCount} ({report.animationClipCount} clips)
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-white/10 space-y-1.5">
              {report.issues.map((issue, i) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  {issue.severity === 'error' ? (
                    <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" aria-hidden="true" />
                  ) : issue.severity === 'warning' ? (
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
                  ) : (
                    <Info className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" aria-hidden="true" />
                  )}
                  <span
                    className={
                      issue.severity === 'error'
                        ? 'text-red-300'
                        : issue.severity === 'warning'
                        ? 'text-amber-200'
                        : 'text-slate-300'
                    }
                  >
                    {issue.message}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Export Options */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs bg-[#0e1015]/60 border border-white/10 rounded-lg px-3 py-2.5">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Unit Scale:</span>
              <div className="inline-flex bg-[#0e1015] border border-white/10 rounded-md p-0.5">
                <button
                  type="button"
                  onClick={() => setScaleMode('studs')}
                  className={`px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                    scaleMode === 'studs'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  1:1 Studs
                </button>
                <button
                  type="button"
                  onClick={() => setScaleMode('meters')}
                  className={`px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                    scaleMode === 'meters'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  0.28 m/Stud
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3.5">
              <label className="flex items-center gap-1.5 text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={exportAsPackage}
                  onChange={(e) => setExportAsPackage(e.target.checked)}
                  className="accent-blue-500"
                />
                <span>Package Folder</span>
              </label>
              {exportAsPackage && (
                <>
                  <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeAudioFolder}
                      onChange={(e) => setIncludeAudioFolder(e.target.checked)}
                      className="accent-blue-500"
                    />
                    <span>Audio Folder</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeScriptsFolder}
                      onChange={(e) => setIncludeScriptsFolder(e.target.checked)}
                      className="accent-blue-500"
                    />
                    <span>Scripts Folder</span>
                  </label>
                </>
              )}
              <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={resampleTransforms}
                  onChange={(e) => setResampleTransforms(e.target.checked)}
                  className="accent-blue-500"
                />
                <span>Dense Resample</span>
              </label>
              <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={centerAtOrigin}
                  onChange={(e) => setCenterAtOrigin(e.target.checked)}
                  className="accent-blue-500"
                />
                <span>Center (0,0,0)</span>
              </label>
              <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeHidden}
                  onChange={(e) => setIncludeHidden(e.target.checked)}
                  className="accent-blue-500"
                />
                <span>Hidden</span>
              </label>
            </div>
          </div>

          {/* Format Tabs */}
          <div className="flex flex-wrap items-center gap-1 p-1 bg-[#0e1015] border border-white/10 rounded-lg">
            {(
              [
                { id: 'rbxmx', label: '.rbxmx (Package + Rig)' },
                { id: 'framework', label: 'Luau Framework (5)' },
                { id: 'luau-anim', label: 'Luau Animation' },
                { id: 'glb', label: '.glb (3D)' },
                { id: 'obj', label: '.obj + .mtl' },
                { id: 'luau', label: 'Luau Builder' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab 1: RBXMX Package */}
          {activeTab === 'rbxmx' && (
            <div className="space-y-3">
              <div className="bg-[#0e1015] border border-white/10 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-start gap-2.5">
                  <FolderTree className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
                  <div className="text-slate-300 leading-relaxed">
                    {exportAsPackage ? (
                      <span>
                        Exports <span className="font-mono-tabular text-white">{baseFilename}_Package</span>{' '}
                        Folder containing rigged <span className="font-mono-tabular text-white">Model</span>{' '}
                        (Motor6Ds, Attachments, FX, <span className="font-mono-tabular text-white">AnimSaves</span>{' '}
                        with <span className="font-mono-tabular text-amber-300">KeyframeMarker</span>s),{' '}
                        {includeAudioFolder && <span className="font-mono-tabular text-cyan-300">Audio/ </span>}
                        and{' '}
                        {includeScriptsFolder && (
                          <span className="font-mono-tabular text-emerald-300">Scripts/ (5 modules)</span>
                        )}
                        .
                      </span>
                    ) : (
                      <span>
                        Exports standalone rigged <span className="font-mono-tabular text-white">Model</span>{' '}
                        with Motor6D joints, Attachments, ParticleEmitters, Trails, PointLights, AnimationController, and AnimSaves.
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <pre className="bg-[#0e1015] border border-white/10 rounded-lg p-3 text-[11px] font-mono-tabular text-slate-300 max-h-44 overflow-auto studio-scroll">
                {rbxmxContent.split('\n').slice(0, 42).join('\n')}
                {rbxmxContent.split('\n').length > 42 ? '\n...' : ''}
              </pre>
              <button
                type="button"
                disabled={!report.rbxmxReady}
                onClick={handleDownloadRbxmx}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-lg transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" aria-hidden="true" />
                <span>
                  Download {baseFilename}
                  {exportAsPackage ? '_Package' : ''}.rbxmx
                </span>
              </button>
            </div>
          )}

          {/* Tab 2: Dedicated Luau Script Framework */}
          {activeTab === 'framework' && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-1.5">
                {FRAMEWORK_MODULES.map((mod) => (
                  <button
                    key={mod.id}
                    type="button"
                    onClick={() => setActiveModuleId(mod.id)}
                    className={`px-2.5 py-1.5 rounded-md text-xs font-medium border transition-colors cursor-pointer whitespace-nowrap ${
                      activeModuleId === mod.id
                        ? 'bg-emerald-600/25 border-emerald-400/60 text-emerald-200'
                        : 'bg-[#0e1015] border-white/10 text-slate-300 hover:text-white'
                    }`}
                  >
                    <span>{mod.id}</span>
                    <span className="ml-1.5 text-[10px] opacity-70">
                      ({mod.kind === 'Script' ? 'Script' : 'Module'})
                    </span>
                  </button>
                ))}
              </div>

              <div className="text-xs text-slate-300">{activeModuleMeta.desc}</div>

              <pre className="bg-[#0e1015] border border-white/10 rounded-lg p-3 text-[11px] font-mono-tabular text-slate-300 max-h-52 overflow-auto studio-scroll">
                {activeModuleCode}
              </pre>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() =>
                    handleCopyText(activeModuleCode, `fw_${activeModuleId}`, `${activeModuleId}.lua`)
                  }
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors cursor-pointer"
                >
                  {copiedId === `fw_${activeModuleId}` ? (
                    <Check className="w-3.5 h-3.5" aria-hidden="true" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                  )}
                  <span>
                    {copiedId === `fw_${activeModuleId}`
                      ? `Copied ${activeModuleId}`
                      : `Copy ${activeModuleId}.lua`}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadLuau(activeModuleCode, `_${activeModuleId}`)}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  <Code2 className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Download {activeModuleId}.lua</span>
                </button>
              </div>
            </div>
          )}

          {/* Tab 3: Luau Tween Animation */}
          {activeTab === 'luau-anim' && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs text-slate-300 leading-relaxed">
                  Drop-in <span className="font-mono-tabular text-slate-100">TweenService</span> Luau script animating hierarchical <span className="font-mono-tabular text-slate-100">CFrame</span>, <span className="font-mono-tabular text-slate-100">Size</span>, <span className="font-mono-tabular text-slate-100">Color</span>, and <span className="font-mono-tabular text-slate-100">Transparency</span> with <span className="font-mono-tabular text-slate-100">Enum.EasingStyle</span>.
                </div>
                {animations.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    {animations.length > 1 && (
                      <div className="inline-flex bg-[#0e1015] border border-white/10 rounded-md p-0.5 text-[11px]">
                        <button
                          type="button"
                          onClick={() => setLuauAnimScope('all')}
                          className={`px-2 py-1 rounded font-medium transition-colors cursor-pointer whitespace-nowrap ${
                            luauAnimScope === 'all'
                              ? 'bg-blue-600 text-white'
                              : 'text-slate-300 hover:text-white'
                          }`}
                        >
                          All Stages ({animations.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setLuauAnimScope('single')}
                          className={`px-2 py-1 rounded font-medium transition-colors cursor-pointer whitespace-nowrap ${
                            luauAnimScope === 'single'
                              ? 'bg-blue-600 text-white'
                              : 'text-slate-300 hover:text-white'
                          }`}
                        >
                          Single Stage
                        </button>
                      </div>
                    )}
                    {(luauAnimScope === 'single' || animations.length <= 1) && (
                      <select
                        aria-label="Export Animation Clip"
                        value={selectedClipId || animations[0].id}
                        onChange={(e) => setSelectedClipId(e.target.value)}
                        className="px-2.5 py-1 text-xs bg-[#0e1015] border border-white/10 rounded text-slate-100 focus:outline-none"
                      >
                        {animations.map((clip) => (
                          <option key={clip.id} value={clip.id}>
                            {clip.name} ({clip.duration.toFixed(1)}s)
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                )}
              </div>
              <pre className="bg-[#0e1015] border border-white/10 rounded-lg p-3 text-[11px] font-mono-tabular text-slate-300 max-h-48 overflow-auto studio-scroll">
                {luauAnimContent}
              </pre>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => handleCopyText(luauAnimContent, 'anim', 'Luau animation script')}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors cursor-pointer"
                >
                  {copiedId === 'anim' ? (
                    <Check className="w-3.5 h-3.5" aria-hidden="true" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                  )}
                  <span>{copiedId === 'anim' ? 'Copied Animation Script' : 'Copy Animation Luau'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadLuau(luauAnimContent, '_Animate')}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  <Code2 className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Download _Animate.lua</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'glb' && (
            <div className="space-y-3">
              <div className="text-xs text-slate-300 leading-relaxed">
                Exports a binary <span className="font-mono-tabular text-slate-100">.glb</span> (glTF 2.0) file containing the full rigged pivot node tree, sculpted MeshPart geometry, PBR materials, and embedded <span className="font-mono-tabular text-slate-100">AnimationClip</span> tracks. Import via <span className="font-medium text-white">File → Import 3D</span> in Roblox Studio.
              </div>
              <button
                type="button"
                disabled={!report.meshImportReady || isExportingGlb}
                onClick={handleDownloadGlb}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-lg transition-colors cursor-pointer"
              >
                <FileBox className="w-3.5 h-3.5" aria-hidden="true" />
                <span>
                  {isExportingGlb ? 'Generating GLB...' : `Download ${baseFilename}.glb`}
                </span>
              </button>
            </div>
          )}

          {activeTab === 'obj' && (
            <div className="space-y-3">
              <div className="text-xs text-slate-300 leading-relaxed">
                Exports a combined Wavefront <span className="font-mono-tabular text-slate-100">.obj</span> and <span className="font-mono-tabular text-slate-100">.mtl</span> material library with hierarchical world transforms baked in (<span className="font-mono-tabular text-slate-100">o PartName</span>). Ideal for static <span className="font-medium text-white">MeshPart</span> Asset Manager uploads.
              </div>
              <button
                type="button"
                disabled={!report.meshImportReady}
                onClick={handleDownloadObjAndMtl}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-lg transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Download {baseFilename}.obj + .mtl</span>
              </button>
            </div>
          )}

          {activeTab === 'luau' && (
            <div className="space-y-3">
              <div className="text-xs text-slate-300 leading-relaxed">
                Paste directly into Roblox Studio&apos;s <span className="font-medium text-white">Command Bar</span> (<span className="font-mono-tabular text-slate-100">View → Command Bar</span>) to instantiate the complete <span className="font-mono-tabular text-slate-100">Model</span> and <span className="font-mono-tabular text-slate-100">Motor6D</span> rig inside <span className="font-mono-tabular text-slate-100">workspace</span>.
              </div>
              <pre className="bg-[#0e1015] border border-white/10 rounded-lg p-3 text-[11px] font-mono-tabular text-slate-300 max-h-48 overflow-auto studio-scroll">
                {luauContent}
              </pre>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  disabled={!report.rbxmxReady}
                  onClick={() => handleCopyText(luauContent, 'build', 'Luau build script')}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-lg transition-colors cursor-pointer"
                >
                  {copiedId === 'build' ? (
                    <Check className="w-3.5 h-3.5" aria-hidden="true" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                  )}
                  <span>{copiedId === 'build' ? 'Copied Luau' : 'Copy Luau Script'}</span>
                </button>
                <button
                  type="button"
                  disabled={!report.rbxmxReady}
                  onClick={() => handleDownloadLuau(luauContent, '')}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium bg-white/5 hover:bg-white/10 border border-white/10 disabled:opacity-40 text-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  <Code2 className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Download .lua</span>
                </button>
              </div>
            </div>
          )}
            </>
          )}

          {lastExportStatus && (
            <div className="flex items-center gap-2 text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-3 py-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{lastExportStatus}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
