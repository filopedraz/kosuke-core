'use client';

import { User, Bell, Shield, Palette } from 'lucide-react';
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
          <TabsList className="grid grid-cols-4 w-full max-w-lg">
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
            <TabsTrigger value="appearance" className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              <span>Appearance</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <Suspense
          fallback={
            <div className="h-[400px] w-full flex items-center justify-center">Loading...</div>
          }
        >
          <div className="max-w-2xl">{children}</div>
        </Suspense>
      </div>
    </div>
  );
}
