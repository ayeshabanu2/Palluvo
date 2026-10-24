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

/**
 * Checks whether the deployment requires and enforces confirmed email verification in Supabase Auth.
 * Supabase allows projects to have "Confirm email" disabled, where any caller can register an address
 * and immediately receive a session without proving mailbox access.
 * To prevent quota poisoning on public forms, shared email rate limits are strictly gated behind this deployment requirement.
 */
export function isEmailConfirmationEnforced(): boolean {
  const env =
    process.env.REQUIRE_EMAIL_CONFIRMATION ||
    process.env.SUPABASE_AUTH_CONFIRM_EMAIL;
  if (!env) return false;
  const val = env.trim().toLowerCase();
  return val === 'true' || val === '1';
}

/**
 * Strict mailbox verification requires:
 * 1. Confirmed-email configuration is enforced as a deployment requirement (`isEmailConfirmationEnforced() === true`).
 * 2. Authenticated user object exists with a valid email.
 * 3. The user's `email_confirmed_at` timestamp is present and verified.
 * 4. The user's email matches the submitted email.
 */
export function isMailboxVerified(
  user: { email?: string; email_confirmed_at?: string | null } | null | undefined,
  submittedEmail: string
): boolean {
  if (!isEmailConfirmationEnforced()) {
    return false;
  }
  if (!user || !user.email) {
    return false;
  }
  if (
    !user.email_confirmed_at ||
    typeof user.email_confirmed_at !== 'string' ||
    user.email_confirmed_at.trim().length === 0
  ) {
    return false;
  }
  return (user.email || '').toLowerCase().trim() === (submittedEmail || '').toLowerCase().trim();
}


