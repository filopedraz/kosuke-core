'use server';

import { eq, sql } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { auth } from '@clerk/nextjs';

import { db } from '@/lib/db/drizzle';
import {
  activityLogs,
  type NewActivityLog,
  ActivityType,
} from '@/lib/db/schema';

// Note: These auth actions are now deprecated since Clerk handles authentication
// They are kept for compatibility with existing forms that may still reference them
// In a complete migration, these should be removed and forms updated to use Clerk directly

async function logActivity(userId: string, type: ActivityType, ipAddress?: string) {
  const newActivity: NewActivityLog = {
    userId: parseInt(userId), // Temporary conversion - this needs schema update for Clerk IDs
    action: type,
    ipAddress: ipAddress || '',
  };
  await db.insert(activityLogs).values(newActivity);
}

// Deprecated: Use Clerk's sign-in instead
export async function signIn() {
  redirect('/sign-in');
}

// Deprecated: Use Clerk's sign-up instead
export async function signUp() {
  redirect('/sign-up');
}

// Deprecated: Use Clerk's sign-out instead
export async function signOut() {
  redirect('/sign-in');
}

// Deprecated: Password management now handled by Clerk
export async function updatePassword() {
  redirect('/sign-in');
}

const deleteAccountSchema = z.object({
  password: z.string().min(8).max(100),
});

export const deleteAccount = validatedActionWithUser(deleteAccountSchema, async (data, _, user) => {
  const { password } = data;

  const isPasswordValid = await comparePasswords(password, user.passwordHash);
  if (!isPasswordValid) {
    return { error: 'Incorrect password. Account deletion failed.' };
  }

  await logActivity(user.id, ActivityType.DELETE_ACCOUNT);

  // Soft delete
  await db
    .update(users)
    .set({
      deletedAt: sql`CURRENT_TIMESTAMP`,
      email: sql`CONCAT(email, '-', id, '-deleted')`, // Ensure email uniqueness
    })
    .where(eq(users.id, user.id));

  (await cookies()).delete('session');
  redirect('/sign-in');
});

const updateAccountSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email address'),
});

export const updateAccount = validatedActionWithUser(
  updateAccountSchema,
  async (data, formData, user) => {
    try {
      const { name, email } = data;
      console.log('updateAccount', name, email);

      // Check if email is being changed and verify it's not already in use
      if (email !== user.email) {
        const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);

        if (existingUser.length > 0) {
          return { error: 'Email is already in use.' };
        }
      }

      // Update user information
      await db
        .update(users)
        .set({
          name,
          email,
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));

      await logActivity(user.id, ActivityType.UPDATE_ACCOUNT);

      return { success: 'Account updated successfully.' };
    } catch (error) {
      console.error('Error updating account:', error);
      return { error: 'Failed to update account. Please try again.' };
    }
  }
);

// New action for updating notification preferences
export async function updateNotificationPreferences(userId: number, marketingEmails: boolean) {
  try {
    if (!userId) {
      return { error: 'User not found' };
    }

    await Promise.all([
      db
        .update(users)
        .set({
          marketingEmails,
        })
        .where(eq(users.id, userId)),
      logActivity(userId, ActivityType.UPDATE_PREFERENCES),
    ]);

    return { success: 'Notification preferences updated successfully' };
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    return { error: 'Failed to update notification preferences' };
  }
}

// Separate function for handling profile image uploads
export async function updateProfileImage(_: FormData, formData: FormData) {
  try {
    // Get the user from the session
    const user = await getUser();
    if (!user) {
      return { error: 'User not authenticated' };
    }

    // Get current user to access the existing imageUrl
    const currentUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    // Handle profile image upload
    const profileImage = formData.get('profileImage');
    if (profileImage && typeof profileImage !== 'string' && profileImage.size > 0) {
      // Import the storage utility dynamically to prevent server/client mismatch
      const { uploadProfileImage, deleteProfileImage } = await import('@/lib/storage');

      // Delete previous image if exists
      if (currentUser?.imageUrl) {
        await deleteProfileImage(currentUser.imageUrl);
      }

      // Upload new image
      const imageUrl = await uploadProfileImage(profileImage, user.id);

      // Update the image URL in the database
      await db.update(users).set({ imageUrl, updatedAt: new Date() }).where(eq(users.id, user.id));

      await logActivity(user.id, ActivityType.UPDATE_PROFILE);
      return { success: 'Profile image updated successfully' };
    }

    return { error: 'No image provided' };
  } catch (error) {
    console.error('Error updating profile image:', error);
    return { error: 'Failed to update profile image. Please try again' };
  }
}
