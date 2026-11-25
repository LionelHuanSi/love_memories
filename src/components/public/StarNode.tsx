'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Sparkles, Heart } from 'lucide-react';
import { formatShortDate, formatDate } from '@/lib/utils';

export interface StarNodeData {
  id: string;
  slug: string;
  title: string;
  event_date: string;
  type: string;
  location_label?: string | null;
  coverMediaId: string | null;
  isMilestone: boolean;
  descriptionExcerpt: string;
  [key: string]: unknown;
}

function StarNodeComponent({ data, selected }: NodeProps) {
  const nodeData = data as unknown as StarNodeData;
  const isMilestone = !!nodeData.isMilestone;

  return (
    <div
      className={`group relative cursor-pointer flex flex-col items-center select-none transition-transform duration-300 active:scale-95 touch-manipulation ${
        selected ? 'scale-125' : 'hover:scale-115'
      }`}
      role="button"
      tabIndex={0}
      aria-label={`Kỷ niệm: ${nodeData.title}, ngày ${formatDate(nodeData.event_date)}`}
    >
      {/* Hidden Handles for React Flow Edge Connections */}
      <Handle
        type="target"
        position={Position.Top}
        className="!opacity-0 !w-1 !h-1 !border-0"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!opacity-0 !w-1 !h-1 !border-0"
      />

      {/* Expanded Invisible Touch Target (WCAG AA: min 48x48px) */}
      <div className="relative min-w-[52px] min-h-[52px] flex items-center justify-center">
        {/* Outer Glow Halo */}
        <div
          className={`absolute rounded-full pointer-events-none transition-all duration-500 ${
            isMilestone
              ? 'w-16 h-16 bg-[#F2A7C4]/30 blur-xl group-hover:bg-[#F2A7C4]/50 animate-pulse'
              : 'w-12 h-12 bg-[#A78BFA]/25 blur-lg group-hover:bg-[#A78BFA]/45'
          } ${selected ? 'ring-2 ring-white/70 scale-110' : ''}`}
        />

        {/* Star Node Core */}
        <div
          className={`relative z-10 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg ${
            isMilestone
              ? 'w-10 h-10 bg-gradient-to-tr from-[#F2A7C4] to-[#F8EBDD] shadow-[#F2A7C4]/40 text-[#090E20]'
              : 'w-8 h-8 bg-gradient-to-tr from-[#A78BFA] to-[#F8EBDD] shadow-[#A78BFA]/30 text-[#090E20]'
          }`}
        >
          {isMilestone ? (
            <Heart className="w-4 h-4 fill-current animate-bounce" />
          ) : (
            <Sparkles className="w-3.5 h-3.5" />
          )}
        </div>
      </div>

      {/* Title & Date Label Pill */}
      <div className="mt-1 px-3 py-1 rounded-full bg-[#121833]/90 border border-[#2C335E]/80 backdrop-blur-md shadow-lg text-center max-w-[160px] pointer-events-none transition-all duration-200 group-hover:border-[#A78BFA]/60">
        <p className="text-[11px] font-medium text-[#F8EBDD] truncate leading-tight">
          {nodeData.title}
        </p>
        <p className="text-[9px] text-[#A78BFA] mt-0.5">
          {formatShortDate(nodeData.event_date)}
        </p>
      </div>
    </div>
  );
}

export default memo(StarNodeComponent);

