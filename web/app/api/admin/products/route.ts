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

  if (error) {
    console.error("Supabase error:", error.message);
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
  return NextResponse.json({ products: data });
}

/** POST: Create a new product */
export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, price, price_type, description, tag, stock, photo_url, photo_file_id, listing_type, tiktok_url, extra_photos } = body;

  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Product name is required" }, { status: 400 });
  }
  if (name.trim().length > 200) {
    return NextResponse.json({ error: "Name too long (max 200)" }, { status: 400 });
  }
  if (description && typeof description === "string" && description.length > 2000) {
    return NextResponse.json({ error: "Description too long (max 2000)" }, { status: 400 });
  }
  if (price !== undefined && price !== null && (typeof price !== "number" || price < 0 || price > 10_000_000)) {
    return NextResponse.json({ error: "Invalid price" }, { status: 400 });
  }
  if (stock !== undefined && stock !== null && (typeof stock !== "number" || stock < 0 || stock > 99999)) {
    return NextResponse.json({ error: "Invalid stock" }, { status: 400 });
  }

  const MAX_PRODUCTS = 15;
  const supabase = getServerClient();

  // Check product limit
  const { count: productCount } = await supabase
    .from("suq_products")
    .select("id", { count: "exact", head: true })
    .eq("shop_id", session.sid)
    .eq("is_active", true);

  if ((productCount ?? 0) >= MAX_PRODUCTS) {
    return NextResponse.json(
      { error: `Free plan limit: ${MAX_PRODUCTS} products. Remove some to add more.` },
      { status: 403 }
    );
  }

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
      photo_file_id: photo_file_id || null,
      listing_type: listing_type || "product",
      tiktok_url: tiktok_url || null,
      extra_photos: extra_photos || null,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    console.error("Supabase error:", error.message);
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
  return NextResponse.json({ product: data }, { status: 201 });
}
