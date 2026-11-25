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
      return NextResponse.json({ nodes: [], edges: [] });
    }

    // Strictly fetch published and non-archived memories
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
        memory_media (
          id,
          storage_path,
          thumbnail_path
        )
      `)
      .eq('space_id', space.id)
      .eq('visibility', 'published')
      .eq('is_archived', false)
      .order('event_date', { ascending: true });

    if (error || !memories || memories.length === 0) {
      return NextResponse.json({ nodes: [], edges: [] });
    }

    // Deterministic constellation layout calculation
    const centerX = 500;
    const centerY = 400;

    // Helper to get small stable hash from string
    const stringHash = (str: string) => {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        hash = (hash << 5) - hash + str.charCodeAt(i);
        hash |= 0;
      }
      return Math.abs(hash);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nodes = (memories || []).map((mem: any, index: number) => {

      const isMilestone = mem.type === 'milestone';
      const offsetFactor = (stringHash(mem.slug) % 50) - 25;

      // Golden ratio spiral distribution for natural starry scatter
      const angle = index * 1.618 + (offsetFactor * 0.01);
      const radius = 100 + index * 65 + (offsetFactor * 0.8);

      const x = Math.round(centerX + radius * Math.cos(angle));
      const y = Math.round(centerY + radius * Math.sin(angle));

      const coverMedia = mem.memory_media && mem.memory_media.length > 0 ? mem.memory_media[0] : null;

      return {
        id: mem.id,
        type: 'starNode',
        position: { x, y },
        data: {
          id: mem.id,
          slug: mem.slug,
          title: mem.title,
          event_date: mem.event_date,
          type: mem.type,
          location_label: mem.location_label,
          coverMediaId: coverMedia?.id || null,
          isMilestone,
          descriptionExcerpt: mem.description ? mem.description.slice(0, 100) : '',
        },
      };
    });

    // Auto-generate chronological edges between adjacent stars
    const edges = [];
    for (let i = 0; i < nodes.length - 1; i++) {
      edges.push({
        id: `e-${nodes[i].id}-${nodes[i + 1].id}`,
        source: nodes[i].id,
        target: nodes[i + 1].id,
        animated: true,
        style: {
          stroke: 'rgba(167, 139, 250, 0.35)',
          strokeWidth: 1.5,
          strokeDasharray: '4 4',
        },
      });
    }

    return NextResponse.json({ nodes, edges });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
