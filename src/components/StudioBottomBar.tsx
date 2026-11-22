import { useState } from 'react';
import {
  Box,
  ChevronDown,
  Maximize2,
  MousePointer,
  Move,
  Plus,
  RotateCw,
} from 'lucide-react';
import { CameraPreset, PartShape, SHAPE_CATALOG, TransformMode } from '../engine/robloxTypes';

interface StudioBottomBarProps {
  transformMode: TransformMode;
  studSnap: number;
  onChangeTransformMode: (mode: TransformMode) => void;
  onChangeStudSnap: (snap: number) => void;
  onAddShape: (shape: PartShape) => void;
  onCameraPreset: (preset: CameraPreset) => void;
}

const QUICK_SHAPES: { shape: PartShape; shortLabel: string }[] = [
  { shape: 'Block', shortLabel: 'Block' },
  { shape: 'Wedge', shortLabel: 'Wedge' },
  { shape: 'Cylinder', shortLabel: 'Cyl' },
  { shape: 'Ball', shortLabel: 'Sphere' },
];

const EXTRA_SHAPES: PartShape[] = [
  'CornerWedge',
  'HexPrism',
  'BevelPlate',
  'Archway',
  'PipeElbow',
  'LatheCone',
];

export function StudioBottomBar({
  transformMode,
  studSnap,
  onChangeTransformMode,
  onChangeStudSnap,
  onAddShape,
  onCameraPreset,
}: StudioBottomBarProps) {
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <div className="relative bg-[#151821] border-t border-white/10 px-2 py-1.5 flex flex-wrap items-center justify-between gap-1.5 shrink-0 z-20">
      {/* Transform Mode */}
      <div className="flex items-center gap-0.5 bg-[#0e1015] border border-white/10 rounded-md p-0.5 shrink-0">
        {(
          [
            { id: 'select', label: 'Select', icon: MousePointer },
            { id: 'translate', label: 'Move', icon: Move },
            { id: 'rotate', label: 'Rotate', icon: RotateCw },
            { id: 'scale', label: 'Scale', icon: Maximize2 },
          ] as const
        ).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => onChangeTransformMode(id)}
            aria-pressed={transformMode === id}
            className={`inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              transformMode === id
                ? 'bg-blue-600 text-white'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Icon className="w-3 h-3" aria-hidden="true" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Stud Snap */}
      <div className="flex items-center gap-1 shrink-0">
        <span className="text-[11px] text-slate-400 whitespace-nowrap">Snap</span>
        <div className="flex items-center bg-[#0e1015] border border-white/10 rounded-md p-0.5">
          {[0, 0.25, 0.5, 1].map((snap) => (
            <button
              key={snap}
              type="button"
              onClick={() => onChangeStudSnap(snap)}
              aria-pressed={studSnap === snap}
              className={`px-1.5 py-1 text-[11px] font-mono-tabular font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                studSnap === snap
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {snap === 0 ? 'Off' : `${snap}`}
            </button>
          ))}
        </div>
      </div>

      {/* Add Primitives & Sculpted Parts */}
      <div className="flex items-center gap-1 shrink-0 relative">
        {QUICK_SHAPES.map(({ shape, shortLabel }) => {
          const entry = SHAPE_CATALOG.find((c) => c.shape === shape)!;
          return (
            <button
              key={shape}
              type="button"
              onClick={() => onAddShape(shape)}
              className="inline-flex items-center gap-1 px-1.5 py-1 text-[11px] font-medium bg-[#0e1015] hover:bg-white/10 border border-white/10 text-slate-200 rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              aria-label={`Add ${entry.label}`}
            >
              <Plus className="w-3 h-3 text-blue-400" aria-hidden="true" />
              <span>{shortLabel}</span>
            </button>
          );
        })}

        <div className="relative">
          <button
            type="button"
            onClick={() => setMoreOpen((v) => !v)}
            aria-expanded={moreOpen}
            className="inline-flex items-center gap-1 px-1.5 py-1 text-[11px] font-medium bg-[#0e1015] hover:bg-white/10 border border-white/10 text-slate-200 rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Box className="w-3 h-3 text-blue-400" aria-hidden="true" />
            <span>More</span>
            <ChevronDown className="w-3 h-3 text-slate-400" aria-hidden="true" />
          </button>

          {moreOpen && (
            <div className="absolute bottom-full right-0 mb-2 w-48 bg-[#1a1e29] border border-white/15 rounded-lg shadow-xl p-1.5 z-40 space-y-0.5">
              {EXTRA_SHAPES.map((shape) => {
                const entry = SHAPE_CATALOG.find((c) => c.shape === shape)!;
                return (
                  <button
                    key={shape}
                    type="button"
                    onClick={() => {
                      onAddShape(shape);
                      setMoreOpen(false);
                    }}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs text-slate-200 hover:bg-blue-600/20 hover:text-white rounded transition-colors cursor-pointer"
                  >
                    <span>{entry.label}</span>
                    <span className="text-[10px] text-slate-400">
                      {entry.isNativeRbxPart ? 'Native' : 'Mesh'}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Camera Views */}
      <div className="flex items-center gap-0.5 bg-[#0e1015] border border-white/10 rounded-md p-0.5 shrink-0">
        {(
          [
            { id: 'perspective', label: '3D' },
            { id: 'front', label: 'Front' },
            { id: 'top', label: 'Top' },
            { id: 'side', label: 'Side' },
          ] as const
        ).map((cam) => (
          <button
            key={cam.id}
            type="button"
            onClick={() => onCameraPreset(cam.id)}
            className="px-1.5 py-1 text-[11px] font-medium text-slate-300 hover:text-white hover:bg-white/5 rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {cam.label}
          </button>
        ))}
      </div>
    </div>
  );
}
