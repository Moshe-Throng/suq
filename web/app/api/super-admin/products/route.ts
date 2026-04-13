import { NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase";

const ADMIN_KEY = process.env.ADMIN_SECRET || "souk-admin-2026";

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  if (key !== ADMIN_KEY) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const shop = req.nextUrl.searchParams.get("shop") || "";
  const offset = parseInt(req.nextUrl.searchParams.get("offset") || "0", 10);
  const limit = 50;

  const supabase = getServerClient();

  let query = supabase
    .from("suq_products")
    .select("id, name, price, photo_file_id, photo_url, is_active, tag, shop_id, suq_shops!inner(shop_name, shop_slug)")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (shop) {
    query = query.eq("suq_shops.shop_slug", shop);
  }

  const { data, count } = await query;

  const products = (data || []).map((p) => {
    const s = p.suq_shops as unknown as Record<string, unknown>;
    return {
      id: p.id,
      name: p.name,
      price: p.price,
      photo_url: p.photo_file_id ? `/api/img/${p.photo_file_id}` : p.photo_url,
      tag: p.tag,
      shop_name: s?.shop_name,
      shop_slug: s?.shop_slug,
    };
  });

  // Shop list for filter
  const { data: shops } = await supabase
    .from("suq_shops")
    .select("shop_name, shop_slug")
    .order("shop_name");

  return NextResponse.json({ products, shops: shops || [], total: count || 0 });
}

export async function DELETE(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  if (key !== ADMIN_KEY) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const supabase = getServerClient();
  await supabase.from("suq_products").update({ is_active: false }).eq("id", id);

  return NextResponse.json({ ok: true });
}
