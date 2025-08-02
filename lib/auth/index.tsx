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
