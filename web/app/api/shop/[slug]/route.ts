import { NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase";

/** Return a stable proxy URL for a Telegram file_id, or the existing photo_url. */
function stableImgUrl(fileId: string | null, photoUrl: string | null): string | null {
  if (fileId) return `/api/img/${fileId}`;
  return photoUrl;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const supabase = getServerClient();

  // Get shop
  const { data: shop, error: shopErr } = await supabase
    .from("suq_shops")
    .select("id, shop_name, shop_slug, telegram_username, theme_color, template_style, shop_type, category, phone, location_text, description, logo_file_id, logo_url, language, tiktok_url, member_count, posts_per_week, source_channel")
    .eq("shop_slug", slug)
    .single();

  if (shopErr || !shop) {
    return NextResponse.json({ error: "Shop not found" }, { status: 404 });
  }

  // Use proxy URL for logo
  if (shop.logo_file_id) {
    shop.logo_url = `/api/img/${shop.logo_file_id}`;
  }

  // Get active products
  const { data: products } = await supabase
    .from("suq_products")
    .select("id, name, description, price, price_type, listing_type, photo_url, photo_file_id, tag, stock, tiktok_url, extra_photos")
    .eq("shop_id", shop.id)
    .eq("is_active", true)
    .order("sort_order");

  // Use proxy URLs instead of resolving raw Telegram URLs
  const resolved = (products || []).map((p) => ({
    ...p,
    photo_url: stableImgUrl(p.photo_file_id, p.photo_url),
  }));

  // ── Cross-sell: products from other shops in same category ──
  let crossSell: Record<string, unknown>[] = [];
  if (shop.category) {
    const { data: cross } = await supabase
      .from("suq_products")
      .select("id, name, price, price_type, photo_url, photo_file_id, stock, tag, suq_shops!inner(shop_name, shop_slug, category)")
      .eq("is_active", true)
      .eq("suq_shops.category", shop.category)
      .neq("shop_id", shop.id)
      .order("created_at", { ascending: false })
      .limit(4);

    crossSell = (cross || []).map((p) => {
      const s = p.suq_shops as unknown as Record<string, unknown> | null;
      return {
        id: p.id, name: p.name, price: p.price, price_type: p.price_type,
        photo_url: stableImgUrl(p.photo_file_id, p.photo_url),
        photo_file_id: p.photo_file_id,
        stock: p.stock, tag: p.tag,
        shop_name: s?.shop_name, shop_slug: s?.shop_slug,
      };
    });
  }

  return NextResponse.json({ shop, products: resolved, crossSell });
}
