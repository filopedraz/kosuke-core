'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { useUser } from '@/hooks/use-user';
import { redirect } from 'next/navigation';
import { useEffect } from 'react';

function HomeLoadingSkeleton() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-6 w-6 rounded" />
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="hidden md:flex items-center gap-4">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8 flex-1 space-y-8">
        <div className="space-y-3">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-80" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-36" />
          <Skeleton className="h-10 w-28" />
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="rounded-lg border p-4 space-y-3">
              <Skeleton className="h-24 w-full rounded-md" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
              <div className="flex items-center justify-between">
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-8 w-8 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </main>
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
        redirect('/home');
      }
    }
  }, [isLoading, clerkUser, dbUser]);

  // Show loading skeleton while checking authentication
  return <HomeLoadingSkeleton />;
}
