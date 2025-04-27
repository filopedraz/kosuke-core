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

// Use the CssVariable type from a new types file
export interface CssVariable {
  name: string;
  lightValue: string;
  darkValue?: string;
  scope: 'root' | 'dark' | 'light' | 'unknown';
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
              {/* Group colors by category for the preview */}
              {(() => {
                // Create a temporary grouping of the generated colors
                const grouped: Record<string, CssVariable[]> = {};
                
                // Predefined color categories
                const categories = [
                  'background',
                  'foreground',
                  'primary',
                  'secondary',
                  'accent',
                  'muted',
                  'card',
                  'popover',
                  'border',
                  'destructive',
                  'other'
                ];
                
                // Initialize categories
                categories.forEach(category => {
                  grouped[category] = [];
                });
                
                // Sort colors into categories
                palette.forEach(variable => {
                  const name = variable.name.replace(/^--/, '');
                  let assigned = false;
                  
                  // Try to match to a category
                  for (const category of categories) {
                    if (name === category || name.startsWith(`${category}-`) || name.includes(category)) {
                      grouped[category].push(variable);
                      assigned = true;
                      break;
                    }
                  }
                  
                  // If no category matched, put in 'other'
                  if (!assigned) {
                    grouped['other'].push(variable);
                  }
                });
                
                // Remove empty categories
                const result: Record<string, CssVariable[]> = {};
                for (const category of categories) {
                  if (grouped[category].length > 0) {
                    result[category] = grouped[category];
                  }
                }
                
                // Render each category
                return Object.entries(result).map(([category, colors]) => (
                  <div key={category} className="space-y-4">
                    <h2 className="text-xl font-medium">
                      {category === 'other' ? 'Other Variables' : `${category.charAt(0).toUpperCase() + category.slice(1)} Colors`}
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {colors.map(color => (
                        <div key={color.name} className="flex space-x-2 items-center p-2 border rounded-md">
                          {/* Color preview */}
                          <div className="flex space-x-2 items-center">
                            <div 
                              className="w-8 h-8 rounded border"
                              style={{ 
                                backgroundColor: `hsl(${color.lightValue})`,
                                boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                              }}
                              title="Light mode color"
                            />
                            {color.darkValue && (
                              <div 
                                className="w-8 h-8 rounded border"
                                style={{ 
                                  backgroundColor: `hsl(${color.darkValue})`,
                                  boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                                }}
                                title="Dark mode color"
                              />
                            )}
                          </div>
                          {/* Color name and value */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {color.name.replace(/^--/, '')}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              Light: {color.lightValue}
                            </p>
                            {color.darkValue && (
                              <p className="text-xs text-muted-foreground truncate">
                                Dark: {color.darkValue}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
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
            disabled={isGenerating}
          >
            Regenerate
          </Button>
          <Button
            onClick={onApply}
            disabled={isGenerating || palette.length === 0}
          >
            {isGenerating ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-background" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Applying...
              </>
            ) : (
              'Apply to Project'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 