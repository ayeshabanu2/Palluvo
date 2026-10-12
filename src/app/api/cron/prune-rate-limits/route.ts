import { handlePruneRateLimits } from '@/app/contact/rateLimiter';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Durable scheduled cleanup endpoint for serverless deployments.
 * Triggered automatically by Vercel Cron (configured in vercel.json) or external schedulers.
 * Enforces bounded retention by deleting expired rate limit keys even during zero-traffic inactivity.
 */
export async function GET(req: Request): Promise<Response> {
  return handlePruneRateLimits(req);
}

export async function POST(req: Request): Promise<Response> {
  return handlePruneRateLimits(req);
}
