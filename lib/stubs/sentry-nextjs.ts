// Dev-only stub for '@sentry/nextjs' to avoid bringing OpenTelemetry into development bundles
// Provides no-op implementations for the subset of APIs used in the app

export function init(_: unknown): void {}

export function captureException(_: unknown): void {}

export function replayIntegration(): Record<string, unknown> {
  return { name: 'noop-replay' };
}

export function captureRouterTransitionStart(..._args: unknown[]): void {}

export function captureRequestError(..._args: unknown[]): void {}

// Some consumers may access a default export namespace
export default {
  init,
  captureException,
  replayIntegration,
  captureRouterTransitionStart,
  captureRequestError,
};
