import * as Sentry from '@sentry/nextjs';

export async function register() {
  const isProduction = process.env.NODE_ENV === 'production';
  if (!isProduction) return;

  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

export const onRequestError = Sentry.captureRequestError;
