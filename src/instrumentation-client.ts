// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

/**
 * Check if user has given consent for error tracking via Cookiebot
 * Sentry tracks errors which is classified as statistics
 */
function hasSentryConsent(): boolean {
  if (typeof window === 'undefined') return false;

  // If Cookiebot is not loaded yet, assume no consent
  if (!window.Cookiebot) return false;

  // Check if user has given statistics consent (Sentry error tracking)
  return window.Cookiebot.consent?.statistics === true;
}

// Only initialize Sentry in production and with consent
if (process.env.NODE_ENV === 'production') {
  // Check if Cookiebot consent is available, otherwise initialize anyway (fallback to banner consent)
  const shouldInit = !window.Cookiebot || hasSentryConsent();

  if (shouldInit) {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || 'development',
      integrations: [Sentry.replayIntegration()],
      tracesSampleRate: 1,
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
      debug: false,
    });
  }

  // Listen for Cookiebot consent changes
  if (window.Cookiebot) {
    window.addEventListener('CookiebotOnAccept', () => {
      if (hasSentryConsent() && !Sentry.getClient()) {
        // Re-initialize Sentry if consent was given after page load
        Sentry.init({
          dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
          environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || 'development',
          integrations: [Sentry.replayIntegration()],
          tracesSampleRate: 1,
          replaysSessionSampleRate: 0.1,
          replaysOnErrorSampleRate: 1.0,
          debug: false,
        });
      }
    });

    window.addEventListener('CookiebotOnDecline', () => {
      if (!hasSentryConsent() && Sentry.getClient()) {
        // Optionally disable Sentry if consent was withdrawn
        Sentry.close();
      }
    });
  }
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
