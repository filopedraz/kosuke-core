import { useToast } from '@/hooks/use-toast';
import type { PaletteGenerationRequest, PaletteGenerationResponse } from '@/lib/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';

// Hook for generating color palettes
export function useGenerateColorPalette(projectId: number) {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      keywords,
    }: PaletteGenerationRequest): Promise<PaletteGenerationResponse> => {
      const response = await fetch(`/api/projects/${projectId}/branding/generate-palette`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          keywords: keywords.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate color palette');
      }

      const data = await response.json();

      if (!data.success || !data.colors) {
        throw new Error('Failed to generate a valid color palette');
      }

      return data;
    },
    onError: error => {
      toast({
        title: 'Generation failed',
        description: error instanceof Error ? error.message : 'Failed to generate color palette',
        variant: 'destructive',
      });
    },
  });
}

// Hook for applying generated color palette
export function useApplyColorPalette(projectId: number) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      colors: Array<{
        name: string;
        value: string;
        lightValue?: string;
        darkValue?: string;
        description?: string;
      }>
    ) => {
      const response = await fetch(
        `/api/projects/${projectId}/branding/generate-palette?apply=true`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            colors,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to apply color palette');
      }

      return response.json();
    },
    onSuccess: () => {
      // Show success message
      toast({
        title: 'Palette applied',
        description: 'New color palette has been applied to your project.',
      });

      // Refresh the colors
      queryClient.invalidateQueries({ queryKey: ['brand-colors', projectId] });
    },
    onError: error => {
      toast({
        title: 'Application failed',
        description: error instanceof Error ? error.message : 'Failed to apply color palette',
        variant: 'destructive',
      });
    },
  });
}
