'use client';

import { useState, useEffect, useRef } from 'react';
import { Copy, Check, Edit2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
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
  onColorChange?: (name: string, newValue: string) => void;
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

// Convert HEX to HSL (for generating the color picker gradient)
function hexToHSL(hex: string): { h: number; s: number; l: number } {
  // Remove # if present
  hex = hex.replace(/^#/, '');
  
  // Parse the hex values
  let r = 0, g = 0, b = 0;
  if (hex.length === 3) {
    r = parseInt(hex[0] + hex[0], 16) / 255;
    g = parseInt(hex[1] + hex[1], 16) / 255;
    b = parseInt(hex[2] + hex[2], 16) / 255;
  } else {
    r = parseInt(hex.substring(0, 2), 16) / 255;
    g = parseInt(hex.substring(2, 4), 16) / 255;
    b = parseInt(hex.substring(4, 6), 16) / 255;
  }
  
  // Find min and max
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  
  // Calculate HSL
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  
  if (delta !== 0) {
    s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);
    
    if (max === r) {
      h = ((g - b) / delta + (g < b ? 6 : 0)) * 60;
    } else if (max === g) {
      h = ((b - r) / delta + 2) * 60;
    } else {
      h = ((r - g) / delta + 4) * 60;
    }
  }
  
  return { h, s: s * 100, l: l * 100 };
}

export default function ColorCard({ colorVar, previewMode, onColorChange }: ColorCardProps) {
  const [copied, setCopied] = useState(false);
  const [colorPreview, setColorPreview] = useState('transparent');
  const [hexValue, setHexValue] = useState('');
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editableHexValue, setEditableHexValue] = useState('');
  const [hue, setHue] = useState(0);
  const [saturation, setSaturation] = useState(100);
  const [lightness, setLightness] = useState(50);
  
  const colorPickerRef = useRef<HTMLDivElement>(null);
  const hueSelectorRef = useRef<HTMLDivElement>(null);
  
  // Resolve and convert the color value based on preview mode
  useEffect(() => {
    let resolvedColor = 'transparent';
    
    try {
      // First, try to convert the raw value directly (for HSL values)
      const directConvertedColor = convertHslToCssColor(colorVar.value);
      
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
      const convertedHex = colorToHex(colorVar.value);
      setHexValue(convertedHex);
      setEditableHexValue(convertedHex);
      
      // Update HSL values for color picker
      if (convertedHex.startsWith('#')) {
        const hsl = hexToHSL(convertedHex);
        setHue(hsl.h);
        setSaturation(hsl.s);
        setLightness(hsl.l);
      }
      
    } catch (error) {
      console.error('Error resolving color:', colorVar.value, error);
      resolvedColor = '#ff6b6b'; // Error indicator color
    }
    
    setColorPreview(resolvedColor);
  }, [colorVar.value, previewMode]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(hexValue || colorVar.value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  const openEditDialog = () => {
    setEditableHexValue(hexValue);
    setIsEditDialogOpen(true);
  };
  
  const handleSaveColor = () => {
    if (onColorChange && editableHexValue) {
      onColorChange(colorVar.name, editableHexValue);
    }
    setIsEditDialogOpen(false);
  };
  
  const handlePickerClick = (e: React.MouseEvent) => {
    if (!colorPickerRef.current) return;
    
    const rect = colorPickerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    
    setSaturation(x * 100);
    setLightness(100 - y * 100);
    
    const newColor = `#${hslToHex(hue, x * 100, 100 - y * 100).replace('#', '')}`;
    setEditableHexValue(newColor);
  };
  
  const handleHueChange = (e: React.MouseEvent) => {
    if (!hueSelectorRef.current) return;
    
    const rect = hueSelectorRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    
    const newHue = x * 360;
    setHue(newHue);
    
    const newColor = `#${hslToHex(newHue, saturation, lightness).replace('#', '')}`;
    setEditableHexValue(newColor);
  };

  const handleHexInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEditableHexValue(value);
    
    // If it's a valid hex color, update the color picker
    if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
      const hsl = hexToHSL(value);
      setHue(hsl.h);
      setSaturation(hsl.s);
      setLightness(hsl.l);
    }
  };
  
  const formatColorName = (name: string) => {
    return name.replace(/^--/, '')
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <>
      <Card className="overflow-hidden group">
        {/* Color preview with buttons on hover */}
        <div className="relative h-32 w-full">
          <div
            className="absolute inset-0"
            style={{ backgroundColor: colorPreview }}
          />
          
          {/* Button container - only visible on hover */}
          <div className="absolute top-2 right-2 left-2 flex justify-between opacity-0 group-hover:opacity-100 transition-opacity">
            {/* Copy button on the left */}
            <Button
              variant="secondary"
              size="icon"
              className="h-7 w-7 bg-white/90 dark:bg-black/50 backdrop-blur-sm"
              onClick={copyToClipboard}
              title={`Copy value: ${hexValue}`}
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-green-500" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </Button>
            
            {/* Edit button on the right */}
            <Button
              variant="secondary"
              size="icon"
              className="h-7 w-7 bg-white/90 dark:bg-black/50 backdrop-blur-sm"
              onClick={openEditDialog}
              title="Edit color"
            >
              <Edit2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        
        <CardContent className="py-4 px-3">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-sm" title={formatColorName(colorVar.name)}>
              {formatColorName(colorVar.name)}
            </h3>
            {hexValue && (
              <Badge variant="outline" className="font-mono text-xs px-1.5 py-0 h-5">
                {hexValue}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Edit Color Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Color: {formatColorName(colorVar.name)}</DialogTitle>
            <DialogDescription>
              Update this color using the color picker or by entering a hex value directly.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-col gap-6 py-4">
            {/* Color picker area */}
            <div className="grid gap-4">
              {/* Main color picker */}
              <div 
                ref={colorPickerRef}
                className="relative h-48 w-full rounded-md cursor-crosshair" 
                style={{
                  background: `linear-gradient(to right, #fff, hsl(${hue}, 100%, 50%))`,
                  backgroundImage: `
                    linear-gradient(to right, #fff, hsl(${hue}, 100%, 50%)),
                    linear-gradient(to top, #000, transparent)
                  `,
                  backgroundBlendMode: 'multiply'
                }}
                onMouseDown={handlePickerClick}
                onMouseMove={(e) => e.buttons === 1 && handlePickerClick(e)}
              >
                {/* Current selected position */}
                <div 
                  className="absolute h-4 w-4 rounded-full border-2 border-white transform -translate-x-1/2 -translate-y-1/2" 
                  style={{
                    left: `${saturation}%`,
                    top: `${100 - lightness}%`,
                    backgroundColor: `hsl(${hue}, ${saturation}%, ${lightness}%)`,
                    boxShadow: '0 0 0 1px rgba(0,0,0,0.3)'
                  }}
                />
              </div>
              
              {/* Hue selector */}
              <div 
                ref={hueSelectorRef}
                className="relative h-8 w-full rounded-md cursor-pointer"
                style={{
                  background: 'linear-gradient(to right, #FF0000, #FFFF00, #00FF00, #00FFFF, #0000FF, #FF00FF, #FF0000)'
                }}
                onMouseDown={handleHueChange}
                onMouseMove={(e) => e.buttons === 1 && handleHueChange(e)}
              >
                {/* Current hue position */}
                <div 
                  className="absolute top-0 h-full w-1 bg-white border border-gray-300 transform -translate-x-1/2"
                  style={{ left: `${(hue / 360) * 100}%` }}
                />
              </div>
            </div>
            
            {/* HEX input */}
            <div className="flex items-center gap-2">
              <div className="flex-shrink-0">
                <div 
                  className="h-10 w-10 rounded-md border border-border"
                  style={{ backgroundColor: editableHexValue }}
                />
              </div>
              <div className="flex-grow">
                <Input
                  value={editableHexValue}
                  onChange={handleHexInputChange}
                  placeholder="#RRGGBB"
                  className="font-mono"
                  spellCheck={false}
                />
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveColor}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
} 