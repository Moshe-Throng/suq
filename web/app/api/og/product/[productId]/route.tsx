import { ImageResponse } from "next/og";
import { getServerClient } from "@/lib/supabase";

const TEMPLATE_COLORS: Record<string, string> = {
  purple: "#7C3AED",
  blue: "#2563EB",
  cyan: "#06B6D4",
  teal: "#0D9488",
  green: "#059669",
  orange: "#EA580C",
  red: "#E11D48",
  amber: "#D97706",
  charcoal: "#374151",
  brown: "#92400E",
  // legacy
  clean: "#7C3AED",
  bold: "#06B6D4",
  minimal: "#374151",
  ethiopian: "#92400E",
  fresh: "#0D9488",
  warm: "#EA580C",
};

function priceText(price: number | null, priceType: string | null): string {
  if (priceType === "contact" || price === null) return "Contact for pricing";
  if (priceType === "starting_from") return `From ${price.toLocaleString()} Birr`;
  return `${price.toLocaleString()} Birr`;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  const { productId } = await params;
  const supabase = getServerClient();

  const { data: product } = await supabase
    .from("suq_products")
    .select("name, price, price_type, photo_url, shop_id")
    .eq("id", productId)
    .single();

  if (!product) {
    return new Response("Not found", { status: 404 });
  }

  const { data: shop } = await supabase
    .from("suq_shops")
    .select("shop_name, template_style")
    .eq("id", product.shop_id)
    .single();

  const accent = TEMPLATE_COLORS[shop?.template_style || "clean"] || "#7C3AED";
  const pd = priceText(product.price, product.price_type);
  const shopName = shop?.shop_name || "Souk.et";

  // Slightly lighter version of accent for the divider / tint
  const accentLight = accent + "33"; // 20% opacity

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          fontFamily: "sans-serif",
          background: "#fff",
        }}
      >
        {/* Left: product photo */}
        <div
          style={{
            width: "580px",
            height: "630px",
            display: "flex",
            background: "#F0F0F4",
            position: "relative",
            flexShrink: 0,
          }}
        >
          {product.photo_url ? (
            <img
              src={product.photo_url}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          ) : (
            <div
              style={{
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: accentLight,
                fontSize: "120px",
                color: accent,
              }}
            >
              🛍
            </div>
          )}
          {/* Top accent bar */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "6px",
              background: accent,
            }}
          />
        </div>

        {/* Right: info panel */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            background: accent,
            padding: "56px 52px",
            justifyContent: "center",
            position: "relative",
          }}
        >
          {/* Decorative circle */}
          <div
            style={{
              position: "absolute",
              top: "-60px",
              right: "-60px",
              width: "200px",
              height: "200px",
              borderRadius: "50%",
              background: "rgba(255,255,255,0.12)",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: "-30px",
              left: "-30px",
              width: "120px",
              height: "120px",
              borderRadius: "50%",
              background: "rgba(255,255,255,0.08)",
            }}
          />

          {/* Shop name */}
          <div
            style={{
              fontSize: "20px",
              color: "rgba(255,255,255,0.65)",
              fontWeight: 500,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              marginBottom: "20px",
            }}
          >
            {shopName}
          </div>

          {/* Product name */}
          <div
            style={{
              fontSize: "52px",
              fontWeight: 700,
              color: "white",
              lineHeight: 1.15,
              marginBottom: "28px",
              maxWidth: "480px",
            }}
          >
            {product.name}
          </div>

          {/* Accent divider */}
          <div
            style={{
              width: "60px",
              height: "4px",
              background: "rgba(255,255,255,0.5)",
              marginBottom: "28px",
              borderRadius: "2px",
            }}
          />

          {/* Price */}
          <div
            style={{
              fontSize: "58px",
              fontWeight: 700,
              color: "white",
              lineHeight: 1,
              marginBottom: "36px",
            }}
          >
            {pd}
          </div>

          {/* Footer */}
          <div
            style={{
              position: "absolute",
              bottom: "36px",
              left: "52px",
              fontSize: "16px",
              color: "rgba(255,255,255,0.45)",
              letterSpacing: "0.02em",
            }}
          >
            souk.et
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=21600",
      },
    }
  );
}
