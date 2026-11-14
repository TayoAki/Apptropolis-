// Record shapes and small helpers shared by the screens. Money is in dollars; dates are ISO strings.
import { Platform } from "react-native";

/** The phone's own wallet: Google Pay on Android, Apple Pay everywhere else. */
export const WALLET = Platform.OS === "android" ? "Google Pay" : "Apple Pay";

export const SHOP_MODES = [
  { key: "style", label: "Style" },
  { key: "glow", label: "Glow" },
  { key: "home", label: "Home" },
  { key: "pantry", label: "Pantry" },
] as const;

export type ShopMode = (typeof SHOP_MODES)[number]["key"];

export const ORDER_STATUSES = [
  "placed",
  "packed",
  "shipped",
  "out_for_delivery",
  "delivered",
  "returned",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** The steps a parcel goes through, in order, for the tracking timeline. */
export const ORDER_TIMELINE: OrderStatus[] = [
  "placed",
  "packed",
  "shipped",
  "out_for_delivery",
  "delivered",
];

export interface Product {
  id: string;
  name: string;
  mode: ShopMode;
  /** Category within the mode, such as "serums", "tops" or "candles". */
  category: string;
  /** Price in dollars. */
  price: number;
  description: string;
  /** Whether the person saved it. */
  isWishlisted: boolean;
  /** How many are in the cart; 0 when none. */
  cartQuantity: number;
}

export interface Order {
  id: string;
  /** Human-readable order number, e.g. "PC-20461". */
  orderNumber: string;
  /** Summary of purchased items, e.g. "Linen Relaxed Shirt x2". */
  items: string;
  /** Order total in dollars, shipping included. */
  total: number;
  shippingAddress: string;
  deliverySpeed: "standard" | "express";
  status: OrderStatus;
  placedAt: string;
  estimatedDelivery: string;
}

export interface AssistantMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  createdAt: string;
}

const DAY = 86_400_000;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** An ISO date `days` from today (negative for the past) at the given local hour. */
export function daysFromNow(days: number, hour = 12): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
}

/** Whole days from today to the date (0 today, 1 tomorrow, -1 yesterday). */
export function dayDiff(iso: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const other = new Date(iso);
  other.setHours(0, 0, 0, 0);
  return Math.round((other.getTime() - today.getTime()) / DAY);
}

/** "$29.99" */
export function formatMoney(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

/** "Mon, Jun 3" */
export function formatDate(iso: string): string {
  const date = new Date(iso);
  return `${WEEKDAYS[date.getDay()]}, ${MONTHS[date.getMonth()]} ${date.getDate()}`;
}

/** "Today", "Tomorrow", "Yesterday", or the full date. */
export function relativeDay(iso: string): string {
  const diff = dayDiff(iso);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  return formatDate(iso);
}

/** "6:05 pm" */
export function formatTime(iso: string): string {
  const date = new Date(iso);
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours % 12 || 12}:${minutes} ${hours < 12 ? "am" : "pm"}`;
}

export function statusLabel(status: OrderStatus): string {
  switch (status) {
    case "placed":
      return "Order placed";
    case "packed":
      return "Packed";
    case "shipped":
      return "Shipped";
    case "out_for_delivery":
      return "Out for delivery";
    case "delivered":
      return "Delivered";
    case "returned":
      return "Returned";
  }
}

/** How far along the timeline an order is (0 to 4). A returned order sits at delivered. */
export function orderProgress(status: OrderStatus): number {
  if (status === "returned") return ORDER_TIMELINE.length - 1;
  return ORDER_TIMELINE.indexOf(status);
}

/** Standard is free from $50; express is a flat $14.95. */
export function shippingCost(speed: Order["deliverySpeed"], subtotal: number): number {
  if (speed === "express") return 14.95;
  return subtotal >= 50 ? 0 : 6.95;
}

export function modeLabel(mode: ShopMode): string {
  return SHOP_MODES.find((m) => m.key === mode)?.label ?? mode;
}

/** The mode every screen shows until one has been chosen. */
export const DEFAULT_SHOP_MODE: ShopMode = SHOP_MODES[0].key;

/**
 * The shop mode a saved answer names, whether it was stored as a key ("glow"), a label ("Glow")
 * or a longer name ("Glow (skincare)"); null when there is none.
 */
export function shopModeFrom(value: string | undefined): ShopMode | null {
  const text = (value ?? "").trim().toLowerCase();
  if (!text) return null;
  return SHOP_MODES.find((m) => text.startsWith(m.key))?.key ?? null;
}

/** "serums" to "Serums", for showing a category as a label. */
export function categoryLabel(category: string): string {
  return category.charAt(0).toUpperCase() + category.slice(1);
}

/** The products currently in the cart. */
export function cartLines(products: Product[]): Product[] {
  return products.filter((p) => p.cartQuantity > 0);
}

/** Total items in the cart, counting quantities. */
export function cartCount(products: Product[]): number {
  return products.reduce((sum, p) => sum + p.cartQuantity, 0);
}

/** Cart subtotal in dollars, before shipping. */
export function cartSubtotal(products: Product[]): number {
  return products.reduce((sum, p) => sum + p.price * p.cartQuantity, 0);
}
