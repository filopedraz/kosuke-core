// Dev-only stub for '@sentry/nextjs' to avoid bringing OpenTelemetry into development bundles
// Provides no-op implementations for the subset of APIs used in the app

export function init(): void {}

export function captureException(): void {}

export function replayIntegration(): Record<string, unknown> {
  return { name: 'noop-replay' };
}

export function captureRouterTransitionStart(): void {}

export function captureRequestError(): void {}

// Some consumers may access a default export namespace
const sentryStub = {
  init,
  captureException,
  replayIntegration,
  captureRouterTransitionStart,
  captureRequestError,
};

export default sentryStub;
