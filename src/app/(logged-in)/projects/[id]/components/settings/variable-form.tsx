'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  useCreateEnvironmentVariable,
  useUpdateEnvironmentVariable,
} from '@/hooks/use-environment-mutations';
import type { EnvironmentVariable } from '@/lib/types/environment';
import { zodResolver } from '@hookform/resolvers/zod';
import { Key, Loader2 } from 'lucide-react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const environmentVariableSchema = z.object({
  key: z
    .string()
    .min(1, 'Key is required')
    .max(100, 'Key must be less than 100 characters')
    .regex(/^[A-Z_][A-Z0-9_]*$/, 'Key must be uppercase letters, numbers, and underscores only'),
  value: z.string().min(1, 'Value is required'),
  isSecret: z.boolean(),
});

type FormData = z.infer<typeof environmentVariableSchema>;

interface VariableFormProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  editingVariable?: EnvironmentVariable | null;
}

export function VariableForm({ projectId, isOpen, onClose, editingVariable }: VariableFormProps) {
  const createMutation = useCreateEnvironmentVariable(projectId);
  const updateMutation = useUpdateEnvironmentVariable(projectId);

  const form = useForm<FormData>({
    resolver: zodResolver(environmentVariableSchema),
    defaultValues: {
      key: '',
      value: '',
      isSecret: false,
    },
  });

  const isEditing = !!editingVariable;
  const isLoading = createMutation.isPending || updateMutation.isPending;

  // Reset form when dialog opens/closes or editing variable changes
  useEffect(() => {
    if (isOpen) {
      if (editingVariable) {
        form.reset({
          key: editingVariable.key,
          value: editingVariable.value,
          isSecret: editingVariable.isSecret,
        });
      } else {
        form.reset({
          key: '',
          value: '',
          isSecret: false,
        });
      }
    }
  }, [isOpen, editingVariable, form]);

  const onSubmit = async (data: FormData) => {
    try {
      if (isEditing && editingVariable) {
        await updateMutation.mutateAsync({
          id: editingVariable.id,
          data: {
            value: data.value,
            isSecret: data.isSecret,
          },
        });
      } else {
        await createMutation.mutateAsync(data);
      }
      onClose();
    } catch {
      // Error handling is done in the mutation hooks
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="p-0 overflow-hidden border border-border bg-card shadow-lg rounded-md"
        style={{ maxWidth: '512px' }}
      >
        <DialogTitle className="sr-only">
          {isEditing ? 'Edit Environment Variable' : 'Add Environment Variable'}
        </DialogTitle>
        <DialogDescription className="sr-only">
          {isEditing
            ? 'Update the environment variable details.'
            : 'Create a new environment variable for your project.'}
        </DialogDescription>

        <div className="p-4">
          <div className="flex items-center space-x-3 mb-4">
            <Key className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">
              {isEditing ? 'Edit Environment Variable' : 'Add Environment Variable'}
            </h3>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="key"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Key</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="API_KEY"
                          className="h-11"
                          disabled={isEditing || isLoading}
                        />
                      </FormControl>
                      <FormDescription>
                        Must be uppercase letters, numbers, and underscores only.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="value"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Value</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="your-api-key-value"
                          type="text"
                          className="h-11"
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isSecret"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel className="text-sm font-medium">Secret Variable</FormLabel>
                        <FormDescription>
                          Secret variables are encrypted and masked in the interface.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={isLoading}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {/* Actions */}
                <div className="flex justify-end items-center gap-3 pt-3">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={onClose}
                    disabled={isLoading}
                    className="h-10"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="h-10 min-w-[120px]"
                  >
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isEditing ? 'Update Variable' : 'Create Variable'}
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
