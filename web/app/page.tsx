import { getServerClient } from "@/lib/supabase";
import MarketplaceClient from "./marketplace-client";

export const revalidate = 60; // ISR: revalidate every 60s

async function resolveTgUrl(fileId: string, token: string): Promise<string | null> {
  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`);
    const d = await r.json();
    if (d.ok && d.result?.file_path) {
      return `https://api.telegram.org/file/bot${token}/${d.result.file_path}`;
    }
  } catch { /* silent */ }
  return null;
}

export default async function MarketplacePage() {
  const supabase = getServerClient();
  const botToken = process.env.BOT_TOKEN ?? "";

  // ── Fetch initial products (newest 20) ──
  const { data: rawProducts } = await supabase
    .from("suq_products")
    .select(
      "id, name, price, price_type, photo_url, photo_file_id, stock, tag, created_at, shop_id, suq_shops!inner(shop_name, shop_slug, category, template_style)"
    )
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .range(0, 19);

  // Resolve any missing Telegram photo URLs and write back to DB
  const products = await Promise.all((rawProducts || []).map(async (p) => {
    const s = p.suq_shops as unknown as Record<string, unknown> | null;
    let photoUrl = p.photo_url as string | null;

    if (!photoUrl && p.photo_file_id && botToken) {
      const fresh = await resolveTgUrl(p.photo_file_id as string, botToken);
      if (fresh) {
        photoUrl = fresh;
        // Fire-and-forget: update DB so future renders use the resolved URL
        supabase.from("suq_products").update({ photo_url: fresh }).eq("id", p.id as string).then(() => {});
      }
    }

    return {
      id: p.id as string,
      name: p.name as string,
      price: p.price as number | null,
      price_type: p.price_type as string | null,
      photo_url: photoUrl,
      photo_file_id: (p.photo_file_id as string) || null,
      stock: p.stock as number | null,
      tag: p.tag as string | null,
      created_at: p.created_at as string,
      shop_name: (s?.shop_name as string) || "",
      shop_slug: (s?.shop_slug as string) || "",
      shop_category: (s?.category as string) || "",
      shop_template_style: (s?.template_style as string) || "",
    };
  }));

  // ── Category counts ──
  const { data: allProds } = await supabase
    .from("suq_products")
    .select("id, suq_shops!inner(category)")
    .eq("is_active", true);

  const categoryCounts: Record<string, number> = {};
  for (const p of allProds || []) {
    const s = p.suq_shops as unknown as Record<string, unknown> | null;
    const c = (s?.category as string) || "other";
    categoryCounts[c] = (categoryCounts[c] || 0) + 1;
  }

  // ── Shops with product counts ──
  const { data: shops } = await supabase
    .from("suq_shops")
    .select("id, shop_name, shop_slug, category, location_text, logo_url, template_style, description")
    .order("created_at", { ascending: false });

  const { data: prodCounts } = await supabase
    .from("suq_products")
    .select("shop_id")
    .eq("is_active", true);

  const countMap: Record<string, number> = {};
  for (const p of prodCounts || []) countMap[p.shop_id] = (countMap[p.shop_id] || 0) + 1;

  const shopsWithCounts = (shops || [])
    .map((s) => ({
      shop_name: s.shop_name as string,
      shop_slug: s.shop_slug as string,
      category: s.category as string | null,
      location_text: s.location_text as string | null,
      logo_url: s.logo_url as string | null,
      template_style: s.template_style as string | null,
      description: s.description as string | null,
      product_count: countMap[s.id as string] || 0,
    }))
    .filter((s) => s.product_count > 0);

  const totalProducts = Object.values(categoryCounts).reduce((a, b) => a + b, 0);

  // Shop count for free tier CTA
  const { count: shopCount } = await supabase
    .from("suq_shops")
    .select("id", { count: "exact", head: true });

  return (
    <MarketplaceClient
      initialProducts={products}
      initialShops={shopsWithCounts}
      categoryCounts={categoryCounts}
      totalProducts={totalProducts}
      shopCount={shopCount || 0}
    />
  );
}
