import AsyncStorage from '@react-native-async-storage/async-storage';
import { colorScheme, useColorScheme, vars } from 'nativewind';
import { useEffect, useState } from 'react';

type ThemeMode = 'light' | 'dark' | 'system';

const THEME_STORAGE_KEY = '@kosuke_theme_mode';

// Theme CSS variable definitions
const themes = {
  light: vars({
    '--background': '0 0% 100%',
    '--foreground': '330 0% 3.9%',
    '--card': '0 0% 100%',
    '--card-foreground': '330 0% 3.9%',
    '--popover': '0 0% 100%',
    '--popover-foreground': '330 0% 3.9%',
    '--primary': '0 0% 9.1%',
    '--primary-foreground': '180 0% 98%',
    '--secondary': '120 0% 96.1%',
    '--secondary-foreground': '0 0% 9.1%',
    '--muted': '120 0% 96.1%',
    '--muted-foreground': '0 0% 45.2%',
    '--accent': '120 0% 96.1%',
    '--accent-foreground': '0 0% 9.1%',
    '--destructive': '357.2 100% 45.3%',
    '--destructive-foreground': '180 0% 98%',
    '--border': '240 0% 89.8%',
    '--input': '240 0% 89.8%',
    '--ring': '0 0% 63%',
    '--radius': '0.65rem',
  }),
  dark: vars({
    '--background': '330 0% 3.9%',
    '--foreground': '180 0% 98%',
    '--card': '0 0% 9.1%',
    '--card-foreground': '180 0% 98%',
    '--popover': '0 0% 9.1%',
    '--popover-foreground': '180 0% 98%',
    '--primary': '240 0% 89.8%',
    '--primary-foreground': '0 0% 9.1%',
    '--secondary': '0 0% 14.9%',
    '--secondary-foreground': '180 0% 98%',
    '--muted': '0 0% 14.9%',
    '--muted-foreground': '0 0% 63%',
    '--accent': '0 0% 14.9%',
    '--accent-foreground': '180 0% 98%',
    '--destructive': '358.7 100% 69.6%',
    '--destructive-foreground': '180 0% 98%',
    '--border': '0 0% 100% / 0.1',
    '--input': '0 0% 100% / 0.15',
    '--ring': '0 0% 45.2%',
    '--radius': '0.65rem',
  }),
};

export function useTheme() {
  const { colorScheme: currentColorScheme } = useColorScheme();
  const [mode, setMode] = useState<ThemeMode>('system');
  const [isLoading, setIsLoading] = useState(true);

  const isDark = currentColorScheme === 'dark';

  // Get theme-aware colors for components
  const getColors = () => {
    return {
      foreground: isDark ? '#fafafa' : '#0a0a0a', // Direct hex values
      mutedForeground: isDark ? '#a1a1a1' : '#737373',
      secondaryForeground: isDark ? '#fafafa' : '#171717',
      destructiveForeground: isDark ? '#fafafa' : '#fafafa',
      primaryForeground: isDark ? '#171717' : '#fafafa',
      primary: isDark ? '#e5e5e5' : '#171717',
      background: isDark ? '#0a0a0a' : '#ffffff',
      card: isDark ? '#171717' : '#ffffff',
      border: isDark ? '#ffffff1a' : '#e5e5e5',
    };
  };

  // Load stored theme preference on app start
  useEffect(() => {
    const loadStoredTheme = async () => {
      try {
        const storedMode = await AsyncStorage.getItem(THEME_STORAGE_KEY);

        if (storedMode && ['light', 'dark', 'system'].includes(storedMode)) {
          const themeMode = storedMode as ThemeMode;
          setMode(themeMode);
          colorScheme.set(themeMode);
        } else {
          colorScheme.set('system');
        }
      } catch (error) {
        console.warn('Failed to load theme preference:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadStoredTheme();
  }, []);

  // Update theme mode and persist to storage
  const setThemeMode = async (newMode: ThemeMode) => {
    try {
      setMode(newMode);
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newMode);
      colorScheme.set(newMode);
    } catch (error) {
      console.warn('Failed to save theme preference:', error);
    }
  };

  const getThemeDisplayText = () => {
    switch (mode) {
      case 'light':
        return 'Light';
      case 'dark':
        return 'Dark';
      case 'system':
        return 'System';
      default:
        return 'System';
    }
  };

  return {
    mode,
    isDark,
    isLoading,
    setThemeMode,
    getThemeDisplayText,
    themeVars: themes[isDark ? 'dark' : 'light'],
    getColors,
  };
}
