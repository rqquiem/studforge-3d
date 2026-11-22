import { useMemo, useState } from 'react';
import { Copy, Eye, EyeOff, Globe2, Search, Trash2 } from 'lucide-react';
import { MAP_PRESETS } from '../engine/mapPresets';
import { MapObjectNode, StudioMapScene } from '../engine/mapTypes';

interface MapExplorerPanelProps {
  map: StudioMapScene;
  selectedObjectId: string | null;
  onRenameMap: (name: string) => void;
  onLoadMapPreset: (presetId: string) => void;
  onSelectObject: (id: string | null) => void;
  onToggleVisibility: (id: string) => void;
  onDuplicateObject: (id: string) => void;
  onDeleteObject: (id: string) => void;
}

const GROUP_LABELS: { key: string; label: string; kinds: string[] }[] = [
  { key: 'spawns', label: 'Spawns & SafeZones', kinds: ['SpawnLocation', 'SafeZone'] },
  {
    key: 'obby',
    label: 'Obby & Mobility',
    kinds: ['Checkpoint', 'KillBrick', 'JumpPad', 'SpeedPad'],
  },
  {
    key: 'interact',
    label: 'Doors & Teleporters',
    kinds: ['InteractiveDoor', 'Teleporter'],
  },
  { key: 'economy', label: 'Coins & Shops', kinds: ['CoinPickup', 'ShopPad'] },
  { key: 'npcs', label: 'NPCs & Stamped Rigs', kinds: ['NPCSpawner', 'StampedModel'] },
  { key: 'props', label: 'Props & Lighting', kinds: ['Streetlamp', 'Tree', 'Rock', 'Crate'] },
];

export function MapExplorerPanel({
  map,
  selectedObjectId,
  onRenameMap,
  onLoadMapPreset,
  onSelectObject,
  onToggleVisibility,
  onDuplicateObject,
  onDeleteObject,
}: MapExplorerPanelProps) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return map.objects;
    return map.objects.filter(
      (o) => o.name.toLowerCase().includes(q) || o.kind.toLowerCase().includes(q)
    );
  }, [map.objects, search]);

  const grouped = useMemo(() => {
    const out: { label: string; items: MapObjectNode[] }[] = [];
    for (const g of GROUP_LABELS) {
      const items = filtered.filter((o) => g.kinds.includes(o.kind));
      if (items.length > 0) out.push({ label: g.label, items });
    }
    return out;
  }, [filtered]);

  return (
    <aside
      aria-label="Map Explorer"
      className="w-60 shrink-0 h-full bg-[#151821] border-r border-white/10 flex flex-col"
    >
      <div className="p-3 border-b border-white/10 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
            <Globe2 className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
            <span>Map Explorer</span>
          </div>
          <select
            aria-label="Load Map Template"
            value={map.id}
            onChange={(e) => onLoadMapPreset(e.target.value)}
            className="max-w-[115px] px-1.5 py-1 text-[11px] bg-[#0e1015] border border-white/10 rounded text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            {MAP_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        <input
          aria-label="Map Name"
          type="text"
          value={map.name}
          onChange={(e) => onRenameMap(e.target.value)}
          className="w-full px-2.5 py-1.5 text-xs font-medium bg-[#0e1015] border border-white/10 rounded text-slate-100 focus:outline-none focus:border-blue-500"
          placeholder="Map Name"
        />

        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono-tabular">
          <span>{map.objects.length} objs</span>
          <span aria-hidden="true">·</span>
          <span>{map.teams.length} teams</span>
          <span aria-hidden="true">·</span>
          <span>{Object.values(map.systems).filter(Boolean).length}/6 sys</span>
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" aria-hidden="true" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter map objects..."
            className="w-full pl-8 pr-2.5 py-1 text-[11px] bg-[#0e1015] border border-white/10 rounded text-slate-200 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto studio-scroll p-2 space-y-3">
        {grouped.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-6">
            No map objects match your filter.
          </p>
        ) : (
          grouped.map((grp) => (
            <div key={grp.label} className="space-y-1">
              <div className="px-2 text-[11px] font-semibold text-slate-400 flex items-center justify-between">
                <span>{grp.label}</span>
                <span className="font-mono-tabular text-slate-500">{grp.items.length}</span>
              </div>
              {grp.items.map((obj) => {
                const isSelected = obj.id === selectedObjectId;
                return (
                  <div
                    key={obj.id}
                    className={`group flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors ${
                      isSelected
                        ? 'bg-blue-600/20 text-white border border-blue-500/40'
                        : 'text-slate-300 hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-xs shrink-0 border border-white/20"
                      style={{ backgroundColor: obj.color }}
                      aria-hidden="true"
                    />
                    <button
                      type="button"
                      onClick={() => onSelectObject(obj.id)}
                      className="flex-1 min-w-0 text-left truncate cursor-pointer"
                      title={`${obj.name} (${obj.kind})`}
                    >
                      {obj.name}
                    </button>
                    <button
                      type="button"
                      onClick={() => onToggleVisibility(obj.id)}
                      className="p-0.5 text-slate-400 hover:text-white opacity-70 group-hover:opacity-100 cursor-pointer"
                      title={obj.visible ? 'Hide object' : 'Show object'}
                    >
                      {obj.visible ? (
                        <Eye className="w-3 h-3" aria-hidden="true" />
                      ) : (
                        <EyeOff className="w-3 h-3" aria-hidden="true" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => onDuplicateObject(obj.id)}
                      className="p-0.5 text-slate-400 hover:text-white opacity-0 group-hover:opacity-100 cursor-pointer"
                      title="Duplicate object"
                    >
                      <Copy className="w-3 h-3" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteObject(obj.id)}
                      className="p-0.5 text-slate-400 hover:text-red-400 opacity-0 group-hover:opacity-100 cursor-pointer"
                      title="Delete object"
                    >
                      <Trash2 className="w-3 h-3" aria-hidden="true" />
                    </button>
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
