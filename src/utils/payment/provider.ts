import crypto from 'crypto';

/**
 * PALLUVO Payment Gateway Provider Integration
 * Implements server-side cryptographic HMAC-SHA256 signature generation and verification
 * for UPI and Credit/Debit Card online payment processing.
 */

const PAYMENT_GATEWAY_SECRET =
  process.env.PAYMENT_GATEWAY_SECRET ||
  process.env.RAZORPAY_KEY_SECRET ||
  process.env.STRIPE_SECRET_KEY ||
  'palluvo_secure_payment_secret_kadhwa_2026';

export interface PaymentSession {
  sessionId: string;
  amount: number;
  currency: string;
  sessionToken: string;
  createdAt: number;
}

export interface PaymentVerificationInput {
  paymentId: string;
  sessionId: string;
  signature: string;
  amount: number;
  currency?: string;
}

export interface PaymentVerificationResult {
  verified: boolean;
  paymentId?: string;
  gateway?: string;
  error?: string;
}

/**
 * Generates a trusted payment session on the server with an HMAC-SHA256 signature.
 */
export function createServerPaymentSession(amount: number, currency = 'INR'): PaymentSession {
  const sessionId = `sess_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  const createdAt = Date.now();

  // Create cryptographic session token binding sessionId, amount, currency, and timestamp
  const payload = `${sessionId}:${amount}:${currency}:${createdAt}`;
  const sessionToken = crypto.createHmac('sha256', PAYMENT_GATEWAY_SECRET).update(payload).digest('hex');

  return {
    sessionId,
    amount,
    currency,
    sessionToken,
    createdAt,
  };
}

/**
 * Simulates provider gateway authorization and generates a signed payment verification payload.
 * In a live integration, this signature is generated and signed by the payment provider (e.g. Razorpay/Stripe).
 */
export function signPaymentAuthorization(sessionId: string, paymentId: string, amount: number, currency = 'INR'): string {
  const payload = `${sessionId}:${paymentId}:${amount}:${currency}`;
  return crypto.createHmac('sha256', PAYMENT_GATEWAY_SECRET).update(payload).digest('hex');
}

/**
 * Validates a payment transaction on the server using timing-safe cryptographic HMAC-SHA256 verification.
 */
export function verifyPaymentProviderServer(input: PaymentVerificationInput): PaymentVerificationResult {
  try {
    const { paymentId, sessionId, signature, amount, currency = 'INR' } = input;

    if (!paymentId || !sessionId || !signature || !amount || amount <= 0) {
      return {
        verified: false,
        error: 'Missing required payment verification parameters.',
      };
    }

    // Recompute expected cryptographic signature on the server using trusted secret
    const expectedPayload = `${sessionId}:${paymentId}:${amount}:${currency}`;
    const expectedSignature = crypto
      .createHmac('sha256', PAYMENT_GATEWAY_SECRET)
      .update(expectedPayload)
      .digest('hex');

    const expectedBuffer = Buffer.from(expectedSignature, 'hex');
    const actualBuffer = Buffer.from(signature, 'hex');

    if (expectedBuffer.length !== actualBuffer.length || !crypto.timingSafeEqual(expectedBuffer, actualBuffer)) {
      return {
        verified: false,
        error: 'Invalid payment signature. Transaction verification failed on server.',
      };
    }

    return {
      verified: true,
      paymentId,
      gateway: 'PALLUVO Verified Payment Gateway',
    };
  } catch (err: unknown) {
    return {
      verified: false,
      error: 'Server payment verification exception.',
    };
  }
}
