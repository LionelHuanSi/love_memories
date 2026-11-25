import type { Metadata } from 'next';
import Link from 'next/link';
import { Calendar, Heart, Sparkles, ArrowRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import StarBackgroundCanvas from '@/components/public/StarBackgroundCanvas';
import PublicHeader from '@/components/public/PublicHeader';
import { formatDate } from '@/lib/utils';
import type { Memory, MemoryMedia } from '@/lib/types/database';

export const metadata: Metadata = {
  title: 'Cột mốc Tình yêu — Memories',
  description: 'Những dấu mốc đáng nhớ nhất trên hành trình bên nhau.',
};

export default async function MilestonesPage() {
  const supabase = await createClient();
  const defaultSlug = process.env.DEFAULT_SPACE_SLUG || 'our-universe';

  const { data: space } = await supabase
    .from('spaces')
    .select('id, public_title, relationship_start_date, show_day_counter, theme')
    .eq('slug', defaultSlug)
    .maybeSingle();

  const publicTitle = space?.public_title || 'Our Little Universe';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const musicUrl = (space?.theme as any)?.musicUrl || null;

  // Calculate day counter
  let daysTogether: number | null = null;
  if (space?.show_day_counter && space.relationship_start_date) {
    const start = new Date(space.relationship_start_date).getTime();
    const now = new Date().getTime();
    daysTogether = Math.max(0, Math.floor((now - start) / (1000 * 60 * 60 * 24)));
  }

  // Fetch milestone memories
  const { data: milestoneMemoriesData } = await supabase
    .from('memories')
    .select(`
      id,
      slug,
      title,
      description,
      event_date,
      location_label,
      type,
      memory_media (
        id,
        storage_path,
        thumbnail_path
      )
    `)
    .eq('space_id', space?.id || '')
    .eq('type', 'milestone')
    .eq('visibility', 'published')
    .eq('is_archived', false)
    .order('event_date', { ascending: true });

  type MemoryWithMedia = Memory & { memory_media: MemoryMedia[] };
  const milestones: MemoryWithMedia[] = (milestoneMemoriesData as unknown as MemoryWithMedia[]) || [];

  return (
    <div className="min-h-screen flex flex-col justify-between cosmic-radial relative overflow-hidden">
      <StarBackgroundCanvas />
      <PublicHeader publicTitle={publicTitle} musicUrl={musicUrl} />

      <main className="relative z-10 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 space-y-10">
        <div className="text-center max-w-xl mx-auto space-y-3">
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-[#F8EBDD] tracking-tight glow-text">
            Cột Mốc Tình Yêu
          </h1>
          <p className="text-xs sm:text-sm text-[#9CA3AF] font-light">
            Những dấu chân đầu tiên và từng bước ngoặt quan trọng trên con đường cùng nhau.
          </p>
        </div>

        {/* Day Counter Big Banner (if enabled) */}
        {daysTogether !== null && (
          <div className="glass-panel-glow rounded-3xl p-8 text-center border border-[#F2A7C4]/30 max-w-lg mx-auto relative overflow-hidden">
            <div className="w-16 h-16 rounded-2xl bg-[#232946] border border-[#F2A7C4]/40 text-[#F2A7C4] mx-auto mb-4 flex items-center justify-center shadow-lg shadow-[#F2A7C4]/20">
              <Heart className="w-8 h-8 fill-[#F2A7C4]" />
            </div>

            <p className="text-xs uppercase tracking-widest text-[#9CA3AF] font-semibold mb-1">
              Hành trình bên nhau
            </p>
            <p className="text-4xl sm:text-5xl font-serif font-extrabold text-[#F8EBDD] tracking-tight mb-2">
              <span className="text-[#F2A7C4]">{daysTogether}</span> ngày
            </p>
            {space?.relationship_start_date && (
              <p className="text-xs text-[#A78BFA] font-medium">
                Kể từ ngày {formatDate(space.relationship_start_date)}
              </p>
            )}
          </div>
        )}

        {/* Milestones Listing */}
        {milestones.length === 0 ? (
          <div className="glass-panel rounded-3xl p-10 text-center border border-[#2C335E] max-w-md mx-auto">
            <Sparkles className="w-8 h-8 text-[#A78BFA] mx-auto mb-3" />
            <h3 className="text-base font-serif font-bold text-[#F8EBDD] mb-1">
              Chưa có cột mốc riêng biệt
            </h3>
            <p className="text-xs text-[#9CA3AF] mb-4">
              Các kỷ niệm được đánh dấu thể loại Cột mốc sẽ được tổng hợp tự động tại đây.
            </p>
            <Link
              href="/story"
              className="text-xs text-[#A78BFA] hover:text-[#F2A7C4] font-medium transition-colors"
            >
              Xem tất cả kỷ niệm trong Dòng thời gian →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {milestones.map((item) => (
              <div
                key={item.id}
                className="glass-panel rounded-2xl p-5 border border-[#2C335E] hover:border-[#F2A7C4]/50 transition-all flex flex-col justify-between group shadow-md"
              >
                <div>
                  <div className="flex items-center gap-1.5 text-xs text-[#A78BFA] font-medium mb-2">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{formatDate(item.event_date)}</span>
                  </div>

                  <h3 className="font-serif font-bold text-lg text-[#F8EBDD] group-hover:text-[#F2A7C4] transition-colors mb-2">
                    {item.title}
                  </h3>

                  {item.description && (
                    <p className="text-xs text-[#9CA3AF] line-clamp-2 font-light">
                      {item.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <footer className="relative z-10 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#9CA3AF] border-t border-[#2C335E]/40">
        <p className="flex items-center gap-1.5">
          <span>Made with love</span>
          <Heart className="w-3.5 h-3.5 text-[#F2A7C4] fill-[#F2A7C4]" />
        </p>

        <Link
          href="/studio"
          className="inline-flex items-center gap-1.5 text-[#9CA3AF] hover:text-[#A78BFA] transition-colors"
        >
          <span>Quản lý Kỷ niệm</span>
        </Link>
      </footer>
    </div>
  );
}
