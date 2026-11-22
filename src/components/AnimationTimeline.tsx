import { useState, useRef } from 'react';
import {
  Bookmark,
  KeyRound,
  Pause,
  Play,
  Plus,
  Repeat,
  SkipBack,
  Trash2,
} from 'lucide-react';
import { flattenPartTree, getClipPriority } from '../engine/animationEngine';
import {
  AnimationClip,
  AnimationEventMarker,
  AnimationSampleMode,
  MarkerEffectAction,
  PartPoseKeyframe,
  ROBLOX_ANIMATION_PRIORITIES,
  ROBLOX_EASING_DIRECTIONS,
  ROBLOX_EASING_STYLES,
  RobloxAnimationPriority,
  RobloxEasingDirection,
  RobloxEasingStyle,
  StudioEffectNode,
  StudioPartNode,
  StudioSoundNode,
} from '../engine/robloxTypes';

interface SelectedKeyframeRef {
  partId: string;
  keyframeId: string;
}

interface AnimationTimelineProps {
  parts: StudioPartNode[];
  selectedPartId: string | null;
  clips: AnimationClip[];
  activeClip: AnimationClip | null;
  currentTime: number;
  isPlaying: boolean;
  playbackSpeed: number;
  autoKey: boolean;
  selectedKeyframeRef: SelectedKeyframeRef | null;
  allEffects: { partName: string; effect: StudioEffectNode }[];
  allSounds: { partName: string; sound: StudioSoundNode }[];
  onSelectPart: (partId: string) => void;
  onSelectClip: (clipId: string) => void;
  onCreateClip: () => void;
  onDeleteClip: (clipId: string) => void;
  onUpdateClipMeta: (
    clipId: string,
    patch: Partial<
      Pick<
        AnimationClip,
        'name' | 'duration' | 'fps' | 'loop' | 'priority' | 'sampleMode' | 'fadeTime' | 'defaultWeight'
      >
    >
  ) => void;
  onScrubTime: (time: number) => void;
  onTogglePlay: () => void;
  onStopReset: () => void;
  onChangeSpeed: (speed: number) => void;
  onToggleAutoKey: () => void;
  onAddKeyframeForSelected: () => void;
  onSelectKeyframe: (ref: SelectedKeyframeRef, time: number) => void;
  onUpdateKeyframeEasing: (
    partId: string,
    keyframeId: string,
    style: RobloxEasingStyle,
    direction: RobloxEasingDirection,
    weight?: number
  ) => void;
  onDeleteKeyframe: (partId: string, keyframeId: string) => void;
  onUpsertMarker: (
    clipId: string,
    marker: Omit<AnimationEventMarker, 'id'> & { id?: string }
  ) => string | undefined;
  onDeleteMarker: (clipId: string, markerId: string) => void;
}

const MARKER_ACTIONS: MarkerEffectAction[] = ['emit', 'enable', 'disable', 'pulse'];

export function AnimationTimeline({
  parts,
  selectedPartId,
  clips,
  activeClip,
  currentTime,
  isPlaying,
  playbackSpeed,
  autoKey,
  selectedKeyframeRef,
  allEffects,
  allSounds,
  onSelectPart,
  onSelectClip,
  onCreateClip,
  onDeleteClip,
  onUpdateClipMeta,
  onScrubTime,
  onTogglePlay,
  onStopReset,
  onChangeSpeed,
  onToggleAutoKey,
  onAddKeyframeForSelected,
  onSelectKeyframe,
  onUpdateKeyframeEasing,
  onDeleteKeyframe,
  onUpsertMarker,
  onDeleteMarker,
}: AnimationTimelineProps) {
  const rulerRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef<boolean>(false);
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);

  const duration = Math.max(0.25, activeClip?.duration ?? 2.0);
  const clampedTime = Math.max(0, Math.min(duration, currentTime));
  const playheadPct = (clampedTime / duration) * 100;

  const scrubFromClientX = (clientX: number) => {
    const el = rulerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const frac = Math.max(0, Math.min(1, (clientX - rect.left) / Math.max(1, rect.width)));
    onScrubTime(Math.round(frac * duration * 100) / 100);
  };

  let selectedKf: PartPoseKeyframe | null = null;
  if (activeClip && selectedKeyframeRef) {
    const tr = activeClip.tracks.find((t) => t.partId === selectedKeyframeRef.partId);
    selectedKf = tr?.keyframes.find((k) => k.id === selectedKeyframeRef.keyframeId) ?? null;
  }

  const markers = [...(activeClip?.markers ?? [])].sort((a, b) => a.time - b.time);
  const selectedMarker = markers.find((m) => m.id === selectedMarkerId) ?? null;

  const treeOrdered = flattenPartTree(parts);
  const trackedSet = new Set(activeClip?.tracks.map((t) => t.partId) ?? []);
  const orderedParts = [
    ...treeOrdered.filter((item) => trackedSet.has(item.part.id)),
    ...treeOrdered.filter((item) => !trackedSet.has(item.part.id)),
  ];

  const tickCount = duration <= 3 ? 6 : duration <= 6 ? 8 : 10;
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => (i / tickCount) * duration);

  const handleAddMarkerAtPlayhead = () => {
    if (!activeClip) return;
    const newId = onUpsertMarker(activeClip.id, {
      time: clampedTime,
      name: `Event_${markers.length + 1}`,
      value: 'Trigger',
      effectId: allEffects[0]?.effect.id,
      effectAction: 'emit',
      burstCount: 20,
      soundId: allSounds[0]?.sound.id,
    });
    if (newId) setSelectedMarkerId(newId);
  };

  return (
    <section
      aria-label="Animation Keyframe Timeline"
      className="h-56 shrink-0 bg-[#151821] border-t border-white/10 flex flex-col select-none z-20"
    >
      {/* Row 1: Transport, Clip Studio Config (Priority/FPS/Sample/Fade/Weight) & Keyframing */}
      <div className="px-2.5 py-1.5 border-b border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs">
        {/* Clip Picker & Creation */}
        <div className="flex items-center gap-1.5 shrink-0">
          <select
            aria-label="Active Animation Clip"
            value={activeClip?.id ?? ''}
            onChange={(e) => {
              setSelectedMarkerId(null);
              onSelectClip(e.target.value);
            }}
            disabled={clips.length === 0}
            className="px-2 py-1 text-[11px] font-medium bg-[#0e1015] border border-white/10 rounded text-slate-100 focus:outline-none focus:border-blue-500 max-w-32"
          >
            {clips.length === 0 ? (
              <option value="">No Clips</option>
            ) : (
              clips.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))
            )}
          </select>

          <button
            type="button"
            onClick={onCreateClip}
            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium bg-[#0e1015] hover:bg-white/10 border border-white/10 text-slate-200 rounded transition-colors cursor-pointer whitespace-nowrap"
            aria-label="New Animation Clip"
          >
            <Plus className="w-3 h-3 text-blue-400" aria-hidden="true" />
            <span>Clip</span>
          </button>

          {activeClip && clips.length > 1 && (
            <button
              type="button"
              onClick={() => onDeleteClip(activeClip.id)}
              className="p-1 text-slate-400 hover:text-red-400 rounded cursor-pointer"
              aria-label="Delete Clip"
              title="Delete Clip"
            >
              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Playback Transport + Roblox Clip Metadata */}
        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
          <div className="flex items-center gap-0.5 bg-[#0e1015] border border-white/10 rounded-md p-0.5">
            <button
              type="button"
              onClick={onStopReset}
              disabled={!activeClip}
              className="p-1 text-slate-300 hover:text-white disabled:opacity-40 rounded cursor-pointer"
              aria-label="Stop and reset playhead"
              title="Reset to 0.00s"
            >
              <SkipBack className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={onTogglePlay}
              disabled={!activeClip}
              aria-pressed={isPlaying}
              className={`inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold rounded transition-colors cursor-pointer disabled:opacity-40 ${
                isPlaying
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-blue-600 hover:bg-blue-500 text-white'
              }`}
              aria-label={isPlaying ? 'Pause animation' : 'Play animation'}
            >
              {isPlaying ? (
                <Pause className="w-3 h-3" aria-hidden="true" />
              ) : (
                <Play className="w-3 h-3" aria-hidden="true" />
              )}
              <span>{isPlaying ? 'Pause' : 'Play'}</span>
            </button>
            <button
              type="button"
              disabled={!activeClip}
              onClick={() =>
                activeClip && onUpdateClipMeta(activeClip.id, { loop: !activeClip.loop })
              }
              aria-pressed={activeClip?.loop ?? false}
              className={`p-1 rounded transition-colors cursor-pointer disabled:opacity-40 ${
                activeClip?.loop
                  ? 'bg-blue-600/25 text-blue-300'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              aria-label="Toggle loop playback"
              title="Loop"
            >
              <Repeat className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>

          <span className="font-mono-tabular text-[11px] text-slate-200 bg-[#0e1015] border border-white/10 rounded px-2 py-1 whitespace-nowrap">
            {clampedTime.toFixed(2)}s / {duration.toFixed(2)}s
          </span>

          <select
            aria-label="Playback Speed"
            value={playbackSpeed}
            onChange={(e) => onChangeSpeed(parseFloat(e.target.value))}
            className="hidden sm:block px-1.5 py-1 text-[11px] font-mono-tabular bg-[#0e1015] border border-white/10 rounded text-slate-300 focus:outline-none"
          >
            <option value={0.5}>0.5x</option>
            <option value={1}>1x</option>
            <option value={2}>2x</option>
          </select>

          {activeClip && (
            <>
              <select
                aria-label="AnimationPriority"
                title="Roblox Enum.AnimationPriority"
                value={getClipPriority(activeClip)}
                onChange={(e) =>
                  onUpdateClipMeta(activeClip.id, {
                    priority: e.target.value as RobloxAnimationPriority,
                  })
                }
                className="hidden md:block px-1.5 py-1 text-[11px] bg-[#0e1015] border border-white/10 rounded text-emerald-300 focus:outline-none cursor-pointer"
              >
                {ROBLOX_ANIMATION_PRIORITIES.map((p) => (
                  <option key={p} value={p} className="bg-[#151821] text-slate-100">
                    Priority: {p}
                  </option>
                ))}
              </select>

              <select
                aria-label="Clip FPS"
                title="Roblox Sample FPS"
                value={activeClip.fps}
                onChange={(e) =>
                  onUpdateClipMeta(activeClip.id, {
                    fps: Number(e.target.value) as 15 | 30 | 60,
                  })
                }
                className="hidden lg:block px-1.5 py-1 text-[11px] font-mono-tabular bg-[#0e1015] border border-white/10 rounded text-slate-300 focus:outline-none"
              >
                <option value={15}>15 fps</option>
                <option value={30}>30 fps</option>
                <option value={60}>60 fps</option>
              </select>

              <select
                aria-label="Sampling Mode"
                title="Keyframe Export Sampling Mode"
                value={activeClip.sampleMode ?? 'keyframes'}
                onChange={(e) =>
                  onUpdateClipMeta(activeClip.id, {
                    sampleMode: e.target.value as AnimationSampleMode,
                  })
                }
                className="hidden xl:block px-1.5 py-1 text-[11px] bg-[#0e1015] border border-white/10 rounded text-slate-300 focus:outline-none"
              >
                <option value="keyframes">Sparse Keys</option>
                <option value="resampled">Dense Bake</option>
              </select>

              <label
                title="Blend FadeTime (seconds)"
                className="hidden xl:flex items-center gap-1 bg-[#0e1015] border border-white/10 rounded px-1.5 py-1 text-[11px] text-slate-400"
              >
                <span>Fade</span>
                <input
                  type="number"
                  min={0}
                  max={2}
                  step={0.05}
                  aria-label="Fade Time Seconds"
                  value={activeClip.fadeTime ?? 0.2}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (Number.isFinite(val) && val >= 0 && val <= 2) {
                      onUpdateClipMeta(activeClip.id, { fadeTime: val });
                    }
                  }}
                  className="w-9 bg-transparent text-slate-100 font-mono-tabular focus:outline-none"
                />
              </label>

              <label
                title="Clip Default Weight (0..1)"
                className="hidden lg:flex items-center gap-1 bg-[#0e1015] border border-white/10 rounded px-1.5 py-1 text-[11px] text-slate-400"
              >
                <span>Wt</span>
                <input
                  type="number"
                  min={0}
                  max={1}
                  step={0.05}
                  aria-label="Clip Weight"
                  value={activeClip.defaultWeight ?? 1}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (Number.isFinite(val) && val >= 0 && val <= 1) {
                      onUpdateClipMeta(activeClip.id, { defaultWeight: val });
                    }
                  }}
                  className="w-9 bg-transparent text-slate-100 font-mono-tabular focus:outline-none"
                />
              </label>

              <label className="hidden md:flex items-center gap-1 bg-[#0e1015] border border-white/10 rounded px-1.5 py-1 text-[11px] text-slate-400">
                <span>Len</span>
                <input
                  type="number"
                  min={0.5}
                  max={30}
                  step={0.5}
                  aria-label="Clip Duration Seconds"
                  value={activeClip.duration}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (Number.isFinite(val) && val >= 0.5 && val <= 30) {
                      onUpdateClipMeta(activeClip.id, { duration: val });
                    }
                  }}
                  className="w-10 bg-transparent text-slate-100 font-mono-tabular focus:outline-none"
                />
              </label>
            </>
          )}
        </div>

        {/* Keyframing, Marker & Selected Key Easing/Weight */}
        <div className="flex items-center gap-1.5 shrink-0">
          {selectedKf && selectedKeyframeRef && (
            <div className="hidden lg:flex items-center gap-1 bg-[#0e1015] border border-white/10 rounded px-1.5 py-0.5">
              <select
                aria-label="Keyframe EasingStyle"
                value={selectedKf.easingStyle}
                onChange={(e) =>
                  onUpdateKeyframeEasing(
                    selectedKeyframeRef.partId,
                    selectedKeyframeRef.keyframeId,
                    e.target.value as RobloxEasingStyle,
                    selectedKf!.easingDirection,
                    selectedKf!.weight
                  )
                }
                className="bg-transparent text-[11px] text-amber-300 focus:outline-none cursor-pointer"
              >
                {ROBLOX_EASING_STYLES.map((st) => (
                  <option key={st} value={st} className="bg-[#151821] text-slate-100">
                    {st}
                  </option>
                ))}
              </select>
              <select
                aria-label="Keyframe EasingDirection"
                value={selectedKf.easingDirection}
                onChange={(e) =>
                  onUpdateKeyframeEasing(
                    selectedKeyframeRef.partId,
                    selectedKeyframeRef.keyframeId,
                    selectedKf!.easingStyle,
                    e.target.value as RobloxEasingDirection,
                    selectedKf!.weight
                  )
                }
                className="bg-transparent text-[11px] text-slate-300 focus:outline-none cursor-pointer"
              >
                {ROBLOX_EASING_DIRECTIONS.map((dir) => (
                  <option key={dir} value={dir} className="bg-[#151821] text-slate-100">
                    {dir}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={0}
                max={1}
                step={0.05}
                aria-label="Keyframe Pose Weight"
                title="Pose.Weight (0..1)"
                value={selectedKf.weight ?? 1}
                onChange={(e) => {
                  const w = parseFloat(e.target.value);
                  if (Number.isFinite(w) && w >= 0 && w <= 1) {
                    onUpdateKeyframeEasing(
                      selectedKeyframeRef.partId,
                      selectedKeyframeRef.keyframeId,
                      selectedKf!.easingStyle,
                      selectedKf!.easingDirection,
                      w
                    );
                  }
                }}
                className="w-10 bg-transparent text-[11px] font-mono-tabular text-sky-300 focus:outline-none"
              />
              <button
                type="button"
                onClick={() =>
                  onDeleteKeyframe(selectedKeyframeRef.partId, selectedKeyframeRef.keyframeId)
                }
                className="p-0.5 text-slate-400 hover:text-red-400 cursor-pointer"
                aria-label="Delete selected keyframe"
                title="Delete Keyframe"
              >
                <Trash2 className="w-3 h-3" aria-hidden="true" />
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={onToggleAutoKey}
            aria-pressed={autoKey}
            className={`px-2 py-1 text-[11px] font-medium rounded border transition-colors cursor-pointer whitespace-nowrap ${
              autoKey
                ? 'bg-amber-500/15 text-amber-300 border-amber-500/40'
                : 'bg-[#0e1015] text-slate-400 border-white/10 hover:text-slate-200'
            }`}
          >
            Auto-Key
          </button>

          <button
            type="button"
            disabled={!activeClip}
            onClick={handleAddMarkerAtPlayhead}
            title="Add KeyframeMarker event at playhead"
            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium bg-amber-500/15 hover:bg-amber-500/25 disabled:opacity-40 border border-amber-500/40 text-amber-200 rounded transition-colors cursor-pointer whitespace-nowrap"
          >
            <Bookmark className="w-3 h-3" aria-hidden="true" />
            <span>+ Marker</span>
          </button>

          <button
            type="button"
            disabled={!selectedPartId || !activeClip}
            onClick={onAddKeyframeForSelected}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded transition-colors cursor-pointer whitespace-nowrap"
          >
            <KeyRound className="w-3 h-3" aria-hidden="true" />
            <span>+ Key</span>
          </button>
        </div>
      </div>

      {/* Optional Inline Marker Editor Strip when a Marker is selected */}
      {activeClip && selectedMarker && (
        <div className="px-2.5 py-1 bg-[#1b1610] border-b border-amber-500/30 flex flex-wrap items-center gap-2 text-[11px]">
          <span className="font-semibold text-amber-300 whitespace-nowrap">Marker:</span>
          <input
            type="text"
            aria-label="Marker Name"
            value={selectedMarker.name}
            onChange={(e) =>
              onUpsertMarker(activeClip.id, { ...selectedMarker, name: e.target.value })
            }
            placeholder="GetMarkerReachedSignal Name"
            className="w-28 px-1.5 py-0.5 bg-[#0e1015] border border-white/15 rounded text-slate-100"
          />
          <input
            type="text"
            aria-label="Marker Value"
            value={selectedMarker.value}
            onChange={(e) =>
              onUpsertMarker(activeClip.id, { ...selectedMarker, value: e.target.value })
            }
            placeholder="Param Value"
            className="w-24 px-1.5 py-0.5 bg-[#0e1015] border border-white/15 rounded text-slate-300"
          />
          <select
            aria-label="Marker FX Target"
            value={selectedMarker.effectId ?? ''}
            onChange={(e) =>
              onUpsertMarker(activeClip.id, {
                ...selectedMarker,
                effectId: e.target.value || undefined,
              })
            }
            className="px-1.5 py-0.5 bg-[#0e1015] border border-white/15 rounded text-slate-200 max-w-36"
          >
            <option value="">No FX Trigger</option>
            {allEffects.map((item) => (
              <option key={item.effect.id} value={item.effect.id}>
                FX: {item.effect.name}
              </option>
            ))}
          </select>
          {selectedMarker.effectId && (
            <>
              <select
                aria-label="Marker FX Action"
                value={selectedMarker.effectAction ?? 'emit'}
                onChange={(e) =>
                  onUpsertMarker(activeClip.id, {
                    ...selectedMarker,
                    effectAction: e.target.value as MarkerEffectAction,
                  })
                }
                className="px-1.5 py-0.5 bg-[#0e1015] border border-white/15 rounded text-amber-200"
              >
                {MARKER_ACTIONS.map((act) => (
                  <option key={act} value={act}>
                    {act}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={1}
                max={150}
                aria-label="Marker Burst Count"
                value={selectedMarker.burstCount ?? 20}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  if (Number.isFinite(v) && v >= 1) {
                    onUpsertMarker(activeClip.id, { ...selectedMarker, burstCount: v });
                  }
                }}
                className="w-12 px-1.5 py-0.5 bg-[#0e1015] border border-white/15 rounded font-mono-tabular text-slate-100"
                title="Burst particle count"
              />
            </>
          )}
          <select
            aria-label="Marker Sound Target"
            value={selectedMarker.soundId ?? ''}
            onChange={(e) =>
              onUpsertMarker(activeClip.id, {
                ...selectedMarker,
                soundId: e.target.value || undefined,
              })
            }
            className="px-1.5 py-0.5 bg-[#0e1015] border border-white/15 rounded text-cyan-200 max-w-36"
          >
            <option value="">No Sound Trigger</option>
            {allSounds.map((item) => (
              <option key={item.sound.id} value={item.sound.id}>
                SFX: {item.sound.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => {
              onDeleteMarker(activeClip.id, selectedMarker.id);
              setSelectedMarkerId(null);
            }}
            className="ml-auto inline-flex items-center gap-1 px-1.5 py-0.5 text-red-300 hover:text-red-200 cursor-pointer"
          >
            <Trash2 className="w-3 h-3" aria-hidden="true" />
            <span>Remove</span>
          </button>
        </div>
      )}

      {/* Dope Sheet: Sticky Ruler + Markers Lane + Part Tracks */}
      {!activeClip ? (
        <div className="flex-1 flex items-center justify-center text-xs text-slate-400 gap-3">
          <span>No animation clip in this model yet.</span>
          <button
            type="button"
            onClick={onCreateClip}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded font-medium cursor-pointer"
          >
            Create Animation Clip
          </button>
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto studio-scroll flex flex-col">
          {/* Sticky Ruler Header */}
          <div className="sticky top-0 z-10 flex bg-[#11141c] border-b border-white/10 h-6 shrink-0">
            <div className="w-36 sm:w-44 shrink-0 px-2.5 flex items-center text-[10px] font-semibold uppercase tracking-wider text-slate-400 border-r border-white/10">
              Part Tracks
            </div>
            <div
              ref={rulerRef}
              role="slider"
              aria-label="Animation Playhead Scrubber"
              aria-valuemin={0}
              aria-valuemax={duration}
              aria-valuenow={Number(clampedTime.toFixed(2))}
              tabIndex={0}
              onPointerDown={(e) => {
                draggingRef.current = true;
                (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                scrubFromClientX(e.clientX);
              }}
              onPointerMove={(e) => {
                if (draggingRef.current) scrubFromClientX(e.clientX);
              }}
              onPointerUp={() => {
                draggingRef.current = false;
              }}
              onPointerCancel={() => {
                draggingRef.current = false;
              }}
              className="flex-1 relative cursor-ew-resize mx-4"
            >
              {ticks.map((tick, idx) => {
                const pct = (tick / duration) * 100;
                const alignClass =
                  idx === 0
                    ? 'translate-x-0 items-start'
                    : idx === ticks.length - 1
                    ? '-translate-x-full items-end'
                    : '-translate-x-1/2 items-center';
                return (
                  <div
                    key={idx}
                    style={{ left: `${pct}%` }}
                    className={`absolute top-0 bottom-0 flex flex-col justify-end pointer-events-none ${alignClass}`}
                  >
                    <span className="text-[10px] font-mono-tabular text-slate-400 leading-none mb-0.5">
                      {tick.toFixed(1)}s
                    </span>
                    <div className="w-px h-1.5 bg-slate-500/60" />
                  </div>
                );
              })}

              <div
                style={{ left: `${playheadPct}%` }}
                className="absolute top-0 bottom-0 w-0.5 bg-blue-500 -translate-x-1/2 pointer-events-none"
              >
                <div className="w-2.5 h-2.5 bg-blue-500 rounded-xs rotate-45 -translate-x-[4px] -translate-y-0.5" />
              </div>
            </div>
          </div>

          {/* Dedicated KeyframeMarkers (Events) Track Row */}
          <div className="flex items-center h-7 bg-[#18140f] border-b border-amber-500/20 shrink-0">
            <div className="w-36 sm:w-44 shrink-0 h-full px-2.5 flex items-center gap-1.5 text-[11px] font-semibold text-amber-300 border-r border-white/10">
              <Bookmark className="w-3 h-3 shrink-0" aria-hidden="true" />
              <span className="truncate">Markers ({markers.length})</span>
            </div>
            <div
              className="flex-1 h-full relative mx-4 cursor-pointer"
              onClick={(e) => {
                setSelectedMarkerId(null);
                const el = rulerRef.current;
                if (el) {
                  const rect = el.getBoundingClientRect();
                  const frac = Math.max(
                    0,
                    Math.min(1, (e.clientX - rect.left) / Math.max(1, rect.width))
                  );
                  onScrubTime(Math.round(frac * duration * 100) / 100);
                }
              }}
            >
              <div className="absolute inset-x-0 top-1/2 h-px bg-amber-500/15 pointer-events-none" />
              <div
                style={{ left: `${playheadPct}%` }}
                className="absolute top-0 bottom-0 w-px bg-blue-500/70 pointer-events-none"
              />
              {markers.map((m) => {
                const pct = Math.max(0, Math.min(100, (m.time / duration) * 100));
                const isSel = selectedMarkerId === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedMarkerId(m.id);
                      onScrubTime(m.time);
                    }}
                    style={{ left: `${pct}%` }}
                    title={`${m.name} @ ${m.time.toFixed(2)}s (${m.value || 'Event'})`}
                    aria-label={`Marker ${m.name} at ${m.time.toFixed(2)}s`}
                    className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-1 group cursor-pointer z-10"
                  >
                    <span
                      className={`w-2.5 h-2.5 rotate-45 border transition-transform ${
                        isSel
                          ? 'bg-amber-300 border-white scale-125'
                          : 'bg-amber-500 border-slate-950 group-hover:scale-125'
                      }`}
                    />
                    <span
                      className={`text-[9px] font-medium px-1 rounded leading-tight whitespace-nowrap ${
                        isSel
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-[#0e1015]/90 text-amber-200 border border-amber-500/30'
                      }`}
                    >
                      {m.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Part Rows */}
          <div className="flex-1 relative">
            {orderedParts.map(({ part }) => {
              const isSelected = part.id === selectedPartId;
              const track = activeClip.tracks.find((t) => t.partId === part.id);
              const kfs = track?.keyframes ?? [];

              return (
                <div
                  key={part.id}
                  className={`flex items-center h-7 border-b border-white/5 ${
                    isSelected ? 'bg-blue-600/10' : 'hover:bg-white/[0.02]'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onSelectPart(part.id)}
                    className={`w-36 sm:w-44 shrink-0 h-full px-2.5 flex items-center gap-1.5 text-left text-[11px] border-r border-white/10 truncate cursor-pointer ${
                      isSelected ? 'text-white font-semibold' : 'text-slate-300'
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-xs shrink-0"
                      style={{ backgroundColor: part.color }}
                      aria-hidden="true"
                    />
                    <span className="truncate">{part.name}</span>
                  </button>

                  <div
                    className="flex-1 h-full relative mx-4 cursor-pointer"
                    onClick={(e) => {
                      onSelectPart(part.id);
                      const el = rulerRef.current;
                      if (el) {
                        const rect = el.getBoundingClientRect();
                        const frac = Math.max(
                          0,
                          Math.min(1, (e.clientX - rect.left) / Math.max(1, rect.width))
                        );
                        onScrubTime(Math.round(frac * duration * 100) / 100);
                      }
                    }}
                  >
                    <div className="absolute inset-x-0 top-1/2 h-px bg-white/5 pointer-events-none" />
                    <div
                      style={{ left: `${playheadPct}%` }}
                      className="absolute top-0 bottom-0 w-px bg-blue-500/70 pointer-events-none"
                    />

                    {kfs.map((kf) => {
                      const pct = Math.max(0, Math.min(100, (kf.time / duration) * 100));
                      const isKfSelected =
                        selectedKeyframeRef?.partId === part.id &&
                        selectedKeyframeRef?.keyframeId === kf.id;
                      return (
                        <button
                          key={kf.id}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectPart(part.id);
                            onSelectKeyframe({ partId: part.id, keyframeId: kf.id }, kf.time);
                          }}
                          style={{ left: `${pct}%` }}
                          aria-label={`${part.name} keyframe at ${kf.time.toFixed(2)}s (${kf.easingStyle})`}
                          title={`${kf.time.toFixed(2)}s · ${kf.easingStyle} ${kf.easingDirection} (Wt ${(kf.weight ?? 1).toFixed(2)})`}
                          className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rotate-45 border transition-transform cursor-pointer ${
                            isKfSelected
                              ? 'bg-sky-400 border-white scale-125 z-10'
                              : 'bg-amber-400 border-slate-900 hover:scale-125'
                          }`}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
