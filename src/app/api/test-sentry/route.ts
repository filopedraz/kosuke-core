import * as Sentry from '@sentry/nextjs';
import { NextResponse } from 'next/server';

export async function GET() {
  console.log('🧪 test-sentry route called');
  console.log('Sentry:', Sentry ? 'loaded' : 'NOT LOADED');
  console.log('Sentry.captureException:', typeof Sentry.captureException);
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('NEXT_PUBLIC_SENTRY_DSN:', process.env.NEXT_PUBLIC_SENTRY_DSN ? 'SET' : 'NOT SET');

  try {
    throw new Error('🧪 Test Sentry error - check Slack notification');
  } catch (error) {
    console.log('Catching error, calling Sentry.captureException');
    const eventId = Sentry.captureException(error, { level: 'error' });
    console.log('Event ID:', eventId);

    // Flush events to ensure they're sent before response
    await Sentry.flush(2000);
    console.log('✅ Flushed Sentry events');

    return NextResponse.json({ sent: true, eventId });
  }
}
