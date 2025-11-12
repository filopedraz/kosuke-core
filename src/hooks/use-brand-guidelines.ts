import type { CssVariable, ThemeMode } from '@/lib/types';
import { useCallback, useState } from 'react';
import { useBrandColors } from './use-brand-colors';
import { useBrandFonts } from './use-brand-fonts';
import { useApplyColorPalette, useGenerateColorPalette } from './use-color-palette-generation';

// Hook that combines all brand guidelines functionality (session-specific)
export function useBrandGuidelines(projectId: string, sessionId: string) {
  // UI State
  const [previewMode, setPreviewMode] = useState<ThemeMode>('light');
  const [activeTab, setActiveTab] = useState<'colors' | 'fonts'>('colors');
  const [isKeywordsModalOpen, setIsKeywordsModalOpen] = useState(false);
  const [isPalettePreviewOpen, setIsPalettePreviewOpen] = useState(false);
  const [generatedPalette, setGeneratedPalette] = useState<CssVariable[]>([]);

  // Data hooks
  const colorsQuery = useBrandColors(projectId, sessionId);
  const fontsQuery = useBrandFonts(projectId, sessionId);
  const generatePaletteMutation = useGenerateColorPalette(projectId, sessionId);
  const applyPaletteMutation = useApplyColorPalette(projectId, sessionId);

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
