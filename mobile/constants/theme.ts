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

// LIGHT THEME - Correct HSL values matching web
export const lightTheme: ThemeColors = {
  // Core Colors
  background: 'hsl(0, 0%, 100%)',
  foreground: 'hsl(0, 0%, 3.9%)',

  // Surface Colors
  card: 'hsl(0, 0%, 100%)',
  'card-foreground': 'hsl(0, 0%, 3.9%)',
  popover: 'hsl(0, 0%, 100%)',
  'popover-foreground': 'hsl(0, 0%, 3.9%)',

  // Brand Colors
  primary: 'hsl(0, 0%, 9%)',
  'primary-foreground': 'hsl(0, 0%, 98%)',
  secondary: 'hsl(0, 0%, 96.1%)',
  'secondary-foreground': 'hsl(0, 0%, 9%)',

  // Neutral Colors
  muted: 'hsl(0, 0%, 96.1%)',
  'muted-foreground': 'hsl(0, 0%, 45.1%)',
  accent: 'hsl(0, 0%, 96.1%)',
  'accent-foreground': 'hsl(0, 0%, 9%)',

  // State Colors
  destructive: 'hsl(0, 84.2%, 60.2%)',
  'destructive-foreground': 'hsl(0, 0%, 98%)',

  // Interactive Elements
  border: 'hsl(0, 0%, 89.8%)',
  input: 'hsl(0, 0%, 89.8%)',
  ring: 'hsl(0, 0%, 3.9%)',

  // Data Visualization
  'chart-1': 'hsl(12, 76%, 61%)',
  'chart-2': 'hsl(173, 58%, 39%)',
  'chart-3': 'hsl(197, 37%, 24%)',
  'chart-4': 'hsl(43, 74%, 66%)',
  'chart-5': 'hsl(27, 87%, 67%)',

  // Sidebar Component
  sidebar: 'hsl(0, 0%, 98%)',
  'sidebar-foreground': 'hsl(0, 0%, 3.9%)',
  'sidebar-primary': 'hsl(0, 0%, 9%)',
  'sidebar-primary-foreground': 'hsl(0, 0%, 98%)',
  'sidebar-accent': 'hsl(0, 0%, 96.1%)',
  'sidebar-accent-foreground': 'hsl(0, 0%, 9%)',
  'sidebar-border': 'hsl(0, 0%, 89.8%)',
  'sidebar-ring': 'hsl(0, 0%, 3.9%)',
};

// DARK THEME - Correct HSL values matching web
export const darkTheme: ThemeColors = {
  // Core Colors
  background: 'hsl(0, 0%, 3.9%)',
  foreground: 'hsl(0, 0%, 98%)',

  // Surface Colors
  card: 'hsl(0, 0%, 3.9%)',
  'card-foreground': 'hsl(0, 0%, 98%)',
  popover: 'hsl(0, 0%, 3.9%)',
  'popover-foreground': 'hsl(0, 0%, 98%)',

  // Brand Colors
  primary: 'hsl(0, 0%, 98%)',
  'primary-foreground': 'hsl(0, 0%, 9%)',
  secondary: 'hsl(0, 0%, 14.9%)',
  'secondary-foreground': 'hsl(0, 0%, 98%)',

  // Neutral Colors
  muted: 'hsl(0, 0%, 14.9%)',
  'muted-foreground': 'hsl(0, 0%, 63.9%)',
  accent: 'hsl(0, 0%, 14.9%)',
  'accent-foreground': 'hsl(0, 0%, 98%)',

  // State Colors
  destructive: 'hsl(0, 62.8%, 30.6%)',
  'destructive-foreground': 'hsl(0, 0%, 98%)',

  // Interactive Elements
  border: 'hsl(0, 0%, 14.9%)',
  input: 'hsl(0, 0%, 14.9%)',
  ring: 'hsl(0, 0%, 83.1%)',

  // Data Visualization
  'chart-1': 'hsl(220, 70%, 50%)',
  'chart-2': 'hsl(160, 60%, 45%)',
  'chart-3': 'hsl(30, 80%, 55%)',
  'chart-4': 'hsl(280, 65%, 60%)',
  'chart-5': 'hsl(340, 75%, 55%)',

  // Sidebar Component
  sidebar: 'hsl(0, 0%, 3.9%)',
  'sidebar-foreground': 'hsl(0, 0%, 98%)',
  'sidebar-primary': 'hsl(220, 70%, 50%)',
  'sidebar-primary-foreground': 'hsl(0, 0%, 98%)',
  'sidebar-accent': 'hsl(0, 0%, 14.9%)',
  'sidebar-accent-foreground': 'hsl(0, 0%, 98%)',
  'sidebar-border': 'hsl(0, 0%, 14.9%)',
  'sidebar-ring': 'hsl(0, 0%, 83.1%)',
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
