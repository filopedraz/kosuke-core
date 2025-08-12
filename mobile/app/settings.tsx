'use client';

import { useAuth, useUser } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Image, SafeAreaView, ScrollView, Text, TouchableOpacity, View } from 'react-native';

import { NavigationHeader } from '@/components/NavigationHeader';
import { useTheme } from '@/hooks/useTheme';

export default function SettingsScreen() {
  const router = useRouter();
  const { isDark, getThemeDisplayText, cycleTheme, getColors } = useTheme();
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
        <View className="bg-card rounded-xl p-4 mb-6 border border-border">
          <Text className="text-lg font-semibold text-card-foreground mb-4">Profile</Text>

          <View className="flex-row items-center mb-4">
            {user.imageUrl ? (
              <Image
                source={{ uri: user.imageUrl }}
                className="w-15 h-15 rounded-full mr-4 border border-border"
                alt="User profile picture"
              />
            ) : (
              <View className="w-15 h-15 rounded-full bg-primary items-center justify-center mr-4 border border-border">
                <Text className="text-2xl font-bold text-primary-foreground">
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
        <View className="bg-card rounded-xl p-4 mb-6 border border-border">
          <Text className="text-lg font-semibold text-card-foreground mb-4">Appearance</Text>

          <TouchableOpacity
            onPress={cycleTheme}
            className="flex-row items-center justify-between py-3 px-4 bg-secondary rounded-lg border border-border"
          >
            <View className="flex-row items-center">
              <Ionicons
                name={isDark ? 'moon' : 'sunny'}
                size={20}
                color={colors.secondaryForeground}
                style={{ marginRight: 12 }}
              />
              <View>
                <Text className="text-base font-medium text-secondary-foreground">Theme</Text>
                <Text className="text-sm text-muted-foreground mt-0.5">
                  {getThemeDisplayText()}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity
          onPress={() => {
            router.back();
            signOut();
          }}
          className="bg-destructive rounded-xl p-4 mt-6 border border-border flex-row items-center justify-center"
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
