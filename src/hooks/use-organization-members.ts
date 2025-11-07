import type { OrganizationMembership } from '@/lib/db/schema';
import { useQuery } from '@tanstack/react-query';

export function useOrganizationMembers(orgId: string) {
  return useQuery<OrganizationMembership[]>({
    queryKey: ['organization-members', orgId],
    queryFn: async () => {
      const response = await fetch(`/api/organizations/${orgId}/members`);
      if (!response.ok) throw new Error('Failed to fetch members');
      const data = await response.json();
      return data.data;
    },
    enabled: !!orgId,
  });
}
