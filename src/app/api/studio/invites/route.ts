import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateInviteToken, hashInviteToken } from '@/lib/validations/invite';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify owner role
    const { data: member, error: memberError } = await supabase
      .from('space_members')
      .select('space_id, role')
      .eq('user_id', user.id)
      .single();

    if (memberError || !member || member.role !== 'owner') {
      return NextResponse.json(
        { error: 'Forbidden. Only the space owner can generate invitations.' },
        { status: 403 }
      );
    }

    // Check member count
    const { count, error: countError } = await supabase
      .from('space_members')
      .select('*', { count: 'exact', head: true })
      .eq('space_id', member.space_id);

    if (countError || (count && count >= 2)) {
      return NextResponse.json(
        { error: 'This space already has two members. Cannot invite another editor.' },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const expiresInDays = Number(body.expiresInDays) || 7;

    const rawToken = generateInviteToken();
    const tokenHash = hashInviteToken(rawToken);
    const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString();

    const { data: invite, error: insertError } = await supabase
      .from('partner_invites')
      .insert({
        space_id: member.space_id,
        token_hash: tokenHash,
        expires_at: expiresAt,
        created_by: user.id,
      })
      .select('id, expires_at, created_at')
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: `Failed to create invite: ${insertError.message}` },
        { status: 500 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
    const inviteUrl = `${appUrl}/invite/${rawToken}`;

    return NextResponse.json({
      success: true,
      invite: {
        id: invite.id,
        inviteUrl,
        expires_at: invite.expires_at,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

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
      .select('space_id, role')
      .eq('user_id', user.id)
      .single();

    if (!member || member.role !== 'owner') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: invites, error } = await supabase
      .from('partner_invites')
      .select('id, expires_at, used_at, revoked_at, created_at')
      .eq('space_id', member.space_id)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ invites });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
