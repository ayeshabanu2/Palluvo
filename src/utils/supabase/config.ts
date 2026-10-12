/**
 * Validates whether Supabase environment variables are provided and active.
 */
export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) return false;
  if (url.includes('placeholder') || key.includes('placeholder')) return false;
  if (url.includes('your_supabase_project_url') || key.includes('your_supabase_anon_key')) return false;

  return (
    url.startsWith('https://') ||
    url.startsWith('http://127.0.0.1') ||
    url.startsWith('http://localhost')
  );
}
