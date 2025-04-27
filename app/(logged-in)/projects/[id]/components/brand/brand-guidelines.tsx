'use client';

import { useState, useEffect, createContext } from 'react';
import { Palette, Sun, Moon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import ColorCard from './color-card';

// Define theme modes
type ThemeMode = 'light' | 'dark';

// Create a context for the theme preview
const ThemePreviewContext = createContext<{
  previewMode: ThemeMode;
  togglePreviewMode: () => void;
}>({
  previewMode: 'dark',
  togglePreviewMode: () => {},
});

// Color variable types to match API response
interface CssVariable {
  name: string;
  lightValue: string;
  darkValue?: string;
  scope: 'root' | 'dark' | 'light' | 'unknown';
}

interface BrandGuidelinesProps {
  projectId: number;
}

export default function BrandGuidelines({ projectId }: BrandGuidelinesProps) {
  const [previewMode, setPreviewMode] = useState<ThemeMode>('light'); // Default to light
  const [colorVariables, setColorVariables] = useState<CssVariable[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({ lightCount: 0, darkCount: 0, foundLocation: '' });
  
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
  
  // Update a color directly on the server
  const updateColor = async (name: string, value: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/branding/colors`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ colors: { [name]: value } }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to save color: ${response.statusText}`);
      }
      
      // Update the color locally 
      setColorVariables(prevColors => 
        prevColors.map(color => {
          if (color.name === name) {
            // Update either light or dark value based on current preview mode
            if (previewMode === 'light') {
              return { ...color, lightValue: value };
            } else {
              return { ...color, darkValue: value };
            }
          }
          return color;
        })
      );
      
      return true;
    } catch (err) {
      console.error('Error saving color:', err);
      setError(err instanceof Error ? err.message : 'Failed to save color');
      return false;
    }
  };
  
  // Fetch CSS variables on component mount
  useEffect(() => {
    fetchCssVariables();
  }, [projectId]);
  
  // Group colors into categories for display
  const groupedColors = (() => {
    const grouped: Record<string, CssVariable[]> = {};
    
    // Predefined color categories (in display order)
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
      'sidebar',
      'chart',
      'other'
    ];
    
    // Initialize categories
    categories.forEach(category => {
      grouped[category] = [];
    });
    
    // Sort colors into categories
    colorVariables.forEach(variable => {
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
    
    return result;
  })();
  
  const getCategoryTitle = (category: string) => {
    if (category === 'other') return 'Other Variables';
    return `${category.charAt(0).toUpperCase() + category.slice(1)} Colors`;
  };

  // Get current color value based on theme mode
  const getCurrentColorValue = (color: CssVariable) => {
    if (previewMode === 'dark' && color.darkValue) {
      return color.darkValue;
    }
    return color.lightValue;
  };
  
  return (
    <ThemePreviewContext.Provider value={{ previewMode, togglePreviewMode }}>
      <div className="flex flex-col h-full overflow-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-semibold">Brand Guidelines</h1>
            {stats.darkCount > 0 && (
              <div className="text-xs text-muted-foreground ml-2">
                Found {stats.lightCount} light and {stats.darkCount} dark theme colors
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2 border border-border px-3 py-1.5 rounded-md">
            <Sun className="h-4 w-4 text-muted-foreground" />
            <Switch 
              checked={previewMode === 'dark'}
              onCheckedChange={togglePreviewMode}
              aria-label="Toggle color theme preview mode"
            />
            <Moon className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm ml-2 font-medium text-muted-foreground">
              {previewMode === 'dark' ? 'Dark Theme' : 'Light Theme'} Preview
            </span>
          </div>
        </div>
        
        {error && (
          <div className="p-4 bg-destructive/10 border border-destructive text-destructive rounded-md">
            {error}
          </div>
        )}
        
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 9 }).map((_, i) => (
              <Card key={i} className="p-6 space-y-4">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-24 w-full" />
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </Card>
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
                        value: getCurrentColorValue(color),
                        scope: color.scope
                      }}
                      previewMode={previewMode}
                      onSave={(value: string) => updateColor(color.name, value)}
                      hasDarkVariant={!!color.darkValue}
                    />
                  ))}
                </div>
              </div>
            ))
          )
        )}
      </div>
    </ThemePreviewContext.Provider>
  );
} 