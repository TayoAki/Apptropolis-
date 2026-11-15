# Store screenshot tools

Shared by every app's `store/screenshots/` folder. They make App Store screenshots from the real
app: capture the web build at an iPhone's size, compose a captioned image with a phone frame,
check it, and package it for upload.

| File | Does |
|---|---|
| `capture-lib.cjs` | `serve()` a web build, `phone()` a Chromium context at the app area of a 6.9" iPhone (440 × 868 pt at 3x, Inter fonts, optional preset localStorage and clock), `shoot()` a capture |
| `compose.cjs <spec.json>` | Background, two-line headline (one `*accent*` word), line under it, the capture in our own plain phone frame with a drawn status bar and home indicator in the app's colors, an optional Premium pill and zoomed callout. Writes `6.9/` (1320 × 2868) and `6.5/` (1284 × 2778), RGB with no alpha |
| `check_shots.py <dir> --slot 6.9\|6.5` | Exact size, no alpha, at most 10 |
| `package_upload.py <dir> <zip>` | One zip, a folder per size, files in upload order |

The phone frame is our own (a dark rim, no Dynamic Island or buttons): Apple's bezels are only
licensed for apps that run only on Apple platforms, and these apps also build for Android.

See `parcel-co/store/screenshots/` for a worked example (capture script, spec, README).
