# Pip backend: the deals database and its API

Pip shows coupon codes and deals that **your scrapers** collect. The app never scrapes anything
itself: it reads one read-only API, and the API reads one Postgres database.

```
your scrapers ──write──▶ Postgres (Railway)  ◀──read── pip-api (Railway Function) ◀── Pip app
```

## What's deployed

| Piece | Where |
|---|---|
| Railway project | `pip-deals` (workspace "Tayo Akigbogun's Projects") |
| Database | service `Postgres` (Railway's Postgres template) |
| API | function `pip-api`, source [`pip-api.ts`](pip-api.ts), at `https://pip-api-production-be5ae21f.up.railway.app` |
| App setting | [`../data/deals-config.ts`](../data/deals-config.ts) holds the API URL |

The API creates the three tables on boot if they don't exist, so the database is ready now and
empty. Until your scrapers write rows, the app shows "No codes yet".

## Writing from your scrapers

Connect with the Postgres connection string from Railway:

- **Scrapers running inside the `pip-deals` project** (another Function or service): use the
  variable reference `${{Postgres.DATABASE_URL}}` (private network, no egress cost).
- **Scrapers running anywhere else**: use `DATABASE_PUBLIC_URL` from the Postgres service's
  Variables tab. Keep it secret: it can write.

The tables are in [`schema.sql`](schema.sql). The rules the app relies on:

1. **Upsert on `key`.** `key` is your own stable id for the row (`"nike:SAVE20"`,
   `"target:84920123"`). Re-scraping the same coupon updates it instead of adding a duplicate.
2. **Set `last_seen_at = now()` every time you see a row again.** The app shows "Seen today / 3
   days ago" from it, and Pip tells people how fresh a code is.
3. **`verified_at` means you tested it.** Set it only when your scraper actually tried the code at
   a checkout and it worked. The app then labels the code "Tested Nov 14". Never copy a coupon
   site's own "verified" badge into it: the app avoids promising codes work, because "verified"
   claims have drawn ad-industry and FTC challenges for other coupon apps.
4. **Retire rows** by setting `is_active = false`, or let `expires_at` pass. The API hides
   inactive and expired rows (and every coupon of an inactive store).
5. **Money is numeric** in the row's currency (`39.99`, not `"$39.99"`). `currency` defaults to
   `USD`.
6. **Store categories** should be one of `Fashion`, `Beauty`, `Home`, `Electronics`, `Toys`,
   `Groceries`, `Travel`, `Sports`. Those are the interests people pick at setup; a matching
   category puts the store's codes and deals first for them. Deals can carry their own `category`.
7. **Deal `tags`** help Pip match everyday questions. The API already maps "6 year old / kid /
   toddler" to `kids`, "present / birthday / christmas" to `gift`, "earbuds / airpods" to
   `headphones`, "sneakers / trainers" to `shoes`, and "makeup / skincare" to `beauty`. Tag deals
   with those words where they fit.

### Example upserts

```sql
insert into stores (slug, name, domain, category, cashback)
values ('nike', 'Nike', 'nike.com', 'Fashion', null)
on conflict (slug) do update set
  name = excluded.name, domain = excluded.domain, category = excluded.category,
  cashback = excluded.cashback, is_active = true, updated_at = now();

insert into coupons (key, store_slug, code, title, details, discount_type, discount_value,
                     min_spend, url, source, source_url, expires_at)
values ('nike:SAVE20', 'nike', 'SAVE20', '20% off full-price shoes', 'Excludes Jordan',
        'percent', 20, null, 'https://www.nike.com/', 'retailmenot.com',
        'https://www.retailmenot.com/view/nike.com', '2026-12-01T07:59:00Z')
on conflict (key) do update set
  title = excluded.title, details = excluded.details, discount_type = excluded.discount_type,
  discount_value = excluded.discount_value, min_spend = excluded.min_spend, url = excluded.url,
  source = excluded.source, source_url = excluded.source_url, expires_at = excluded.expires_at,
  last_seen_at = now(), is_active = true;

insert into deals (key, store_slug, title, brand, category, price, was_price, image_url, url,
                   source, rating, review_count, tags)
values ('target:84920123', 'target', 'LEGO Classic Creative Box', 'LEGO', 'Toys', 34.99, 49.99,
        'https://…/image.jpg', 'https://www.target.com/p/…', 'target.com', 4.8, 1200,
        '{kids,gift,toys}')
on conflict (key) do update set
  price = excluded.price, was_price = excluded.was_price, image_url = excluded.image_url,
  rating = excluded.rating, review_count = excluded.review_count, tags = excluded.tags,
  last_seen_at = now(), is_active = true;
```

`discount_type` is one of `percent`, `amount`, `free_shipping`, `bogo`, `gift`, `other`. Leave
`code` null for an offer that needs no code (the app shows "No code needed").

### Affiliate links

If any `url` or `stores.affiliate_url` is an affiliate link, set `affiliateLinks = true` in
[`../data/deals-config.ts`](../data/deals-config.ts). The app then discloses it on Home, store
pages and in Settings, as the FTC requires. Don't overwrite other sites' affiliate tracking.

## The API

Read-only, JSON, CORS open, cached for a minute.

| Endpoint | What it returns |
|---|---|
| `GET /health` | counts of live stores, coupons and deals, and when the scrapers last saw anything |
| `GET /v1/feed?stores=nike,target&categories=fashion,toys` | codes for followed stores, newest other codes (their categories first), biggest price drops |
| `GET /v1/stores?q=nik` | stores with live code and deal counts |
| `GET /v1/stores/:slug` | one store, its live codes and its deals |
| `GET /v1/categories` | store categories in use |
| `GET /v1/search?q=gift for a 6 year old under $40` | what Pip reads before answering: matching stores, codes and deals (and the best deals under a stated budget when nothing else matches) |

### Changing the API

Edit `pip-api.ts`, then replace the function's code in Railway (dashboard → `pip-api` → Source,
or the Railway MCP tool `update-function-source-code`). It runs on Bun with no dependencies.

To test locally against a throwaway database:

```bash
DATABASE_URL=postgres://postgres@127.0.0.1:5432/pip PORT=8790 bun backend/pip-api.ts
```

```bash
curl "localhost:8790/v1/search?q=is%20there%20a%20code%20for%20nike"
```
