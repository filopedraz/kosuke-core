import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { ReactNode } from 'react';

import { auth } from '@/lib/auth/server';
import { db } from '@/lib/db/drizzle';
import { users } from '@/lib/db/schema';
import ProjectNavbar from './components/layout/project-navbar';

// Define User type for Navbar (can be extracted to a shared types file later)
type UserForNavbar = {
  id: number;
  name?: string;
  email: string;
  imageUrl?: string;
} | null;

export default async function ProjectDetailLayout({ children }: { children: ReactNode }) {
  const { userId } = await auth();

  if (!userId) {
    // Or redirect to login, depending on desired behavior for layouts
    notFound();
  }

  // Fetch user details for the navbar
  const [userDetails] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      imageUrl: users.imageUrl
    })
    .from(users)
    .where(eq(users.clerkUserId, userId))
    .limit(1);

  const userForNavbar: UserForNavbar = userDetails ? {
    ...userDetails,
    name: userDetails.name ?? undefined, // Ensure name is string | undefined
    imageUrl: userDetails.imageUrl ?? undefined // Ensure imageUrl is string | undefined
  } : null;

  if (!userForNavbar) {
    // Handle case where user details couldn't be fetched but session exists
    console.error("Session exists but user details not found for ID:", session.user.id);
    notFound(); // Or show an error state
  }

  return (
    <div className="flex flex-col h-screen w-full">
      <ProjectNavbar user={userForNavbar} />
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  );
}
