import { ClerkProvider } from '@clerk/clerk-expo';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Constants from 'expo-constants';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { View } from 'react-native';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useTheme } from '@/hooks/use-theme';

import * as Sentry from '@sentry/react-native';
import '../global.css';

Sentry.init({
  dsn: Constants.expoConfig?.extra?.SENTRY_DSN as string | undefined,
  debug: __DEV__,
  tracesSampleRate: 1.0,
  attachStacktrace: true,
});

// Prevent the splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

// Create a client instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutes
      retry: 1,
    },
  },
});

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
  const { isDark, themeVars } = useTheme();

  return (
    <View style={themeVars} className="flex-1">
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ headerShown: false }} />
        <Stack.Screen name="notifications" options={{ headerShown: false }} />
        <Stack.Screen name="projects/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="projects/[id]/sessions/[sessionId]" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </View>
  );
}

export default Sentry.wrap(function RootLayout() {
  const [fontsLoaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  const publishableKey = Constants.expoConfig?.extra?.CLERK_PUBLISHABLE_KEY as string | undefined;

  // Simple Expo-recommended approach: hide splash when fonts are loaded
  useEffect(() => {
    async function prepare() {
      try {
        // Keep splash visible while loading resources
        await SplashScreen.preventAutoHideAsync();

        // Wait for fonts to load
        if (fontsLoaded) {
          // Add small delay for smooth transition
          await new Promise(resolve => setTimeout(resolve, 500));
          // Hide splash screen
          await SplashScreen.hideAsync();
        }
      } catch (e) {
        console.warn('Error with splash screen:', e);
      }
    }

    prepare();
  }, [fontsLoaded]);

  // Show nothing until fonts are loaded
  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
            <AppContent />
          </ClerkProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
});
