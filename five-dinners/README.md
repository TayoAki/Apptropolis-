# Five Dinners

Built with App Builder: an Expo (React Native) app using Expo Router.

## Run it

```bash
npm install
```

```bash
npx expo start
```

Scan the QR code with Expo Go on your phone (same Wi-Fi), or press `w` for the web.

## Build for the stores

```bash
npx eas-cli build --platform android --profile preview
```

`preview` makes an installable APK; `production` makes an AAB (Android) or IPA (iOS, needs an
Apple Developer account).

## Project layout

- `app/` screens (file-based routes; `app/(tabs)` are the tabs)
- `components/` shared UI
- `theme/` five theme packs (`theme/tokens.ts`) and the theme provider
- `data/` data types, seed data and the storage layer (`useCollection`)
- `assets/recipes/` one picture per recipe (`r1.jpg` … `r25.jpg`, wired in by `data/recipe-images.ts`)

## Recipe pictures

The recipe pictures are AI-generated illustrations, not photos: made with Google's Gemini 3.1
Flash Image model via OpenRouter on Nov 15, 2026, one per recipe, with the prompts in
`scripts/gen-recipe-images.py`. The app labels them "Illustration" on the recipe page and says so
in Settings.
