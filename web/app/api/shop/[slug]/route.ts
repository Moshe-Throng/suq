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
    .select("id, shop_name, shop_slug, telegram_username, theme_color, description, logo_file_id, logo_url")
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
    .select("id, name, description, price, photo_url, photo_file_id")
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

  return NextResponse.json({ shop, products: resolved });
}
