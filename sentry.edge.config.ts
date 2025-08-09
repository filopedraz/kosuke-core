// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// Note that this config is unrelated to the Vercel Edge Runtime and is also required when running locally.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/
export async function initSentryEdge() {
  const isProduction = process.env.NODE_ENV === 'production';
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!(isProduction && dsn)) return;
  const Sentry = await import('@sentry/nextjs');
  Sentry.init({
    dsn,
    tracesSampleRate: 1,
    enableLogs: false,
    debug: false,
  });
}
