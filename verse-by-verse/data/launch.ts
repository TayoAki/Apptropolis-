// LAUNCH SWITCH: the one place that turns the paywall on or off.
//
// false (launch, App Store review as a pre-order): there is no paywall anywhere.
//   - Everyone has every feature premium would unlock (folders in Saved, every keyword match
//     with highlights in Search): usePurchases().isPremium is true for everyone.
//   - RevenueCat is never configured and nothing simulates a purchase or reads a stored one.
//   - openPaywall() does nothing, onboarding doesn't open the paywall, and the /paywall route,
//     if reached, goes straight back (or home) without showing a price.
//   - No screen mentions buying, Premium, prices, trials, "Restore purchases" or locks.
// true: the paywall works exactly as before (data/purchases.ts, app/paywall.tsx). Connect
//   RevenueCat (data/payments.ts) first, or purchases are simulated and premium is free.
export const PAYWALL_ENABLED = false;
