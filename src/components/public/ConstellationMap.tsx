'use client';

import { useState, useCallback, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Node,
  type Edge,
  type NodeMouseHandler,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  Sparkles,
  Calendar,
  MapPin,
  ArrowRight,
  X,
  List,
  Heart,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from 'lucide-react';
import StarNode, { type StarNodeData } from './StarNode';
import { formatShortDate } from '@/lib/utils';

interface ConstellationMapProps {
  initialNodes: Node[];
  initialEdges: Edge[];
}

function ConstellationMapControls() {
  const { zoomIn, zoomOut, fitView } = useReactFlow();

  return (
    <div className="absolute bottom-4 right-4 z-20 flex flex-col gap-1.5 p-1 rounded-2xl bg-[#121833]/90 border border-[#2C335E]/80 backdrop-blur-md shadow-xl">
      <button
        type="button"
        onClick={() => zoomIn({ duration: 300 })}
        className="w-10 h-10 sm:w-8 sm:h-8 flex items-center justify-center rounded-xl text-[#F8EBDD] hover:bg-[#232946] active:bg-[#A78BFA] active:text-[#090E20] transition-colors"
        title="Phóng to"
        aria-label="Phóng to bản đồ sao"
      >
        <ZoomIn className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => zoomOut({ duration: 300 })}
        className="w-10 h-10 sm:w-8 sm:h-8 flex items-center justify-center rounded-xl text-[#F8EBDD] hover:bg-[#232946] active:bg-[#A78BFA] active:text-[#090E20] transition-colors"
        title="Thu nhỏ"
        aria-label="Thu nhỏ bản đồ sao"
      >
        <ZoomOut className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => fitView({ duration: 400, padding: 0.25 })}
        className="w-10 h-10 sm:w-8 sm:h-8 flex items-center justify-center rounded-xl text-[#F8EBDD] hover:bg-[#232946] active:bg-[#A78BFA] active:text-[#090E20] transition-colors"
        title="Căn giữa toàn cảnh"
        aria-label="Căn giữa toàn cảnh bản đồ sao"
      >
        <Maximize2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function ConstellationMapInner({ initialNodes, initialEdges }: ConstellationMapProps) {
  const [selectedStar, setSelectedStar] = useState<StarNodeData | null>(null);

  const nodeTypes = useMemo(() => ({ starNode: StarNode }), []);

  const onNodeClick: NodeMouseHandler = useCallback((_, node) => {
    setSelectedStar(node.data as unknown as StarNodeData);
  }, []);

  if (!initialNodes || initialNodes.length === 0) {
    return (
      <div className="relative z-10 flex flex-col items-center justify-center min-h-[460px] px-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#232946] border border-[#A78BFA]/30 text-[#A78BFA] flex items-center justify-center mb-4 shadow-lg shadow-[#A78BFA]/10">
          <Sparkles className="w-8 h-8 animate-pulse" />
        </div>
        <h3 className="text-xl font-serif font-bold text-[#F8EBDD] mb-2">
          Bầu Trời Kỷ Niệm Đang Chờ Đón
        </h3>
        <p className="text-sm text-[#9CA3AF] max-w-md mx-auto mb-6">
          Những vì sao đầu tiên sẽ sớm được thắp sáng trên dải ngân hà của hai bạn.
        </p>
        <Link
          href="/story"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#232946] border border-[#2C335E] text-xs font-medium text-[#F8EBDD] hover:border-[#A78BFA]/50 transition-all"
        >
          <List className="w-4 h-4" />
          <span>Xem dòng thời gian</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[500px] sm:h-[620px] lg:h-[720px] rounded-3xl overflow-hidden border border-[#2C335E]/60 bg-[#090E20]/40 backdrop-blur-sm">
      {/* React Flow Viewport */}
      <ReactFlow
        nodes={initialNodes}
        edges={initialEdges}
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClick}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        minZoom={0.25}
        maxZoom={2.2}
        preventScrolling={false}
        proOptions={{ hideAttribution: true }}
        className="touch-manipulation"
      >
        <ConstellationMapControls />
      </ReactFlow>

      {/* Floating Timeline Switcher */}
      <div className="absolute top-4 right-4 z-20">
        <Link
          href="/story"
          className="inline-flex items-center gap-1.5 px-3.5 py-2.5 sm:py-2 rounded-xl bg-[#121833]/90 hover:bg-[#232946] border border-[#A78BFA]/30 text-xs font-semibold text-[#F8EBDD] shadow-lg backdrop-blur-md transition-all active:scale-95"
        >
          <List className="w-4 h-4 text-[#A78BFA]" />
          <span>Dòng thời gian</span>
        </Link>
      </div>

      {/* Floating Gesture Hint */}
      <div className="absolute top-4 left-4 z-20 pointer-events-none">
        <div className="px-3 py-1.5 rounded-full bg-[#121833]/85 border border-[#2C335E] backdrop-blur-md text-[11px] text-[#A78BFA] flex items-center gap-1.5 shadow-md">
          <Sparkles className="w-3 h-3 text-[#F2A7C4] animate-pulse" />
          <span>Chạm vào vì sao để mở câu chuyện</span>
        </div>
      </div>

      {/* Mobile Drawer Backdrop */}
      {selectedStar && (
        <div
          onClick={() => setSelectedStar(null)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 sm:hidden animate-in fade-in duration-200"
          aria-hidden="true"
        />
      )}

      {/* Selected Star Preview: Bottom Sheet on Mobile, Floating Card on Desktop */}
      {selectedStar && (
        <div className="fixed bottom-0 left-0 right-0 z-50 sm:absolute sm:bottom-4 sm:left-auto sm:right-4 sm:w-96 animate-in slide-in-from-bottom duration-300">
          <div className="glass-panel-glow rounded-t-3xl sm:rounded-3xl p-5 sm:p-5 border-t sm:border border-[#A78BFA]/40 shadow-2xl backdrop-blur-2xl relative overflow-hidden max-h-[85vh] overflow-y-auto">
            {/* Mobile Drag Handle */}
            <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-3 sm:hidden" />

            {/* Close button */}
            <button
              type="button"
              onClick={() => setSelectedStar(null)}
              className="absolute top-3.5 right-3.5 p-2 rounded-full bg-[#090E20]/80 text-[#9CA3AF] hover:text-[#F8EBDD] border border-[#2C335E] transition-colors"
              title="Đóng xem trước"
              aria-label="Đóng xem trước"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Thumbnail preview if exists */}
            {selectedStar.coverMediaId && (
              <div className="relative w-full h-40 sm:h-36 rounded-2xl overflow-hidden mb-3.5 border border-[#2C335E]">
                <Image
                  src={`/api/media/${selectedStar.coverMediaId}?thumb=1`}
                  alt={selectedStar.title}
                  fill
                  sizes="(max-width: 640px) 100vw, 384px"
                  className="object-cover"
                  unoptimized
                />
              </div>
            )}

            {/* Content Info */}
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 text-[11px] text-[#A78BFA] font-medium">
                  <Calendar className="w-3 h-3" />
                  {formatShortDate(selectedStar.event_date)}
                </span>
                {selectedStar.location_label && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-[#9CA3AF]">
                    <MapPin className="w-3 h-3" />
                    {selectedStar.location_label}
                  </span>
                )}
                {selectedStar.isMilestone && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#F2A7C4]/20 text-[#F2A7C4] text-[10px] font-semibold border border-[#F2A7C4]/30">
                    <Heart className="w-2.5 h-2.5 fill-current" />
                    Cột mốc
                  </span>
                )}
              </div>

              <h4 className="font-serif font-bold text-base sm:text-lg text-[#F8EBDD] line-clamp-2 leading-snug">
                {selectedStar.title}
              </h4>

              {selectedStar.descriptionExcerpt && (
                <p className="text-xs text-[#9CA3AF] line-clamp-2 leading-relaxed">
                  {selectedStar.descriptionExcerpt}...
                </p>
              )}

              <div className="pt-2">
                <Link
                  href="/"
                  className="w-full inline-flex items-center justify-center gap-2 h-11 sm:h-10 px-4 rounded-xl bg-gradient-to-r from-[#A78BFA] to-[#F2A7C4] text-[#090E20] text-xs font-bold shadow hover:opacity-95 active:scale-[0.99] transition-all"
                >
                  <span>Khám phá vũ trụ 3D</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ConstellationMap(props: ConstellationMapProps) {
  return (
    <ReactFlowProvider>
      <ConstellationMapInner {...props} />
    </ReactFlowProvider>
  );
}

