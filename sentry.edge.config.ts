// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// Note that this config is unrelated to the Vercel Edge Runtime and is also required when running locally.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
const isProduction = process.env.NODE_ENV === 'production';

if (dsn && isProduction) {
  console.log('🚀 Initializing Sentry (Edge)');
  Sentry.init({
    dsn,
    tracesSampleRate: 1.0,
    maxBreadcrumbs: 50,
    attachStacktrace: true,
  });
  console.log('✅ Sentry (Edge) initialized');
} else {
  console.log('⏭️  Sentry (Edge) disabled:', { hasDsn: !!dsn, isProduction });
}
