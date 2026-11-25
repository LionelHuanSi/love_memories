import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  if (url.includes('dummy-project')) {
    // Local dev mock client
    return {
      auth: {
        signInWithPassword: async ({ email, password }: { email: string; password?: string }) => {
          try {
            const res = await fetch('/api/auth/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email, password }),
            });
            const data = await res.json();
            if (!res.ok) {
              return { data: { user: null, session: null }, error: { message: data.error || 'Đăng nhập thất bại' } };
            }
            return { data: { user: data.user, session: { access_token: 'mock-session' } }, error: null };
          } catch {
            return { data: { user: null, session: null }, error: { message: 'Lỗi kết nối máy chủ' } };
          }
        },
        signInWithOtp: async () => ({ data: {}, error: null }),
        getUser: async () => ({ data: { user: { id: 'u-demo-001', email: 'demo@universe.love' } }, error: null }),
        signUp: async ({ email }: { email: string }) => ({
          data: { user: { id: `u-${Date.now()}`, email } },
          error: null,
        }),
        signOut: async () => {
          await fetch('/api/auth/signout', { method: 'POST' });
          return { error: null };
        },
      },
      storage: {
        from: () => ({
          uploadToSignedUrl: async () => ({ error: null }),
        }),
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
  }

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

