// User Profile and Settings Types
import type { User } from '@/lib/db/schema';

// Database User (from our database)
export type DatabaseUser = Pick<
  User,
  'clerkUserId' | 'name' | 'email' | 'imageUrl' | 'pipelinePreference' | 'createdAt' | 'updatedAt'
>;

// Enhanced User (combined data with computed fields)
export interface EnhancedUser extends DatabaseUser {
  // Clerk data
  clerkUser: unknown;

  // Computed fields
  fullName: string;
  initials: string;
  displayName: string;

  // Optional subscription data
  subscription?: {
    tier: 'free' | 'pro' | 'business';
    status: string;
    currentPeriodEnd?: Date;
  };
}

// Legacy types for backward compatibility
type UserProfile = DatabaseUser;

// Unified User Hook Return Type
export interface UseUserReturn {
  // Primary data
  user: EnhancedUser | null;
  clerkUser: unknown;
  dbUser: DatabaseUser | null;

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
  updatePipelinePreference: (preference: PipelinePreference) => Promise<void>;
  deleteAccount: () => Promise<void>;

  // Utilities
  refresh: () => Promise<void>;
}

// Pipeline Preference Types
export type PipelinePreference = 'kosuke' | 'claude-code';

// API Response Types for User Operations
export interface UpdateProfileResponse {
  success: string;
  user?: UserProfile;
}
