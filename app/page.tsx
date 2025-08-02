'use client';

import { HomeLoadingSkeleton } from '@/app/(logged-in)/projects/components/home-loading-skeleton';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useUser } from '@clerk/nextjs';
import { redirect } from 'next/navigation';
import { useEffect } from 'react';

export default function Home() {
  const { user: clerkUser, isLoaded } = useUser();
  const { data: user, isLoading: isUserLoading } = useCurrentUser();

  useEffect(() => {
    if (isLoaded && !isUserLoading) {
      if (clerkUser && user) {
        redirect('/projects');
      } else {
        redirect('/waitlist');
      }
    }
  }, [isLoaded, isUserLoading, clerkUser, user]);

  // Show loading skeleton while checking authentication
  return <HomeLoadingSkeleton />;
}
