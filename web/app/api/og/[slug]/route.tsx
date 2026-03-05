import { ImageResponse } from "next/og";
import { getServerClient } from "@/lib/supabase";

const THEMES: Record<string, { primary: string; light: string }> = {
  teal: { primary: "#0D9488", light: "#14B8A6" },
  purple: { primary: "#7C3AED", light: "#8B5CF6" },
  rose: { primary: "#E11D48", light: "#F43F5E" },
  orange: { primary: "#EA580C", light: "#F97316" },
  emerald: { primary: "#059669", light: "#10B981" },
  gold: { primary: "#B45309", light: "#D97706" },
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const supabase = getServerClient();

  const { data: shop } = await supabase
    .from("suq_shops")
    .select("id, shop_name, shop_slug, theme_color, description")
    .eq("shop_slug", slug)
    .single();

  if (!shop) {
    return new Response("Not found", { status: 404 });
  }

  const { count } = await supabase
    .from("suq_products")
    .select("id", { count: "exact", head: true })
    .eq("shop_id", shop.id)
    .eq("is_active", true);

  const productCount = count || 0;
  const theme = THEMES[shop.theme_color || "teal"] || THEMES.teal;

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: `linear-gradient(135deg, ${theme.primary} 0%, ${theme.light} 100%)`,
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* Decorative circle */}
        <div
          style={{
            position: "absolute",
            top: "-40px",
            right: "-40px",
            width: "200px",
            height: "200px",
            borderRadius: "50%",
            background: "rgba(255,255,255,0.1)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-30px",
            left: "-30px",
            width: "140px",
            height: "140px",
            borderRadius: "50%",
            background: "rgba(255,255,255,0.08)",
          }}
        />

        {/* Initial letter */}
        <div
          style={{
            width: "80px",
            height: "80px",
            borderRadius: "20px",
            background: "rgba(255,255,255,0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "24px",
          }}
        >
          <span style={{ fontSize: "40px", fontWeight: 700, color: "white" }}>
            {shop.shop_name.charAt(0).toUpperCase()}
          </span>
        </div>

        <h1
          style={{
            fontSize: "52px",
            fontWeight: 700,
            color: "white",
            margin: 0,
            textAlign: "center",
          }}
        >
          {shop.shop_name}
        </h1>

        {shop.description && (
          <p
            style={{
              fontSize: "22px",
              color: "rgba(255,255,255,0.8)",
              margin: "8px 0 0",
              textAlign: "center",
              maxWidth: "600px",
            }}
          >
            {shop.description}
          </p>
        )}

        <div
          style={{
            marginTop: "32px",
            padding: "12px 32px",
            borderRadius: "28px",
            background: "rgba(255,255,255,0.95)",
            fontSize: "20px",
            fontWeight: 600,
            color: theme.primary,
          }}
        >
          {productCount > 0
            ? `Browse ${productCount} product${productCount !== 1 ? "s" : ""}`
            : "Shop on Suq"}
        </div>

        <p
          style={{
            position: "absolute",
            bottom: "24px",
            fontSize: "14px",
            color: "rgba(255,255,255,0.45)",
          }}
        >
          Powered by Suq
        </p>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        "Cache-Control": "public, max-age=86400, s-maxage=604800",
      },
    }
  );
}
