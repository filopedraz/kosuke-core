// Branding and Design System Types

// Theme Mode Types
export type ThemeMode = 'light' | 'dark';

// Font Types
export interface FontInfo {
  name: string;
  provider: string;
  variable: string;
  config: {
    subsets: string[];
    weights?: number[];
    display?: string;
    [key: string]: unknown;
  };
  usage: string;
}

// Color Variable Types
export interface CssVariable {
  name: string;
  lightValue: string;
  darkValue?: string;
  scope: 'root' | 'dark' | 'light' | 'unknown';
  [key: string]: string | undefined;
}

// Color variable type for Agent service communication
export interface ColorVariable {
  name: string;
  lightValue: string;
  darkValue?: string;
  scope: 'root' | 'dark' | 'light' | 'unknown';
  description?: string;
}

// Color palette generation result
export interface ColorPaletteResult {
  success: boolean;
  message?: string;
  colors?: Array<{
    name: string;
    value: string;
    lightValue?: string;
    darkValue?: string;
    description?: string;
  }>;
  projectContent?: string;
}

// Color Categories
export type ColorCategory =
  | 'background'
  | 'foreground'
  | 'primary'
  | 'secondary'
  | 'accent'
  | 'muted'
  | 'card'
  | 'popover'
  | 'border'
  | 'destructive'
  | 'sidebar'
  | 'chart'
  | 'other';

export interface GroupedColors {
  [key: string]: CssVariable[];
}

// Font Types
export interface FontVariable {
  name: string;
  value: string;
  family: string;
  category?: string;
}

export interface GroupedFonts {
  [key: string]: FontInfo[];
}

// Color Palette Generation Types
export interface PaletteGenerationRequest {
  keywords: string;
}

export interface PaletteGenerationResponse {
  success: boolean;
  colors: CssVariable[];
  message?: string;
}

// Color Update Types
export interface ColorUpdateRequest {
  name: string;
  value: string;
  mode: ThemeMode;
}

// Statistics Types
export interface ColorStats {
  lightCount: number;
  darkCount: number;
  foundLocation: string;
}

// Brand Guidelines State Types
export interface BrandGuidelinesState {
  // Color-related state
  colorVariables: CssVariable[];
  isLoadingColors: boolean;
  colorsError: string | null;

  // Font-related state
  fontVariables: FontInfo[];
  isLoadingFonts: boolean;
  fontsError: string | null;

  // Palette generation state
  isGeneratingPalette: boolean;
  isPalettePreviewOpen: boolean;
  generatedPalette: CssVariable[];

  // UI state
  previewMode: ThemeMode;
  activeTab: 'colors' | 'fonts';
  isKeywordsModalOpen: boolean;

  // Statistics
  stats: ColorStats;
}
