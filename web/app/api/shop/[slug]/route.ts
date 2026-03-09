import { NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const supabase = getServerClient();

  // Get shop
  const { data: shop, error: shopErr } = await supabase
    .from("suq_shops")
    .select("id, shop_name, shop_slug, telegram_username, theme_color, template_style, shop_type, category, phone, location_text, description, logo_file_id, logo_url")
    .eq("shop_slug", slug)
    .single();

  if (shopErr || !shop) {
    return NextResponse.json({ error: "Shop not found" }, { status: 404 });
  }

  const botToken = process.env.BOT_TOKEN;

  // Resolve logo URL if missing
  if (shop.logo_file_id && !shop.logo_url && botToken) {
    try {
      const logoRes = await fetch(
        `https://api.telegram.org/bot${botToken}/getFile?file_id=${shop.logo_file_id}`
      );
      const logoData = await logoRes.json();
      if (logoData.ok && logoData.result?.file_path) {
        shop.logo_url = `https://api.telegram.org/file/bot${botToken}/${logoData.result.file_path}`;
        supabase
          .from("suq_shops")
          .update({ logo_url: shop.logo_url })
          .eq("id", shop.id)
          .then(() => {});
      }
    } catch {
      // silent
    }
  }

  // Get active products
  const { data: products } = await supabase
    .from("suq_products")
    .select("id, name, description, price, price_type, listing_type, photo_url, photo_file_id, tag, stock")
    .eq("shop_id", shop.id)
    .eq("is_active", true)
    .order("sort_order");

  // Resolve Telegram file URLs for products missing photo_url
  const resolved = await Promise.all(
    (products || []).map(async (p) => {
      if (p.photo_url) return p;
      if (!p.photo_file_id || !botToken) return p;
      try {
        const res = await fetch(
          `https://api.telegram.org/bot${botToken}/getFile?file_id=${p.photo_file_id}`
        );
        const data = await res.json();
        if (data.ok && data.result?.file_path) {
          const url = `https://api.telegram.org/file/bot${botToken}/${data.result.file_path}`;
          // Save for next time (fire-and-forget)
          supabase
            .from("suq_products")
            .update({ photo_url: url })
            .eq("id", p.id)
            .then(() => {});
          return { ...p, photo_url: url };
        }
      } catch {
        // silent
      }
      return p;
    })
  );

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

    crossSell = await Promise.all(
      (cross || []).map(async (p) => {
        if (!p.photo_url && p.photo_file_id && botToken) {
          try {
            const res = await fetch(
              `https://api.telegram.org/bot${botToken}/getFile?file_id=${p.photo_file_id}`
            );
            const data = await res.json();
            if (data.ok && data.result?.file_path) {
              p.photo_url = `https://api.telegram.org/file/bot${botToken}/${data.result.file_path}`;
              supabase.from("suq_products").update({ photo_url: p.photo_url }).eq("id", p.id).then(() => {});
            }
          } catch { /* silent */ }
        }
        const s = p.suq_shops as unknown as Record<string, unknown> | null;
        return {
          id: p.id, name: p.name, price: p.price, price_type: p.price_type,
          photo_url: p.photo_url, stock: p.stock, tag: p.tag,
          shop_name: s?.shop_name, shop_slug: s?.shop_slug,
        };
      })
    );
  }

  return NextResponse.json({ shop, products: resolved, crossSell });
}
