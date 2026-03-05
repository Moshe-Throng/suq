-- Add customization columns to shops
ALTER TABLE suq_shops ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE suq_shops ADD COLUMN IF NOT EXISTS logo_file_id TEXT;
ALTER TABLE suq_shops ADD COLUMN IF NOT EXISTS logo_url TEXT;
