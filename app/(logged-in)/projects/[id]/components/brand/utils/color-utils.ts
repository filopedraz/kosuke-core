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

// Define a generic type for color variables
export interface ColorVariable {
  name: string;
  lightValue: string;
  darkValue?: string;
  scope?: 'root' | 'dark' | 'light' | 'unknown';
  [key: string]: string | undefined;
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