# Pre-order launch: Five Dinners and Verse by Verse

Status on Nov 15, 2026, branch `claude/dazzling-hypatia-ccf0t9`. Per-app App Store Connect copy,
review notes and privacy answers are in `five-dinners/store/APP_STORE.md` and
`verse-by-verse/store/APP_STORE.md`.

## What's done
| | Five Dinners | Verse by Verse |
|---|---|---|
| Paywall hidden, every feature free (`data/launch.ts`, `PAYWALL_ENABLED = false`) | ✅ | ✅ |
| Core loop tested end to end in the web build, fresh install, no console errors | ✅ 8/8 steps, including planning week 2 | ✅ 10/10 steps |
| No purchase UI, padlocks or prices anywhere in the app | ✅ | ✅ |
| Unused camera, photo and location modules and permission strings removed | ✅ | ✅ |
| Notifications asked only when the user turns a reminder on | ✅ | ✅ |
| App icon (1024 px, no transparency) | ✅ new | ✅ new |
| Bundle ID | `com.appbuilder.fivedinners5hpa` (new, same pattern as your other apps) | `com.appbuilder.versebyverseqsz4` |
| Export compliance flag set | ✅ | ✅ |
| Expo project | [@tayom/five-dinners](https://expo.dev/accounts/tayom/projects/five-dinners) | [@tayom/verse-by-verse](https://expo.dev/accounts/tayom/projects/verse-by-verse) |
| Native iOS build compiles on EAS (simulator build) | ✅ finished | see the build page |
| App Store screenshots retaken from the free build (6.9" and 6.5") | ✅ 8 | ✅ 7 |
| Listing copy, keywords, review notes, privacy label answers | ✅ `store/APP_STORE.md` | ✅ `store/APP_STORE.md` |

## Blockers you need to clear
1. **Apple signing (both apps).** The App Store build stopped at "Credentials are not set up":
   Expo needs your Apple Developer account once to create the distribution certificate and
   provisioning profile, and it won't do that unattended. Run this once per app on any computer
   with Node, from the app's folder on this branch, and sign in to Apple when asked:
   ```bash
   npm install
   ```
   ```bash
   npx eas-cli build -p ios --profile production
   ```
   After that, builds and submits can run from here without you.
2. **Privacy policy URL.**
   - **Five Dinners:** its link points at `localhost`. Host `five-dinners/store/privacy-policy.md`
     at an https URL and put it in `five-dinners/data/app-info.ts`.
   - **Verse:** the hosted policy is live but still lists camera, photos and location. Regenerate it
     in App Builder, or host `verse-by-verse/store/privacy-policy.md`.
   - This is Guideline 5.1.1(i).
3. **Support URL (both).** App Store Connect needs an https support page (Guideline 1.5). If you
   give me an email, I'll add it to both apps so Settings shows a Help row.

## Then, in App Store Connect
1. My Apps → + → New App, with the bundle ID, name and SKU from each `APP_STORE.md`.
2. Upload the build: `npx eas-cli submit -p ios --latest` from the app's folder. Or let me do it
   once the credentials exist.
3. Fill in the listing from `APP_STORE.md`:
   - Upload the screenshots from `store/screenshots/6.9` and `6.5`.
   - Set the price to Free.
   - Set availability: Five Dinners in the US only.
   - Fill in App Privacy and the age rating.
   - Paste the review notes.
4. Pricing and Availability → Pre-Orders: on, with a release date up to 180 days out.
5. Submit for review. The pre-order page goes live only after the build is approved.

## Will they pass?
No one can promise an App Review result, but the usual reasons for rejection are now covered:
- broken or simulated purchases (3.1.1);
- placeholder icon or content (2.1, 2.3);
- unused permission prompts (5.1.1);
- misleading claims (2.3.1);
- screenshots that don't match the app (2.3.3).

What's left is the three blockers above, plus three judgement calls.

**What wasn't tested:**
- No real iPhone. Install a TestFlight build and run the loop once before submitting: a crash on
  launch is the most common rejection.
- Reminders actually firing on a phone.

**Five Dinners:**
- **Prices:** they come from one store's price list for one ZIP code (Chicago, Nov 15). The app and
  description say your store may differ.
- **Aldi:** the name appears in the app as the price source, with a not-affiliated line.
- **Pictures:** the food pictures are labelled as illustrations.
- If Apple pushes back on the prices or the Aldi name, it would be under 2.3.1 or 5.2.1.

**Verse by Verse:**
- Bible readers are a crowded category (4.3). The review notes lead with what's specific to it.
- The study-notes disclosure no longer says "no generative AI writes, edits or translates them".
  Neither of us could verify that. Restore it only if a person really wrote every note.

## Turning the paywall back on later
1. Set `PAYWALL_ENABLED = true` in each app's `data/launch.ts`.
2. Add the RevenueCat iOS key in `data/payments.ts`.
3. Create the in-app purchases in App Store Connect.
4. Ship it as a new version.

Never ship `true` without the RevenueCat key: the purchases would be simulated and free.

## Security
The Expo access token was pasted in chat. Revoke it at expo.dev (Account settings → Access tokens)
and make a new one.
