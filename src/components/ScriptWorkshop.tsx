import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  Braces,
  ChevronDown,
  FileCode2,
  FolderPlus,
  Maximize2,
  Minimize2,
  Play,
  Plus,
  Power,
  Radio,
  Send,
  Square,
  Terminal,
  Trash2,
  Zap,
} from 'lucide-react';
import { SandboxLogEntry, SandboxLogLevel } from '../engine/robloxSandbox';
import {
  AnimationClip,
  ROBLOX_SERVICE_LOCATIONS,
  RobloxScriptClassName,
  RobloxScriptRunContext,
  RobloxServiceLocation,
  StudioScriptNode,
} from '../engine/robloxTypes';
import { SCRIPT_TEMPLATES, ScriptTemplateEntry } from '../engine/scriptPresets';

interface ScriptWorkshopProps {
  modelName: string;
  scripts: StudioScriptNode[];
  selectedScriptId: string | null;
  clips: AnimationClip[];
  isRunning: boolean;
  activeStageName: string | null;
  logs: SandboxLogEntry[];
  onSelectScript: (id: string | null) => void;
  onAddScript: (node: Omit<StudioScriptNode, 'id'>) => void;
  onUpdateScript: (id: string, patch: Partial<StudioScriptNode>) => void;
  onDeleteScript: (id: string) => void;
  onRunScripts: () => void;
  onStopScripts: () => void;
  onTriggerKey: (keyName: string) => void;
  onFireEvent: (nodeId: string, arg?: string | number | boolean) => void;
  onSetAttribute: (key: string, val: string | number | boolean) => void;
  onClearLogs: () => void;
  onOpenGitHubSync: () => void;
}

const ADDABLE_CLASSES: { className: RobloxScriptClassName; label: string }[] = [
  { className: 'Script', label: 'Script (Server)' },
  { className: 'LocalScript', label: 'LocalScript (Client)' },
  { className: 'ModuleScript', label: 'ModuleScript' },
  { className: 'RemoteEvent', label: 'RemoteEvent' },
  { className: 'BindableEvent', label: 'BindableEvent' },
  { className: 'NumberValue', label: 'NumberValue' },
  { className: 'StringValue', label: 'StringValue' },
  { className: 'BoolValue', label: 'BoolValue' },
];

function getClassBadgeColor(cls: RobloxScriptClassName): string {
  switch (cls) {
    case 'Script':
      return 'text-emerald-400';
    case 'LocalScript':
      return 'text-sky-400';
    case 'ModuleScript':
      return 'text-violet-400';
    case 'RemoteEvent':
    case 'BindableEvent':
      return 'text-amber-400';
    default:
      return 'text-slate-400';
  }
}

function getShortClassTag(cls: RobloxScriptClassName): string {
  switch (cls) {
    case 'Script':
      return 'SRV';
    case 'LocalScript':
      return 'CLI';
    case 'ModuleScript':
      return 'MOD';
    case 'RemoteEvent':
      return 'REM';
    case 'BindableEvent':
      return 'BND';
    case 'NumberValue':
      return 'NUM';
    case 'StringValue':
      return 'STR';
    case 'BoolValue':
      return 'BOOL';
    default:
      return 'INST';
  }
}

export function ScriptWorkshop({
  modelName,
  scripts,
  selectedScriptId,
  clips,
  isRunning,
  activeStageName,
  logs,
  onSelectScript,
  onAddScript,
  onUpdateScript,
  onDeleteScript,
  onRunScripts,
  onStopScripts,
  onTriggerKey,
  onFireEvent,
  onSetAttribute,
  onClearLogs,
  onOpenGitHubSync,
}: ScriptWorkshopProps) {
  const [expanded, setExpanded] = useState(false);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [templateMenuOpen, setTemplateMenuOpen] = useState(false);
  const [newClassTargetService, setNewClassTargetService] =
    useState<RobloxServiceLocation>('ServerScriptService');
  const [logFilter, setLogFilter] = useState<'all' | SandboxLogLevel>('all');
  const [eventArgInput, setEventArgInput] = useState('1.25');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const consoleEndRef = useRef<HTMLDivElement | null>(null);
  const gutterRef = useRef<HTMLDivElement | null>(null);

  const selectedNode = useMemo(
    () => scripts.find((s) => s.id === selectedScriptId) ?? scripts[0] ?? null,
    [scripts, selectedScriptId]
  );

  const isCodeContainer =
    selectedNode?.className === 'Script' ||
    selectedNode?.className === 'LocalScript' ||
    selectedNode?.className === 'ModuleScript';

  const lineCount = useMemo(() => {
    if (!selectedNode || !isCodeContainer) return 1;
    return Math.max(1, selectedNode.source.split('\n').length);
  }, [selectedNode, isCodeContainer]);

  const filteredLogs = useMemo(() => {
    if (logFilter === 'all') return logs;
    return logs.filter((l) => l.level === logFilter);
  }, [logs, logFilter]);

  const errorCount = useMemo(
    () => logs.filter((l) => l.level === 'error').length,
    [logs]
  );

  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ block: 'end' });
  }, [filteredLogs.length]);

  const handleInsertTemplate = (tpl: ScriptTemplateEntry) => {
    onAddScript({
      name: tpl.label.replace(/[^a-zA-Z0-9_]/g, ''),
      className: tpl.className,
      service: tpl.service,
      parentFolder: tpl.parentFolder,
      source: tpl.source,
      disabled: false,
      runContext: tpl.runContext,
    });
    setTemplateMenuOpen(false);
  };

  const handleCreateNode = (cls: RobloxScriptClassName, service: RobloxServiceLocation) => {
    const defaultSource =
      cls === 'ModuleScript'
        ? `local Module = {}\n\nfunction Module.Run()\n\tprint("Module executed")\nend\n\nreturn Module\n`
        : cls === 'LocalScript'
        ? `-- Client LocalScript\nlocal Players = game:GetService("Players")\nprint("[Client] Active for", Players.LocalPlayer.Name)\n`
        : cls === 'Script'
        ? `-- Server/Model Script\nlocal model = workspace:FindFirstChildWhichIsA("Model")\nprint("[Script] Running on", model and model.Name or "Workspace")\n`
        : '';

    const runContext: RobloxScriptRunContext =
      cls === 'LocalScript'
        ? 'Client'
        : service === 'ServerScriptService'
        ? 'Server'
        : 'Legacy';

    const count = scripts.filter((s) => s.className === cls).length + 1;
    onAddScript({
      name: `${cls}_${count}`,
      className: cls,
      service,
      parentFolder:
        cls === 'RemoteEvent'
          ? 'Remotes'
          : cls === 'ModuleScript'
          ? 'Modules'
          : undefined,
      source: defaultSource,
      disabled: false,
      runContext,
      value: cls === 'NumberValue' ? 10 : cls === 'BoolValue' ? true : cls === 'StringValue' ? 'Ready' : undefined,
    });
    setAddMenuOpen(false);
  };

  const startRename = (node: StudioScriptNode) => {
    setRenamingId(node.id);
    setRenameDraft(node.name);
  };

  const commitRename = () => {
    if (renamingId && renameDraft.trim()) {
      onUpdateScript(renamingId, { name: renameDraft.trim() });
    }
    setRenamingId(null);
  };

  const parseEventArg = (raw: string): string | number | boolean | undefined => {
    const trimmed = raw.trim();
    if (!trimmed) return undefined;
    if (trimmed === 'true') return true;
    if (trimmed === 'false') return false;
    const num = Number(trimmed);
    if (!Number.isNaN(num)) return num;
    return trimmed;
  };

  return (
    <section
      aria-label="Roblox Script Workshop"
      className={`${
        expanded ? 'h-[420px]' : 'h-72'
      } shrink-0 bg-[#11141c] border-t border-white/10 flex flex-col select-none transition-[height] duration-150`}
    >
      {/* Top Workshop Execution & Simulation Bar */}
      <div className="h-9 shrink-0 px-2.5 border-b border-white/10 bg-[#151821] flex items-center justify-between gap-2 overflow-x-auto studio-scroll">
        <div className="flex items-center gap-1.5 shrink-0">
          {!isRunning ? (
            <button
              type="button"
              onClick={onRunScripts}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer whitespace-nowrap"
            >
              <Play className="w-3 h-3 fill-current" aria-hidden="true" />
              <span>Run Scripts</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onStopScripts}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-semibold bg-red-600 hover:bg-red-500 text-white transition-colors cursor-pointer whitespace-nowrap"
            >
              <Square className="w-3 h-3 fill-current" aria-hidden="true" />
              <span>Stop &amp; Reset</span>
            </button>
          )}

          {/* Simulated Input & Stage Triggers */}
          <div className="flex items-center gap-1 pl-1.5 ml-1 border-l border-white/10">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mr-0.5 hidden lg:inline">
              Test Input
            </span>
            <button
              type="button"
              disabled={!isRunning}
              onClick={() => onTriggerKey('F')}
              title="Simulate UserInputService Key [F]"
              className="px-2 py-1 rounded text-[11px] font-mono-tabular bg-white/[0.04] hover:bg-sky-500/20 border border-white/10 hover:border-sky-400/50 text-slate-200 disabled:opacity-40 transition-colors cursor-pointer whitespace-nowrap"
            >
              [F] Breath
            </button>
            <button
              type="button"
              disabled={!isRunning}
              onClick={() => onTriggerKey('E')}
              title="Simulate UserInputService Key [E]"
              className="px-2 py-1 rounded text-[11px] font-mono-tabular bg-white/[0.04] hover:bg-amber-500/20 border border-white/10 hover:border-amber-400/50 text-slate-200 disabled:opacity-40 transition-colors cursor-pointer whitespace-nowrap"
            >
              [E] Attack
            </button>
            <button
              type="button"
              disabled={!isRunning}
              onClick={() => onTriggerKey('R')}
              title="Simulate UserInputService Key [R]"
              className="hidden sm:inline-flex px-2 py-1 rounded text-[11px] font-mono-tabular bg-white/[0.04] hover:bg-emerald-500/20 border border-white/10 hover:border-emerald-400/50 text-slate-200 disabled:opacity-40 transition-colors cursor-pointer whitespace-nowrap"
            >
              [R] Stage
            </button>
          </div>

          {clips.length > 0 && (
            <div className="hidden md:flex items-center gap-1 pl-1.5 ml-1 border-l border-white/10">
              <span className="text-[10px] font-semibold text-slate-400">Stage Attr</span>
              <select
                aria-label="Set Stage Attribute in Sandbox"
                disabled={!isRunning}
                value={activeStageName ?? ''}
                onChange={(e) => {
                  if (e.target.value) onSetAttribute('Stage', e.target.value);
                }}
                className="px-2 py-0.5 text-[11px] bg-[#0e1015] border border-white/10 rounded text-slate-200 disabled:opacity-40 focus:outline-none"
              >
                <option value="">(Stage...)</option>
                {clips.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Right Toolbar: Templates, Selected Node Flags, Push & Expand */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setTemplateMenuOpen((v) => !v);
                setAddMenuOpen(false);
              }}
              className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium bg-white/[0.04] hover:bg-white/10 border border-white/10 text-slate-200 transition-colors cursor-pointer whitespace-nowrap"
            >
              <BookOpen className="w-3 h-3 text-violet-400" aria-hidden="true" />
              <span>Templates</span>
              <ChevronDown className="w-3 h-3 text-slate-400" aria-hidden="true" />
            </button>
            {templateMenuOpen && (
              <div className="absolute right-0 bottom-full mb-1.5 w-72 bg-[#1a1e29] border border-white/15 rounded-lg shadow-2xl p-1.5 z-50 space-y-1">
                {SCRIPT_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => handleInsertTemplate(tpl)}
                    className="w-full text-left px-2.5 py-1.5 rounded hover:bg-blue-600/20 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between text-xs font-semibold text-white">
                      <span>{tpl.label}</span>
                      <span className={`text-[10px] font-mono-tabular ${getClassBadgeColor(tpl.className)}`}>
                        {tpl.className}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">
                      {tpl.description}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onOpenGitHubSync}
            className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold bg-blue-600/20 hover:bg-blue-600/30 border border-blue-400/40 text-blue-200 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Send className="w-3 h-3" aria-hidden="true" />
            <span>Push / Sync</span>
          </button>

          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            title={expanded ? 'Compact Workshop Height' : 'Expand Workshop Height'}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label={expanded ? 'Compact Workshop' : 'Expand Workshop'}
          >
            {expanded ? (
              <Minimize2 className="w-3.5 h-3.5" aria-hidden="true" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* 3-Column IDE Body: Service Explorer | Code/Instance Editor | Output Console */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* Column 1: Roblox Service Explorer */}
        <aside
          aria-label="Roblox Service Explorer"
          className="w-48 xl:w-52 shrink-0 border-r border-white/10 bg-[#131720] flex flex-col min-h-0"
        >
          <div className="px-2.5 py-1.5 border-b border-white/10 flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Roblox Services
            </span>
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setAddMenuOpen((v) => !v);
                  setTemplateMenuOpen(false);
                }}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-colors cursor-pointer"
              >
                <Plus className="w-3 h-3" aria-hidden="true" />
                <span>Add</span>
              </button>
              {addMenuOpen && (
                <div className="absolute left-0 top-full mt-1 w-56 bg-[#1a1e29] border border-white/15 rounded-lg shadow-2xl p-2 z-50 space-y-2">
                  <div>
                    <label className="block text-[10px] font-semibold uppercase text-slate-400 mb-1">
                      Target Service
                    </label>
                    <select
                      value={newClassTargetService}
                      onChange={(e) =>
                        setNewClassTargetService(e.target.value as RobloxServiceLocation)
                      }
                      className="w-full px-2 py-1 text-xs bg-[#0e1015] border border-white/10 rounded text-slate-100"
                    >
                      {ROBLOX_SERVICE_LOCATIONS.map((svc) => (
                        <option key={svc.id} value={svc.id}>
                          {svc.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-0.5 max-h-48 overflow-y-auto studio-scroll">
                    {ADDABLE_CLASSES.map((item) => (
                      <button
                        key={item.className}
                        type="button"
                        onClick={() => handleCreateNode(item.className, newClassTargetService)}
                        className="w-full text-left px-2 py-1 rounded text-xs hover:bg-blue-600/20 flex items-center justify-between text-slate-200 cursor-pointer"
                      >
                        <span>{item.label}</span>
                        <span className={`text-[10px] font-mono-tabular ${getClassBadgeColor(item.className)}`}>
                          {getShortClassTag(item.className)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto studio-scroll p-1.5 space-y-2">
            {ROBLOX_SERVICE_LOCATIONS.map((svc) => {
              const svcNodes = scripts.filter((s) => s.service === svc.id);
              const svcDisplayName =
                svc.id === 'WorkspaceModel' ? `Workspace/${modelName}` : svc.shortLabel;
              return (
                <div key={svc.id} className="space-y-0.5">
                  <div className="px-1.5 py-0.5 flex items-center justify-between text-[10px] font-semibold text-slate-400">
                    <span className="truncate">{svcDisplayName}</span>
                    <button
                      type="button"
                      onClick={() => handleCreateNode('Script', svc.id)}
                      title={`Add Script under ${svc.label}`}
                      className="text-slate-500 hover:text-white cursor-pointer"
                      aria-label={`Add Script to ${svc.label}`}
                    >
                      <FolderPlus className="w-3 h-3" aria-hidden="true" />
                    </button>
                  </div>
                  {svcNodes.length === 0 ? (
                    <div className="px-2 py-0.5 text-[10px] text-slate-600 italic">Empty</div>
                  ) : (
                    svcNodes.map((node) => {
                      const active = selectedNode?.id === node.id;
                      return (
                        <div
                          key={node.id}
                          onClick={() => onSelectScript(node.id)}
                          onDoubleClick={() => startRename(node)}
                          className={`group flex items-center justify-between gap-1 px-2 py-1 rounded text-xs cursor-pointer transition-colors ${
                            active
                              ? 'bg-blue-600/25 text-white border border-blue-400/40'
                              : 'text-slate-300 hover:bg-white/[0.04] border border-transparent'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span
                              className={`text-[9px] font-mono-tabular font-bold shrink-0 ${getClassBadgeColor(
                                node.className
                              )}`}
                            >
                              {getShortClassTag(node.className)}
                            </span>
                            {renamingId === node.id ? (
                              <input
                                autoFocus
                                value={renameDraft}
                                onChange={(e) => setRenameDraft(e.target.value)}
                                onBlur={commitRename}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') commitRename();
                                  if (e.key === 'Escape') setRenamingId(null);
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className="w-full px-1 py-0.5 text-[11px] bg-[#0e1015] border border-blue-500 rounded text-white focus:outline-none"
                              />
                            ) : (
                              <span
                                className={`truncate text-[11px] ${
                                  node.disabled ? 'line-through opacity-50' : ''
                                }`}
                              >
                                {node.parentFolder ? `${node.parentFolder}/` : ''}
                                {node.name}
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteScript(node.id);
                            }}
                            aria-label={`Delete ${node.name}`}
                            className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 p-0.5 transition-opacity cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" aria-hidden="true" />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              );
            })}
          </div>
        </aside>

        {/* Column 2: Luau Code Editor or Companion Instance Inspector */}
        <div className="flex-1 min-w-0 flex flex-col bg-[#0e1015] min-h-0">
          {selectedNode ? (
            <>
              {/* Active Script Sub-Header */}
              <div className="h-8 shrink-0 px-2.5 border-b border-white/10 bg-[#12161f] flex items-center justify-between gap-2 text-xs min-w-0 overflow-hidden">
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  <FileCode2
                    className={`w-3.5 h-3.5 shrink-0 ${getClassBadgeColor(selectedNode.className)}`}
                    aria-hidden="true"
                  />
                  <input
                    aria-label="Selected script name"
                    value={selectedNode.name}
                    onChange={(e) => onUpdateScript(selectedNode.id, { name: e.target.value })}
                    className="w-full max-w-40 min-w-0 px-1.5 py-0.5 text-xs font-semibold bg-transparent hover:bg-white/[0.04] focus:bg-[#0e1015] border border-transparent focus:border-blue-500 rounded text-white focus:outline-none truncate"
                  />
                  <span className="text-[10px] font-mono-tabular text-slate-500 hidden 2xl:inline truncate">
                    {selectedNode.service}
                    {selectedNode.parentFolder ? `.${selectedNode.parentFolder}` : ''}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <label className="hidden 2xl:flex items-center gap-1 text-[10px] text-slate-400">
                    <span>Folder:</span>
                    <input
                      value={selectedNode.parentFolder ?? ''}
                      placeholder="(root)"
                      onChange={(e) =>
                        onUpdateScript(selectedNode.id, {
                          parentFolder: e.target.value || undefined,
                        })
                      }
                      className="w-20 px-1.5 py-0.5 text-[11px] bg-[#0e1015] border border-white/10 rounded text-slate-200 focus:outline-none focus:border-blue-500"
                    />
                  </label>

                  {selectedNode.className === 'Script' && (
                    <select
                      aria-label="Script RunContext"
                      value={selectedNode.runContext ?? 'Legacy'}
                      onChange={(e) =>
                        onUpdateScript(selectedNode.id, {
                          runContext: e.target.value as RobloxScriptRunContext,
                        })
                      }
                      className="px-1.5 py-0.5 text-[11px] bg-[#0e1015] border border-white/10 rounded text-slate-200 focus:outline-none"
                    >
                      <option value="Legacy">Legacy</option>
                      <option value="Server">Server</option>
                      <option value="Client">Client</option>
                    </select>
                  )}

                  {(selectedNode.className === 'Script' ||
                    selectedNode.className === 'LocalScript') && (
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateScript(selectedNode.id, { disabled: !selectedNode.disabled })
                      }
                      aria-pressed={selectedNode.disabled}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border transition-colors cursor-pointer ${
                        selectedNode.disabled
                          ? 'bg-red-500/15 border-red-400/50 text-red-300'
                          : 'bg-emerald-500/15 border-emerald-400/40 text-emerald-300'
                      }`}
                    >
                      <Power className="w-3 h-3" aria-hidden="true" />
                      <span>{selectedNode.disabled ? 'Disabled' : 'Enabled'}</span>
                    </button>
                  )}
                </div>
              </div>

              {isCodeContainer ? (
                <div className="flex-1 min-h-0 flex overflow-hidden relative">
                  <div
                    ref={gutterRef}
                    aria-hidden="true"
                    className="w-10 shrink-0 py-2.5 pr-2 text-right font-mono-tabular text-[11px] leading-[1.45] text-slate-600 bg-[#0b0d12] border-r border-white/5 overflow-hidden select-none"
                  >
                    {Array.from({ length: lineCount }, (_, idx) => (
                      <div key={idx}>{idx + 1}</div>
                    ))}
                  </div>
                  <textarea
                    aria-label={`Luau source code for ${selectedNode.name}`}
                    spellCheck={false}
                    value={selectedNode.source}
                    onScroll={(e) => {
                      if (gutterRef.current) {
                        gutterRef.current.scrollTop = e.currentTarget.scrollTop;
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Tab') {
                        e.preventDefault();
                        const el = e.currentTarget;
                        const start = el.selectionStart;
                        const end = el.selectionEnd;
                        const nextVal =
                          selectedNode.source.slice(0, start) +
                          '\t' +
                          selectedNode.source.slice(end);
                        onUpdateScript(selectedNode.id, { source: nextVal });
                        requestAnimationFrame(() => {
                          el.selectionStart = el.selectionEnd = start + 1;
                        });
                      }
                    }}
                    onChange={(e) => onUpdateScript(selectedNode.id, { source: e.target.value })}
                    className="flex-1 w-full h-full p-2.5 bg-[#0e1015] text-slate-100 font-mono-tabular text-[12px] leading-[1.45] resize-none focus:outline-none studio-scroll"
                  />
                </div>
              ) : selectedNode.className === 'RemoteEvent' ||
                selectedNode.className === 'BindableEvent' ? (
                <div className="flex-1 p-4 flex flex-col justify-center items-start gap-3">
                  <div className="flex items-center gap-2 text-amber-300 text-xs font-semibold">
                    <Radio className="w-4 h-4" aria-hidden="true" />
                    <span>
                      {selectedNode.className}: {selectedNode.service}
                      {selectedNode.parentFolder ? `.${selectedNode.parentFolder}` : ''}.
                      {selectedNode.name}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 max-w-md leading-relaxed">
                    Scripts can connect to{' '}
                    <code className="font-mono-tabular text-slate-200">
                      {selectedNode.className === 'RemoteEvent' ? '.OnServerEvent / .OnClientEvent' : '.Event'}
                    </code>{' '}
                    and fire it live in the sandbox below.
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      aria-label="Event payload argument"
                      value={eventArgInput}
                      onChange={(e) => setEventArgInput(e.target.value)}
                      placeholder="Argument (number/string/bool)"
                      className="px-2.5 py-1.5 text-xs font-mono-tabular bg-[#151821] border border-white/10 rounded text-slate-100 focus:outline-none focus:border-blue-500"
                    />
                    <button
                      type="button"
                      disabled={!isRunning}
                      onClick={() => onFireEvent(selectedNode.id, parseEventArg(eventArgInput))}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white transition-colors cursor-pointer"
                    >
                      <Zap className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Fire {selectedNode.name}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex-1 p-4 flex flex-col justify-center items-start gap-3">
                  <div className="flex items-center gap-2 text-slate-200 text-xs font-semibold">
                    <Braces className="w-4 h-4 text-slate-400" aria-hidden="true" />
                    <span>
                      {selectedNode.className}: {selectedNode.name}
                    </span>
                  </div>
                  {selectedNode.className === 'BoolValue' ? (
                    <label className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(selectedNode.value)}
                        onChange={(e) =>
                          onUpdateScript(selectedNode.id, { value: e.target.checked })
                        }
                        className="accent-blue-500"
                      />
                      <span>Value = {String(Boolean(selectedNode.value))}</span>
                    </label>
                  ) : selectedNode.className === 'NumberValue' ? (
                    <label className="flex items-center gap-2 text-xs text-slate-300">
                      <span>Numeric Value:</span>
                      <input
                        type="number"
                        step="any"
                        value={Number(selectedNode.value ?? 0)}
                        onChange={(e) =>
                          onUpdateScript(selectedNode.id, { value: Number(e.target.value) || 0 })
                        }
                        className="px-2.5 py-1 text-xs font-mono-tabular bg-[#151821] border border-white/10 rounded text-white focus:outline-none focus:border-blue-500"
                      />
                    </label>
                  ) : (
                    <label className="flex items-center gap-2 text-xs text-slate-300">
                      <span>String Value:</span>
                      <input
                        type="text"
                        value={String(selectedNode.value ?? '')}
                        onChange={(e) =>
                          onUpdateScript(selectedNode.id, { value: e.target.value })
                        }
                        className="px-2.5 py-1 text-xs font-mono-tabular bg-[#151821] border border-white/10 rounded text-white focus:outline-none focus:border-blue-500"
                      />
                    </label>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-xs text-slate-500">
              Select a script or add one from the Roblox Services explorer.
            </div>
          )}
        </div>

        {/* Column 3: Live Output Console */}
        <aside
          aria-label="Luau Output Console"
          className="w-64 xl:w-72 shrink-0 border-l border-white/10 bg-[#0c0e13] flex flex-col min-h-0"
        >
          <div className="h-8 shrink-0 px-2.5 border-b border-white/10 bg-[#12161f] flex items-center justify-between gap-1">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-300">
              <Terminal className="w-3 h-3 text-emerald-400" aria-hidden="true" />
              <span>Output</span>
              {errorCount > 0 && (
                <span className="inline-flex items-center gap-0.5 text-red-400 font-mono-tabular">
                  <AlertCircle className="w-3 h-3" aria-hidden="true" />
                  {errorCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {(['all', 'info', 'warn', 'error'] as const).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setLogFilter(lvl)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-medium capitalize cursor-pointer ${
                    logFilter === lvl
                      ? 'bg-white/10 text-white'
                      : 'text-slate-500 hover:text-slate-200'
                  }`}
                >
                  {lvl}
                </button>
              ))}
              <button
                type="button"
                onClick={onClearLogs}
                className="px-1.5 py-0.5 text-[10px] text-slate-400 hover:text-white cursor-pointer"
              >
                Clear
              </button>
            </div>
          </div>

          <div
            data-testid="script-console-output"
            className="flex-1 overflow-y-auto studio-scroll p-2 space-y-1 font-mono-tabular text-[11px]"
          >
            {filteredLogs.length === 0 ? (
              <div className="text-slate-600 text-[11px] leading-relaxed">
                Click <span className="text-emerald-400 font-semibold">Run Scripts</span> to execute enabled Server, Client, and Module scripts against the live 3D rig.
              </div>
            ) : (
              filteredLogs.map((entry) => (
                <div
                  key={entry.id}
                  className={`leading-snug break-words ${
                    entry.level === 'error'
                      ? 'text-red-300'
                      : entry.level === 'warn'
                      ? 'text-amber-300'
                      : entry.level === 'system'
                      ? 'text-emerald-300'
                      : 'text-slate-200'
                  }`}
                >
                  <span className="text-slate-500 mr-1.5">{entry.timestamp}</span>
                  <span className="text-slate-400 mr-1.5">[{entry.source}]</span>
                  <span>{entry.message}</span>
                </div>
              ))
            )}
            <div ref={consoleEndRef} />
          </div>
        </aside>
      </div>
    </section>
  );
}
