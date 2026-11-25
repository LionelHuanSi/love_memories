import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { registerMediaSchema, reorderMediaSchema } from '@/lib/validations/memory';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: memoryId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: member, error: memberError } = await supabase
      .from('space_members')
      .select('space_id')
      .eq('user_id', user.id)
      .single();

    if (memberError || !member) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const rawBody = await request.json();
    const validated = registerMediaSchema.parse(rawBody);

    // Get current max sort_order
    const { data: lastMedia } = await supabase
      .from('memory_media')
      .select('sort_order')
      .eq('memory_id', memoryId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextSortOrder = validated.sort_order || ((lastMedia?.sort_order ?? -1) + 1);

    const { data: media, error: insertError } = await supabase
      .from('memory_media')
      .insert({
        memory_id: memoryId,
        storage_path: validated.storage_path,
        thumbnail_path: validated.thumbnail_path || null,
        mime_type: validated.mime_type,
        file_size_bytes: validated.file_size_bytes,
        width: validated.width || null,
        height: validated.height || null,
        alt_text: validated.alt_text || null,
        sort_order: nextSortOrder,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, media }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: memoryId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: member, error: memberError } = await supabase
      .from('space_members')
      .select('space_id')
      .eq('user_id', user.id)
      .single();

    if (memberError || !member) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const rawBody = await request.json();
    const { mediaIds } = reorderMediaSchema.parse(rawBody);

    // Update sort_order for each media ID
    for (let index = 0; index < mediaIds.length; index++) {
      const mediaId = mediaIds[index];
      await supabase
        .from('memory_media')
        .update({ sort_order: index })
        .eq('id', mediaId)
        .eq('memory_id', memoryId);
    }

    return NextResponse.json({ success: true, message: 'Thứ tự ảnh đã được cập nhật' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: memoryId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: member, error: memberError } = await supabase
      .from('space_members')
      .select('space_id')
      .eq('user_id', user.id)
      .single();

    if (memberError || !member) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const url = new URL(request.url);
    const mediaId = url.searchParams.get('mediaId');

    if (!mediaId) {
      return NextResponse.json({ error: 'Thiếu mediaId cần xóa' }, { status: 400 });
    }

    // 1. Fetch media item to get storage paths
    const { data: media, error: findError } = await supabase
      .from('memory_media')
      .select('id, storage_path, thumbnail_path')
      .eq('id', mediaId)
      .eq('memory_id', memoryId)
      .single();

    if (findError || !media) {
      return NextResponse.json({ error: 'Ảnh không tồn tại' }, { status: 404 });
    }

    // 2. Remove physical storage files safely (local fs or Supabase)
    const paths = [media.storage_path];
    if (media.thumbnail_path) paths.push(media.thumbnail_path);

    // Clean up local files from public/uploads
    for (const p of paths) {
      if (p && p.startsWith('/uploads/')) {
        try {
          const localPath = path.join(process.cwd(), 'public', p.replace(/^\//, ''));
          await fs.unlink(localPath).catch(() => {});
        } catch {
          // ignore local unlink errors
        }
      }
    }

    // Only invoke supabase storage for actual cloud storage paths
    const cloudKeys = paths.filter(
      (p) => p && !p.startsWith('http://') && !p.startsWith('https://') && !p.startsWith('/')
    );
    if (cloudKeys.length > 0) {
      try {
        const admin = createAdminClient();
        await admin.storage.from('memories-media').remove(cloudKeys);
      } catch (storageErr) {
        console.warn('Storage remove skipped or failed:', storageErr);
      }
    }

    // 3. Remove row from database
    const { error: deleteError } = await supabase
      .from('memory_media')
      .delete()
      .eq('id', mediaId);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Ảnh đã được xóa thành công' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
