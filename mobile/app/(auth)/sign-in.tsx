import { useOAuth } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

// @ts-expect-error - Image asset import
import appIcon from '@/assets/images/icon.png';

WebBrowser.maybeCompleteAuthSession();

export default function SignInScreen() {
  const router = useRouter();
  const { startOAuthFlow } = useOAuth({ strategy: 'oauth_github' });
  const [isLoading, setIsLoading] = useState(false);

  const onSignIn = useCallback(async () => {
    try {
      setIsLoading(true);
      const { createdSessionId, setActive } = await startOAuthFlow({});
      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
        router.replace('/');
      }
    } catch (err) {
      // TODO: add nicer error toast in a later ticket
      console.error('OAuth error', err);
    } finally {
      setIsLoading(false);
    }
  }, [router, startOAuthFlow]);

  return (
    <View className="flex-1 items-center justify-between px-8 pt-20 pb-15 bg-background">
      {/* Logo Section */}
      <View className="items-center flex-1 justify-center">
        <Image
          source={appIcon}
          className="w-30 h-30 rounded-3xl mb-8 bg-card shadow-lg"
          contentFit="cover"
          alt="Kosuke app logo"
        />

        <Text className="text-lg font-normal mb-2 opacity-80 text-foreground">Welcome to</Text>
        <Text className="text-3xl font-bold tracking-tight text-foreground">Kosuke</Text>
      </View>

      {/* Button Section */}
      <View className="w-full items-center">
        <Pressable
          onPress={onSignIn}
          disabled={isLoading}
          className={`h-14 px-6 rounded-xl items-center justify-center w-full max-w-80 mb-4 bg-primary shadow-sm ${
            isLoading ? 'opacity-80' : ''
          }`}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="hsl(var(--primary-foreground))" />
          ) : (
            <View className="flex-row items-center">
              <Ionicons
                name="logo-github"
                size={20}
                color="hsl(var(--primary-foreground))"
                style={{ marginRight: 12 }}
              />
              <Text className="text-base font-semibold text-primary-foreground">
                Continue with GitHub
              </Text>
            </View>
          )}
        </Pressable>

        <Text className="text-sm text-center leading-5 max-w-70 text-muted-foreground">
          Sign in or sign up with your GitHub account
        </Text>
      </View>
    </View>
  );
}
