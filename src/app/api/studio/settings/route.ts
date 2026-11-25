import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { updateSpaceSettingsSchema } from '@/lib/validations/settings';

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: member } = await supabase
      .from('space_members')
      .select('space_id, role, spaces(*)')
      .eq('user_id', user.id)
      .single();

    if (!member) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ space: member.spaces, role: member.role });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: member } = await supabase
      .from('space_members')
      .select('space_id')
      .eq('user_id', user.id)
      .single();

    if (!member) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const rawBody = await request.json();
    const validated = updateSpaceSettingsSchema.parse(rawBody);

    const { data: updated, error } = await supabase
      .from('spaces')
      .update({
        public_title: validated.public_title,
        tagline: validated.tagline,
        relationship_start_date: validated.relationship_start_date || null,
        show_day_counter: validated.show_day_counter,
        theme: {
          accentColor: validated.accentColor,
          musicUrl: validated.musicUrl || null,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', member.space_id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, space: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
