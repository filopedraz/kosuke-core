import AsyncStorage from '@react-native-async-storage/async-storage';
import { colorScheme, useColorScheme } from 'nativewind';
import React, { ReactNode, createContext, useContext, useEffect, useState } from 'react';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
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

  const { colorScheme: currentColorScheme } = useColorScheme();
  const [mode, setMode] = useState<ThemeMode>('system');
  const [isLoading, setIsLoading] = useState(true);

  console.log('📱 NativeWind color scheme:', currentColorScheme);

  // Determine if dark mode should be active
  const isDark = currentColorScheme === 'dark';

  console.log('🎨 Resolved theme:', { mode, currentColorScheme, isDark, isLoading });

  // Load stored theme preference on app start
  useEffect(() => {
    const loadStoredTheme = async () => {
      try {
        console.log('📚 Loading saved theme mode...');
        const storedMode = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (storedMode && ['light', 'dark', 'system'].includes(storedMode)) {
          console.log('✅ Found saved theme mode:', storedMode);
          setMode(storedMode as ThemeMode);

          // Apply the saved theme mode to NativeWind
          if (storedMode !== 'system') {
            colorScheme.set(storedMode as 'light' | 'dark');
          }
        } else {
          console.log('🔧 No saved theme, using system default');
        }
      } catch (error) {
        console.warn('❌ Failed to load theme preference:', error);
        // Fall back to system theme if storage fails
      } finally {
        setIsLoading(false);
        console.log('✅ Theme loading complete');
      }
    };

    loadStoredTheme();
  }, []);

  // Update theme mode and persist to storage
  const setThemeMode = async (newMode: ThemeMode) => {
    console.log('🎨 Setting theme mode to:', newMode);
    try {
      setMode(newMode);
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newMode);

      // Update NativeWind's color scheme
      if (newMode === 'system') {
        colorScheme.set('system');
      } else {
        colorScheme.set(newMode);
      }

      console.log('✅ Theme mode saved successfully');
    } catch (error) {
      console.warn('❌ Failed to save theme preference:', error);
    }
  };

  const contextValue: ThemeContextType = {
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
