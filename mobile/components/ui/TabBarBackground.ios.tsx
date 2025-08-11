import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { StyleSheet } from 'react-native';

import { useTheme } from '@/contexts/ThemeContext';

export default function BlurTabBarBackground() {
  const { isDark } = useTheme();

  return (
    <BlurView
      // Use theme-aware tint that updates with our custom theme changes
      tint={isDark ? 'systemMaterialDark' : 'systemMaterialLight'}
      intensity={100}
      style={StyleSheet.absoluteFill}
    />
  );
}

export function useBottomTabOverflow() {
  return useBottomTabBarHeight();
}
