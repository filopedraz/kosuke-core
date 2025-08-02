'use client';

import { useUser } from '@clerk/nextjs';
import { Check, Loader2, Upload } from 'lucide-react';
import { useRef, useState } from 'react';

import { useUserProfileImage } from '@/hooks/use-user-profile-image';
import { useUpdateProfile, useUpdateProfileImage } from '@/hooks/use-user-profile';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function SettingsPage() {
  const { user, isLoaded } = useUser();
  const { imageUrl: profileImageUrl } = useUserProfileImage();

  // Form state
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Mutations
  const updateProfileMutation = useUpdateProfile();
  const updateProfileImageMutation = useUpdateProfileImage();

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Show preview immediately
      const reader = new window.FileReader();
      reader.onload = e => {
        setPreviewImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      // Auto-submit the image
      updateProfileImageMutation.mutate(file);
    }
  };

  const handleClickUpload = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    updateProfileMutation.mutate(formData);
  };

  if (!isLoaded) {
    return (
      <div className="max-w-2xl">
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-semibold">Profile Settings</h1>
            <p className="text-muted-foreground">
              Manage your account settings and set email preferences.
            </p>
          </div>
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-2xl">
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-semibold">Profile Settings</h1>
            <p className="text-muted-foreground">
              Manage your account settings and set email preferences.
            </p>
          </div>
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">Unable to load user information.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Profile Settings</h1>
          <p className="text-muted-foreground">
            Manage your account settings and set email preferences.
          </p>
        </div>

        {/* Success/Error Messages */}
        {updateProfileMutation.isSuccess && (
          <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-md flex items-center gap-2">
            <Check className="h-4 w-4" />
            Profile updated successfully!
          </div>
        )}

        {updateProfileMutation.isError && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-md">
            {updateProfileMutation.error instanceof Error
              ? updateProfileMutation.error.message
              : 'Failed to update profile'}
          </div>
        )}

        {updateProfileImageMutation.isSuccess && (
          <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-md flex items-center gap-2">
            <Check className="h-4 w-4" />
            Profile image updated successfully!
          </div>
        )}

        {updateProfileImageMutation.isError && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-md">
            {updateProfileImageMutation.error instanceof Error
              ? updateProfileImageMutation.error.message
              : 'Failed to update profile image'}
          </div>
        )}

        <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Update your personal details and profile picture.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Profile Picture Section */}
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage
                    src={previewImage || profileImageUrl || user.imageUrl}
                    alt={user.firstName || 'Profile picture'}
                  />
                  <AvatarFallback className="text-lg">
                    {user.firstName?.[0]?.toUpperCase() ||
                      user.emailAddresses[0]?.emailAddress[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleClickUpload}
                    disabled={updateProfileImageMutation.isPending}
                    className="relative"
                  >
                    {updateProfileImageMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Change Picture
                      </>
                    )}
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    JPG, PNG or GIF. Max size 5MB.
                  </p>
                </div>
              </div>

              {/* Name and Email Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    name="firstName"
                    defaultValue={user.firstName || ''}
                    placeholder="Enter your first name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    name="lastName"
                    defaultValue={user.lastName || ''}
                    placeholder="Enter your last name"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue={user.emailAddresses[0]?.emailAddress || ''}
                  placeholder="Enter your email address"
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={updateProfileMutation.isPending}
              className="min-w-[120px]"
            >
              {updateProfileMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
