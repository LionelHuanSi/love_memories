import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { memoryFormSchema, generateMemorySlug } from '@/lib/validations/memory';

export async function GET() {
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
        visibility,
        is_archived,
        created_at,
        updated_at,
        published_at,
        memory_media (
          id,
          storage_path,
          thumbnail_path,
          mime_type,
          file_size_bytes,
          sort_order
        )
      `)
      .eq('space_id', member.space_id)
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

    const rawBody = await request.json();
    const validated = memoryFormSchema.parse(rawBody);

    const slug = generateMemorySlug(validated.title);

    const { data: memory, error: insertError } = await supabase
      .from('memories')
      .insert({
        space_id: member.space_id,
        slug,
        title: validated.title,
        description: validated.description || null,
        event_date: validated.event_date,
        location_label: validated.location_label || null,
        type: validated.type,
        visibility: validated.visibility, // defaults to draft in schema
        is_archived: false,
        constellation_id: validated.constellation_id || null,
        created_by: user.id,
        updated_by: user.id,
        published_at: validated.visibility === 'published' ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, memory }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
