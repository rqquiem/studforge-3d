import { Copy, CornerDownRight, Eye, EyeOff, Layers, Plus, Star, Trash2 } from 'lucide-react';
import { flattenPartTree } from '../engine/animationEngine';
import { StudioPartNode } from '../engine/robloxTypes';

interface ExplorerPanelProps {
  modelName: string;
  parts: StudioPartNode[];
  selectedPartId: string | null;
  primaryPartId: string | null;
  totalTriangles: number;
  animatedPartIds?: Set<string>;
  onRenameModel: (name: string) => void;
  onSelectPart: (id: string) => void;
  onToggleVisibility: (id: string) => void;
  onDuplicatePart: (id: string) => void;
  onDeletePart: (id: string) => void;
  onAddDefaultPart: () => void;
}

export function ExplorerPanel({
  modelName,
  parts,
  selectedPartId,
  primaryPartId,
  totalTriangles,
  animatedPartIds,
  onRenameModel,
  onSelectPart,
  onToggleVisibility,
  onDuplicatePart,
  onDeletePart,
  onAddDefaultPart,
}: ExplorerPanelProps) {
  const treeItems = flattenPartTree(parts);

  return (
    <aside
      aria-label="Model Explorer"
      className="w-56 shrink-0 h-full bg-[#151821] border-r border-white/10 flex flex-col"
    >
      <div className="p-3 border-b border-white/10 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
            <Layers className="w-3.5 h-3.5 text-blue-400" aria-hidden="true" />
            <span>Explorer</span>
          </div>
          <button
            type="button"
            onClick={onAddDefaultPart}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-200 bg-white/5 hover:bg-white/10 border border-white/10 rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            aria-label="Add new block part"
          >
            <Plus className="w-3 h-3" aria-hidden="true" />
            <span>Add</span>
          </button>
        </div>

        <div>
          <label htmlFor="model-name-input" className="sr-only">
            Model Name
          </label>
          <input
            id="model-name-input"
            type="text"
            value={modelName}
            onChange={(e) => onRenameModel(e.target.value)}
            className="w-full px-2.5 py-1.5 text-xs font-medium bg-[#0e1015] border border-white/10 rounded text-slate-100 focus:outline-none focus:border-blue-500"
            placeholder="Model Name"
          />
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono-tabular">
          <span>{parts.length} parts</span>
          <span aria-hidden="true">·</span>
          <span>{totalTriangles.toLocaleString()} tris</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto studio-scroll p-2 space-y-0.5" role="list">
        {treeItems.length === 0 ? (
          <div className="p-4 text-center space-y-2">
            <p className="text-xs text-slate-400">No parts in this model yet.</p>
            <button
              type="button"
              onClick={onAddDefaultPart}
              className="px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors cursor-pointer"
            >
              Add First Part
            </button>
          </div>
        ) : (
          treeItems.map(({ part, depth }) => {
            const isSelected = part.id === selectedPartId;
            const isPrimary = part.id === primaryPartId;
            const isAnimated = animatedPartIds?.has(part.id) ?? false;
            return (
              <div
                key={part.id}
                role="listitem"
                style={{ paddingLeft: `${8 + Math.min(depth, 4) * 10}px` }}
                className={`group flex items-center gap-1 pr-1.5 py-1 rounded text-xs transition-colors ${
                  isSelected
                    ? 'bg-blue-600/20 text-white border border-blue-500/40'
                    : 'text-slate-300 hover:bg-white/5 border border-transparent'
                }`}
              >
                {depth > 0 && (
                  <CornerDownRight
                    className="w-3 h-3 text-slate-500 shrink-0"
                    aria-hidden="true"
                  />
                )}
                <span
                  className="w-2.5 h-2.5 rounded-xs shrink-0 border border-white/20"
                  style={{ backgroundColor: part.color }}
                  aria-hidden="true"
                />
                <button
                  type="button"
                  onClick={() => onSelectPart(part.id)}
                  className="flex-1 min-w-0 text-left truncate font-medium cursor-pointer py-0.5"
                  aria-label={`Select ${part.name}`}
                  aria-current={isSelected ? 'true' : undefined}
                >
                  {part.name}
                </button>
                {isAnimated && (
                  <span
                    className="text-[10px] text-amber-400 shrink-0 leading-none"
                    title="Has animation keyframes"
                    aria-hidden="true"
                  >
                    ◆
                  </span>
                )}
                {isPrimary && (
                  <Star
                    className="w-3 h-3 text-amber-400 shrink-0"
                    aria-label="Primary Part"
                  />
                )}
                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => onToggleVisibility(part.id)}
                    className="p-1 text-slate-400 hover:text-slate-100 rounded cursor-pointer"
                    aria-label={
                      part.visible ? `Hide ${part.name}` : `Show ${part.name}`
                    }
                    title={part.visible ? 'Hide part' : 'Show part'}
                  >
                    {part.visible ? (
                      <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                    ) : (
                      <EyeOff className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => onDuplicatePart(part.id)}
                    className="p-1 text-slate-400 hover:text-slate-100 rounded cursor-pointer"
                    aria-label={`Duplicate ${part.name}`}
                    title="Duplicate part"
                  >
                    <Copy className="w-3 h-3" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeletePart(part.id)}
                    className="p-1 text-slate-400 hover:text-red-400 rounded cursor-pointer"
                    aria-label={`Delete ${part.name}`}
                    title="Delete part"
                  >
                    <Trash2 className="w-3 h-3" aria-hidden="true" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
