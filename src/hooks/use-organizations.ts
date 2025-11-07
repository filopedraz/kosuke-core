import type { Organization, OrganizationMembership } from '@/lib/db/schema';
import { useUser } from '@clerk/nextjs';
import { useQuery } from '@tanstack/react-query';

interface OrganizationWithMembership {
  organization: Organization;
  membership: OrganizationMembership;
}

export function useOrganizations() {
  const { user } = useUser();

  return useQuery<OrganizationWithMembership[]>({
    queryKey: ['organizations', user?.id],
    queryFn: async () => {
      const response = await fetch('/api/organizations');
      if (!response.ok) throw new Error('Failed to fetch organizations');
      const data = await response.json();
      return data.data;
    },
    enabled: !!user,
  });
}
