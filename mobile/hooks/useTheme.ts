import AsyncStorage from '@react-native-async-storage/async-storage';
import { colorScheme, useColorScheme, vars } from 'nativewind';
import { useEffect, useState } from 'react';

type ThemeMode = 'light' | 'dark' | 'system';

const THEME_STORAGE_KEY = '@kosuke_theme_mode';

// Theme CSS variable definitions
const themes = {
  light: vars({
    '--background': '0 0% 100%',
    '--foreground': '0 0% 3.9%',
    '--card': '0 0% 100%',
    '--card-foreground': '0 0% 3.9%',
    '--popover': '0 0% 100%',
    '--popover-foreground': '0 0% 3.9%',
    '--primary': '0 0% 9%',
    '--primary-foreground': '0 0% 98%',
    '--secondary': '0 0% 96.1%',
    '--secondary-foreground': '0 0% 9%',
    '--muted': '0 0% 96.1%',
    '--muted-foreground': '0 0% 45.1%',
    '--accent': '0 0% 96.1%',
    '--accent-foreground': '0 0% 9%',
    '--destructive': '0 84.2% 60.2%',
    '--destructive-foreground': '0 0% 98%',
    '--border': '0 0% 89.8%',
    '--input': '0 0% 89.8%',
    '--ring': '0 0% 3.9%',
  }),
  dark: vars({
    '--background': '0 0% 3.9%',
    '--foreground': '0 0% 98%',
    '--card': '0 0% 3.9%',
    '--card-foreground': '0 0% 98%',
    '--popover': '0 0% 3.9%',
    '--popover-foreground': '0 0% 98%',
    '--primary': '0 0% 98%',
    '--primary-foreground': '0 0% 9%',
    '--secondary': '0 0% 14.9%',
    '--secondary-foreground': '0 0% 98%',
    '--muted': '0 0% 14.9%',
    '--muted-foreground': '0 0% 63.9%',
    '--accent': '0 0% 14.9%',
    '--accent-foreground': '0 0% 98%',
    '--destructive': '0 62.8% 30.6%',
    '--destructive-foreground': '0 0% 98%',
    '--border': '0 0% 14.9%',
    '--input': '0 0% 14.9%',
    '--ring': '0 0% 83.1%',
  }),
};

export function useTheme() {
  const { colorScheme: currentColorScheme } = useColorScheme();
  const [mode, setMode] = useState<ThemeMode>('system');
  const [isLoading, setIsLoading] = useState(true);

  const isDark = currentColorScheme === 'dark';

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
        return `System (${isDark ? 'Dark' : 'Light'})`;
      default:
        return 'System';
    }
  };

  const cycleTheme = () => {
    // Simple cycling: system -> light -> dark -> system
    const nextMode = mode === 'system' ? 'light' : mode === 'light' ? 'dark' : 'system';
    setThemeMode(nextMode);
  };

  return {
    mode,
    isDark,
    isLoading,
    setThemeMode,
    getThemeDisplayText,
    cycleTheme,
    themeVars: themes[isDark ? 'dark' : 'light'],
  };
}
