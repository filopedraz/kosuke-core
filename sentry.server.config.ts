// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
const isProduction = process.env.NODE_ENV === 'production';

if (dsn && isProduction) {
  console.log('🚀 Initializing Sentry');
  Sentry.init({
    dsn,
    tracesSampleRate: 1.0,
    maxBreadcrumbs: 50,
    attachStacktrace: true,
  });
  console.log('✅ Sentry initialized');
} else {
  console.log('⏭️  Sentry disabled:', { hasDsn: !!dsn, isProduction });
}
