# Verse by Verse: App Store Connect submission (pre-order, v1.0.0)

Everything to paste into App Store Connect, and what App Review will look at. The build has the
paywall switched off (`data/launch.ts`, `PAYWALL_ENABLED = false`): folders and full keyword search
are free and the app has no in-app purchases in this version.

## App record
| Field | Value |
|---|---|
| Name | Verse by Verse |
| Bundle ID | `com.appbuilder.versebyverseqsz4` (already in `app.json`) |
| SKU | `verse-by-verse-ios` (any unique string) |
| Primary language | English (U.S.) |
| Primary category | Reference |
| Secondary category | Books |
| Price | Free |
| Availability | All territories (English) |
| Pre-order | Pricing and Availability → Pre-Orders → on, with a release date up to 180 days out. The build still has to pass App Review before the pre-order page goes live. |

## Listing copy
**Subtitle** (28/30): Daily Bible reading, offline

**Promotional text** (156/170):
The whole World English Bible on your phone. One quiet reminder a day opens the Bible right where you stopped. Save, share as a card, and search every word.

**Description:**
```
Verse by Verse is a calm place to read the Bible every day.

PICK UP WHERE YOU STOPPED
One quiet reminder, at the time you choose, opens the Bible right where you left off. Read on with Next, or go back with Previous.

THE WHOLE BIBLE, OFFLINE
All 66 books of the World English Bible are on your phone, so it works without a connection. Browse any book and chapter.

SAVE AND SHARE
Save the verses that stay with you and keep them in folders, like Comfort or Promises. Share any verse as a clean card.

SEARCH EVERY WORD
Find a passage by reference, or search every word across the whole Bible with the matches highlighted.

MADE FOR READING
Adjustable text size and line spacing, and light and dark themes. Study notes are commentary, labelled as commentary, and never presented as Scripture.

No account, no ads, no feed. What you save stays on your phone.

Scripture: World English Bible (public domain). "World English Bible" is a trademark of eBible.org.
```

**Keywords** (90/100): `bible,verse,daily,scripture,devotional,psalms,reading,christian,gospel,word,offline,prayer`

Never use "one verse at a time" or competitors' names (Guideline 2.3.7).

| Field | Value |
|---|---|
| Support URL | **Needed**: an https page with a way to contact you |
| Marketing URL | optional |
| Privacy Policy URL | `https://build.hireshelby.com/apps/p_0m2g4fumpyqsz4/privacy` is live, **but out of date**: it still lists photos, camera and location, which this build no longer uses. Regenerate it in App Builder, or host `store/privacy-policy.md` and update `data/app-info.ts` `privacyUrl` to match. |
| Copyright | 2026 your name or company |

## Screenshots
`store/screenshots/6.9/` (1320 × 2868) and `store/screenshots/6.5/` (1284 × 2778), in upload order.
Retaken from the free build: no paywall, Patron or Premium labels.

## Age rating
Answer the content questions for the Bible text honestly. Most general Bible readers rate 4+, but it
is your call.

## App Privacy (nutrition label)
The app sends **error reports** to App Builder's server (`build.hireshelby.com`, set in
`data/errors-config.ts`). Each report carries the error, the screen and the phone model, with a random
install ID. Declare:
- **Diagnostics → Crash Data**: not linked to the user, not used for tracking, purpose App Functionality.
- **Identifiers → Device ID** (the random install ID): not linked, not tracking, App Functionality.

Nothing else is collected: no account, no analytics (its config is empty), no ads, no location,
camera or photos. To answer "Data Not Collected" instead, empty `data/errors-config.ts`.

## App Review information
- Sign-in required: **No**
- Contact: your name, phone and email
- Notes for the reviewer:
```
No account or sign-in is needed. Everything the user saves stays on the device.

To test the main flow:
1. Setup: pick a starting passage and a reminder time, then finish (or Skip).
2. Read tab: the verse opens where the user left off; Next and Previous move through the passage. Close and reopen the app and it resumes at the same place.
3. Save a verse with the bookmark, and share it as a card with the share button.
4. Search tab: find a passage by reference, or search keywords across the whole Bible.
5. Saved tab: saved verses, with folders.

The daily reminder is a local notification. Permission is asked only when the user taps to turn the reminder on during setup or in Settings.

All features are free in this version; there are no in-app purchases. The Bible text is the World English Bible, which is in the public domain.
```

## Export compliance
`ios.config.usesNonExemptEncryption: false` is set, so App Store Connect won't ask on each build.

## Guideline 4.3 (crowded category)
Bible readers are a crowded category. The review notes lead with what's specific to this app: a
reminder that resumes your exact place, verse cards and whole-Bible keyword search.

## Still to do before submitting
1. Update the privacy policy so it matches this build (Guideline 5.1.1(i)).
2. A Support URL (Guideline 1.5). Optionally fill `supportEmail` in `data/app-info.ts` so Settings shows a Help row.
3. Apple signing credentials on Expo for the store build (see the root `LAUNCH.md`).
