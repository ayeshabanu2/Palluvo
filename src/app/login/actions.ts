'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

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
  const supabase = await createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  
  const redirectTo = getSafeRedirect(formData.get('redirect'))
  redirect(redirectTo)
}

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    options: {
      data: {
        full_name: formData.get('full_name') as string,
      }
    }
  }

  const { data: authData, error } = await supabase.auth.signUp(data)

  if (error) {
    return { error: error.message }
  }

  if (!authData.session) {
    return { success: 'Please check your email to confirm your account.' }
  }

  revalidatePath('/', 'layout')
  const redirectTo = getSafeRedirect(formData.get('redirect'))
  redirect(redirectTo)
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  
  revalidatePath('/', 'layout')
  redirect('/')
}

