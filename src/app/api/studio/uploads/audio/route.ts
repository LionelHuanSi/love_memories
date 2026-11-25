import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Chưa chọn file âm thanh' }, { status: 400 });
    }

    const originalName = file.name || 'song.mp3';
    const ext = originalName.split('.').pop()?.toLowerCase() || 'mp3';
    const validExts = ['mp3', 'm4a', 'wav', 'ogg', 'aac'];
    const cleanExt = validExts.includes(ext) ? ext : 'mp3';

    const timestamp = Date.now();
    const randomHex = Math.random().toString(36).substring(2, 8);
    const filename = `${timestamp}-${randomHex}.${cleanExt}`;

    const isMock = !process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('dummy-project');

    let publicUrl = '';
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (isMock) {
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'audio');
      await fs.mkdir(uploadDir, { recursive: true });
      const filePath = path.join(uploadDir, filename);
      await fs.writeFile(filePath, buffer);
      publicUrl = `/uploads/audio/${filename}`;
    } else {
      const { createAdminClient } = await import('@/lib/supabase/admin');
      const admin = createAdminClient();
      const storagePath = `audio/${filename}`;
      const { error: uploadError } = await admin.storage
        .from('memories-media')
        .upload(storagePath, buffer, {
          contentType: file.type || 'audio/mpeg',
          upsert: true,
        });

      if (uploadError) {
        return NextResponse.json({ error: uploadError.message }, { status: 500 });
      }

      const { data: urlData } = admin.storage.from('memories-media').getPublicUrl(storagePath);
      publicUrl = urlData.publicUrl;
    }

    return NextResponse.json({
      success: true,
      url: publicUrl,
      filename: originalName,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Lỗi khi tải file nhạc';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
