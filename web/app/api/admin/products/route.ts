import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { getServerClient } from "@/lib/supabase";

/** GET: List all products for the authenticated shop (including inactive) */
export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getServerClient();
  const { data, error } = await supabase
    .from("suq_products")
    .select("*")
    .eq("shop_id", session.sid)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ products: data });
}

/** POST: Create a new product */
export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, price, price_type, description, tag, stock, photo_url, listing_type } = body;

  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Product name is required" }, { status: 400 });
  }

  const supabase = getServerClient();
  const { data, error } = await supabase
    .from("suq_products")
    .insert({
      shop_id: session.sid,
      name: name.trim(),
      price: price ?? null,
      price_type: price_type || "fixed",
      description: description?.trim() || null,
      tag: tag || null,
      stock: stock ?? null,
      photo_url: photo_url || null,
      listing_type: listing_type || "product",
      is_active: true,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ product: data }, { status: 201 });
}
