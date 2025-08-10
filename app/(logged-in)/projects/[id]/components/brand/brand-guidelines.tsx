'use client';

import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUpdateBrandColor } from '@/hooks/use-brand-colors';
import { useBrandGuidelines } from '@/hooks/use-brand-guidelines';
import type { FontInfo } from '@/lib/types/branding';
import { Moon, Palette, Sun, TextQuote, Wand2 } from 'lucide-react';
import ColorCard, { ColorCardSkeleton } from './color-card';
import ColorPaletteModal from './color-palette-modal';
import FontCard, { FontCardSkeleton } from './font-card';
import KeywordsModal from './keywords-modal';
import { ThemePreviewProvider } from './theme-context';
import { getCategoryTitle, groupColorsByCategory } from './utils/color-utils';

interface BrandGuidelinesProps {
  projectId: number;
}

export default function BrandGuidelines({ projectId }: BrandGuidelinesProps) {
  // Use the comprehensive brand guidelines hook
  const {
    // State
    previewMode,
    activeTab,
    isKeywordsModalOpen,
    isPalettePreviewOpen,
    generatedPalette,

    // Data
    colors,
    fonts,
    isLoadingColors,
    isLoadingFonts,
    colorsError,
    fontsError,

    // Loading states
    isGeneratingPalette,

    // Actions
    setActiveTab,
    setIsKeywordsModalOpen,
    setIsPalettePreviewOpen,
    togglePreviewMode,
    handleGenerateColorPalette,
    generateColorPaletteWithKeywords,
    applyGeneratedPalette,
    getCurrentColorValue,
  } = useBrandGuidelines(projectId);

  // Color update mutation
  const updateColorMutation = useUpdateBrandColor(projectId);

  // Handle color change from ColorCard
  const handleColorChange = (name: string, newValue: string) => {
    updateColorMutation.mutate({
      name,
      value: newValue,
      mode: previewMode
    });
  };

  // Group colors into categories for display
  const groupedColors = groupColorsByCategory(colors);

  // Group fonts by type
  const groupedFonts = (() => {
    const grouped: Record<string, FontInfo[]> = {
      'sans': [],
      'serif': [],
      'mono': [],
      'display': [],
      'other': []
    };

    // Group fonts by naming convention
    fonts.forEach(font => {
      const name = font.name.toLowerCase();
      if (name.includes('mono')) {
        grouped['mono'].push(font);
      } else if (name.includes('serif')) {
        grouped['serif'].push(font);
      } else if (name.includes('display')) {
        grouped['display'].push(font);
      } else if (name.includes('sans')) {
        grouped['sans'].push(font);
      } else {
        grouped['other'].push(font);
      }
    });

    // Remove empty categories
    return Object.fromEntries(
      Object.entries(grouped).filter(([, fonts]) => fonts.length > 0)
    );
  })();

  return (
    <ThemePreviewProvider initialMode={previewMode}>
      <div className="flex flex-col h-full p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-semibold">Brand Guidelines</h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Generate Palette Button */}
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 h-9"
              onClick={handleGenerateColorPalette}
            >
              <Wand2 className="h-4 w-4" />
              Generate Color Palette
            </Button>

            {/* Theme Switcher */}
            <div className="flex items-center gap-2 border border-border px-3 py-1.5 rounded-md">
              <Sun className="h-4 w-4 text-muted-foreground" />
              <Switch
                checked={previewMode === 'dark'}
                onCheckedChange={togglePreviewMode}
                aria-label="Toggle color theme preview mode"
              />
              <Moon className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </div>

        <Tabs
          defaultValue="colors"
          className="w-full"
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as 'colors' | 'fonts')}
        >
          <TabsList>
            <TabsTrigger value="colors">Colors</TabsTrigger>
            <TabsTrigger value="fonts">Typography</TabsTrigger>
          </TabsList>

          <TabsContent value="colors" className="space-y-6 pt-6 pb-12">
            {colorsError && (
              <div className="p-4 bg-destructive/10 border border-destructive text-destructive rounded-md">
                {colorsError}
              </div>
            )}

            {isLoadingColors ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 gap-6">
                {Array.from({ length: 9 }).map((_, i) => (
                  <ColorCardSkeleton key={i} />
                ))}
              </div>
            ) : (
              colors.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                  <Palette className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-xl font-medium">No Color Variables Found</h3>
                  <p className="text-muted-foreground mt-2">
                    This project doesn&apos;t have any CSS color variables defined in globals.css.
                  </p>
                </div>
              ) : (
                // Display each category
                Object.entries(groupedColors).map(([category, categoryColors]) => (
                  <div key={category} className="space-y-4 mb-10">
                    <h2 className="text-xl font-medium">{getCategoryTitle(category)}</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 gap-6">
                      {categoryColors.map(color => (
                        <ColorCard
                          key={color.name + (color.scope || '')}
                          colorVar={{
                            name: color.name,
                            value: getCurrentColorValue(color)
                          }}
                          previewMode={previewMode}
                          onColorChange={handleColorChange}
                        />
                      ))}
                    </div>
                  </div>
                ))
              )
            )}
          </TabsContent>

          <TabsContent value="fonts" className="space-y-6 pt-6 pb-12">
            {fontsError && (
              <div className="p-4 bg-destructive/10 border border-destructive text-destructive rounded-md">
                {fontsError}
              </div>
            )}

            {isLoadingFonts ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Array.from({ length: 3 }).map((_, i) => (
                  <FontCardSkeleton key={i} />
                ))}
              </div>
            ) : (
              fonts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                  <TextQuote className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-xl font-medium">No Fonts Found</h3>
                  <p className="text-muted-foreground mt-2">
                    No fonts could be detected in this project&apos;s layout file.
                  </p>
                </div>
              ) : (
                Object.entries(groupedFonts).map(([category, categoryFonts], index, arr) => (
                  <div key={category} className={`space-y-4 ${index === arr.length - 1 ? 'mb-6' : 'mb-10'}`}>
                    <h2 className="text-xl font-medium capitalize">{category} Fonts</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {categoryFonts.map(font => (
                        <FontCard key={font.name} font={font} />
                      ))}
                    </div>
                  </div>
                ))
              )
            )}
          </TabsContent>
        </Tabs>

        {/* Keywords Modal */}
        <KeywordsModal
          isOpen={isKeywordsModalOpen}
          onOpenChange={setIsKeywordsModalOpen}
          onSubmit={generateColorPaletteWithKeywords}
          isGenerating={isGeneratingPalette}
        />

        {/* Color Palette Preview Modal */}
        <ColorPaletteModal
          isOpen={isPalettePreviewOpen}
          onOpenChange={setIsPalettePreviewOpen}
          palette={generatedPalette}
          isGenerating={isGeneratingPalette}
          onRegenerate={handleGenerateColorPalette}
          onApply={applyGeneratedPalette}
        />
      </div>
    </ThemePreviewProvider>
  );
}
