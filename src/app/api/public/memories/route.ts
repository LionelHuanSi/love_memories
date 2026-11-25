import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const defaultSlug = process.env.DEFAULT_SPACE_SLUG || 'our-universe';

    const { data: space } = await supabase
      .from('spaces')
      .select('id')
      .eq('slug', defaultSlug)
      .maybeSingle();

    if (!space) {
      return NextResponse.json({ memories: [] });
    }

    // Explicitly filter for published and non-archived only
    const { data: memories, error } = await supabase
      .from('memories')
      .select(`
        id,
        slug,
        title,
        description,
        event_date,
        location_label,
        type,
        published_at,
        memory_media (
          id,
          storage_path,
          thumbnail_path,
          width,
          height,
          sort_order
        )
      `)
      .eq('space_id', space.id)
      .eq('visibility', 'published')
      .eq('is_archived', false)
      .order('event_date', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ memories: memories || [] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
