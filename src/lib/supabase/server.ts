import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createLocalMockClient } from './local-mock';

export async function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  if (url.includes('dummy-project')) {
    const cookieStore = await cookies();
    const sessionUserId = cookieStore.get('memories_session')?.value;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return createLocalMockClient(sessionUserId) as any;
  }

  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // Ignored if middleware refreshes user sessions.
          }
        },
      },
    }
  );
}

