// Define theme modes
export type ThemeMode = 'light' | 'dark';

// Color variable types to match API response
export interface CssVariable {
  name: string;
  lightValue: string;
  darkValue?: string;
  scope: 'root' | 'dark' | 'light' | 'unknown';
  [key: string]: string | undefined;
}

// Font information type
export interface FontVariable {
  name: string;
  value: string;
  family: string;
  category?: string;
} 