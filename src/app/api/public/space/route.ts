import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const defaultSlug = process.env.DEFAULT_SPACE_SLUG || 'our-universe';

    const { data: space, error } = await supabase
      .from('spaces')
      .select('id, slug, public_title, tagline, relationship_start_date, show_day_counter, theme')
      .eq('slug', defaultSlug)
      .maybeSingle();

    if (error || !space) {
      return NextResponse.json(
        { error: 'Space not found' },
        { status: 404 }
      );
    }

    // Sanitize output for public visitors:
    // If show_day_counter is false, do not disclose relationship_start_date
    return NextResponse.json({
      public_title: space.public_title,
      tagline: space.tagline,
      relationship_start_date: space.show_day_counter ? space.relationship_start_date : null,
      show_day_counter: space.show_day_counter,
      theme: space.theme,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
