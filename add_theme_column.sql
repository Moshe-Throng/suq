-- Add theme color to shops
ALTER TABLE suq_shops ADD COLUMN IF NOT EXISTS theme_color TEXT DEFAULT 'teal';
