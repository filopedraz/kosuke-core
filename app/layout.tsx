import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { ReactNode } from 'react';
import './globals.css';

import { ClerkThemeProvider } from '@/components/clerk-theme-provider';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import Providers from './providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Kosuke',
  description:
    'Build your next web project with AI. Describe what you want to build, and our AI will help you create it.',
  icons: {
    icon: '/favicon.ico',
  },
};

export const viewport: Viewport = {
  maximumScale: 1,
};

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <ClerkThemeProvider>
      <html lang="en" className={inter.className} suppressHydrationWarning>
        <body className="min-h-[100dvh] bg-background text-foreground overflow-x-hidden">
          <Providers>
            <div className="flex flex-col min-h-[100dvh]">
              <ErrorBoundary>
                <main className="flex-1">{children}</main>
              </ErrorBoundary>
            </div>
          </Providers>
          <Toaster />
        </body>
      </html>
    </ClerkThemeProvider>
  );
}
