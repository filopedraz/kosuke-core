'use client';

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { Palette, Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import ColorCard from './color-card';

interface CssVariable {
  name: string;
  value: string;
  description?: string;
}

interface BrandGuidelinesProps {
  projectId: number;
}

export default function BrandGuidelines({ projectId }: BrandGuidelinesProps) {
  const { theme, setTheme } = useTheme();
  const [colorVariables, setColorVariables] = useState<CssVariable[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editedColors, setEditedColors] = useState<Record<string, string>>({});
  
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
      setColorVariables(data.colors);
    } catch (err) {
      console.error('Error fetching CSS variables:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch colors');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Function to update a color variable
  const updateColorVariable = (name: string, value: string) => {
    setEditedColors(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Function to save edited colors
  const saveColorChanges = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/branding/colors`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ colors: editedColors }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to save colors: ${response.statusText}`);
      }
      
      // Reset edited colors and refresh
      setEditedColors({});
      fetchCssVariables();
    } catch (err) {
      console.error('Error saving color changes:', err);
      setError(err instanceof Error ? err.message : 'Failed to save colors');
    }
  };
  
  // Fetch CSS variables on component mount
  useEffect(() => {
    fetchCssVariables();
  }, [projectId]);
  
  // Group colors by category (based on naming conventions)
  const groupColorsByCategory = () => {
    const grouped: Record<string, CssVariable[]> = {};
    
    colorVariables.forEach(variable => {
      // Extract category from variable name (e.g., --color-primary -> primary)
      let category = 'other';
      
      if (variable.name.includes('primary')) category = 'primary';
      else if (variable.name.includes('secondary')) category = 'secondary';
      else if (variable.name.includes('accent')) category = 'accent';
      else if (variable.name.includes('background')) category = 'background';
      else if (variable.name.includes('foreground')) category = 'foreground';
      else if (variable.name.includes('border')) category = 'border';
      else if (variable.name.includes('muted')) category = 'muted';
      
      if (!grouped[category]) {
        grouped[category] = [];
      }
      
      grouped[category].push(variable);
    });
    
    return grouped;
  };
  
  const groupedColors = groupColorsByCategory();
  const hasChanges = Object.keys(editedColors).length > 0;
  
  return (
    <div className="flex flex-col h-full overflow-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Palette className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-semibold">Brand Guidelines</h1>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center space-x-2">
            <Sun className="h-4 w-4" />
            <Switch 
              checked={theme === 'dark'}
              onCheckedChange={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            />
            <Moon className="h-4 w-4" />
          </div>
          
          {hasChanges && (
            <Button onClick={saveColorChanges} variant="default" size="sm">
              Save Changes
            </Button>
          )}
          
          <Button onClick={fetchCssVariables} variant="outline" size="sm">
            Refresh
          </Button>
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
        <>
          {Object.entries(groupedColors).map(([category, colors]) => (
            <div key={category} className="space-y-4">
              <h2 className="text-xl font-medium capitalize">{category} Colors</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {colors.map(color => (
                  <ColorCard
                    key={color.name}
                    colorVar={color}
                    currentValue={editedColors[color.name] || color.value}
                    onChange={(value: string) => updateColorVariable(color.name, value)}
                  />
                ))}
              </div>
            </div>
          ))}
          
          {colorVariables.length === 0 && !isLoading && (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <Palette className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-xl font-medium">No Color Variables Found</h3>
              <p className="text-muted-foreground mt-2">
                This project doesn&apos;t have any CSS color variables defined in globals.css.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
} 