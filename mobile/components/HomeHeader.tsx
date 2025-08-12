'use client';

import { useUser } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Image, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { useTheme } from '@/hooks/useTheme';

interface HomeHeaderProps {
  searchText: string;
  onSearchChange: (text: string) => void;
  searchPlaceholder?: string;
}

export function HomeHeader({
  searchText,
  onSearchChange,
  searchPlaceholder = 'Search projects...',
}: HomeHeaderProps) {
  const router = useRouter();
  const { user } = useUser();
  const { getColors } = useTheme();
  const colors = getColors();

  return (
    <View className="flex-row items-center px-5 py-4 gap-3" style={{ height: 64 }}>
      {/* Notification Icon */}
      <TouchableOpacity onPress={() => router.push('/notifications')}>
        <Ionicons name="notifications-outline" size={24} color={colors.foreground} />
      </TouchableOpacity>

      {/* Search Bar */}
      <View
        className="flex-1 flex-row items-center bg-muted rounded-xl mx-4 px-4 border border-border"
        style={{ height: 38 }}
      >
        <Ionicons name="search" size={20} color={colors.mutedForeground} />
        <TextInput
          className="flex-1 ml-2 text-foreground"
          style={{ fontSize: 16, lineHeight: 20 }}
          placeholder={searchPlaceholder}
          placeholderTextColor={colors.mutedForeground}
          value={searchText}
          onChangeText={onSearchChange}
        />
      </View>

      {/* User Avatar */}
      <TouchableOpacity onPress={() => router.push('/settings')}>
        {user?.imageUrl ? (
          <Image
            source={{ uri: user.imageUrl }}
            className="w-10 h-10 rounded-full"
            alt="User avatar"
          />
        ) : (
          <View className="w-10 h-10 rounded-full bg-primary items-center justify-center">
            <Text className="text-base font-bold text-primary-foreground">
              {user?.firstName?.[0] ||
                user?.emailAddresses[0]?.emailAddress[0]?.toUpperCase() ||
                'U'}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}
