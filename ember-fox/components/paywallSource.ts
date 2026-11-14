// Where the paywall was opened from, for the owner's analytics (paywall_shown / paywall_closed).
// The platform opens the paywall itself right after onboarding, so the source can't travel as a
// route parameter: it is noted here just before the paywall opens and read once when it appears.
import { router } from "expo-router";

export type PaywallSource =
  | "onboarding"
  | "settings"
  | "week_insights"
  | "career_gear"
  | "career_level"
  | "direct";

let pending: PaywallSource | null = null;

/** Say where the next paywall comes from (used before the platform opens it after onboarding). */
export function notePaywallSource(source: PaywallSource): void {
  pending = source;
}

/** Open the paywall from a place in the app. */
export function showPaywall(source: PaywallSource): void {
  pending = source;
  router.push("/paywall");
}

/** Read the source for the paywall that just appeared; "direct" when nothing noted one. */
export function takePaywallSource(): PaywallSource {
  const source = pending ?? "direct";
  pending = null;
  return source;
}
