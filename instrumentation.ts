export async function register() {
  const isProduction = process.env.NODE_ENV === 'production';
  if (!isProduction) return;

  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initSentryServer } = await import('./sentry.server.config');
    await initSentryServer();
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    const { initSentryEdge } = await import('./sentry.edge.config');
    await initSentryEdge();
  }
}

export async function onRequestError(error: unknown, request: Request) {
  if (process.env.NODE_ENV !== 'production') return;
  const Sentry = await import('@sentry/nextjs');
  // Delegate to Sentry's helper when in production only
  // @ts-ignore – nextjs types for captureRequestError are provided by the package
  return Sentry.captureRequestError(error as Error, request);
}
