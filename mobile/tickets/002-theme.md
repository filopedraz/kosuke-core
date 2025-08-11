# 002 — Theming and Design Tokens (NativeWind + Brand Parity)

## Scope

Mirror web brand tokens into React Native using NativeWind (Tailwind for RN). Replace existing hardcoded Colors.ts system with semantic design tokens that match web `app/globals.css`. Implement comprehensive light/dark support with OKLCH color values.

## User Story

As a user, the mobile app visually matches the web brand (colors, typography scale, spacing rhythm) in both light and dark mode, providing a consistent experience across platforms.

## Tech Decisions

- **Styling**: `nativewind` (Tailwind CSS for React Native)
- **Color System**: Replace `Colors.ts` with semantic tokens from web
- **Theme Module**: `mobile/constants/theme.ts` that mirrors web CSS variables exactly
- **Color Values**: Use OKLCH values from web design system
- **Icons**: `lucide-react-native` (consistent with web `lucide-react`)
- **Color Scheme**: Enhance existing `useColorScheme` to work with new token system
- **Typography**: Mirror web font system (Geist Sans/Mono)

## Acceptance Criteria

- [ ] Replace hardcoded `Colors.ts` with semantic design tokens
- [ ] Central theme module exports all web tokens (primary, secondary, muted, accent, background, card, border, destructive, etc.)
- [ ] Components use `className` with NativeWind; eliminate all hardcoded colors
- [ ] Light/dark mode uses same OKLCH values as web
- [ ] Typography scale matches web (font-sans, font-mono)
- [ ] Spacing and border radius system consistent with web
- [ ] Chart colors available for data visualization
- [ ] Sidebar tokens available for navigation components

## Implementation Checklist

- [ ] **Dependencies**: Add `nativewind`, `react-native-svg`, `lucide-react-native`
- [ ] **Configuration**: Set up `tailwind.config.js` for RN (content: `mobile/**/*.{tsx,ts}`)
- [ ] **Theme Tokens**: Create `mobile/constants/theme.ts` with exact OKLCH values from web
- [ ] **Migration**: Update existing `useThemeColor` to use new semantic tokens
- [ ] **Components**: Migrate existing components from hardcoded colors to NativeWind classes
- [ ] **Typography**: Configure Geist fonts to match web
- [ ] **Testing**: Verify light/dark mode in iOS Simulator and Android Emulator
- [ ] **Validation**: Compare mobile and web apps side-by-side for color accuracy

## Breaking Changes

- `Colors.ts` will be deprecated and replaced
- `useThemeColor` hook will be updated to use semantic tokens
- Existing color references need migration to className-based styling

## Notes

- **No new colors**: Use only existing web brand tokens
- **OKLCH Compliance**: Maintain exact color science from web design system
- **Performance**: NativeWind provides compile-time optimizations
- **Accessibility**: Ensure color contrast ratios match web standards
