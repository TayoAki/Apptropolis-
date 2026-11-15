// Reads coupons, deals and stores from the Pip API (data/deals-config.ts). Read-only: the owner's
// scrapers fill the database. Every call fails with a message a person can read.
import { useEffect, useState } from "react";
import { dealsApi } from "./deals-config";
import type { Coupon, Deal, Store } from "./schema";

export interface Feed {
  /** Codes for the stores the person follows. */
  followed: Coupon[];
  /** The newest codes from every other store, their interests first. */
  coupons: Coupon[];
  /** Deals with the biggest saving, their interests first. */
  deals: Deal[];
  /** When the scrapers last saw anything; null while the database is empty. */
  updatedAt: string | null;
}

export interface SearchResult {
  terms: string[];
  maxPrice: number | null;
  stores: Store[];
  coupons: Coupon[];
  deals: Deal[];
  /** True when nothing matched the words and these are the best deals under the budget. */
  fallback: boolean;
}

export interface StorePage {
  store: Store;
  coupons: Coupon[];
  deals: Deal[];
}

const TIMEOUT_MS = 12_000;

async function get<T>(path: string, params: Record<string, string | number | undefined> = {}): Promise<T> {
  if (!dealsApi.url) throw new Error("Pip's deal list isn't connected yet.");
  const query = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== "")
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join("&");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(`${dealsApi.url}${path}${query ? `?${query}` : ""}`, {
      signal: controller.signal,
    });
  } catch {
    throw new Error("Couldn't reach Pip's deal list. Check your connection and try again.");
  } finally {
    clearTimeout(timer);
  }
  const body = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) {
    if (response.status === 404) throw new Error(body.error ?? "That isn't in Pip's list.");
    throw new Error("Pip's deal list didn't answer. Try again in a moment.");
  }
  return body;
}

export const deals = {
  feed: (stores: string[], interests: string[]) =>
    get<Feed>("/v1/feed", { stores: stores.join(","), categories: interests.join(","), limit: 20 }),
  stores: (q?: string) => get<{ stores: Store[] }>("/v1/stores", { q }),
  store: (slug: string) => get<StorePage>(`/v1/stores/${encodeURIComponent(slug)}`),
  search: (q: string) => get<SearchResult>("/v1/search", { q }),
};

/**
 * Runs `load` when the screen opens and whenever `key` changes, with loading and error state
 * and a reload for "Try again" and pull-to-refresh.
 */
export function useRemote<T>(load: () => Promise<T>, key: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    load().then(
      (value) => {
        if (!alive) return;
        setData(value);
        setLoading(false);
      },
      (e: unknown) => {
        if (!alive) return;
        setError(e instanceof Error ? e.message : "Something went wrong. Try again.");
        setLoading(false);
      },
    );
    return () => {
      alive = false;
    };
    // `key` stands for everything `load` reads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, attempt]);

  return { data, error, loading, reload: () => setAttempt((n) => n + 1) };
}
