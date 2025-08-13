import { ClerkProvider } from '@clerk/clerk-expo';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Constants from 'expo-constants';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useTheme } from '@/hooks/use-theme';

import '../global.css';
import '../sentry';

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

  const onLayoutRootView = useCallback(async () => {
    // Hide splash after first layout to avoid a white flash
    await SplashScreen.hideAsync();
  }, []);

  return (
    <View style={themeVars} className="flex-1" onLayout={onLayoutRootView}>
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

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  const publishableKey = Constants.expoConfig?.extra?.CLERK_PUBLISHABLE_KEY as string | undefined;
  const splashMinDurationMs = (Constants.expoConfig?.extra as any)?.SPLASH_MIN_DURATION_MS ?? 0;

  // Track when we started to show the splash to enforce a minimum duration
  const splashStartRef = useRef<number>(Date.now());
  const [minDelayDone, setMinDelayDone] = useState<number>(
    Number(splashMinDurationMs) <= 0 ? 1 : 0
  );

  useEffect(() => {
    const elapsed = Date.now() - splashStartRef.current;
    const remaining = Math.max(0, Number(splashMinDurationMs) - elapsed);
    if (remaining <= 0) {
      setMinDelayDone(1);
      return;
    }
    const id = setTimeout(() => setMinDelayDone(1), remaining);
    return () => clearTimeout(id);
  }, [splashMinDurationMs]);

  // Until fonts are loaded and min duration has elapsed, keep returning null so the splash stays visible
  if (!fontsLoaded || !minDelayDone) {
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
}
