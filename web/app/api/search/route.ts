import { NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const q = url.searchParams.get("q")?.trim() || "";
  const mode = url.searchParams.get("mode") || "search"; // "search" | "compare"
  const category = url.searchParams.get("category")?.trim() || "";
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "20", 10), 50);

  const supabase = getServerClient();
  const botToken = process.env.BOT_TOKEN;

  let query = supabase
    .from("suq_products")
    .select(
      "id, name, price, price_type, description, photo_url, photo_file_id, stock, tag, created_at, shop_id, " +
      "suq_shops!inner(shop_name, shop_slug, category, location_text)",
      { count: "exact" }
    )
    .eq("is_active", true);

  // Category filter
  if (category) {
    query = query.eq("suq_shops.category", category);
  }

  // Text search
  if (q.length >= 2) {
    query = query.or(`name.ilike.%${q}%,description.ilike.%${q}%,tag.ilike.%${q}%`);
  }

  // Price comparison mode: sort by price, exclude null prices
  if (mode === "compare") {
    query = query.not("price", "is", null).order("price", { ascending: true });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  query = query.limit(limit);

  const { data: products, count } = await query;

  // Flatten + resolve photos
  const resolved = await Promise.all(
    (products || []).map(async (p) => {
      const row = p as unknown as Record<string, unknown>;
      const shop = row.suq_shops as Record<string, unknown> | null;
      let photoUrl = row.photo_url as string | null;

      if (!photoUrl && row.photo_file_id && botToken) {
        try {
          const res = await fetch(
            `https://api.telegram.org/bot${botToken}/getFile?file_id=${row.photo_file_id}`
          );
          const data = await res.json();
          if (data.ok && data.result?.file_path) {
            photoUrl = `https://api.telegram.org/file/bot${botToken}/${data.result.file_path}`;
            supabase
              .from("suq_products")
              .update({ photo_url: photoUrl })
              .eq("id", row.id as string)
              .then(() => {});
          }
        } catch { /* silent */ }
      }

      return {
        id: row.id as string,
        name: row.name as string,
        price: row.price as number | null,
        price_type: row.price_type as string | null,
        description: row.description as string | null,
        photo_url: photoUrl,
        photo_file_id: (row.photo_file_id as string) || null,
        stock: row.stock as number | null,
        tag: row.tag as string | null,
        created_at: row.created_at as string,
        shop_name: (shop?.shop_name as string) || "",
        shop_slug: (shop?.shop_slug as string) || "",
        shop_category: (shop?.category as string) || "",
        shop_location: (shop?.location_text as string) || "",
      };
    })
  );

  return NextResponse.json({
    products: resolved,
    total: count || 0,
    query: q,
    mode,
  });
}
