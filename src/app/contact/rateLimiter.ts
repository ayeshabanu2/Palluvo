export const CONTACT_FIELD_LIMITS = {
  NAME_MIN: 2,
  NAME_MAX: 100,
  EMAIL_MAX: 254,
  PHONE_MAX: 25,
  SUBJECT_MAX: 150,
  MESSAGE_MIN: 5,
  MESSAGE_MAX: 3000,
} as const;

export const RATE_LIMIT_CONFIG = {
  WINDOW_MS: 10 * 60 * 1000, // 10 minutes sliding window
  MAX_PER_WINDOW: 5,
  COOLDOWN_MS: 5 * 1000, // 5 seconds minimum between consecutive requests
} as const;

interface RateLimitEntry {
  timestamps: number[];
}

const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Server-side sliding window rate limiter with rapid spam cooldown.
 */
export function checkContactRateLimit(
  identifier: string,
  now: number = Date.now()
): { allowed: boolean; error?: string } {
  if (!identifier) return { allowed: true };

  const windowStart = now - RATE_LIMIT_CONFIG.WINDOW_MS;
  let record = rateLimitStore.get(identifier);

  if (!record) {
    record = { timestamps: [] };
    rateLimitStore.set(identifier, record);
  }

  // Filter out timestamps outside the active sliding window
  record.timestamps = record.timestamps.filter((ts) => ts > windowStart);

  // Check rapid burst cooldown
  const lastTs = record.timestamps[record.timestamps.length - 1];
  if (lastTs && now - lastTs < RATE_LIMIT_CONFIG.COOLDOWN_MS) {
    return {
      allowed: false,
      error: 'Please wait a moment before sending another message.',
    };
  }

  // Check window frequency threshold
  if (record.timestamps.length >= RATE_LIMIT_CONFIG.MAX_PER_WINDOW) {
    return {
      allowed: false,
      error: 'Too many inquiries submitted. Please wait a few minutes before trying again or reach out to our concierge directly.',
    };
  }

  record.timestamps.push(now);
  return { allowed: true };
}

/**
 * Clears the rate limit store (for test suites).
 */
export function resetRateLimitStore(): void {
  rateLimitStore.clear();
}
