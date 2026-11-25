import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { hashInviteToken } from '@/lib/validations/invite';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Bạn cần đăng nhập tài khoản trước khi chấp nhận lời mời.' },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { token } = body;

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Mã lời mời không hợp lệ.' }, { status: 400 });
    }

    const tokenHash = hashInviteToken(token);

    // Call atomic stored procedure
    const { data: result, error: rpcError } = await supabase.rpc('accept_partner_invite', {
      p_token_hash: tokenHash,
    });

    if (rpcError) {
      return NextResponse.json({ error: rpcError.message }, { status: 500 });
    }

    if (!result || !result.success) {
      return NextResponse.json(
        { error: result?.error || 'Không thể chấp nhận lời mời' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Chúc mừng bạn đã trở thành người đồng hành (Partner) của không gian!',
      spaceId: result.space_id,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
