import posthog from 'posthog-js';

export function initPostHog() {
  if (typeof window === 'undefined') return;

  const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const apiHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com';

  if (!apiKey) {
    console.warn('PostHog API key not found. Analytics will be disabled.');
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
