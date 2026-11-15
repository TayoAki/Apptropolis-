-- Removes the demo data from demo-data.sql: every coupon and deal with source = 'demo', then the
-- fictional stores (only if your scrapers haven't attached real rows to the same slugs).
delete from coupons where source = 'demo';
delete from deals where source = 'demo';
delete from stores s where s.slug in ('northline', 'kestrel-running', 'trailpeak', 'glowhaus',
  'marigold-skin', 'oak-ember', 'brightnest', 'voltway', 'tidewave', 'little-acorn',
  'greenbasket', 'skylark')
  and not exists (select 1 from coupons c where c.store_slug = s.slug)
  and not exists (select 1 from deals d where d.store_slug = s.slug);
