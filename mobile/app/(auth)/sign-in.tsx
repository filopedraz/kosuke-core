import { useOAuth } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/contexts/ThemeContext';

WebBrowser.maybeCompleteAuthSession();

export default function SignInScreen() {
  const router = useRouter();
  const { startOAuthFlow } = useOAuth({ strategy: 'oauth_github' });
  const [isLoading, setIsLoading] = useState(false);
  const { colors } = useTheme();

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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Logo Section */}
      <View style={styles.logoSection}>
        <Image
          source={require('@/assets/images/icon.png')}
          style={[styles.logo, { backgroundColor: colors.card }]}
          contentFit="cover"
        />

        <Text style={[styles.welcomeText, { color: colors.foreground }]}>Welcome to</Text>
        <Text style={[styles.appName, { color: colors.foreground }]}>Kosuke</Text>
      </View>

      {/* Button Section */}
      <View style={styles.buttonSection}>
        <Pressable
          onPress={onSignIn}
          disabled={isLoading}
          style={[
            styles.button,
            {
              backgroundColor: colors.primary,
              opacity: isLoading ? 0.8 : 1,
            },
          ]}
        >
          {isLoading ? (
            <ActivityIndicator color={colors['primary-foreground']} />
          ) : (
            <View style={styles.buttonContent}>
              <Ionicons
                name="logo-github"
                size={20}
                color={colors['primary-foreground']}
                style={styles.githubIcon}
              />
              <Text style={[styles.buttonText, { color: colors['primary-foreground'] }]}>
                Continue with GitHub
              </Text>
            </View>
          )}
        </Pressable>

        <Text style={[styles.helpText, { color: colors['muted-foreground'] }]}>
          Sign in or sign up with your GitHub account
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 32,
    paddingTop: 80,
    paddingBottom: 60,
  },
  logoSection: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: 24,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  welcomeText: {
    fontSize: 18,
    fontWeight: '400',
    marginBottom: 8,
    opacity: 0.8,
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    letterSpacing: -0.5,
  },
  buttonSection: {
    width: '100%',
    alignItems: 'center',
  },
  button: {
    height: 56,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    maxWidth: 320,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  githubIcon: {
    marginRight: 12,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  helpText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
});
