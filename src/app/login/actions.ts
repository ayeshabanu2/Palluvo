'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { isSupabaseConfigured } from '@/utils/supabase/config'

function getSafeRedirect(rawRedirect: unknown): string {
  if (typeof rawRedirect !== 'string') {
    return '/account'
  }
  const trimmed = rawRedirect.trim()
  // Reject empty string, protocol-relative (//example.com), absolute URLs (http:// or https:// or javascript:), and null-byte/control characters
  if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.includes('\\') || trimmed.includes(':')) {
    return '/account'
  }
  return trimmed
}

export async function login(formData: FormData) {
  if (!isSupabaseConfigured()) {
    return {
      error: 'Authentication service is not configured. Please add your Supabase project credentials (NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY) to your .env.local file.',
    }
  }

  const email = (formData.get('email') as string || '').trim()
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'Please enter both your email address and password.' }
  }

  try {
    const supabase = await createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      if (error.message.includes('fetch failed')) {
        return {
          error: 'Unable to connect to the authentication service. Please check your internet connection or verify your Supabase project URL.',
        }
      }
      return { error: error.message }
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Login failed'
    if (message.includes('fetch failed')) {
      return {
        error: 'Unable to connect to the authentication service. Please check your internet connection or verify your Supabase configuration in .env.local.',
      }
    }
    return { error: message }
  }

  revalidatePath('/', 'layout')
  const redirectTo = getSafeRedirect(formData.get('redirect'))
  redirect(redirectTo)
}

export async function signup(formData: FormData) {
  if (!isSupabaseConfigured()) {
    return {
      error: 'Authentication service is not configured. Please add your Supabase project credentials (NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY) to your .env.local file.',
    }
  }

  const email = (formData.get('email') as string || '').trim()
  const password = formData.get('password') as string
  const fullName = (formData.get('full_name') as string || '').trim()

  if (!email || !password) {
    return { error: 'Please enter both your email address and password.' }
  }

  try {
    const supabase = await createClient()
    const { data: authData, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    })

    if (error) {
      if (error.message.includes('fetch failed')) {
        return {
          error: 'Unable to connect to the authentication service. Please check your internet connection or verify your Supabase project URL.',
        }
      }
      return { error: error.message }
    }

    if (!authData.session) {
      return { success: 'Please check your email to confirm your account.' }
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Registration failed'
    if (message.includes('fetch failed')) {
      return {
        error: 'Unable to connect to the authentication service. Please check your internet connection or verify your Supabase configuration in .env.local.',
      }
    }
    return { error: message }
  }

  revalidatePath('/', 'layout')
  const redirectTo = getSafeRedirect(formData.get('redirect'))
  redirect(redirectTo)
}

export async function logout() {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient()
      await supabase.auth.signOut()
    } catch {
      // Ignore signOut network errors
    }
  }
  
  revalidatePath('/', 'layout')
  redirect('/')
}
