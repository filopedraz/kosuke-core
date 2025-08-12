export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemeColors {
  foreground: string;
  mutedForeground: string;
  secondaryForeground: string;
  destructiveForeground: string;
  primaryForeground: string;
  primary: string;
  background: string;
  card: string;
  border: string;
}

export interface ThemeVars {
  '--background': string;
  '--foreground': string;
  '--card': string;
  '--card-foreground': string;
  '--popover': string;
  '--popover-foreground': string;
  '--primary': string;
  '--primary-foreground': string;
  '--secondary': string;
  '--secondary-foreground': string;
  '--muted': string;
  '--muted-foreground': string;
  '--accent': string;
  '--accent-foreground': string;
  '--destructive': string;
  '--destructive-foreground': string;
  '--border': string;
  '--input': string;
  '--ring': string;
  '--radius': string;
}
