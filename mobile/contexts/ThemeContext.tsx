import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { ReactNode, createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';

import { ThemeColors, darkTheme, lightTheme } from '@/constants/theme';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  // Current theme colors
  colors: ThemeColors;
  // Current theme mode setting
  mode: ThemeMode;
  // Actual resolved theme (light/dark)
  isDark: boolean;
  // Function to change theme mode
  setThemeMode: (mode: ThemeMode) => void;
  // Loading state
  isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = '@kosuke_theme_mode';

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  console.log('🎯 ThemeProvider initializing...');

  const systemColorScheme = useSystemColorScheme();
  const [mode, setMode] = useState<ThemeMode>('system');
  const [isLoading, setIsLoading] = useState(false); // Start with false for now

  console.log('📱 System color scheme:', systemColorScheme);

  // Resolve the actual theme based on mode and system preference
  const resolveTheme = (themeMode: ThemeMode): boolean => {
    if (themeMode === 'system') {
      return systemColorScheme === 'dark';
    }
    return themeMode === 'dark';
  };

  const isDark = resolveTheme(mode);
  const colors = isDark ? darkTheme : lightTheme;

  console.log('🎨 Resolved theme:', { mode, isDark, isLoading });

  // Load stored theme preference on app start
  useEffect(() => {
    const loadStoredTheme = async () => {
      try {
        const storedMode = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (storedMode && ['light', 'dark', 'system'].includes(storedMode)) {
          setMode(storedMode as ThemeMode);
        }
      } catch (error) {
        console.warn('Failed to load theme preference:', error);
        // Fall back to system theme if storage fails
      } finally {
        setIsLoading(false);
      }
    };

    // Add a timeout to prevent indefinite loading
    const timeout = setTimeout(() => {
      setIsLoading(false);
    }, 1000);

    loadStoredTheme().finally(() => {
      clearTimeout(timeout);
    });

    return () => clearTimeout(timeout);
  }, []);

  // Update theme mode and persist to storage
  const setThemeMode = async (newMode: ThemeMode) => {
    try {
      setMode(newMode);
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newMode);
    } catch (error) {
      console.warn('Failed to save theme preference:', error);
    }
  };

  const contextValue: ThemeContextType = {
    colors,
    mode,
    isDark,
    setThemeMode,
    isLoading,
  };

  console.log('✅ ThemeProvider rendering with context:', contextValue);
  return <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>;
}

/**
 * Hook to access theme context
 */
export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

/**
 * Hook to get a specific color from the current theme
 */
export function useThemeColor(colorName: keyof ThemeColors) {
  const { colors } = useTheme();
  return colors[colorName];
}

/**
 * Hook to get multiple colors at once
 */
export function useThemeColors<T extends keyof ThemeColors>(colorNames: T[]): Pick<ThemeColors, T> {
  const { colors } = useTheme();
  const result = {} as Pick<ThemeColors, T>;

  colorNames.forEach(colorName => {
    result[colorName] = colors[colorName];
  });

  return result;
}
