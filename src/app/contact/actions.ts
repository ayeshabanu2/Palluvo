'use server';

import { headers } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { normalizeEmail } from '@/utils/format';
import {
  CONTACT_FIELD_LIMITS,
  checkAdmissionLimit,
  checkContactRateLimitMulti,
  isMailboxVerified,
} from './rateLimiter';

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

async function getClientIp(): Promise<string> {
  try {
    const headerList = await headers();
    const forwardedFor = headerList.get('x-forwarded-for');
    if (forwardedFor) {
      return forwardedFor.split(',')[0].trim();
    }
    const realIp = headerList.get('x-real-ip') || headerList.get('cf-connecting-ip');
    if (realIp) {
      return realIp.trim();
    }
  } catch {
    // headers() might not be available in non-request contexts or mock tests
  }
  return 'unknown';
}

export async function submitContactInquiry(input: ContactInquiryInput): Promise<ContactInquiryResult> {
  try {
    const name = (input.name || '').trim();
    const email = normalizeEmail(input.email);
    const phone = (input.phone || '').trim();
    const subject = (input.subject || 'Styling Assistance').trim();
    const message = (input.message || '').trim();

    // 1. Enforce Server-Side Minimum & Maximum Field Lengths
    if (!name || name.length < CONTACT_FIELD_LIMITS.NAME_MIN) {
      return { success: false, error: 'Please provide your name (at least 2 characters).' };
    }
    if (name.length > CONTACT_FIELD_LIMITS.NAME_MAX) {
      return { success: false, error: `Name cannot exceed ${CONTACT_FIELD_LIMITS.NAME_MAX} characters.` };
    }

    if (!email || !EMAIL_REGEX.test(email)) {
      return { success: false, error: 'Please provide a valid email address.' };
    }
    if (email.length > CONTACT_FIELD_LIMITS.EMAIL_MAX) {
      return { success: false, error: `Email address cannot exceed ${CONTACT_FIELD_LIMITS.EMAIL_MAX} characters.` };
    }

    if (phone && phone.length > CONTACT_FIELD_LIMITS.PHONE_MAX) {
      return { success: false, error: `Phone number cannot exceed ${CONTACT_FIELD_LIMITS.PHONE_MAX} characters.` };
    }

    if (subject && subject.length > CONTACT_FIELD_LIMITS.SUBJECT_MAX) {
      return { success: false, error: `Inquiry topic cannot exceed ${CONTACT_FIELD_LIMITS.SUBJECT_MAX} characters.` };
    }

    if (!message || message.length < CONTACT_FIELD_LIMITS.MESSAGE_MIN) {
      return { success: false, error: 'Please provide inquiry details (at least 5 characters).' };
    }
    if (message.length > CONTACT_FIELD_LIMITS.MESSAGE_MAX) {
      return { success: false, error: `Message cannot exceed ${CONTACT_FIELD_LIMITS.MESSAGE_MAX} characters.` };
    }

    // 2. Pre-RPC Abuse/WAF Admission Limit & Distributed Rate Limiting
    // Single-host pre-RPC gate protects against local burst floods before hitting the database.
    // In multi-instance serverless environments (Vercel), distributed admission is authoritatively
    // enforced downstream across all instances by the Supabase rate limit RPC.
    const clientIp = await getClientIp();
    const admissionCheck = checkAdmissionLimit({ ip: clientIp });
    if (!admissionCheck.allowed) {
      return { success: false, error: admissionCheck.error };
    }

    // Check mailbox ownership verification via authenticated session and enforced confirmation state.
    // In projects with "Confirm Email" disabled, Supabase returns immediate sessions without verifying mailbox access.
    // To prevent an attacker from registering an unused victim address and consuming their shared email quota,
    // we require confirmed-email deployment configuration and trusted email_confirmed_at state.
    // If not verified, the shared email quota is omitted, relying on IP and admission risk controls.
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const isEmailVerified = isMailboxVerified(user, email);

    const rateCheck = await checkContactRateLimitMulti({
      ip: clientIp,
      email,
      isEmailVerified,
    });

    if (!rateCheck.allowed) {
      return { success: false, error: rateCheck.error };
    }

    // 3. Database Persistence
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
