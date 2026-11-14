// Opening the paywall with a note of where from, so the owner's analytics can tell a paywall met
// after onboarding from one opened at a locked feature.
import { router } from "expo-router";

export type PaywallSource =
  | "onboarding"
  | "train"
  | "scout"
  | "report"
  | "coach"
  | "progress"
  | "settings";

let expected: PaywallSource | null = null;

/** Open the paywall from a locked feature, a banner or Settings. */
export function goPro(from: PaywallSource): void {
  router.push({ pathname: "/paywall", params: { from } });
}

/**
 * The platform opens the paywall itself once onboarding ends, without saying where from.
 * Onboarding calls this just before, so that opening is counted as "onboarding".
 */
export function expectPaywall(from: PaywallSource): void {
  expected = from;
}

/** Where this paywall was opened from: the route's `from`, or what was expected, else "other". */
export function paywallSource(param: string | string[] | undefined): string {
  const named = Array.isArray(param) ? param[0] : param;
  return named || expected || "other";
}

/** The paywall closed: the next one is not assumed to come from the same place. */
export function paywallClosed(): void {
  expected = null;
}
