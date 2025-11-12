'use client';

import { hasAnalyticsConsent, initPostHog, posthog } from '@/lib/analytics/posthog';
import { useUser } from '@clerk/nextjs';
import { usePathname, useSearchParams } from 'next/navigation';
import type { ReactNode } from 'react';
import { Suspense, useEffect, useState } from 'react';

interface PostHogProviderProps {
  children: ReactNode;
}

function PostHogPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!pathname || !hasAnalyticsConsent()) return;

    let url = window.origin + pathname;
    if (searchParams && searchParams.toString()) {
      url = url + `?${searchParams.toString()}`;
    }

    // Track pageview only if consent given
    posthog?.capture('$pageview', {
      $current_url: url,
    });
  }, [pathname, searchParams]);

  return null;
}

export function PostHogProvider({ children }: PostHogProviderProps) {
  const { user, isLoaded } = useUser();
  const [consentGiven, setConsentGiven] = useState(false);

  useEffect(() => {
    // Check if consent already given
    if (hasAnalyticsConsent()) {
      initPostHog();
      setConsentGiven(true);
    }

    // Listen for Cookiebot consent acceptance
    const handleCookiebotAccept = () => {
      if (hasAnalyticsConsent()) {
        initPostHog();
        setConsentGiven(true);
      }
    };

    // Listen for Cookiebot consent decline/withdrawal
    const handleCookiebotDecline = () => {
      if (posthog?.__loaded) {
        posthog.opt_out_capturing();
        setConsentGiven(false);
      }
    };

    window.addEventListener('CookiebotOnAccept', handleCookiebotAccept);
    window.addEventListener('CookiebotOnDecline', handleCookiebotDecline);

    return () => {
      window.removeEventListener('CookiebotOnAccept', handleCookiebotAccept);
      window.removeEventListener('CookiebotOnDecline', handleCookiebotDecline);
    };
  }, []);

  useEffect(() => {
    if (!isLoaded || !user || !consentGiven) return;

    // Identify user in PostHog when Clerk user is loaded and consent given
    posthog?.identify(user.id, {
      email: user.primaryEmailAddress?.emailAddress,
      name: user.fullName,
      firstName: user.firstName,
      lastName: user.lastName,
      createdAt: user.createdAt,
    });
  }, [user, isLoaded, consentGiven]);

  return (
    <>
      <Suspense fallback={null}>
        <PostHogPageView />
      </Suspense>
      {children}
    </>
  );
}
