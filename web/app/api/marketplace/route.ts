import { NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const q = url.searchParams.get("q")?.trim() || "";
  const category = url.searchParams.get("category")?.trim() || "";
  const categories = url.searchParams.get("categories")?.split(",").filter(Boolean) || [];
  const sort = url.searchParams.get("sort") || "newest";
  const offset = parseInt(url.searchParams.get("offset") || "0", 10);
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "20", 10), 50);

  const supabase = getServerClient();

  // ── Run independent queries in parallel ──
  const [categoriesRes, shopsRes, shopCountRes, productsRes] = await Promise.all([
    // Category counts via RPC or grouped query
    supabase
      .from("suq_products")
      .select("suq_shops!inner(category)")
      .eq("is_active", true),

    // Shops with their product counts — single query, no photo resolution
    supabase
      .from("suq_shops")
      .select("id, shop_name, shop_slug, category, location_text, logo_url, logo_file_id, template_style, description")
      .order("created_at", { ascending: false }),

    // Total shop count
    supabase
      .from("suq_shops")
      .select("id", { count: "exact", head: true }),

    // Products query (paginated)
    (() => {
      let query = supabase
        .from("suq_products")
        .select(
          "id, name, price, price_type, photo_url, photo_file_id, stock, tag, created_at, shop_id, suq_shops!inner(shop_name, shop_slug, category, template_style)",
          { count: "exact" }
        )
        .eq("is_active", true)
        .not("price", "is", null);

      if (category) {
        query = query.eq("suq_shops.category", category);
      } else if (categories.length > 0) {
        query = query.in("suq_shops.category", categories);
      }

      if (q.length >= 2) {
        query = query.or(`name.ilike.%${q}%,tag.ilike.%${q}%`);
      }

      if (sort === "price_asc") {
        query = query.order("price", { ascending: true, nullsFirst: false });
      } else if (sort === "price_desc") {
        query = query.order("price", { ascending: false, nullsFirst: true });
      } else {
        query = query.order("created_at", { ascending: false });
      }

      return query.range(offset, offset + limit - 1);
    })(),
  ]);

  // ── Category counts ──
  const categoryCounts: Record<string, number> = {};
  for (const p of categoriesRes.data || []) {
    const cat = (p as Record<string, unknown>).suq_shops as Record<string, unknown> | null;
    const c = (cat?.category as string) || "other";
    categoryCounts[c] = (categoryCounts[c] || 0) + 1;
  }

  // ── Shops with product counts ──
  // Count products per shop from the categories query (already fetched)
  const countByShop: Record<string, number> = {};
  for (const p of categoriesRes.data || []) {
    // We need shop_id — but categories query doesn't have it.
    // Use a lightweight count approach instead.
  }

  // Product count per shop — derive from products if available, or do a lightweight query
  const { data: shopProdCounts } = await supabase
    .from("suq_products")
    .select("shop_id")
    .eq("is_active", true);

  const countMap: Record<string, number> = {};
  for (const p of shopProdCounts || []) {
    countMap[p.shop_id] = (countMap[p.shop_id] || 0) + 1;
  }

  const shopsWithCounts = (shopsRes.data || [])
    .map((s) => ({
      shop_name: s.shop_name,
      shop_slug: s.shop_slug,
      category: s.category,
      location_text: s.location_text,
      logo_url: s.logo_url,
      logo_file_id: s.logo_file_id,
      template_style: s.template_style,
      description: s.description,
      product_count: countMap[s.id] || 0,
    }))
    .filter((s) => s.product_count > 0);

  // ── Flatten products (no Telegram API calls — use /api/img proxy instead) ──
  const resolved = (productsRes.data || []).map((p) => {
    const shop = p.suq_shops as unknown as Record<string, unknown> | null;
    return {
      id: p.id,
      name: p.name,
      price: p.price,
      price_type: p.price_type,
      photo_url: p.photo_url,
      photo_file_id: p.photo_file_id || null,
      stock: p.stock,
      tag: p.tag,
      created_at: p.created_at,
      shop_name: shop?.shop_name as string,
      shop_slug: shop?.shop_slug as string,
      shop_category: shop?.category as string,
      shop_template_style: shop?.template_style as string,
    };
  });

  return NextResponse.json({
    products: resolved,
    shops: shopsWithCounts,
    categoryCounts,
    total: productsRes.count || 0,
    shopCount: shopCountRes.count || 0,
  });
}
