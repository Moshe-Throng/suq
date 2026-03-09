"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

/* ─── Types ─────────────────────────────────────── */

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  price_type: string | null;
  listing_type: string | null;
  photo_url: string | null;
  stock: number | null;
  tag: string | null;
}

interface Shop {
  shop_name: string;
  shop_slug: string;
  telegram_username: string | null;
  template_style: string | null;
  theme_color: string | null;
  shop_type: string | null;
  category: string | null;
  phone: string | null;
  location_text: string | null;
  description: string | null;
  logo_url: string | null;
}

interface RelatedProduct {
  id: string;
  name: string;
  price: number | null;
  price_type: string | null;
  photo_url: string | null;
  stock: number | null;
  tag: string | null;
  shop_name?: string;
  shop_slug?: string;
}

/* ─── Theme ─────────────────────────────────────── */

const O = "#FF6B35";
const N = "#0A0A0F";

function getAccent(style: string | null): string {
  const map: Record<string, string> = {
    purple: "#7C3AED", blue: "#2563EB", cyan: "#06B6D4", teal: "#0D9488",
    green: "#059669", orange: "#EA580C", red: "#E11D48", amber: "#D97706",
    charcoal: "#374151", brown: "#92400E", clean: "#7C3AED", bold: "#06B6D4",
    minimal: "#374151", ethiopian: "#92400E", fresh: "#0D9488", warm: "#EA580C",
  };
  return map[style || ""] || O;
}

/* ─── Price helpers ─────────────────────────────── */

const TAG_LABELS: Record<string, string> = {
  dresses: "Dresses", tops: "Tops", pants: "Pants", shoes: "Shoes",
  bags: "Bags", accessories: "Accessories", outerwear: "Outerwear",
  cakes: "Cakes", pastries: "Pastries", bread: "Bread", meals: "Meals",
  drinks: "Drinks", snacks: "Snacks", phones: "Phones", laptops: "Laptops",
  audio: "Audio", cameras: "Cameras", gaming: "Gaming",
  makeup: "Makeup", skincare: "Skincare", haircare: "Haircare",
  fragrance: "Fragrance", nails: "Nails", pottery: "Pottery",
  textiles: "Textiles", art: "Art", jewelry: "Jewelry", woodwork: "Woodwork",
  coffee: "Coffee", spices: "Spices", honey: "Honey", herbs: "Herbs",
  furniture: "Furniture", decor: "Decor", kitchen: "Kitchen",
  bedroom: "Bedroom", organization: "Organization",
  basic: "Basic", premium: "Premium", package: "Package",
  new: "New", popular: "Popular", sale: "Sale", other: "Other",
};

function fmtPrice(price: number | null, pt: string | null): string {
  if (pt === "contact" || price === null) return "ለዋጋ ያግኙን";
  const f = price.toLocaleString();
  if (pt === "starting_from") return `ከ ${f} ብር`;
  return `${f} ብር`;
}

/* ─── Component ─────────────────────────────────── */

export default function ProductDetailPage() {
  const params = useParams();
  const shopSlug = params.shop as string;
  const productId = params.productId as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [shop, setShop] = useState<Shop | null>(null);
  const [moreFromShop, setMoreFromShop] = useState<RelatedProduct[]>([]);
  const [similarProducts, setSimilarProducts] = useState<RelatedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Share
  const [showShare, setShowShare] = useState(false);
  const [copied, setCopied] = useState(false);

  // Inquiry modal
  const [showInquiry, setShowInquiry] = useState(false);
  const [buyerName, setBuyerName] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [buyerMessage, setBuyerMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/product/${productId}`);
        if (!res.ok) { setError("Product not found"); return; }
        const data = await res.json();
        setProduct(data.product);
        setShop(data.shop);
        setMoreFromShop(data.moreFromShop || []);
        setSimilarProducts(data.similarProducts || []);
      } catch { setError("Failed to load"); }
      finally { setLoading(false); }
    }
    load();
  }, [productId]);

  const accent = getAccent(shop?.template_style ?? shop?.theme_color ?? null);
  const fullUrl = typeof window !== "undefined" ? window.location.href : "";
  const isService = shop?.shop_type === "service";
  const isSoldOut = product?.stock === 0;

  const handleShare = useCallback(() => {
    if (navigator?.share) {
      navigator.share({
        title: product?.name,
        text: `${product?.name}${product?.price ? ` — ${product.price.toLocaleString()} ብር` : ""} at ${shop?.shop_name}`,
        url: fullUrl,
      }).catch(() => {});
    } else {
      setShowShare(true);
    }
  }, [product, shop, fullUrl]);

  function copyLink() {
    navigator.clipboard.writeText(fullUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  async function submitInquiry() {
    if (!buyerName.trim() || !shop || !product) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shop_id: (shop as unknown as Record<string, unknown>).id || "",
          product_id: product.id,
          buyer_name: buyerName.trim(),
          buyer_phone: buyerPhone.trim() || undefined,
          message: buyerMessage.trim() || undefined,
        }),
      });
      if (res.ok) {
        setSubmitSuccess(true);
        setTimeout(() => {
          setShowInquiry(false); setSubmitSuccess(false);
          setBuyerName(""); setBuyerPhone(""); setBuyerMessage("");
        }, 2500);
      }
    } catch { /* silent */ }
    finally { setSubmitting(false); }
  }

  /* ─── Loading ──────────────────────────── */
  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#FFF8F3" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800&family=Noto+Sans+Ethiopic:wght@400;500;600;700&display=swap');
        * { font-family: 'DM Sans', 'Noto Sans Ethiopic', system-ui, sans-serif; }
      `}</style>
      <div style={{ height: "56px", background: "white", borderBottom: "1px solid #F3F4F6" }} />
      <div style={{ aspectRatio: "4/3", background: "#F3F4F6", animation: "pulse 1.5s ease-in-out infinite" }} />
      <div style={{ padding: "20px" }}>
        <div style={{ height: "20px", width: "70%", background: "#F3F4F6", borderRadius: "8px", marginBottom: "12px" }} />
        <div style={{ height: "28px", width: "40%", background: "#F3F4F6", borderRadius: "8px", marginBottom: "16px" }} />
        <div style={{ height: "48px", background: "#F3F4F6", borderRadius: "14px" }} />
      </div>
      <style>{`@keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.5; } }`}</style>
    </div>
  );

  /* ─── Error ──────────────────────────── */
  if (error || !product || !shop) return (
    <div style={{
      minHeight: "100vh", background: "#FFF8F3",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "24px",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        * { font-family: 'DM Sans', system-ui, sans-serif; }
      `}</style>
      <div style={{ textAlign: "center" }}>
        <p style={{ fontSize: "40px", marginBottom: "12px" }}>😕</p>
        <h1 style={{ fontSize: "18px", fontWeight: 700, color: N, marginBottom: "8px" }}>Product not found</h1>
        <Link href={`/${shopSlug}`} style={{ fontSize: "14px", color: O, fontWeight: 600, textDecoration: "none" }}>
          ← Back to shop
        </Link>
      </div>
    </div>
  );

  const shareText = `${product.name}${product.price ? ` — ${product.price.toLocaleString()} ብር` : ""} at ${shop.shop_name}!`;

  /* ─── Main render ──────────────────────── */
  return (
    <div style={{ minHeight: "100vh", background: "#FFF8F3" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800&family=Noto+Sans+Ethiopic:wght@400;500;600;700&display=swap');
        * { font-family: 'DM Sans', 'Noto Sans Ethiopic', system-ui, sans-serif; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes slideUp { from { transform:translateY(100%); } to { transform:translateY(0); } }
        @keyframes scaleIn { from { opacity:0; } to { opacity:1; } }
        @keyframes checkPop { 0% { transform:scale(0); } 50% { transform:scale(1.2); } 100% { transform:scale(1); } }
        .fade-in { animation: fadeUp .5s cubic-bezier(.16,1,.3,1) both; }
        .card-pop { transition: transform .2s ease, box-shadow .2s ease; }
        .card-pop:active { transform: scale(0.97); }
        @media (hover:hover) { .card-pop:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(0,0,0,0.08); } }
        .line-clamp-2 { display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
      `}</style>

      {/* ═══ Top bar ═══ */}
      <div style={{
        position: "sticky", top: 0, zIndex: 30,
        background: "rgba(255,248,243,0.96)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid #FFCDB4",
        padding: "12px 16px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <Link href={`/${shopSlug}`} style={{
          display: "flex", alignItems: "center", gap: "6px",
          textDecoration: "none", color: "#6B7280", fontSize: "14px", fontWeight: 600,
        }}>
          <svg style={{ width: "16px", height: "16px" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
          {shop.shop_name}
        </Link>
        <button
          onClick={handleShare}
          style={{
            display: "flex", alignItems: "center", gap: "4px",
            padding: "6px 12px", borderRadius: "8px",
            background: "#F3F4F6", border: "none", cursor: "pointer",
            fontSize: "13px", fontWeight: 600, color: "#4B5563",
          }}
        >
          <svg style={{ width: "14px", height: "14px" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z" />
          </svg>
          Share
        </button>
      </div>

      {/* ═══ Product photo ═══ */}
      <div className="fade-in" style={{ maxWidth: "600px", margin: "0 auto" }}>
        <div style={{
          width: "100%", aspectRatio: "1",
          overflow: "hidden", background: "#FFE8D6",
          position: "relative",
        }}>
          {product.photo_url ? (
            <img
              src={product.photo_url}
              alt={product.name}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              fetchPriority="high"
            />
          ) : (
            <div style={{
              width: "100%", height: "100%",
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "linear-gradient(135deg, #FFF8F3, #FFE8D6)",
            }}>
              <span style={{ fontSize: "56px", opacity: 0.2 }}>📦</span>
            </div>
          )}
        </div>
      </div>

      {/* ═══ Product info ═══ */}
      <div className="fade-in" style={{ animationDelay: ".1s", padding: "20px 20px 0", maxWidth: "600px", margin: "0 auto" }}>
        {/* Tag + stock badges */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "8px" }}>
          {product.tag && (
            <span style={{
              fontSize: "12px", fontWeight: 600, padding: "3px 10px",
              borderRadius: "8px", background: `${accent}12`, color: accent,
            }}>
              {TAG_LABELS[product.tag] || product.tag}
            </span>
          )}
          {isSoldOut && (
            <span style={{
              fontSize: "12px", fontWeight: 600, padding: "3px 10px",
              borderRadius: "8px", background: "#F3F4F6", color: "#6B7280",
            }}>
              Sold out
            </span>
          )}
          {!isSoldOut && product.stock !== null && product.stock > 0 && product.stock <= 5 && (
            <span style={{
              fontSize: "12px", fontWeight: 600, padding: "3px 10px",
              borderRadius: "8px", background: "#FEF3C7", color: "#92400E",
            }}>
              {product.stock} left!
            </span>
          )}
          {!isSoldOut && product.stock !== null && product.stock > 5 && (
            <span style={{
              fontSize: "12px", fontWeight: 500, padding: "3px 10px",
              borderRadius: "8px", background: "#F0FDF4", color: "#166534",
            }}>
              {product.stock} in stock
            </span>
          )}
        </div>

        <h1 style={{
          fontSize: "22px", fontWeight: 800, color: N,
          letterSpacing: "-0.02em", lineHeight: 1.25,
          marginBottom: "6px",
        }}>
          {product.name}
        </h1>

        <p style={{
          fontSize: "24px", fontWeight: 800, color: accent,
          marginBottom: "4px",
        }}>
          {fmtPrice(product.price, product.price_type)}
        </p>

        {/* Shop info */}
        <Link href={`/${shopSlug}`} style={{
          display: "inline-flex", alignItems: "center", gap: "4px",
          fontSize: "13px", fontWeight: 500, color: "#9CA3AF",
          textDecoration: "none", marginBottom: "12px",
        }}>
          at {shop.shop_name}
          {shop.location_text && ` · ${shop.location_text}`}
        </Link>

        {product.description && (
          <p style={{
            fontSize: "14px", color: "#4B5563", lineHeight: 1.7,
            marginTop: "12px", marginBottom: "4px",
          }}>
            {product.description}
          </p>
        )}
      </div>

      {/* ═══ CTA buttons ═══ */}
      <div className="fade-in" style={{ animationDelay: ".2s", padding: "20px", maxWidth: "600px", margin: "0 auto" }}>
        {/* Primary: Telegram deep link */}
        <a
          href={`https://t.me/SoukEtBot?start=contact_${product.id}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
            width: "100%", padding: "16px",
            borderRadius: "14px", background: isSoldOut ? "#D1D5DB" : accent,
            color: "white", fontWeight: 700, fontSize: "15px",
            textDecoration: "none",
            pointerEvents: isSoldOut ? "none" : "auto",
            opacity: isSoldOut ? 0.5 : 1,
            boxShadow: isSoldOut ? "none" : `0 4px 16px ${accent}40`,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.07-.18c-.08-.05-.19-.03-.27-.02-.12.03-1.99 1.27-5.62 3.72-.53.36-1.01.54-1.44.53-.47-.01-1.38-.27-2.06-.49-.83-.27-1.49-.42-1.43-.88.03-.24.37-.49 1.02-.74 3.98-1.73 6.64-2.88 7.97-3.44 3.8-1.58 4.59-1.86 5.1-1.87.11 0 .37.03.53.17.14.12.18.28.2.46-.01.06.01.24 0 .37z" />
          </svg>
          {isSoldOut ? "Sold Out" : "Contact Seller on Telegram"}
        </a>

        {/* Secondary: inquiry form */}
        {!isSoldOut && (
          <button
            onClick={() => setShowInquiry(true)}
            style={{
              display: "block", width: "100%", marginTop: "10px",
              padding: "10px", borderRadius: "10px",
              background: "transparent", border: "none",
              color: "#6B7280", fontSize: "13px", fontWeight: 600,
              cursor: "pointer", textDecoration: "underline",
              textDecorationColor: "#D1D5DB",
            }}
          >
            Or send an inquiry form
          </button>
        )}
      </div>

      {/* ═══ More from this shop ═══ */}
      {moreFromShop.length > 0 && (
        <div className="fade-in" style={{ animationDelay: ".3s", padding: "0 20px 20px", maxWidth: "600px", margin: "0 auto" }}>
          <div style={{
            borderTop: "1px solid #F3F4F6", paddingTop: "20px",
          }}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              marginBottom: "12px",
            }}>
              <h2 style={{ fontSize: "16px", fontWeight: 800, color: N }}>
                More from {shop.shop_name}
              </h2>
              <Link href={`/${shopSlug}`} style={{
                fontSize: "12px", fontWeight: 600, color: accent,
                textDecoration: "none",
              }}>
                View shop →
              </Link>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              {moreFromShop.map((p) => (
                <Link key={p.id} href={`/${shopSlug}/${p.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                  <div className="card-pop" style={{
                    background: "white", borderRadius: "14px", overflow: "hidden",
                    border: "1px solid #F3F4F6",
                  }}>
                    <div style={{ aspectRatio: "1", background: "#F9FAFB", overflow: "hidden" }}>
                      {p.photo_url ? (
                        <img src={p.photo_url} alt={p.name} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#FFF8F3" }}>
                          <span style={{ fontSize: "24px", opacity: 0.3 }}>📦</span>
                        </div>
                      )}
                    </div>
                    <div style={{ padding: "8px 10px 10px" }}>
                      <p className="line-clamp-2" style={{ fontSize: "12px", fontWeight: 700, color: N, lineHeight: 1.3 }}>{p.name}</p>
                      <p style={{ fontSize: "13px", fontWeight: 800, color: accent, marginTop: "2px" }}>{fmtPrice(p.price, p.price_type)}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══ Similar on souk.et ═══ */}
      {similarProducts.length > 0 && (
        <div className="fade-in" style={{ animationDelay: ".4s", padding: "0 20px 20px", maxWidth: "600px", margin: "0 auto" }}>
          <div style={{ borderTop: "1px solid #F3F4F6", paddingTop: "20px" }}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              marginBottom: "12px",
            }}>
              <h2 style={{ fontSize: "16px", fontWeight: 800, color: N }}>
                Similar on souk.et
              </h2>
              {shop.category && (
                <Link href={`/?category=${shop.category}`} style={{
                  fontSize: "12px", fontWeight: 600, color: O,
                  textDecoration: "none",
                }}>
                  Browse all →
                </Link>
              )}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              {similarProducts.map((p) => (
                <Link key={p.id} href={`/${p.shop_slug}/${p.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                  <div className="card-pop" style={{
                    background: "white", borderRadius: "14px", overflow: "hidden",
                    border: "1px solid #F3F4F6",
                  }}>
                    <div style={{ aspectRatio: "1", background: "#F9FAFB", overflow: "hidden" }}>
                      {p.photo_url ? (
                        <img src={p.photo_url} alt={p.name} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#FFF8F3" }}>
                          <span style={{ fontSize: "24px", opacity: 0.3 }}>📦</span>
                        </div>
                      )}
                    </div>
                    <div style={{ padding: "8px 10px 10px" }}>
                      <p className="line-clamp-2" style={{ fontSize: "12px", fontWeight: 700, color: N, lineHeight: 1.3 }}>{p.name}</p>
                      <p style={{ fontSize: "13px", fontWeight: 800, color: O, marginTop: "2px" }}>{fmtPrice(p.price, p.price_type)}</p>
                      <p style={{ fontSize: "11px", color: "#9CA3AF", marginTop: "1px" }}>{p.shop_name}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══ Footer ═══ */}
      <footer style={{
        background: "#1A1A1F", padding: "28px 20px", textAlign: "center",
      }}>
        <p style={{ fontSize: "14px", fontWeight: 700, color: "white" }}>
          souk<span style={{ color: O }}>.</span>et
        </p>
        <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", marginTop: "4px" }}>
          Where Ethiopia Shops
        </p>
        <div style={{ marginTop: "14px", display: "flex", justifyContent: "center", gap: "16px" }}>
          <Link href="/" style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", textDecoration: "none" }}>Browse marketplace</Link>
          <a href="https://t.me/SoukEtBot" target="_blank" rel="noopener noreferrer" style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", textDecoration: "none" }}>
            Create a shop
          </a>
        </div>
      </footer>

      {/* ═══ Share Bottom Sheet ═══ */}
      {showShare && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "flex-end", justifyContent: "center" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowShare(false); }}
        >
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)", animation: "scaleIn .2s ease" }} />
          <div style={{
            position: "relative", width: "100%", maxWidth: "480px",
            background: "white", borderRadius: "24px 24px 0 0",
            padding: "20px 20px 32px",
            animation: "slideUp .3s cubic-bezier(.32,.72,0,1)",
          }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: "16px" }}>
              <div style={{ width: "36px", height: "4px", borderRadius: "2px", background: "#E5E7EB" }} />
            </div>
            <h3 style={{ fontSize: "16px", fontWeight: 700, color: N, marginBottom: "16px" }}>Share this product</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              <a href={`https://wa.me/?text=${encodeURIComponent(`${shareText} ${fullUrl}`)}`}
                target="_blank" rel="noopener noreferrer"
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                  padding: "12px", borderRadius: "12px", background: "#25D366", color: "white",
                  fontWeight: 600, fontSize: "13px", textDecoration: "none",
                }}>
                💬 WhatsApp
              </a>
              <a href={`https://t.me/share/url?url=${encodeURIComponent(fullUrl)}&text=${encodeURIComponent(shareText)}`}
                target="_blank" rel="noopener noreferrer"
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                  padding: "12px", borderRadius: "12px", background: "#2AABEE", color: "white",
                  fontWeight: 600, fontSize: "13px", textDecoration: "none",
                }}>
                ✈️ Telegram
              </a>
              <button onClick={copyLink} style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                padding: "12px", borderRadius: "12px", background: "#F3F4F6", color: N,
                fontWeight: 600, fontSize: "13px", border: "none", cursor: "pointer",
              }}>
                📋 {copied ? "Copied!" : "Copy Link"}
              </button>
              <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(fullUrl)}`}
                target="_blank" rel="noopener noreferrer"
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                  padding: "12px", borderRadius: "12px", background: "#1877F2", color: "white",
                  fontWeight: 600, fontSize: "13px", textDecoration: "none",
                }}>
                📘 Facebook
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Inquiry Modal ═══ */}
      {showInquiry && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "flex-end", justifyContent: "center" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowInquiry(false); }}
        >
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)", animation: "scaleIn .2s ease" }} />
          <div style={{
            position: "relative", width: "100%", maxWidth: "480px",
            background: "white", borderRadius: "24px 24px 0 0",
            padding: "20px 20px 32px",
            animation: "slideUp .3s cubic-bezier(.32,.72,0,1)",
          }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: "12px" }}>
              <div style={{ width: "36px", height: "4px", borderRadius: "2px", background: "#E5E7EB" }} />
            </div>
            {submitSuccess ? (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <div style={{
                  width: "56px", height: "56px", borderRadius: "50%",
                  background: `${accent}15`, margin: "0 auto 12px",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  animation: "checkPop .4s cubic-bezier(.34,1.56,.64,1) both",
                }}>
                  <svg style={{ width: "28px", height: "28px", color: accent }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                </div>
                <p style={{ fontSize: "16px", fontWeight: 700, color: N }}>Inquiry sent!</p>
                <p style={{ fontSize: "13px", color: "#9CA3AF", marginTop: "4px" }}>The seller will be notified on Telegram.</p>
              </div>
            ) : (
              <>
                <h3 style={{ fontSize: "16px", fontWeight: 700, color: N, marginBottom: "4px" }}>Send inquiry</h3>
                <p style={{ fontSize: "13px", color: "#9CA3AF", marginBottom: "16px" }}>
                  {product.name} · {fmtPrice(product.price, product.price_type)}
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <input
                    type="text" placeholder="Your name" value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    autoFocus
                    style={{
                      width: "100%", padding: "12px 14px", borderRadius: "12px",
                      border: "1.5px solid #E5E7EB", fontSize: "14px", color: N,
                      outline: "none",
                    }}
                    onFocus={(e) => e.currentTarget.style.borderColor = accent}
                    onBlur={(e) => e.currentTarget.style.borderColor = "#E5E7EB"}
                  />
                  <input
                    type="tel" placeholder="Phone (optional)" value={buyerPhone}
                    onChange={(e) => setBuyerPhone(e.target.value)}
                    style={{
                      width: "100%", padding: "12px 14px", borderRadius: "12px",
                      border: "1.5px solid #E5E7EB", fontSize: "14px", color: N,
                      outline: "none",
                    }}
                    onFocus={(e) => e.currentTarget.style.borderColor = accent}
                    onBlur={(e) => e.currentTarget.style.borderColor = "#E5E7EB"}
                  />
                  <textarea
                    placeholder="Message (optional)" value={buyerMessage}
                    onChange={(e) => setBuyerMessage(e.target.value)}
                    rows={2}
                    style={{
                      width: "100%", padding: "12px 14px", borderRadius: "12px",
                      border: "1.5px solid #E5E7EB", fontSize: "14px", color: N,
                      outline: "none", resize: "none",
                    }}
                    onFocus={(e) => e.currentTarget.style.borderColor = accent}
                    onBlur={(e) => e.currentTarget.style.borderColor = "#E5E7EB"}
                  />
                  <button
                    onClick={submitInquiry}
                    disabled={!buyerName.trim() || submitting}
                    style={{
                      width: "100%", padding: "14px", borderRadius: "12px",
                      background: !buyerName.trim() || submitting ? "#D1D5DB" : accent,
                      color: "white", fontWeight: 700, fontSize: "14px",
                      border: "none", cursor: "pointer",
                      opacity: submitting ? 0.7 : 1,
                    }}
                  >
                    {submitting ? "Sending..." : "Send Inquiry"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
