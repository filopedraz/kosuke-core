// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/
export async function initSentryServer() {
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
