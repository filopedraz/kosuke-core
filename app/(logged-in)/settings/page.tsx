'use client';

import { Check, Loader2, Upload } from 'lucide-react';
import { useState, use, useRef } from 'react';
import { useRouter } from 'next/navigation';

import { updateAccount, updateProfileImage } from '@/app/(logged-out)/actions';
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
  const { userPromise } = useUser();
  const user = use(userPromise);
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
      if (formRef.current) {
        setIsSubmitting(true);

        // Create a new FormData only for the image
        const formData = new FormData();
        formData.set('profileImage', file);

        // Use the dedicated image update action
        const result = await updateProfileImage(formData, formData);

        setFormState(result as FormState);
        setIsSubmitting(false);

        if ((result as FormState)?.success) {
          router.refresh();
        }
      }
    }
  };

  const handleClickUpload = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const result = await updateAccount(formData, formData);

    setFormState(result as FormState);
    setIsSubmitting(false);

    if ((result as FormState)?.success) {
      router.refresh();
    }
  };

  // Use the user's actual image URL if available
  const avatarSrc = previewImage || user?.imageUrl || '';

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
                  <AvatarImage src={avatarSrc} alt={user?.name || 'User'} />
                  <AvatarFallback className="text-lg bg-primary text-primary-foreground">
                    {user?.name?.charAt(0)?.toUpperCase() ||
                      user?.email?.charAt(0)?.toUpperCase() ||
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
                  defaultValue={user?.name || ''}
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
                  defaultValue={user?.email || ''}
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
