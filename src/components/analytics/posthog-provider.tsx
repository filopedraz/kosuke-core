'use client';

import { initPostHog, posthog } from '@/lib/analytics/posthog';
import { useUser } from '@clerk/nextjs';
import { usePathname, useSearchParams } from 'next/navigation';
import type { ReactNode } from 'react';
import { Suspense, useEffect } from 'react';

interface PostHogProviderProps {
  children: ReactNode;
}

function PostHogPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!pathname) return;

    let url = window.origin + pathname;
    if (searchParams && searchParams.toString()) {
      url = url + `?${searchParams.toString()}`;
    }

    // Track pageview
    posthog?.capture('$pageview', {
      $current_url: url,
    });
  }, [pathname, searchParams]);

  return null;
}

export function PostHogProvider({ children }: PostHogProviderProps) {
  const { user, isLoaded } = useUser();

  useEffect(() => {
    // Initialize PostHog on mount
    initPostHog();
  }, []);

  useEffect(() => {
    if (!isLoaded || !user) return;

    // Identify user in PostHog when Clerk user is loaded
    posthog?.identify(user.id, {
      email: user.primaryEmailAddress?.emailAddress,
      name: user.fullName,
      firstName: user.firstName,
      lastName: user.lastName,
      createdAt: user.createdAt,
    });
  }, [user, isLoaded]);

  return (
    <>
      <Suspense fallback={null}>
        <PostHogPageView />
      </Suspense>
      {children}
    </>
  );
}
