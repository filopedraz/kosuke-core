'use client';

import { Check } from 'lucide-react';
import { useState, use, useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { updateNotificationPreferences } from '@/app/(logged-out)/actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

type FormState = {
  error?: string;
  success?: string;
} | null;

export default function NotificationsPage() {
  const { userPromise } = useUser();
  const user = use(userPromise);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formState, setFormState] = useState<FormState>(null);
  const router = useRouter();

  // Notification settings state - only marketing emails
  const [marketingEmails, setMarketingEmails] = useState(false);

  // Load user's preferences
  useEffect(() => {
    if (user?.id) {
      // Set initial state based on user data
      setMarketingEmails(user.marketingEmails || false);
    }
  }, [user]);

  // Handle toggle change and automatically save
  const handleToggleChange = async (checked: boolean) => {
    if (!user?.id) return;

    setMarketingEmails(checked);
    setIsSubmitting(true);

    try {
      // Use the server action to update preferences
      const result = await updateNotificationPreferences(user.id, checked);
      setFormState(result as FormState);

      if ((result as FormState)?.success) {
        // Refresh the router to update user data
        router.refresh();

        // Hide success message after 3 seconds
        setTimeout(() => {
          setFormState(null);
        }, 3000);
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
      setFormState({ error: 'Failed to update preferences' });
    } finally {
      setIsSubmitting(false);
    }
  };

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
