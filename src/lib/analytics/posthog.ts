import posthog from 'posthog-js';

/**
 * Check if user has given consent for statistics cookies via Cookiebot
 */
export function hasAnalyticsConsent(): boolean {
  if (typeof window === 'undefined') return false;

  // If Cookiebot is not loaded yet, assume no consent
  if (!window.Cookiebot) return false;

  // Check if user has given statistics consent
  return window.Cookiebot.consent?.statistics === true;
}

export function initPostHog() {
  if (typeof window === 'undefined') return;

  const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const apiHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com';

  if (!apiKey) {
    console.warn('PostHog API key not found. Analytics will be disabled.');
    return;
  }

  // Check for Cookiebot consent before initializing
  if (window.Cookiebot && !hasAnalyticsConsent()) {
    console.log('PostHog: Waiting for cookie consent');
    return;
  }

  if (!posthog.__loaded) {
    posthog.init(apiKey, {
      api_host: apiHost,
      person_profiles: 'identified_only',
      capture_pageview: false, // We'll manually capture pageviews
      capture_pageleave: true,
      autocapture: {
        dom_event_allowlist: ['click'], // Limit autocapture to clicks
        element_allowlist: ['button', 'a'],
      },
      loaded: instance => {
        // Enable debug mode in development
        if (process.env.NODE_ENV === 'development') {
          instance.debug();
        }
      },
    });
  }

  return posthog;
}

export { posthog };
