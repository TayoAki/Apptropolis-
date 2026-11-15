-- Pip deals database. Your scrapers write these three tables; the Pip API (pip-api.ts) only
-- reads them. pip-api.ts runs this same DDL on boot, so a fresh database is ready by itself.
--
-- Rules the app relies on:
-- - `key` is your own stable id for a row. Upsert on it (INSERT ... ON CONFLICT (key) DO UPDATE)
--   so re-scraping the same coupon updates it instead of adding a duplicate.
-- - Set `last_seen_at = now()` every time a scrape sees the row again. The app shows
--   "Seen today / 3 days ago" from it.
-- - Set `verified_at` only when you actually confirmed the code works (e.g. a checkout test).
--   The app labels a code "Verified" only when this is set; never set it from a source's own
--   "verified" badge.
-- - To retire a row, set `is_active = false` (or let `expires_at` pass). The API hides inactive
--   and expired rows.
-- - Money is in the row's currency (default USD), as numbers: 39.99, not "$39.99".

create table if not exists stores (
  slug          text primary key,              -- "nike": lowercase, a-z 0-9 and dashes
  name          text not null,                 -- "Nike"
  domain        text,                          -- "nike.com"
  logo_url      text,
  category      text,                          -- "Fashion", "Beauty", "Home", "Electronics", ...
  cashback      text,                          -- free text as scraped, e.g. "Up to 6% cash back"
  affiliate_url text,                          -- where "Shop" sends people when a coupon has no url
  is_active     boolean not null default true,
  updated_at    timestamptz not null default now()
);

create table if not exists coupons (
  key            text primary key,             -- e.g. "nike:SAVE20" or "nike:free-shipping-50"
  store_slug     text not null references stores(slug) on delete cascade,
  code           text,                         -- null for a deal that needs no code
  title          text not null,                -- "20% off sitewide"
  details        text,                         -- terms and exclusions
  discount_type  text check (discount_type in ('percent', 'amount', 'free_shipping', 'bogo', 'gift', 'other')),
  discount_value numeric,                      -- 20 for 20%, 15 for $15 off
  min_spend      numeric,                      -- minimum order, if any
  url            text,                         -- landing page (or your affiliate link) for this offer
  source         text not null,                -- where it was scraped from, e.g. "retailmenot.com"
  source_url     text,
  starts_at      timestamptz,
  expires_at     timestamptz,
  verified_at    timestamptz,                  -- when YOU last confirmed it works
  first_seen_at  timestamptz not null default now(),
  last_seen_at   timestamptz not null default now(),
  is_active      boolean not null default true
);
create index if not exists coupons_store_idx on coupons (store_slug);

create table if not exists deals (
  key           text primary key,              -- e.g. "target:84920123"
  store_slug    text references stores(slug) on delete set null,
  title         text not null,                 -- product name
  brand         text,
  category      text,
  price         numeric not null,              -- current price
  was_price     numeric,                       -- list or previous price, if the source shows one
  currency      text not null default 'USD',
  image_url     text,
  url           text not null,                 -- product page (or your affiliate link)
  source        text not null,
  rating        numeric,                       -- 0 to 5
  review_count  integer,
  tags          text[] not null default '{}',  -- free tags Pip can match: {'kids','gift','headphones'}
  expires_at    timestamptz,
  first_seen_at timestamptz not null default now(),
  last_seen_at  timestamptz not null default now(),
  is_active     boolean not null default true
);
create index if not exists deals_store_idx on deals (store_slug);
