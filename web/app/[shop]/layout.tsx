import { Metadata } from "next";
import { getServerClient } from "@/lib/supabase";

interface Props {
  params: Promise<{ shop: string }>;
  children: React.ReactNode;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { shop: slug } = await params;
  const supabase = getServerClient();

  const { data: shop } = await supabase
    .from("suq_shops")
    .select("shop_name, description, shop_slug")
    .eq("shop_slug", slug)
    .single();

  if (!shop) {
    return { title: "Shop not found — Suq" };
  }

  const title = `${shop.shop_name} — Suq`;
  const description =
    shop.description || `Browse products from ${shop.shop_name} on Suq`;
  const ogUrl = `/api/og/${shop.shop_slug}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: ogUrl, width: 1200, height: 630 }],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogUrl],
    },
  };
}

export default function ShopLayout({ children }: Props) {
  return <>{children}</>;
}
