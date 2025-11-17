export async function GET() {
  throw new Error('🧪 Test Sentry error - check Slack notification');
}
