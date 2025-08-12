'use client';

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import { Skeleton } from '@/components/ui/Skeleton';
import { useTheme } from '@/hooks/useTheme';

interface NavigationHeaderProps {
  title: string;
  onBackPress?: () => void;
  rightComponent?: React.ReactNode;
}

export function NavigationHeader({ title, onBackPress, rightComponent }: NavigationHeaderProps) {
  const router = useRouter();
  const { getColors } = useTheme();
  const colors = getColors();

  const handleBackPress = () => {
    if (onBackPress) {
      onBackPress();
    } else {
      router.back();
    }
  };

  return (
    <View className="flex-row items-center px-5 py-4" style={{ height: 64 }}>
      <TouchableOpacity onPress={handleBackPress} className="mr-4">
        <Ionicons name="arrow-back" size={24} color={colors.foreground} />
      </TouchableOpacity>

      <View className="flex-1 items-center">
        <Text className="text-lg font-semibold text-foreground" numberOfLines={1}>
          {title}
        </Text>
      </View>

      {/* Right component or placeholder */}
      <View className="w-6">{rightComponent}</View>
    </View>
  );
}

export function NavigationHeaderSkeleton({ onBackPress }: { onBackPress?: () => void }) {
  const router = useRouter();
  const { getColors } = useTheme();
  const colors = getColors();

  const handleBackPress = () => {
    if (onBackPress) {
      onBackPress();
    } else {
      router.back();
    }
  };

  return (
    <View className="flex-row items-center px-5 py-4" style={{ height: 64 }}>
      <TouchableOpacity onPress={handleBackPress} className="mr-4">
        <Ionicons name="arrow-back" size={24} color={colors.foreground} />
      </TouchableOpacity>

      <View className="flex-1 items-center">
        <Skeleton width="60%" height={22} />
      </View>

      {/* Right placeholder */}
      <View className="w-6" />
    </View>
  );
}
