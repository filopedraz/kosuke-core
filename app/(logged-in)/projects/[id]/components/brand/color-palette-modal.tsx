'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { colorToHex, formatColorName, groupColorsByCategory } from './utils/color-utils';
import { useEffect, useRef } from 'react';

// Use the CssVariable type from a new types file
export interface CssVariable {
  name: string;
  lightValue: string;
  darkValue?: string;
  scope: 'root' | 'dark' | 'light' | 'unknown';
  [key: string]: string | undefined; // Add index signature to satisfy ColorVariable constraint
}

interface ColorPaletteModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  palette: CssVariable[];
  isGenerating: boolean;
  onRegenerate: () => void;
  onApply: () => void;
}

export default function ColorPaletteModal({
  isOpen,
  onOpenChange,
  palette,
  isGenerating,
  onRegenerate,
  onApply,
}: ColorPaletteModalProps) {
  // Add ref for focusing an element other than the close button
  const titleRef = useRef<HTMLHeadingElement>(null);
  
  // Focus the title element when the modal opens
  useEffect(() => {
    if (isOpen && titleRef.current) {
      // Small delay to ensure the modal is fully rendered
      setTimeout(() => {
        titleRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Function to convert HSL to HEX for display
  const getHexColor = (hslValue: string): string => {
    return colorToHex(hslValue);
  };

  // Render loading state when generating
  if (isGenerating) {
    return (
      <Dialog open={isOpen} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md">
          <div className="pt-6">
            <DialogHeader>
              <DialogTitle ref={titleRef} tabIndex={-1}>Generating Color Palette</DialogTitle>
              <DialogDescription>
                Please wait while we generate your custom color palette.
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-8 flex justify-center">
              <svg className="animate-spin h-8 w-8 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle ref={titleRef} tabIndex={-1}>Preview Generated Color Palette</DialogTitle>
          <DialogDescription>
            Review the AI-generated color palette. You can apply these colors to your project or generate a new palette.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 max-h-[60vh] overflow-y-auto">
          {palette.length > 0 ? (
            <div className="space-y-6">
              {/* Group colors by category for the preview - using the utility function */}
              {(() => {
                // Group colors into categories
                const groupedColors = groupColorsByCategory<CssVariable>(palette);
                
                // Render each category
                return Object.entries(groupedColors).map(([category, colors]) => (
                  <div key={category} className="space-y-4">
                    <h2 className="text-xl font-medium">
                      {category === 'other' ? 'Other Variables' : `${category.charAt(0).toUpperCase() + category.slice(1)} Colors`}
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {colors.map(color => {
                        const lightHex = getHexColor(color.lightValue);
                        const darkHex = color.darkValue ? getHexColor(color.darkValue) : null;
                        const formattedName = formatColorName(color.name);
                        
                        return (
                          <div key={color.name} className="flex space-x-2 items-center p-2 border rounded-md">
                            {/* Color preview */}
                            <div className="flex space-x-2 items-center">
                              <div 
                                className="w-8 h-8 rounded border"
                                style={{ 
                                  backgroundColor: lightHex,
                                  boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                                }}
                                title="Light mode color"
                              />
                              {darkHex && (
                                <div 
                                  className="w-8 h-8 rounded border"
                                  style={{ 
                                    backgroundColor: darkHex,
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                                  }}
                                  title="Dark mode color"
                                />
                              )}
                            </div>
                            {/* Color name and value */}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {formattedName}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                Light: {lightHex}
                              </p>
                              {darkHex && (
                                <p className="text-xs text-muted-foreground truncate">
                                  Dark: {darkHex}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ));
              })()}
            </div>
          ) : (
            <div className="flex items-center justify-center h-40">
              <p className="text-muted-foreground">No colors generated</p>
            </div>
          )}
        </div>
        
        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              onRegenerate();
            }}
          >
            Regenerate
          </Button>
          <Button
            onClick={onApply}
            disabled={palette.length === 0}
          >
            Apply to Project
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 