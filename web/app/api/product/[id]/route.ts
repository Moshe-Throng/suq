import { NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase";

async function resolveTelegramUrl(
  fileId: string | null,
  botToken: string | null
): Promise<string | null> {
  if (!fileId || !botToken) return null;
  try {
    const res = await fetch(
      `https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`
    );
    const data = await res.json();
    if (data.ok && data.result?.file_path) {
      return `https://api.telegram.org/file/bot${botToken}/${data.result.file_path}`;
    }
  } catch { /* silent */ }
  return null;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getServerClient();
  const botToken = process.env.BOT_TOKEN;

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

  // Resolve product photo
  if (!product.photo_url && product.photo_file_id) {
    const url = await resolveTelegramUrl(product.photo_file_id, botToken);
    if (url) {
      product.photo_url = url;
      supabase.from("suq_products").update({ photo_url: url }).eq("id", id).then(() => {});
    }
  }

  // ── Fetch shop ──
  const { data: shop } = await supabase
    .from("suq_shops")
    .select("id, shop_name, shop_slug, telegram_username, template_style, theme_color, shop_type, category, phone, location_text, description, logo_url, logo_file_id")
    .eq("id", product.shop_id)
    .single();

  if (!shop) {
    return NextResponse.json({ error: "Shop not found" }, { status: 404 });
  }

  // Resolve shop logo
  if (shop.logo_file_id && !shop.logo_url) {
    const url = await resolveTelegramUrl(shop.logo_file_id, botToken);
    if (url) {
      shop.logo_url = url;
      supabase.from("suq_shops").update({ logo_url: url }).eq("id", shop.id).then(() => {});
    }
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

  const resolvedMore = await Promise.all(
    (moreFromShop || []).map(async (p) => {
      if (!p.photo_url && p.photo_file_id) {
        const url = await resolveTelegramUrl(p.photo_file_id, botToken);
        if (url) {
          p.photo_url = url;
          supabase.from("suq_products").update({ photo_url: url }).eq("id", p.id).then(() => {});
        }
      }
      return p;
    })
  );

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

    similarProducts = await Promise.all(
      (similar || []).map(async (p) => {
        if (!p.photo_url && p.photo_file_id) {
          const url = await resolveTelegramUrl(p.photo_file_id, botToken);
          if (url) {
            p.photo_url = url;
            supabase.from("suq_products").update({ photo_url: url }).eq("id", p.id).then(() => {});
          }
        }
        const s = p.suq_shops as Record<string, unknown> | null;
        return {
          id: p.id,
          name: p.name,
          price: p.price,
          price_type: p.price_type,
          photo_url: p.photo_url,
          stock: p.stock,
          tag: p.tag,
          shop_name: s?.shop_name,
          shop_slug: s?.shop_slug,
        };
      })
    );
  }

  return NextResponse.json({
    product,
    shop,
    moreFromShop: resolvedMore,
    similarProducts,
  });
}
