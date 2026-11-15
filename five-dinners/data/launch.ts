// THE LAUNCH SWITCH: does this build sell anything?
//
// false — the App Store launch (pre-order) build. The paywall is hidden and the app is free:
//   - usePurchases().isPremium is true for everyone, so every premium feature works: planning
//     every week after the first, the full recipe library, "Keep for next week", price history;
//   - RevenueCat is never configured, and nothing simulates or stores a purchase;
//   - openPaywall() does nothing, finishing onboarding doesn't open the paywall, and the
//     /paywall route goes straight back without showing prices;
//   - no screen mentions buying, Premium, "Unlimited", prices, trials, restoring purchases or
//     the free week (Settings' "Your plan" section is hidden).
// true — the behaviour from before this switch, exactly: the free first week, the paywall
//   (RevenueCat with keys in data/payments.ts, simulated purchases without), and every upsell.
//
// Read in data/purchases.ts, data/app-state.ts, app/paywall.tsx, app/settings.tsx and
// app/(tabs)/index.tsx.
export const PAYWALL_ENABLED = false;
