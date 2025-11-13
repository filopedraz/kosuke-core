// Organization role types
export type OrganizationMembershipRole = 'org:admin' | 'org:member';

// Organization invitation status types
export type OrganizationInvitationStatus = 'pending' | 'accepted' | 'revoked';

export interface ClerkUser {
  id: string;
  email: string;
  name: string | null;
  imageUrl: string;
  marketingEmails: boolean;
  onboardingCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ClerkOrganization {
  id: string;
  name: string;
  slug: string | null;
  imageUrl: string;
  createdBy: string;
  isPersonal: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateUserData {
  firstName?: string;
  lastName?: string;
  marketingEmails?: boolean;
  onboardingCompleted?: boolean;
}
