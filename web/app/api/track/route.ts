import { NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase";

/** POST: Track a view, contact_tap, or share event */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { shop_id, product_id, event_type } = body;

  if (!shop_id || !event_type) {
    return NextResponse.json({ error: "shop_id and event_type required" }, { status: 400 });
  }

  const allowed = ["view", "contact_tap", "share"];
  if (!allowed.includes(event_type)) {
    return NextResponse.json({ error: "Invalid event_type" }, { status: 400 });
  }

  const supabase = getServerClient();
  const data: Record<string, unknown> = { shop_id, event_type };
  if (product_id) data.product_id = product_id;

  await supabase.from("suq_views").insert(data);
  return NextResponse.json({ ok: true });
}
