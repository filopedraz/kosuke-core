import { ClerkProvider } from '@clerk/clerk-expo';
import { Theme, ThemeProvider } from '@react-navigation/native';
import Constants from 'expo-constants';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { Text, View } from 'react-native';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ThemeProvider as KosukeThemeProvider, useTheme } from '@/contexts/ThemeContext';

import '../global.css';

// Prevent the splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

const tokenCache = {
  getToken: async (key: string) => {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  saveToken: async (key: string, value: string) => {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch {
      // noop
    }
  },
};

function AppContent() {
  console.log('🎨 AppContent rendering...');

  // Always call hooks at the top level
  const { isDark, isLoading } = useTheme();
  console.log('🎭 Theme data:', { isDark, isLoading });

  // Hide splash screen when theme is loaded
  useEffect(() => {
    if (!isLoading) {
      console.log('🚀 Theme loaded, hiding splash screen');
      SplashScreen.hideAsync();
    }
  }, [isLoading]);

  // Show loading screen while theme is being loaded
  if (isLoading) {
    console.log('⏳ Theme is loading, showing loading screen');
    return (
      <View className="flex-1 justify-center items-center bg-background">
        <Text className="text-base text-foreground">Loading theme...</Text>
      </View>
    );
  }

  console.log('🧭 About to render navigation...');

  // Create custom navigation theme with CSS variables
  const navigationTheme: Theme = {
    dark: isDark,
    colors: {
      primary: 'hsl(var(--primary))',
      background: 'hsl(var(--background))',
      card: 'hsl(var(--card))',
      text: 'hsl(var(--foreground))',
      border: 'hsl(var(--border))',
      notification: 'hsl(var(--destructive))',
    },
    fonts: {
      regular: {
        fontFamily: 'System',
        fontWeight: '400',
      },
      medium: {
        fontFamily: 'System',
        fontWeight: '500',
      },
      bold: {
        fontFamily: 'System',
        fontWeight: '700',
      },
      heavy: {
        fontFamily: 'System',
        fontWeight: '900',
      },
    },
  };

  return (
    <ThemeProvider value={navigationTheme}>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="projects/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="projects/[id]/sessions/[sessionId]" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  console.log('🚀 RootLayout starting...');
  useFonts({
    SpaceMono: '../assets/fonts/SpaceMono-Regular.ttf',
  });

  const publishableKey = Constants.expoConfig?.extra?.CLERK_PUBLISHABLE_KEY as string | undefined;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <KosukeThemeProvider>
          <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
            <AppContent />
          </ClerkProvider>
        </KosukeThemeProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
