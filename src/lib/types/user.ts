import type { User as ClerkUser_SDK } from '@clerk/nextjs/server';
import type { ClerkUser } from './clerk';

// User profile data (same as ClerkUser for now)
export type UserProfile = ClerkUser;

// Enhanced User (for UI components)
export interface EnhancedUser extends UserProfile {
  // Clerk SDK object (for hooks that need it)
  clerkUser: ClerkUser_SDK;

  // Computed fields
  fullName: string;
  initials: string;
  displayName: string;
}

// Unified User Hook Return Type
export interface UseUserReturn {
  // Primary data
  user: EnhancedUser | null;
  clerkUser: ClerkUser_SDK | null;

  // Loading states
  isLoading: boolean;
  isLoaded: boolean;
  isSignedIn: boolean;

  // Error states
  error: Error | null;

  // Computed helpers
  imageUrl: string | null;
  displayName: string;
  initials: string;

  // Mutations
  updateProfile: (data: FormData) => Promise<void>;
  updateProfileImage: (file: File) => Promise<void>;
  deleteAccount: () => Promise<void>;

  // Utilities
  refresh: () => Promise<void>;
}

// API Response Types for User Operations
export interface UpdateProfileResponse {
  success: string;
  user?: UserProfile;
}
