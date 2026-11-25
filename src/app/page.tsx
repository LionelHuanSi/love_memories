import { createClient } from '@/lib/supabase/server';
import CosmicGalaxy3D, { type CosmicMemory } from '@/components/public/CosmicGalaxy3D';

export default async function HomePage() {
  const supabase = await createClient();
  const defaultSlug = process.env.DEFAULT_SPACE_SLUG || 'our-universe';

  // 1. Fetch space details
  const { data: space } = await supabase
    .from('spaces')
    .select('id, public_title, tagline, relationship_start_date, show_day_counter, theme')
    .eq('slug', defaultSlug)
    .maybeSingle();

  const publicTitle = space?.public_title || 'Our Little Universe';
  const tagline = space?.tagline || 'A constellation of our unforgettable moments';

  // 2. Chế độ mở: Luôn cho phép truy cập Studio và Thắp sao nhanh
  const isMember = true;

  // 3. Fetch published memories for the 3D galaxy
  const { data: memories } = await supabase
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
    .eq('space_id', space?.id || '')
    .eq('visibility', 'published')
    .eq('is_archived', false)
    .order('event_date', { ascending: true });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const publishedMemories: CosmicMemory[] = ((memories || []) as any[]).map((mem) => ({
    id: mem.id,
    slug: mem.slug,
    title: mem.title,
    description: mem.description,
    event_date: mem.event_date,
    location_label: mem.location_label,
    type: mem.type,
    memory_media: mem.memory_media || [],
  }));

  // 4. Calculate day counter if enabled
  let daysTogether: number | null = null;
  if (space?.show_day_counter && space.relationship_start_date) {
    const start = new Date(space.relationship_start_date).getTime();
    const now = new Date().getTime();
    daysTogether = Math.max(0, Math.floor((now - start) / (1000 * 60 * 60 * 24)));
  }

  // 5. Couple names display
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const themeData = (space?.theme as any) || {};
  const coupleNames = themeData.coupleNames || 'Leo Messi ♡ Football';
  const musicUrl = themeData.musicUrl || null;

  return (
    <main className="fixed inset-0 w-full h-full h-[100dvh] max-h-[100dvh] overflow-hidden overscroll-none bg-black">
      <CosmicGalaxy3D
        initialMemories={publishedMemories}
        publicTitle={publicTitle}
        tagline={tagline}
        daysTogether={daysTogether}
        relationshipStartDate={space?.relationship_start_date || null}
        coupleNames={coupleNames}
        isMember={isMember}
        musicUrl={musicUrl}
      />
    </main>
  );
}
