// Asking Pip: look up the codes and deals that match the question in the Pip API, then let the AI
// answer from that list and nothing else. Used by the Pip tab and by the last step of setup.
import { askAI } from "./ai";
import { deals as dealsApi, type SearchResult } from "./deals";
import type { Photo } from "./photos";
import {
  dealSaving,
  discountLabel,
  endsLabel,
  formatMoney,
  minSpendLabel,
  seenLabel,
  type ChatMessage,
  type Coupon,
  type Deal,
} from "./schema";

export type PipTone = "friendly" | "brief";

export interface PipAnswer {
  text: string;
  coupons: Coupon[];
  deals: Deal[];
}

function couponLine(c: Coupon): string {
  return [
    c.key,
    c.storeName,
    c.code ? `code ${c.code}` : "no code needed",
    discountLabel(c),
    c.title,
    minSpendLabel(c),
    endsLabel(c.expiresAt),
    c.verifiedAt ? `tested working ${seenLabel(c.verifiedAt).replace("Seen ", "")}` : "untested",
    seenLabel(c.lastSeenAt).toLowerCase(),
  ]
    .filter(Boolean)
    .join(" | ");
}

function dealLine(d: Deal): string {
  const saving = dealSaving(d);
  return [
    d.key,
    d.title,
    d.brand,
    d.storeName,
    formatMoney(d.price, d.currency),
    d.wasPrice ? `was ${formatMoney(d.wasPrice, d.currency)}` : null,
    saving ? `${saving}% less` : null,
    d.rating ? `rated ${d.rating}/5${d.reviewCount ? ` from ${d.reviewCount} reviews` : ""}` : null,
    d.tags.length ? `tags: ${d.tags.join(", ")}` : null,
  ]
    .filter(Boolean)
    .join(" | ");
}

function instructions(tone: PipTone): string {
  return [
    "You are Pip, the friendly assistant in a coupon and deals app.",
    "The only codes and deals you know are the ones listed in the data you are given. They were collected from public coupon and retailer sites and can stop working.",
    "Never invent a code, price, discount, store, product or date. Never say a code is verified, guaranteed or sure to work. You may say a code was tested working only when its line says so, and say when.",
    "If nothing in the data fits, say so plainly. Suggest following a store in the Stores tab only when it is listed under 'Stores in Pip's list that match' and is not in 'Stores they follow'. Otherwise don't mention following at all.",
    "You may give general shopping advice (what to look for, sizes, when sales usually happen) as long as it doesn't state a specific price or code that isn't in the data.",
    tone === "brief"
      ? "Answer in at most two short sentences."
      : "Be warm and plain, in at most three short sentences.",
    "When a code fits, say the code and the store in your reply.",
    'Reply with JSON only, in this shape: {"reply": "your answer", "couponKeys": ["up to 3 coupon keys that answer the question"], "dealKeys": ["up to 3 deal keys"]}. Use only keys from the data, and empty arrays when nothing fits.',
  ].join(" ");
}

function parse(raw: string, found: SearchResult): PipAnswer {
  const cleaned = raw.replace(/```(?:json)?/gi, "").trim();
  try {
    const value = JSON.parse(cleaned) as { reply?: unknown; couponKeys?: unknown; dealKeys?: unknown };
    if (typeof value.reply === "string" && value.reply.trim()) {
      const couponKeys = Array.isArray(value.couponKeys) ? value.couponKeys : [];
      const dealKeys = Array.isArray(value.dealKeys) ? value.dealKeys : [];
      return {
        text: value.reply.trim(),
        // Only rows that were really in the search result, in Pip's order, at most three.
        coupons: couponKeys
          .map((k) => found.coupons.find((c) => c.key === k))
          .filter((c): c is Coupon => Boolean(c))
          .slice(0, 3),
        deals: dealKeys
          .map((k) => found.deals.find((d) => d.key === k))
          .filter((d): d is Deal => Boolean(d))
          .slice(0, 3),
      };
    }
  } catch {
    // A plain-text answer: show it without cards.
  }
  return { text: cleaned, coupons: [], deals: [] };
}

/** What Pip says when a photo shows no product it can name. */
const NO_PRODUCT = "I couldn't make out a product in that photo. Try a closer shot of the item or its label.";

export async function askPip({
  question,
  history,
  interests,
  followed,
  tone,
  photo,
}: {
  question: string;
  history: ChatMessage[];
  interests: string[];
  followed: string[];
  tone: PipTone;
  photo?: Photo | null;
}): Promise<PipAnswer> {
  let query = question;
  if (photo) {
    const named = (
      await askAI({
        prompt: "What product is in this photo?",
        instructions:
          "Reply with only the brand and product name, in under eight words. If there is no product in the photo, reply NONE.",
        photo,
      })
    ).trim();
    if (!named || /^none\b/i.test(named)) return { text: NO_PRODUCT, coupons: [], deals: [] };
    query = `${question} ${named}`;
  }

  const found = await dealsApi.search(query);
  const recent = history
    .slice(-6)
    .map((m) => `${m.role === "user" ? "Shopper" : "Pip"}: ${m.text}`)
    .join("\n");
  const prompt = [
    `Shopper's interests: ${interests.join(", ") || "not set"}.`,
    `Stores they follow: ${followed.join(", ") || "none yet"}.`,
    found.fallback
      ? `Nothing matched their words; these are the best deals under ${formatMoney(found.maxPrice ?? 0)}. Say that they are the closest matches, not exact ones.`
      : "",
    `Stores in Pip's list that match: ${found.stores.map((st) => st.name).join(", ") || "none"}.`,
    "Coupons (key | store | code | discount | title | conditions | ends | tested | last seen):",
    found.coupons.map(couponLine).join("\n") || "None match.",
    "Deals (key | product | brand | store | price | was | saving | rating | tags):",
    found.deals.map(dealLine).join("\n") || "None match.",
    "Recent conversation:",
    recent || "This is the first message.",
    `Shopper's question: ${question}${photo ? " (they sent a photo; it shows: " + query.slice(question.length).trim() + ")" : ""}`,
  ]
    .filter(Boolean)
    .join("\n");

  const raw = await askAI({ prompt, instructions: instructions(tone), json: true });
  return parse(raw, found);
}
