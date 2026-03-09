import { NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const q = url.searchParams.get("q")?.trim() || "";
  const category = url.searchParams.get("category")?.trim() || "";
  const sort = url.searchParams.get("sort") || "newest";
  const offset = parseInt(url.searchParams.get("offset") || "0", 10);
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "20", 10), 50);

  const supabase = getServerClient();
  const botToken = process.env.BOT_TOKEN;

  // ── Category counts (all active products grouped by shop category) ──
  const { data: allProducts } = await supabase
    .from("suq_products")
    .select("id, suq_shops!inner(category)")
    .eq("is_active", true);

  const categoryCounts: Record<string, number> = {};
  for (const p of allProducts || []) {
    const cat = (p as Record<string, unknown>).suq_shops as Record<string, unknown> | null;
    const c = (cat?.category as string) || "other";
    categoryCounts[c] = (categoryCounts[c] || 0) + 1;
  }

  // ── Shops list (with product counts) ──
  const { data: shops } = await supabase
    .from("suq_shops")
    .select("shop_name, shop_slug, category, location_text, logo_url, logo_file_id, template_style, description")
    .order("created_at", { ascending: false });

  // Count products per shop
  const { data: shopProductCounts } = await supabase
    .from("suq_products")
    .select("shop_id")
    .eq("is_active", true);

  const countByShop: Record<string, number> = {};
  for (const p of shopProductCounts || []) {
    countByShop[p.shop_id] = (countByShop[p.shop_id] || 0) + 1;
  }

  // Get shop IDs for mapping
  const { data: shopIdMap } = await supabase
    .from("suq_shops")
    .select("id, shop_slug");

  const slugToId: Record<string, string> = {};
  for (const s of shopIdMap || []) slugToId[s.shop_slug] = s.id;

  const shopsWithCounts = (shops || [])
    .map((s) => ({
      ...s,
      product_count: countByShop[slugToId[s.shop_slug]] || 0,
    }))
    .filter((s) => s.product_count > 0);

  // Resolve shop logos
  for (const s of shopsWithCounts) {
    if (s.logo_file_id && !s.logo_url && botToken) {
      try {
        const res = await fetch(
          `https://api.telegram.org/bot${botToken}/getFile?file_id=${s.logo_file_id}`
        );
        const data = await res.json();
        if (data.ok && data.result?.file_path) {
          s.logo_url = `https://api.telegram.org/file/bot${botToken}/${data.result.file_path}`;
        }
      } catch { /* silent */ }
    }
  }

  // ── Products query (with search, category filter, sort, pagination) ──
  let query = supabase
    .from("suq_products")
    .select(
      "id, name, price, price_type, photo_url, photo_file_id, stock, tag, created_at, shop_id, suq_shops!inner(shop_name, shop_slug, category, template_style)",
      { count: "exact" }
    )
    .eq("is_active", true);

  if (category) {
    query = query.eq("suq_shops.category", category);
  }

  if (q.length >= 3) {
    query = query.or(`name.ilike.%${q}%,tag.ilike.%${q}%`);
  }

  if (sort === "price_asc") {
    query = query.order("price", { ascending: true, nullsFirst: false });
  } else if (sort === "price_desc") {
    query = query.order("price", { ascending: false, nullsFirst: true });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  query = query.range(offset, offset + limit - 1);

  const { data: products, count } = await query;

  // Flatten shop join + resolve photo URLs
  const resolved = await Promise.all(
    (products || []).map(async (p) => {
      const shop = p.suq_shops as unknown as Record<string, unknown> | null;
      const flat = {
        id: p.id,
        name: p.name,
        price: p.price,
        price_type: p.price_type,
        photo_url: p.photo_url,
        stock: p.stock,
        tag: p.tag,
        created_at: p.created_at,
        shop_name: shop?.shop_name as string,
        shop_slug: shop?.shop_slug as string,
        shop_category: shop?.category as string,
        shop_template_style: shop?.template_style as string,
      };

      // Resolve Telegram photo if needed
      if (!flat.photo_url && p.photo_file_id && botToken) {
        try {
          const res = await fetch(
            `https://api.telegram.org/bot${botToken}/getFile?file_id=${p.photo_file_id}`
          );
          const data = await res.json();
          if (data.ok && data.result?.file_path) {
            flat.photo_url = `https://api.telegram.org/file/bot${botToken}/${data.result.file_path}`;
            supabase
              .from("suq_products")
              .update({ photo_url: flat.photo_url })
              .eq("id", p.id)
              .then(() => {});
          }
        } catch { /* silent */ }
      }

      return flat;
    })
  );

  return NextResponse.json({
    products: resolved,
    shops: shopsWithCounts,
    categoryCounts,
    total: count || 0,
  });
}
