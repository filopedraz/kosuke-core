'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useDeleteEnvironmentVariable } from '@/hooks/use-environment-mutations';
import { useEnvironmentVariables } from '@/hooks/use-environment-variables';
import type { EnvironmentVariable } from '@/lib/types/environment';
import { Edit, Eye, EyeOff, InfoIcon, Plus, Shield, Trash2 } from 'lucide-react';
import { useCallback, useState } from 'react';
import { VariableForm } from './variable-form';

interface EnvironmentVariablesProps {
  projectId: number;
}

export function EnvironmentVariables({ projectId }: EnvironmentVariablesProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingVariable, setEditingVariable] = useState<EnvironmentVariable | null>(null);
  const [visibleSecrets, setVisibleSecrets] = useState<Set<number>>(new Set());

  const { data: variables = [], isLoading, error } = useEnvironmentVariables(projectId);
  const deleteVariableMutation = useDeleteEnvironmentVariable(projectId);

  const handleDeleteVariable = useCallback(
    (id: number) => {
      deleteVariableMutation.mutate(id);
    },
    [deleteVariableMutation]
  );

  const toggleSecretVisibility = useCallback((id: number) => {
    setVisibleSecrets(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const formatValue = useCallback(
    (variable: EnvironmentVariable) => {
      if (!variable.isSecret) {
        return variable.value;
      }

      if (visibleSecrets.has(variable.id)) {
        return variable.value;
      }

      return '•'.repeat(Math.min(variable.value.length, 20));
    },
    [visibleSecrets]
  );

  const handleFormClose = useCallback(() => {
    setShowAddForm(false);
    setEditingVariable(null);
  }, []);

  if (isLoading) {
    return <EnvironmentVariablesSkeleton />;
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            Failed to load environment variables. Please try again.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {/* Warning Banners */}
      <div className="space-y-3 mb-6">
        <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800">
          <InfoIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <AlertDescription className="text-blue-700 dark:text-blue-300">
            Environment variables apply to all chat sessions and preview containers in this project.
            They are not session-specific.
          </AlertDescription>
        </Alert>
      </div>

      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-medium">Environment Variables</h3>
          <p className="text-muted-foreground mt-2">
            Configure variables that will be available in your project preview
          </p>
        </div>
        <Button onClick={() => setShowAddForm(true)} className="gap-1.5 h-9">
          <Plus className="w-4 h-4" />
          Add Variable
        </Button>
      </div>

      {variables.length === 0 ? (
        <Card className="py-0">
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              No environment variables configured. Add your first variable to get started.
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {variables.map(variable => (
            <Card key={variable.id} className="py-0">
              <CardContent className="py-3 px-4">
                <div className="flex items-center justify-between">
                  {/* Left side - Key */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <code className="font-mono text-sm font-medium">
                        {variable.key}
                      </code>
                      {variable.isSecret && (
                        <Badge variant="secondary" className="text-xs h-5">
                          <Shield className="w-3 h-3 mr-1" />
                          Secret
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Right side - Value and Actions */}
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <code className="font-mono text-sm text-muted-foreground bg-muted/50 px-2 py-1 rounded">
                        {formatValue(variable)}
                      </code>
                      {variable.isSecret && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => toggleSecretVisibility(variable.id)}
                        >
                          {visibleSecrets.has(variable.id) ? (
                            <EyeOff className="w-3 h-3" />
                          ) : (
                            <Eye className="w-3 h-3" />
                          )}
                        </Button>
                      )}
                    </div>

                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => setEditingVariable(variable)}
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:bg-destructive/10 hover:text-destructive">
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Environment Variable</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete the environment variable &quot;{variable.key}&quot;?
                              This action cannot be undone and may affect your project&apos;s functionality.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteVariable(variable.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <VariableForm
        projectId={projectId}
        isOpen={showAddForm || !!editingVariable}
        onClose={handleFormClose}
        editingVariable={editingVariable}
      />
    </>
  );
}

export function EnvironmentVariablesSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-5 w-16" />
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-8 w-8" />
                  <Skeleton className="h-8 w-8" />
                  <Skeleton className="h-8 w-8" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
