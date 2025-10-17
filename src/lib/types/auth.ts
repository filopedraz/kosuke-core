export interface AuthUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string;
  username: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthSession {
  user: AuthUser;
  isLoaded: boolean;
  isSignedIn: boolean;
}

export interface AuthStatus {
  isLoaded: boolean;
  isSignedIn: boolean;
  user: AuthUser | null;
}

export interface UserProfile {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  imageUrl: string;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  createdAt: Date;
  lastSignInAt: Date | null;
}

export interface AuthError {
  code: string;
  message: string;
  longMessage?: string;
}
