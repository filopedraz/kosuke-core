// User Profile and Settings Types
import type { User } from '@/lib/db/schema';

// Extended User Types
export interface UserProfile extends Pick<User, 'id' | 'clerkUserId' | 'name' | 'email' | 'imageUrl'> {
  createdAt: Date;
  updatedAt: Date;
}

export interface UserWithSubscription extends UserProfile {
  subscription?: {
    tier: 'free' | 'pro' | 'business';
    status: string;
    currentPeriodEnd?: Date;
  };
}

// User Preferences
export interface NotificationSettings {
  emailNotifications: boolean;
  marketingEmails: boolean;
  securityAlerts: boolean;
}

export interface UserPreferences {
  notifications: NotificationSettings;
  theme?: 'light' | 'dark' | 'system';
  language?: string;
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