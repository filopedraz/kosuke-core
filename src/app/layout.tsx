import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import { ReactNode } from 'react';
import './globals.css';

import { ClerkThemeProvider } from '@/components/clerk-theme-provider';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import Providers from './providers';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
});

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://kosuke.ai';
const ogImage = `${baseUrl}/opengraph-image.jpg`;
const ogImageSquare = `${baseUrl}/opengraph-image-square.jpg`;

// Set NEXT_PUBLIC_ENABLE_INDEXING=true in production environment only
const enableIndexing = process.env.NEXT_PUBLIC_ENABLE_INDEXING === 'true';

const title = 'Kosuke - Reframing Vibe Coding';
const description =
  'Combine AI speed with engineering rigor to help you build faster and ship production-ready products.';

export const metadata: Metadata = {
  title,
  description,
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
  metadataBase: new URL(baseUrl),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title,
    description,
    url: '/',
    siteName: 'Kosuke',
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: ogImage,
        width: 1200,
        height: 630,
        alt: 'Kosuke - AI-Powered Web Development',
      },
      {
        url: ogImageSquare,
        width: 500,
        height: 500,
        alt: 'Kosuke - AI-Powered Web Development',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
    images: [ogImage],
  },
  icons: [
    {
      rel: 'icon',
      type: 'image/png',
      sizes: '96x96',
      url: '/favicon-96x96.png',
    },
    {
      rel: 'icon',
      type: 'image/svg+xml',
      url: '/favicon.svg',
    },
    {
      rel: 'shortcut icon',
      url: '/favicon.ico',
    },
    {
      rel: 'apple-touch-icon',
      sizes: '180x180',
      url: '/apple-touch-icon.png',
    },
  ],
  robots: {
    index: enableIndexing,
    follow: enableIndexing,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <ClerkThemeProvider>
      <html lang="en" className={`${inter.variable} dark antialiased`} suppressHydrationWarning>
        <body className="min-h-dvh bg-background text-foreground overflow-x-hidden font-sans">
          <Script
            id="Cookiebot"
            src="https://consent.cookiebot.com/uc.js"
            data-cbid="1d49650b-72ce-410d-b236-90f662688b3d"
            data-blockingmode="auto"
            strategy="beforeInteractive"
          />
          <Script
            defer
            data-domain="kosuke.ai"
            src="https://plausible.io/js/script.js"
            strategy="beforeInteractive"
          />
          <Providers>
            <div className="flex flex-col min-h-dvh">
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
