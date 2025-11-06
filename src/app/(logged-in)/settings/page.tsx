'use client';

import { CheckCircle, Github, Loader2, Upload } from 'lucide-react';
import { useRef, useState } from 'react';

import { useUser } from '@/hooks/use-user';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useUser as useClerkUser } from '@clerk/nextjs';

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

  const clerk = (clerkUser || null) as {
    firstName?: string;
    lastName?: string;
    imageUrl?: string;
    emailAddresses?: Array<{ emailAddress: string }>;
  } | null;

  // Form state
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isImageUploading, setIsImageUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [isConnectingGithub, setIsConnectingGithub] = useState(false);
  const [isConnectingGoogle, setIsConnectingGoogle] = useState(false);

  // Track name changes
  const [hasNameChanged, setHasNameChanged] = useState(false);
  const initialFirstName = clerk?.firstName || '';
  const initialLastName = clerk?.lastName || '';

  // Get Clerk user for external accounts
  const { user: clerkUserFull } = useClerkUser();

  // Get connected accounts
  const githubAccount = clerkUserFull?.externalAccounts?.find(
    account => account.verification?.strategy === 'oauth_github'
  );
  const googleAccount = clerkUserFull?.externalAccounts?.find(
    account => account.verification?.strategy === 'oauth_google'
  );

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

      try {
        await updateProfileImage(file);
      } catch (error) {
        console.error('Failed to update profile image:', error);
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

    try {
      const formData = new FormData(e.currentTarget);
      await updateProfile(formData);
      setHasNameChanged(false); // Reset change tracking after successful save
    } catch (error) {
      console.error('Failed to update profile:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const currentFirstName = name === 'firstName' ? value : formRef.current?.firstName?.value || '';
    const currentLastName = name === 'lastName' ? value : formRef.current?.lastName?.value || '';

    const hasChanged = currentFirstName !== initialFirstName || currentLastName !== initialLastName;

    setHasNameChanged(hasChanged);
  };

  const handleConnectOAuth = async (
    strategy: 'oauth_github' | 'oauth_google',
    provider: string
  ) => {
    if (!clerkUserFull) return;

    const isGithub = strategy === 'oauth_github';
    const setConnecting = isGithub ? setIsConnectingGithub : setIsConnectingGoogle;

    setConnecting(true);
    try {
      const externalAccount = await clerkUserFull.createExternalAccount({
        strategy,
        redirectUrl: `${window.location.origin}/settings`,
      });

      const verification = externalAccount.verification;
      if (verification?.externalVerificationRedirectURL) {
        window.location.href = verification.externalVerificationRedirectURL.toString();
      } else {
        window.location.reload();
      }
    } catch (error) {
      console.error(`Failed to connect ${provider}:`, error);
      setConnecting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl">
        <div className="space-y-6">
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>

          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-80" />
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Profile Picture Section */}
              <div className="flex items-center gap-4">
                <Skeleton className="h-20 w-20 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-10 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>

              {/* Name Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </div>

              {/* Email Field */}
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
      </div>
    );
  }

  if (!clerkUser) {
    return (
      <div className="max-w-3xl">
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
    <div className="max-w-3xl">
      <div className="space-y-6">
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
                    src={previewImage || imageUrl || clerk?.imageUrl || undefined}
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
                    defaultValue={clerk?.firstName || ''}
                    placeholder="Enter your first name"
                    onChange={handleNameChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    name="lastName"
                    defaultValue={clerk?.lastName || ''}
                    placeholder="Enter your last name"
                    onChange={handleNameChange}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue={
                    clerkUserFull?.primaryEmailAddress?.emailAddress ||
                    clerk?.emailAddresses?.[0]?.emailAddress ||
                    ''
                  }
                  placeholder="Enter your email address"
                  readOnly
                />
              </div>

              {/* GitHub Account */}
              <div className="space-y-2">
                <Label>GitHub</Label>
                <div className="flex items-center justify-between px-3 py-2 rounded-md border border-input bg-transparent dark:bg-input/30 shadow-xs transition-colors hover:bg-accent/50">
                  <div className="flex items-center gap-3">
                    <Github
                      className={`h-4 w-4 ${githubAccount ? 'text-foreground' : 'text-muted-foreground'}`}
                    />
                    <div>
                      {githubAccount ? (
                        <span className="text-sm font-medium text-foreground">
                          @{githubAccount.username || 'Connected'}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          Connect your GitHub account
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {githubAccount ? (
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <CheckCircle className="h-4 w-4" />
                        <span>Connected</span>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleConnectOAuth('oauth_github', 'GitHub')}
                        disabled={isConnectingGithub}
                      >
                        {isConnectingGithub ? 'Connecting...' : 'Connect'}
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Google Account */}
              <div className="space-y-2">
                <Label>Google</Label>
                <div className="flex items-center justify-between px-3 py-2 rounded-md border border-input bg-transparent dark:bg-input/30 shadow-xs transition-colors hover:bg-accent/50">
                  <div className="flex items-center gap-3">
                    <svg
                      className={`h-4 w-4 ${googleAccount ? 'text-foreground' : 'text-muted-foreground'}`}
                      viewBox="0 0 24 24"
                    >
                      <path
                        fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="currentColor"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    <div>
                      {googleAccount ? (
                        <span className="text-sm font-medium text-foreground">
                          {googleAccount.emailAddress || 'Connected'}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          Connect your Google account
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {googleAccount ? (
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <CheckCircle className="h-4 w-4" />
                        <span>Connected</span>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleConnectOAuth('oauth_google', 'Google')}
                        disabled={isConnectingGoogle}
                      >
                        {isConnectingGoogle ? 'Connecting...' : 'Connect'}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={isSubmitting || !hasNameChanged}
              className="min-w-[120px]"
            >
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
