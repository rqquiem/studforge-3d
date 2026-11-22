import {
  Box,
  Compass,
  Droplets,
  Hammer,
  Maximize2,
  MousePointer2,
  Move,
  Paintbrush,
  Play,
  PlusSquare,
  RotateCw,
  Square,
} from 'lucide-react';
import {
  MAP_PREFAB_CATALOG,
  MapEditorTool,
  MapPrefabKind,
  TERRAIN_BIOME_LIST,
  TerrainBiomeMaterial,
  TerrainBrushTool,
} from '../engine/mapTypes';
import { MODEL_PRESETS } from '../engine/presets';
import { CameraPreset, StudioSceneModel, TransformMode } from '../engine/robloxTypes';

interface MapBottomDockProps {
  activeTool: MapEditorTool;
  transformMode: TransformMode;
  brushTool: TerrainBrushTool;
  brushRadius: number;
  brushStrength: number;
  paintMaterial: TerrainBiomeMaterial;
  waterEnabled: boolean;
  waterLevel: number;
  activePlaceKind: MapPrefabKind;
  stampSourceKey: string;
  activeStudioModel: StudioSceneModel;
  studSnap: number;
  simulateMap: boolean;
  onChangeActiveTool: (tool: MapEditorTool) => void;
  onChangeTransformMode: (mode: TransformMode) => void;
  onChangeBrushTool: (tool: TerrainBrushTool) => void;
  onChangeBrushRadius: (r: number) => void;
  onChangeBrushStrength: (s: number) => void;
  onChangePaintMaterial: (mat: TerrainBiomeMaterial) => void;
  onToggleWater: () => void;
  onChangeWaterLevel: (lvl: number) => void;
  onChangePlaceKind: (kind: MapPrefabKind) => void;
  onChangeStampSourceKey: (key: string) => void;
  onChangeStudSnap: (snap: number) => void;
  onToggleSimulateMap: () => void;
  onCameraPreset: (preset: CameraPreset) => void;
}

const BRUSH_TOOLS: { id: TerrainBrushTool; label: string }[] = [
  { id: 'raise', label: 'Raise' },
  { id: 'lower', label: 'Lower' },
  { id: 'flatten', label: 'Flatten' },
  { id: 'smooth', label: 'Smooth' },
  { id: 'paint', label: 'Paint Biome' },
];

export function MapBottomDock({
  activeTool,
  transformMode,
  brushTool,
  brushRadius,
  brushStrength,
  paintMaterial,
  waterEnabled,
  waterLevel,
  activePlaceKind,
  stampSourceKey,
  activeStudioModel,
  studSnap,
  simulateMap,
  onChangeActiveTool,
  onChangeTransformMode,
  onChangeBrushTool,
  onChangeBrushRadius,
  onChangeBrushStrength,
  onChangePaintMaterial,
  onToggleWater,
  onChangeWaterLevel,
  onChangePlaceKind,
  onChangeStampSourceKey,
  onChangeStudSnap,
  onToggleSimulateMap,
  onCameraPreset,
}: MapBottomDockProps) {
  return (
    <div className="shrink-0 bg-[#151821] border-t border-white/10 px-3 py-2 flex flex-col gap-2 z-10">
      {/* Row 1: Primary Map Mode Tools + Simulation + Camera */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1 bg-[#0e1015] border border-white/10 rounded-lg p-0.5">
          {(
            [
              { id: 'select', label: 'Select & Gizmo', icon: MousePointer2 },
              { id: 'brush', label: 'Terrain Brush', icon: Paintbrush },
              { id: 'place', label: 'Place Prefab', icon: PlusSquare },
              { id: 'stamp', label: 'Stamp Rig Model', icon: Box },
            ] as const
          ).map((t) => {
            const Icon = t.icon;
            const active = activeTool === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onChangeActiveTool(t.id)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active ? 'bg-blue-600 text-white' : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-1 bg-[#0e1015] border border-white/10 rounded-lg p-0.5 text-[11px]">
            <Compass className="w-3.5 h-3.5 text-slate-400 mx-1.5" aria-hidden="true" />
            {(['perspective', 'top', 'front', 'side'] as const).map((cam) => (
              <button
                key={cam}
                type="button"
                onClick={() => onCameraPreset(cam)}
                className="px-2 py-1 rounded text-slate-300 hover:text-white hover:bg-white/5 capitalize cursor-pointer whitespace-nowrap"
              >
                {cam === 'perspective' ? '3D' : cam}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={onToggleSimulateMap}
            aria-pressed={simulateMap}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              simulateMap
                ? 'bg-emerald-600 border-emerald-500 text-white'
                : 'bg-[#0e1015] border-white/10 text-slate-200 hover:bg-white/5'
            }`}
          >
            {simulateMap ? (
              <Square className="w-3 h-3" aria-hidden="true" />
            ) : (
              <Play className="w-3 h-3" aria-hidden="true" />
            )}
            <span>{simulateMap ? 'Stop Preview' : 'Simulate Map'}</span>
          </button>
        </div>
      </div>

      {/* Row 2: Contextual Tool Controls */}
      {activeTool === 'select' && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1 bg-[#0e1015] border border-white/10 rounded-lg p-0.5">
            {(
              [
                { id: 'translate', label: 'Move (G)', icon: Move },
                { id: 'rotate', label: 'Rotate (R)', icon: RotateCw },
                { id: 'scale', label: 'Scale (S)', icon: Maximize2 },
              ] as const
            ).map((m) => {
              const Icon = m.icon;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onChangeTransformMode(m.id)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    transformMode === m.id
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{m.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">Stud Snap:</span>
            <div className="inline-flex bg-[#0e1015] border border-white/10 rounded-md p-0.5 font-mono-tabular">
              {[0, 0.5, 1, 2].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => onChangeStudSnap(s)}
                  className={`px-2 py-0.5 rounded text-[11px] cursor-pointer ${
                    studSnap === s ? 'bg-blue-600 text-white' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {s === 0 ? 'Off' : `${s}`}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTool === 'brush' && (
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-1 bg-[#0e1015] border border-white/10 rounded-lg p-0.5">
            {BRUSH_TOOLS.map((bt) => (
              <button
                key={bt.id}
                type="button"
                onClick={() => onChangeBrushTool(bt.id)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  brushTool === bt.id
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                {bt.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Biome:</span>
            {TERRAIN_BIOME_LIST.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => {
                  onChangePaintMaterial(b.id);
                  if (brushTool !== 'paint') onChangeBrushTool('paint');
                }}
                title={b.label}
                className={`w-6 h-6 rounded border transition-transform cursor-pointer ${
                  paintMaterial === b.id
                    ? 'border-white scale-110 ring-2 ring-blue-500/60'
                    : 'border-white/20 opacity-85 hover:opacity-100'
                }`}
                style={{ backgroundColor: b.hexColor }}
              />
            ))}
          </div>

          <label className="flex items-center gap-2 text-slate-300 font-mono-tabular">
            <span className="text-slate-400">Radius</span>
            <input
              type="range"
              min={4}
              max={32}
              step={1}
              value={brushRadius}
              onChange={(e) => onChangeBrushRadius(Number(e.target.value))}
              className="w-20 accent-blue-500"
            />
            <span className="w-7 text-right">{brushRadius}</span>
          </label>

          <label className="flex items-center gap-2 text-slate-300 font-mono-tabular">
            <span className="text-slate-400">Strength</span>
            <input
              type="range"
              min={0.2}
              max={3.0}
              step={0.1}
              value={brushStrength}
              onChange={(e) => onChangeBrushStrength(Number(e.target.value))}
              className="w-20 accent-blue-500"
            />
            <span className="w-7 text-right">{brushStrength.toFixed(1)}</span>
          </label>

          <div className="flex items-center gap-2 pl-2 border-l border-white/10">
            <button
              type="button"
              onClick={onToggleWater}
              aria-pressed={waterEnabled}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border cursor-pointer whitespace-nowrap ${
                waterEnabled
                  ? 'bg-sky-600/25 border-sky-400/60 text-sky-200'
                  : 'bg-[#0e1015] border-white/10 text-slate-400'
              }`}
            >
              <Droplets className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Water</span>
            </button>
            {waterEnabled && (
              <input
                aria-label="Water Elevation"
                type="range"
                min={-10}
                max={14}
                step={0.5}
                value={waterLevel}
                onChange={(e) => onChangeWaterLevel(Number(e.target.value))}
                className="w-20 accent-sky-500"
              />
            )}
          </div>
        </div>
      )}

      {activeTool === 'place' && (
        <div className="flex items-center gap-1.5 overflow-x-auto studio-scroll pb-0.5">
          {MAP_PREFAB_CATALOG.map((item) => {
            const active = activePlaceKind === item.kind;
            return (
              <button
                key={item.kind}
                type="button"
                onClick={() => onChangePlaceKind(item.kind)}
                title={item.description}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'bg-emerald-600/25 border-emerald-400/60 text-emerald-100'
                    : 'bg-[#0e1015] border-white/10 text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <span
                  className="w-2 h-2 rounded-xs shrink-0"
                  style={{ backgroundColor: item.defaultColor }}
                  aria-hidden="true"
                />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {activeTool === 'stamp' && (
        <div className="flex items-center gap-2 overflow-x-auto studio-scroll pb-0.5 text-xs">
          <span className="inline-flex items-center gap-1 text-slate-400 shrink-0">
            <Hammer className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
            <span>Stamp Rig:</span>
          </span>
          <button
            type="button"
            onClick={() => onChangeStampSourceKey('active-studio-model')}
            className={`px-2.5 py-1 rounded-md font-semibold border whitespace-nowrap shrink-0 cursor-pointer ${
              stampSourceKey === 'active-studio-model'
                ? 'bg-amber-600/25 border-amber-400/60 text-amber-100'
                : 'bg-[#0e1015] border-white/10 text-slate-300 hover:text-white'
            }`}
          >
            Active Model ({activeStudioModel.name})
          </button>
          {MODEL_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => onChangeStampSourceKey(preset.id)}
              className={`px-2.5 py-1 rounded-md font-medium border whitespace-nowrap shrink-0 cursor-pointer ${
                stampSourceKey === preset.id
                  ? 'bg-blue-600/25 border-blue-400/60 text-blue-100'
                  : 'bg-[#0e1015] border-white/10 text-slate-300 hover:text-white'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
