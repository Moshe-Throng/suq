import { getServerClient } from "@/lib/supabase";
import MarketplaceClient from "./marketplace-client";

export const revalidate = 60; // ISR: revalidate every 60s

export default async function MarketplacePage() {
  const supabase = getServerClient();

  // Run all independent queries in parallel — no Telegram API calls
  const [productsRes, categoriesRes, shopsRes, shopCountRes] = await Promise.all([
    // Latest 20 products
    supabase
      .from("suq_products")
      .select(
        "id, name, price, price_type, photo_url, photo_file_id, stock, tag, created_at, shop_id, suq_shops!inner(shop_name, shop_slug, category, template_style)"
      )
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .range(0, 19),

    // Category counts
    supabase
      .from("suq_products")
      .select("suq_shops!inner(category)")
      .eq("is_active", true),

    // Shops
    supabase
      .from("suq_shops")
      .select("id, shop_name, shop_slug, category, location_text, logo_url, logo_file_id, template_style, description")
      .order("created_at", { ascending: false }),

    // Total shop count
    supabase
      .from("suq_shops")
      .select("id", { count: "exact", head: true }),
  ]);

  // Flatten products — use photo_file_id for /api/img proxy, no Telegram resolution needed
  const products = (productsRes.data || []).map((p) => {
    const s = p.suq_shops as unknown as Record<string, unknown> | null;
    return {
      id: p.id as string,
      name: p.name as string,
      price: p.price as number | null,
      price_type: p.price_type as string | null,
      photo_url: p.photo_url as string | null,
      photo_file_id: (p.photo_file_id as string) || null,
      stock: p.stock as number | null,
      tag: p.tag as string | null,
      created_at: p.created_at as string,
      shop_name: (s?.shop_name as string) || "",
      shop_slug: (s?.shop_slug as string) || "",
      shop_category: (s?.category as string) || "",
      shop_template_style: (s?.template_style as string) || "",
    };
  });

  // Category counts
  const categoryCounts: Record<string, number> = {};
  for (const p of categoriesRes.data || []) {
    const s = p.suq_shops as unknown as Record<string, unknown> | null;
    const c = (s?.category as string) || "other";
    categoryCounts[c] = (categoryCounts[c] || 0) + 1;
  }

  // Shop product counts
  const { data: prodCounts } = await supabase
    .from("suq_products")
    .select("shop_id")
    .eq("is_active", true);

  const countMap: Record<string, number> = {};
  for (const p of prodCounts || []) countMap[p.shop_id] = (countMap[p.shop_id] || 0) + 1;

  const shopsWithCounts = (shopsRes.data || [])
    .map((s) => ({
      shop_name: s.shop_name as string,
      shop_slug: s.shop_slug as string,
      category: s.category as string | null,
      location_text: s.location_text as string | null,
      logo_url: s.logo_url as string | null,
      logo_file_id: s.logo_file_id as string | null,
      template_style: s.template_style as string | null,
      description: s.description as string | null,
      product_count: countMap[s.id as string] || 0,
    }))
    .filter((s) => s.product_count > 0);

  const totalProducts = Object.values(categoryCounts).reduce((a, b) => a + b, 0);

  return (
    <MarketplaceClient
      initialProducts={products}
      initialShops={shopsWithCounts}
      categoryCounts={categoryCounts}
      totalProducts={totalProducts}
      shopCount={shopCountRes.count || 0}
    />
  );
}
