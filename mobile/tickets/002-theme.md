# 002 — Theming and Design Tokens (NativeWind + Brand Parity)

## Scope

Mirror web brand tokens into React Native using NativeWind (Tailwind for RN). Implement light/dark support and ensure consistent color usage with the web `app/globals.css` tokens.

## User Story

As a user, the mobile app visually matches the web brand (colors, typography scale, spacing rhythm) in both light and dark mode.

## Tech Decisions

- Tailwind for RN: `nativewind`
- Token mapping file: `mobile/constants/theme.ts` that mirrors web CSS variables
- Icons: `lucide-react-native`
- Use `useColorScheme` (already present) to switch tokens

## Acceptance Criteria

- A central theme module exports semantic tokens (primary, muted, background, card, border, etc.)
- Components use `className` with NativeWind; no hardcoded colors
- Light/dark mode works with existing `useColorScheme` hooks
- Typography scale and spacing consistent with web scale guidelines

## Implementation Checklist

- [ ] Add deps: `nativewind react-native-svg lucide-react-native`
- [ ] Configure `tailwind.config.js` for RN (content includes `mobile/**/*.{tsx,ts}`)
- [ ] Create `mobile/constants/theme.ts` mapping web tokens to RN
- [ ] Add sample components using tokens (buttons, text, cards)
- [ ] Verify dark mode in Simulator/Emulator

## Notes

- Do not add new colors. Use brand tokens only.
