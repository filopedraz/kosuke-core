'use client';

import { useState, useEffect } from 'react';
import { Check, Copy, Edit2, Moon } from 'lucide-react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type ThemeMode = 'light' | 'dark';

interface CssVariable {
  name: string;
  value: string;
  scope?: 'root' | 'dark' | 'light' | 'unknown';
}

interface ColorCardProps {
  colorVar: CssVariable;
  previewMode: ThemeMode;
  onSave: (value: string) => Promise<boolean>;
  hasDarkVariant?: boolean;
}

/**
 * Convert a raw HSL value (e.g. "0 0% 100%") to a CSS color
 */
function convertHslToCssColor(hslValue: string): string {
  // If it's already a full CSS color, return it
  if (hslValue.startsWith('hsl') || hslValue.startsWith('rgb') || hslValue.startsWith('#')) {
    return hslValue;
  }

  // Try to match an HSL pattern (three values: hue saturation lightness)
  const hslParts = hslValue.trim().split(/\s+/);
  if (hslParts.length === 3 && hslParts[1].endsWith('%') && hslParts[2].endsWith('%')) {
    return `hsl(${hslParts[0]}, ${hslParts[1]}, ${hslParts[2]})`;
  }

  // Return the original if we can't convert it
  return hslValue;
}

/**
 * Convert HSL to HEX color
 */
function hslToHex(h: number, s: number, l: number): string {
  // Must convert HSL to RGB first
  s /= 100;
  l /= 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;
  
  let r = 0, g = 0, b = 0;
  
  if (0 <= h && h < 60) {
    r = c; g = x; b = 0;
  } else if (60 <= h && h < 120) {
    r = x; g = c; b = 0;
  } else if (120 <= h && h < 180) {
    r = 0; g = c; b = x;
  } else if (180 <= h && h < 240) {
    r = 0; g = x; b = c;
  } else if (240 <= h && h < 300) {
    r = x; g = 0; b = c;
  } else if (300 <= h && h < 360) {
    r = c; g = 0; b = x;
  }
  
  // Convert RGB to hex
  const rHex = Math.round((r + m) * 255).toString(16).padStart(2, '0');
  const gHex = Math.round((g + m) * 255).toString(16).padStart(2, '0');
  const bHex = Math.round((b + m) * 255).toString(16).padStart(2, '0');
  
  return `#${rHex}${gHex}${bHex}`.toUpperCase();
}

/**
 * Try to convert any CSS color to HEX
 */
function colorToHex(color: string): string {
  try {
    // If already hex, just return it
    if (color.startsWith('#')) {
      return color.toUpperCase();
    }
    
    // If it's an HSL color in the format "h s% l%"
    if (/^\d+\s+\d+%\s+\d+%$/.test(color)) {
      const [h, s, l] = color.split(/\s+/).map(part => 
        parseFloat(part.replace('%', ''))
      );
      return hslToHex(h, s, l);
    }
    
    // If it's hsl() or rgb(), we need to render it to get the computed color
    const temp = document.createElement('div');
    temp.style.color = convertHslToCssColor(color);
    document.body.appendChild(temp);
    const computedColor = getComputedStyle(temp).color;
    document.body.removeChild(temp);
    
    // Now parse the rgb() format
    const rgbMatch = computedColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (rgbMatch) {
      const r = parseInt(rgbMatch[1]).toString(16).padStart(2, '0');
      const g = parseInt(rgbMatch[2]).toString(16).padStart(2, '0');
      const b = parseInt(rgbMatch[3]).toString(16).padStart(2, '0');
      return `#${r}${g}${b}`.toUpperCase();
    }
    
    // If we couldn't convert, return the original
    return color;
  } catch {
    return color; // Return original on error
  }
}

/**
 * Utility function to get the computed value of a CSS variable\n * within a specific element and pseudo-element context.\n * Note: This function is commented out as it was part of a previous approach.
 * The current approach uses a temporary element in useEffect.
 */
// function getResolvedCssVariableValue(variableName: string, element: HTMLElement): string | null {\n//   return getComputedStyle(element).getPropertyValue(variableName).trim();\n// }\n
export default function ColorCard({ colorVar, previewMode, onSave, hasDarkVariant = false }: ColorCardProps) {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(colorVar.value);
  const [isSaving, setIsSaving] = useState(false);
  const [displayValue, setDisplayValue] = useState(colorVar.value);
  const [isChanged, setIsChanged] = useState(false);
  const [colorPreview, setColorPreview] = useState('transparent');
  const [hexValue, setHexValue] = useState('');

  // Update internal state when the color variable prop changes
  useEffect(() => {
    setInputValue(colorVar.value);
    setDisplayValue(colorVar.value);
    setIsChanged(false);
  }, [colorVar.value]);

  // Resolve and convert the color value based on preview mode
  useEffect(() => {
    let resolvedColor = 'transparent';
    
    try {
      // First, try to convert the raw value directly (for HSL values)
      const directConvertedColor = convertHslToCssColor(displayValue);
      
      // Create a temporary element to test the color
      const tempEl = document.createElement('div');
      document.body.appendChild(tempEl);
      
      // Add preview mode class if needed
      if (previewMode === 'dark') {
        tempEl.classList.add('dark');
      }
      
      // Try to apply the color
      tempEl.style.color = directConvertedColor;
      
      // Get the computed color
      const computedColor = getComputedStyle(tempEl).color;
      document.body.removeChild(tempEl);
      
      // Check if we got a valid computed color
      if (computedColor && computedColor !== 'rgb(0, 0, 0)' && computedColor !== 'rgba(0, 0, 0, 0)') {
        resolvedColor = computedColor;
      } else {
        // Fallback to our direct converted value
        resolvedColor = directConvertedColor;
      }
      
      // Convert to HEX for display
      setHexValue(colorToHex(displayValue));
      
    } catch (error) {
      console.error('Error resolving color:', displayValue, error);
      resolvedColor = '#ff6b6b'; // Error indicator color
    }
    
    setColorPreview(resolvedColor);
  }, [displayValue, previewMode]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async () => {
    if (!isChanged) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);

    try {
      const success = await onSave(inputValue);
      if (success) {
        setDisplayValue(inputValue);
        setIsChanged(false);
        setIsEditing(false);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (value: string) => {
    setInputValue(value);
    setIsChanged(value !== colorVar.value);
  };

  const formatColorName = (name: string) => {
    return name.replace(/^--/, '')
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <Card className="overflow-hidden">
      {/* Color preview with HEX value overlay */}
      <div className="relative h-32 w-full">
        <div
          className="absolute inset-0"
          style={{ backgroundColor: colorPreview }}
        />
        {hexValue && (
          <div className="absolute bottom-2 right-2 bg-black/40 text-white text-xs px-2 py-1 rounded font-mono">
            {hexValue}
          </div>
        )}
        {hasDarkVariant && previewMode === 'dark' && (
          <div className="absolute top-2 right-2 text-white">
            <Moon className="h-3.5 w-3.5 drop-shadow-md" />
          </div>
        )}
      </div>
      
      <CardContent className="pt-4 pb-2">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-medium text-sm truncate" title={formatColorName(colorVar.name)}>
              {formatColorName(colorVar.name)}
            </h3>
            <p className="text-xs text-muted-foreground truncate" title={colorVar.name}>
              {colorVar.name}
            </p>
          </div>
          {previewMode === 'dark' && hasDarkVariant && (
            <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
              Dark
            </span>
          )}
        </div>

        {isEditing ? (
          <div className="mt-3 flex space-x-2">
            <Input
              value={inputValue}
              onChange={(e) => handleInputChange(e.target.value)}
              className="h-8 text-xs"
              placeholder="e.g., 0 0% 100% or #ffffff"
            />
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isSaving || !isChanged}
              className="h-8 text-xs px-3"
            >
              {isSaving ? '...' : 'Save'}
            </Button>
          </div>
        ) : (
          <div className="mt-3 flex justify-between items-center">
            <p className="font-mono text-xs truncate" title={displayValue}>
              {displayValue}
            </p>
            <div className="flex space-x-1 flex-shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setIsEditing(true)}
                title="Edit color value"
              >
                <Edit2 className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => copyToClipboard(hexValue || displayValue)}
                title={`Copy value: ${hexValue || displayValue}`}
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-green-500" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
      
      {/* Only show footer when there are changes */}
      {isChanged && (
        <CardFooter className="p-2 border-t border-border bg-muted/30 flex justify-end">
          <span className="text-xs text-amber-600 dark:text-amber-500 mr-auto font-medium">
            Modified
          </span>
        </CardFooter>
      )}
    </Card>
  );
} 