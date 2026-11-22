import { useState } from 'react';
import {
  Flame,
  KeyRound,
  Lightbulb,
  Link2,
  MapPin,
  Plus,
  Sliders,
  Sparkles,
  Star,
  Trash2,
  Volume2,
  Wind,
} from 'lucide-react';
import { EvaluatedPartPose, wouldCreateCycle } from '../engine/animationEngine';
import {
  PartShape,
  ROBLOX_COLOR_PALETTE,
  ROBLOX_MATERIAL_SPECS,
  RobloxMaterial,
  SHAPE_CATALOG,
  StudioAttachmentNode,
  StudioEffectNode,
  StudioPartNode,
  StudioParticleEmitterEffect,
  StudioPointLightEffect,
  StudioSoundNode,
  StudioTrailEffect,
  StudioWorkspaceMode,
} from '../engine/robloxTypes';

interface InspectorPanelProps {
  part: StudioPartNode | null;
  allParts: StudioPartNode[];
  isPrimaryPart: boolean;
  boundingSizeStuds: [number, number, number];
  r15HeightRatio: number;
  workspaceMode: StudioWorkspaceMode;
  activePose: EvaluatedPartPose | null;
  currentTime: number;
  onUpdatePart: (id: string, patch: Partial<StudioPartNode>) => void;
  onUpdatePose: (id: string, patch: Partial<EvaluatedPartPose>) => void;
  onKeyCurrentPose: (id: string) => void;
  onReparentPart: (id: string, newParentId: string | null) => void;
  onSetPrimaryPart: (id: string) => void;
  onResetTransform: (id: string) => void;
  onTriggerBurst?: (effectId: string, count: number) => void;
}

const AXES = ['X', 'Y', 'Z'] as const;

export function InspectorPanel({
  part,
  allParts,
  isPrimaryPart,
  boundingSizeStuds,
  r15HeightRatio,
  workspaceMode,
  activePose,
  currentTime,
  onUpdatePart,
  onUpdatePose,
  onKeyCurrentPose,
  onReparentPart,
  onSetPrimaryPart,
  onResetTransform,
  onTriggerBurst,
}: InspectorPanelProps) {
  const [inspectorTab, setInspectorTab] = useState<'part' | 'fx'>('part');

  if (!part) {
    return (
      <aside
        aria-label="Properties Inspector"
        className="w-72 shrink-0 h-full bg-[#151821] border-l border-white/10 p-4 flex flex-col justify-between"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
            <Sliders className="w-3.5 h-3.5 text-blue-400" aria-hidden="true" />
            <span>Properties</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Click any part in the 3D viewport or Explorer list to inspect its Roblox Stud dimensions, Motor6D joint rig, Attachments, Particle/Trail/Light FX, Sounds, and animated pose.
          </p>

          <div className="pt-3 border-t border-white/10 space-y-2.5">
            <h3 className="text-xs font-semibold text-slate-300">Model Bounds (Studs)</h3>
            <div className="grid grid-cols-3 gap-2 text-xs font-mono-tabular">
              <div className="bg-[#0e1015] border border-white/10 rounded p-2">
                <div className="text-[11px] text-slate-400">Width X</div>
                <div className="text-slate-100 font-medium">{boundingSizeStuds[0].toFixed(2)}</div>
              </div>
              <div className="bg-[#0e1015] border border-white/10 rounded p-2">
                <div className="text-[11px] text-slate-400">Height Y</div>
                <div className="text-slate-100 font-medium">{boundingSizeStuds[1].toFixed(2)}</div>
              </div>
              <div className="bg-[#0e1015] border border-white/10 rounded p-2">
                <div className="text-[11px] text-slate-400">Depth Z</div>
                <div className="text-slate-100 font-medium">{boundingSizeStuds[2].toFixed(2)}</div>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 font-mono-tabular">
              Scale vs R15 Avatar: {r15HeightRatio.toFixed(2)}x
            </p>
          </div>
        </div>

        <div className="pt-3 border-t border-white/10 text-[11px] text-slate-400 space-y-1">
          <div>Shortcuts: G Move · R Rotate · S Scale</div>
          <div>Orbit: Drag · Pan: Right-Drag · Zoom: Scroll</div>
        </div>
      </aside>
    );
  }

  const isAnimate = workspaceMode === 'animate';
  const displayedPosition = isAnimate && activePose ? activePose.position : part.position;
  const displayedRotation = isAnimate && activePose ? activePose.rotation : part.rotation;
  const displayedSize = isAnimate && activePose ? activePose.size : part.size;
  const displayedColor = isAnimate && activePose ? activePose.color : part.color;
  const displayedTransparency =
    isAnimate && activePose ? activePose.transparency : part.transparency;
  const pivotOffset = part.pivotOffset ?? [0, 0, 0];

  const attachments = part.attachments ?? [];
  const effects = part.effects ?? [];
  const sounds = part.sounds ?? [];
  const fxCount = attachments.length + effects.length + sounds.length;

  const allModelAttachments = allParts.flatMap((p) =>
    (p.attachments ?? []).map((att) => ({
      partName: p.name,
      attachment: att,
    }))
  );

  const updateVector = (
    key: 'position' | 'rotation' | 'size',
    axisIdx: 0 | 1 | 2,
    raw: string
  ) => {
    const val = parseFloat(raw);
    if (!Number.isFinite(val)) return;
    const base =
      key === 'position'
        ? displayedPosition
        : key === 'rotation'
        ? displayedRotation
        : displayedSize;
    const next: [number, number, number] = [...base];
    next[axisIdx] = key === 'size' ? Math.max(0.05, val) : val;
    if (isAnimate) {
      onUpdatePose(part.id, { [key]: next });
    } else {
      onUpdatePart(part.id, { [key]: next });
    }
  };

  const updatePivot = (axisIdx: 0 | 1 | 2, raw: string) => {
    const val = parseFloat(raw);
    if (!Number.isFinite(val)) return;
    const next: [number, number, number] = [...pivotOffset];
    next[axisIdx] = val;
    onUpdatePart(part.id, { pivotOffset: next });
  };

  const validParents = allParts.filter(
    (candidate) =>
      candidate.id !== part.id && !wouldCreateCycle(allParts, part.id, candidate.id)
  );

  // Attachment CRUD
  const handleAddAttachment = () => {
    const nextAtt: StudioAttachmentNode = {
      id: `att_${Date.now().toString(36)}_${attachments.length + 1}`,
      name: `Attachment_${attachments.length + 1}`,
      position: [0, 0, 0],
      rotation: [0, 0, 0],
    };
    onUpdatePart(part.id, { attachments: [...attachments, nextAtt] });
  };

  const handleUpdateAttachment = (attId: string, patch: Partial<StudioAttachmentNode>) => {
    onUpdatePart(part.id, {
      attachments: attachments.map((a) => (a.id === attId ? { ...a, ...patch } : a)),
    });
  };

  const handleDeleteAttachment = (attId: string) => {
    onUpdatePart(part.id, {
      attachments: attachments.filter((a) => a.id !== attId),
      effects: effects.map((fx) => {
        if (fx.kind !== 'Trail' && fx.attachmentId === attId) {
          return { ...fx, attachmentId: null };
        }
        return fx;
      }),
    });
  };

  // Effect CRUD
  const handleAddParticle = () => {
    const nextFx: StudioParticleEmitterEffect = {
      id: `fx_pt_${Date.now().toString(36)}_${effects.length + 1}`,
      kind: 'ParticleEmitter',
      name: `${part.name}_Particles`,
      attachmentId: attachments[0]?.id ?? null,
      enabled: true,
      color: '#34D399',
      endColor: '#F59E0B',
      sizeStart: 0.35,
      sizeEnd: 0.08,
      rate: 24,
      lifetime: [0.4, 0.9],
      speed: [3, 6],
      spreadAngle: 20,
      acceleration: [0, 1, 0],
      lightEmission: 0.85,
      transparencyStart: 0.1,
      transparencyEnd: 0.95,
      textureId: 'rbxassetid://241685484',
      burstCount: 25,
    };
    onUpdatePart(part.id, { effects: [...effects, nextFx] });
  };

  const handleAddTrail = () => {
    let att0 = attachments[0]?.id;
    let att1 = attachments[1]?.id;
    let nextAttachments = attachments;

    if (!att0 || !att1) {
      const a0: StudioAttachmentNode = attachments[0] ?? {
        id: `att_t0_${Date.now().toString(36)}`,
        name: 'TrailEdge_A',
        position: [-0.35, 0, 0],
        rotation: [0, 0, 0],
      };
      const a1: StudioAttachmentNode = attachments[1] ?? {
        id: `att_t1_${Date.now().toString(36)}_2`,
        name: 'TrailEdge_B',
        position: [0.35, 0, 0],
        rotation: [0, 0, 0],
      };
      nextAttachments = [
        ...attachments,
        ...(attachments[0] ? [] : [a0]),
        ...(attachments[1] ? [] : [a1]),
      ];
      att0 = a0.id;
      att1 = a1.id;
    }

    const nextTrail: StudioTrailEffect = {
      id: `fx_tr_${Date.now().toString(36)}_${effects.length + 1}`,
      kind: 'Trail',
      name: `${part.name}_Trail`,
      attachment0Id: att0,
      attachment1Id: att1,
      enabled: true,
      color: '#FEF08A',
      endColor: '#F97316',
      lifetime: 0.45,
      minLength: 0.1,
      widthScaleStart: 1,
      widthScaleEnd: 0,
      transparencyStart: 0.15,
      transparencyEnd: 1,
      lightEmission: 0.85,
    };
    onUpdatePart(part.id, {
      attachments: nextAttachments,
      effects: [...effects, nextTrail],
    });
  };

  const handleAddLight = () => {
    const nextLight: StudioPointLightEffect = {
      id: `fx_lt_${Date.now().toString(36)}_${effects.length + 1}`,
      kind: 'PointLight',
      name: `${part.name}_Glow`,
      attachmentId: attachments[0]?.id ?? null,
      enabled: true,
      color: '#F59E0B',
      brightness: 2.2,
      range: 12,
      shadows: false,
    };
    onUpdatePart(part.id, { effects: [...effects, nextLight] });
  };

  const handleUpdateEffect = (fxId: string, patch: Partial<StudioEffectNode>) => {
    onUpdatePart(part.id, {
      effects: effects.map((fx) =>
        fx.id === fxId ? ({ ...fx, ...patch } as StudioEffectNode) : fx
      ),
    });
  };

  const handleDeleteEffect = (fxId: string) => {
    onUpdatePart(part.id, { effects: effects.filter((fx) => fx.id !== fxId) });
  };

  // Sound CRUD
  const handleAddSound = () => {
    const nextSound: StudioSoundNode = {
      id: `snd_${Date.now().toString(36)}_${sounds.length + 1}`,
      name: `${part.name}_SFX`,
      soundId: 'rbxassetid://9118823101',
      volume: 0.75,
      playbackSpeed: 1.0,
      looped: false,
      rollOffMaxDistance: 75,
    };
    onUpdatePart(part.id, { sounds: [...sounds, nextSound] });
  };

  const handleUpdateSound = (sndId: string, patch: Partial<StudioSoundNode>) => {
    onUpdatePart(part.id, {
      sounds: sounds.map((s) => (s.id === sndId ? { ...s, ...patch } : s)),
    });
  };

  const handleDeleteSound = (sndId: string) => {
    onUpdatePart(part.id, { sounds: sounds.filter((s) => s.id !== sndId) });
  };

  return (
    <aside
      aria-label="Properties Inspector"
      className="w-72 shrink-0 h-full bg-[#151821] border-l border-white/10 flex flex-col overflow-y-auto studio-scroll"
    >
      {/* Header */}
      <div className="p-3 border-b border-white/10 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
          <Sliders className="w-3.5 h-3.5 text-blue-400" aria-hidden="true" />
          <span>{isAnimate ? 'Pose Inspector' : 'Properties'}</span>
        </div>
        <button
          type="button"
          onClick={() => onSetPrimaryPart(part.id)}
          className={`inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            isPrimaryPart
              ? 'bg-amber-500/15 text-amber-300 border-amber-500/40'
              : 'bg-white/5 text-slate-300 hover:bg-white/10 border-white/10'
          }`}
        >
          <Star className="w-3 h-3" aria-hidden="true" />
          <span>{isPrimaryPart ? 'PrimaryPart' : 'Set Primary'}</span>
        </button>
      </div>

      {/* Segmented Inspector Mode Tabs: Part | FX & Events */}
      <div className="px-3 pt-2.5 pb-2 border-b border-white/10 bg-[#11141c]">
        <div
          role="tablist"
          aria-label="Inspector Sections"
          className="grid grid-cols-2 gap-1 p-0.5 bg-[#0e1015] border border-white/10 rounded-md"
        >
          <button
            type="button"
            role="tab"
            aria-selected={inspectorTab === 'part'}
            onClick={() => setInspectorTab('part')}
            className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors whitespace-nowrap cursor-pointer ${
              inspectorTab === 'part'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            Part & Rig
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={inspectorTab === 'fx'}
            onClick={() => setInspectorTab('fx')}
            className={`inline-flex items-center justify-center gap-1 px-2 py-1 rounded text-[11px] font-semibold transition-colors whitespace-nowrap cursor-pointer ${
              inspectorTab === 'fx'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            <Sparkles className="w-3 h-3" aria-hidden="true" />
            <span>FX & Audio{fxCount > 0 ? ` (${fxCount})` : ''}</span>
          </button>
        </div>
      </div>

      {isAnimate && inspectorTab === 'part' && (
        <div className="px-3 py-2 bg-blue-600/10 border-b border-blue-500/20 flex items-center justify-between gap-2 text-[11px]">
          <span className="text-blue-200 font-mono-tabular">
            Pose @ {currentTime.toFixed(2)}s
          </span>
          <button
            type="button"
            onClick={() => onKeyCurrentPose(part.id)}
            className="inline-flex items-center gap-1 px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded font-medium cursor-pointer whitespace-nowrap"
          >
            <KeyRound className="w-3 h-3" aria-hidden="true" />
            <span>Key Pose</span>
          </button>
        </div>
      )}

      {inspectorTab === 'part' ? (
        <div className="p-3 space-y-4 text-xs">
          {/* Identity & Geometry */}
          <div className="space-y-2.5">
            <div>
              <label htmlFor="part-name-input" className="block text-[11px] text-slate-400 mb-1">
                Part Name
              </label>
              <input
                id="part-name-input"
                type="text"
                value={part.name}
                onChange={(e) => onUpdatePart(part.id, { name: e.target.value })}
                className="w-full px-2.5 py-1.5 bg-[#0e1015] border border-white/10 rounded text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label htmlFor="part-shape-select" className="block text-[11px] text-slate-400 mb-1">
                Geometry Shape
              </label>
              <select
                id="part-shape-select"
                value={part.shape}
                onChange={(e) => onUpdatePart(part.id, { shape: e.target.value as PartShape })}
                className="w-full px-2.5 py-1.5 bg-[#0e1015] border border-white/10 rounded text-slate-100 focus:outline-none focus:border-blue-500"
              >
                {SHAPE_CATALOG.map((entry) => (
                  <option key={entry.shape} value={entry.shape}>
                    {entry.label} {entry.isNativeRbxPart ? '(Native)' : '(Mesh)'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Motor6D Rigging Hierarchy */}
          <div className="pt-3 border-t border-white/10 space-y-2.5">
            <div className="flex items-center gap-1.5 font-semibold text-slate-200">
              <Link2 className="w-3.5 h-3.5 text-blue-400" aria-hidden="true" />
              <span>Rigging (Motor6D)</span>
            </div>

            <div>
              <label htmlFor="part-parent-select" className="block text-[11px] text-slate-400 mb-1">
                Parent Joint (Part0)
              </label>
              <select
                id="part-parent-select"
                value={part.parentId ?? ''}
                onChange={(e) =>
                  onReparentPart(part.id, e.target.value ? e.target.value : null)
                }
                className="w-full px-2.5 py-1.5 bg-[#0e1015] border border-white/10 rounded text-slate-100 focus:outline-none focus:border-blue-500"
              >
                <option value="">None (Root / Free Part)</option>
                {validParents.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="text-[11px] text-slate-400 mb-1">Joint Pivot Offset (Studs)</div>
              <div className="grid grid-cols-3 gap-1.5">
                {AXES.map((axis, idx) => (
                  <label
                    key={axis}
                    className="flex items-center bg-[#0e1015] border border-white/10 rounded px-1.5 py-1 focus-within:border-blue-500"
                  >
                    <span
                      className={`text-[10px] font-semibold mr-1 ${
                        idx === 0
                          ? 'text-rose-400'
                          : idx === 1
                          ? 'text-emerald-400'
                          : 'text-sky-400'
                      }`}
                    >
                      {axis}
                    </span>
                    <input
                      type="number"
                      step={0.25}
                      aria-label={`Pivot Offset ${axis}`}
                      value={Number(pivotOffset[idx].toFixed(2))}
                      onChange={(e) => updatePivot(idx as 0 | 1 | 2, e.target.value)}
                      className="w-full min-w-0 bg-transparent text-slate-100 font-mono-tabular text-[11px] focus:outline-none"
                    />
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Transform in Studs */}
          <div className="pt-3 border-t border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-200">
                {part.parentId ? 'Local Transform (Studs)' : 'Transform (Studs)'}
              </span>
              <button
                type="button"
                onClick={() =>
                  isAnimate
                    ? onUpdatePose(part.id, { rotation: [0, 0, 0] })
                    : onResetTransform(part.id)
                }
                className="text-[11px] text-blue-400 hover:text-blue-300 cursor-pointer"
              >
                Reset Rot
              </button>
            </div>

            {(['position', 'rotation', 'size'] as const).map((vecKey) => {
              const label =
                vecKey === 'position'
                  ? part.parentId
                    ? 'Local Position'
                    : 'Position'
                  : vecKey === 'rotation'
                  ? 'Rotation (deg)'
                  : 'Size';
              const step = vecKey === 'rotation' ? 5 : 0.25;
              const currentVec =
                vecKey === 'position'
                  ? displayedPosition
                  : vecKey === 'rotation'
                  ? displayedRotation
                  : displayedSize;
              return (
                <div key={vecKey}>
                  <div className="text-[11px] text-slate-400 mb-1">{label}</div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {AXES.map((axis, idx) => (
                      <label
                        key={axis}
                        className="flex items-center bg-[#0e1015] border border-white/10 rounded px-1.5 py-1 focus-within:border-blue-500"
                      >
                        <span
                          className={`text-[10px] font-semibold mr-1 ${
                            idx === 0
                              ? 'text-rose-400'
                              : idx === 1
                              ? 'text-emerald-400'
                              : 'text-sky-400'
                          }`}
                        >
                          {axis}
                        </span>
                        <input
                          type="number"
                          step={step}
                          aria-label={`${label} ${axis}`}
                          value={Number(currentVec[idx].toFixed(2))}
                          onChange={(e) =>
                            updateVector(vecKey, idx as 0 | 1 | 2, e.target.value)
                          }
                          className="w-full min-w-0 bg-transparent text-slate-100 font-mono-tabular text-[11px] focus:outline-none"
                        />
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Appearance & Roblox Material */}
          <div className="pt-3 border-t border-white/10 space-y-3">
            <span className="block font-semibold text-slate-200">Appearance</span>

            <div>
              <label htmlFor="part-material-select" className="block text-[11px] text-slate-400 mb-1">
                Roblox Material
              </label>
              <select
                id="part-material-select"
                value={part.material}
                onChange={(e) =>
                  onUpdatePart(part.id, { material: e.target.value as RobloxMaterial })
                }
                className="w-full px-2.5 py-1.5 bg-[#0e1015] border border-white/10 rounded text-slate-100 focus:outline-none focus:border-blue-500"
              >
                {Object.values(ROBLOX_MATERIAL_SPECS).map((spec) => (
                  <option key={spec.id} value={spec.id}>
                    {spec.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5">
                <label htmlFor="part-color-input">Color</label>
                <span className="font-mono-tabular text-slate-300">
                  {displayedColor.toUpperCase()}
                </span>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <input
                  id="part-color-input"
                  type="color"
                  value={displayedColor}
                  onChange={(e) =>
                    isAnimate
                      ? onUpdatePose(part.id, { color: e.target.value })
                      : onUpdatePart(part.id, { color: e.target.value })
                  }
                  className="w-8 h-7 rounded bg-transparent border border-white/15 cursor-pointer"
                  aria-label="Color Picker"
                />
                <div className="grid grid-cols-8 gap-1 flex-1">
                  {ROBLOX_COLOR_PALETTE.map((swatch) => (
                    <button
                      key={swatch.hex}
                      type="button"
                      onClick={() =>
                        isAnimate
                          ? onUpdatePose(part.id, { color: swatch.hex })
                          : onUpdatePart(part.id, { color: swatch.hex })
                      }
                      className={`w-full aspect-square rounded-xs border cursor-pointer ${
                        displayedColor.toUpperCase() === swatch.hex.toUpperCase()
                          ? 'border-white ring-1 ring-blue-400'
                          : 'border-white/15'
                      }`}
                      style={{ backgroundColor: swatch.hex }}
                      aria-label={`Color ${swatch.name}`}
                      title={swatch.name}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                <label htmlFor="part-transparency-range">Transparency</label>
                <span className="font-mono-tabular text-slate-200">
                  {displayedTransparency.toFixed(2)}
                </span>
              </div>
              <input
                id="part-transparency-range"
                type="range"
                min={0}
                max={0.95}
                step={0.05}
                value={displayedTransparency}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  if (isAnimate) {
                    onUpdatePose(part.id, { transparency: v });
                  } else {
                    onUpdatePart(part.id, { transparency: v });
                  }
                }}
                className="w-full accent-blue-500 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                <label htmlFor="part-reflectance-range">Reflectance</label>
                <span className="font-mono-tabular text-slate-200">
                  {part.reflectance.toFixed(2)}
                </span>
              </div>
              <input
                id="part-reflectance-range"
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={part.reflectance}
                onChange={(e) =>
                  onUpdatePart(part.id, { reflectance: parseFloat(e.target.value) })
                }
                className="w-full accent-blue-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Studio Physics Flags */}
          <div className="pt-3 border-t border-white/10 space-y-2">
            <span className="block font-semibold text-slate-200">Roblox Behavior</span>
            <label className="flex items-center justify-between py-1 cursor-pointer">
              <span className="text-slate-300">Anchored</span>
              <input
                type="checkbox"
                checked={part.anchored}
                onChange={(e) => onUpdatePart(part.id, { anchored: e.target.checked })}
                className="accent-blue-500 w-4 h-4"
              />
            </label>
            <label className="flex items-center justify-between py-1 cursor-pointer">
              <span className="text-slate-300">CanCollide</span>
              <input
                type="checkbox"
                checked={part.canCollide}
                onChange={(e) => onUpdatePart(part.id, { canCollide: e.target.checked })}
                className="accent-blue-500 w-4 h-4"
              />
            </label>
            <label className="flex items-center justify-between py-1 cursor-pointer">
              <span className="text-slate-300">CastShadow</span>
              <input
                type="checkbox"
                checked={part.castShadow}
                onChange={(e) => onUpdatePart(part.id, { castShadow: e.target.checked })}
                className="accent-blue-500 w-4 h-4"
              />
            </label>
          </div>
        </div>
      ) : (
        <div className="p-3 space-y-4 text-xs">
          {/* Host Part Context */}
          <div className="bg-[#0e1015] border border-white/10 rounded-md px-2.5 py-2 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">Host Part</span>
            <span className="font-semibold text-slate-100 truncate max-w-36">{part.name}</span>
          </div>

          {/* 1. Attachments */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-semibold text-slate-200">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                <span>Attachments ({attachments.length})</span>
              </div>
              <button
                type="button"
                onClick={handleAddAttachment}
                className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] bg-white/5 hover:bg-white/10 border border-white/10 text-emerald-300 rounded cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-3 h-3" aria-hidden="true" />
                <span>Attachment</span>
              </button>
            </div>

            {attachments.length === 0 ? (
              <p className="text-[11px] text-slate-400">
                No Attachments on this part. Add one to anchor ParticleEmitters, Trails, or Lights.
              </p>
            ) : (
              <div className="space-y-2">
                {attachments.map((att) => (
                  <div
                    key={att.id}
                    className="bg-[#0e1015] border border-white/10 rounded-md p-2 space-y-2"
                  >
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        aria-label="Attachment Name"
                        value={att.name}
                        onChange={(e) => handleUpdateAttachment(att.id, { name: e.target.value })}
                        className="flex-1 min-w-0 px-2 py-1 bg-[#151821] border border-white/10 rounded text-[11px] text-slate-100 focus:outline-none focus:border-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={() => handleDeleteAttachment(att.id)}
                        aria-label={`Delete ${att.name}`}
                        className="p-1 text-slate-400 hover:text-red-400 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" aria-hidden="true" />
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      {AXES.map((axis, idx) => (
                        <label
                          key={axis}
                          className="flex items-center bg-[#151821] border border-white/10 rounded px-1 py-0.5"
                        >
                          <span className="text-[9px] text-slate-400 mr-1">{axis}</span>
                          <input
                            type="number"
                            step={0.1}
                            value={Number(att.position[idx].toFixed(2))}
                            onChange={(e) => {
                              const v = parseFloat(e.target.value);
                              if (!Number.isFinite(v)) return;
                              const nextPos: [number, number, number] = [...att.position];
                              nextPos[idx] = v;
                              handleUpdateAttachment(att.id, { position: nextPos });
                            }}
                            className="w-full min-w-0 bg-transparent text-[11px] font-mono-tabular text-slate-100 focus:outline-none"
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 2. Effects: ParticleEmitters, Trails, PointLights */}
          <div className="pt-3 border-t border-white/10 space-y-2.5">
            <div className="flex items-center justify-between gap-1">
              <div className="flex items-center gap-1.5 font-semibold text-slate-200">
                <Flame className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
                <span>Effects ({effects.length})</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleAddParticle}
                  title="Add ParticleEmitter"
                  className="px-1.5 py-0.5 text-[10px] bg-white/5 hover:bg-white/10 border border-white/10 text-amber-300 rounded cursor-pointer whitespace-nowrap"
                >
                  + Particle
                </button>
                <button
                  type="button"
                  onClick={handleAddTrail}
                  title="Add Trail Ribbon"
                  className="px-1.5 py-0.5 text-[10px] bg-white/5 hover:bg-white/10 border border-white/10 text-sky-300 rounded cursor-pointer whitespace-nowrap"
                >
                  + Trail
                </button>
                <button
                  type="button"
                  onClick={handleAddLight}
                  title="Add PointLight"
                  className="px-1.5 py-0.5 text-[10px] bg-white/5 hover:bg-white/10 border border-white/10 text-yellow-200 rounded cursor-pointer whitespace-nowrap"
                >
                  + Light
                </button>
              </div>
            </div>

            {effects.length === 0 ? (
              <p className="text-[11px] text-slate-400">
                No FX on this part yet. Add ParticleEmitters, Trails, or PointLights.
              </p>
            ) : (
              <div className="space-y-2.5">
                {effects.map((fx) => (
                  <div
                    key={fx.id}
                    className="bg-[#0e1015] border border-white/10 rounded-md p-2.5 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-300">
                        {fx.kind === 'ParticleEmitter' ? (
                          <Sparkles className="w-3 h-3 text-amber-400" aria-hidden="true" />
                        ) : fx.kind === 'Trail' ? (
                          <Wind className="w-3 h-3 text-sky-400" aria-hidden="true" />
                        ) : (
                          <Lightbulb className="w-3 h-3 text-yellow-300" aria-hidden="true" />
                        )}
                        <span>{fx.kind}</span>
                      </span>
                      <div className="flex items-center gap-1.5">
                        <label className="inline-flex items-center gap-1 text-[10px] text-slate-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={fx.enabled}
                            onChange={(e) => handleUpdateEffect(fx.id, { enabled: e.target.checked })}
                            className="accent-blue-500"
                          />
                          <span>On</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => handleDeleteEffect(fx.id)}
                          aria-label={`Delete ${fx.name}`}
                          className="p-0.5 text-slate-400 hover:text-red-400 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" aria-hidden="true" />
                        </button>
                      </div>
                    </div>

                    <input
                      type="text"
                      aria-label={`${fx.kind} Name`}
                      value={fx.name}
                      onChange={(e) => handleUpdateEffect(fx.id, { name: e.target.value })}
                      className="w-full px-2 py-1 bg-[#151821] border border-white/10 rounded text-[11px] text-slate-100 focus:outline-none focus:border-blue-500"
                    />

                    {fx.kind === 'ParticleEmitter' && (
                      <div className="space-y-2 pt-1">
                        <div>
                          <label className="block text-[10px] text-slate-400 mb-0.5">
                            Attachment Host
                          </label>
                          <select
                            value={fx.attachmentId ?? ''}
                            onChange={(e) =>
                              handleUpdateEffect(fx.id, {
                                attachmentId: e.target.value || null,
                              })
                            }
                            className="w-full px-2 py-1 bg-[#151821] border border-white/10 rounded text-[11px] text-slate-100"
                          >
                            <option value="">Part Center</option>
                            {attachments.map((att) => (
                              <option key={att.id} value={att.id}>
                                {att.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <label className="block text-[10px] text-slate-400">
                            Start Color
                            <input
                              type="color"
                              value={fx.color}
                              onChange={(e) => handleUpdateEffect(fx.id, { color: e.target.value })}
                              className="mt-0.5 w-full h-6 rounded bg-transparent border border-white/10 cursor-pointer"
                            />
                          </label>
                          <label className="block text-[10px] text-slate-400">
                            End Color
                            <input
                              type="color"
                              value={fx.endColor}
                              onChange={(e) =>
                                handleUpdateEffect(fx.id, { endColor: e.target.value })
                              }
                              className="mt-0.5 w-full h-6 rounded bg-transparent border border-white/10 cursor-pointer"
                            />
                          </label>
                        </div>

                        <div className="grid grid-cols-3 gap-1.5">
                          <label className="block text-[10px] text-slate-400">
                            Rate
                            <input
                              type="number"
                              min={0}
                              max={200}
                              step={2}
                              value={fx.rate}
                              onChange={(e) => {
                                const v = parseFloat(e.target.value);
                                if (Number.isFinite(v))
                                  handleUpdateEffect(fx.id, { rate: Math.max(0, v) });
                              }}
                              className="mt-0.5 w-full px-1.5 py-0.5 bg-[#151821] border border-white/10 rounded font-mono-tabular text-[11px] text-slate-100"
                            />
                          </label>
                          <label className="block text-[10px] text-slate-400">
                            Speed
                            <input
                              type="number"
                              min={0}
                              max={50}
                              step={0.5}
                              value={fx.speed[1]}
                              onChange={(e) => {
                                const v = parseFloat(e.target.value);
                                if (Number.isFinite(v))
                                  handleUpdateEffect(fx.id, {
                                    speed: [Math.max(0, v * 0.6), Math.max(0.1, v)],
                                  });
                              }}
                              className="mt-0.5 w-full px-1.5 py-0.5 bg-[#151821] border border-white/10 rounded font-mono-tabular text-[11px] text-slate-100"
                            />
                          </label>
                          <label className="block text-[10px] text-slate-400">
                            Burst
                            <input
                              type="number"
                              min={1}
                              max={200}
                              step={1}
                              value={fx.burstCount}
                              onChange={(e) => {
                                const v = parseInt(e.target.value, 10);
                                if (Number.isFinite(v))
                                  handleUpdateEffect(fx.id, { burstCount: Math.max(1, v) });
                              }}
                              className="mt-0.5 w-full px-1.5 py-0.5 bg-[#151821] border border-white/10 rounded font-mono-tabular text-[11px] text-slate-100"
                            />
                          </label>
                        </div>

                        <div className="grid grid-cols-2 gap-1.5">
                          <label className="block text-[10px] text-slate-400">
                            Size Start
                            <input
                              type="number"
                              min={0.02}
                              max={10}
                              step={0.05}
                              value={fx.sizeStart}
                              onChange={(e) => {
                                const v = parseFloat(e.target.value);
                                if (Number.isFinite(v))
                                  handleUpdateEffect(fx.id, { sizeStart: Math.max(0.02, v) });
                              }}
                              className="mt-0.5 w-full px-1.5 py-0.5 bg-[#151821] border border-white/10 rounded font-mono-tabular text-[11px] text-slate-100"
                            />
                          </label>
                          <label className="block text-[10px] text-slate-400">
                            Spread (deg)
                            <input
                              type="number"
                              min={0}
                              max={180}
                              step={5}
                              value={fx.spreadAngle}
                              onChange={(e) => {
                                const v = parseFloat(e.target.value);
                                if (Number.isFinite(v))
                                  handleUpdateEffect(fx.id, { spreadAngle: Math.max(0, Math.min(180, v)) });
                              }}
                              className="mt-0.5 w-full px-1.5 py-0.5 bg-[#151821] border border-white/10 rounded font-mono-tabular text-[11px] text-slate-100"
                            />
                          </label>
                        </div>

                        <label className="block text-[10px] text-slate-400">
                          Texture Asset ID
                          <input
                            type="text"
                            value={fx.textureId}
                            onChange={(e) =>
                              handleUpdateEffect(fx.id, { textureId: e.target.value })
                            }
                            className="mt-0.5 w-full px-2 py-0.5 bg-[#151821] border border-white/10 rounded font-mono-tabular text-[10px] text-slate-200"
                          />
                        </label>

                        {onTriggerBurst && (
                          <button
                            type="button"
                            onClick={() => onTriggerBurst(fx.id, fx.burstCount)}
                            className="w-full py-1 px-2 text-[11px] font-semibold bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-200 rounded cursor-pointer transition-colors"
                          >
                            Emit Test Burst ({fx.burstCount})
                          </button>
                        )}
                      </div>
                    )}

                    {fx.kind === 'Trail' && (
                      <div className="space-y-2 pt-1">
                        <div className="grid grid-cols-2 gap-1.5">
                          <label className="block text-[10px] text-slate-400">
                            Attachment 0
                            <select
                              value={fx.attachment0Id}
                              onChange={(e) =>
                                handleUpdateEffect(fx.id, { attachment0Id: e.target.value })
                              }
                              className="mt-0.5 w-full px-1.5 py-1 bg-[#151821] border border-white/10 rounded text-[11px] text-slate-100"
                            >
                              {allModelAttachments.map((entry) => (
                                <option key={entry.attachment.id} value={entry.attachment.id}>
                                  {entry.attachment.name}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="block text-[10px] text-slate-400">
                            Attachment 1
                            <select
                              value={fx.attachment1Id}
                              onChange={(e) =>
                                handleUpdateEffect(fx.id, { attachment1Id: e.target.value })
                              }
                              className="mt-0.5 w-full px-1.5 py-1 bg-[#151821] border border-white/10 rounded text-[11px] text-slate-100"
                            >
                              {allModelAttachments.map((entry) => (
                                <option key={entry.attachment.id} value={entry.attachment.id}>
                                  {entry.attachment.name}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>
                        <div className="grid grid-cols-3 gap-1.5">
                          <label className="block text-[10px] text-slate-400">
                            Start
                            <input
                              type="color"
                              value={fx.color}
                              onChange={(e) => handleUpdateEffect(fx.id, { color: e.target.value })}
                              className="mt-0.5 w-full h-6 rounded bg-transparent border border-white/10 cursor-pointer"
                            />
                          </label>
                          <label className="block text-[10px] text-slate-400">
                            End
                            <input
                              type="color"
                              value={fx.endColor}
                              onChange={(e) =>
                                handleUpdateEffect(fx.id, { endColor: e.target.value })
                              }
                              className="mt-0.5 w-full h-6 rounded bg-transparent border border-white/10 cursor-pointer"
                            />
                          </label>
                          <label className="block text-[10px] text-slate-400">
                            Life (s)
                            <input
                              type="number"
                              min={0.05}
                              max={5}
                              step={0.05}
                              value={fx.lifetime}
                              onChange={(e) => {
                                const v = parseFloat(e.target.value);
                                if (Number.isFinite(v))
                                  handleUpdateEffect(fx.id, { lifetime: Math.max(0.05, v) });
                              }}
                              className="mt-0.5 w-full px-1.5 py-0.5 bg-[#151821] border border-white/10 rounded font-mono-tabular text-[11px] text-slate-100"
                            />
                          </label>
                        </div>
                      </div>
                    )}

                    {fx.kind === 'PointLight' && (
                      <div className="space-y-2 pt-1">
                        <div>
                          <label className="block text-[10px] text-slate-400 mb-0.5">
                            Attachment Host
                          </label>
                          <select
                            value={fx.attachmentId ?? ''}
                            onChange={(e) =>
                              handleUpdateEffect(fx.id, {
                                attachmentId: e.target.value || null,
                              })
                            }
                            className="w-full px-2 py-1 bg-[#151821] border border-white/10 rounded text-[11px] text-slate-100"
                          >
                            <option value="">Part Center</option>
                            {attachments.map((att) => (
                              <option key={att.id} value={att.id}>
                                {att.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="grid grid-cols-3 gap-1.5">
                          <label className="block text-[10px] text-slate-400">
                            Color
                            <input
                              type="color"
                              value={fx.color}
                              onChange={(e) => handleUpdateEffect(fx.id, { color: e.target.value })}
                              className="mt-0.5 w-full h-6 rounded bg-transparent border border-white/10 cursor-pointer"
                            />
                          </label>
                          <label className="block text-[10px] text-slate-400">
                            Bright
                            <input
                              type="number"
                              min={0}
                              max={20}
                              step={0.25}
                              value={fx.brightness}
                              onChange={(e) => {
                                const v = parseFloat(e.target.value);
                                if (Number.isFinite(v))
                                  handleUpdateEffect(fx.id, { brightness: Math.max(0, v) });
                              }}
                              className="mt-0.5 w-full px-1.5 py-0.5 bg-[#151821] border border-white/10 rounded font-mono-tabular text-[11px] text-slate-100"
                            />
                          </label>
                          <label className="block text-[10px] text-slate-400">
                            Range
                            <input
                              type="number"
                              min={1}
                              max={60}
                              step={1}
                              value={fx.range}
                              onChange={(e) => {
                                const v = parseFloat(e.target.value);
                                if (Number.isFinite(v))
                                  handleUpdateEffect(fx.id, { range: Math.max(1, v) });
                              }}
                              className="mt-0.5 w-full px-1.5 py-0.5 bg-[#151821] border border-white/10 rounded font-mono-tabular text-[11px] text-slate-100"
                            />
                          </label>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 3. Sounds (Package Audio Folder) */}
          <div className="pt-3 border-t border-white/10 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-semibold text-slate-200">
                <Volume2 className="w-3.5 h-3.5 text-cyan-400" aria-hidden="true" />
                <span>Sounds ({sounds.length})</span>
              </div>
              <button
                type="button"
                onClick={handleAddSound}
                className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] bg-white/5 hover:bg-white/10 border border-white/10 text-cyan-300 rounded cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-3 h-3" aria-hidden="true" />
                <span>Sound</span>
              </button>
            </div>

            {sounds.length === 0 ? (
              <p className="text-[11px] text-slate-400">
                No Sound instances linked to this part. Sounds export into the Package Audio folder.
              </p>
            ) : (
              <div className="space-y-2">
                {sounds.map((snd) => (
                  <div
                    key={snd.id}
                    className="bg-[#0e1015] border border-white/10 rounded-md p-2.5 space-y-2"
                  >
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        aria-label="Sound Name"
                        value={snd.name}
                        onChange={(e) => handleUpdateSound(snd.id, { name: e.target.value })}
                        className="flex-1 min-w-0 px-2 py-1 bg-[#151821] border border-white/10 rounded text-[11px] text-slate-100"
                      />
                      <button
                        type="button"
                        onClick={() => handleDeleteSound(snd.id)}
                        aria-label={`Delete ${snd.name}`}
                        className="p-1 text-slate-400 hover:text-red-400 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" aria-hidden="true" />
                      </button>
                    </div>
                    <input
                      type="text"
                      aria-label="Roblox SoundId"
                      value={snd.soundId}
                      onChange={(e) => handleUpdateSound(snd.id, { soundId: e.target.value })}
                      className="w-full px-2 py-1 bg-[#151821] border border-white/10 rounded font-mono-tabular text-[10px] text-cyan-200"
                    />
                    <div className="grid grid-cols-3 gap-1.5 items-end">
                      <label className="block text-[10px] text-slate-400">
                        Volume
                        <input
                          type="number"
                          min={0}
                          max={2}
                          step={0.05}
                          value={snd.volume}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value);
                            if (Number.isFinite(v))
                              handleUpdateSound(snd.id, { volume: Math.max(0, Math.min(2, v)) });
                          }}
                          className="mt-0.5 w-full px-1.5 py-0.5 bg-[#151821] border border-white/10 rounded font-mono-tabular text-[11px] text-slate-100"
                        />
                      </label>
                      <label className="block text-[10px] text-slate-400">
                        Speed
                        <input
                          type="number"
                          min={0.2}
                          max={3}
                          step={0.05}
                          value={snd.playbackSpeed}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value);
                            if (Number.isFinite(v))
                              handleUpdateSound(snd.id, {
                                playbackSpeed: Math.max(0.2, Math.min(3, v)),
                              });
                          }}
                          className="mt-0.5 w-full px-1.5 py-0.5 bg-[#151821] border border-white/10 rounded font-mono-tabular text-[11px] text-slate-100"
                        />
                      </label>
                      <label className="flex items-center justify-center gap-1 py-1 text-[10px] text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={snd.looped}
                          onChange={(e) => handleUpdateSound(snd.id, { looped: e.target.checked })}
                          className="accent-blue-500"
                        />
                        <span>Loop</span>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}
