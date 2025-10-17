'use client';

import { useClerk } from '@clerk/nextjs';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type FormState = {
  error?: string;
  success?: string;
} | null;

export default function SecurityPage() {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteFormState, setDeleteFormState] = useState<FormState>(null);
  const router = useRouter();
  const { signOut } = useClerk();

  const handleAccountDelete = async () => {
    setIsDeleting(true);

    try {
      const response = await fetch('/api/user/delete-account', {
        method: 'DELETE',
      });

      const result = await response.json();

      if (response.ok) {
        // Account deleted successfully - sign out and redirect
        await signOut();
        router.push('/');
      } else {
        setDeleteFormState({ error: result.error || 'Failed to delete account' });
      }
    } catch (error) {
      console.error('Error deleting account:', error);
      setDeleteFormState({ error: 'Failed to delete account' });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-destructive/20">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>
            Permanently delete your account and all associated data.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!showDeleteConfirm ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Once you delete your account, there is no going back. This action cannot be undone.
              </p>
              <Button variant="destructive" onClick={() => setShowDeleteConfirm(true)}>
                Delete Account
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="rounded-md bg-destructive/10 p-4 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-destructive">
                    Warning: This action is irreversible
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    All your data, including projects, settings, and history will be permanently
                    deleted.
                  </p>
                </div>
              </div>

              {deleteFormState?.error && (
                <div className="rounded-md bg-destructive/10 p-3">
                  <div className="text-sm text-destructive">{deleteFormState.error}</div>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeleteFormState(null);
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleAccountDelete} variant="destructive" disabled={isDeleting}>
                  {isDeleting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    'Confirm Delete'
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
