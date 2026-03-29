import { getServerClient } from "@/lib/supabase";
import type { MetadataRoute } from "next";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = getServerClient();
  const baseUrl = "https://souk.et";

  const entries: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
  ];

  // All active shops
  const { data: shops } = await supabase
    .from("suq_shops")
    .select("shop_slug, created_at");

  if (shops) {
    for (const s of shops) {
      entries.push({
        url: `${baseUrl}/${s.shop_slug}`,
        lastModified: new Date(s.created_at),
        changeFrequency: "weekly",
        priority: 0.8,
      });
    }
  }

  // All active products
  const { data: products } = await supabase
    .from("suq_products")
    .select("id, shop_id, created_at, suq_shops!inner(shop_slug)")
    .eq("is_active", true);

  if (products) {
    for (const p of products) {
      const shop = p.suq_shops as unknown as { shop_slug: string };
      entries.push({
        url: `${baseUrl}/${shop.shop_slug}/${p.id}`,
        lastModified: new Date(p.created_at),
        changeFrequency: "weekly",
        priority: 0.6,
      });
    }
  }

  return entries;
}
