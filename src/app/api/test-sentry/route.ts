import * as Sentry from '@sentry/nextjs';

/**
 * Test endpoint to verify Sentry server-side error capture
 * Manual capture + flush ensures event is sent before response closes
 */
export async function GET() {
  // Verify Sentry is initialized
  const client = Sentry.getClient();
  const dsn = client?.getOptions().dsn;
  console.log('🔍 Sentry client:', client ? 'EXISTS' : 'NOT FOUND');
  console.log('🔍 Sentry DSN:', dsn || 'NOT SET');
  console.log('🔍 NODE_ENV:', process.env.NODE_ENV);

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
