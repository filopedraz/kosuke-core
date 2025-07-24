# 📋 Ticket 15: Replace Authentication with Clerk

**Priority:** Critical  
**Estimated Effort:** 6 hours

## Description

Remove the current authentication system and replace it entirely with Clerk. This includes updating all auth-related imports, middleware, session handling, and user management throughout the application.

## Files to Update/Replace

```
lib/auth/ (entire directory - REPLACE)
middleware.ts (update)
app/layout.tsx (update providers)
app/providers.tsx (update)
components/auth/ (update for Clerk)
All files importing from @/lib/auth (update imports)
package.json (add Clerk dependencies)
.env.local (add Clerk environment variables)
```

## Implementation Details

**package.json** - Add Clerk dependencies:

```json
{
  "dependencies": {
    "@clerk/nextjs": "^4.29.0",
    "@clerk/themes": "^1.7.9"
  }
}
```

**.env.local** - Clerk environment variables:

```bash
# Clerk Configuration
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_publishable_key
CLERK_SECRET_KEY=sk_test_your_secret_key
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/projects
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/projects
```

**lib/auth/index.tsx** - Replace with Clerk utilities:

```typescript
import { auth as clerkAuth, currentUser } from '@clerk/nextjs';
import { redirect } from 'next/navigation';

export { clerkAuth as auth };

export async function requireAuth() {
  const { userId } = clerkAuth();
  if (!userId) {
    redirect('/sign-in');
  }
  return userId;
}

export async function getCurrentUser() {
  return await currentUser();
}

export async function getUserId() {
  const { userId } = clerkAuth();
  return userId;
}
```

**middleware.ts** - Update for Clerk:

```typescript
import { authMiddleware } from '@clerk/nextjs';

export default authMiddleware({
  // Routes that can be accessed while signed out
  publicRoutes: ['/', '/sign-in(.*)', '/sign-up(.*)', '/api/webhooks(.*)', '/home', '/waitlist'],
  // Routes that can always be accessed, and have
  // no authentication information
  ignoredRoutes: ['/api/webhooks/clerk', '/api/webhooks/stripe'],
});

export const config = {
  // Protects all routes, including api/trpc.
  // See https://clerk.com/docs/references/nextjs/auth-middleware
  // for more information about configuring your Middleware
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
};
```

**app/layout.tsx** - Update with ClerkProvider:

```tsx
import { ClerkProvider } from '@clerk/nextjs';
import { dark } from '@clerk/themes';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      appearance={{
        baseTheme: dark,
        variables: {
          colorPrimary: '#3b82f6',
          colorBackground: '#0a0a0a',
          colorInputBackground: '#1a1a1a',
          colorInputText: '#ffffff',
        },
        elements: {
          formButtonPrimary: 'bg-blue-600 hover:bg-blue-700',
          card: 'bg-gray-900 border-gray-800',
        },
      }}
    >
      <html lang="en" className="dark">
        <body className={inter.className}>{children}</body>
      </html>
    </ClerkProvider>
  );
}
```

**app/(logged-in)/layout.tsx** - Update authentication check:

```tsx
import { requireAuth } from '@/lib/auth';
import { Navbar } from '@/components/ui/navbar';

export default async function LoggedInLayout({ children }: { children: React.ReactNode }) {
  // This will redirect to sign-in if not authenticated
  await requireAuth();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
```

**app/(logged-out)/sign-in/page.tsx** - Clerk SignIn component:

```tsx
import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignIn
        appearance={{
          elements: {
            rootBox: 'mx-auto',
            card: 'bg-gray-900 border-gray-800',
          },
        }}
      />
    </div>
  );
}
```

**app/(logged-out)/sign-up/page.tsx** - Clerk SignUp component:

```tsx
import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignUp
        appearance={{
          elements: {
            rootBox: 'mx-auto',
            card: 'bg-gray-900 border-gray-800',
          },
        }}
      />
    </div>
  );
}
```

**components/ui/navbar.tsx** - Update with Clerk UserButton:

```tsx
import { UserButton, currentUser } from '@clerk/nextjs';
import Link from 'next/link';

export async function Navbar() {
  const user = await currentUser();

  return (
    <nav className="border-b border-gray-800 bg-gray-900/50 backdrop-blur">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/projects" className="text-xl font-bold">
          Kosuke
        </Link>

        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-400">{user?.emailAddresses[0]?.emailAddress}</span>
          <UserButton
            appearance={{
              elements: {
                avatarBox: 'w-8 h-8',
                userButtonPopoverCard: 'bg-gray-900 border-gray-800',
                userButtonPopoverActions: 'bg-gray-900',
              },
            }}
            afterSignOutUrl="/"
          />
        </div>
      </div>
    </nav>
  );
}
```

**lib/github/auth.ts** - Update for Clerk user IDs:

```typescript
import { auth } from '@clerk/nextjs';
import { db } from '@/lib/db';
import { userGithubTokens } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export interface GitHubTokenInfo {
  access_token: string;
  scope: string;
  token_type: string;
}

export async function storeGitHubToken(tokenInfo: GitHubTokenInfo, username: string) {
  const { userId } = auth();
  if (!userId) throw new Error('Not authenticated');

  await db
    .insert(userGithubTokens)
    .values({
      userId,
      githubToken: tokenInfo.access_token,
      githubUsername: username,
      tokenScope: tokenInfo.scope.split(','),
    })
    .onConflictDoUpdate({
      target: userGithubTokens.userId,
      set: {
        githubToken: tokenInfo.access_token,
        githubUsername: username,
        tokenScope: tokenInfo.scope.split(','),
        updatedAt: new Date(),
      },
    });
}

export async function getGitHubToken(): Promise<string | null> {
  const { userId } = auth();
  if (!userId) return null;

  const result = await db
    .select()
    .from(userGithubTokens)
    .where(eq(userGithubTokens.userId, userId))
    .limit(1);
  return result[0]?.githubToken || null;
}

export async function getUserGitHubInfo() {
  const { userId } = auth();
  if (!userId) return null;

  const result = await db
    .select()
    .from(userGithubTokens)
    .where(eq(userGithubTokens.userId, userId))
    .limit(1);
  return result[0] || null;
}

export async function disconnectGitHub() {
  const { userId } = auth();
  if (!userId) throw new Error('Not authenticated');

  await db.delete(userGithubTokens).where(eq(userGithubTokens.userId, userId));
}
```

**Migration script for existing auth imports:**

```bash
# Find and replace auth imports throughout the codebase
find . -name "*.ts" -o -name "*.tsx" | xargs sed -i 's/import { auth } from.*auth.*/import { auth } from "@clerk\/nextjs";/g'
find . -name "*.ts" -o -name "*.tsx" | xargs sed -i 's/session\.user\.id/userId/g'
```

## Acceptance Criteria

- [x] Clerk fully integrated and configured
- [x] All existing auth logic replaced with Clerk
- [x] Sign-in/sign-up pages using Clerk components
- [x] Middleware updated for Clerk route protection
- [x] User profile management via Clerk UserButton
- [x] GitHub token storage updated for Clerk user IDs
- [x] No broken auth imports remain

---

## 🎯 Updated Summary

This comprehensive plan now covers:

**Phase 1: Infrastructure & Preview Migration (Tickets 1-7)**

- Rename agent endpoints folder to routes (consistency)
- Set up Python testing infrastructure (pytest, ruff, mypy)
- Set up pre-commit hooks for code quality
- Move Docker container management from Next.js to Python agent
- Create clean API proxy layer in Next.js
- Remove old preview logic

**Phase 2: GitHub Integration (Tickets 6-11)**

- OAuth integration with Clerk
- Repository creation and import
- Auto-commit with session-based checkpoints
- Complete webhook integration

**Phase 3: Enhanced GitHub UI & Modern Auth (Tickets 12-13)**

- Branch management and pull request creation UI
- Complete Clerk authentication migration

**Total Estimated Effort:** ~41.5 hours

**Benefits:**
✅ Lean Next.js focused on frontend  
✅ Modern Clerk authentication  
✅ Complete GitHub workflow with PR creation  
✅ Centralized agent handling all operations  
✅ Auto-commit with visual branch management  
✅ Clean separation of concerns
