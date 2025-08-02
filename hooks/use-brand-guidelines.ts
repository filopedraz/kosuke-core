import { useState, useCallback } from 'react';
import type { ThemeMode, CssVariable } from '@/lib/types';
import { useBrandColors } from './use-brand-colors';
import { useBrandFonts } from './use-brand-fonts';
import { useGenerateColorPalette, useApplyColorPalette } from './use-color-palette-generation';

// Hook that combines all brand guidelines functionality
export function useBrandGuidelines(projectId: number) {
  // UI State
  const [previewMode, setPreviewMode] = useState<ThemeMode>('light');
  const [activeTab, setActiveTab] = useState<'colors' | 'fonts'>('colors');
  const [isKeywordsModalOpen, setIsKeywordsModalOpen] = useState(false);
  const [isPalettePreviewOpen, setIsPalettePreviewOpen] = useState(false);
  const [generatedPalette, setGeneratedPalette] = useState<CssVariable[]>([]);

  // Data hooks
  const colorsQuery = useBrandColors(projectId);
  const fontsQuery = useBrandFonts(projectId);
  const generatePaletteMutation = useGenerateColorPalette(projectId);
  const applyPaletteMutation = useApplyColorPalette(projectId);

  // Actions
  const togglePreviewMode = useCallback(() => {
    setPreviewMode(prev => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const handleGenerateColorPalette = useCallback(() => {
    setIsKeywordsModalOpen(true);
  }, []);

  const generateColorPaletteWithKeywords = useCallback(
    async (keywords: string) => {
      setIsKeywordsModalOpen(false);
      setIsPalettePreviewOpen(true);

      try {
        const result = await generatePaletteMutation.mutateAsync({ keywords });
        setGeneratedPalette(result.colors);
      } catch {
        // Error handling is done in the mutation
        setIsPalettePreviewOpen(false);
      }
    },
    [generatePaletteMutation]
  );

  const applyGeneratedPalette = useCallback(async () => {
    setIsPalettePreviewOpen(false);
    await applyPaletteMutation.mutateAsync(generatedPalette);
  }, [applyPaletteMutation, generatedPalette]);

  const getCurrentColorValue = useCallback(
    (color: CssVariable) => {
      if (previewMode === 'dark' && color.darkValue) {
        return color.darkValue;
      }
      return color.lightValue;
    },
    [previewMode]
  );

  return {
    // State
    previewMode,
    activeTab,
    isKeywordsModalOpen,
    isPalettePreviewOpen,
    generatedPalette,

    // Data
    colors: colorsQuery.data?.colors || [],
    fonts: fontsQuery.data?.fonts || [],
    isLoadingColors: colorsQuery.isLoading,
    isLoadingFonts: fontsQuery.isLoading,
    colorsError: colorsQuery.error?.message || null,
    fontsError: fontsQuery.error?.message || null,
    colorStats: {
      lightCount: colorsQuery.data?.lightCount || 0,
      darkCount: colorsQuery.data?.darkCount || 0,
      foundLocation: colorsQuery.data?.foundLocation || '',
    },

    // Loading states
    isGeneratingPalette: generatePaletteMutation.isPending,
    isApplyingPalette: applyPaletteMutation.isPending,

    // Actions
    setPreviewMode,
    setActiveTab,
    setIsKeywordsModalOpen,
    setIsPalettePreviewOpen,
    togglePreviewMode,
    handleGenerateColorPalette,
    generateColorPaletteWithKeywords,
    applyGeneratedPalette,
    getCurrentColorValue,

    // Utilities
    refetchColors: colorsQuery.refetch,
    refetchFonts: fontsQuery.refetch,
  };
}
