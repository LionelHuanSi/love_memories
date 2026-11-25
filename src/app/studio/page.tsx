import Link from 'next/link';
import { Plus, Globe, Lock, FileText, Calendar, Image as ImageIcon, MapPin } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { formatShortDate } from '@/lib/utils';
import type { Memory, MemoryMedia } from '@/lib/types/database';

export default async function StudioDashboard() {
  const supabase = await createClient();
  const defaultSlug = process.env.DEFAULT_SPACE_SLUG || 'our-universe';
  const { data: space } = await supabase
    .from('spaces')
    .select('id')
    .eq('slug', defaultSlug)
    .maybeSingle();

  const spaceId = space?.id || 'a0000000-0000-0000-0000-000000000001';

  // Fetch all memories in this space ordered by event_date ASCENDING (matching constellation order #1 -> #5)
  const { data: memoriesData } = await supabase
    .from('memories')
    .select(`
      id,
      slug,
      title,
      description,
      event_date,
      location_label,
      type,
      visibility,
      is_archived,
      created_at,
      memory_media (
        id,
        storage_path,
        thumbnail_path
      )
    `)
    .eq('space_id', spaceId)
    .order('event_date', { ascending: true });

  type MemoryWithMedia = Memory & { memory_media: MemoryMedia[] };
  const memories: MemoryWithMedia[] = (memoriesData as unknown as MemoryWithMedia[]) || [];

  const totalCount = memories.length;
  const publishedCount = memories.filter((m) => m.visibility === 'published' && !m.is_archived).length;
  const privateCount = memories.filter((m) => m.visibility === 'private' && !m.is_archived).length;
  const draftCount = memories.filter((m) => m.visibility === 'draft' && !m.is_archived).length;

  return (
    <div className="space-y-8">
      {/* Top Banner & Quick Stats */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-200 pb-6">
        <div>
          <h1 className="text-2xl font-serif font-bold text-zinc-900 tracking-tight">
            Quản Lý Kỷ Niệm & Chòm Sao
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Không gian lưu giữ từng vì sao và khoảnh khắc tình yêu của hai bạn.
          </p>
        </div>
        <Link
          href="/studio/memories/new"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-black text-white text-xs font-bold uppercase tracking-wider rounded-none hover:bg-zinc-800 transition-colors border border-black shadow-none"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm kỷ niệm mới</span>
        </Link>
      </div>

      {/* Metric Cards: Clean Minimalist Square */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white p-4 border border-zinc-300 rounded-none">
          <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-1">Tổng số kỷ niệm</p>
          <p className="text-2xl font-bold text-zinc-900">{totalCount}</p>
        </div>
        <div className="bg-white p-4 border border-zinc-300 rounded-none">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-700">Đã xuất bản</p>
            <Globe className="w-3.5 h-3.5 text-zinc-700" />
          </div>
          <p className="text-2xl font-bold text-zinc-900">{publishedCount}</p>
        </div>
        <div className="bg-white p-4 border border-zinc-300 rounded-none">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-700">Riêng tư</p>
            <Lock className="w-3.5 h-3.5 text-zinc-700" />
          </div>
          <p className="text-2xl font-bold text-zinc-900">{privateCount}</p>
        </div>
        <div className="bg-white p-4 border border-zinc-300 rounded-none">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-700">Bản nháp</p>
            <FileText className="w-3.5 h-3.5 text-zinc-700" />
          </div>
          <p className="text-2xl font-bold text-zinc-900">{draftCount}</p>
        </div>
      </div>

      {/* Memories Listing */}
      {memories.length === 0 ? (
        <div className="bg-white p-12 text-center border border-zinc-300 rounded-none max-w-xl mx-auto">
          <h3 className="text-base font-bold text-zinc-900 mb-1 uppercase tracking-wider">
            Chưa có kỷ niệm nào
          </h3>
          <p className="text-xs text-zinc-500 mb-6">
            Hãy bắt đầu thắp sáng những vì sao đầu tiên trên bầu trời của hai bạn.
          </p>
          <Link
            href="/studio/memories/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-black text-white text-xs font-bold uppercase tracking-wider rounded-none hover:bg-zinc-800 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Tạo kỷ niệm đầu tiên
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {memories.map((memory) => {
            const mediaCount = memory.memory_media?.length || 0;
            const firstPhoto = memory.memory_media?.[0];
            const displayPhotoSrc = firstPhoto?.storage_path?.startsWith('http') ||
              firstPhoto?.storage_path?.startsWith('/') ||
              firstPhoto?.storage_path?.startsWith('data:')
                ? firstPhoto.storage_path
                : firstPhoto?.id
                ? `/api/media/${firstPhoto.id}?thumb=1`
                : null;

            return (
              <div
                key={memory.id}
                className="bg-white border border-zinc-300 rounded-none hover:border-black transition-colors flex flex-col justify-between"
              >
                <div>
                  {/* Photo Thumbnail if available */}
                  {displayPhotoSrc && (
                    <div className="w-full h-36 bg-zinc-100 border-b border-zinc-200 overflow-hidden relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={displayPhotoSrc}
                        alt={memory.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  <div className="p-5">
                    {/* Header Badges: Status */}
                    <div className="flex items-center justify-end gap-2 mb-3">

                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase rounded-none border ${
                          memory.visibility === 'published'
                            ? 'bg-zinc-100 text-zinc-800 border-zinc-300'
                            : memory.visibility === 'private'
                            ? 'bg-amber-50 text-amber-900 border-amber-200'
                            : 'bg-zinc-50 text-zinc-500 border-zinc-200'
                        }`}
                      >
                        {memory.visibility === 'published' ? (
                          <>
                            <Globe className="w-3 h-3" />
                            Xuất bản
                          </>
                        ) : memory.visibility === 'private' ? (
                          <>
                            <Lock className="w-3 h-3" />
                            Riêng tư
                          </>
                        ) : (
                          <>
                            <FileText className="w-3 h-3" />
                            Bản nháp
                          </>
                        )}
                      </span>
                    </div>

                    {/* Date & Location */}
                    <div className="flex items-center gap-3 text-xs text-zinc-500 mb-2">
                      <span className="flex items-center gap-1 font-semibold text-zinc-800">
                        <Calendar className="w-3.5 h-3.5 text-zinc-600" />
                        {formatShortDate(memory.event_date)}
                      </span>
                      {memory.location_label && (
                        <span className="flex items-center gap-1 truncate text-zinc-500">
                          <MapPin className="w-3 h-3 text-zinc-400" />
                          <span className="truncate">{memory.location_label}</span>
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h3 className="font-serif font-bold text-base text-zinc-900 mb-1.5 line-clamp-1">
                      {memory.title}
                    </h3>

                    {/* Description excerpt */}
                    {memory.description && (
                      <p className="text-xs text-zinc-600 line-clamp-2 leading-relaxed mb-3">
                        {memory.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="px-5 py-3 border-t border-zinc-200 bg-zinc-50 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-zinc-600">
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>{mediaCount} ảnh</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      href={`/studio/memories/${memory.id}/edit`}
                      className="px-3 py-1 bg-white border border-zinc-300 text-zinc-900 hover:bg-black hover:text-white hover:border-black transition-colors font-semibold text-xs rounded-none"
                    >
                      Chỉnh sửa
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
