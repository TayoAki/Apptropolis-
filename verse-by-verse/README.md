# Verse by Verse

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
- `data/` data types, seed data (the study notes) and the storage layer (`useCollection`)
- `data/bible/` the Bible text, one JSON file per book (generated; see below), read through
  `data/bible.ts`
- `scripts/build-bible.mjs` regenerates `data/bible/`

## Bible text

The app holds the whole World English Bible (WEB): all 66 books, 1,189 chapters, 31,103 verse
numbers (five of them, such as Acts 8:37, have no text in this edition; their footnotes say why).

- **Source:** World English Bible, eBible.org edition `ENGWEBP`
  (https://ebible.org/Scriptures/details.php?id=engwebp), downloaded from the Free Use Bible API:
  https://bible.helloao.org/api/ENGWEBP/complete.json
- **License:** public domain. eBible.org: "The World English Bible is in the Public Domain. That
  means that it is not copyrighted. However, 'World English Bible' is a Trademark of eBible.org."
  It asks only that a changed text not be called the World English Bible. The build keeps every
  word of every verse; it leaves out footnote markers and section headings (such as the Psalm 119
  letters), and keeps Psalm titles apart from the verses (the chapter view shows them).
- **This edition writes the divine name as "the LORD".** The 50 verses the app shipped before
  used "Yahweh" (the WEB Classic text). To ship WEB Classic instead, rebuild with
  `--translation eng_web`.

Rebuild (downloads about 6.6 MB, writes `data/bible/`):

```bash
node scripts/build-bible.mjs
```

Each book loads the first time it is opened (`import()` per book in `data/bible/files.ts`): on a
phone the books are in the app bundle and evaluated on first use; the web build fetches each book
as its own file instead of putting the whole Bible in the first download.
