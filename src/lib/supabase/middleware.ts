import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (supabaseUrl.includes('dummy-project')) {
    const { pathname } = request.nextUrl;
    if (pathname.startsWith('/studio')) {
      const sessionCookie = request.cookies.get('memories_session')?.value;
      if (!sessionCookie) {
        const url = request.nextUrl.clone();
        url.pathname = '/login';
        url.searchParams.set('redirect', pathname);
        return NextResponse.redirect(url);
      }
    }
    return supabaseResponse;
  }

  if (!supabaseUrl || !anonKey) {
    return supabaseResponse;
  }


  const supabase = createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Protect /studio routes
  if (pathname.startsWith('/studio')) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('redirect', pathname);
      return NextResponse.redirect(url);
    }

    // Verify membership in space_members
    const { data: membership, error } = await supabase
      .from('space_members')
      .select('space_id, role')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle();

    if (error || !membership) {
      // Authenticated user is not an authorized editor of this space
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('error', 'unauthorized_account');
      return NextResponse.redirect(url);
    }
  }

  // If already logged in and visiting /login, redirect to /studio if authorized
  if (pathname === '/login' && user) {
    const { data: membership } = await supabase
      .from('space_members')
      .select('space_id')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle();

    if (membership) {
      const redirectUrl = request.nextUrl.searchParams.get('redirect') || '/studio';
      const url = request.nextUrl.clone();
      url.pathname = redirectUrl.startsWith('/') ? redirectUrl : '/studio';
      url.searchParams.delete('redirect');
      url.searchParams.delete('error');
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
