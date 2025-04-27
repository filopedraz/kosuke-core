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
import { Wand2 } from 'lucide-react';

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
  // Function to convert HSL to HEX for display
  const getHexColor = (hslValue: string): string => {
    return colorToHex(hslValue);
  };

  // Render loading state when generating
  if (isGenerating) {
    return (
      <Dialog open={isOpen} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Generating Color Palette</DialogTitle>
            <DialogDescription>
              Please wait while we generate your custom color palette.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-8 flex flex-col items-center justify-center">
            <div className="relative h-20 w-20">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-16 w-16 rounded-full bg-primary/20"></div>
              </div>
              <div className="absolute top-0 left-0 h-full w-full animate-spin-slow">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div 
                    key={i}
                    className="absolute h-5 w-5 rounded-full"
                    style={{
                      backgroundColor: `hsl(${i * 45}, 100%, 65%)`,
                      top: `${Math.sin(i * Math.PI / 4) * 8 + 8}px`,
                      left: `${Math.cos(i * Math.PI / 4) * 8 + 8}px`,
                      animation: `pulse 1.5s infinite ${i * 0.1}s`
                    }}
                  ></div>
                ))}
              </div>
              <Wand2 className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-8 w-8 text-primary animate-pulse" />
            </div>
          </div>

          <style jsx global>{`
            @keyframes pulse {
              0%, 100% { transform: scale(1); opacity: 1; }
              50% { transform: scale(1.2); opacity: 0.7; }
            }
            .animate-spin-slow {
              animation: spin 4s linear infinite;
            }
            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
          `}</style>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Preview Generated Color Palette</DialogTitle>
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