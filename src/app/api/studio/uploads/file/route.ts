import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const memoryId = formData.get('memoryId') as string | null;

    if (!file || !memoryId) {
      return NextResponse.json(
        { error: 'Thiếu file hoặc memoryId' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // 1. Validate file extension & mime
    const originalName = file.name || 'photo.jpg';
    const ext = originalName.split('.').pop()?.toLowerCase() || 'jpg';
    const cleanExt = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext) ? ext : 'jpg';

    // 2. Generate unique local filename
    const timestamp = Date.now();
    const randomHex = Math.random().toString(36).substring(2, 8);
    const filename = `${timestamp}-${randomHex}.${cleanExt}`;

    // 3. Save file (locally for dev mock, or to Supabase Storage for production cloud)
    const isMock = !process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('dummy-project');

    let publicUrl = '';
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (isMock) {
      const uploadDir = path.join(process.cwd(), 'public', 'uploads');
      await fs.mkdir(uploadDir, { recursive: true });
      const filePath = path.join(uploadDir, filename);
      await fs.writeFile(filePath, buffer);
      publicUrl = `/uploads/${filename}`;
    } else {
      const { createAdminClient } = await import('@/lib/supabase/admin');
      const admin = createAdminClient();
      const storagePath = `memories/${memoryId}/${filename}`;
      const { error: uploadError } = await admin.storage
        .from('memories-media')
        .upload(storagePath, buffer, {
          contentType: file.type || 'image/jpeg',
          upsert: true,
        });

      if (uploadError) {
        return NextResponse.json({ error: uploadError.message }, { status: 500 });
      }

      const { data: urlData } = admin.storage.from('memories-media').getPublicUrl(storagePath);
      publicUrl = urlData.publicUrl;
    }

    // 4. Query current sort order
    const { data: lastMedia } = await supabase
      .from('memory_media')
      .select('sort_order')
      .eq('memory_id', memoryId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextSortOrder = (lastMedia?.sort_order ?? -1) + 1;

    // 5. Register into database
    const { data: media, error: insertError } = await supabase
      .from('memory_media')
      .insert({
        memory_id: memoryId,
        storage_path: publicUrl,
        thumbnail_path: publicUrl,
        mime_type: file.type || 'image/jpeg',
        file_size_bytes: file.size || buffer.length,
        sort_order: nextSortOrder,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      media,
      url: publicUrl,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Lỗi khi tải ảnh lên';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
