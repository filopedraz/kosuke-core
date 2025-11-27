'use client';

import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { ReactNode, useState } from 'react';

import { PostHogProvider } from '@/components/analytics/posthog-provider';
import { ThemeProvider } from '@/components/theme-provider';

interface ProvidersProps {
  children: ReactNode;
}

export default function Providers({ children }: ProvidersProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5, // 5 minutes
            gcTime: 1000 * 60 * 60 * 24, // 24 hours (persisted to localStorage)
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  const [persister] = useState(() =>
    createAsyncStoragePersister({
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    })
  );

  const enablePostHog = process.env.NEXT_PUBLIC_POSTHOG_ENABLED !== 'false';

  return (
    <PersistQueryClientProvider client={queryClient} persistOptions={{ persister }}>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
        {enablePostHog ? <PostHogProvider>{children}</PostHogProvider> : children}
      </ThemeProvider>
    </PersistQueryClientProvider>
  );
}
