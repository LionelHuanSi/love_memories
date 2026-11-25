import type { Metadata } from 'next';
import Link from 'next/link';
import { Heart } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import StarBackgroundCanvas from '@/components/public/StarBackgroundCanvas';
import PublicHeader from '@/components/public/PublicHeader';
import StoryTimelineClient from '@/components/public/StoryTimelineClient';
import type { Memory, MemoryMedia } from '@/lib/types/database';

export const metadata: Metadata = {
  title: 'Dòng thời gian Kỷ niệm — Memories',
  description: 'Những câu chuyện và dấu mốc thời gian không thể nào quên.',
};

export default async function StoryPage() {
  const supabase = await createClient();
  const defaultSlug = process.env.DEFAULT_SPACE_SLUG || 'our-universe';

  const { data: space } = await supabase
    .from('spaces')
    .select('id, public_title, theme')
    .eq('slug', defaultSlug)
    .maybeSingle();

  const publicTitle = space?.public_title || 'Our Little Universe';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const musicUrl = (space?.theme as any)?.musicUrl || null;

  // Fetch published memories
  const { data: memoriesData } = await supabase
    .from('memories')
    .select(`
      id,
      space_id,
      slug,
      title,
      description,
      event_date,
      location_label,
      type,
      visibility,
      is_archived,
      constellation_id,
      created_by,
      updated_by,
      created_at,
      updated_at,
      published_at,
      memory_media (
        id,
        memory_id,
        storage_path,
        thumbnail_path,
        mime_type,
        file_size_bytes,
        width,
        height,
        alt_text,
        sort_order,
        created_at
      )
    `)
    .eq('space_id', space?.id || '')
    .eq('visibility', 'published')
    .eq('is_archived', false)
    .order('event_date', { ascending: false });

  type MemoryWithMedia = Memory & { memory_media: MemoryMedia[] };
  const memories: MemoryWithMedia[] = (memoriesData as unknown as MemoryWithMedia[]) || [];

  return (
    <div className="min-h-screen flex flex-col justify-between cosmic-radial relative overflow-hidden">
      <StarBackgroundCanvas />
      <PublicHeader publicTitle={publicTitle} musicUrl={musicUrl} />

      <main className="relative z-10 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1">
        <div className="text-center max-w-xl mx-auto mb-10 space-y-2">
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-[#F8EBDD] tracking-tight glow-text">
            Dòng Thời Gian
          </h1>
          <p className="text-xs sm:text-sm text-[#9CA3AF] font-light">
            Từng khoảnh khắc trôi qua đều được khắc ghi lại thành những ký ức vĩnh cửu.
          </p>
        </div>

        <StoryTimelineClient memories={memories} />
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
