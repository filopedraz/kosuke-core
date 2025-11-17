import * as Sentry from '@sentry/nextjs';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('📤 Capturing exception...');
    throw new Error('🧪 Test Sentry error - check Slack notification');
  } catch (error) {
    const eventId = Sentry.captureException(error, { level: 'error' });
    console.log('✓ Event ID:', eventId);

    console.log('⏳ Flushing Sentry...');
    const flushed = await Sentry.flush(5000);
    console.log('✅ Flush result:', flushed);

    return NextResponse.json({ sent: true, eventId, flushed });
  }
}
