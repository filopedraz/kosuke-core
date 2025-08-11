import { useOAuth } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Image, Pressable, Text, View } from 'react-native';

import { useTheme } from '@/hooks/useTheme';

// @ts-expect-error - PNG import
import iconImage from '../../assets/images/icon.png';

WebBrowser.maybeCompleteAuthSession();

export default function SignInScreen() {
  const router = useRouter();
  const { startOAuthFlow } = useOAuth({ strategy: 'oauth_github' });
  const [isLoading, setIsLoading] = useState(false);
  const { getColors } = useTheme();
  const colors = getColors();

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
    <View className="flex-1 items-center px-8 pt-20 pb-10 bg-background">
      {/* Logo Section */}
      <View className="items-center flex-1 justify-center">
        <View
          style={{
            width: 120,
            height: 120,
            borderRadius: 24,
            marginBottom: 32,
            // iOS shadows
            shadowColor: '#ffffff',
            shadowOffset: {
              width: 0,
              height: 2,
            },
            shadowOpacity: 0.1,
            shadowRadius: 2,
            // Android shadow
            elevation: 8,
          }}
        >
          <Image
            source={iconImage}
            style={{
              width: 120,
              height: 120,
              borderRadius: 24,
            }}
            resizeMode="cover"
            alt="Kosuke app logo"
          />
        </View>

        <Text className="text-lg font-normal mb-2 opacity-80 text-foreground">Welcome to</Text>
        <Text className="text-3xl font-bold tracking-tight text-foreground">Kosuke</Text>
      </View>

      {/* Button Section - moved higher */}
      <View className="w-full items-center mb-20">
        <Pressable
          onPress={onSignIn}
          disabled={isLoading}
          className={`h-14 px-6 rounded-xl items-center justify-center w-full max-w-80 mb-4 bg-primary shadow-sm ${
            isLoading ? 'opacity-80' : ''
          }`}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={colors.primaryForeground} />
          ) : (
            <View className="flex-row items-center">
              <Ionicons
                name="logo-github"
                size={20}
                color={colors.primaryForeground}
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
