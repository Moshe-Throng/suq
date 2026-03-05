import { NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase";

function formatPrice(price: number | null, priceType: string): string {
  if (priceType === "contact" || price === null) return "Contact for pricing";
  if (priceType === "starting_from") return `From ${price.toLocaleString()} Birr`;
  return `${price.toLocaleString()} Birr`;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { shop_id, product_id, buyer_name, buyer_phone, note, message } = body;

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
    .select("id, name, price, price_type, listing_type")
    .eq("id", product_id)
    .eq("shop_id", shop_id)
    .eq("is_active", true)
    .single();

  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  const inquiryMessage = message || note || null;

  // Create inquiry (stored in suq_orders table)
  const { data: order, error: orderErr } = await supabase
    .from("suq_orders")
    .insert({
      shop_id,
      product_id,
      buyer_name,
      buyer_phone: buyer_phone || null,
      note: inquiryMessage,
      message: inquiryMessage,
      status: "new",
    })
    .select()
    .single();

  if (orderErr) {
    return NextResponse.json({ error: "Failed to create inquiry" }, { status: 500 });
  }

  // Notify seller via Telegram bot
  try {
    const { data: shop } = await supabase
      .from("suq_shops")
      .select("telegram_id, language")
      .eq("id", shop_id)
      .single();

    if (shop) {
      const priceDisplay = formatPrice(product.price, product.price_type || "fixed");
      const phoneText = buyer_phone ? `\n📱 ${buyer_phone}` : "";
      const noteText = inquiryMessage ? `\n📝 ${inquiryMessage}` : "";
      const text =
        `📩 New inquiry!\n\n` +
        `${product.name} — ${priceDisplay}\n` +
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
                    { text: "✅ Mark as Seen", callback_data: `inq_seen_${order.id}` },
                  ],
                ],
              },
            }),
          }
        );
      }
    }
  } catch {
    // Non-fatal — inquiry is already saved
  }

  return NextResponse.json({ success: true, order_id: order.id });
}
