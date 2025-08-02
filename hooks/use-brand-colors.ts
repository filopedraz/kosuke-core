import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import type { 
  CssVariable, 
  ColorUpdateRequest, 
  ColorStats,
  ThemeMode,
  ApiSuccess 
} from '@/lib/types';
import { convertToHsl } from '@/app/(logged-in)/projects/[id]/components/brand/utils/color-utils';

interface ColorsResponse {
  colors: CssVariable[];
  lightCount: number;
  darkCount: number;
  foundLocation: string;
}

// Hook for fetching brand colors
export function useBrandColors(projectId: number) {
  return useQuery({
    queryKey: ['brand-colors', projectId],
    queryFn: async (): Promise<ColorsResponse> => {
      const response = await fetch(`/api/projects/${projectId}/branding/colors`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch colors: ${response.statusText}`);
      }
      
      return response.json();
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1,
  });
}

// Hook for updating brand colors
export function useUpdateBrandColor(projectId: number) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, value, mode }: ColorUpdateRequest) => {
      // Convert the color to HSL format before sending to API
      const hslValue = convertToHsl(value);

      const response = await fetch(`/api/projects/${projectId}/branding/colors`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          value: hslValue,
          mode
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update color');
      }

      return response.json();
    },
    onMutate: async ({ name, value, mode }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['brand-colors', projectId] });

      // Snapshot the previous value
      const previousColors = queryClient.getQueryData<ColorsResponse>(['brand-colors', projectId]);

      // Optimistically update the cache
      if (previousColors) {
        const updatedColors = {
          ...previousColors,
          colors: previousColors.colors.map(variable => {
            if (variable.name === name) {
              return {
                ...variable,
                [mode === 'light' ? 'lightValue' : 'darkValue']: value
              };
            }
            return variable;
          })
        };

        queryClient.setQueryData(['brand-colors', projectId], updatedColors);
      }

      return { previousColors };
    },
    onSuccess: (_, { name }) => {
      toast({
        title: "Color updated",
        description: `${name.replace(/^--/, '')} has been updated successfully.`,
      });
    },
    onError: (error, __, context) => {
      // Revert optimistic update on error
      if (context?.previousColors) {
        queryClient.setQueryData(['brand-colors', projectId], context.previousColors);
      }

      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : "Failed to update color",
        variant: "destructive",
      });
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ['brand-colors', projectId] });
    },
  });
}