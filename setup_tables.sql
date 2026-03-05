-- Suq tables (run in DeckForge Supabase project)

CREATE TABLE IF NOT EXISTS suq_shops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    telegram_id BIGINT UNIQUE NOT NULL,
    telegram_username TEXT,
    shop_name TEXT NOT NULL,
    shop_slug TEXT UNIQUE NOT NULL,
    language TEXT DEFAULT 'am',
    plan TEXT DEFAULT 'free',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS suq_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES suq_shops(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    price INTEGER NOT NULL,
    photo_file_id TEXT,
    photo_url TEXT,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS suq_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES suq_shops(id),
    product_id UUID NOT NULL REFERENCES suq_products(id),
    buyer_telegram_id BIGINT,
    buyer_name TEXT,
    buyer_username TEXT,
    buyer_phone TEXT,
    quantity INTEGER DEFAULT 1,
    note TEXT,
    status TEXT DEFAULT 'new',
    created_at TIMESTAMPTZ DEFAULT now()
);
