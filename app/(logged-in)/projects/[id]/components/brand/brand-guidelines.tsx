'use client';

import { useState, useEffect } from 'react';
import { Palette, Sun, Moon, TextQuote, Wand2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import ColorCard from './color-card';
import ColorCardSkeleton from './color-card-skeleton';
import FontCard from './font-card';
import FontCardSkeleton from './font-card-skeleton';
import { useToast } from '@/hooks/use-toast';
import ColorPaletteModal from './color-palette-modal';
import { ThemePreviewProvider } from './theme-context';
import { convertToHsl, groupColorsByCategory, getCategoryTitle } from './utils/color-utils';
import { type CssVariable, type ThemeMode } from './types';
import { type FontInfo } from '@/lib/font-parser';

interface BrandGuidelinesProps {
  projectId: number;
}

export default function BrandGuidelines({ projectId }: BrandGuidelinesProps) {
  const [previewMode, setPreviewMode] = useState<ThemeMode>('light'); // Default to light
  const [colorVariables, setColorVariables] = useState<CssVariable[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_stats, setStats] = useState({ lightCount: 0, darkCount: 0, foundLocation: '' });
  const { toast } = useToast();
  
  // Add font state
  const [fontVariables, setFontVariables] = useState<FontInfo[]>([]);
  const [isFontsLoading, setIsFontsLoading] = useState(true);
  const [fontsError, setFontsError] = useState<string | null>(null);
  
  // Add state for palette generation
  const [isGeneratingPalette, setIsGeneratingPalette] = useState(false);
  const [isPalettePreviewOpen, setIsPalettePreviewOpen] = useState(false);
  const [generatedPalette, setGeneratedPalette] = useState<CssVariable[]>([]);
  
  const togglePreviewMode = () => {
    setPreviewMode(prev => prev === 'dark' ? 'light' : 'dark');
  };
  
  // Function to fetch CSS variables
  const fetchCssVariables = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/projects/${projectId}/branding/colors`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch colors: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Fetched colors:', data);
      
      // Update stats for debugging
      setStats({
        lightCount: data.lightCount || 0,
        darkCount: data.darkCount || 0,
        foundLocation: data.foundLocation || ''
      });
      
      setColorVariables(data.colors || []);
    } catch (err) {
      console.error('Error fetching CSS variables:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch colors');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Add function to fetch font variables
  const fetchFontVariables = async () => {
    setIsFontsLoading(true);
    setFontsError(null);
    
    try {
      const response = await fetch(`/api/projects/${projectId}/branding/fonts`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch fonts: ${response.statusText}`);
      }
      
      const data = await response.json();
      setFontVariables(data.fonts || []);
    } catch (err) {
      console.error('Error fetching font variables:', err);
      setFontsError(err instanceof Error ? err.message : 'Failed to fetch fonts');
    } finally {
      setIsFontsLoading(false);
    }
  };
  
  // Handle color change from ColorCard
  const handleColorChange = async (name: string, newValue: string) => {
    try {
      // Convert the color to HSL format before sending to API
      const hslValue = convertToHsl(newValue);
      
      // Optimistically update UI
      const updatedVariables = colorVariables.map(variable => {
        if (variable.name === name) {
          return {
            ...variable,
            [previewMode === 'light' ? 'lightValue' : 'darkValue']: newValue
          };
        }
        return variable;
      });
      
      setColorVariables(updatedVariables);
      
      // Send update to server with HSL value
      const response = await fetch(`/api/projects/${projectId}/branding/colors`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          value: hslValue, // Use HSL value for API
          mode: previewMode
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update color');
      }
      
      toast({
        title: "Color updated",
        description: `${name.replace(/^--/, '')} has been updated successfully.`,
      });
      
    } catch (err) {
      console.error('Error updating color:', err);
      toast({
        title: "Update failed",
        description: err instanceof Error ? err.message : "Failed to update color",
        variant: "destructive",
      });
      
      // Revert changes on error
      fetchCssVariables();
    }
  };
  
  // Add function to generate color palette
  const generateColorPalette = async () => {
    setIsGeneratingPalette(true);
    
    try {
      const response = await fetch(`/api/projects/${projectId}/branding/generate-palette`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate color palette');
      }
      
      // Successfully generated the palette
      const data = await response.json();
      
      if (data.success && data.colors) {
        // Save the generated palette and show the preview modal
        setGeneratedPalette(data.colors);
        setIsPalettePreviewOpen(true);
      } else {
        throw new Error('Failed to generate a valid color palette');
      }
      
    } catch (err) {
      console.error('Error generating color palette:', err);
      toast({
        title: "Generation failed",
        description: err instanceof Error ? err.message : "Failed to generate color palette",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPalette(false);
    }
  };
  
  // Function to apply the generated palette
  const applyGeneratedPalette = async () => {
    setIsGeneratingPalette(true);
    
    try {
      const response = await fetch(`/api/projects/${projectId}/branding/generate-palette?apply=true`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          colors: generatedPalette
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to apply color palette');
      }
      
      // Show success message
      toast({
        title: "Palette applied",
        description: "New color palette has been applied to your project.",
      });
      
      // Refresh the colors
      fetchCssVariables();
      
    } catch (err) {
      console.error('Error applying color palette:', err);
      toast({
        title: "Application failed",
        description: err instanceof Error ? err.message : "Failed to apply color palette",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPalette(false);
      setIsPalettePreviewOpen(false);
    }
  };
  
  // Fetch data on component mount
  useEffect(() => {
    fetchCssVariables();
    fetchFontVariables();
  }, [projectId]);
  
  // Group colors into categories for display
  const groupedColors = groupColorsByCategory<CssVariable>(colorVariables);

  // Get current color value based on theme mode
  const getCurrentColorValue = (color: CssVariable) => {
    if (previewMode === 'dark' && color.darkValue) {
      return color.darkValue;
    }
    return color.lightValue;
  };
  
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
    fontVariables.forEach(font => {
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
              disabled={isGeneratingPalette}
              onClick={generateColorPalette}
            >
              {isGeneratingPalette ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generating...
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4" />
                  Generate Color Palette
                </>
              )}
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
        
        <Tabs defaultValue="colors" className="w-full">
          <TabsList>
            <TabsTrigger value="colors">Colors</TabsTrigger>
            <TabsTrigger value="fonts">Typography</TabsTrigger>
          </TabsList>
          
          <TabsContent value="colors" className="space-y-6 pt-6">
            {error && (
              <div className="p-4 bg-destructive/10 border border-destructive text-destructive rounded-md">
                {error}
              </div>
            )}
            
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 9 }).map((_, i) => (
                  <ColorCardSkeleton key={i} />
                ))}
              </div>
            ) : (
              colorVariables.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                  <Palette className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-xl font-medium">No Color Variables Found</h3>
                  <p className="text-muted-foreground mt-2">
                    This project doesn&apos;t have any CSS color variables defined in globals.css.
                  </p>
                </div>
              ) : (
                // Display each category
                Object.entries(groupedColors).map(([category, colors]) => (
                  <div key={category} className="space-y-4">
                    <h2 className="text-xl font-medium">{getCategoryTitle(category)}</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {colors.map(color => (
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
          
          <TabsContent value="fonts" className="space-y-6 pt-6">
            {fontsError && (
              <div className="p-4 bg-destructive/10 border border-destructive text-destructive rounded-md">
                {fontsError}
              </div>
            )}
            
            {isFontsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Array.from({ length: 3 }).map((_, i) => (
                  <FontCardSkeleton key={i} />
                ))}
              </div>
            ) : (
              fontVariables.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                  <TextQuote className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-xl font-medium">No Fonts Found</h3>
                  <p className="text-muted-foreground mt-2">
                    No fonts could be detected in this project&apos;s layout file.
                  </p>
                </div>
              ) : (
                Object.entries(groupedFonts).map(([category, fonts]) => (
                  <div key={category} className="space-y-4">
                    <h2 className="text-xl font-medium capitalize">{category} Fonts</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {fonts.map(font => (
                        <FontCard key={font.name} font={font} />
                      ))}
                    </div>
                  </div>
                ))
              )
            )}
          </TabsContent>
        </Tabs>
        
        {/* Color Palette Preview Modal */}
        <ColorPaletteModal
          isOpen={isPalettePreviewOpen}
          onOpenChange={setIsPalettePreviewOpen}
          palette={generatedPalette}
          isGenerating={isGeneratingPalette}
          onRegenerate={generateColorPalette}
          onApply={applyGeneratedPalette}
        />
      </div>
    </ThemePreviewProvider>
  );
} 