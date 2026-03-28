import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { getServerClient } from "@/lib/supabase";

/** PATCH: Update shop settings */
export async function PATCH(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const allowed = [
    "shop_name", "description", "location_text", "category",
    "template_style", "phone", "email", "logo_url", "shop_type",
    "tiktok_url",
  ];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) updates[key] = body[key];
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  // Validate lengths
  if (updates.shop_name && typeof updates.shop_name === "string" && updates.shop_name.length > 100) {
    return NextResponse.json({ error: "Shop name too long (max 100)" }, { status: 400 });
  }
  if (updates.description && typeof updates.description === "string" && updates.description.length > 500) {
    return NextResponse.json({ error: "Description too long (max 500)" }, { status: 400 });
  }
  if (updates.phone && typeof updates.phone === "string" && updates.phone.length > 20) {
    return NextResponse.json({ error: "Phone too long" }, { status: 400 });
  }
  if (updates.email && typeof updates.email === "string" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(updates.email as string)) {
    return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
  }
  if (updates.tiktok_url && typeof updates.tiktok_url === "string") {
    if (!/^https?:\/\/(www\.)?tiktok\.com\//.test(updates.tiktok_url as string)) {
      return NextResponse.json({ error: "Invalid TikTok URL" }, { status: 400 });
    }
    if ((updates.tiktok_url as string).length > 255) {
      return NextResponse.json({ error: "TikTok URL too long" }, { status: 400 });
    }
  }

  const supabase = getServerClient();
  const { data, error } = await supabase
    .from("suq_shops")
    .update(updates)
    .eq("id", session.sid)
    .select()
    .single();

  if (error) {
    console.error("Supabase error:", error.message);
    return NextResponse.json({ error: "Failed to update shop" }, { status: 500 });
  }
  return NextResponse.json({ shop: data });
}
