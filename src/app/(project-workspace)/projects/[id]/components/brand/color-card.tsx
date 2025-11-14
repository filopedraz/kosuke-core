'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Check, Copy, Edit2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { ThemeMode } from './theme-context';
import {
  colorToHex,
  convertHslToCssColor,
  formatColorName,
  hexToHSL,
  hslToHex
} from '@/lib/branding/color-utils';

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
      // We're already converting to HSL in the parent component's handleColorChange
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

  return (
    <>
      <Card className="overflow-hidden group pt-0 pb-3">
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

        <CardContent className="py-3 px-3">
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

export function ColorCardSkeleton() {
  return (
    <Card className="overflow-hidden group pt-0 pb-3">
      <Skeleton className="h-32 w-full rounded-none" />
      <CardContent className="py-3 px-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      </CardContent>
    </Card>
  );
}
