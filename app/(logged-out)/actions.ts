'use server';

import { eq, sql } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { validatedAction, validatedActionWithUser } from '@/lib/auth/middleware';
import { comparePasswords, hashPassword, setSession } from '@/lib/auth/session';
import { db } from '@/lib/db/drizzle';
import { getUser } from '@/lib/db/queries';
import {
  users,
  activityLogs,
  type NewUser,
  type NewActivityLog,
  ActivityType,
} from '@/lib/db/schema';

async function logActivity(userId: number, type: ActivityType, ipAddress?: string) {
  const newActivity: NewActivityLog = {
    userId,
    action: type,
    ipAddress: ipAddress || '',
  };
  await db.insert(activityLogs).values(newActivity);
}

const signInSchema = z.object({
  email: z.string().email().min(3).max(255),
  password: z.string().min(8).max(100),
});

export const signIn = validatedAction(signInSchema, async data => {
  const { email, password } = data;

  const userResult = await db.select().from(users).where(eq(users.email, email)).limit(1);

  if (userResult.length === 0) {
    return {
      error: 'Invalid email or password. Please try again.',
      email,
      password,
    };
  }

  const foundUser = userResult[0];

  const isPasswordValid = await comparePasswords(password, foundUser.passwordHash);

  if (!isPasswordValid) {
    return {
      error: 'Invalid email or password. Please try again.',
      email,
      password,
    };
  }

  await Promise.all([setSession(foundUser), logActivity(foundUser.id, ActivityType.SIGN_IN)]);

  redirect('/projects');
});

const signUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const signUp = validatedAction(signUpSchema, async data => {
  const { email, password } = data;

  const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);

  if (existingUser.length > 0) {
    return {
      error: 'Failed to create user. Please try again.',
      email,
      password,
    };
  }

  const passwordHash = await hashPassword(password);

  const newUser: NewUser = {
    email,
    passwordHash,
    role: 'owner', // Default role
  };

  const [createdUser] = await db.insert(users).values(newUser).returning();

  if (!createdUser) {
    return {
      error: 'Failed to create user. Please try again.',
      email,
      password,
    };
  }

  await Promise.all([logActivity(createdUser.id, ActivityType.SIGN_UP), setSession(createdUser)]);

  redirect('/projects');
});

export async function signOut() {
  try {
    const user = await getUser();

    // Only log activity if user exists
    if (user) {
      await logActivity(user.id, ActivityType.SIGN_OUT);
    }

    // Always delete the session cookie
    (await cookies()).delete('session');
  } catch (error) {
    console.error('Error during sign out:', error);
    // Still delete the session cookie even if there's an error
    (await cookies()).delete('session');
  }
}

const updatePasswordSchema = z
  .object({
    currentPassword: z.string().min(8).max(100),
    newPassword: z.string().min(8).max(100),
    confirmPassword: z.string().min(8).max(100),
  })
  .refine(data => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

export const updatePassword = validatedActionWithUser(
  updatePasswordSchema,
  async (data, _, user) => {
    const { currentPassword, newPassword } = data;

    const isPasswordValid = await comparePasswords(currentPassword, user.passwordHash);

    if (!isPasswordValid) {
      return { error: 'Current password is incorrect.' };
    }

    if (currentPassword === newPassword) {
      return {
        error: 'New password must be different from the current password.',
      };
    }

    const newPasswordHash = await hashPassword(newPassword);

    await Promise.all([
      db.update(users).set({ passwordHash: newPasswordHash }).where(eq(users.id, user.id)),
      logActivity(user.id, ActivityType.UPDATE_PASSWORD),
    ]);

    return { success: 'Password updated successfully.' };
  }
);

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
