/**
 * KOSUKE MOBILE - THEME COLOR HOOK
 *
 * Updated to use semantic design tokens from ThemeContext.
 * Maintains backward compatibility for existing components.
 */

import { ThemeColors } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';

/**
 * Hook to get a semantic color from the current theme
 * @param colorName - Semantic token name (e.g., 'primary', 'background', 'muted-foreground')
 */
export function useThemeColor(colorName: keyof ThemeColors): string {
  const { colors } = useTheme();
  return colors[colorName];
}

/**
 * Legacy hook for backward compatibility with old color system
 * @deprecated Use useTheme() or useThemeColor() with semantic tokens instead
 */
export function useLegacyThemeColor(
  props: { light?: string; dark?: string },
  fallbackColor: string = '#000000'
) {
  const { isDark } = useTheme();
  const theme = isDark ? 'dark' : 'light';
  const colorFromProps = props[theme];

  if (colorFromProps) {
    return colorFromProps;
  } else {
    return fallbackColor;
  }
}
