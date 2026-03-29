-- Add TikTok integration columns
ALTER TABLE suq_shops ADD COLUMN IF NOT EXISTS tiktok_url TEXT;
ALTER TABLE suq_products ADD COLUMN IF NOT EXISTS tiktok_url TEXT;

-- Add multi-photo support
ALTER TABLE suq_products ADD COLUMN IF NOT EXISTS extra_photos JSONB;
