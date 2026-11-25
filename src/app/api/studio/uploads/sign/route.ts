import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
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

    const body = await request.json();
    const { memoryId, filename, mimeType, fileSize } = body;

    if (!memoryId || !filename || !mimeType || !fileSize) {
      return NextResponse.json(
        { error: 'Thiếu thông tin file (memoryId, filename, mimeType, fileSize)' },
        { status: 400 }
      );
    }

    // 1. Validate file constraints
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
    if (!allowedMimeTypes.includes(mimeType.toLowerCase())) {
      return NextResponse.json(
        { error: 'Định dạng ảnh không được hỗ trợ. Vui lòng chọn ảnh JPEG, PNG, WebP.' },
        { status: 400 }
      );
    }

    const maxSizeBytes = 15 * 1024 * 1024; // 15MB
    if (fileSize > maxSizeBytes) {
      return NextResponse.json(
        { error: 'Kích thước ảnh vượt quá giới hạn 15MB.' },
        { status: 400 }
      );
    }

    // 2. Verify memory exists in this space
    const { data: memory, error: memoryError } = await supabase
      .from('memories')
      .select('id, space_id, memory_media(id)')
      .eq('id', memoryId)
      .eq('space_id', member.space_id)
      .single();

    if (memoryError || !memory) {
      return NextResponse.json({ error: 'Không tìm thấy kỷ niệm.' }, { status: 404 });
    }

    // 3. Verify total photos limit (max 30)
    const currentMediaCount = memory.memory_media?.length || 0;
    if (currentMediaCount >= 30) {
      return NextResponse.json(
        { error: 'Mỗi kỷ niệm chỉ có thể lưu tối đa 30 bức ảnh.' },
        { status: 400 }
      );
    }

    // 4. Generate scoped storage path
    const ext = filename.split('.').pop()?.toLowerCase() || 'jpg';
    const randomSuffix = crypto.randomBytes(6).toString('hex');
    const storagePath = `${member.space_id}/${memoryId}/${Date.now()}-${randomSuffix}.${ext}`;

    // 5. Generate signed upload URL from Supabase Storage
    const admin = createAdminClient();
    const { data: signedData, error: signError } = await admin.storage
      .from('memories-media')
      .createSignedUploadUrl(storagePath);

    if (signError || !signedData) {
      return NextResponse.json(
        { error: `Lỗi cấp quyền tải ảnh: ${signError?.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      signedUrl: signedData.signedUrl,
      token: signedData.token,
      path: signedData.path,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
