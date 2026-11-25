import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { memoryFormSchema } from '@/lib/validations/memory';
import { z } from 'zod';

const updateMemorySchema = memoryFormSchema.partial().extend({
  is_archived: z.boolean().optional(),
});

export async function GET(
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

    const { data: memory, error } = await supabase
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
      .eq('space_id', member.space_id)
      .maybeSingle();

    if (error || !memory) {
      return NextResponse.json({ error: 'Memory not found' }, { status: 404 });
    }

    // Sort media by sort_order
    if (memory.memory_media) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (memory.memory_media as any[]).sort((a, b) => a.sort_order - b.sort_order);
    }

    return NextResponse.json({ memory }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
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
    const validated = updateMemorySchema.parse(rawBody);

    // If publishing, verify invariant: memory must have title and either description or at least 1 photo
    if (validated.visibility === 'published') {
      const { data: currentMemory } = await supabase
        .from('memories')
        .select('title, description, memory_media(id)')
        .eq('id', memoryId)
        .eq('space_id', member.space_id)
        .single();

      if (!currentMemory) {
        return NextResponse.json({ error: 'Memory not found' }, { status: 404 });
      }
    }

    const updatePayload: Record<string, unknown> = {
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    };

    if (validated.title !== undefined) updatePayload.title = validated.title;
    if (validated.description !== undefined) updatePayload.description = validated.description;
    if (validated.event_date !== undefined) updatePayload.event_date = validated.event_date;
    if (validated.location_label !== undefined) updatePayload.location_label = validated.location_label;
    if (validated.type !== undefined) updatePayload.type = validated.type;
    if (validated.visibility !== undefined) updatePayload.visibility = validated.visibility;
    if (validated.is_archived !== undefined) updatePayload.is_archived = validated.is_archived;
    if (validated.constellation_id !== undefined) updatePayload.constellation_id = validated.constellation_id;

    const { data: updated, error: updateError } = await supabase
      .from('memories')
      .update(updatePayload)
      .eq('id', memoryId)
      .eq('space_id', member.space_id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, memory: updated });
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

    // 1. Get all media paths to clean up from storage
    const { data: mediaItems } = await supabase
      .from('memory_media')
      .select('storage_path, thumbnail_path')
      .eq('memory_id', memoryId);

    const pathsToDelete: string[] = [];
    if (mediaItems) {
      for (const item of mediaItems) {
        if (item.storage_path) pathsToDelete.push(item.storage_path);
        if (item.thumbnail_path) pathsToDelete.push(item.thumbnail_path);
      }
    }

    // 2. Delete storage files via admin client
    if (pathsToDelete.length > 0) {
      const admin = createAdminClient();
      await admin.storage.from('memories-media').remove(pathsToDelete);
    }

    // 3. Delete memory record (CASCADE deletes memory_media rows)
    const { error: deleteError } = await supabase
      .from('memories')
      .delete()
      .eq('id', memoryId)
      .eq('space_id', member.space_id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Memory deleted successfully' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
