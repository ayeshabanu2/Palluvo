/**
 * Server-only admin Supabase client using SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY.
 * Restricted to trusted server-side code for operations requiring service_role privilege
 * (such as executing the private consume_contact_rate_limit or prune_expired_contact_rate_limits RPCs).
 */
export async function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

  if (!url || !serviceKey) return null;
  if (url.includes('placeholder') || serviceKey.includes('placeholder')) return null;

  const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
  return createSupabaseClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
