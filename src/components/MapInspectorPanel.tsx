import { useState } from 'react';
import {
  Clock,
  Cog,
  Droplets,
  Mountain,
  Plus,
  ShoppingBag,
  Sliders,
  Trash2,
  Users,
} from 'lucide-react';
import { TerrainGenStyle } from '../engine/mapPresets';
import {
  MapObjectNode,
  MapShopItem,
  MapSystemsConfig,
  MapValidationReport,
  StudioMapScene,
} from '../engine/mapTypes';
import { MODEL_PRESETS } from '../engine/presets';

interface MapInspectorPanelProps {
  map: StudioMapScene;
  selectedObject: MapObjectNode | null;
  validation: MapValidationReport;
  onUpdateObject: (id: string, patch: Partial<MapObjectNode>) => void;
  onUpdateMap: (patch: Partial<StudioMapScene>) => void;
  onRegenerateTerrain: (style: TerrainGenStyle, seed: number) => void;
  onSnapObjectToGround: (id: string) => void;
}

const AXES = ['X', 'Y', 'Z'] as const;

const SYSTEM_TOGGLES: { key: keyof MapSystemsConfig; label: string; desc: string }[] = [
  {
    key: 'roundManager',
    label: 'Round & Lobby Manager',
    desc: 'Lobby countdown, team assignment, round timer, win coin rewards.',
  },
  {
    key: 'dayNightCycle',
    label: 'Day-Night Cycle & Lamps',
    desc: 'Progresses Lighting.ClockTime, fog tones, and dusk streetlamps.',
  },
  {
    key: 'obbySystem',
    label: 'Obby Checkpoints & Pads',
    desc: 'Stage respawn tracking, KillBricks, JumpPads, SpeedPads, SafeZones.',
  },
  {
    key: 'interactables',
    label: 'Doors & Teleporters',
    desc: 'ProximityPrompt animated gates and paired channel warp pads.',
  },
  {
    key: 'economyShop',
    label: 'Coins & Outfitter Shop',
    desc: 'leaderstats Coins/Stage/Wins, pickups, and ShopHUD purchases.',
  },
  {
    key: 'npcSpawner',
    label: 'Rigged NPC / Boss Spawners',
    desc: 'Spawns StudForge rigged models with AI patrol, aggro, and health bar.',
  },
];

export function MapInspectorPanel({
  map,
  selectedObject,
  validation,
  onUpdateObject,
  onUpdateMap,
  onRegenerateTerrain,
  onSnapObjectToGround,
}: MapInspectorPanelProps) {
  const [tab, setTab] = useState<'object' | 'world'>('object');
  const [genStyle, setGenStyle] = useState<TerrainGenStyle>('crater');
  const [genSeed, setGenSeed] = useState<number>(42);

  const activeTab = selectedObject ? tab : 'world';

  const updateVector = (
    field: 'position' | 'rotation' | 'scale',
    axisIdx: number,
    val: number
  ) => {
    if (!selectedObject) return;
    const next: [number, number, number] = [...selectedObject[field]];
    next[axisIdx] = Number.isFinite(val) ? val : 0;
    onUpdateObject(selectedObject.id, { [field]: next });
  };

  const handleAddTeam = () => {
    const nextIdx = map.teams.length + 1;
    onUpdateMap({
      teams: [
        ...map.teams,
        {
          id: `team_${Date.now().toString(36)}`,
          name: `Team_${nextIdx}`,
          brickColorName: 'Bright green',
          hexColor: '#16A34A',
          autoAssignable: false,
        },
      ],
    });
  };

  const handleAddShopItem = () => {
    const nextItem: MapShopItem = {
      id: `shop_${Date.now().toString(36)}`,
      name: 'Boost Elixir',
      description: 'Restores health or grants temporary movement perk.',
      cost: 20,
      effectType: 'Heal',
      value: 100,
      color: '#38BDF8',
    };
    onUpdateMap({ shopItems: [...map.shopItems, nextItem] });
  };

  return (
    <aside
      aria-label="Map Properties Inspector"
      className="w-76 shrink-0 h-full bg-[#151821] border-l border-white/10 flex flex-col"
    >
      {/* Inspector Tab Switch */}
      <div className="p-2 border-b border-white/10 flex items-center gap-1">
        <button
          type="button"
          onClick={() => setTab('object')}
          disabled={!selectedObject}
          className={`flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 rounded text-xs font-semibold transition-colors cursor-pointer disabled:opacity-40 ${
            activeTab === 'object'
              ? 'bg-blue-600 text-white'
              : 'text-slate-300 hover:text-white hover:bg-white/5'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Object</span>
        </button>
        <button
          type="button"
          onClick={() => setTab('world')}
          className={`flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 rounded text-xs font-semibold transition-colors cursor-pointer ${
            activeTab === 'world'
              ? 'bg-blue-600 text-white'
              : 'text-slate-300 hover:text-white hover:bg-white/5'
          }`}
        >
          <Cog className="w-3.5 h-3.5" aria-hidden="true" />
          <span>World & Systems</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto studio-scroll p-3.5 space-y-4 text-xs">
        {activeTab === 'object' && selectedObject ? (
          <>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-slate-400">
                  {selectedObject.kind}
                </span>
                <button
                  type="button"
                  onClick={() => onSnapObjectToGround(selectedObject.id)}
                  className="px-2 py-0.5 text-[11px] font-medium bg-white/5 hover:bg-white/10 border border-white/10 rounded text-slate-200 cursor-pointer"
                >
                  Snap to Ground
                </button>
              </div>
              <input
                aria-label="Object Name"
                type="text"
                value={selectedObject.name}
                onChange={(e) =>
                  onUpdateObject(selectedObject.id, { name: e.target.value })
                }
                className="w-full px-2.5 py-1.5 bg-[#0e1015] border border-white/10 rounded text-slate-100 font-medium focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Position / Rotation / Scale */}
            {(
              [
                { key: 'position', label: 'Position (Studs)', step: 0.5 },
                { key: 'rotation', label: 'Rotation (Deg)', step: 5 },
                { key: 'scale', label: 'Size / Scale', step: 0.25 },
              ] as const
            ).map((vec) => (
              <div key={vec.key} className="space-y-1.5">
                <div className="text-[11px] font-semibold text-slate-400">{vec.label}</div>
                <div className="grid grid-cols-3 gap-1.5">
                  {AXES.map((axis, idx) => (
                    <label
                      key={axis}
                      className="flex items-center bg-[#0e1015] border border-white/10 rounded px-2 py-1 gap-1"
                    >
                      <span className="text-[10px] text-slate-500 font-semibold">{axis}</span>
                      <input
                        type="number"
                        step={vec.step}
                        value={selectedObject[vec.key][idx]}
                        onChange={(e) =>
                          updateVector(vec.key, idx, parseFloat(e.target.value))
                        }
                        className="w-full bg-transparent text-slate-100 font-mono-tabular text-[11px] focus:outline-none"
                      />
                    </label>
                  ))}
                </div>
              </div>
            ))}

            {/* Color */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/10">
              <span className="text-slate-300">Primary Color</span>
              <input
                aria-label="Object Color"
                type="color"
                value={selectedObject.color}
                onChange={(e) =>
                  onUpdateObject(selectedObject.id, { color: e.target.value })
                }
                className="w-9 h-7 rounded bg-transparent border border-white/15 cursor-pointer"
              />
            </div>

            {/* Prefab-Specific Gameplay Parameters */}
            {selectedObject.kind === 'SpawnLocation' && (
              <div className="space-y-1.5 pt-2 border-t border-white/10">
                <label className="block text-[11px] font-semibold text-slate-400">
                  Assigned Team (blank = Neutral)
                </label>
                <select
                  value={selectedObject.teamName ?? ''}
                  onChange={(e) =>
                    onUpdateObject(selectedObject.id, { teamName: e.target.value })
                  }
                  className="w-full px-2.5 py-1.5 bg-[#0e1015] border border-white/10 rounded text-slate-100"
                >
                  <option value="">Neutral (All Players)</option>
                  {map.teams.map((t) => (
                    <option key={t.id} value={t.name}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {selectedObject.kind === 'Checkpoint' && (
              <div className="space-y-1.5 pt-2 border-t border-white/10">
                <label className="block text-[11px] font-semibold text-slate-400">
                  Obby Stage Number
                </label>
                <input
                  type="number"
                  min={1}
                  value={selectedObject.stageNumber ?? 1}
                  onChange={(e) =>
                    onUpdateObject(selectedObject.id, {
                      stageNumber: Math.max(1, parseInt(e.target.value, 10) || 1),
                    })
                  }
                  className="w-full px-2.5 py-1.5 bg-[#0e1015] border border-white/10 rounded text-slate-100 font-mono-tabular"
                />
              </div>
            )}

            {selectedObject.kind === 'JumpPad' && (
              <div className="space-y-1.5 pt-2 border-t border-white/10">
                <label className="block text-[11px] font-semibold text-slate-400">
                  Launch Velocity Y (studs/s)
                </label>
                <input
                  type="number"
                  min={20}
                  max={250}
                  value={selectedObject.jumpPower ?? 95}
                  onChange={(e) =>
                    onUpdateObject(selectedObject.id, {
                      jumpPower: Number(e.target.value) || 95,
                    })
                  }
                  className="w-full px-2.5 py-1.5 bg-[#0e1015] border border-white/10 rounded text-slate-100 font-mono-tabular"
                />
              </div>
            )}

            {selectedObject.kind === 'SpeedPad' && (
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">WalkSpeed</label>
                  <input
                    type="number"
                    min={16}
                    max={120}
                    value={selectedObject.speedBoost ?? 36}
                    onChange={(e) =>
                      onUpdateObject(selectedObject.id, {
                        speedBoost: Number(e.target.value) || 36,
                      })
                    }
                    className="w-full px-2 py-1 bg-[#0e1015] border border-white/10 rounded text-slate-100 font-mono-tabular"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Duration (s)</label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={selectedObject.boostDuration ?? 4}
                    onChange={(e) =>
                      onUpdateObject(selectedObject.id, {
                        boostDuration: Number(e.target.value) || 4,
                      })
                    }
                    className="w-full px-2 py-1 bg-[#0e1015] border border-white/10 rounded text-slate-100 font-mono-tabular"
                  />
                </div>
              </div>
            )}

            {selectedObject.kind === 'InteractiveDoor' && (
              <div className="space-y-2.5 pt-2 border-t border-white/10">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Motion Type</label>
                  <select
                    value={selectedObject.doorMode ?? 'hinge'}
                    onChange={(e) =>
                      onUpdateObject(selectedObject.id, {
                        doorMode: e.target.value as 'hinge' | 'slide',
                      })
                    }
                    className="w-full px-2 py-1.5 bg-[#0e1015] border border-white/10 rounded text-slate-100"
                  >
                    <option value="hinge">Hinge Swing (90°)</option>
                    <option value="slide">Vertical Gate Slide</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Coin Unlock Cost (0 = Free)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={selectedObject.doorLockedCost ?? 0}
                    onChange={(e) =>
                      onUpdateObject(selectedObject.id, {
                        doorLockedCost: Math.max(0, parseInt(e.target.value, 10) || 0),
                      })
                    }
                    className="w-full px-2 py-1.5 bg-[#0e1015] border border-white/10 rounded text-slate-100 font-mono-tabular"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Prompt Text</label>
                  <input
                    type="text"
                    value={selectedObject.promptText ?? 'Open Gate'}
                    onChange={(e) =>
                      onUpdateObject(selectedObject.id, { promptText: e.target.value })
                    }
                    className="w-full px-2 py-1.5 bg-[#0e1015] border border-white/10 rounded text-slate-100"
                  />
                </div>
              </div>
            )}

            {selectedObject.kind === 'Teleporter' && (
              <div className="space-y-1.5 pt-2 border-t border-white/10">
                <label className="block text-[11px] font-semibold text-slate-400">
                  Teleporter Channel (Pairs Matching Pads)
                </label>
                <input
                  type="text"
                  value={selectedObject.teleporterChannel ?? 'Alpha'}
                  onChange={(e) =>
                    onUpdateObject(selectedObject.id, { teleporterChannel: e.target.value })
                  }
                  className="w-full px-2.5 py-1.5 bg-[#0e1015] border border-white/10 rounded text-slate-100"
                />
              </div>
            )}

            {selectedObject.kind === 'CoinPickup' && (
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Coin Value</label>
                  <input
                    type="number"
                    min={1}
                    value={selectedObject.coinValue ?? 10}
                    onChange={(e) =>
                      onUpdateObject(selectedObject.id, {
                        coinValue: Math.max(1, parseInt(e.target.value, 10) || 10),
                      })
                    }
                    className="w-full px-2 py-1 bg-[#0e1015] border border-white/10 rounded text-slate-100 font-mono-tabular"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Respawn (s)</label>
                  <input
                    type="number"
                    min={1}
                    value={selectedObject.respawnSeconds ?? 12}
                    onChange={(e) =>
                      onUpdateObject(selectedObject.id, {
                        respawnSeconds: Math.max(1, parseInt(e.target.value, 10) || 12),
                      })
                    }
                    className="w-full px-2 py-1 bg-[#0e1015] border border-white/10 rounded text-slate-100 font-mono-tabular"
                  />
                </div>
              </div>
            )}

            {selectedObject.kind === 'NPCSpawner' && (
              <div className="space-y-2.5 pt-2 border-t border-white/10">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Rigged NPC Model</label>
                  <select
                    value={selectedObject.modelPresetId ?? 'jade-dragon'}
                    onChange={(e) =>
                      onUpdateObject(selectedObject.id, { modelPresetId: e.target.value })
                    }
                    className="w-full px-2 py-1.5 bg-[#0e1015] border border-white/10 rounded text-slate-100"
                  >
                    {MODEL_PRESETS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Max HP</label>
                    <input
                      type="number"
                      min={20}
                      value={selectedObject.npcMaxHealth ?? 150}
                      onChange={(e) =>
                        onUpdateObject(selectedObject.id, {
                          npcMaxHealth: Number(e.target.value) || 150,
                        })
                      }
                      className="w-full px-2 py-1 bg-[#0e1015] border border-white/10 rounded text-slate-100 font-mono-tabular"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Aggro Range</label>
                    <input
                      type="number"
                      min={10}
                      value={selectedObject.npcAggroRange ?? 48}
                      onChange={(e) =>
                        onUpdateObject(selectedObject.id, {
                          npcAggroRange: Number(e.target.value) || 48,
                        })
                      }
                      className="w-full px-2 py-1 bg-[#0e1015] border border-white/10 rounded text-slate-100 font-mono-tabular"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Damage</label>
                    <input
                      type="number"
                      min={1}
                      value={selectedObject.npcAttackDamage ?? 15}
                      onChange={(e) =>
                        onUpdateObject(selectedObject.id, {
                          npcAttackDamage: Number(e.target.value) || 15,
                        })
                      }
                      className="w-full px-2 py-1 bg-[#0e1015] border border-white/10 rounded text-slate-100 font-mono-tabular"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Reward Coins</label>
                    <input
                      type="number"
                      min={0}
                      value={selectedObject.npcRewardCoins ?? 50}
                      onChange={(e) =>
                        onUpdateObject(selectedObject.id, {
                          npcRewardCoins: Number(e.target.value) || 50,
                        })
                      }
                      className="w-full px-2 py-1 bg-[#0e1015] border border-white/10 rounded text-slate-100 font-mono-tabular"
                    />
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          /* World & Gameplay Systems Tab */
          <>
            {/* Procedural Terrain Generator */}
            <div className="space-y-2 pb-3 border-b border-white/10">
              <div className="flex items-center gap-1.5 font-semibold text-slate-200">
                <Mountain className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                <span>Terrain Generator</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <select
                  aria-label="Terrain Style"
                  value={genStyle}
                  onChange={(e) => setGenStyle(e.target.value as TerrainGenStyle)}
                  className="px-2 py-1.5 bg-[#0e1015] border border-white/10 rounded text-slate-100"
                >
                  <option value="crater">Caldera Crater</option>
                  <option value="islands">Skyline Islands</option>
                  <option value="basin">Valley Basin</option>
                  <option value="flat">Flat Baseplate</option>
                </select>
                <input
                  aria-label="Terrain Seed"
                  type="number"
                  value={genSeed}
                  onChange={(e) => setGenSeed(parseInt(e.target.value, 10) || 1)}
                  className="px-2 py-1.5 bg-[#0e1015] border border-white/10 rounded text-slate-100 font-mono-tabular"
                />
              </div>
              <button
                type="button"
                onClick={() => onRegenerateTerrain(genStyle, genSeed)}
                className="w-full py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-slate-200 font-medium cursor-pointer"
              >
                Regenerate Heightfield
              </button>
            </div>

            {/* Water */}
            <div className="space-y-2 pb-3 border-b border-white/10">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 font-semibold text-slate-200">
                  <Droplets className="w-3.5 h-3.5 text-sky-400" aria-hidden="true" />
                  <span>Water Plane</span>
                </span>
                <input
                  type="checkbox"
                  checked={map.water.enabled}
                  onChange={(e) =>
                    onUpdateMap({ water: { ...map.water, enabled: e.target.checked } })
                  }
                  className="accent-sky-500"
                />
              </div>
              {map.water.enabled && (
                <div className="space-y-2">
                  <label className="flex items-center justify-between text-slate-300 font-mono-tabular">
                    <span>Level ({map.water.level}u)</span>
                    <input
                      type="range"
                      min={-12}
                      max={16}
                      step={0.5}
                      value={map.water.level}
                      onChange={(e) =>
                        onUpdateMap({
                          water: { ...map.water, level: Number(e.target.value) },
                        })
                      }
                      className="w-28 accent-sky-500"
                    />
                  </label>
                  <label className="flex items-center justify-between text-slate-300 cursor-pointer">
                    <span>Hazard Water (Eliminates Players)</span>
                    <input
                      type="checkbox"
                      checked={map.water.isHazard}
                      onChange={(e) =>
                        onUpdateMap({
                          water: { ...map.water, isHazard: e.target.checked },
                        })
                      }
                      className="accent-red-500"
                    />
                  </label>
                </div>
              )}
            </div>

            {/* Lighting & Day-Night Cycle */}
            <div className="space-y-2 pb-3 border-b border-white/10">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 font-semibold text-slate-200">
                  <Clock className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
                  <span>Lighting & Atmosphere</span>
                </span>
                <span className="font-mono-tabular text-amber-300">
                  {Math.floor(map.lighting.clockTime).toString().padStart(2, '0')}:00
                </span>
              </div>
              <label className="block space-y-1">
                <span className="text-[11px] text-slate-400">ClockTime (0–24h)</span>
                <input
                  type="range"
                  min={0}
                  max={23.9}
                  step={0.25}
                  value={map.lighting.clockTime}
                  onChange={(e) =>
                    onUpdateMap({
                      lighting: { ...map.lighting, clockTime: Number(e.target.value) },
                    })
                  }
                  className="w-full accent-amber-500"
                />
              </label>
              <label className="flex items-center justify-between text-slate-300 cursor-pointer">
                <span>Auto Day-Night Cycle</span>
                <input
                  type="checkbox"
                  checked={map.lighting.cycleEnabled}
                  onChange={(e) =>
                    onUpdateMap({
                      lighting: { ...map.lighting, cycleEnabled: e.target.checked },
                    })
                  }
                  className="accent-amber-500"
                />
              </label>
            </div>

            {/* Teams & Round Timings */}
            <div className="space-y-2 pb-3 border-b border-white/10">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 font-semibold text-slate-200">
                  <Users className="w-3.5 h-3.5 text-blue-400" aria-hidden="true" />
                  <span>Teams ({map.teams.length})</span>
                </span>
                <button
                  type="button"
                  onClick={handleAddTeam}
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-[11px] text-slate-200 cursor-pointer"
                >
                  <Plus className="w-3 h-3" aria-hidden="true" />
                  <span>Add</span>
                </button>
              </div>
              <div className="space-y-1.5">
                {map.teams.map((tm) => (
                  <div key={tm.id} className="flex items-center gap-1.5">
                    <input
                      type="color"
                      value={tm.hexColor}
                      onChange={(e) =>
                        onUpdateMap({
                          teams: map.teams.map((x) =>
                            x.id === tm.id ? { ...x, hexColor: e.target.value } : x
                          ),
                        })
                      }
                      className="w-6 h-6 rounded bg-transparent border border-white/15 cursor-pointer shrink-0"
                    />
                    <input
                      type="text"
                      value={tm.name}
                      onChange={(e) =>
                        onUpdateMap({
                          teams: map.teams.map((x) =>
                            x.id === tm.id ? { ...x, name: e.target.value } : x
                          ),
                        })
                      }
                      className="flex-1 min-w-0 px-2 py-1 bg-[#0e1015] border border-white/10 rounded text-slate-100 text-[11px]"
                    />
                    {map.teams.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateMap({
                            teams: map.teams.filter((x) => x.id !== tm.id),
                          })
                        }
                        className="p-1 text-slate-400 hover:text-red-400 cursor-pointer"
                        title="Remove team"
                      >
                        <Trash2 className="w-3 h-3" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <label className="block">
                  <span className="text-[10px] text-slate-400">Lobby (s)</span>
                  <input
                    type="number"
                    min={3}
                    value={map.roundConfig.lobbySeconds}
                    onChange={(e) =>
                      onUpdateMap({
                        roundConfig: {
                          ...map.roundConfig,
                          lobbySeconds: Number(e.target.value) || 10,
                        },
                      })
                    }
                    className="w-full px-2 py-1 bg-[#0e1015] border border-white/10 rounded text-slate-100 font-mono-tabular"
                  />
                </label>
                <label className="block">
                  <span className="text-[10px] text-slate-400">Round (s)</span>
                  <input
                    type="number"
                    min={15}
                    value={map.roundConfig.roundSeconds}
                    onChange={(e) =>
                      onUpdateMap({
                        roundConfig: {
                          ...map.roundConfig,
                          roundSeconds: Number(e.target.value) || 180,
                        },
                      })
                    }
                    className="w-full px-2 py-1 bg-[#0e1015] border border-white/10 rounded text-slate-100 font-mono-tabular"
                  />
                </label>
              </div>
            </div>

            {/* 6 Functional Gameplay Script Systems */}
            <div className="space-y-2 pb-3 border-b border-white/10">
              <div className="font-semibold text-slate-200">
                Exported Luau Gameplay Systems
              </div>
              <div className="space-y-2">
                {SYSTEM_TOGGLES.map((sys) => (
                  <label
                    key={sys.key}
                    className="flex items-start justify-between gap-2 cursor-pointer"
                  >
                    <div>
                      <div className="text-slate-200 font-medium">{sys.label}</div>
                      <div className="text-[10px] text-slate-400 leading-snug">
                        {sys.desc}
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={map.systems[sys.key]}
                      onChange={(e) =>
                        onUpdateMap({
                          systems: { ...map.systems, [sys.key]: e.target.checked },
                        })
                      }
                      className="mt-0.5 accent-emerald-500 shrink-0"
                    />
                  </label>
                ))}
              </div>
            </div>

            {/* Shop Items */}
            <div className="space-y-2 pb-3 border-b border-white/10">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 font-semibold text-slate-200">
                  <ShoppingBag className="w-3.5 h-3.5 text-teal-400" aria-hidden="true" />
                  <span>Shop Items ({map.shopItems.length})</span>
                </span>
                <button
                  type="button"
                  onClick={handleAddShopItem}
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-[11px] text-slate-200 cursor-pointer"
                >
                  <Plus className="w-3 h-3" aria-hidden="true" />
                  <span>Add</span>
                </button>
              </div>
              <div className="space-y-1.5">
                {map.shopItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-1.5 bg-[#0e1015] border border-white/10 rounded px-2 py-1"
                  >
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) =>
                        onUpdateMap({
                          shopItems: map.shopItems.map((x) =>
                            x.id === item.id ? { ...x, name: e.target.value } : x
                          ),
                        })
                      }
                      className="flex-1 min-w-0 bg-transparent text-slate-100 text-[11px] focus:outline-none"
                    />
                    <input
                      type="number"
                      min={0}
                      value={item.cost}
                      onChange={(e) =>
                        onUpdateMap({
                          shopItems: map.shopItems.map((x) =>
                            x.id === item.id
                              ? { ...x, cost: parseInt(e.target.value, 10) || 0 }
                              : x
                          ),
                        })
                      }
                      className="w-12 bg-white/5 rounded px-1 py-0.5 text-amber-300 font-mono-tabular text-[11px] text-right"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Live Map Export Budget */}
            <div className="bg-[#0e1015] border border-white/10 rounded-lg p-2.5 text-[11px] font-mono-tabular text-slate-300 space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Merged Terrain Parts</span>
                <span>{validation.terrainMergedParts}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Est. Total Place Parts</span>
                <span>{validation.estimatedTotalParts}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Service Scripts</span>
                <span className="text-emerald-300">{validation.scriptCount}</span>
              </div>
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
