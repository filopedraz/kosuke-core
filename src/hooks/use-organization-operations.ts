import { useOrganization, useOrganizationList } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { useToast } from '@/hooks/use-toast';

interface CreateOrganizationParams {
  name: string;
  logo?: File;
}

interface UpdateOrganizationLogoParams {
  file: File;
}

interface UserInvitation {
  id: string;
  emailAddress: string;
  organizationId: string;
  organizationName?: string;
  organizationImageUrl?: string;
  organizationSlug?: string | null;
  organizationIsPersonal?: boolean;
  role: string;
  createdAt: Date;
  status: string;
}

interface InviteMemberParams {
  email: string;
  organizationId: string;
}

interface RemoveMemberParams {
  userId: string;
  organizationId: string;
}

interface RevokeInvitationParams {
  invitationId: string;
  organizationId: string;
}

interface TransferOwnershipParams {
  newOwnerId: string;
  organizationId: string;
}

interface UseOrganizationOperationsReturn {
  // Creation
  createOrganization: (params: CreateOrganizationParams) => Promise<void>;
  isCreating: boolean;

  // Logo operations
  uploadLogo: (params: UpdateOrganizationLogoParams) => Promise<void>;
  isUploadingLogo: boolean;
  deleteLogo: () => Promise<void>;
  isDeletingLogo: boolean;

  // Deletion
  deleteOrganization: (orgId: string) => Promise<void>;
  isDeleting: boolean;

  // Leave
  leaveOrganization: (orgId: string) => Promise<void>;
  isLeaving: boolean;

  // User Invitations (received)
  invitations: UserInvitation[];
  isLoadingInvitations: boolean;
  acceptInvitation: (invitationId: string) => Promise<void>;
  acceptingInvitationId: string | null;

  // Member Management (admin actions)
  inviteMember: (params: InviteMemberParams) => Promise<void>;
  isInvitingMember: boolean;
  removeMember: (params: RemoveMemberParams) => Promise<void>;
  removingMemberId: string | null;
  revokeInvitation: (params: RevokeInvitationParams) => Promise<void>;
  revokingInvitationId: string | null;
  transferOwnership: (params: TransferOwnershipParams) => Promise<void>;
  isTransferringOwnership: boolean;

  // Current organization
  organization: ReturnType<typeof useOrganization>['organization'];
  membership: ReturnType<typeof useOrganization>['membership'];
}

export function useOrganizationOperations(): UseOrganizationOperationsReturn {
  const router = useRouter();
  const { toast } = useToast();
  const { organization, membership } = useOrganization();
  const { userMemberships, setActive, userInvitations } = useOrganizationList({
    userMemberships: { infinite: true, keepPreviousData: true },
    userInvitations: { infinite: true, status: 'pending', keepPreviousData: true },
  });

  const [isCreating, setIsCreating] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isDeletingLogo, setIsDeletingLogo] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [acceptingInvitationId, setAcceptingInvitationId] = useState<string | null>(null);
  const [invitations, setInvitations] = useState<UserInvitation[]>([]);
  const [isInvitingMember, setIsInvitingMember] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [revokingInvitationId, setRevokingInvitationId] = useState<string | null>(null);
  const [isTransferringOwnership, setIsTransferringOwnership] = useState(false);

  // Process invitations from Clerk
  useEffect(() => {
    if (userInvitations?.data) {
      const processedInvitations: UserInvitation[] = userInvitations.data.map(inv => {
        const orgData = inv.publicOrganizationData as {
          id: string;
          name: string;
          imageUrl: string;
          slug: string | null;
          publicMetadata?: { isPersonal?: boolean };
        };
        return {
          id: inv.id,
          emailAddress: inv.emailAddress,
          organizationId: orgData.id,
          organizationName: orgData.name,
          organizationImageUrl: orgData.imageUrl,
          organizationSlug: orgData.slug,
          organizationIsPersonal: orgData.publicMetadata?.isPersonal,
          role: inv.role,
          createdAt: inv.createdAt,
          status: inv.status,
        };
      });
      setInvitations(processedInvitations);
    }
  }, [userInvitations?.data]);

  const createOrganization = async ({ name, logo }: CreateOrganizationParams) => {
    if (!name.trim()) {
      toast({
        title: 'Error',
        description: 'Organization name is required',
        variant: 'destructive',
      });
      return;
    }

    setIsCreating(true);
    try {
      const formData = new FormData();
      formData.append('name', name);
      if (logo) {
        formData.append('logo', logo);
      }

      const response = await fetch('/api/organizations', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to create organization');

      const { data } = await response.json();

      // Switch to the new org
      if (setActive && data.clerkOrgId) {
        await setActive({ organization: data.clerkOrgId });
      }

      toast({
        title: 'Success',
        description: 'Organization created successfully',
      });

      // Revalidate memberships to show the new organization
      await userMemberships.revalidate?.();
    } catch (_error) {
      toast({
        title: 'Error',
        description: 'Failed to create organization',
        variant: 'destructive',
      });
      throw _error;
    } finally {
      setIsCreating(false);
    }
  };

  const uploadLogo = async ({ file }: UpdateOrganizationLogoParams) => {
    if (!organization) {
      toast({
        title: 'Error',
        description: 'No organization selected',
        variant: 'destructive',
      });
      return;
    }

    setIsUploadingLogo(true);
    try {
      await organization.setLogo({ file });
      toast({
        title: 'Success',
        description: 'Organization logo updated',
      });
      router.refresh();
    } catch (error) {
      const errorMessage =
        error && typeof error === 'object' && 'errors' in error
          ? (error.errors as Array<{ message: string }>)[0]?.message || 'Failed to update logo'
          : 'Failed to update organization logo';

      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const deleteLogo = async () => {
    if (!organization) {
      toast({
        title: 'Error',
        description: 'No organization selected',
        variant: 'destructive',
      });
      return;
    }

    setIsDeletingLogo(true);
    try {
      await organization.setLogo({ file: null });
      toast({
        title: 'Success',
        description: 'Organization logo removed',
      });
      router.refresh();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to remove organization logo',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsDeletingLogo(false);
    }
  };

  const deleteOrganization = async (orgId: string) => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/organizations/${orgId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete organization');
      }

      const otherOrg = userMemberships.data?.find(m => m.organization.id !== orgId);

      if (setActive) {
        if (otherOrg) {
          await setActive({ organization: otherOrg.organization.id });
        } else {
          await setActive({ organization: null });
        }
      }

      toast({
        title: 'Success',
        description: 'Organization deleted',
      });

      // Revalidate memberships to remove the deleted organization
      await userMemberships.revalidate?.();

      router.push('/projects');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete organization';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsDeleting(false);
    }
  };

  const leaveOrganization = async (orgId: string) => {
    if (!setActive) return;

    setIsLeaving(true);
    try {
      // Call API to actually remove the membership
      const response = await fetch(`/api/organizations/${orgId}/leave`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to leave organization');
      }

      // Switch to another organization
      const otherOrg = userMemberships.data?.find(m => m.organization.id !== orgId);

      if (otherOrg) {
        await setActive({ organization: otherOrg.organization.id });
      } else {
        await setActive({ organization: null });
      }

      toast({
        title: 'Success',
        description: 'Left organization',
      });

      // Revalidate memberships to remove the left organization
      await userMemberships.revalidate?.();

      router.push('/projects');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to leave organization';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsLeaving(false);
    }
  };

  const acceptInvitation = async (invitationId: string) => {
    setAcceptingInvitationId(invitationId);

    // Optimistically remove the invitation from the list immediately
    setInvitations(prev => prev.filter(inv => inv.id !== invitationId));

    try {
      const invitation = userInvitations?.data?.find(inv => inv.id === invitationId);
      if (!invitation) {
        throw new Error('Invitation not found');
      }

      // Accept the invitation
      await invitation.accept();

      // Switch to the newly joined organization
      if (setActive) {
        await setActive({ organization: invitation.publicOrganizationData.id });
      }

      toast({
        title: 'Success',
        description: `Joined ${invitation.publicOrganizationData.name}`,
      });

      // Revalidate memberships to show the newly joined organization
      await userMemberships.revalidate?.();
      await userInvitations.revalidate?.();
    } catch (error) {
      // Restore the invitation on error
      if (userInvitations?.data) {
        const invitation = userInvitations.data.find(inv => inv.id === invitationId);
        if (invitation) {
          const orgData = invitation.publicOrganizationData as {
            id: string;
            name: string;
            imageUrl: string;
            slug: string | null;
            publicMetadata?: { isPersonal?: boolean };
          };
          setInvitations(prev => [
            ...prev,
            {
              id: invitation.id,
              emailAddress: invitation.emailAddress,
              organizationId: orgData.id,
              organizationName: orgData.name,
              organizationImageUrl: orgData.imageUrl,
              organizationSlug: orgData.slug,
              organizationIsPersonal: orgData.publicMetadata?.isPersonal,
              role: invitation.role,
              createdAt: invitation.createdAt,
              status: invitation.status,
            },
          ]);
        }
      }

      toast({
        title: 'Error',
        description: 'Failed to accept invitation',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setAcceptingInvitationId(null);
    }
  };

  const inviteMember = async ({ email, organizationId }: InviteMemberParams) => {
    if (!email.trim()) {
      toast({
        title: 'Error',
        description: 'Email address is required',
        variant: 'destructive',
      });
      return;
    }

    setIsInvitingMember(true);
    try {
      const response = await fetch(`/api/organizations/${organizationId}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to invite member');
      }

      toast({
        title: 'Success',
        description: 'Invitation sent successfully',
      });

      // Revalidate to show new invitation
      await userInvitations.revalidate?.();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to invite member',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsInvitingMember(false);
    }
  };

  const removeMember = async ({ userId, organizationId }: RemoveMemberParams) => {
    if (!userId) {
      toast({
        title: 'Error',
        description: 'User ID is required',
        variant: 'destructive',
      });
      return;
    }

    setRemovingMemberId(userId);
    try {
      const response = await fetch(`/api/organizations/${organizationId}/members/${userId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to remove member');
      }

      toast({
        title: 'Success',
        description: 'Member removed from organization',
      });

      // Revalidate memberships
      await userMemberships.revalidate?.();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to remove member',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setRemovingMemberId(null);
    }
  };

  const revokeInvitation = async ({ invitationId, organizationId }: RevokeInvitationParams) => {
    setRevokingInvitationId(invitationId);
    try {
      const response = await fetch(
        `/api/organizations/${organizationId}/invitations/${invitationId}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to revoke invitation');
      }

      toast({
        title: 'Success',
        description: 'Invitation revoked',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to revoke invitation',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setRevokingInvitationId(null);
    }
  };

  const transferOwnership = async ({ newOwnerId, organizationId }: TransferOwnershipParams) => {
    if (!newOwnerId) {
      toast({
        title: 'Error',
        description: 'New owner ID is required',
        variant: 'destructive',
      });
      return;
    }

    setIsTransferringOwnership(true);
    try {
      const response = await fetch(`/api/organizations/${organizationId}/transfer-ownership`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newOwnerId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to transfer ownership');
      }

      toast({
        title: 'Success',
        description: 'Organization ownership transferred successfully',
      });

      // Revalidate memberships to reflect role changes
      await userMemberships.revalidate?.();

      // Refresh the page to update UI with new permissions
      router.refresh();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to transfer ownership',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsTransferringOwnership(false);
    }
  };

  return {
    createOrganization,
    isCreating,
    uploadLogo,
    isUploadingLogo,
    deleteLogo,
    isDeletingLogo,
    deleteOrganization,
    isDeleting,
    leaveOrganization,
    isLeaving,
    invitations,
    isLoadingInvitations: userInvitations?.isLoading ?? false,
    acceptInvitation,
    acceptingInvitationId,
    inviteMember,
    isInvitingMember,
    removeMember,
    removingMemberId,
    revokeInvitation,
    revokingInvitationId,
    transferOwnership,
    isTransferringOwnership,
    organization,
    membership,
  };
}
