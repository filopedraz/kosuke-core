'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { Plus, Eye, EyeOff, Edit, Trash2, Shield, InfoIcon } from 'lucide-react';
import { VariableForm } from './variable-form';
import { EnvironmentVariablesSkeleton } from './skeletons/environment-variables-skeleton';
import { useEnvironmentVariables } from '@/hooks/use-environment-variables';
import { useDeleteEnvironmentVariable } from '@/hooks/use-environment-mutations';
import type { EnvironmentVariable } from '@/lib/types/environment';

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
            <strong>Project-wide variables:</strong> Environment variables apply to all chat sessions and preview containers in this project. 
            They are not session-specific.
          </AlertDescription>
        </Alert>
        
        <Alert className="bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800">
          <Shield className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <AlertDescription className="text-amber-700 dark:text-amber-300">
            Secret variables are encrypted and will only be visible in preview containers. Regular
            variables are stored as plain text and visible to project collaborators.
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
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              No environment variables configured. Add your first variable to get started.
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {variables.map(variable => (
            <Card key={variable.id}>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <code className="font-mono text-sm bg-muted px-2 py-1 rounded">
                        {variable.key}
                      </code>
                      {variable.isSecret && (
                        <Badge variant="secondary" className="text-xs">
                          <Shield className="w-3 h-3 mr-1" />
                          Secret
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="font-mono text-sm text-muted-foreground">
                        {formatValue(variable)}
                      </code>
                      {variable.isSecret && (
                        <Button
                          variant="ghost"
                          size="sm"
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

                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingVariable(variable)}
                    >
                      <Edit className="w-3 h-3" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">
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