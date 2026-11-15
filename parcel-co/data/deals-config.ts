// Where the app reads coupons and deals from: the Pip API on Railway (project "pip-deals",
// function "pip-api"). Source: backend/pip-api.ts. Your scrapers fill its Postgres; see
// backend/README.md for the tables.
export const dealsApi = {
  url: "https://pip-api-production-be5ae21f.up.railway.app",
};

/**
 * Turn on when any Shop or View deal link is an affiliate link (stores.affiliate_url, or a
 * coupon or deal url your scrapers rewrote). The app then says so next to those links, as the
 * FTC requires.
 */
export const affiliateLinks = false;
