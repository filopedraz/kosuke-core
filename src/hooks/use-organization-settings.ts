import { useOrganization, useOrganizationList } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { useToast } from '@/hooks/use-toast';

interface CreateOrganizationParams {
  name: string;
  logo?: File;
}

interface UpdateOrganizationLogoParams {
  file: File;
}

interface UseOrganizationSettingsReturn {
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
}

/**
 * Organization settings management
 * Handles creation, logo, deletion, and leaving organizations
 */
export function useOrganizationSettings(): UseOrganizationSettingsReturn {
  const router = useRouter();
  const { toast } = useToast();
  const { organization } = useOrganization();
  const { userMemberships, setActive } = useOrganizationList({
    userMemberships: { infinite: true, keepPreviousData: true },
  });

  const [isCreating, setIsCreating] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isDeletingLogo, setIsDeletingLogo] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

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
  };
}
