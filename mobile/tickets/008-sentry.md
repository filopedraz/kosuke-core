# 008 — Sentry Integration (Expo)

## Scope

Add error and performance monitoring using `sentry-expo`.

## Tech Decisions

- Use `sentry-expo` for the Expo managed workflow
- Configure DSN via `app.json` `extra.SENTRY_DSN`

## Acceptance Criteria

- Sentry initialized on app launch
- Unhandled errors appear in Sentry with device context
- Navigation traces captured (basic performance)

## Implementation Checklist

- [ ] Add dep: `sentry-expo`
- [ ] Initialize in `app/_layout.tsx` or a bootstrap module
- [ ] Configure `Sentry.init({ dsn: Constants.expoConfig?.extra?.SENTRY_DSN, enableInExpoDevelopment: true, tracesSampleRate: 1.0 })`
- [ ] Verify event in Sentry via a test error
- [ ] Configure EAS build to upload source maps (sentry-expo handles automatically)
