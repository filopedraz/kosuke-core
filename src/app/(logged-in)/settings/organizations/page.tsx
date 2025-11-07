'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { OrganizationProfile, useOrganization } from '@clerk/nextjs';
import { dark } from '@clerk/themes';
import { useTheme } from 'next-themes';

export default function OrganizationsSettingsPage() {
  const { isLoaded, organization } = useOrganization();
  const { theme } = useTheme();

  if (!isLoaded) {
    return <OrganizationSettingsSkeleton />;
  }

  if (!organization) {
    return (
      <div className="container py-8">
        <h1 className="text-2xl font-bold mb-4">Organization Settings</h1>
        <p className="text-muted-foreground">
          No organization selected. Please select an organization from the switcher above.
        </p>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <h1 className="text-2xl font-bold mb-6">Organization Settings</h1>
      <OrganizationProfile
        appearance={{
          baseTheme: theme === 'dark' ? dark : undefined,
          elements: {
            rootBox: 'w-full',
            card: 'border border-border shadow-none',
          },
        }}
      />
    </div>
  );
}

function OrganizationSettingsSkeleton() {
  return (
    <div className="container py-8 space-y-6">
      <Skeleton className="h-8 w-64" />
      <div className="space-y-4">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    </div>
  );
}
