'use server';

import { createClient } from '@/utils/supabase/server';
import { normalizeEmail } from '@/utils/format';

export interface ContactInquiryInput {
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
}

export interface ContactInquiryResult {
  success: boolean;
  error?: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function submitContactInquiry(input: ContactInquiryInput): Promise<ContactInquiryResult> {
  try {
    const name = (input.name || '').trim();
    const email = normalizeEmail(input.email);
    const phone = (input.phone || '').trim();
    const subject = (input.subject || 'Styling Assistance').trim();
    const message = (input.message || '').trim();

    if (!name || name.length < 2) {
      return { success: false, error: 'Please provide your name (at least 2 characters).' };
    }

    if (!email || !EMAIL_REGEX.test(email)) {
      return { success: false, error: 'Please provide a valid email address.' };
    }

    if (!message || message.length < 5) {
      return { success: false, error: 'Please provide inquiry details (at least 5 characters).' };
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const inquiryRecord = {
      user_id: user?.id || null,
      name,
      email,
      phone,
      subject,
      message,
      created_at: new Date().toISOString(),
    };

    const { error: insertError } = await supabase.from('inquiries').insert([inquiryRecord]);

    if (insertError) {
      console.error('[submitContactInquiry] Persistence failed:', insertError);
      return {
        success: false,
        error: 'Unable to record your inquiry due to a temporary server issue. Please connect with us directly via WhatsApp or phone.',
      };
    }

    return { success: true };
  } catch (err) {
    console.error('[submitContactInquiry] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred. Please contact our concierge directly.',
    };
  }
}
