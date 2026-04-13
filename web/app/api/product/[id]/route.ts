import { NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase";

/** Return a stable proxy URL for a Telegram file_id, or the existing photo_url. */
function stableImgUrl(fileId: string | null, photoUrl: string | null): string | null {
  if (fileId) return `/api/img/${fileId}`;
  return photoUrl;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getServerClient();

  // ── Fetch product ──
  const { data: product, error: prodErr } = await supabase
    .from("suq_products")
    .select("id, name, description, price, price_type, listing_type, photo_url, photo_file_id, stock, tag, created_at, shop_id")
    .eq("id", id)
    .eq("is_active", true)
    .single();

  if (prodErr || !product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  // Use proxy URL instead of raw Telegram URL
  product.photo_url = stableImgUrl(product.photo_file_id as string | null, product.photo_url as string | null);

  // ── Fetch shop ──
  const { data: shop } = await supabase
    .from("suq_shops")
    .select("id, shop_name, shop_slug, telegram_username, template_style, theme_color, shop_type, category, phone, location_text, description, logo_url, logo_file_id")
    .eq("id", product.shop_id)
    .single();

  if (!shop) {
    return NextResponse.json({ error: "Shop not found" }, { status: 404 });
  }

  // Use proxy URL for logo too
  if (shop.logo_file_id) {
    shop.logo_url = `/api/img/${shop.logo_file_id}`;
  }

  // ── More from this shop (4 other products) ──
  const { data: moreFromShop } = await supabase
    .from("suq_products")
    .select("id, name, price, price_type, photo_url, photo_file_id, stock, tag")
    .eq("shop_id", product.shop_id)
    .eq("is_active", true)
    .neq("id", id)
    .order("created_at", { ascending: false })
    .limit(4);

  const resolvedMore = (moreFromShop || []).map((p) => ({
    ...p,
    photo_url: stableImgUrl(p.photo_file_id, p.photo_url),
  }));

  // ── Similar products from other shops (same category, 4 items) ──
  let similarProducts: Record<string, unknown>[] = [];
  if (shop.category) {
    const { data: similar } = await supabase
      .from("suq_products")
      .select("id, name, price, price_type, photo_url, photo_file_id, stock, tag, suq_shops!inner(shop_name, shop_slug, category)")
      .eq("is_active", true)
      .eq("suq_shops.category", shop.category)
      .neq("shop_id", product.shop_id)
      .order("created_at", { ascending: false })
      .limit(4);

    similarProducts = (similar || []).map((p) => {
      const s = p.suq_shops as unknown as Record<string, unknown> | null;
      return {
        id: p.id,
        name: p.name,
        price: p.price,
        price_type: p.price_type,
        photo_url: stableImgUrl(p.photo_file_id, p.photo_url),
        stock: p.stock,
        tag: p.tag,
        shop_name: s?.shop_name,
        shop_slug: s?.shop_slug,
      };
    });
  }

  return NextResponse.json({
    product,
    shop,
    moreFromShop: resolvedMore,
    similarProducts,
  });
}
