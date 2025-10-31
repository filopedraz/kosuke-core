// Branding and Design System Types

// Theme Mode Types
export type ThemeMode = 'light' | 'dark';

// Font Types
export interface FontInfo {
  name: string;
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
