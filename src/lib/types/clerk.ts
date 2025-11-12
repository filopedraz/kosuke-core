// Organization role types
export type OrganizationMembershipRole = 'org:admin' | 'org:member';

// Organization invitation status types
export type OrganizationInvitationStatus = 'pending' | 'accepted' | 'revoked';

// User role types (app-specific)
export type UserRole = 'member' | 'admin';

// Pipeline preference types (app-specific)
export type PipelinePreference = 'kosuke' | 'claude-code';

export interface ClerkUser {
  id: string;
  email: string;
  name: string | null;
  imageUrl: string;
  marketingEmails: boolean;
  pipelinePreference: PipelinePreference;
  role: UserRole;
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
  name?: string;
  marketingEmails?: boolean;
  pipelinePreference?: PipelinePreference;
}
