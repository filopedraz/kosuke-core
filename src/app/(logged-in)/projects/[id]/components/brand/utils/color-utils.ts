import type { ColorVariable as BaseColorVariable } from '@/lib/types/branding';

// Extend the base ColorVariable type to make scope optional for backward compatibility
 interface ColorVariable extends Omit<BaseColorVariable, 'scope'> {
  scope?: 'root' | 'dark' | 'light' | 'unknown';
  [key: string]: string | undefined;
}

/**
 * Convert any color format to HSL string (format: "h s% l%")
 */
export function convertToHsl(color: string): string {
  try {
    // If already in HSL format "h s% l%", return as is
    if (/^\d+\s+\d+%\s+\d+%$/.test(color)) {
      return color;
    }

    // If it's already in hsl() format, extract the values
    const hslMatch = color.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
    if (hslMatch) {
      return `${hslMatch[1]} ${hslMatch[2]}% ${hslMatch[3]}%`;
    }

    // For hex colors and other formats, we need to convert
    // This requires browser APIs, so we use this approach only in client components
    if (typeof document !== 'undefined') {
      const temp = document.createElement('div');
      temp.style.color = color;
      document.body.appendChild(temp);
      const computedColor = getComputedStyle(temp).color;
      document.body.removeChild(temp);

      // Parse RGB values
      const rgbMatch = computedColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (rgbMatch) {
        // Convert RGB to HSL
        const r = parseInt(rgbMatch[1]) / 255;
        const g = parseInt(rgbMatch[2]) / 255;
        const b = parseInt(rgbMatch[3]) / 255;

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const l = (max + min) / 2;

        let h = 0;
        let s = 0;

        if (max !== min) {
          const d = max - min;
          s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

          switch (max) {
            case r:
              h = (g - b) / d + (g < b ? 6 : 0);
              break;
            case g:
              h = (b - r) / d + 2;
              break;
            case b:
              h = (r - g) / d + 4;
              break;
          }

          h = Math.round(h * 60);
        }

        s = Math.round(s * 100);
        const lightness = Math.round(l * 100);

        return `${h} ${s}% ${lightness}%`;
      }
    }

    // If conversion failed, return the original color
    return color;
  } catch (error) {
    console.error('Error converting color to HSL:', error);
    return color;
  }
}

/**
 * Convert a raw HSL or OKLCH value to a CSS color
 */
export function convertHslToCssColor(colorValue: string): string {
  if (!colorValue) {
    return 'transparent';
  }

  // If it's already a full CSS color, return it
  if (colorValue.startsWith('hsl') || colorValue.startsWith('rgb') || colorValue.startsWith('#') || colorValue.startsWith('oklch')) {
    return colorValue;
  }

  // Try to match an HSL pattern (three values: hue saturation lightness)
  const hslParts = colorValue.trim().split(/\s+/);
  if (hslParts.length === 3 && hslParts[1].endsWith('%') && hslParts[2].endsWith('%')) {
    return `hsl(${hslParts[0]}, ${hslParts[1]}, ${hslParts[2]})`;
  }

  // Try to match OKLCH pattern (three number values: lightness chroma hue)
  if (hslParts.length === 3 && !hslParts[1].endsWith('%') && !hslParts[2].endsWith('%')) {
    // Check if values look like OKLCH (numeric values)
    const [l, c, h] = hslParts;
    if (!isNaN(Number(l)) && !isNaN(Number(c)) && !isNaN(Number(h))) {
      return `oklch(${l} ${c} ${h})`;
    }
  }

  // Return the original if we can't convert it
  return colorValue;
}

/**
 * Convert HSL to HEX color
 */
export function hslToHex(h: number, s: number, l: number): string {
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
 * Convert OKLCH to RGB
 */
function oklchToRgb(lightness: number, chroma: number, hue: number): { r: number; g: number; b: number } {
  // Convert OKLCH to OK Lab
  const hRad = (hue * Math.PI) / 180;
  const aValue = chroma * Math.cos(hRad);
  const bValue = chroma * Math.sin(hRad);

  // Convert OK Lab to linear RGB using the OKLCH matrix
  const lms1 = lightness + 0.3963377774 * aValue + 0.2158037573 * bValue;
  const lms2 = lightness - 0.1055613458 * aValue - 0.0638541728 * bValue;
  const lms3 = lightness - 0.0894841775 * aValue - 1.2914855480 * bValue;

  const lms1_3 = lms1 * lms1 * lms1;
  const lms2_3 = lms2 * lms2 * lms2;
  const lms3_3 = lms3 * lms3 * lms3;

  const rValue = +4.0767416621 * lms1_3 - 3.3077115913 * lms2_3 + 0.2309699292 * lms3_3;
  const gValue = -1.2684380046 * lms1_3 + 2.6097574011 * lms2_3 - 0.3413193965 * lms3_3;
  const bFinal = -0.0041960863 * lms1_3 - 0.7034186147 * lms2_3 + 1.7076147010 * lms3_3;

  // Clamp and convert to 0-255 range
  return {
    r: Math.max(0, Math.min(255, Math.round(rValue * 255))),
    g: Math.max(0, Math.min(255, Math.round(gValue * 255))),
    b: Math.max(0, Math.min(255, Math.round(bFinal * 255)))
  };
}

/**
 * Try to convert any CSS color to HEX
 */
export function colorToHex(color: string): string {
  try {
    // If already hex, just return it
    if (color.startsWith('#')) {
      return color.toUpperCase();
    }

    // If it's CSS OKLCH format: oklch(l c h) or oklch(l c h / alpha)
    if (color.startsWith('oklch(')) {
      const values = color.slice(6, -1); // Remove "oklch(" and ")"
      const parts = values.split(' / ')[0]; // Remove alpha if present
      const [l, c, h] = parts.split(/\s+/).map(parseFloat);
      const { r, g, b } = oklchToRgb(l, c, h);
      const rHex = r.toString(16).padStart(2, '0');
      const gHex = g.toString(16).padStart(2, '0');
      const bHex = b.toString(16).padStart(2, '0');
      return `#${rHex}${gHex}${bHex}`.toUpperCase();
    }

    // If it's an OKLCH color in the format "l c h" (e.g., "0.65 0.15 180")
    if (/^[\d.]+\s+[\d.]+\s+[\d.]+$/.test(color)) {
      const [l, c, h] = color.split(/\s+/).map(parseFloat);
      const { r, g, b } = oklchToRgb(l, c, h);
      const rHex = r.toString(16).padStart(2, '0');
      const gHex = g.toString(16).padStart(2, '0');
      const bHex = b.toString(16).padStart(2, '0');
      return `#${rHex}${gHex}${bHex}`.toUpperCase();
    }

    // If it's an HSL color in the format "h s% l%"
    if (/^\d+\s+\d+%\s+\d+%$/.test(color)) {
      const [h, s, l] = color.split(/\s+/).map(part =>
        parseFloat(part.replace('%', ''))
      );
      return hslToHex(h, s, l);
    }

    // If it's oklch(), hsl() or rgb(), we need to render it to get the computed color
    if (typeof document !== 'undefined') {
      const temp = document.createElement('div');

      // Try to apply the color directly (for oklch() values)
      if (color.includes('oklch(')) {
        temp.style.color = `oklch(${color})`;
      } else {
        temp.style.color = convertHslToCssColor(color);
      }

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
    }

    // If we couldn't convert, return a fallback color
    return '#000000';
  } catch {
    return '#000000'; // Return black on error
  }
}

/**
 * Convert HEX to HSL
 */
export function hexToHSL(hex: string): { h: number; s: number; l: number } {
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

/**
 * Format a color name for display
 */
export function formatColorName(name: string): string {
  return name.replace(/^--/, '')
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Group colors into categories
 */
export function groupColorsByCategory<T extends ColorVariable>(colors: T[]): Record<string, T[]> {
  const grouped: Record<string, T[]> = {};

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
  colors.forEach(variable => {
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
  const result: Record<string, T[]> = {};
  for (const category of categories) {
    if (grouped[category].length > 0) {
      result[category] = grouped[category];
    }
  }

  return result;
}

/**
 * Get a readable category title from a category key
 */
export function getCategoryTitle(category: string): string {
  if (category === 'other') return 'Other Variables';
  return `${category.charAt(0).toUpperCase() + category.slice(1)} Colors`;
}
