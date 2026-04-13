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

  // Real-time notification for high-value events
  if (event_type === "contact_tap" || event_type === "view") {
    const botToken = process.env.BOT_TOKEN;
    const adminId = process.env.ADMIN_CHAT_ID || process.env.OWNER_CHAT_ID;
    if (botToken && adminId) {
      try {
        // Get shop name
        const { data: shop } = await supabase
          .from("suq_shops")
          .select("shop_name, shop_slug")
          .eq("id", shop_id)
          .single();

        let productName = "";
        if (product_id) {
          const { data: prod } = await supabase
            .from("suq_products")
            .select("name")
            .eq("id", product_id)
            .single();
          if (prod) productName = prod.name;
        }

        const emoji = event_type === "contact_tap" ? "📞" : "👀";
        const eventLabel = event_type === "contact_tap" ? "CONTACT TAP" : "Shop View";
        const text = `${emoji} ${eventLabel}: ${shop?.shop_name || "Unknown"}\n${productName ? `Product: ${productName}\n` : ""}🔗 souk.et/${shop?.shop_slug || ""}`;

        // Fire and forget — don't slow down the response
        fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: adminId, text, disable_notification: event_type === "view" }),
        }).catch(() => {});
      } catch {
        // Silent — tracking should never fail the request
      }
    }
  }

  return NextResponse.json({ ok: true });
}
