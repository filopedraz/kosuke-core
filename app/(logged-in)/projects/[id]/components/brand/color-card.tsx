'use client';

import { useState, useEffect } from 'react';
import { Check, Copy, Edit2 } from 'lucide-react';
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
 * Utility function to get the computed value of a CSS variable\n * within a specific element and pseudo-element context.\n * Note: This function is commented out as it was part of a previous approach.
 * The current approach uses a temporary element in useEffect.
 */
// function getResolvedCssVariableValue(variableName: string, element: HTMLElement): string | null {\n//   return getComputedStyle(element).getPropertyValue(variableName).trim();\n// }\n
export default function ColorCard({ colorVar, previewMode, onSave }: ColorCardProps) {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(colorVar.value);
  const [isSaving, setIsSaving] = useState(false);
  const [displayValue, setDisplayValue] = useState(colorVar.value);
  const [isChanged, setIsChanged] = useState(false);
  const [colorPreview, setColorPreview] = useState('transparent');
  const [textColor, setTextColor] = useState('#000000');

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
    } catch (error) {
      console.error('Error resolving color:', displayValue, error);
      resolvedColor = '#ff6b6b'; // Error indicator color
    }
    
    setColorPreview(resolvedColor);
    
    // Calculate appropriate text color for contrast
    try {
      let r = 0, g = 0, b = 0;
      
      // Extract RGB values from the resolved color
      const rgbMatch = resolvedColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (rgbMatch) {
        r = parseInt(rgbMatch[1]);
        g = parseInt(rgbMatch[2]);
        b = parseInt(rgbMatch[3]);
      } else if (resolvedColor.startsWith('#')) {
        // Handle hex colors
        const hex = resolvedColor.substring(1);
        const bigint = parseInt(hex, 16);
        r = (bigint >> 16) & 255;
        g = (bigint >> 8) & 255;
        b = bigint & 255;
      }
      
      // Calculate luminance to determine text color
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      setTextColor(luminance > 0.5 ? '#000000' : '#ffffff');
    } catch { // Empty catch block with no parameter
      setTextColor('#000000'); // Default to black text on error
    }
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

  // Get a human-readable color value for display
  const getDisplayColorValue = () => {
    // Show the HSL version for better readability if available
    if (colorPreview.startsWith('rgb')) {
      return colorPreview;
    }
    return colorPreview;
  };

  return (
    <Card className="overflow-hidden">
      <div
        className="h-32 w-full flex flex-col items-center justify-center p-2 text-center relative"
        style={{
          backgroundColor: colorPreview,
          color: textColor
        }}
      >
        {/* Tooltip showing the original value if it resolves differently */}
        {colorPreview !== displayValue && displayValue.startsWith('var(') && (
          <div className="absolute top-1 right-1 bg-black/50 text-white text-xs px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            Original: {displayValue}
          </div>
        )}
        <div className="text-sm font-mono break-all max-w-full overflow-hidden" title={getDisplayColorValue()}>
          {getDisplayColorValue()}
        </div>
        <div className="text-xs mt-1 px-2 py-0.5 bg-black/20 rounded">
          {previewMode === 'dark' ? 'Dark Theme' : 'Light Theme'}
        </div>
      </div>
      <CardContent className="pt-4 pb-2">
        <h3 className="font-medium text-sm truncate" title={formatColorName(colorVar.name)}>
          {formatColorName(colorVar.name)}
        </h3>
        <p className="text-xs text-muted-foreground truncate" title={colorVar.name}>
          {colorVar.name}
        </p>

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
                onClick={() => copyToClipboard(displayValue)}
                title={`Copy value: ${displayValue}`}
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
      <CardFooter className="p-2 border-t border-border bg-muted/30 flex justify-end">
        {isChanged && (
          <span className="text-xs text-amber-600 dark:text-amber-500 mr-auto font-medium">Modified</span>
        )}
        {/* Footer content can be added here if needed */}
      </CardFooter>
    </Card>
  );
} 