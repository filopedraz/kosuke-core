import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import Script from 'next/script';
import { ReactNode } from 'react';
import './globals.css';

import { ClerkThemeProvider } from '@/components/clerk-theme-provider';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import Providers from './providers';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Kosuke - Build Your Next Web Project with AI',
  description:
    'Build your next web project with AI. Describe what you want to build, and our AI will help you create it.',
  keywords: [
    'AI web development',
    'web project builder',
    'AI coding assistant',
    'web development tools',
    'AI-powered development',
    'web application builder',
    'coding assistant',
    'development platform',
  ],
  authors: [{ name: 'Kosuke Team' }],
  creator: 'Kosuke',
  publisher: 'Kosuke',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://kosuke.ai'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Kosuke - Build Your Next Web Project with AI',
    description:
      'Build your next web project with AI. Describe what you want to build, and our AI will help you create it.',
    url: '/',
    siteName: 'Kosuke',
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: '/logo.svg',
        width: 1200,
        height: 630,
        alt: 'Kosuke - AI-Powered Web Development',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Kosuke - Build Your Next Web Project with AI',
    description:
      'Build your next web project with AI. Describe what you want to build, and our AI will help you create it.',
    images: ['/logo.svg'],
  },
  // TODO: enable to true when we have proper content
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    // google: process.env.GOOGLE_SITE_VERIFICATION,
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
      <html
        lang="en"
        className={`${geistSans.variable} ${geistMono.variable} dark antialiased`}
        suppressHydrationWarning
      >
        <body className="min-h-[100dvh] bg-background text-foreground overflow-x-hidden">
          <Script
            defer
            data-domain="kosuke.ai"
            src="https://plausible.io/js/script.js"
            strategy="beforeInteractive"
          />
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
