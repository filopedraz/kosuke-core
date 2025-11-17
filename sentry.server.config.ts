// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

// Only initialize Sentry in production
if (process.env.NODE_ENV === 'production') {
  console.log('🔧 Initializing Sentry server...');
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 1.0,
    maxBreadcrumbs: 50,
    attachStacktrace: true,
    beforeSend(event) {
      console.log('📤 beforeSend called:', event.exception?.values?.[0]?.value);
      return event;
    },
  });
  console.log('✅ Sentry server initialized');
}
