import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: mediaId } = await params;

    // Use admin client to query media and memory publication state safely
    const admin = createAdminClient();

    const { data: media, error: mediaError } = await admin
      .from('memory_media')
      .select(`
        id,
        storage_path,
        thumbnail_path,
        memories (
          id,
          space_id,
          visibility,
          is_archived
        )
      `)
      .eq('id', mediaId)
      .maybeSingle();

    if (mediaError || !media || !media.memories) {
      return NextResponse.json({ error: 'Media not found' }, { status: 404 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const memory = media.memories as any;
    const isPublished = memory.visibility === 'published' && !memory.is_archived;

    if (!isPublished) {
      // If private or draft, requester MUST be an authenticated space member
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        // Return 404 to avoid leaking existence of private media
        return NextResponse.json({ error: 'Media not found' }, { status: 404 });
      }

      const { data: membership } = await supabase
        .from('space_members')
        .select('space_id')
        .eq('space_id', memory.space_id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (!membership) {
        return NextResponse.json({ error: 'Media not found' }, { status: 404 });
      }
    }

    // Check query param for thumbnail request
    const url = new URL(request.url);
    const wantThumbnail = url.searchParams.get('thumb') === '1';
    const targetPath = (wantThumbnail && media.thumbnail_path) ? media.thumbnail_path : media.storage_path;

    if (targetPath.includes('drive.google.com')) {
      const match = targetPath.match(/\/d\/([a-zA-Z0-9_-]+)/) || targetPath.match(/id=([a-zA-Z0-9_-]+)/);
      const fileId = match ? match[1] : null;
      const directUrl = fileId
        ? `https://drive.google.com/thumbnail?id=${fileId}&sz=w1600`
        : targetPath;
      return NextResponse.redirect(directUrl, {
        headers: {
          'Cache-Control': isPublished ? 'public, max-age=600' : 'private, no-store',
        },
      });
    }

    if (targetPath.startsWith('http://') || targetPath.startsWith('https://')) {
      return NextResponse.redirect(targetPath, {
        headers: {
          'Cache-Control': isPublished ? 'public, max-age=600' : 'private, no-store',
        },
      });
    }

    if (targetPath.startsWith('/')) {
      return NextResponse.redirect(new URL(targetPath, request.url).toString(), {
        headers: {
          'Cache-Control': isPublished ? 'public, max-age=600' : 'private, no-store',
        },
      });
    }

    // Generate short-lived signed URL (15 minutes = 900 seconds)
    const { data: signedData, error: signError } = await admin.storage
      .from('memories-media')
      .createSignedUrl(targetPath, 900);

    if (signError || !signedData?.signedUrl) {
      return NextResponse.json({ error: 'Failed to generate media link' }, { status: 500 });
    }

    // Cache-Control: private, max-age=900
    return NextResponse.redirect(signedData.signedUrl, {
      headers: {
        'Cache-Control': isPublished ? 'public, max-age=600' : 'private, no-store',
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
