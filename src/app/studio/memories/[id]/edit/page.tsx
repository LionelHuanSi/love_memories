import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import MemoryEditorForm from '@/components/studio/MemoryEditorForm';
import type { Memory, MemoryMedia } from '@/lib/types/database';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function EditMemoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: memoryId } = await params;
  const supabase = await createClient();
  const { data: memoryData, error } = await supabase
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
    .eq('id', memoryId)
    .maybeSingle();

  if (error || !memoryData) {
    notFound();
  }

  type MemoryWithMedia = Memory & { memory_media: MemoryMedia[] };
  const memory = memoryData as unknown as MemoryWithMedia;

  if (memory.memory_media) {
    memory.memory_media.sort((a, b) => a.sort_order - b.sort_order);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 border-b border-zinc-200 pb-4">
        <Link
          href="/studio"
          className="p-2 bg-white border border-zinc-300 text-zinc-700 hover:text-black hover:border-black transition-colors rounded-none"
          title="Quay lại danh sách"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-serif font-bold text-zinc-900 flex items-center gap-2">
            <span>Chỉnh Sửa Kỷ Niệm</span>
          </h1>
          <p className="text-xs text-zinc-500 truncate max-w-md mt-0.5">
            &ldquo;{memory.title}&rdquo;
          </p>
        </div>
      </div>

      <MemoryEditorForm initialData={memory} isEditMode={true} />
    </div>
  );
}
