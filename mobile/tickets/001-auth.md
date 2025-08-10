# 001 — Authentication (Clerk Expo + GitHub OAuth)

## Scope

Implement read-only authentication using Clerk in Expo (managed workflow) with GitHub OAuth. Add a sign-in screen, session persistence, and a simple account screen showing basic user info. Configure deep link scheme and environment values.

## User Story

As an authenticated user, I can sign in with GitHub via Clerk and access my projects and chat data. My session persists across app restarts.

## Requirements

- Use `@clerk/clerk-expo` with `expo-auth-session` and `expo-secure-store` token cache
- Configure deep link scheme (e.g., `kosuke`) for OAuth callbacks
- Load `publishableKey` (and optional `proxyUrl`) from app config extra
- Provide Sign In screen with a single button: “Continue with GitHub”
- Provide Sign Out from Settings screen
- Guard protected routes when not authenticated

## Tech Decisions

- Expo managed workflow (no bare eject)
- Expo Router for navigation flow
- Token cache with `SecureStore` provided by `clerk-expo`
- No write endpoints; strictly read-only UI after login

## App Config & Env

- `mobile/app.json` (or `app.config.ts`) `extra` keys:
  - `CLERK_PUBLISHABLE_KEY`
  - `CLERK_PROXY_URL` (optional for dev proxy)
  - `API_BASE_URL` (e.g., `http://localhost:3000/api`)
  - `SENTRY_DSN` (for ticket 008)
- Configure deep link: `scheme: "kosuke"`

## Screens/Flows

- `/(auth)/sign-in`: Shows GitHub button; invokes `useOAuth({ strategy: 'oauth_github' })`
- Auth guard wrapper to redirect unauthenticated users to sign-in
- `/(tabs)/settings`: shows current user info and a Sign Out button

## Acceptance Criteria

- Launch app → unauthenticated users see Sign In
- Tapping “Continue with GitHub” triggers the OAuth flow and returns to app
- After success, user is routed to Projects tab
- Closing and reopening app preserves session
- Sign Out removes session and returns to Sign In
- Error states show a friendly message

## Implementation Checklist

- [ ] Add deps: `@clerk/clerk-expo expo-auth-session expo-secure-store`
- [ ] Configure `ClerkProvider` at root with `publishableKey`
- [ ] Implement `tokenCache` via `SecureStore`
- [ ] Configure deep link `scheme: "kosuke"` in app config
- [ ] Implement Sign In screen with GitHub OAuth
- [ ] Implement auth guard for protected routes
- [ ] Implement Settings screen with Sign Out
- [ ] QA on iOS Simulator and Android Emulator

## Notes

- GitHub is already configured in Clerk (per stakeholder). We only need `publishableKey` and scheme setup.
