// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

console.log('🔧 sentry.server.config.ts loaded');
console.log('  NODE_ENV:', process.env.NODE_ENV);
console.log('  NEXT_PUBLIC_SENTRY_DSN:', process.env.NEXT_PUBLIC_SENTRY_DSN ? 'SET' : 'NOT SET');

// Only initialize Sentry in production
if (process.env.NODE_ENV === 'production') {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (dsn) {
    console.log('🚀 Initializing Sentry with DSN');
    Sentry.init({
      dsn,
      tracesSampleRate: 1.0,
      maxBreadcrumbs: 50,
      attachStacktrace: true,
      debug: true,
    });
    console.log('✅ Sentry initialized successfully');
  } else {
    console.error('❌ NEXT_PUBLIC_SENTRY_DSN is not set, skipping Sentry initialization');
  }
} else {
  console.log('⏭️  Skipping Sentry initialization (NODE_ENV is not production)');
}
