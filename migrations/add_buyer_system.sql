-- Buyer profiles and intent subscriptions
CREATE TABLE IF NOT EXISTS suq_buyers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    telegram_id BIGINT UNIQUE NOT NULL,
    username TEXT,
    first_name TEXT,
    language TEXT DEFAULT 'am',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS suq_buyer_intents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    buyer_id UUID NOT NULL REFERENCES suq_buyers(id) ON DELETE CASCADE,
    intent_type TEXT NOT NULL,          -- 'kids', 'fashion', 'electronics', 'home', 'pets', 'gifts', 'wholesale', 'expat'
    details JSONB,                       -- {"ages": [3], "sizes": ["28"], "budget_max": 2000, "query": "Samsung A54"}
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_buyer_intents_type ON suq_buyer_intents(intent_type) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_buyers_tg ON suq_buyers(telegram_id);

-- Buyer push log (prevent spam)
CREATE TABLE IF NOT EXISTS suq_buyer_pushes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    buyer_id UUID NOT NULL REFERENCES suq_buyers(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES suq_products(id) ON DELETE CASCADE,
    pushed_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(buyer_id, product_id)
);

-- Add stock_status to products for structured parsing
ALTER TABLE suq_products ADD COLUMN IF NOT EXISTS stock_status TEXT DEFAULT 'in_stock';
ALTER TABLE suq_products ADD COLUMN IF NOT EXISTS seller_phone TEXT;
