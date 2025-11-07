'use client';

import { OrganizationSwitcher } from '@clerk/nextjs';
import { dark } from '@clerk/themes';
import { useTheme } from 'next-themes';

export function OrganizationSwitcherComponent() {
  const { theme } = useTheme();

  return (
    <OrganizationSwitcher
      appearance={{
        baseTheme: theme === 'dark' ? dark : undefined,
        elements: {
          rootBox: 'flex items-center',
          organizationSwitcherTrigger: 'border border-border rounded-md px-3 py-2',
        },
      }}
      afterSelectOrganizationUrl="/projects"
      afterCreateOrganizationUrl="/projects"
      createOrganizationMode="modal"
      organizationProfileMode="modal"
    />
  );
}
