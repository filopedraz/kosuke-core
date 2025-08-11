import { View, type ViewProps } from 'react-native';

import { useTheme } from '@/contexts/ThemeContext';

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
};

export function ThemedView({ style, lightColor, darkColor, ...otherProps }: ThemedViewProps) {
  const { colors, isDark } = useTheme();

  // Use provided colors or fall back to theme colors
  const backgroundColor =
    lightColor && darkColor ? (isDark ? darkColor : lightColor) : colors.background;

  return <View style={[{ backgroundColor }, style]} {...otherProps} />;
}
