import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks(.*)',
  '/api/projects/(.*)/webhook(.*)', // Allow project webhook endpoints
  '/home',
  '/api/webhooks/clerk',
]);

export default clerkMiddleware(async (auth, req) => {
  // If it's not a public route and user is not authenticated, redirect to sign-in
  if (!isPublicRoute(req)) {
    const { userId } = await auth();
    if (!userId) {
      return (await auth()).redirectToSignIn();
    }
  }
});

export const config = {
  // Protects all routes, including api/trpc.
  // See https://clerk.com/docs/references/nextjs/auth-middleware
  // for more information about configuring your Middleware
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
};
