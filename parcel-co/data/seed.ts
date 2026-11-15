// What a fresh install starts with: nothing. Coupons and deals come from the Pip API
// (data/deals.ts); saved items and the Pip conversation are the person's own.
export const seed: Record<string, unknown[]> = {
  saved: [],
  pip_messages: [],
};
