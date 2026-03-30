-- Channel import + auto-sync columns
ALTER TABLE suq_shops ADD COLUMN IF NOT EXISTS source_channel TEXT;
ALTER TABLE suq_shops ADD COLUMN IF NOT EXISTS channel_sync_enabled BOOLEAN DEFAULT false;

ALTER TABLE suq_products ADD COLUMN IF NOT EXISTS source_channel_msg_id BIGINT;
ALTER TABLE suq_products ADD COLUMN IF NOT EXISTS imported_from TEXT;

-- View tracking for weekly digest
CREATE TABLE IF NOT EXISTS suq_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES suq_shops(id) ON DELETE CASCADE,
    product_id UUID REFERENCES suq_products(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL DEFAULT 'view',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_suq_views_shop_created ON suq_views(shop_id, created_at);
CREATE INDEX IF NOT EXISTS idx_suq_views_product_created ON suq_views(product_id, created_at);
