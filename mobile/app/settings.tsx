'use client';

import { useAuth, useUser } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { MenuView } from '@react-native-menu/menu';
import { useRouter } from 'expo-router';
import React from 'react';
import { Image, SafeAreaView, ScrollView, Text, TouchableOpacity, View } from 'react-native';

import { NavigationHeader } from '@/components/NavigationHeader';
import { useTheme } from '@/hooks/use-theme';

export default function SettingsScreen() {
  const router = useRouter();
  const { isDark, getThemeDisplayText, setThemeMode, getColors } = useTheme();
  const { user, isLoaded } = useUser();
  const { signOut } = useAuth();
  const colors = getColors();

  if (!isLoaded || !user) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 justify-center items-center">
          <Text className="text-foreground">Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <NavigationHeader title="Settings" />

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 20 }}>
        {/* User Profile Section */}
        <View className="bg-card rounded-xl p-6 mb-4 border border-border">
          <Text className="text-lg font-semibold text-card-foreground mb-6">Profile</Text>

          <View className="flex-row items-center">
            {user.imageUrl ? (
              <Image
                source={{ uri: user.imageUrl }}
                className="w-16 h-16 rounded-full mr-4"
                alt="User profile picture"
              />
            ) : (
              <View className="w-16 h-16 rounded-full bg-primary items-center justify-center mr-4 border border-border">
                <Text className="text-xl font-bold text-primary-foreground">
                  {user.firstName?.[0] ||
                    user.emailAddresses[0]?.emailAddress[0]?.toUpperCase() ||
                    'U'}
                </Text>
              </View>
            )}

            <View className="flex-1">
              <Text className="text-lg font-semibold text-card-foreground mb-1">
                {user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User'}
              </Text>
              <Text className="text-sm text-muted-foreground">
                {user.primaryEmailAddress?.emailAddress || 'No email'}
              </Text>
            </View>
          </View>
        </View>

        {/* Appearance Section */}
        <View className="bg-card rounded-xl p-6 mb-4 border border-border">
          <Text className="text-lg font-semibold text-card-foreground mb-6">Appearance</Text>

          <MenuView
            title="Theme"
            actions={[
              {
                id: 'light',
                title: 'Light',
                image: 'sun.max',
              },
              {
                id: 'dark',
                title: 'Dark',
                image: 'moon',
              },
              {
                id: 'system',
                title: 'System',
                image: 'gear',
              },
            ]}
            onPressAction={({ nativeEvent }) => {
              setThemeMode(nativeEvent.event as 'light' | 'dark' | 'system');
            }}
            shouldOpenOnLongPress={false}
          >
            <TouchableOpacity
              className="flex-row items-center justify-between py-4 px-0"
              activeOpacity={0.7}
            >
              <View className="flex-row items-center">
                <View className="w-10 h-10 rounded-full bg-primary/10 items-center justify-center mr-4">
                  <Ionicons name={isDark ? 'moon' : 'sunny'} size={20} color={colors.primary} />
                </View>
                <Text className="text-base font-semibold text-card-foreground">Theme</Text>
              </View>
              <View className="flex-row items-center">
                <Text className="text-base text-muted-foreground mr-2">
                  {getThemeDisplayText()}
                </Text>
                <Ionicons name="chevron-expand-sharp" size={18} color={colors.mutedForeground} />
              </View>
            </TouchableOpacity>
          </MenuView>
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity
          onPress={() => {
            router.back();
            signOut();
          }}
          className="bg-destructive rounded-xl p-4 mt-4 border border-border flex-row items-center justify-center"
        >
          <Ionicons
            name="log-out-outline"
            size={20}
            color={colors.destructiveForeground}
            style={{ marginRight: 8 }}
          />
          <Text className="text-base font-semibold text-destructive-foreground">Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
