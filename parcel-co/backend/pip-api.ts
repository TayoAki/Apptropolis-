// Pip API: the read-only HTTP API the Pip app uses to show coupons and deals.
// Runs as a Railway Function (one file, Bun runtime). DATABASE_URL points at the project's
// Postgres. Your scrapers write the tables (see schema.sql and README.md); this file only reads,
// except for creating the tables on boot when they don't exist yet.
//
// Deploy: paste this file into the Railway function "pip-api" (or use the Railway MCP
// update-function-source-code). Keep the DDL below in step with schema.sql.
import { SQL } from "bun";

const db = new SQL(Bun.env.DATABASE_URL ?? "");

const DDL = [
  `create table if not exists stores (
    slug text primary key, name text not null, domain text, logo_url text, category text,
    cashback text, affiliate_url text, is_active boolean not null default true,
    updated_at timestamptz not null default now())`,
  `create table if not exists coupons (
    key text primary key, store_slug text not null references stores(slug) on delete cascade,
    code text, title text not null, details text,
    discount_type text check (discount_type in ('percent', 'amount', 'free_shipping', 'bogo', 'gift', 'other')),
    discount_value numeric, min_spend numeric, url text, source text not null, source_url text,
    starts_at timestamptz, expires_at timestamptz, verified_at timestamptz,
    first_seen_at timestamptz not null default now(), last_seen_at timestamptz not null default now(),
    is_active boolean not null default true)`,
  `create index if not exists coupons_store_idx on coupons (store_slug)`,
  `create table if not exists deals (
    key text primary key, store_slug text references stores(slug) on delete set null,
    title text not null, brand text, category text, price numeric not null, was_price numeric,
    currency text not null default 'USD', image_url text, url text not null, source text not null,
    rating numeric, review_count integer, tags text[] not null default '{}', expires_at timestamptz,
    first_seen_at timestamptz not null default now(), last_seen_at timestamptz not null default now(),
    is_active boolean not null default true)`,
  `create index if not exists deals_store_idx on deals (store_slug)`,
];

let migrated: Promise<void> | null = null;
function migrate(): Promise<void> {
  migrated ??= (async () => {
    for (const statement of DDL) await db.unsafe(statement);
  })().catch((error) => {
    migrated = null; // try again on the next request
    throw error;
  });
  return migrated;
}

// Words that say what kind of help someone wants, not what they want it for. Dropped before
// matching, so "is there a code for nike" searches for "nike".
const STOP = new Set(
  ("a an the is are was be there any anything something some for to of on in at and or but with " +
    "what whats which who should could would can do does did i im me my we our you your it its this that " +
    "get got buy buying find need want looking look show tell give me please now today right good best " +
    "cheap cheaper cheapest code codes coupon coupons promo promos deal deals discount discounts off sale " +
    "voucher vouchers under over below above less than more much how many price prices dollar dollars " +
    "idea ideas year years yr yrs old usd").split(" "),
);

// Everyday ways of saying a tag the scrapers use. "a 6 year old" should find deals tagged kids.
const EXPAND: [RegExp, string][] = [
  [/\b(\d+\s*(year|yr)s?[- ]?old|kid|kids|child|children|toddler|baby|boy|girl|son|daughter|nephew|niece)\b/, "kids"],
  [/\b(gift|gifts|present|presents|birthday|christmas|holiday|stocking)\b/, "gift"],
  [/\b(headphone|headphones|earbud|earbuds|airpods)\b/, "headphones"],
  [/\b(sneaker|sneakers|trainers|shoe|shoes)\b/, "shoes"],
  [/\b(makeup|skincare|skin care|beauty)\b/, "beauty"],
];

/** "is there a code for Nike running shoes?" -> ["nike", "running", "shoes"] */
function searchTerms(q: string): string[] {
  const text = q.toLowerCase();
  const words = (text.match(/[a-z0-9]+/g) ?? []).filter(
    (w) => w.length >= 2 && !STOP.has(w) && !/^\d+$/.test(w),
  );
  for (const [pattern, tag] of EXPAND) if (pattern.test(text)) words.push(tag);
  return [...new Set(words)].slice(0, 10);
}

/** Prefix-matching OR query for to_tsquery: "nike:* | running:*" */
function tsQuery(terms: string[]): string {
  return terms.map((t) => `${t}:*`).join(" | ");
}

/** "under $40", "below 40", "less than 40 dollars" -> 40 */
function maxPriceFrom(q: string): number | null {
  const match = q.toLowerCase().match(/(?:under|below|less than|max|up to)\s*\$?\s*(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : null;
}

function clampLimit(value: string | null, fallback: number, max = 100): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.min(Math.floor(n), max) : fallback;
}

const COUPON_COLUMNS = `
  c.key, c.store_slug as "storeSlug", s.name as "storeName", s.domain as "storeDomain",
  s.logo_url as "storeLogoUrl", c.code, c.title, c.details, c.discount_type as "discountType",
  c.discount_value::float8 as "discountValue", c.min_spend::float8 as "minSpend",
  coalesce(c.url, s.affiliate_url, case when s.domain is not null then 'https://' || s.domain end) as url,
  c.source, c.source_url as "sourceUrl", c.expires_at as "expiresAt",
  c.verified_at as "verifiedAt", c.last_seen_at as "lastSeenAt"`;

const COUPON_ACTIVE = `c.is_active and s.is_active
  and (c.expires_at is null or c.expires_at > now())
  and (c.starts_at is null or c.starts_at <= now())`;

const COUPON_ORDER = `c.verified_at desc nulls last, c.last_seen_at desc`;

const DEAL_COLUMNS = `
  d.key, d.store_slug as "storeSlug", s.name as "storeName", d.title, d.brand, d.category,
  d.price::float8 as price, d.was_price::float8 as "wasPrice", d.currency, d.image_url as "imageUrl",
  d.url, d.source, d.rating::float8 as rating, d.review_count as "reviewCount", d.tags,
  d.expires_at as "expiresAt", d.last_seen_at as "lastSeenAt"`;

const DEAL_ACTIVE = `d.is_active and (s.slug is null or s.is_active)
  and (d.expires_at is null or d.expires_at > now())`;

const DEAL_SAVING = `case when d.was_price > d.price then (d.was_price - d.price) / d.was_price else 0 end`;

const STORE_COLUMNS = `
  s.slug, s.name, s.domain, s.logo_url as "logoUrl", s.category, s.cashback,
  s.affiliate_url as "affiliateUrl", s.updated_at as "updatedAt",
  (select count(*)::int from coupons c where c.store_slug = s.slug and ${COUPON_ACTIVE}) as "couponCount",
  (select count(*)::int from deals d where d.store_slug = s.slug and ${DEAL_ACTIVE}) as "dealCount"`;

function list(value: string | null): string[] {
  return (value ?? "")
    .split(",")
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 50);
}

async function health() {
  const [counts] = await db.unsafe(`select
    (select count(*)::int from stores where is_active) as stores,
    (select count(*)::int from coupons c join stores s on s.slug = c.store_slug where ${COUPON_ACTIVE}) as coupons,
    (select count(*)::int from deals d left join stores s on s.slug = d.store_slug where ${DEAL_ACTIVE}) as deals,
    greatest((select max(last_seen_at) from coupons), (select max(last_seen_at) from deals)) as "updatedAt"`);
  return { ok: true, ...counts };
}

async function feed(params: URLSearchParams) {
  const stores = list(params.get("stores"));
  const categories = list(params.get("categories"));
  const limit = clampLimit(params.get("limit"), 20, 50);
  // Codes for the stores the person follows, then the newest codes everywhere, then the deals
  // with the biggest saving (in their categories first, when they picked any).
  const followed = stores.length
    ? await db.unsafe(
        `select ${COUPON_COLUMNS} from coupons c join stores s on s.slug = c.store_slug
         where ${COUPON_ACTIVE} and c.store_slug = any($1::text[])
         order by ${COUPON_ORDER} limit $2`,
        [stores, limit],
      )
    : [];
  const coupons = await db.unsafe(
    `select ${COUPON_COLUMNS} from coupons c join stores s on s.slug = c.store_slug
     where ${COUPON_ACTIVE} and not (c.store_slug = any($1::text[]))
     order by (lower(coalesce(s.category, '')) = any($2::text[])) desc, ${COUPON_ORDER} limit $3`,
    [stores, categories, limit],
  );
  const deals = await db.unsafe(
    `select ${DEAL_COLUMNS} from deals d left join stores s on s.slug = d.store_slug
     where ${DEAL_ACTIVE}
     order by (lower(coalesce(d.category, s.category, '')) = any($1::text[])) desc,
              ${DEAL_SAVING} desc, d.last_seen_at desc
     limit $2`,
    [categories, limit],
  );
  const { updatedAt } = await health();
  return { followed, coupons, deals, updatedAt };
}

async function stores(params: URLSearchParams) {
  const terms = searchTerms(params.get("q") ?? "");
  const limit = clampLimit(params.get("limit"), 60, 200);
  if (terms.length) {
    return {
      stores: await db.unsafe(
        `select ${STORE_COLUMNS} from stores s
         where s.is_active and to_tsvector('simple', s.name || ' ' || s.slug || ' ' || coalesce(s.domain, ''))
           @@ to_tsquery('simple', $1)
         order by "couponCount" desc, s.name limit $2`,
        [tsQuery(terms), limit],
      ),
    };
  }
  return {
    stores: await db.unsafe(
      `select ${STORE_COLUMNS} from stores s where s.is_active
       order by "couponCount" desc, s.name limit $1`,
      [limit],
    ),
  };
}

async function categories() {
  const rows = await db.unsafe(
    `select category as name, count(*)::int as stores from stores
     where is_active and category is not null and category <> ''
     group by category order by count(*) desc, category`,
  );
  return { categories: rows };
}

async function store(slug: string) {
  const [found] = await db.unsafe(`select ${STORE_COLUMNS} from stores s where s.slug = $1 and s.is_active`, [
    slug,
  ]);
  if (!found) return null;
  const coupons = await db.unsafe(
    `select ${COUPON_COLUMNS} from coupons c join stores s on s.slug = c.store_slug
     where ${COUPON_ACTIVE} and c.store_slug = $1 order by ${COUPON_ORDER} limit 100`,
    [slug],
  );
  const deals = await db.unsafe(
    `select ${DEAL_COLUMNS} from deals d left join stores s on s.slug = d.store_slug
     where ${DEAL_ACTIVE} and d.store_slug = $1 order by ${DEAL_SAVING} desc, d.last_seen_at desc limit 50`,
    [slug],
  );
  return { store: found, coupons, deals };
}

/** What Pip reads before it answers: the stores, codes and deals that match the question. */
async function search(params: URLSearchParams) {
  const q = params.get("q") ?? "";
  const terms = searchTerms(q);
  const limit = clampLimit(params.get("limit"), 12, 40);
  const maxPrice = params.has("max_price") ? Number(params.get("max_price")) : maxPriceFrom(q);
  if (!terms.length && maxPrice == null) {
    return { terms, maxPrice, stores: [], coupons: [], deals: [], fallback: false };
  }
  const query = terms.length ? tsQuery(terms) : null;

  const matchedStores = query
    ? await db.unsafe(
        `select ${STORE_COLUMNS} from stores s
         where s.is_active and to_tsvector('simple', s.name || ' ' || s.slug || ' ' || coalesce(s.domain, ''))
           @@ to_tsquery('simple', $1)
         order by "couponCount" desc limit 5`,
        [query],
      )
    : [];
  const slugs = matchedStores.map((s: { slug: string }) => s.slug);

  const coupons = query
    ? await db.unsafe(
        `select ${COUPON_COLUMNS} from coupons c join stores s on s.slug = c.store_slug
         where ${COUPON_ACTIVE} and (
           c.store_slug = any($1::text[])
           or to_tsvector('english', c.title || ' ' || coalesce(c.details, '') || ' ' || s.name || ' ' || coalesce(s.category, ''))
              @@ to_tsquery('english', $2))
         order by (c.store_slug = any($1::text[])) desc,
           ts_rank(to_tsvector('english', c.title || ' ' || coalesce(c.details, '') || ' ' || s.name || ' ' || coalesce(s.category, '')),
                   to_tsquery('english', $2)) desc,
           ${COUPON_ORDER} limit $3`,
        [slugs, query, limit],
      )
    : [];

  const deals = await db.unsafe(
    `select ${DEAL_COLUMNS} from deals d left join stores s on s.slug = d.store_slug
     where ${DEAL_ACTIVE}
       and ($1::text is null or d.store_slug = any($2::text[])
            or to_tsvector('english', d.title || ' ' || coalesce(d.brand, '') || ' ' || coalesce(d.category, '')
               || ' ' || array_to_string(d.tags, ' ') || ' ' || coalesce(s.name, ''))
               @@ to_tsquery('english', $1))
       and ($3::float8 is null or d.price <= $3)
     order by (d.store_slug = any($2::text[])) desc,
       -- More of the question's words matched first ("gift" + "kids" beats "gift" alone).
       case when $1::text is null then 0 else ts_rank(
         to_tsvector('english', d.title || ' ' || coalesce(d.brand, '') || ' ' || coalesce(d.category, '')
           || ' ' || array_to_string(d.tags, ' ') || ' ' || coalesce(s.name, '')),
         to_tsquery('english', $1)) end desc,
       ${DEAL_SAVING} desc, d.rating desc nulls last
     limit $4`,
    [query, slugs, maxPrice, limit],
  );

  // Nothing matched the words: still answer a budget question with the best deals under it,
  // and say so (Pip tells the person these are the closest it has, not a match).
  if (!matchedStores.length && !coupons.length && !deals.length && maxPrice != null) {
    const underBudget = await db.unsafe(
      `select ${DEAL_COLUMNS} from deals d left join stores s on s.slug = d.store_slug
       where ${DEAL_ACTIVE} and d.price <= $1
       order by ${DEAL_SAVING} desc, d.rating desc nulls last limit $2`,
      [maxPrice, limit],
    );
    return { terms, maxPrice, stores: [], coupons: [], deals: underBudget, fallback: true };
  }

  return { terms, maxPrice, stores: matchedStores, coupons, deals, fallback: false };
}

const HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(body: unknown, status = 200, cache = 60): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...HEADERS, "Cache-Control": status === 200 ? `public, max-age=${cache}` : "no-store" },
  });
}

async function route(request: Request): Promise<Response> {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: HEADERS });
  if (request.method !== "GET") return json({ error: "Read-only API" }, 405);
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, "") || "/";
  await migrate();
  if (path === "/" || path === "/health") return json(await health(), 200, 0);
  if (path === "/v1/feed") return json(await feed(url.searchParams));
  if (path === "/v1/stores") return json(await stores(url.searchParams));
  if (path === "/v1/categories") return json(await categories(), 200, 300);
  if (path === "/v1/search") return json(await search(url.searchParams), 200, 30);
  const storeMatch = path.match(/^\/v1\/stores\/([a-z0-9-]+)$/);
  if (storeMatch) {
    const body = await store(storeMatch[1]!);
    return body ? json(body) : json({ error: "No such store" }, 404);
  }
  return json({ error: "Not found" }, 404);
}

Bun.serve({
  port: Number(Bun.env.PORT ?? 3000),
  async fetch(request) {
    try {
      return await route(request);
    } catch (error) {
      console.error(error);
      return json({ error: "The deals database didn't answer. Try again in a moment." }, 503);
    }
  },
});

await migrate().catch((error) => console.error("Migration failed; will retry on the next request", error));
console.log("pip-api listening");
