import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { getServerClient } from "@/lib/supabase";

/** PATCH: Update a product */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const supabase = getServerClient();

  // Verify ownership
  const { data: existing } = await supabase
    .from("suq_products")
    .select("shop_id")
    .eq("id", id)
    .single();

  if (!existing || existing.shop_id !== session.sid) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const allowed = ["name", "price", "price_type", "description", "tag", "stock", "photo_url", "photo_file_id", "is_active", "listing_type", "tiktok_url", "extra_photos"];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) updates[key] = body[key];
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("suq_products")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ product: data });
}

/** DELETE: Soft-delete (set is_active = false) */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const supabase = getServerClient();

  const { data: existing } = await supabase
    .from("suq_products")
    .select("shop_id")
    .eq("id", id)
    .single();

  if (!existing || existing.shop_id !== session.sid) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await supabase
    .from("suq_products")
    .update({ is_active: false })
    .eq("id", id);

  return NextResponse.json({ success: true });
}
