'use client';

import { useUser } from '@clerk/nextjs';
import { Check } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

type FormState = {
  error?: string;
  success?: string;
} | null;

export default function NotificationsPage() {
  const { user, isLoaded } = useUser();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formState, setFormState] = useState<FormState>(null);

  // Notification settings state - only marketing emails
  const [marketingEmails, setMarketingEmails] = useState(false);
  const [dbUser, setDbUser] = useState<{ marketingEmails: boolean } | null>(null);

  // Load user's preferences from database
  useEffect(() => {
    if (isLoaded && user) {
      fetchUserPreferences();
    }
  }, [isLoaded, user]);

  const fetchUserPreferences = async () => {
    try {
      const response = await fetch('/api/user/profile');
      if (response.ok) {
        const userData = await response.json();
        setDbUser(userData);
        setMarketingEmails(userData.marketingEmails || false);
      }
    } catch (error) {
      console.error('Error fetching user preferences:', error);
    }
  };

  // Handle toggle change and automatically save
  const handleToggleChange = async (checked: boolean) => {
    if (!user) return;

    setMarketingEmails(checked);
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
        setFormState({ success: result.success });
        // Update local state
        setDbUser({ ...dbUser, marketingEmails: checked });

        // Hide success message after 3 seconds
        setTimeout(() => {
          setFormState(null);
        }, 3000);
      } else {
        setFormState({ error: result.error || 'Failed to update preferences' });
        // Revert the toggle if the API call failed
        setMarketingEmails(!checked);
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
      setFormState({ error: 'Failed to update preferences' });
      // Revert the toggle if the API call failed
      setMarketingEmails(!checked);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>Loading notification preferences...</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between space-x-2">
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-32" />
                  <div className="h-3 bg-gray-200 rounded animate-pulse w-64" />
                </div>
                <div className="h-6 w-11 bg-gray-200 rounded-full animate-pulse" />
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
              <div className="flex items-center justify-between space-x-2">
                <Label htmlFor="marketing-emails" className="flex flex-col space-y-1">
                  <span>Marketing Emails</span>
                  <span className="font-normal text-xs text-muted-foreground">
                    Receive emails about new features, tips, and product updates
                  </span>
                </Label>
                <Switch
                  id="marketing-emails"
                  checked={marketingEmails}
                  onCheckedChange={handleToggleChange}
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {formState?.error && (
              <div className="rounded-md bg-destructive/10 p-3">
                <div className="text-sm text-destructive">{formState.error}</div>
              </div>
            )}

            {formState?.success && (
              <div className="rounded-md bg-green-500/10 p-3 flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <div className="text-sm text-green-500">{formState.success}</div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
