-- Services + Inquiry support migration
-- Run in Supabase SQL Editor

-- Shop type & profile
ALTER TABLE suq_shops ADD COLUMN IF NOT EXISTS shop_type TEXT DEFAULT 'product';
ALTER TABLE suq_shops ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE suq_shops ADD COLUMN IF NOT EXISTS template_style TEXT DEFAULT 'clean';
ALTER TABLE suq_shops ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE suq_shops ADD COLUMN IF NOT EXISTS location_text TEXT;

-- Items: listing type + flexible pricing
ALTER TABLE suq_products ADD COLUMN IF NOT EXISTS listing_type TEXT DEFAULT 'product';
ALTER TABLE suq_products ADD COLUMN IF NOT EXISTS price_type TEXT DEFAULT 'fixed';
ALTER TABLE suq_products ALTER COLUMN price DROP NOT NULL;

-- Inquiries (reuse suq_orders table, add message field)
ALTER TABLE suq_orders ADD COLUMN IF NOT EXISTS message TEXT;

-- Migrate existing shops: theme_color → template_style
UPDATE suq_shops SET template_style = CASE theme_color
  WHEN 'teal' THEN 'fresh' WHEN 'purple' THEN 'clean'
  WHEN 'rose' THEN 'warm' WHEN 'orange' THEN 'warm'
  WHEN 'emerald' THEN 'fresh' WHEN 'gold' THEN 'ethiopian'
  ELSE 'clean' END
WHERE template_style = 'clean' AND theme_color IS NOT NULL;
