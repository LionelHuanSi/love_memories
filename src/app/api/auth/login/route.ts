import { NextResponse } from 'next/server';
import { readStore } from '@/lib/supabase/local-mock';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Vui lòng nhập tên tài khoản và mật khẩu' },
        { status: 400 }
      );
    }

    const store = readStore();
    const cleanInput = String(email).trim().toLowerCase();

    const matched = store.users.find(
      (u) =>
        (u.email.toLowerCase() === cleanInput ||
          u.username?.toLowerCase() === cleanInput ||
          cleanInput.startsWith(u.username?.toLowerCase() || '')) &&
        u.password === password
    );

    if (!matched) {
      return NextResponse.json(
        { error: 'Tài khoản hoặc mật khẩu không chính xác' },
        { status: 401 }
      );
    }

    const response = NextResponse.json({
      success: true,
      user: {
        id: matched.id,
        email: matched.email,
        username: matched.username,
      },
    });

    // Set local session cookie for dev testing
    response.cookies.set('memories_session', matched.id, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Lỗi hệ thống';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
