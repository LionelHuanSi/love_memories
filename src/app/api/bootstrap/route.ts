import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const bootstrapSecret = process.env.BOOTSTRAP_SECRET;

    if (!bootstrapSecret || authHeader !== `Bearer ${bootstrapSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized. Invalid or missing bootstrap secret token.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { email, password, spaceSlug = 'our-universe', spaceTitle = 'Our Little Universe' } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Both email and password are required for bootstrapping the owner account.' },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // 1. Get or create initial space
    let { data: space } = await admin
      .from('spaces')
      .select('id, slug, public_title')
      .eq('slug', spaceSlug)
      .maybeSingle();

    if (!space) {
      const { data: newSpace, error: createSpaceError } = await admin
        .from('spaces')
        .insert({
          slug: spaceSlug,
          public_title: spaceTitle,
          tagline: 'A constellation of our unforgettable moments',
          show_day_counter: false,
          theme: { accentColor: '#A78BFA' },
        })
        .select('id, slug, public_title')
        .single();

      if (createSpaceError || !newSpace) {
        return NextResponse.json(
          { error: `Failed to create space: ${createSpaceError?.message}` },
          { status: 500 }
        );
      }
      space = newSpace;
    }

    // 2. Check if space already has an owner
    const { data: existingOwner } = await admin
      .from('space_members')
      .select('user_id, role')
      .eq('space_id', space.id)
      .eq('role', 'owner')
      .maybeSingle();

    if (existingOwner) {
      return NextResponse.json(
        { error: 'This space already has an owner assigned. Bootstrap cannot be rerun.' },
        { status: 400 }
      );
    }

    // 3. Create or find Supabase auth user
    const { data: authUser, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    let userId: string;
    if (authError) {
      // If user already exists in auth, look them up
      if (authError.message.toLowerCase().includes('already registered')) {
        const { data: listData } = await admin.auth.admin.listUsers();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const existing = listData?.users.find((u: any) => u.email === email);

        if (!existing) {
          return NextResponse.json({ error: authError.message }, { status: 400 });
        }
        userId = existing.id;
      } else {
        return NextResponse.json({ error: authError.message }, { status: 400 });
      }
    } else {
      userId = authUser.user.id;
    }

    // 4. Assign user as owner in space_members
    const { error: memberError } = await admin.from('space_members').insert({
      space_id: space.id,
      user_id: userId,
      role: 'owner',
    });

    if (memberError) {
      return NextResponse.json(
        { error: `Failed to assign space owner: ${memberError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Owner account and initial space successfully bootstrapped.',
      spaceId: space.id,
      spaceSlug: space.slug,
      userId,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
