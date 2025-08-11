import { ClerkProvider } from '@clerk/clerk-expo';
import { Theme, ThemeProvider } from '@react-navigation/native';
import Constants from 'expo-constants';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { Text, View } from 'react-native';
import 'react-native-reanimated';

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ThemeProvider as KosukeThemeProvider, useTheme } from '@/contexts/ThemeContext';

// Import global CSS for NativeWind - TEMPORARILY DISABLED
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
  const { isDark, isLoading, colors } = useTheme();
  console.log('🎭 Theme data:', { isDark, isLoading, colorsExist: !!colors });

  // Show loading screen while theme is being loaded
  if (isLoading) {
    console.log('⏳ Theme is loading, showing loading screen');
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#ffffff',
        }}
      >
        <Text style={{ fontSize: 16, color: '#000000' }}>Loading theme...</Text>
      </View>
    );
  }

  console.log('🧭 About to render navigation...');

  // Create custom navigation theme based on our colors
  const navigationTheme: Theme = {
    dark: isDark,
    colors: {
      primary: colors.primary,
      background: colors.background,
      card: colors.card,
      text: colors.foreground,
      border: colors.border,
      notification: colors.destructive,
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
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  console.log('🚀 RootLayout starting...');

  // Load fonts but don't block the app if they fail
  const [loaded] = useFonts({
    SpaceMono: '../assets/fonts/SpaceMono-Regular.ttf',
  });

  console.log('📝 Fonts loaded:', loaded);

  const publishableKey = Constants.expoConfig?.extra?.CLERK_PUBLISHABLE_KEY as string | undefined;
  console.log('🔑 Clerk publishable key exists:', !!publishableKey);

  console.log('🎯 About to render providers...');

  return (
    <ErrorBoundary>
      <KosukeThemeProvider>
        <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
          <AppContent />
        </ClerkProvider>
      </KosukeThemeProvider>
    </ErrorBoundary>
  );
}
