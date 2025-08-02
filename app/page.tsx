'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { useUser } from '@/hooks/use-user';
import { redirect } from 'next/navigation';
import { useEffect } from 'react';

function HomeLoadingSkeleton() {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center space-y-4">
        <Skeleton className="h-8 w-32 mx-auto" />
        <Skeleton className="h-4 w-48 mx-auto" />
      </div>
    </div>
  );
}

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
