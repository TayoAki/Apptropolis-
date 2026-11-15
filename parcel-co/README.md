# Pip

Built with App Builder: an Expo (React Native) app using Expo Router.

Pip is an AI shopping assistant: ask it before you buy, and it answers from the coupon codes and
deals your scrapers collect into a Railway database. See [`backend/README.md`](backend/README.md)
for the database, the API and how scrapers write to it.

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
