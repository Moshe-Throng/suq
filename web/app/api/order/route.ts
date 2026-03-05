import { NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { shop_id, product_id, buyer_name, buyer_phone, note } = body;

  if (!shop_id || !product_id || !buyer_name) {
    return NextResponse.json(
      { error: "shop_id, product_id, and buyer_name are required" },
      { status: 400 }
    );
  }

  const supabase = getServerClient();

  // Validate product belongs to shop
  const { data: product } = await supabase
    .from("suq_products")
    .select("id, name, price")
    .eq("id", product_id)
    .eq("shop_id", shop_id)
    .eq("is_active", true)
    .single();

  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  // Create order
  const { data: order, error: orderErr } = await supabase
    .from("suq_orders")
    .insert({
      shop_id,
      product_id,
      buyer_name,
      buyer_phone: buyer_phone || null,
      note: note || null,
      status: "new",
    })
    .select()
    .single();

  if (orderErr) {
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }

  // Notify seller via Telegram bot
  try {
    const { data: shop } = await supabase
      .from("suq_shops")
      .select("telegram_id, language")
      .eq("id", shop_id)
      .single();

    if (shop) {
      const noteText = note ? `\n📝 ${note}` : "";
      const phoneText = buyer_phone ? `\n📱 ${buyer_phone}` : "";
      const text =
        `📦 New order!\n\n` +
        `${product.name} — ${product.price.toLocaleString()} Birr\n` +
        `👤 ${buyer_name}${phoneText}${noteText}`;

      const botToken = process.env.BOT_TOKEN;
      if (botToken) {
        await fetch(
          `https://api.telegram.org/bot${botToken}/sendMessage`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: shop.telegram_id,
              text,
              reply_markup: {
                inline_keyboard: [
                  [
                    { text: "✅ Accept", callback_data: `order_accept_${order.id}` },
                    { text: "❌ Reject", callback_data: `order_reject_${order.id}` },
                  ],
                ],
              },
            }),
          }
        );
      }
    }
  } catch {
    // Non-fatal — order is already saved
  }

  return NextResponse.json({ success: true, order_id: order.id });
}
