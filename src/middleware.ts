import { clerkService } from '@/lib/clerk';
import { clerkMiddleware, ClerkMiddlewareAuth, createRouteMatcher } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/home',
  '/terms',
  '/privacy',
  '/cookies',
  '/blog',
  '/blog/:path*',
  '/customers',
  '/pricing',
  '/customers/:path*',
  '/solutions/ship-with-engineers',
  '/solutions/enabling-collaboration',
  '/solutions/on-premise',
  '/solutions/startup-program',
  // Sentry monitoring tunnel (must be public for error reporting)
  '/monitoring',
  '/monitoring(.*)',
  // SEO and metadata routes
  '/robots.txt',
  '/sitemap.xml',
  '/favicon.ico',
  '/favicon.svg',
  '/favicon-96x96.png',
  '/apple-touch-icon.png',
  '/opengraph-image.jpg',
  '/opengraph-image-square.jpg',
]);

const isProtectedRoute = createRouteMatcher([
  '/projects(.*)',
  '/settings(.*)',
  '/organizations(.*)',
  '/onboarding',
]);
const isOnboardingRoute = createRouteMatcher(['/onboarding']);
const isRootRoute = createRouteMatcher(['/']);
const isApiRoute = createRouteMatcher(['/api(.*)']);

export const baseMiddleware = async (auth: ClerkMiddlewareAuth, req: NextRequest) => {
  if (isApiRoute(req)) return NextResponse.next();

  const { userId, redirectToSignIn } = await auth();

  if (!userId && !isPublicRoute(req)) return redirectToSignIn({ returnBackUrl: req.url });

  if (userId) {
    // Check if user has completed onboarding
    const hasCompletedOnboarding = await clerkService.hasCompletedOnboarding(userId);

    // If onboarding not completed and not on onboarding page, redirect to onboarding
    if (!hasCompletedOnboarding && !isOnboardingRoute(req)) {
      return NextResponse.redirect(new URL('/onboarding', req.url));
    }

    // If onboarding completed and on onboarding page, redirect to projects
    if (hasCompletedOnboarding && isOnboardingRoute(req)) {
      return NextResponse.redirect(new URL('/projects', req.url));
    }

    if (isProtectedRoute(req)) return NextResponse.next();
    if (isPublicRoute(req) && !isRootRoute(req)) return NextResponse.next();
    return NextResponse.redirect(new URL(`/projects`, req.url));
  }

  return NextResponse.next();
};

export default clerkMiddleware(baseMiddleware);

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
