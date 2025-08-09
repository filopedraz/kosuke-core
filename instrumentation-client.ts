// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/
// Import Sentry dynamically only when needed to avoid loading it in development bundles

const isProduction = process.env.NODE_ENV === 'production';
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (isProduction && dsn) {
  import('@sentry/nextjs').then(Sentry => {
    Sentry.init({
      dsn,
      integrations: [Sentry.replayIntegration()],
      tracesSampleRate: 1,
      enableLogs: false,
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
      debug: false,
    });
  });
}

export function onRouterTransitionStart(...args: unknown[]) {
  if (!isProduction) return;
  import('@sentry/nextjs').then(Sentry => {
    // @ts-ignore – Types require args; we forward whatever Next.js passes
    Sentry.captureRouterTransitionStart(...(args as unknown[]));
  });
}
