'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useOrganizationList } from '@clerk/nextjs';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface OnboardingFormProps {
  defaultWorkspaceName: string;
}

export default function OnboardingForm({ defaultWorkspaceName }: OnboardingFormProps) {
  const router = useRouter();
  const { setActive } = useOrganizationList();
  const [workspaceName, setWorkspaceName] = useState(defaultWorkspaceName);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    setError(null);

    try {
      const response = await fetch('/api/organizations/create-personal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: workspaceName.trim() }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create workspace');
      }

      const result = await response.json();
      const createdOrgId = result.data?.orgId;

      if (!createdOrgId) {
        throw new Error('Organization ID not returned from API');
      }

      // Set the newly created org as active - this updates Clerk's session
      // and waits for the update to complete (no timeout needed)
      if (!setActive) {
        throw new Error('Organization activation not available');
      }

      await setActive({ organization: createdOrgId });

      // Session is now updated, navigate to projects
      router.push('/projects');
    } catch (err) {
      console.error('Error creating workspace:', err);
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setIsCreating(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="rounded-xl border bg-card p-8 shadow-lg">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">Welcome to Kosuke!</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Let&apos;s set up your personal workspace
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="workspace-name" className="text-sm font-medium">
                Workspace Name
              </Label>
              <Input
                id="workspace-name"
                type="text"
                value={workspaceName}
                onChange={e => setWorkspaceName(e.target.value)}
                placeholder="My Workspace"
                required
                disabled={isCreating}
                className="h-10"
              />
            </div>

            {error && (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="h-10 w-full"
              disabled={isCreating || !workspaceName.trim()}
            >
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating workspace...
                </>
              ) : (
                'Create Workspace'
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
