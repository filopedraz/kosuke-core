export interface ThemeColors {
  // Core Colors
  background: string;
  foreground: string;

  // Surface Colors
  card: string;
  'card-foreground': string;
  popover: string;
  'popover-foreground': string;

  // Brand Colors
  primary: string;
  'primary-foreground': string;
  secondary: string;
  'secondary-foreground': string;

  // Neutral Colors
  muted: string;
  'muted-foreground': string;
  accent: string;
  'accent-foreground': string;

  // State Colors
  destructive: string;
  'destructive-foreground': string;

  // Interactive Elements
  border: string;
  input: string;
  ring: string;

  // Data Visualization
  'chart-1': string;
  'chart-2': string;
  'chart-3': string;
  'chart-4': string;
  'chart-5': string;

  // Sidebar Component
  sidebar: string;
  'sidebar-foreground': string;
  'sidebar-primary': string;
  'sidebar-primary-foreground': string;
  'sidebar-accent': string;
  'sidebar-accent-foreground': string;
  'sidebar-border': string;
  'sidebar-ring': string;
}

// LIGHT THEME - Converted from web OKLCH values to HSL
export const lightTheme: ThemeColors = {
  // Core Colors (oklch(1 0 0) -> white, oklch(0.145 0 0) -> near black)
  background: 'hsl(0, 0%, 100%)',
  foreground: 'hsl(0, 0%, 15%)',

  // Surface Colors
  card: 'hsl(0, 0%, 100%)',
  'card-foreground': 'hsl(0, 0%, 15%)',
  popover: 'hsl(0, 0%, 100%)',
  'popover-foreground': 'hsl(0, 0%, 15%)',

  // Brand Colors
  primary: 'hsl(0, 0%, 20%)',
  'primary-foreground': 'hsl(0, 0%, 98%)',
  secondary: 'hsl(0, 0%, 97%)',
  'secondary-foreground': 'hsl(0, 0%, 20%)',

  // Neutral Colors
  muted: 'hsl(0, 0%, 97%)',
  'muted-foreground': 'hsl(0, 0%, 56%)',
  accent: 'hsl(0, 0%, 97%)',
  'accent-foreground': 'hsl(0, 0%, 20%)',

  // State Colors (oklch(0.577 0.245 27.325) -> red-ish)
  destructive: 'hsl(0, 72%, 51%)',
  'destructive-foreground': 'hsl(0, 0%, 98%)',

  // Interactive Elements
  border: 'hsl(0, 0%, 92%)',
  input: 'hsl(0, 0%, 92%)',
  ring: 'hsl(0, 0%, 71%)',

  // Data Visualization (converted from OKLCH)
  'chart-1': 'hsl(25, 95%, 53%)',
  'chart-2': 'hsl(185, 84%, 60%)',
  'chart-3': 'hsl(225, 70%, 40%)',
  'chart-4': 'hsl(85, 85%, 83%)',
  'chart-5': 'hsl(70, 90%, 77%)',

  // Sidebar Component
  sidebar: 'hsl(0, 0%, 98%)',
  'sidebar-foreground': 'hsl(0, 0%, 15%)',
  'sidebar-primary': 'hsl(0, 0%, 20%)',
  'sidebar-primary-foreground': 'hsl(0, 0%, 98%)',
  'sidebar-accent': 'hsl(0, 0%, 97%)',
  'sidebar-accent-foreground': 'hsl(0, 0%, 20%)',
  'sidebar-border': 'hsl(0, 0%, 92%)',
  'sidebar-ring': 'hsl(0, 0%, 71%)',
};

// DARK THEME - Converted from web OKLCH values to HSL
export const darkTheme: ThemeColors = {
  // Core Colors
  background: 'hsl(0, 0%, 15%)',
  foreground: 'hsl(0, 0%, 98%)',

  // Surface Colors
  card: 'hsl(0, 0%, 20%)',
  'card-foreground': 'hsl(0, 0%, 98%)',
  popover: 'hsl(0, 0%, 20%)',
  'popover-foreground': 'hsl(0, 0%, 98%)',

  // Brand Colors
  primary: 'hsl(0, 0%, 92%)',
  'primary-foreground': 'hsl(0, 0%, 20%)',
  secondary: 'hsl(0, 0%, 27%)',
  'secondary-foreground': 'hsl(0, 0%, 98%)',

  // Neutral Colors
  muted: 'hsl(0, 0%, 27%)',
  'muted-foreground': 'hsl(0, 0%, 71%)',
  accent: 'hsl(0, 0%, 27%)',
  'accent-foreground': 'hsl(0, 0%, 98%)',

  // State Colors
  destructive: 'hsl(0, 68%, 70%)',
  'destructive-foreground': 'hsl(0, 0%, 98%)',

  // Interactive Elements
  border: 'hsl(0, 0%, 100%, 0.1)',
  input: 'hsl(0, 0%, 100%, 0.15)',
  ring: 'hsl(0, 0%, 56%)',

  // Data Visualization (dark theme variants)
  'chart-1': 'hsl(265, 89%, 49%)',
  'chart-2': 'hsl(162, 73%, 70%)',
  'chart-3': 'hsl(70, 90%, 77%)',
  'chart-4': 'hsl(304, 78%, 63%)',
  'chart-5': 'hsl(16, 88%, 65%)',

  // Sidebar Component
  sidebar: 'hsl(0, 0%, 20%)',
  'sidebar-foreground': 'hsl(0, 0%, 98%)',
  'sidebar-primary': 'hsl(265, 89%, 49%)',
  'sidebar-primary-foreground': 'hsl(0, 0%, 98%)',
  'sidebar-accent': 'hsl(0, 0%, 27%)',
  'sidebar-accent-foreground': 'hsl(0, 0%, 98%)',
  'sidebar-border': 'hsl(0, 0%, 100%, 0.1)',
  'sidebar-ring': 'hsl(0, 0%, 56%)',
};

// Border radius system (matching web)
export const borderRadius = {
  lg: 10, // 0.65rem * 16 ≈ 10px
  md: 8, // lg - 2px
  sm: 6, // lg - 4px
};

// Typography scale (matching web Geist fonts with system fallbacks)
export const typography = {
  fontFamily: {
    sans: 'System',
    mono: 'Menlo', // iOS system mono font
  },
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
  },
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
};

// Spacing scale (matching web)
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,
};
