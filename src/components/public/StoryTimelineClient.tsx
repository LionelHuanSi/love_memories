'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Calendar, MapPin, Sparkles, ArrowRight, Image as ImageIcon, Heart } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import type { Memory, MemoryMedia } from '@/lib/types/database';

interface StoryTimelineClientProps {
  memories: (Memory & { memory_media?: MemoryMedia[] })[];
}

export default function StoryTimelineClient({ memories }: StoryTimelineClientProps) {
  const [selectedYear, setSelectedYear] = useState<string>('all');

  // Extract unique years
  const availableYears = useMemo(() => {
    const yearsSet = new Set<string>();
    for (const mem of memories) {
      if (mem.event_date) {
        yearsSet.add(mem.event_date.split('-')[0]);
      }
    }
    return Array.from(yearsSet).sort((a, b) => Number(b) - Number(a));
  }, [memories]);

  // Filter memories by selected year
  const filteredMemories = useMemo(() => {
    if (selectedYear === 'all') return memories;
    return memories.filter((m) => m.event_date.startsWith(selectedYear));
  }, [memories, selectedYear]);

  // Group by year and month
  const groupedMemories = useMemo(() => {
    const groups: { [year: string]: (Memory & { memory_media?: MemoryMedia[] })[] } = {};
    for (const mem of filteredMemories) {
      const year = mem.event_date.split('-')[0];
      if (!groups[year]) groups[year] = [];
      groups[year].push(mem);
    }
    return groups;
  }, [filteredMemories]);

  if (memories.length === 0) {
    return (
      <div className="glass-panel rounded-3xl p-10 sm:p-12 text-center border border-[#2C335E] max-w-lg mx-auto my-12">
        <div className="w-16 h-16 rounded-2xl bg-[#232946] border border-[#A78BFA]/30 text-[#A78BFA] mx-auto mb-4 flex items-center justify-center">
          <Sparkles className="w-8 h-8 animate-pulse" />
        </div>
        <h3 className="text-xl font-serif font-bold text-[#F8EBDD] mb-2">
          Chưa Có Kỷ Niệm Nào Được Xuất Bản
        </h3>
        <p className="text-sm text-[#9CA3AF] mb-6">
          Những mốc thời gian đáng nhớ sẽ xuất hiện tại đây khi hai bạn xuất bản câu chuyện đầu tiên.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#A78BFA] to-[#F2A7C4] text-[#090E20] text-xs font-bold shadow active:scale-95 transition-all"
        >
          Trở về Vũ trụ sao
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      {/* Year Filter Buttons with horizontal swipe */}
      {availableYears.length > 1 && (
        <div className="flex items-center justify-start sm:justify-center gap-2 overflow-x-auto py-2 px-1 no-scrollbar touch-pan-x">
          <button
            type="button"
            onClick={() => setSelectedYear('all')}
            className={`px-4 py-2 rounded-full text-xs font-medium shrink-0 transition-all active:scale-95 ${selectedYear === 'all'
                ? 'bg-[#A78BFA] text-[#090E20] font-semibold shadow-md'
                : 'bg-[#121833] border border-[#2C335E] text-[#9CA3AF] hover:text-[#F8EBDD]'
              }`}
          >
            Tất cả các năm
          </button>
          {availableYears.map((yr) => (
            <button
              key={yr}
              type="button"
              onClick={() => setSelectedYear(yr)}
              className={`px-4 py-2 rounded-full text-xs font-medium shrink-0 transition-all active:scale-95 ${selectedYear === yr
                  ? 'bg-[#A78BFA] text-[#090E20] font-semibold shadow-md'
                  : 'bg-[#121833] border border-[#2C335E] text-[#9CA3AF] hover:text-[#F8EBDD]'
                }`}
            >
              Năm {yr}
            </button>
          ))}
        </div>
      )}


      {/* Timeline Stream */}
      <div className="relative pl-6 sm:pl-8 space-y-12 before:absolute before:left-2 sm:before:left-3 before:top-3 before:bottom-3 before:w-0.5 before:bg-gradient-to-b before:from-[#A78BFA] before:via-[#F2A7C4] before:to-transparent">
        {Object.keys(groupedMemories).map((year) => (
          <div key={year} className="space-y-6">
            {/* Year Group Header */}
            <div className="relative -left-6 sm:-left-8 flex items-center gap-3">
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#A78BFA] text-[#090E20] font-bold text-xs flex items-center justify-center shadow-md shadow-[#A78BFA]/30">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#F8EBDD] tracking-wide">
                Năm {year}
              </h2>
            </div>

            {/* Year Memories Cards */}
            <div className="space-y-6">
              {groupedMemories[year].map((memory) => {
                const coverMedia = memory.memory_media && memory.memory_media.length > 0 ? memory.memory_media[0] : null;
                const mediaCount = memory.memory_media?.length || 0;
                const isMilestone = memory.type === 'milestone';

                return (
                  <div
                    key={memory.id}
                    className="relative group glass-panel rounded-3xl p-5 sm:p-6 border border-[#2C335E] hover:border-[#A78BFA]/50 transition-all duration-300 shadow-lg hover:shadow-[#A78BFA]/10 flex flex-col sm:flex-row gap-5"
                  >
                    {/* Cover Photo */}
                    {coverMedia && (
                      <div className="relative w-full sm:w-48 h-48 rounded-2xl overflow-hidden shrink-0 border border-[#2C335E]">
                        <Image
                          src={`/api/media/${coverMedia.id}?thumb=1`}
                          alt={memory.title}
                          fill
                          sizes="(max-width: 640px) 100vw, 192px"
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                          unoptimized
                        />
                        {mediaCount > 1 && (
                          <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-lg bg-[#090E20]/80 backdrop-blur-md text-[10px] text-[#F8EBDD] flex items-center gap-1 border border-white/10">
                            <ImageIcon className="w-3 h-3 text-[#A78BFA]" />
                            <span>{mediaCount}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Card Content */}
                    <div className="flex-1 flex flex-col justify-between min-w-0 space-y-3">
                      <div>
                        {/* Meta Tags */}
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className="inline-flex items-center gap-1 text-xs text-[#A78BFA] font-medium">
                            <Calendar className="w-3.5 h-3.5" />
                            {formatDate(memory.event_date)}
                          </span>

                          {memory.location_label && (
                            <span className="inline-flex items-center gap-1 text-xs text-[#9CA3AF]">
                              <MapPin className="w-3.5 h-3.5" />
                              {memory.location_label}
                            </span>
                          )}

                          {isMilestone && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#F2A7C4]/20 text-[#F2A7C4] text-[10px] font-semibold border border-[#F2A7C4]/30">
                              <Heart className="w-3 h-3 fill-current" />
                              Cột mốc
                            </span>
                          )}
                        </div>

                        {/* Title */}
                        <h3 className="font-serif font-bold text-lg sm:text-xl text-[#F8EBDD] leading-snug">
                          {memory.title}
                        </h3>

                        {/* Narrative Excerpt */}
                        {memory.description && (
                          <p className="text-xs sm:text-sm text-[#9CA3AF] line-clamp-3 leading-relaxed mt-2 font-light">
                            {memory.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
