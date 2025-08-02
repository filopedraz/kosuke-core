'use client';

import { useUser } from '@clerk/nextjs';
import { useQueryClient } from '@tanstack/react-query';
import { Check, Loader2, Upload } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';

import { useUserProfileImage } from '@/hooks/use-user-profile-image';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type FormState = {
  error?: string;
  success?: string;
} | null;

export default function SettingsPage() {
  const { user, isLoaded } = useUser();
  const { imageUrl: profileImageUrl } = useUserProfileImage();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formState, setFormState] = useState<FormState>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Show preview immediately
      const reader = new window.FileReader();
      reader.onload = e => {
        setPreviewImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      // Auto-submit the form when an image is selected
      setIsSubmitting(true);

      try {
        // Create a new FormData only for the image
        const formData = new FormData();
        formData.set('profileImage', file);

        // Call the API endpoint
        const response = await fetch('/api/user/profile-image', {
          method: 'PUT',
          body: formData,
        });

        const result = await response.json();

        if (response.ok) {
          setFormState({ success: result.success });
          // Invalidate the user profile query to refetch the updated image
          queryClient.invalidateQueries({ queryKey: ['user-profile'] });
          router.refresh();
        } else {
          setFormState({ error: result.error || 'Failed to update profile image' });
        }
      } catch (error) {
        console.error('Error updating profile image:', error);
        setFormState({ error: 'Failed to update profile image' });
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleClickUpload = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const formData = new FormData(e.currentTarget);

      // Call the API endpoint
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        setFormState({ success: result.success });
        // Invalidate the user profile query to refetch the updated data
        queryClient.invalidateQueries({ queryKey: ['user-profile'] });
        router.refresh();
      } else {
        setFormState({ error: result.error || 'Failed to update profile' });
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      setFormState({ error: 'Failed to update profile' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Use preview image if available, then database image, then fall back to Clerk image
  const avatarSrc = previewImage || profileImageUrl;

  if (!isLoaded) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>Loading account information...</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="h-16 w-16 rounded-full bg-gray-200 animate-pulse" />
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 bg-gray-200 rounded animate-pulse" />
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
          <CardTitle>Account</CardTitle>
          <CardDescription>Update your account information and profile settings.</CardDescription>
        </CardHeader>
        <CardContent>
          <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
            <div className="flex flex-col space-y-4">
              <div className="flex items-center space-x-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={avatarSrc} alt={user?.fullName || 'User'} />
                  <AvatarFallback className="text-lg bg-primary text-primary-foreground">
                    {user?.fullName?.charAt(0)?.toUpperCase() ||
                      user?.primaryEmailAddress?.emailAddress?.charAt(0)?.toUpperCase() ||
                      'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col space-y-1">
                  <h3 className="text-sm font-medium">Profile Picture</h3>
                  <p className="text-xs text-muted-foreground">
                    Your profile picture will be shown across the platform.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2 flex items-center"
                    onClick={handleClickUpload}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload
                      </>
                    )}
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    id="profileImage"
                    name="profileImage"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageChange}
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={user?.fullName || ''}
                  placeholder="Your name"
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue={user?.primaryEmailAddress?.emailAddress || ''}
                  placeholder="your.email@example.com"
                  required
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

            <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
