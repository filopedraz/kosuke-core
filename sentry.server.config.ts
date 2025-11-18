// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

const dsn = process.env.SENTRY_DSN;
const environment = process.env.SENTRY_ENVIRONMENT || 'development';

const sentryOptions: Sentry.NodeOptions = {
  dsn,
  environment,
  tracesSampleRate: 1.0,
  maxBreadcrumbs: 50,
  attachStacktrace: true,
};

console.log('🚀 Initializing Sentry');
Sentry.init(sentryOptions);
console.log('✅ Sentry initialized');
