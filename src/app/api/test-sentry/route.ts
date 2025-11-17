/**
 * Test endpoint to verify Sentry server-side error capture
 * This should be automatically caught by Sentry's Next.js integration
 * (no manual capturing needed for API routes)
 */
export async function GET() {
  throw new Error('🧪 Test Sentry error from API route - check Slack notification');
}
