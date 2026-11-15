// The timing map, in seconds. Every beat, press, transition and camera move reads from here.
export const T = {
  // B1 the week (frame 0 is the poster): five dinners, priced against the budget.
  drift: [0, 1.6] as const,
  camLow1: [1.5, 2.3] as const, // down past the five dinners to the tab bar
  touchShopIn: 1.8,
  touchShopAt: 2.5,
  pressShop: 2.7,
  toShop: [2.8, 3.0] as const,
  camShop: [2.95, 3.75] as const,
  line2: [3.1, 3.5] as const, // "One list."
  // B2 shop: tick two packs off the list in the store.
  touchTickIn: 4.2,
  touchOnionsAt: 4.9,
  pressOnions: 5.1,
  tickOnions: [5.15, 5.45] as const,
  touchSpinachAt: 5.9,
  pressSpinach: 6.1,
  tickSpinach: [6.15, 6.45] as const,
  // B3 cook: mark Monday cooked and see what's left of each pack.
  camLow2: [7.2, 7.9] as const,
  touchCookIn: 7.5,
  touchCookAt: 8.1,
  pressCook: 8.3,
  toCook: [8.4, 8.6] as const,
  camCook: [8.55, 9.35] as const,
  touchMarkIn: 9.2,
  touchMarkAt: 9.9,
  pressMark: 10.1,
  cooked: [10.15, 10.65] as const,
  bars: [10.6, 11.4] as const,
  camPush: [10.7, 11.9] as const,
  // B4 next week, planned around the leftovers (a staged time jump; Unlimited weekly plans).
  toWeek2: [12.9, 13.5] as const,
  line3: [13.1, 13.5] as const, // "Leftovers first."
  pill: [13.6, 13.9] as const,
  drift2: [13.5, 17.1] as const,
  // B5 close.
  out: [17.1, 17.7] as const,
  lockup: [17.8, 18.5] as const,
  end: 21.0,
};
