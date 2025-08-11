import React from 'react';
import { View } from 'react-native';

import { useTheme } from '@/contexts/ThemeContext';

// This component provides a theme-aware background for Android/Web
export default function TabBarBackground() {
  const { colors } = useTheme();

  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: colors.background,
        borderTopWidth: 1,
        borderTopColor: colors.border,
      }}
    />
  );
}

export function useBottomTabOverflow() {
  return 0;
}
