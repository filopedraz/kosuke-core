import * as Sentry from '@sentry/nextjs';

/**
 * Test endpoint to verify Sentry server-side error capture
 * Manual capture + flush ensures event is sent before response closes
 */
export async function GET() {
  // Debug: Check what env vars are available at runtime
  console.log('🔍 Sentry initialization check:');
  console.log('  NODE_ENV:', process.env.NODE_ENV);
  console.log('  NEXT_PUBLIC_SENTRY_DSN:', process.env.NEXT_PUBLIC_SENTRY_DSN ? 'SET' : 'NOT SET');
  console.log('  SENTRY_DSN:', process.env.SENTRY_DSN ? 'SET' : 'NOT SET');
  console.log(
    '  All SENTRY env keys:',
    Object.keys(process.env)
      .filter(k => k.includes('SENTRY'))
      .join(', ')
  );

  // Verify Sentry is initialized
  const client = Sentry.getClient();
  console.log('🔍 Sentry client:', client ? 'EXISTS' : 'NOT FOUND');
  if (client) {
    const dsn = client.getOptions().dsn;
    console.log('🔍 DSN from client:', dsn || 'NOT SET');
  }

  try {
    throw new Error('🧪 Test Sentry error from API route - check Slack notification');
  } catch (error) {
    console.log('📤 Capturing exception...');
    const eventId = Sentry.captureException(error);
    console.log('✓ Event ID:', eventId);

    console.log('⏳ Flushing Sentry...');
    const flushed = await Sentry.flush(5000);
    console.log('✅ Flush result:', flushed);

    throw error;
  }
}
