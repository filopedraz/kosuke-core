'use client';

import { Bell, Bot, Building2, Palette, Shield, User } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { Suspense } from 'react';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const currentTab = pathname === '/settings' ? 'account' : pathname.split('/').pop() || 'account';

  const handleTabChange = (value: string) => {
    router.push(`/settings/${value === 'account' ? '' : value}`);
  };

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="flex flex-col space-y-6">
        <div className="flex flex-col space-y-2">
          <h1 className="text-2xl tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground">
            Manage your account settings and preferences.
          </p>
        </div>

        <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="w-full max-w-3xl">
            <TabsTrigger value="account" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span>Account</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <span>Notifications</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span>Security</span>
            </TabsTrigger>
            <TabsTrigger value="pipeline" className="flex items-center gap-2">
              <Bot className="h-4 w-4" />
              <span>Pipeline</span>
            </TabsTrigger>
            <TabsTrigger value="appearance" className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              <span>Appearance</span>
            </TabsTrigger>
            <TabsTrigger value="organizations" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              <span>Organizations</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <Suspense fallback={<SettingsLayoutSkeleton />}>
          <div className="max-w-3xl">{children}</div>
        </Suspense>
      </div>
    </div>
  );
}

function SettingsLayoutSkeleton() {
  return (
    <div className="max-w-3xl">
      <div className="h-[400px] w-full space-y-6">
        <div className="rounded-lg border p-6 space-y-4">
          <div className="space-y-2">
            <div className="h-6 bg-muted rounded w-48 animate-pulse" />
            <div className="h-4 bg-muted rounded w-80 animate-pulse" />
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="h-4 bg-muted rounded w-24 animate-pulse" />
              <div className="h-10 bg-muted rounded w-full animate-pulse" />
            </div>
            <div className="space-y-2">
              <div className="h-4 bg-muted rounded w-32 animate-pulse" />
              <div className="h-10 bg-muted rounded w-full animate-pulse" />
            </div>
            <div className="flex justify-end">
              <div className="h-10 bg-muted rounded w-24 animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
