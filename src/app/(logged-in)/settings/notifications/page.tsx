'use client';

import { useState } from 'react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/hooks/use-user';

export default function NotificationsPage() {
  const { user, isLoading, refresh } = useUser();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle toggle change and automatically save
  const handleToggleChange = async (checked: boolean) => {
    if (!user) return;

    setIsSubmitting(true);

    try {
      // Call the API endpoint to update preferences
      const response = await fetch('/api/user/notifications', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ marketingEmails: checked }),
      });

      const result = await response.json();

      if (response.ok) {
        // Refresh user data to update the UI immediately
        await refresh();
        toast({
          title: 'Success',
          description: result.success || 'Notification preferences updated',
        });
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to update preferences',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast({
        title: 'Error',
        description: 'Failed to update preferences',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>Loading notification preferences...</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start justify-between space-x-3">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-64" />
                </div>
                <Skeleton className="h-6 w-11 rounded-full mt-0.5 shrink-0" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>Manage how you receive notifications and updates.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-start justify-between space-x-3">
                <div className="space-y-1">
                  <Label htmlFor="marketing-emails" className="text-sm font-medium cursor-pointer">
                    Marketing Emails
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Receive emails about new features, tips, and product updates
                  </p>
                </div>
                <Switch
                  id="marketing-emails"
                  checked={user?.marketingEmails || false}
                  onCheckedChange={handleToggleChange}
                  disabled={isSubmitting}
                  className="mt-0.5 shrink-0"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
