import { auth as clerkAuth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export { clerkAuth as auth };

export async function requireAuth() {
  const { userId } = await clerkAuth();
  if (!userId) {
    redirect('/sign-in');
  }
  return userId;
}

export async function getCurrentUser() {
  return await currentUser();
}

export async function getUserId() {
  const { userId } = await clerkAuth();
  return userId;
}
