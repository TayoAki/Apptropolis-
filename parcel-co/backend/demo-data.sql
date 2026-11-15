-- Pip DEMO DATA: fictional stores with made-up codes and deals, so the app, its videos and its
-- store screenshots have something to show before the real scrapers run. Every coupon and deal
-- here has source = 'demo'; none of these stores or codes exist. Remove it all with
-- demo-data-remove.sql once real data arrives. Safe to run again (it upserts).

insert into stores (slug, name, domain, category, cashback, affiliate_url) values
  ('northline', 'Northline Outfitters', null, 'Fashion', null, 'https://example.com/'),
  ('kestrel-running', 'Kestrel Running', null, 'Sports', null, 'https://example.com/'),
  ('trailpeak', 'Trailpeak Outdoors', null, 'Sports', null, 'https://example.com/'),
  ('glowhaus', 'Glowhaus Beauty', null, 'Beauty', null, 'https://example.com/'),
  ('marigold-skin', 'Marigold Skin', null, 'Beauty', null, 'https://example.com/'),
  ('oak-ember', 'Oak & Ember Home', null, 'Home', null, 'https://example.com/'),
  ('brightnest', 'Brightnest Bedding', null, 'Home', null, 'https://example.com/'),
  ('voltway', 'Voltway Electronics', null, 'Electronics', null, 'https://example.com/'),
  ('tidewave', 'Tidewave Audio', null, 'Electronics', null, 'https://example.com/'),
  ('little-acorn', 'Little Acorn Toys', null, 'Toys', null, 'https://example.com/'),
  ('greenbasket', 'Greenbasket Market', null, 'Groceries', null, 'https://example.com/'),
  ('skylark', 'Skylark Getaways', null, 'Travel', null, 'https://example.com/')
on conflict (slug) do update set name = excluded.name, category = excluded.category,
  affiliate_url = excluded.affiliate_url, is_active = true, updated_at = now();

insert into coupons (key, store_slug, code, title, details, discount_type, discount_value, min_spend, url, source, expires_at, verified_at, last_seen_at) values
  ('demo:northline:LAYERUP20', 'northline', 'LAYERUP20', '20% off jackets and knitwear', 'Full-price styles only.', 'percent', 20, null, 'https://example.com/', 'demo', now() + interval '6 days', now() - interval '5 hours', now() - interval '2 hours'),
  ('demo:northline:ship', 'northline', null, 'Free shipping', null, 'free_shipping', null, 50, 'https://example.com/', 'demo', null, null, now() - interval '1 day'),
  ('demo:northline:NEWHERE10', 'northline', 'NEWHERE10', '10% off your first order', 'New customers only.', 'percent', 10, null, 'https://example.com/', 'demo', null, null, now() - interval '3 days'),
  ('demo:kestrel:STRIDE15', 'kestrel-running', 'STRIDE15', '$15 off running shoes', null, 'amount', 15, 90, 'https://example.com/', 'demo', now() + interval '4 days', now() - interval '20 hours', now() - interval '3 hours'),
  ('demo:kestrel:SOCKS3', 'kestrel-running', 'SOCKS3', 'Free pair of running socks', 'With any shoe purchase.', 'gift', null, null, 'https://example.com/', 'demo', now() + interval '12 days', null, now() - interval '2 days'),
  ('demo:trailpeak:CAMP25', 'trailpeak', 'CAMP25', '25% off tents and sleeping bags', null, 'percent', 25, null, 'https://example.com/', 'demo', now() + interval '2 days', null, now() - interval '6 hours'),
  ('demo:trailpeak:ship', 'trailpeak', null, 'Free shipping, no minimum', 'This weekend only.', 'free_shipping', null, null, 'https://example.com/', 'demo', now() + interval '2 days', null, now() - interval '1 day'),
  ('demo:glowhaus:GLOW15', 'glowhaus', 'GLOW15', '$15 off your order', null, 'amount', 15, 75, 'https://example.com/', 'demo', now() + interval '9 days', now() - interval '1 day', now() - interval '4 hours'),
  ('demo:glowhaus:MINIGIFT', 'glowhaus', 'MINIGIFT', 'Free travel-size gift', null, 'gift', null, 40, 'https://example.com/', 'demo', now() + interval '5 days', null, now() - interval '2 days'),
  ('demo:marigold:DEWY20', 'marigold-skin', 'DEWY20', '20% off sitewide', 'Excludes gift sets.', 'percent', 20, null, 'https://example.com/', 'demo', now() + interval '3 days', null, now() - interval '9 hours'),
  ('demo:marigold:bogo', 'marigold-skin', null, 'Buy one, get one 50% off cleansers', null, 'bogo', null, null, 'https://example.com/', 'demo', now() + interval '7 days', null, now() - interval '1 day'),
  ('demo:oak:COZY25', 'oak-ember', 'COZY25', '25% off throws and pillows', null, 'percent', 25, null, 'https://example.com/', 'demo', now() + interval '5 days', now() - interval '2 days', now() - interval '5 hours'),
  ('demo:oak:KITCHEN10', 'oak-ember', 'KITCHEN10', '$10 off cookware', null, 'amount', 10, 60, 'https://example.com/', 'demo', null, null, now() - interval '4 days'),
  ('demo:brightnest:NEST30', 'brightnest', 'NEST30', '30% off sheet sets', 'Queen and king sizes.', 'percent', 30, null, 'https://example.com/', 'demo', now() + interval '1 day', null, now() - interval '3 hours'),
  ('demo:voltway:VOLT10', 'voltway', 'VOLT10', '10% off smart home', 'Up to $50 off.', 'percent', 10, null, 'https://example.com/', 'demo', now() + interval '8 days', now() - interval '1 day', now() - interval '7 hours'),
  ('demo:voltway:CHARGE20', 'voltway', 'CHARGE20', '$20 off chargers and cables', null, 'amount', 20, 80, 'https://example.com/', 'demo', null, null, now() - interval '5 days'),
  ('demo:tidewave:QUIET40', 'tidewave', 'QUIET40', '$40 off noise-canceling headphones', null, 'amount', 40, null, 'https://example.com/', 'demo', now() + interval '3 days', now() - interval '6 hours', now() - interval '1 hour'),
  ('demo:acorn:PLAY15', 'little-acorn', 'PLAY15', '15% off wooden toys', null, 'percent', 15, null, 'https://example.com/', 'demo', now() + interval '10 days', now() - interval '1 day', now() - interval '2 hours'),
  ('demo:acorn:ship', 'little-acorn', null, 'Free shipping', null, 'free_shipping', null, 35, 'https://example.com/', 'demo', null, null, now() - interval '2 days'),
  ('demo:greenbasket:FRESH10', 'greenbasket', 'FRESH10', '$10 off your first delivery', 'New customers only.', 'amount', 10, 60, 'https://example.com/', 'demo', null, null, now() - interval '1 day'),
  ('demo:skylark:WEEKEND50', 'skylark', 'WEEKEND50', '$50 off two-night stays', 'Book by Sunday.', 'amount', 50, null, 'https://example.com/', 'demo', now() + interval '2 days', null, now() - interval '12 hours')
on conflict (key) do update set title = excluded.title, details = excluded.details,
  discount_type = excluded.discount_type, discount_value = excluded.discount_value,
  min_spend = excluded.min_spend, url = excluded.url, expires_at = excluded.expires_at,
  verified_at = excluded.verified_at, last_seen_at = excluded.last_seen_at, is_active = true;

insert into deals (key, store_slug, title, brand, category, price, was_price, url, source, rating, review_count, tags, last_seen_at) values
  ('demo:northline:parka', 'northline', 'Insulated Hooded Parka', 'Northline', 'Fashion', 129.00, 189.00, 'https://example.com/', 'demo', 4.6, 412, '{coat,winter,gift}', now() - interval '3 hours'),
  ('demo:northline:merino', 'northline', 'Merino Crew Sweater', 'Northline', 'Fashion', 54.00, 78.00, 'https://example.com/', 'demo', 4.5, 230, '{sweater,gift}', now() - interval '1 day'),
  ('demo:kestrel:glide', 'kestrel-running', 'Glide 5 Road Running Shoes', 'Kestrel', 'Sports', 94.00, 135.00, 'https://example.com/', 'demo', 4.7, 1180, '{running,shoes}', now() - interval '2 hours'),
  ('demo:trailpeak:tent', 'trailpeak', 'Two-Person Backpacking Tent', 'Trailpeak', 'Sports', 149.00, 219.00, 'https://example.com/', 'demo', 4.4, 310, '{camping,outdoors}', now() - interval '6 hours'),
  ('demo:glowhaus:serum', 'glowhaus', 'Vitamin C Brightening Serum', 'Glowhaus', 'Beauty', 22.00, 32.00, 'https://example.com/', 'demo', 4.5, 2040, '{skincare,beauty,gift}', now() - interval '4 hours'),
  ('demo:marigold:set', 'marigold-skin', 'Hydration Mini Set (4 pieces)', 'Marigold', 'Beauty', 28.00, 40.00, 'https://example.com/', 'demo', 4.8, 640, '{skincare,beauty,gift}', now() - interval '1 day'),
  ('demo:oak:skillet', 'oak-ember', 'Cast Iron Skillet, 10 inch', 'Oak & Ember', 'Home', 24.00, 35.00, 'https://example.com/', 'demo', 4.8, 3120, '{kitchen,cookware,gift}', now() - interval '5 hours'),
  ('demo:oak:throw', 'oak-ember', 'Chunky Knit Throw Blanket', 'Oak & Ember', 'Home', 39.00, 59.00, 'https://example.com/', 'demo', 4.6, 880, '{blanket,gift}', now() - interval '8 hours'),
  ('demo:brightnest:sheets', 'brightnest', 'Washed Linen Sheet Set, Queen', 'Brightnest', 'Home', 112.00, 160.00, 'https://example.com/', 'demo', 4.7, 1510, '{bedding,sheets}', now() - interval '3 hours'),
  ('demo:voltway:plugs', 'voltway', 'Smart Plug, 4-Pack', 'Voltway', 'Electronics', 26.00, 39.00, 'https://example.com/', 'demo', 4.4, 5200, '{smart home,gift}', now() - interval '7 hours'),
  ('demo:tidewave:anc', 'tidewave', 'Over-Ear Noise-Canceling Headphones', 'Tidewave', 'Electronics', 159.00, 249.00, 'https://example.com/', 'demo', 4.6, 2760, '{headphones,audio,gift}', now() - interval '1 hour'),
  ('demo:tidewave:buds', 'tidewave', 'Wireless Earbuds with Charging Case', 'Tidewave', 'Electronics', 49.00, 79.00, 'https://example.com/', 'demo', 4.3, 4100, '{headphones,audio,gift}', now() - interval '9 hours'),
  ('demo:acorn:train', 'little-acorn', 'Wooden Train Set, 52 pieces', 'Little Acorn', 'Toys', 34.00, 48.00, 'https://example.com/', 'demo', 4.8, 1930, '{kids,toys,gift}', now() - interval '2 hours'),
  ('demo:acorn:blocks', 'little-acorn', 'Magnetic Building Tiles, 60 pieces', 'Little Acorn', 'Toys', 39.00, 55.00, 'https://example.com/', 'demo', 4.7, 2650, '{kids,toys,gift}', now() - interval '5 hours'),
  ('demo:acorn:puzzle', 'little-acorn', 'Animal Floor Puzzle, 48 pieces', 'Little Acorn', 'Toys', 16.00, 22.00, 'https://example.com/', 'demo', 4.6, 720, '{kids,toys,gift}', now() - interval '1 day'),
  ('demo:greenbasket:coffee', 'greenbasket', 'Whole Bean Coffee, 2 lb', 'Greenbasket', 'Groceries', 14.00, 19.00, 'https://example.com/', 'demo', 4.5, 980, '{coffee,gift}', now() - interval '6 hours')
on conflict (key) do update set title = excluded.title, price = excluded.price,
  was_price = excluded.was_price, rating = excluded.rating, review_count = excluded.review_count,
  tags = excluded.tags, last_seen_at = excluded.last_seen_at, is_active = true;
