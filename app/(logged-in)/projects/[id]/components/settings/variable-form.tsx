'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
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
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';
import {
  useCreateEnvironmentVariable,
  useUpdateEnvironmentVariable,
} from '@/hooks/use-environment-mutations';
import type { EnvironmentVariable } from '@/lib/types/environment';

const environmentVariableSchema = z.object({
  key: z
    .string()
    .min(1, 'Key is required')
    .max(100, 'Key must be less than 100 characters')
    .regex(/^[A-Z_][A-Z0-9_]*$/, 'Key must be uppercase letters, numbers, and underscores only'),
  value: z.string().min(1, 'Value is required'),
  isSecret: z.boolean().default(false),
  description: z.string().optional(),
});

type FormData = z.infer<typeof environmentVariableSchema>;

interface VariableFormProps {
  projectId: number;
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
      description: '',
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
          description: editingVariable.description || '',
        });
      } else {
        form.reset({
          key: '',
          value: '',
          isSecret: false,
          description: '',
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
            description: data.description,
          },
        });
      } else {
        await createMutation.mutateAsync(data);
      }
      onClose();
    } catch (error) {
      // Error handling is done in the mutation hooks
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Environment Variable' : 'Add Environment Variable'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the environment variable details.'
              : 'Create a new environment variable for your project.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="key"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Key</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="API_KEY"
                      disabled={isEditing} // Don't allow key changes when editing
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
                  <FormLabel>Value</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="your-api-key-value" type="text" />
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
                    <FormLabel>Secret Variable</FormLabel>
                    <FormDescription>
                      Secret variables are encrypted and masked in the interface.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Brief description of what this variable is used for..."
                      className="resize-none"
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? 'Update Variable' : 'Create Variable'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}