'use client';

import { Check, Loader2, Upload } from 'lucide-react';
import { useRef, useState } from 'react';

import { useUser } from '@/hooks/use-user';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function SettingsPage() {
  const {
    clerkUser,
    isLoading,
    imageUrl,
    displayName,
    initials,
    updateProfile,
    updateProfileImage,
  } = useUser();

  // Form state
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isImageUploading, setIsImageUploading] = useState(false);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

      // Auto-submit the image
      setIsImageUploading(true);
      setFormError(null);
      setFormSuccess(null);

      try {
        await updateProfileImage(file);
        setFormSuccess('Profile image updated successfully!');
      } catch (error) {
        setFormError(error instanceof Error ? error.message : 'Failed to update profile image');
      } finally {
        setIsImageUploading(false);
      }
    }
  };

  const handleClickUpload = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);
    setFormSuccess(null);

    try {
      const formData = new FormData(e.currentTarget);
      await updateProfile(formData);
      setFormSuccess('Profile updated successfully!');
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Failed to update profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl">
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-semibold">Profile Settings</h1>
            <p className="text-muted-foreground">
              Manage your account settings and set email preferences.
            </p>
          </div>

          <Card>
            <CardHeader>
              <div className="h-6 bg-muted rounded w-48 animate-pulse" />
              <div className="h-4 bg-muted rounded w-80 animate-pulse" />
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Profile Picture Section */}
              <div className="flex items-center gap-4">
                <div className="h-20 w-20 bg-muted rounded-full animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-10 bg-muted rounded w-32 animate-pulse" />
                  <div className="h-3 bg-muted rounded w-48 animate-pulse" />
                </div>
              </div>

              {/* Name Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded w-20 animate-pulse" />
                  <div className="h-10 bg-muted rounded w-full animate-pulse" />
                </div>
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded w-20 animate-pulse" />
                  <div className="h-10 bg-muted rounded w-full animate-pulse" />
                </div>
              </div>

              {/* Email Field */}
              <div className="space-y-2">
                <div className="h-4 bg-muted rounded w-24 animate-pulse" />
                <div className="h-10 bg-muted rounded w-full animate-pulse" />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <div className="h-10 bg-muted rounded w-32 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!clerkUser) {
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
        {/* Success/Error Messages */}
        {formSuccess && (
          <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-md flex items-center gap-2">
            <Check className="h-4 w-4" />
            {formSuccess}
          </div>
        )}

        {formError && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-md">
            {formError}
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
                    src={previewImage || imageUrl || clerkUser.imageUrl}
                    alt={displayName || 'Profile picture'}
                  />
                  <AvatarFallback className="text-lg">{initials}</AvatarFallback>
                </Avatar>

                <div className="flex-1">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleClickUpload}
                    disabled={isImageUploading}
                    className="relative"
                  >
                    {isImageUploading ? (
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
                    defaultValue={clerkUser.firstName || ''}
                    placeholder="Enter your first name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    name="lastName"
                    defaultValue={clerkUser.lastName || ''}
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
                  defaultValue={clerkUser.emailAddresses[0]?.emailAddress || ''}
                  placeholder="Enter your email address"
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting} className="min-w-[120px]">
              {isSubmitting ? (
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
