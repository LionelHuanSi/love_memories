import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { createLocalMockClient } from './local-mock';

// Privileged admin client using service_role key.
// STRICTLY SERVER-ONLY: Never expose this client or the service role key to the browser.
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (supabaseUrl.includes('dummy-project')) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return createLocalMockClient('u-demo-001') as any;
  }

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

