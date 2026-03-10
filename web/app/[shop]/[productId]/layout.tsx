import type { Metadata } from "next";
import { getServerClient } from "@/lib/supabase";

interface Props {
  params: Promise<{ shop: string; productId: string }>;
  children: React.ReactNode;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { productId, shop: shopSlug } = await params;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://web-theta-plum-56.vercel.app";
  const supabase = getServerClient();

  const { data: product } = await supabase
    .from("suq_products")
    .select("name, description, price, price_type, photo_url, shop_id")
    .eq("id", productId)
    .single();

  if (!product) {
    return { title: "Product not found — souk.et" };
  }

  const { data: shop } = await supabase
    .from("suq_shops")
    .select("shop_name, shop_slug")
    .eq("id", product.shop_id)
    .single();

  const shopName = shop?.shop_name || "Shop";
  const priceStr =
    product.price_type === "contact" || product.price === null
      ? ""
      : ` — ${product.price.toLocaleString()} ብር`;
  const title = `${product.name}${priceStr} | ${shopName} on souk.et`;
  const desc =
    product.description ||
    `Shop ${shopName} on souk.et`;

  return {
    title,
    description: desc,
    openGraph: {
      title: `${product.name}${priceStr}`,
      description: `at ${shopName} on souk.et`,
      images: [{ url: `${baseUrl}/api/og/product/${productId}`, width: 1200, height: 630 }],
      type: "website",
      siteName: "souk.et",
    },
    twitter: {
      card: "summary_large_image",
      title: `${product.name}${priceStr}`,
      description: `at ${shopName} on souk.et`,
      images: [`${baseUrl}/api/og/product/${productId}`],
    },
    other: {
      "product:price:amount": product.price?.toString() || "",
      "product:price:currency": "ETB",
    },
  };
}

export default function ProductLayout({ children }: Props) {
  return <>{children}</>;
}
