import type { Organization } from '@/lib/db/schema';
import { useOrganization } from '@clerk/nextjs';
import { useQuery } from '@tanstack/react-query';

export function useActiveOrganization() {
  const { organization } = useOrganization();

  return useQuery<Organization>({
    queryKey: ['organization', organization?.id],
    queryFn: async () => {
      const response = await fetch(`/api/organizations/${organization?.id}`);
      if (!response.ok) throw new Error('Failed to fetch organization');
      const data = await response.json();
      return data.data;
    },
    enabled: !!organization?.id,
  });
}
