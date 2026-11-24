import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  ChevronDown,
  Code2,
  Download,
  Film,
  FolderKanban,
  GitBranch,
  Lightbulb,
  Map as MapIcon,
  MapPin,
  Sparkles,
} from 'lucide-react';
import { AnimationTimeline } from './components/AnimationTimeline';
import { ExplorerPanel } from './components/ExplorerPanel';
import { GitHubAuthMemoryState, GitHubSyncModal } from './components/GitHubSyncModal';
import { InspectorPanel } from './components/InspectorPanel';
import { MapBottomDock } from './components/MapBottomDock';
import { MapExplorerPanel } from './components/MapExplorerPanel';
import { MapInspectorPanel } from './components/MapInspectorPanel';
import { MapViewport } from './components/MapViewport';
import { RobloxExportModal } from './components/RobloxExportModal';
import { ScriptWorkshop } from './components/ScriptWorkshop';
import { StudioBottomBar } from './components/StudioBottomBar';
import { StudioViewport } from './components/StudioViewport';
import { WorkspaceManagerView } from './components/WorkspaceManagerView';
import {
  deleteKeyframe,
  deleteMarker,
  evaluateClipAtTime,
  evaluatePartPoseAtTime,
  EvaluatedPartPose,
  reparentPartPreservingWorld,
  upsertKeyframe,
  upsertMarker,
} from './engine/animationEngine';
import { validateMapForRoblox } from './engine/mapExporter';
import {
  MAP_PRESETS,
  TerrainGenStyle,
  createMapObjectFromCatalog,
  createStampedModelObject,
  generateProceduralTerrain,
  sampleTerrainHeight,
} from './engine/mapPresets';
import {
  MapEditorTool,
  MapObjectNode,
  MapPrefabKind,
  StudioMapScene,
  TerrainBiomeMaterial,
  TerrainBrushTool,
} from './engine/mapTypes';
import { MODEL_PRESETS, createNewPart } from './engine/presets';
import { validateModelForRoblox } from './engine/robloxExporter';
import {
  RobloxSandboxRunner,
  SandboxLogEntry,
  SandboxRuntimeUpdate,
} from './engine/robloxSandbox';
import {
  AnimationClip,
  AnimationEventMarker,
  CameraPreset,
  PartShape,
  RobloxEasingDirection,
  RobloxEasingStyle,
  StudioEffectNode,
  StudioPartNode,
  StudioSceneModel,
  StudioScriptNode,
  StudioWorkspaceMode,
  TransformMode,
} from './engine/robloxTypes';
import { getDefaultScriptsForModel } from './engine/scriptPresets';
import {
  addScriptToFolder,
  createFolder,
  createWorkspace,
  deleteFolder,
  deleteItemFromFolder,
  deleteWorkspace,
  getActiveFolder,
  getActiveWorkspace,
  loadWorkspaceRegistryFromStorage,
  moveItemBetweenFolders,
  renameFolder,
  renameItemInFolder,
  renameWorkspace,
  saveMapToFolder,
  saveModelToFolder,
  saveWorkspaceRegistryToStorage,
  selectWorkspace,
  updateScriptInFolder,
} from './engine/workspaceStore';
import { WorkspaceAssetKind, WorkspaceRegistryState } from './engine/workspaceTypes';

function cloneEffect(fx: StudioEffectNode): StudioEffectNode {
  if (fx.kind === 'ParticleEmitter') {
    return {
      ...fx,
      lifetime: [...fx.lifetime],
      speed: [...fx.speed],
      acceleration: [...fx.acceleration],
    };
  }
  return { ...fx };
}

function cloneModel(m: StudioSceneModel): StudioSceneModel {
  const resolvedScripts = m.scripts ?? getDefaultScriptsForModel(m);
  return {
    name: m.name,
    primaryPartId: m.primaryPartId,
    parts: m.parts.map((p) => ({
      ...p,
      pivotOffset: p.pivotOffset ? [...p.pivotOffset] : [0, 0, 0],
      position: [...p.position],
      rotation: [...p.rotation],
      size: [...p.size],
      attachments: p.attachments?.map((a) => ({
        ...a,
        position: [...a.position],
        rotation: [...a.rotation],
      })),
      effects: p.effects?.map(cloneEffect),
      sounds: p.sounds?.map((s) => ({ ...s })),
    })),
    animations: (m.animations ?? []).map((clip) => ({
      ...clip,
      markers: clip.markers?.map((mk) => ({ ...mk })),
      tracks: clip.tracks.map((tr) => ({
        partId: tr.partId,
        keyframes: tr.keyframes.map((kf) => ({
          ...kf,
          position: kf.position ? [...kf.position] : undefined,
          rotation: kf.rotation ? [...kf.rotation] : undefined,
          size: kf.size ? [...kf.size] : undefined,
        })),
      })),
    })),
    scripts: resolvedScripts.map((s) => ({ ...s })),
  };
}

export default function App() {
  const [model, setModel] = useState<StudioSceneModel>(() =>
    cloneModel(MODEL_PRESETS[0].model)
  );
  const [selectedPartId, setSelectedPartId] = useState<string | null>(
    MODEL_PRESETS[0].model.parts[0]?.id ?? null
  );
  const [workspaceMode, setWorkspaceMode] = useState<StudioWorkspaceMode>('model');
  const [transformMode, setTransformMode] = useState<TransformMode>('translate');
  const [studSnap, setStudSnap] = useState<number>(0.25);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [showAvatarRef, setShowAvatarRef] = useState<boolean>(true);
  const [showRigDebug, setShowRigDebug] = useState<boolean>(false);
  const [showEffects, setShowEffects] = useState<boolean>(true);
  const [showLights, setShowLights] = useState<boolean>(true);
  const [showAttachments, setShowAttachments] = useState<boolean>(false);
  const [burstTriggerSeq, setBurstTriggerSeq] = useState<{
    effectId: string;
    count: number;
    seq: number;
  } | null>(null);
  const [pulseTriggerSeq, setPulseTriggerSeq] = useState<{
    effectId: string;
    seq: number;
  } | null>(null);
  const [focusMode, setFocusMode] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth < 1024 : false
  );
  const [presetsOpen, setPresetsOpen] = useState<boolean>(false);
  const [exportOpen, setExportOpen] = useState<boolean>(false);
  const [githubSyncOpen, setGithubSyncOpen] = useState<boolean>(false);
  const [githubAuthState, setGithubAuthState] = useState<GitHubAuthMemoryState>({
    mode: 'pat',
    pat: '',
    sessionToken: null,
    user: null,
  });
  const [cameraPresetRequest, setCameraPresetRequest] = useState<{
    preset: CameraPreset;
    seq: number;
  } | null>(null);

  // Script Workshop & Live Sandbox State
  const [selectedScriptId, setSelectedScriptId] = useState<string | null>(() => {
    const list = model.scripts ?? [];
    const codeFirst = list.find(
      (s) => s.className === 'Script' || s.className === 'LocalScript' || s.className === 'ModuleScript'
    );
    return codeFirst?.id ?? list[0]?.id ?? null;
  });
  const [isScriptRunning, setIsScriptRunning] = useState<boolean>(false);
  const [scriptLogs, setScriptLogs] = useState<SandboxLogEntry[]>([]);
  const [runtimeUpdate, setRuntimeUpdate] = useState<SandboxRuntimeUpdate | null>(null);
  const sandboxRef = useRef<RobloxSandboxRunner | null>(null);

  // Animation Workspace State
  const [activeClipId, setActiveClipId] = useState<string | null>(
    MODEL_PRESETS[0].model.animations?.[0]?.id ?? null
  );
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [autoKey, setAutoKey] = useState<boolean>(true);
  const [selectedKeyframeRef, setSelectedKeyframeRef] = useState<{
    partId: string;
    keyframeId: string;
  } | null>(null);
  const [draftPoses, setDraftPoses] = useState<Record<string, Partial<EvaluatedPartPose>>>({});

  // Map Creator Workspace State
  const [mapScene, setMapScene] = useState<StudioMapScene>(() => MAP_PRESETS[0].build());
  const [selectedMapObjectId, setSelectedMapObjectId] = useState<string | null>(
    () => mapScene.objects[0]?.id ?? null
  );
  const [mapActiveTool, setMapActiveTool] = useState<MapEditorTool>('select');
  const [mapTransformMode, setMapTransformMode] = useState<TransformMode>('translate');
  const [mapBrushTool, setMapBrushTool] = useState<TerrainBrushTool>('raise');
  const [mapBrushRadius, setMapBrushRadius] = useState<number>(12);
  const [mapBrushStrength, setMapBrushStrength] = useState<number>(1.0);
  const [mapPaintMaterial, setMapPaintMaterial] = useState<TerrainBiomeMaterial>('Grass');
  const [mapPlaceKind, setMapPlaceKind] = useState<MapPrefabKind>('Checkpoint');
  const [mapStampSourceKey, setMapStampSourceKey] = useState<string>('active-studio-model');
  const [mapStudSnap, setMapStudSnap] = useState<number>(0.5);
  const [simulateMap, setSimulateMap] = useState<boolean>(false);
  const [mapCameraPresetRequest, setMapCameraPresetRequest] = useState<{
    preset: CameraPreset;
    seq: number;
  } | null>(null);

  // Custom Folders & Workspaces Registry State
  const [workspaceRegistry, setWorkspaceRegistry] = useState<WorkspaceRegistryState>(() =>
    loadWorkspaceRegistryFromStorage()
  );

  useEffect(() => {
    saveWorkspaceRegistryToStorage(workspaceRegistry);
  }, [workspaceRegistry]);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth < 1024) {
        setFocusMode(true);
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    return () => {
      sandboxRef.current?.stop(false);
      sandboxRef.current = null;
    };
  }, []);

  const clips = model.animations ?? [];
  const scripts = model.scripts ?? [];
  const activeClip = useMemo(
    () => clips.find((c) => c.id === activeClipId) ?? clips[0] ?? null,
    [clips, activeClipId]
  );

  // Refs for clean, nested-setState-free playback advancement
  const playbackRefs = useRef({ activeClip, playbackSpeed, currentTime });
  playbackRefs.current = { activeClip, playbackSpeed, currentTime };

  const selectedPart = useMemo(
    () => model.parts.find((p) => p.id === selectedPartId) ?? null,
    [model.parts, selectedPartId]
  );

  const animatedPartIds = useMemo(
    () => new Set(activeClip?.tracks.map((t) => t.partId) ?? []),
    [activeClip]
  );

  const activePoses = useMemo(() => {
    if (isScriptRunning && runtimeUpdate) {
      return runtimeUpdate.poses;
    }
    if (workspaceMode !== 'animate') return undefined;
    const base = evaluateClipAtTime(model, activeClip, currentTime);
    const merged: Record<string, EvaluatedPartPose> = {};
    for (const [pid, pose] of Object.entries(base)) {
      const draft = draftPoses[pid];
      merged[pid] = draft ? { ...pose, ...draft } : pose;
    }
    return merged;
  }, [isScriptRunning, runtimeUpdate, workspaceMode, model, activeClip, currentTime, draftPoses]);

  const validation = useMemo(() => validateModelForRoblox(model), [model]);

  const allEffects = useMemo(
    () =>
      model.parts.flatMap((p) =>
        (p.effects ?? []).map((effect) => ({ partName: p.name, effect }))
      ),
    [model.parts]
  );

  const allSounds = useMemo(
    () =>
      model.parts.flatMap((p) =>
        (p.sounds ?? []).map((sound) => ({ partName: p.name, sound }))
      ),
    [model.parts]
  );

  // Map Derived Data
  const mapValidation = useMemo(() => validateMapForRoblox(mapScene), [mapScene]);
  const selectedMapObject = useMemo(
    () => mapScene.objects.find((o) => o.id === selectedMapObjectId) ?? null,
    [mapScene.objects, selectedMapObjectId]
  );
  const stampSourceResolved = useMemo(() => {
    if (mapStampSourceKey === 'active-studio-model') {
      return { model, presetId: undefined };
    }
    const found = MODEL_PRESETS.find((p) => p.id === mapStampSourceKey);
    return { model: found?.model ?? model, presetId: found?.id };
  }, [mapStampSourceKey, model]);

  const activeWorkspace = useMemo(
    () => getActiveWorkspace(workspaceRegistry),
    [workspaceRegistry]
  );
  const activeFolder = useMemo(
    () => getActiveFolder(workspaceRegistry),
    [workspaceRegistry]
  );

  const handleUpdatePart = useCallback(
    (id: string, patch: Partial<StudioPartNode>) => {
      setModel((prev) => ({
        ...prev,
        parts: prev.parts.map((p) => (p.id === id ? { ...p, ...patch } : p)),
      }));
    },
    []
  );

  const handleReparentPart = useCallback((id: string, newParentId: string | null) => {
    setModel((prev) => ({
      ...prev,
      parts: reparentPartPreservingWorld(prev.parts, id, newParentId),
    }));
  }, []);

  const commitKeyframe = useCallback(
    (partId: string, posePatch?: Partial<EvaluatedPartPose>, atTime?: number) => {
      if (!activeClip) return;
      const targetPart = model.parts.find((p) => p.id === partId);
      if (!targetPart) return;

      const t = atTime ?? currentTime;
      const currentEval = evaluatePartPoseAtTime(targetPart, activeClip, t);
      const draft = draftPoses[partId];
      const merged: EvaluatedPartPose = {
        ...currentEval,
        ...draft,
        ...posePatch,
      };

      const nextClip = upsertKeyframe(activeClip, partId, {
        time: t,
        easingStyle: 'Sine',
        easingDirection: 'InOut',
        position: [...merged.position],
        rotation: [...merged.rotation],
        size: [...merged.size],
        color: merged.color,
        transparency: merged.transparency,
      });

      setModel((prev) => ({
        ...prev,
        animations: (prev.animations ?? []).map((c) => (c.id === nextClip.id ? nextClip : c)),
      }));

      // Select the newly created/updated keyframe
      const snapped = Math.max(0, Math.min(nextClip.duration, Math.round(t * 1000) / 1000));
      const tr = nextClip.tracks.find((x) => x.partId === partId);
      const kf = tr?.keyframes.find((k) => Math.abs(k.time - snapped) < 0.015);
      if (kf) {
        setSelectedKeyframeRef({ partId, keyframeId: kf.id });
      }
      setDraftPoses((prev) => {
        if (!prev[partId]) return prev;
        const copy = { ...prev };
        delete copy[partId];
        return copy;
      });
    },
    [activeClip, model.parts, currentTime, draftPoses]
  );

  const handleUpdatePose = useCallback(
    (partId: string, patch: Partial<EvaluatedPartPose>) => {
      if (autoKey && activeClip) {
        commitKeyframe(partId, patch, currentTime);
      } else {
        setDraftPoses((prev) => ({
          ...prev,
          [partId]: { ...(prev[partId] ?? {}), ...patch },
        }));
      }
    },
    [autoKey, activeClip, commitKeyframe, currentTime]
  );

  const handleViewportTransform = useCallback(
    (partId: string, patch: Partial<EvaluatedPartPose>) => {
      if (workspaceMode === 'animate') {
        handleUpdatePose(partId, patch);
      } else {
        handleUpdatePart(partId, {
          ...(patch.position ? { position: patch.position } : {}),
          ...(patch.rotation ? { rotation: patch.rotation } : {}),
          ...(patch.size ? { size: patch.size } : {}),
        });
      }
    },
    [workspaceMode, handleUpdatePose, handleUpdatePart]
  );

  const handleScrubTime = useCallback((nextTime: number) => {
    setIsPlaying(false);
    setDraftPoses({});
    setCurrentTime(nextTime);
  }, []);

  const handlePlaybackAdvance = useCallback((dtSec: number) => {
    const { activeClip: clip, playbackSpeed: speed, currentTime: t } = playbackRefs.current;
    if (!clip) return;
    const next = t + dtSec * speed;
    if (next >= clip.duration) {
      if (clip.loop) {
        setCurrentTime(next % clip.duration);
      } else {
        setCurrentTime(clip.duration);
        setIsPlaying(false);
      }
    } else {
      setCurrentTime(next);
    }
  }, []);

  const handleCreateClip = useCallback(() => {
    const nextIdx = (model.animations?.length ?? 0) + 1;
    const newClip: AnimationClip = {
      id: `clip_${Date.now().toString(36)}_${nextIdx}`,
      name: `Animation_${nextIdx}`,
      duration: 3.0,
      fps: 30,
      loop: true,
      tracks: [],
    };
    setModel((prev) => ({
      ...prev,
      animations: [...(prev.animations ?? []), newClip],
    }));
    setActiveClipId(newClip.id);
    setCurrentTime(0);
    setIsPlaying(false);
    setDraftPoses({});
    setSelectedKeyframeRef(null);
  }, [model.animations?.length]);

  const handleDeleteClip = useCallback(
    (clipId: string) => {
      const remaining = (model.animations ?? []).filter((c) => c.id !== clipId);
      setModel((prev) => ({
        ...prev,
        animations: remaining,
      }));
      setActiveClipId(remaining[0]?.id ?? null);
      setCurrentTime(0);
      setIsPlaying(false);
      setDraftPoses({});
      setSelectedKeyframeRef(null);
    },
    [model.animations]
  );

  const handleUpdateClipMeta = useCallback(
    (
      clipId: string,
      patch: Partial<
        Pick<
          AnimationClip,
          'name' | 'duration' | 'fps' | 'loop' | 'priority' | 'sampleMode' | 'fadeTime' | 'defaultWeight'
        >
      >
    ) => {
      setModel((prev) => ({
        ...prev,
        animations: (prev.animations ?? []).map((c) =>
          c.id === clipId ? { ...c, ...patch } : c
        ),
      }));
      if (patch.duration !== undefined) {
        setCurrentTime((t) => Math.min(t, patch.duration!));
      }
    },
    []
  );

  const handleUpdateKeyframeEasing = useCallback(
    (
      partId: string,
      keyframeId: string,
      easingStyle: RobloxEasingStyle,
      easingDirection: RobloxEasingDirection,
      weight?: number
    ) => {
      if (!activeClip) return;
      setModel((prev) => ({
        ...prev,
        animations: (prev.animations ?? []).map((clip) =>
          clip.id === activeClip.id
            ? {
                ...clip,
                tracks: clip.tracks.map((tr) =>
                  tr.partId === partId
                    ? {
                        ...tr,
                        keyframes: tr.keyframes.map((k) =>
                          k.id === keyframeId
                            ? {
                                ...k,
                                easingStyle,
                                easingDirection,
                                ...(weight !== undefined ? { weight } : {}),
                              }
                            : k
                        ),
                      }
                    : tr
                ),
              }
            : clip
        ),
      }));
    },
    [activeClip]
  );

  const handleUpsertMarker = useCallback(
    (
      clipId: string,
      marker: Omit<AnimationEventMarker, 'id'> & { id?: string }
    ): string | undefined => {
      const resolvedId = marker.id ?? `mkr_${Date.now().toString(36)}`;
      setModel((prev) => ({
        ...prev,
        animations: (prev.animations ?? []).map((c) =>
          c.id === clipId ? upsertMarker(c, { ...marker, id: resolvedId }) : c
        ),
      }));
      return resolvedId;
    },
    []
  );

  const handleDeleteMarker = useCallback((clipId: string, markerId: string) => {
    setModel((prev) => ({
      ...prev,
      animations: (prev.animations ?? []).map((c) =>
        c.id === clipId ? deleteMarker(c, markerId) : c
      ),
    }));
  }, []);

  const handleDeleteKeyframe = useCallback(
    (partId: string, keyframeId: string) => {
      if (!activeClip) return;
      const updated = deleteKeyframe(activeClip, partId, keyframeId);
      setModel((prev) => ({
        ...prev,
        animations: (prev.animations ?? []).map((c) => (c.id === updated.id ? updated : c)),
      }));
      setSelectedKeyframeRef((cur) =>
        cur?.partId === partId && cur?.keyframeId === keyframeId ? null : cur
      );
    },
    [activeClip]
  );

  const getUniqueEditorPartName = useCallback(
    (partsList: StudioPartNode[], baseName: string): string => {
      const usedLower = new Set(partsList.map((p) => p.name.trim().toLowerCase()));
      let candidate = baseName.trim() || 'Part';
      let suffix = 2;
      while (usedLower.has(candidate.toLowerCase())) {
        candidate = `${baseName.trim() || 'Part'}_${suffix++}`;
      }
      return candidate;
    },
    []
  );

  const handleAddShape = useCallback(
    (shape: PartShape) => {
      const rawPart = createNewPart(shape, model.parts.length);
      const nextPart: StudioPartNode = {
        ...rawPart,
        name: getUniqueEditorPartName(model.parts, rawPart.name),
      };
      setModel((prev) => ({
        ...prev,
        primaryPartId: prev.primaryPartId ?? nextPart.id,
        parts: [...prev.parts, nextPart],
      }));
      setSelectedPartId(nextPart.id);
    },
    [model.parts, getUniqueEditorPartName]
  );

  const handleDuplicatePart = useCallback(
    (id: string) => {
      const target = model.parts.find((p) => p.id === id);
      if (!target) return;
      const copy: StudioPartNode = {
        ...target,
        id: `part_${Date.now().toString(36)}_${model.parts.length}`,
        name: getUniqueEditorPartName(model.parts, `${target.name}_Copy`),
        pivotOffset: target.pivotOffset ? [...target.pivotOffset] : [0, 0, 0],
        position: [target.position[0] + 1, target.position[1], target.position[2] + 1],
        rotation: [...target.rotation],
        size: [...target.size],
        attachments: undefined,
        effects: undefined,
        sounds: undefined,
      };
      setModel((prev) => ({
        ...prev,
        parts: [...prev.parts, copy],
      }));
      setSelectedPartId(copy.id);
    },
    [model.parts, getUniqueEditorPartName]
  );

  const handleDeletePart = useCallback((id: string) => {
    setModel((prev) => {
      // Unparent direct children while keeping them in the scene cleanly
      const nextParts = prev.parts
        .filter((p) => p.id !== id)
        .map((p) => (p.parentId === id ? { ...p, parentId: null } : p));
      const nextPrimary =
        prev.primaryPartId === id ? nextParts[0]?.id ?? null : prev.primaryPartId;
      const nextAnims = (prev.animations ?? []).map((clip) => ({
        ...clip,
        tracks: clip.tracks.filter((tr) => tr.partId !== id),
      }));
      return {
        ...prev,
        primaryPartId: nextPrimary,
        parts: nextParts,
        animations: nextAnims,
      };
    });
    setSelectedPartId((cur) => (cur === id ? null : cur));
  }, []);

  const handleToggleVisibility = useCallback((id: string) => {
    setModel((prev) => ({
      ...prev,
      parts: prev.parts.map((p) => (p.id === id ? { ...p, visible: !p.visible } : p)),
    }));
  }, []);

  const stopSandbox = useCallback((logStop = true) => {
    if (sandboxRef.current) {
      sandboxRef.current.stop(logStop);
      sandboxRef.current = null;
    }
    setIsScriptRunning(false);
    setRuntimeUpdate(null);
  }, []);

  const handleAddScript = useCallback((node: Omit<StudioScriptNode, 'id'>) => {
    const id = `scr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    const nextNode: StudioScriptNode = { ...node, id };
    setModel((prev) => ({
      ...prev,
      scripts: [...(prev.scripts ?? []), nextNode],
    }));
    setSelectedScriptId(id);
  }, []);

  const handleUpdateScript = useCallback((id: string, patch: Partial<StudioScriptNode>) => {
    setModel((prev) => ({
      ...prev,
      scripts: (prev.scripts ?? []).map((s) => (s.id === id ? { ...s, ...patch } : s)),
    }));
  }, []);

  const handleDeleteScript = useCallback((id: string) => {
    setModel((prev) => {
      const remaining = (prev.scripts ?? []).filter((s) => s.id !== id);
      setSelectedScriptId((cur) => (cur === id ? remaining[0]?.id ?? null : cur));
      return {
        ...prev,
        scripts: remaining,
      };
    });
  }, []);

  const handleRunScripts = useCallback(() => {
    if (sandboxRef.current) {
      sandboxRef.current.stop(false);
      sandboxRef.current = null;
    }
    setIsPlaying(false);
    setDraftPoses({});
    setScriptLogs([]);

    const runner = new RobloxSandboxRunner(model, model.scripts ?? [], {
      onLog: (entry) => {
        setScriptLogs((prev) => {
          const next = [...prev, entry];
          return next.length > 250 ? next.slice(next.length - 250) : next;
        });
      },
      onRuntimeUpdate: (update) => {
        setRuntimeUpdate(update);
      },
      onEmitParticles: (effectId, count) => {
        setBurstTriggerSeq((prev) => ({
          effectId,
          count,
          seq: (prev?.seq ?? 0) + 1,
        }));
      },
      onPulseLight: (effectId) => {
        setPulseTriggerSeq((prev) => ({
          effectId,
          seq: (prev?.seq ?? 0) + 1,
        }));
      },
    });

    sandboxRef.current = runner;
    const ok = runner.start(true);
    setIsScriptRunning(ok);
  }, [model]);

  const handleStopScripts = useCallback(() => {
    stopSandbox(true);
  }, [stopSandbox]);

  const handleTriggerKey = useCallback((keyName: string) => {
    sandboxRef.current?.triggerKey(keyName);
  }, []);

  const handleFireEvent = useCallback((nodeId: string, arg?: string | number | boolean) => {
    sandboxRef.current?.fireEvent(nodeId, arg);
  }, []);

  const handleSetAttribute = useCallback((key: string, val: string | number | boolean) => {
    sandboxRef.current?.setModelAttribute(key, val);
  }, []);

  const handleLoadPreset = useCallback(
    (presetId: string) => {
      const found = MODEL_PRESETS.find((p) => p.id === presetId);
      if (!found) return;
      stopSandbox(false);
      const cloned = cloneModel(found.model);
      setModel(cloned);
      setSelectedPartId(cloned.parts[0]?.id ?? null);
      const firstCode = (cloned.scripts ?? []).find(
        (s) => s.className === 'Script' || s.className === 'LocalScript' || s.className === 'ModuleScript'
      );
      setSelectedScriptId(firstCode?.id ?? cloned.scripts?.[0]?.id ?? null);
      setActiveClipId(cloned.animations?.[0]?.id ?? null);
      setCurrentTime(0);
      setIsPlaying(false);
      setDraftPoses({});
      setScriptLogs([]);
      setSelectedKeyframeRef(null);
      setPresetsOpen(false);
      setCameraPresetRequest((prev) => ({
        preset: 'perspective',
        seq: (prev?.seq ?? 0) + 1,
      }));
    },
    [stopSandbox]
  );

  const handleClearScene = useCallback(() => {
    stopSandbox(false);
    const starter = createNewPart('Block', 0);
    starter.name = 'BasePart';
    starter.size = [4, 1, 4];
    starter.position = [0, 0.5, 0];
    const starterClip: AnimationClip = {
      id: `clip_${Date.now().toString(36)}`,
      name: 'Idle',
      duration: 2.0,
      fps: 30,
      loop: true,
      tracks: [],
    };
    const baseScene: StudioSceneModel = {
      name: 'CustomModel',
      primaryPartId: starter.id,
      parts: [starter],
      animations: [starterClip],
    };
    const defaultScripts = getDefaultScriptsForModel(baseScene);
    setModel({
      ...baseScene,
      scripts: defaultScripts,
    });
    setSelectedPartId(starter.id);
    const firstDefaultCode = defaultScripts.find(
      (s) => s.className === 'Script' || s.className === 'LocalScript' || s.className === 'ModuleScript'
    );
    setSelectedScriptId(firstDefaultCode?.id ?? defaultScripts[0]?.id ?? null);
    setActiveClipId(starterClip.id);
    setCurrentTime(0);
    setIsPlaying(false);
    setDraftPoses({});
    setScriptLogs([]);
    setSelectedKeyframeRef(null);
  }, [stopSandbox]);

  const handleSwitchWorkspaceMode = useCallback(
    (mode: StudioWorkspaceMode) => {
      setWorkspaceMode(mode);
      if (mode !== 'map') {
        setSimulateMap(false);
      }
      if (mode === 'model') {
        setIsPlaying(false);
        setDraftPoses({});
      } else if (mode === 'animate') {
        stopSandbox(false);
      } else if (mode === 'scripts') {
        setIsPlaying(false);
        setDraftPoses({});
      } else if (mode === 'map' || mode === 'workspace') {
        setIsPlaying(false);
        setDraftPoses({});
        stopSandbox(false);
      }
    },
    [stopSandbox]
  );

  // Workspace & Custom Folder Handlers
  const handleSelectWorkspace = useCallback((workspaceId: string) => {
    setWorkspaceRegistry((prev) => selectWorkspace(prev, workspaceId));
  }, []);

  const handleCreateWorkspace = useCallback((name: string) => {
    setWorkspaceRegistry((prev) => createWorkspace(prev, name));
  }, []);

  const handleRenameWorkspace = useCallback((workspaceId: string, name: string) => {
    setWorkspaceRegistry((prev) => renameWorkspace(prev, workspaceId, name));
  }, []);

  const handleDeleteWorkspace = useCallback((workspaceId: string) => {
    setWorkspaceRegistry((prev) => deleteWorkspace(prev, workspaceId));
  }, []);

  const handleSelectFolder = useCallback((folderId: string | null) => {
    setWorkspaceRegistry((prev) => ({ ...prev, activeFolderId: folderId }));
  }, []);

  const handleCreateFolder = useCallback(
    (name: string, parentFolderId: string | null = null, color?: string) => {
      setWorkspaceRegistry((prev) =>
        createFolder(prev, activeWorkspace.id, name, parentFolderId, color)
      );
    },
    [activeWorkspace.id]
  );

  const handleRenameFolder = useCallback(
    (folderId: string, name: string) => {
      setWorkspaceRegistry((prev) => renameFolder(prev, activeWorkspace.id, folderId, name));
    },
    [activeWorkspace.id]
  );

  const handleDeleteFolder = useCallback(
    (folderId: string) => {
      setWorkspaceRegistry((prev) => deleteFolder(prev, activeWorkspace.id, folderId));
    },
    [activeWorkspace.id]
  );

  const handleSaveActiveModelToFolder = useCallback(
    (folderId: string) => {
      setWorkspaceRegistry(
        (prev) => saveModelToFolder(prev, activeWorkspace.id, folderId, model).nextState
      );
    },
    [activeWorkspace.id, model]
  );

  const handleSaveActiveMapToFolder = useCallback(
    (folderId: string) => {
      setWorkspaceRegistry(
        (prev) => saveMapToFolder(prev, activeWorkspace.id, folderId, mapScene).nextState
      );
    },
    [activeWorkspace.id, mapScene]
  );

  const handleAddScriptToFolder = useCallback(
    (folderId: string, node: Omit<StudioScriptNode, 'id'>): string => {
      const { nextState, savedScriptId } = addScriptToFolder(
        workspaceRegistry,
        activeWorkspace.id,
        folderId,
        node
      );
      setWorkspaceRegistry(nextState);
      return savedScriptId;
    },
    [workspaceRegistry, activeWorkspace.id]
  );

  const handleUpdateScriptInFolder = useCallback(
    (folderId: string, scriptId: string, patch: Partial<StudioScriptNode>) => {
      setWorkspaceRegistry((prev) =>
        updateScriptInFolder(prev, activeWorkspace.id, folderId, scriptId, patch)
      );
    },
    [activeWorkspace.id]
  );

  const handleRenameItemInFolder = useCallback(
    (folderId: string, kind: WorkspaceAssetKind, itemId: string, name: string) => {
      setWorkspaceRegistry((prev) =>
        renameItemInFolder(prev, activeWorkspace.id, folderId, kind, itemId, name)
      );
    },
    [activeWorkspace.id]
  );

  const handleDeleteItemFromFolder = useCallback(
    (folderId: string, kind: WorkspaceAssetKind, itemId: string) => {
      setWorkspaceRegistry((prev) =>
        deleteItemFromFolder(prev, activeWorkspace.id, folderId, kind, itemId)
      );
    },
    [activeWorkspace.id]
  );

  const handleMoveItemBetweenFolders = useCallback(
    (fromFolderId: string, toFolderId: string, kind: WorkspaceAssetKind, itemId: string) => {
      setWorkspaceRegistry((prev) =>
        moveItemBetweenFolders(
          prev,
          activeWorkspace.id,
          fromFolderId,
          toFolderId,
          kind,
          itemId
        )
      );
    },
    [activeWorkspace.id]
  );

  const handleOpenWorkspaceModel = useCallback(
    (nextModel: StudioSceneModel) => {
      stopSandbox(false);
      const cloned = cloneModel(nextModel);
      setModel(cloned);
      setSelectedPartId(cloned.primaryPartId ?? cloned.parts[0]?.id ?? null);
      const firstCode = (cloned.scripts ?? []).find(
        (s) =>
          s.className === 'Script' ||
          s.className === 'LocalScript' ||
          s.className === 'ModuleScript'
      );
      setSelectedScriptId(firstCode?.id ?? cloned.scripts?.[0]?.id ?? null);
      setActiveClipId(cloned.animations?.[0]?.id ?? null);
      setCurrentTime(0);
      setIsPlaying(false);
      setDraftPoses({});
      setScriptLogs([]);
      setSelectedKeyframeRef(null);
      setWorkspaceMode('model');
      setCameraPresetRequest((prev) => ({
        preset: 'perspective',
        seq: (prev?.seq ?? 0) + 1,
      }));
    },
    [stopSandbox]
  );

  const handleStampWorkspaceModel = useCallback((nextModel: StudioSceneModel) => {
    setMapScene((prev) => {
      const count = prev.objects.filter((o) => o.kind === 'StampedModel').length;
      const x = (count % 4) * 14 - 21;
      const z = Math.floor(count / 4) * 14 - 14;
      const y = sampleTerrainHeight(
        prev.heights,
        prev.gridResolution,
        prev.cellSizeStuds,
        x,
        z
      );
      const stamped = createStampedModelObject(nextModel, [x, y, z], prev.objects.length);
      setSelectedMapObjectId(stamped.id);
      return {
        ...prev,
        objects: [...prev.objects, stamped],
      };
    });
    setMapActiveTool('select');
    setWorkspaceMode('map');
  }, []);

  const handleOpenWorkspaceMap = useCallback((nextMap: StudioMapScene) => {
    const cloned = JSON.parse(JSON.stringify(nextMap)) as StudioMapScene;
    setMapScene(cloned);
    setSelectedMapObjectId(cloned.objects[0]?.id ?? null);
    setSimulateMap(false);
    setWorkspaceMode('map');
    setMapCameraPresetRequest((prev) => ({
      preset: 'perspective',
      seq: (prev?.seq ?? 0) + 1,
    }));
  }, []);

  const handleSendWorkspaceScriptToModel = useCallback((scr: StudioScriptNode) => {
    const clonedScr: StudioScriptNode = {
      ...scr,
      id: `scr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    };
    setModel((prev) => ({
      ...prev,
      scripts: [...(prev.scripts ?? []), clonedScr],
    }));
    setSelectedScriptId(clonedScr.id);
  }, []);

  // Map Creator Handlers
  const handleLoadMapPreset = useCallback((presetId: string) => {
    const preset = MAP_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    const built = preset.build();
    setMapScene(built);
    setSelectedMapObjectId(built.objects[0]?.id ?? null);
    setSimulateMap(false);
    setMapCameraPresetRequest((prev) => ({
      preset: 'perspective',
      seq: (prev?.seq ?? 0) + 1,
    }));
  }, []);

  const handleCommitTerrain = useCallback(
    (heights: number[], materials: TerrainBiomeMaterial[]) => {
      setMapScene((prev) => ({ ...prev, heights, materials }));
    },
    []
  );

  const handlePlaceMapObject = useCallback(
    (worldPos: [number, number, number]) => {
      setMapScene((prev) => {
        const obj =
          mapActiveTool === 'stamp'
            ? createStampedModelObject(
                stampSourceResolved.model,
                worldPos,
                prev.objects.length,
                stampSourceResolved.presetId
              )
            : createMapObjectFromCatalog(mapPlaceKind, worldPos, prev.objects.length);
        setSelectedMapObjectId(obj.id);
        return {
          ...prev,
          objects: [...prev.objects, obj],
        };
      });
    },
    [mapActiveTool, mapPlaceKind, stampSourceResolved]
  );

  const handleUpdateMapObject = useCallback(
    (id: string, patch: Partial<MapObjectNode>) => {
      setMapScene((prev) => ({
        ...prev,
        objects: prev.objects.map((o) => (o.id === id ? { ...o, ...patch } : o)),
      }));
    },
    []
  );

  const handleUpdateMap = useCallback((patch: Partial<StudioMapScene>) => {
    setMapScene((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleToggleMapObjectVisibility = useCallback((id: string) => {
    setMapScene((prev) => ({
      ...prev,
      objects: prev.objects.map((o) => (o.id === id ? { ...o, visible: !o.visible } : o)),
    }));
  }, []);

  const handleDuplicateMapObject = useCallback((id: string) => {
    setMapScene((prev) => {
      const target = prev.objects.find((o) => o.id === id);
      if (!target) return prev;
      const copy: MapObjectNode = {
        ...target,
        id: `mobj_${Date.now().toString(36)}_${prev.objects.length}`,
        name: `${target.name}_Copy`,
        position: [target.position[0] + 4, target.position[1], target.position[2] + 4],
        rotation: [...target.rotation],
        scale: [...target.scale],
      };
      setSelectedMapObjectId(copy.id);
      return {
        ...prev,
        objects: [...prev.objects, copy],
      };
    });
  }, []);

  const handleDeleteMapObject = useCallback((id: string) => {
    setMapScene((prev) => ({
      ...prev,
      objects: prev.objects.filter((o) => o.id !== id),
    }));
    setSelectedMapObjectId((cur) => (cur === id ? null : cur));
  }, []);

  const handleSnapObjectToGround = useCallback((id: string) => {
    setMapScene((prev) => {
      const target = prev.objects.find((o) => o.id === id);
      if (!target) return prev;
      const groundY = sampleTerrainHeight(
        prev.heights,
        prev.gridResolution,
        prev.cellSizeStuds,
        target.position[0],
        target.position[2]
      );
      const lift =
        target.kind === 'StampedModel'
          ? 0
          : Math.max(0.5, target.scale[1] * 0.5);
      return {
        ...prev,
        objects: prev.objects.map((o) =>
          o.id === id
            ? {
                ...o,
                position: [
                  o.position[0],
                  Math.round((groundY + lift) * 100) / 100,
                  o.position[2],
                ],
              }
            : o
        ),
      };
    });
  }, []);

  const handleRegenerateTerrain = useCallback((style: TerrainGenStyle, seed: number) => {
    setMapScene((prev) => {
      const { heights, materials } = generateProceduralTerrain(
        prev.gridResolution,
        prev.cellSizeStuds,
        style,
        seed
      );
      return {
        ...prev,
        heights,
        materials,
      };
    });
  }, []);

  const handleSelectStage = useCallback(
    (clipId: string) => {
      stopSandbox(false);
      setWorkspaceMode('animate');
      setActiveClipId(clipId);
      setCurrentTime(0);
      setDraftPoses({});
      setSelectedKeyframeRef(null);
      setIsPlaying(true);
    },
    [stopSandbox]
  );

  // Studio keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;

      if (workspaceMode === 'map') {
        if (e.key === 'v' || e.key === 'V') {
          setMapActiveTool('select');
          setMapTransformMode('select');
        } else if (e.key === 'g' || e.key === 'G') {
          setMapActiveTool('select');
          setMapTransformMode('translate');
        } else if (e.key === 'r' || e.key === 'R') {
          setMapActiveTool('select');
          setMapTransformMode('rotate');
        } else if (e.key === 's' || e.key === 'S') {
          setMapActiveTool('select');
          setMapTransformMode('scale');
        } else if (e.key === 'h' || e.key === 'H') {
          setFocusMode((v) => !v);
        } else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedMapObjectId) {
          handleDeleteMapObject(selectedMapObjectId);
        } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'd' && selectedMapObjectId) {
          e.preventDefault();
          handleDuplicateMapObject(selectedMapObjectId);
        }
        return;
      }

      if (e.key === 'v' || e.key === 'V') setTransformMode('select');
      else if (e.key === 'g' || e.key === 'G') setTransformMode('translate');
      else if (e.key === 'r' || e.key === 'R') setTransformMode('rotate');
      else if (e.key === 's' || e.key === 'S') setTransformMode('scale');
      else if (e.key === 'h' || e.key === 'H') setFocusMode((v) => !v);
      else if (e.key === 'b' || e.key === 'B') setShowRigDebug((v) => !v);
      else if (e.code === 'Space' && workspaceMode === 'animate' && activeClip) {
        e.preventDefault();
        setIsPlaying((v) => !v);
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedPartId) {
        handleDeletePart(selectedPartId);
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'd' && selectedPartId) {
        e.preventDefault();
        handleDuplicatePart(selectedPartId);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    selectedPartId,
    selectedMapObjectId,
    workspaceMode,
    activeClip,
    handleDeletePart,
    handleDuplicatePart,
    handleDeleteMapObject,
    handleDuplicateMapObject,
  ]);

  return (
    <div className="h-screen w-screen flex flex-col bg-[#0e1015] text-slate-100 overflow-hidden">
      {/* Top Bar: 3 Zones separated by gap-8 on desktop */}
      <header className="h-12 shrink-0 px-3 sm:px-4 border-b border-white/10 bg-[#151821] flex items-center justify-between gap-2 sm:gap-8 z-20">
        {/* Zone 1: Single text element wordmark */}
        <span className="text-sm font-bold tracking-tight text-white whitespace-nowrap shrink-0">
          StudForge 3D
        </span>

        {/* Zone 2: Concise single-line workspace links/toggles */}
        <nav className="flex items-center gap-3 sm:gap-5 text-xs font-medium text-slate-300">
          <div className="relative">
            <button
              type="button"
              onClick={() => setPresetsOpen((v) => !v)}
              aria-expanded={presetsOpen}
              className="inline-flex items-center gap-1 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer py-1"
            >
              <span>Presets</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
            </button>
            {presetsOpen && (
              <div className="absolute top-full left-0 mt-2 w-72 max-h-[75vh] overflow-y-auto studio-scroll bg-[#1a1e29] border border-white/15 rounded-lg shadow-2xl p-1.5 z-40 space-y-1">
                {MODEL_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleLoadPreset(preset.id)}
                    className="w-full text-left px-3 py-2 rounded-md hover:bg-blue-600/20 transition-colors cursor-pointer"
                  >
                    <div className="text-xs font-semibold text-white">{preset.label}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">
                      {preset.description}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowGrid((v) => !v)}
            aria-pressed={showGrid}
            className={`hidden sm:inline-block hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer py-1 ${
              showGrid ? 'text-white underline underline-offset-4 decoration-blue-500' : ''
            }`}
          >
            Stud Grid
          </button>

          <button
            type="button"
            onClick={() => setShowAvatarRef((v) => !v)}
            aria-pressed={showAvatarRef}
            className={`hidden sm:inline-block hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer py-1 ${
              showAvatarRef ? 'text-white underline underline-offset-4 decoration-blue-500' : ''
            }`}
          >
            R15 Scale
          </button>

          <button
            type="button"
            onClick={() => setFocusMode((v) => !v)}
            aria-pressed={focusMode}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer py-1 ${
              focusMode ? 'text-white underline underline-offset-4 decoration-blue-500' : ''
            }`}
          >
            {focusMode ? 'Panels' : 'Focus'}
          </button>

          <button
            type="button"
            onClick={handleClearScene}
            className="hidden md:inline-block hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer py-1"
          >
            New Blank
          </button>

          <button
            type="button"
            onClick={() => setGithubSyncOpen(true)}
            className="hover:text-white text-blue-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer py-1"
          >
            GitHub Sync
          </button>

          <button
            type="button"
            onClick={() => handleSwitchWorkspaceMode('workspace')}
            aria-pressed={workspaceMode === 'workspace'}
            className={`hidden lg:inline-flex items-center gap-1.5 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer py-1 ${
              workspaceMode === 'workspace'
                ? 'text-violet-300 underline underline-offset-4 decoration-violet-400'
                : 'text-slate-300'
            }`}
          >
            <FolderKanban className="w-3.5 h-3.5 text-violet-400" aria-hidden="true" />
            <span>
              {activeFolder ? `${activeWorkspace.name} / ${activeFolder.name}` : activeWorkspace.name}
            </span>
          </button>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="shrink-0">
          <button
            type="button"
            onClick={() => setExportOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
            <span className="sm:hidden">Export</span>
            <span className="hidden sm:inline">
              {workspaceMode === 'workspace'
                ? 'Export Workspace'
                : workspaceMode === 'map'
                ? 'Export Map (.rbxlx)'
                : 'Export Roblox'}
            </span>
          </button>
        </div>
      </header>

      {/* Main Docked Studio Workspace */}
      <main className="flex-1 min-h-0 flex overflow-hidden">
        {!focusMode &&
          workspaceMode !== 'workspace' &&
          (workspaceMode === 'map' ? (
            <MapExplorerPanel
              map={mapScene}
              selectedObjectId={selectedMapObjectId}
              onRenameMap={(name) => setMapScene((prev) => ({ ...prev, name }))}
              onLoadMapPreset={handleLoadMapPreset}
              onSelectObject={setSelectedMapObjectId}
              onToggleVisibility={handleToggleMapObjectVisibility}
              onDuplicateObject={handleDuplicateMapObject}
              onDeleteObject={handleDeleteMapObject}
            />
          ) : (
            <ExplorerPanel
              modelName={model.name}
              parts={model.parts}
              selectedPartId={selectedPartId}
              primaryPartId={model.primaryPartId}
              totalTriangles={validation.totalTriangles}
              animatedPartIds={animatedPartIds}
              onRenameModel={(name) => setModel((prev) => ({ ...prev, name }))}
              onSelectPart={(id) => setSelectedPartId(id)}
              onToggleVisibility={handleToggleVisibility}
              onDuplicatePart={handleDuplicatePart}
              onDeletePart={handleDeletePart}
              onAddDefaultPart={() => handleAddShape('Block')}
            />
          ))}

        {/* Center 3D Viewport / Workspace Manager + Mode Tab Strip + Bottom Dock */}
        <div className="flex-1 min-w-0 h-full flex flex-col">
          <div className="flex-1 min-h-0 relative flex flex-col">
            {workspaceMode === 'workspace' ? (
              <WorkspaceManagerView
                registry={workspaceRegistry}
                activeStudioModel={model}
                activeMapScene={mapScene}
                onSelectWorkspace={handleSelectWorkspace}
                onCreateWorkspace={handleCreateWorkspace}
                onRenameWorkspace={handleRenameWorkspace}
                onDeleteWorkspace={handleDeleteWorkspace}
                onSelectFolder={handleSelectFolder}
                onCreateFolder={handleCreateFolder}
                onRenameFolder={handleRenameFolder}
                onDeleteFolder={handleDeleteFolder}
                onSaveActiveModelToFolder={handleSaveActiveModelToFolder}
                onSaveActiveMapToFolder={handleSaveActiveMapToFolder}
                onAddScriptToFolder={handleAddScriptToFolder}
                onUpdateScriptInFolder={handleUpdateScriptInFolder}
                onRenameItemInFolder={handleRenameItemInFolder}
                onDeleteItemFromFolder={handleDeleteItemFromFolder}
                onMoveItemBetweenFolders={handleMoveItemBetweenFolders}
                onOpenModelInStudio={handleOpenWorkspaceModel}
                onStampModelOnMap={handleStampWorkspaceModel}
                onOpenMapInStudio={handleOpenWorkspaceMap}
                onSendScriptToModel={handleSendWorkspaceScriptToModel}
                onExportWorkspace={() => setExportOpen(true)}
                onSyncWorkspaceGitHub={() => setGithubSyncOpen(true)}
              />
            ) : workspaceMode === 'map' ? (
              <MapViewport
                map={mapScene}
                activeTool={mapActiveTool}
                transformMode={mapTransformMode}
                brushTool={mapBrushTool}
                brushRadius={mapBrushRadius}
                brushStrength={mapBrushStrength}
                paintMaterial={mapPaintMaterial}
                activePlaceKind={mapPlaceKind}
                stampSourceModel={stampSourceResolved.model}
                stampPresetId={stampSourceResolved.presetId}
                selectedObjectId={selectedMapObjectId}
                studSnap={mapStudSnap}
                showGrid={showGrid}
                simulateMap={simulateMap}
                cameraPresetRequest={mapCameraPresetRequest}
                onSelectObject={setSelectedMapObjectId}
                onCommitTerrain={handleCommitTerrain}
                onPlaceObject={handlePlaceMapObject}
                onUpdateObjectTransform={handleUpdateMapObject}
              />
            ) : (
              <StudioViewport
                parts={model.parts}
                selectedPartId={selectedPartId}
                transformMode={transformMode}
                studSnap={studSnap}
                showGrid={showGrid}
                showAvatarRef={showAvatarRef}
                showRigDebug={showRigDebug}
                showEffects={showEffects}
                showLights={showLights}
                showAttachments={showAttachments}
                workspaceMode={workspaceMode}
                activeClip={activeClip}
                currentTime={currentTime}
                activePoses={activePoses}
                isPlaying={isPlaying && workspaceMode === 'animate'}
                isScriptRunning={isScriptRunning}
                runtimeEffectStates={runtimeUpdate?.effectStates}
                runtimeLightUpdates={runtimeUpdate?.lightUpdates}
                cameraPresetRequest={cameraPresetRequest}
                burstTriggerSeq={burstTriggerSeq}
                pulseTriggerSeq={pulseTriggerSeq}
                onSelectPart={setSelectedPartId}
                onUpdatePartTransform={handleViewportTransform}
                onPlaybackAdvance={handlePlaybackAdvance}
              />
            )}
          </div>

          {/* Dedicated Workspace Mode Strip replacing bottom dock between Model, Animate, Scripts & Map */}
          <div className="h-8 shrink-0 bg-[#11141c] border-t border-white/10 px-2.5 flex items-center justify-between gap-2 text-xs z-20">
            <div
              role="tablist"
              aria-label="Studio Workspace Mode"
              className="flex items-center gap-1"
            >
              <button
                type="button"
                role="tab"
                aria-selected={workspaceMode === 'model'}
                onClick={() => handleSwitchWorkspaceMode('model')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  workspaceMode === 'model'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'
                }`}
              >
                <Box className="w-3 h-3" aria-hidden="true" />
                <span>Model</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={workspaceMode === 'animate'}
                onClick={() => handleSwitchWorkspaceMode('animate')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  workspaceMode === 'animate'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'
                }`}
              >
                <Film className="w-3 h-3" aria-hidden="true" />
                <span>Animate</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={workspaceMode === 'scripts'}
                onClick={() => handleSwitchWorkspaceMode('scripts')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  workspaceMode === 'scripts'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'
                }`}
              >
                <Code2 className="w-3 h-3" aria-hidden="true" />
                <span>Scripts</span>
                {isScriptRunning && (
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-emerald-400"
                    title="Luau Sandbox Running"
                  />
                )}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={workspaceMode === 'map'}
                onClick={() => handleSwitchWorkspaceMode('map')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  workspaceMode === 'map'
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'
                }`}
              >
                <MapIcon className="w-3 h-3" aria-hidden="true" />
                <span>Map</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={workspaceMode === 'workspace'}
                onClick={() => handleSwitchWorkspaceMode('workspace')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  workspaceMode === 'workspace'
                    ? 'bg-violet-600 text-white'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'
                }`}
              >
                <FolderKanban className="w-3 h-3" aria-hidden="true" />
                <span>Workspace</span>
              </button>

              {workspaceMode !== 'map' && workspaceMode !== 'workspace' && clips.length > 1 && (
                <div
                  role="group"
                  aria-label="Animation Stages"
                  className="hidden md:flex items-center gap-0.5 ml-2 pl-2 border-l border-white/10"
                >
                  {clips.map((clip) => {
                    const isStageActive =
                      workspaceMode === 'animate' && activeClip?.id === clip.id;
                    return (
                      <button
                        key={clip.id}
                        type="button"
                        onClick={() => handleSelectStage(clip.id)}
                        aria-pressed={isStageActive}
                        className={`px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                          isStageActive
                            ? 'bg-emerald-600/25 text-emerald-200 border border-emerald-400/50'
                            : 'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent'
                        }`}
                      >
                        {clip.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-[11px] text-slate-400 font-mono-tabular truncate hidden xl:inline mr-1">
                {workspaceMode === 'workspace'
                  ? `${activeWorkspace.name} · ${activeWorkspace.folders.length} folders${activeFolder ? ` · ${activeFolder.name}` : ''}`
                  : workspaceMode === 'map'
                  ? `${mapScene.name} · ${mapValidation.terrainMergedParts} chunks · ${mapValidation.objectCount} objects · ${mapValidation.scriptCount} scripts`
                  : workspaceMode === 'model'
                  ? `Rest Rig · ${validation.jointCount} Motor6D · ${validation.effectCount} FX`
                  : workspaceMode === 'scripts'
                  ? isScriptRunning
                    ? `Luau Sandbox Running · ${runtimeUpdate?.activeStageName ?? 'Idle'}`
                    : `${scripts.length} Roblox Scripts · ${validation.effectCount} FX`
                  : activeClip
                  ? `${activeClip.name} · ${activeClip.priority ?? 'Action'} · ${activeClip.markers?.length ?? 0} markers`
                  : 'No clip selected'}
              </span>
              {workspaceMode !== 'map' && workspaceMode !== 'workspace' && (
                <>
                  <button
                    type="button"
                    onClick={() => setShowEffects((v) => !v)}
                    aria-pressed={showEffects}
                    title="Toggle Particle & Trail FX Preview"
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      showEffects
                        ? 'bg-emerald-500/15 border-emerald-400/50 text-emerald-200'
                        : 'bg-white/[0.03] border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Sparkles className="w-3 h-3" aria-hidden="true" />
                    <span>FX</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowLights((v) => !v)}
                    aria-pressed={showLights}
                    title="Toggle PointLight Preview"
                    className={`hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      showLights
                        ? 'bg-yellow-500/15 border-yellow-400/50 text-yellow-200'
                        : 'bg-white/[0.03] border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Lightbulb className="w-3 h-3" aria-hidden="true" />
                    <span>Lights</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAttachments((v) => !v)}
                    aria-pressed={showAttachments}
                    title="Toggle Attachment Helper Gizmos"
                    className={`hidden md:inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      showAttachments
                        ? 'bg-emerald-500/20 border-emerald-400/60 text-emerald-200'
                        : 'bg-white/[0.03] border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    <MapPin className="w-3 h-3" aria-hidden="true" />
                    <span>Atts</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowRigDebug((v) => !v)}
                    aria-pressed={showRigDebug}
                    title="Toggle Motor6D Rig Debug Overlay (B)"
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      showRigDebug
                        ? 'bg-amber-500/20 border-amber-400/60 text-amber-200'
                        : 'bg-white/[0.03] border-white/10 text-slate-300 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <GitBranch className="w-3 h-3" aria-hidden="true" />
                    <span className="sm:hidden">Rig</span>
                    <span className="hidden sm:inline">Rig Debug</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {workspaceMode !== 'map' && workspaceMode !== 'workspace' && clips.length > 1 && (
            <div
              role="group"
              aria-label="Mobile Animation Stages"
              className="md:hidden h-8 shrink-0 bg-[#0e1015] border-t border-white/10 px-2.5 flex items-center gap-1 overflow-x-auto studio-scroll z-20"
            >
              <span className="text-[10px] font-semibold text-slate-400 mr-1 whitespace-nowrap shrink-0">
                Stages
              </span>
              {clips.map((clip) => {
                const isStageActive =
                  workspaceMode === 'animate' && activeClip?.id === clip.id;
                return (
                  <button
                    key={clip.id}
                    type="button"
                    onClick={() => handleSelectStage(clip.id)}
                    aria-pressed={isStageActive}
                    className={`px-2.5 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      isStageActive
                        ? 'bg-emerald-600/25 text-emerald-200 border border-emerald-400/50'
                        : 'bg-white/[0.04] text-slate-300 hover:text-white border border-white/10'
                    }`}
                  >
                    {clip.name}
                  </button>
                );
              })}
            </div>
          )}

          {workspaceMode === 'workspace' ? null : workspaceMode === 'map' ? (
            <MapBottomDock
              activeTool={mapActiveTool}
              transformMode={mapTransformMode}
              brushTool={mapBrushTool}
              brushRadius={mapBrushRadius}
              brushStrength={mapBrushStrength}
              paintMaterial={mapPaintMaterial}
              waterEnabled={mapScene.water.enabled}
              waterLevel={mapScene.water.level}
              activePlaceKind={mapPlaceKind}
              stampSourceKey={mapStampSourceKey}
              activeStudioModel={model}
              studSnap={mapStudSnap}
              simulateMap={simulateMap}
              onChangeActiveTool={setMapActiveTool}
              onChangeTransformMode={setMapTransformMode}
              onChangeBrushTool={setMapBrushTool}
              onChangeBrushRadius={setMapBrushRadius}
              onChangeBrushStrength={setMapBrushStrength}
              onChangePaintMaterial={setMapPaintMaterial}
              onToggleWater={() =>
                setMapScene((prev) => ({
                  ...prev,
                  water: { ...prev.water, enabled: !prev.water.enabled },
                }))
              }
              onChangeWaterLevel={(lvl) =>
                setMapScene((prev) => ({
                  ...prev,
                  water: { ...prev.water, level: lvl },
                }))
              }
              onChangePlaceKind={setMapPlaceKind}
              onChangeStampSourceKey={setMapStampSourceKey}
              onChangeStudSnap={setMapStudSnap}
              onToggleSimulateMap={() => setSimulateMap((v) => !v)}
              onCameraPreset={(preset) =>
                setMapCameraPresetRequest((prev) => ({
                  preset,
                  seq: (prev?.seq ?? 0) + 1,
                }))
              }
            />
          ) : workspaceMode === 'model' ? (
            <StudioBottomBar
              transformMode={transformMode}
              studSnap={studSnap}
              onChangeTransformMode={setTransformMode}
              onChangeStudSnap={setStudSnap}
              onAddShape={handleAddShape}
              onCameraPreset={(preset) =>
                setCameraPresetRequest((prev) => ({
                  preset,
                  seq: (prev?.seq ?? 0) + 1,
                }))
              }
            />
          ) : workspaceMode === 'scripts' ? (
            <ScriptWorkshop
              modelName={model.name}
              scripts={scripts}
              selectedScriptId={selectedScriptId}
              clips={clips}
              isRunning={isScriptRunning}
              activeStageName={runtimeUpdate?.activeStageName ?? null}
              logs={scriptLogs}
              onSelectScript={setSelectedScriptId}
              onAddScript={handleAddScript}
              onUpdateScript={handleUpdateScript}
              onDeleteScript={handleDeleteScript}
              onRunScripts={handleRunScripts}
              onStopScripts={handleStopScripts}
              onTriggerKey={handleTriggerKey}
              onFireEvent={handleFireEvent}
              onSetAttribute={handleSetAttribute}
              onClearLogs={() => setScriptLogs([])}
              onOpenGitHubSync={() => setGithubSyncOpen(true)}
            />
          ) : (
            <AnimationTimeline
              parts={model.parts}
              selectedPartId={selectedPartId}
              clips={clips}
              activeClip={activeClip}
              currentTime={currentTime}
              isPlaying={isPlaying}
              playbackSpeed={playbackSpeed}
              autoKey={autoKey}
              selectedKeyframeRef={selectedKeyframeRef}
              allEffects={allEffects}
              allSounds={allSounds}
              onSelectPart={setSelectedPartId}
              onSelectClip={(id) => {
                setActiveClipId(id);
                setCurrentTime(0);
                setIsPlaying(false);
                setDraftPoses({});
                setSelectedKeyframeRef(null);
              }}
              onCreateClip={handleCreateClip}
              onDeleteClip={handleDeleteClip}
              onUpdateClipMeta={handleUpdateClipMeta}
              onScrubTime={handleScrubTime}
              onTogglePlay={() => {
                if (!activeClip) return;
                setDraftPoses({});
                setIsPlaying((v) => !v);
              }}
              onStopReset={() => {
                setIsPlaying(false);
                setDraftPoses({});
                setCurrentTime(0);
              }}
              onChangeSpeed={setPlaybackSpeed}
              onToggleAutoKey={() => setAutoKey((v) => !v)}
              onAddKeyframeForSelected={() => {
                if (selectedPartId) commitKeyframe(selectedPartId);
              }}
              onSelectKeyframe={(ref, time) => {
                setIsPlaying(false);
                setDraftPoses({});
                setSelectedKeyframeRef(ref);
                setCurrentTime(time);
              }}
              onUpdateKeyframeEasing={handleUpdateKeyframeEasing}
              onDeleteKeyframe={handleDeleteKeyframe}
              onUpsertMarker={handleUpsertMarker}
              onDeleteMarker={handleDeleteMarker}
            />
          )}
        </div>

        {!focusMode &&
          workspaceMode !== 'workspace' &&
          (workspaceMode === 'map' ? (
            <MapInspectorPanel
              map={mapScene}
              selectedObject={selectedMapObject}
              validation={mapValidation}
              onUpdateObject={handleUpdateMapObject}
              onUpdateMap={handleUpdateMap}
              onRegenerateTerrain={handleRegenerateTerrain}
              onSnapObjectToGround={handleSnapObjectToGround}
            />
          ) : (
            <InspectorPanel
              part={selectedPart}
              allParts={model.parts}
              isPrimaryPart={selectedPart?.id === model.primaryPartId}
              boundingSizeStuds={validation.boundingSizeStuds}
              r15HeightRatio={validation.r15HeightRatio}
              workspaceMode={workspaceMode}
              activePose={selectedPart && activePoses ? activePoses[selectedPart.id] ?? null : null}
              currentTime={currentTime}
              onUpdatePart={handleUpdatePart}
              onUpdatePose={handleUpdatePose}
              onKeyCurrentPose={(id) => commitKeyframe(id)}
              onReparentPart={handleReparentPart}
              onSetPrimaryPart={(id) =>
                setModel((prev) => ({ ...prev, primaryPartId: id }))
              }
              onResetTransform={(id) =>
                handleUpdatePart(id, { rotation: [0, 0, 0] })
              }
              onTriggerBurst={(effectId, count) =>
                setBurstTriggerSeq((prev) => ({
                  effectId,
                  count,
                  seq: (prev?.seq ?? 0) + 1,
                }))
              }
            />
          ))}
      </main>

      {exportOpen && (
        <RobloxExportModal
          model={model}
          map={mapScene}
          workspace={activeWorkspace}
          defaultScope={
            workspaceMode === 'workspace'
              ? 'workspace'
              : workspaceMode === 'map'
              ? 'map'
              : 'model'
          }
          onClose={() => setExportOpen(false)}
          onOpenGitHubSync={() => {
            setExportOpen(false);
            setGithubSyncOpen(true);
          }}
        />
      )}

      {githubSyncOpen && (
        <GitHubSyncModal
          model={model}
          map={mapScene}
          workspace={activeWorkspace}
          defaultScope={
            workspaceMode === 'workspace'
              ? 'workspace'
              : workspaceMode === 'map'
              ? 'map'
              : 'model'
          }
          authState={githubAuthState}
          onChangeAuthState={setGithubAuthState}
          onClose={() => setGithubSyncOpen(false)}
        />
      )}
    </div>
  );
}
