// Where the paywall was opened from, for the owner's analytics (data/analytics). The paywall is
// a route, so the place that opens it leaves its name here and the paywall screen picks it up.
import { openPaywall } from "../../data/purchases";

export type PaywallSource =
  | "onboarding"
  | "saved_new_folder"
  | "saved_folder_filter"
  | "saved_move_to_folder"
  | "saved_patron_key"
  | "search_all_matches"
  | "search_promo"
  | "settings"
  | "direct";

let pending: PaywallSource | null = null;

/** Name the place that is about to open the paywall (onboarding does, before it finishes). */
export function notePaywallSource(source: PaywallSource): void {
  pending = source;
}

/** Open the paywall from a named place in the app. */
export function openPaywallFrom(source: PaywallSource): void {
  pending = source;
  openPaywall();
}

/** The place the paywall on screen was opened from; "direct" when nothing named itself. */
export function takePaywallSource(): PaywallSource {
  const source = pending ?? "direct";
  pending = null;
  return source;
}
