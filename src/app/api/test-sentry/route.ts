import * as Sentry from '@sentry/nextjs';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    throw new Error('🧪 Test Sentry error - check Slack notification');
  } catch (error) {
    Sentry.captureException(error, { level: 'error' });
    return NextResponse.json({ sent: true });
  }
}
