import { useOrganizationList } from '@clerk/nextjs';
import { useEffect, useState } from 'react';

import { useToast } from '@/hooks/use-toast';

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

interface UseOrganizationInvitationsReturn {
  invitations: UserInvitation[];
  isLoadingInvitations: boolean;
  acceptInvitation: (invitationId: string) => Promise<void>;
  acceptingInvitationId: string | null;
}

/**
 * User-side invitation management
 * Handles viewing and accepting organization invitations
 */
export function useOrganizationInvitations(): UseOrganizationInvitationsReturn {
  const { toast } = useToast();
  const { userMemberships, setActive, userInvitations } = useOrganizationList({
    userMemberships: { infinite: true, keepPreviousData: true },
    userInvitations: { infinite: true, status: 'pending', keepPreviousData: true },
  });

  const [acceptingInvitationId, setAcceptingInvitationId] = useState<string | null>(null);
  const [invitations, setInvitations] = useState<UserInvitation[]>([]);

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

  return {
    invitations,
    isLoadingInvitations: userInvitations?.isLoading ?? false,
    acceptInvitation,
    acceptingInvitationId,
  };
}
