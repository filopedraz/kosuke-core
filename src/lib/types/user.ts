// User Profile and Settings Types
import type { User } from '@/lib/db/schema';

// Base User Data (from Clerk)
export interface BaseUser {
  id: string; // Clerk ID
  email: string;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string | null;
  username: string | null;
  createdAt: Date;
  updatedAt: Date;
}

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
export type UserProfile = DatabaseUser;

export interface UserWithSubscription extends UserProfile {
  subscription?: {
    tier: 'free' | 'pro' | 'business';
    status: string;
    currentPeriodEnd?: Date;
  };
}

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

// User Preferences
export interface NotificationSettings {
  emailNotifications: boolean;
  marketingEmails: boolean;
  securityAlerts: boolean;
}

// Pipeline Preference Types
export type PipelinePreference = 'kosuke' | 'claude-code';

export interface UserPreferences {
  notifications: NotificationSettings;
  theme?: 'light' | 'dark' | 'system';
  language?: string;
  pipelinePreference?: PipelinePreference;
}

// Form State Types for Settings Pages
export interface FormState {
  error?: string;
  success?: string;
}

export interface ProfileFormData {
  name: string;
  email: string;
  profileImage?: File;
}

export interface SecurityFormData {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
}

// API Response Types for User Operations
export interface UpdateProfileResponse {
  success: string;
  user?: UserProfile;
}

export interface UpdateNotificationResponse {
  success: string;
  preferences?: NotificationSettings;
}

export interface DeleteAccountResponse {
  success: boolean;
  message?: string;
}

// Profile Image Types
export interface ProfileImageState {
  imageUrl: string | null;
  isUploading: boolean;
  previewUrl: string | null;
  error: string | null;
}
