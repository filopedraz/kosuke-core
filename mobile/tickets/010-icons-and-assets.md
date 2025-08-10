# 010 — Icons and Splash Assets

## Scope

Set up app icon, adaptive icon (Android), and splash assets using existing images. Document generation steps and wire them in `app.json`.

## Asset Guidelines

- App icon: 1024×1024 PNG, transparent background recommended
- Adaptive icon (Android): separate foreground (1024×1024) and background color
- Splash image: large portrait PNG (e.g., 1242×2436 or larger), use `resizeMode: contain`

## Generation Options

- Use existing brand source (SVG/PNG) → export 1024×1024
- Online generator: `https://appicon.co` (outputs iOS + Android sets)
- Figma plugins: “App Icon Generator”

## Expo Configuration

- `app.json` examples:
  - `expo.icon`: `./assets/images/icon.png`
  - `expo.splash.image`: `./assets/images/splash-icon.png`
  - `expo.android.adaptiveIcon.foregroundImage`: `./assets/images/adaptive-icon.png`
  - `expo.android.adaptiveIcon.backgroundColor`: brand background color

## Acceptance Criteria

- Icons display correctly on iOS and Android
- Splash screen shows with proper aspect ratio
- No pixelation on modern devices

## Implementation Checklist

- [ ] Prepare `icon.png` (1024×1024)
- [ ] Prepare `adaptive-icon.png` and set background color
- [ ] Prepare `splash-icon.png` large portrait
- [ ] Update `mobile/app.json` entries
- [ ] Test on iOS Simulator and Android Emulator
