// Record shapes and small helpers shared by the screens. Coupons, deals and stores come from the
// Pip API (data/deals.ts); what the person saves and says to Pip is theirs (useCollection).
// Money is in the row's currency; dates are ISO strings.

export interface Store {
  slug: string;
  name: string;
  domain: string | null;
  logoUrl: string | null;
  category: string | null;
  /** Free text as the scraper found it, e.g. "Up to 6% cash back". */
  cashback: string | null;
  affiliateUrl: string | null;
  updatedAt: string;
  couponCount: number;
  dealCount: number;
}

export type DiscountType = "percent" | "amount" | "free_shipping" | "bogo" | "gift" | "other";

export interface Coupon {
  key: string;
  storeSlug: string;
  storeName: string;
  storeDomain: string | null;
  storeLogoUrl: string | null;
  /** null when the offer needs no code. */
  code: string | null;
  title: string;
  details: string | null;
  discountType: DiscountType | null;
  discountValue: number | null;
  minSpend: number | null;
  /** Where "Shop" goes: the offer's page, the store's link, or its home page. */
  url: string | null;
  source: string;
  sourceUrl: string | null;
  expiresAt: string | null;
  /** Set only when the owner's scraper confirmed the code works. */
  verifiedAt: string | null;
  lastSeenAt: string;
}

export interface Deal {
  key: string;
  storeSlug: string | null;
  storeName: string | null;
  title: string;
  brand: string | null;
  category: string | null;
  price: number;
  wasPrice: number | null;
  currency: string;
  imageUrl: string | null;
  url: string;
  source: string;
  rating: number | null;
  reviewCount: number | null;
  tags: string[];
  expiresAt: string | null;
  lastSeenAt: string;
}

/** A coupon or deal the person saved, as it was when they saved it (it may expire later). */
export interface SavedItem {
  id: string;
  kind: "coupon" | "deal";
  /** The coupon's or deal's key in the API. */
  key: string;
  coupon?: Coupon;
  deal?: Deal;
  savedAt: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  createdAt: string;
  /** Keys of the coupons and deals Pip's answer points to, shown as cards under it. */
  couponKeys?: string[];
  dealKeys?: string[];
  /** The coupons and deals themselves, kept so the answer still shows them later. */
  coupons?: Coupon[];
  deals?: Deal[];
  photo?: boolean;
}

/** Shopping interests offered at setup. Stores are sorted by these on Home and in Stores. */
export const INTERESTS = [
  { key: "fashion", label: "Fashion", icon: "shirt-outline" },
  { key: "beauty", label: "Beauty", icon: "color-palette-outline" },
  { key: "home", label: "Home", icon: "home-outline" },
  { key: "electronics", label: "Electronics", icon: "headset-outline" },
  { key: "toys", label: "Kids & toys", icon: "happy-outline" },
  { key: "groceries", label: "Groceries", icon: "basket-outline" },
  { key: "travel", label: "Travel", icon: "airplane-outline" },
  { key: "sports", label: "Sports & outdoors", icon: "bicycle-outline" },
] as const;

export type InterestKey = (typeof INTERESTS)[number]["key"];

const DAY = 86_400_000;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Comma-separated answer to a list ("nike,target" -> ["nike", "target"]). */
export function listFrom(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

/** "$29.99" in the row's currency (USD, GBP and EUR get their symbol; others their code). */
export function formatMoney(amount: number, currency = "USD"): string {
  const symbol = currency === "USD" ? "$" : currency === "GBP" ? "£" : currency === "EUR" ? "€" : "";
  const value = amount.toFixed(2);
  return symbol ? `${symbol}${value}` : `${value} ${currency}`;
}

/** Whole days from today to the date (0 today, 1 tomorrow, -1 yesterday). */
export function dayDiff(iso: string, now = new Date()): number {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const other = new Date(iso);
  other.setHours(0, 0, 0, 0);
  return Math.round((other.getTime() - today.getTime()) / DAY);
}

/** "Nov 18" */
export function shortDate(iso: string): string {
  const date = new Date(iso);
  return `${MONTHS[date.getMonth()]} ${date.getDate()}`;
}

/** "Seen today", "Seen yesterday", "Seen 3 days ago", "Seen Oct 2". */
export function seenLabel(iso: string): string {
  const diff = -dayDiff(iso);
  if (diff <= 0) return "Seen today";
  if (diff === 1) return "Seen yesterday";
  if (diff < 14) return `Seen ${diff} days ago`;
  return `Seen ${shortDate(iso)}`;
}

/** "Ends today", "Ends tomorrow", "Ends in 4 days", "Ends Dec 2"; null when there is no date. */
export function endsLabel(iso: string | null): string | null {
  if (!iso) return null;
  const diff = dayDiff(iso);
  if (diff <= 0) return "Ends today";
  if (diff === 1) return "Ends tomorrow";
  if (diff < 8) return `Ends in ${diff} days`;
  return `Ends ${shortDate(iso)}`;
}

/** The headline number for a coupon tile: "20% off", "$15 off", "Free shipping". */
export function discountLabel(coupon: Coupon): string {
  const value = coupon.discountValue;
  switch (coupon.discountType) {
    case "percent":
      return value ? `${trim(value)}% off` : "Percent off";
    case "amount":
      return value ? `${formatMoney(value).replace(/\.00$/, "")} off` : "Money off";
    case "free_shipping":
      return "Free shipping";
    case "bogo":
      return "Buy one, get one";
    case "gift":
      return "Free gift";
    default:
      return "Offer";
  }
}

function trim(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

/** "$15 off orders of $75+" style condition line, or null. */
export function minSpendLabel(coupon: Coupon): string | null {
  return coupon.minSpend ? `On orders of ${formatMoney(coupon.minSpend).replace(/\.00$/, "")}+` : null;
}

/** Percent saved on a deal against its was-price, rounded; null when there isn't one. */
export function dealSaving(deal: Deal): number | null {
  if (!deal.wasPrice || deal.wasPrice <= deal.price) return null;
  return Math.round(((deal.wasPrice - deal.price) / deal.wasPrice) * 100);
}

/** True when the date is today, for counting today's Pip questions. */
export function isToday(iso: string, now = new Date()): boolean {
  return dayDiff(iso, now) === 0;
}

/** "6:05 pm" */
export function formatTime(iso: string): string {
  const date = new Date(iso);
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours % 12 || 12}:${minutes} ${hours < 12 ? "am" : "pm"}`;
}

/** "Today", "Yesterday", or "Nov 18". */
export function relativeDay(iso: string): string {
  const diff = dayDiff(iso);
  if (diff === 0) return "Today";
  if (diff === -1) return "Yesterday";
  return shortDate(iso);
}

/** How many questions a day Pip answers without Plus. */
export const FREE_QUESTIONS_PER_DAY = 3;
