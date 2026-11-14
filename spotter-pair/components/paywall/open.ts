// Opens the paywall and says where from, so the owner's analytics can tell a paywall met after
// setup from one opened on purpose at a locked feature. (The template's openPaywall() carries
// no source; a paywall opened without one is the one shown right after setup.)
import { router } from "expo-router";

export type PaywallSource =
  | "plan_regenerate"
  | "custom_stake"
  | "score_history"
  | "settings"
  | "settings_training";

export function openPaywallFrom(from: PaywallSource): void {
  router.push({ pathname: "/paywall", params: { from } });
}
