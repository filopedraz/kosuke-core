'use client';

import { HomeLoadingSkeleton } from '@/app/(logged-in)/projects/components/home-loading-skeleton';
import { useUser } from '@/hooks/use-user';
import { redirect } from 'next/navigation';
import { useEffect } from 'react';

export default function Home() {
  const { clerkUser, dbUser, isLoading } = useUser();

  useEffect(() => {
    if (!isLoading) {
      if (clerkUser && dbUser) {
        redirect('/projects');
      } else {
        redirect('/waitlist');
      }
    }
  }, [isLoading, clerkUser, dbUser]);

  // Show loading skeleton while checking authentication
  return <HomeLoadingSkeleton />;
}
