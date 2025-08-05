'use client';

import { GitBranch, RefreshCw, Save } from 'lucide-react';
import { useEffect, useState } from 'react';

import { useDefaultBranchSettings, useUpdateDefaultBranch } from '@/hooks/use-project-settings';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

interface DefaultBranchSettingsProps {
  projectId: number;
}

export default function DefaultBranchSettings({ projectId }: DefaultBranchSettingsProps) {
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [hasChanges, setHasChanges] = useState(false);

  // Hooks
  const { data: settings, isLoading, error, refetch } = useDefaultBranchSettings(projectId);
  const updateDefaultBranch = useUpdateDefaultBranch(projectId);

  // Update local state when settings load
  useEffect(() => {
    if (settings?.default_branch) {
      setSelectedBranch(settings.default_branch);
      setHasChanges(false);
    }
  }, [settings]);

  // Handle branch selection
  const handleBranchChange = (value: string) => {
    setSelectedBranch(value);
    setHasChanges(value !== settings?.default_branch);
  };

  // Handle save
  const handleSave = async () => {
    if (!selectedBranch || !hasChanges) return;

    await updateDefaultBranch.mutateAsync({
      default_branch: selectedBranch,
    });

    setHasChanges(false);
  };

  // Handle refresh
  const handleRefresh = () => {
    refetch();
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-semibold">Default Branch</h1>
          </div>
        </div>

        <div className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-10 w-full" />
            </div>
            <Skeleton className="h-10 w-20" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col h-full p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-semibold">Default Branch</h1>
          </div>
        </div>

        <div className="space-y-6">
          <p className="text-muted-foreground">
            Set the default branch for new chat sessions. New conversations will branch from this base.
          </p>

          <Alert variant="destructive">
            <AlertDescription>
              Failed to load branch settings. This might be because the project is not connected to a GitHub repository.
            </AlertDescription>
          </Alert>

          <Button
            variant="outline"
            onClick={handleRefresh}
            size="sm"
            className="w-fit"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <GitBranch className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-semibold">Default Branch</h1>
        </div>

        <Button
          variant="outline"
          size="icon"
          onClick={handleRefresh}
          disabled={isLoading}
          className="h-9 w-9"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <p className="text-muted-foreground">
        Set the default branch for new chat sessions. New conversations will branch from this base.
      </p>

      <div className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="default-branch" className="text-sm font-medium">Default Branch</Label>
            <Select
              value={selectedBranch}
              onValueChange={handleBranchChange}
            >
              <SelectTrigger id="default-branch" className="w-full">
                <SelectValue placeholder="Select a branch" />
              </SelectTrigger>
              <SelectContent>
                {settings?.available_branches.map((branch) => (
                  <SelectItem key={branch} value={branch}>
                    <div className="flex items-center gap-2">
                      <GitBranch className="h-4 w-4" />
                      {branch}
                      {branch === settings.default_branch && (
                        <span className="text-xs text-muted-foreground">(current)</span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {settings?.available_branches.length === 0 && (
            <Alert>
              <AlertDescription>
                No branches found. Make sure your project is connected to a GitHub repository with at least one branch.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex items-center gap-2">
            <Button
              onClick={handleSave}
              disabled={!hasChanges || updateDefaultBranch.isPending}
              size="sm"
            >
              {updateDefaultBranch.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>

            {hasChanges && (
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedBranch(settings?.default_branch || '');
                  setHasChanges(false);
                }}
                size="sm"
              >
                Cancel
              </Button>
            )}
          </div>

          {settings?.default_branch && (
            <div className="text-sm text-muted-foreground">
              <strong>Current default:</strong> {settings.default_branch}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
