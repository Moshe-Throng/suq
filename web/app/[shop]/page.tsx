"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";

/* ─── Types ─────────────────────────────────────────────── */

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  photo_url: string | null;
  photo_file_id: string | null;
}

interface Shop {
  id: string;
  shop_name: string;
  shop_slug: string;
  telegram_username: string | null;
  theme_color: string | null;
  description: string | null;
  logo_url: string | null;
  logo_file_id: string | null;
}

interface OrderForm {
  productId: string;
  productName: string;
  price: number;
}

interface ThemeColors {
  primary: string;
  primaryDark: string;
  accent: string;
  bgSoft: string;
  bgSubtle: string;
  ring: string;
  gradient: string;
  gradientCard: string;
}

/* ─── Theme Palette Map ─────────────────────────────────── */

const THEMES: Record<string, ThemeColors> = {
  teal: {
    primary: "#0D9488",
    primaryDark: "#0F766E",
    accent: "#5EEAD4",
    bgSoft: "#CCFBF1",
    bgSubtle: "#F0FDFA",
    ring: "#99F6E4",
    gradient: "linear-gradient(135deg, #0D9488 0%, #14B8A6 50%, #2DD4BF 100%)",
    gradientCard: "linear-gradient(135deg, #F0FDFA 0%, #CCFBF1 100%)",
  },
  purple: {
    primary: "#7C3AED",
    primaryDark: "#6D28D9",
    accent: "#A78BFA",
    bgSoft: "#EDE9FE",
    bgSubtle: "#F5F3FF",
    ring: "#C4B5FD",
    gradient: "linear-gradient(135deg, #7C3AED 0%, #8B5CF6 50%, #A78BFA 100%)",
    gradientCard: "linear-gradient(135deg, #F5F3FF 0%, #EDE9FE 100%)",
  },
  rose: {
    primary: "#E11D48",
    primaryDark: "#BE123C",
    accent: "#FDA4AF",
    bgSoft: "#FFE4E6",
    bgSubtle: "#FFF1F2",
    ring: "#FECDD3",
    gradient: "linear-gradient(135deg, #E11D48 0%, #F43F5E 50%, #FB7185 100%)",
    gradientCard: "linear-gradient(135deg, #FFF1F2 0%, #FFE4E6 100%)",
  },
  orange: {
    primary: "#EA580C",
    primaryDark: "#C2410C",
    accent: "#FDBA74",
    bgSoft: "#FFEDD5",
    bgSubtle: "#FFF7ED",
    ring: "#FED7AA",
    gradient: "linear-gradient(135deg, #EA580C 0%, #F97316 50%, #FB923C 100%)",
    gradientCard: "linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%)",
  },
  emerald: {
    primary: "#059669",
    primaryDark: "#047857",
    accent: "#6EE7B7",
    bgSoft: "#D1FAE5",
    bgSubtle: "#ECFDF5",
    ring: "#A7F3D0",
    gradient: "linear-gradient(135deg, #059669 0%, #10B981 50%, #34D399 100%)",
    gradientCard: "linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)",
  },
  gold: {
    primary: "#B45309",
    primaryDark: "#92400E",
    accent: "#FCD34D",
    bgSoft: "#FEF3C7",
    bgSubtle: "#FFFBEB",
    ring: "#FDE68A",
    gradient: "linear-gradient(135deg, #B45309 0%, #D97706 50%, #F59E0B 100%)",
    gradientCard: "linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)",
  },
};

/* ─── Component ─────────────────────────────────────────── */

export default function ShopPage() {
  const params = useParams();
  const slug = params.shop as string;

  const [shop, setShop] = useState<Shop | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Order modal
  const [orderForm, setOrderForm] = useState<OrderForm | null>(null);
  const [buyerName, setBuyerName] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [buyerNote, setBuyerNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);

  const theme = useMemo(() => {
    const key = shop?.theme_color || "teal";
    return THEMES[key] || THEMES.teal;
  }, [shop?.theme_color]);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/shop/${slug}`);
        if (!res.ok) { setError("Shop not found"); return; }
        const data = await res.json();
        setShop(data.shop);
        setProducts(data.products);
      } catch {
        setError("Failed to load shop");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug]);

  async function submitOrder() {
    if (!orderForm || !buyerName.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shop_id: shop!.id,
          product_id: orderForm.productId,
          buyer_name: buyerName.trim(),
          buyer_phone: buyerPhone.trim() || undefined,
          note: buyerNote.trim() || undefined,
        }),
      });
      if (res.ok) {
        setOrderSuccess(true);
        setTimeout(() => {
          setOrderForm(null);
          setOrderSuccess(false);
          setBuyerName("");
          setBuyerPhone("");
          setBuyerNote("");
        }, 2500);
      }
    } catch {
      // silent
    } finally {
      setSubmitting(false);
    }
  }

  /* ─── Loading skeleton ──────────────────────────────── */
  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="h-44 bg-gradient-to-br from-gray-200 to-gray-100 animate-pulse" />
        <div className="max-w-2xl mx-auto px-4 -mt-6">
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-2xl shadow-sm overflow-hidden animate-pulse">
                <div className="aspect-square bg-gray-100" />
                <div className="p-3 space-y-2">
                  <div className="h-4 bg-gray-100 rounded w-3/4" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                  <div className="h-9 bg-gray-100 rounded-lg mt-2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ─── Error state ───────────────────────────────────── */
  if (error || !shop) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gray-50 flex items-center justify-center">
            <svg className="w-10 h-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a.75.75 0 0 1 .218-.523L12 2.25l8.032 6.576a.75.75 0 0 1 .218.523" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Shop not found</h1>
          <p className="text-gray-400 text-sm leading-relaxed">
            This shop doesn&apos;t exist or has been removed.
          </p>
        </div>
      </div>
    );
  }

  const productCount = products.length;

  /* ─── Main render ───────────────────────────────────── */
  return (
    <div className="min-h-screen bg-gray-50/50">
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes scaleIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
        @keyframes checkPop {
          0%   { transform: scale(0); opacity: 0; }
          50%  { transform: scale(1.2); }
          100% { transform: scale(1); opacity: 1; }
        }
        .card-enter {
          animation: fadeUp 0.4s ease-out both;
        }
        .modal-backdrop {
          animation: scaleIn 0.2s ease-out;
        }
        .modal-sheet {
          animation: slideUp 0.3s cubic-bezier(0.32, 0.72, 0, 1);
        }
        .check-pop {
          animation: checkPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s both;
        }
        .product-card {
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .product-card:active {
          transform: scale(0.98);
        }
        @media (hover: hover) {
          .product-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 12px 24px -8px rgba(0,0,0,0.12);
          }
        }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>

      {/* ═══ Hero Header ═══ */}
      <header
        className="relative overflow-hidden"
        style={{ background: theme.gradient }}
      >
        {/* Decorative circles */}
        <div
          className="absolute -top-10 -right-10 w-40 h-40 rounded-full"
          style={{ background: "rgba(255,255,255,0.1)" }}
        />
        <div
          className="absolute -bottom-6 -left-6 w-28 h-28 rounded-full"
          style={{ background: "rgba(255,255,255,0.08)" }}
        />

        <div className="relative max-w-2xl mx-auto px-5 pt-10 pb-14">
          {/* Shop avatar — logo or initial */}
          <div
            className="w-14 h-14 rounded-2xl overflow-hidden flex items-center justify-center mb-4"
            style={{
              background: shop.logo_url ? "transparent" : "rgba(255,255,255,0.2)",
              backdropFilter: shop.logo_url ? undefined : "blur(8px)",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            }}
          >
            {shop.logo_url ? (
              <img
                src={shop.logo_url}
                alt={shop.shop_name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-2xl font-bold text-white">
                {shop.shop_name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          <h1 className="text-2xl font-bold text-white tracking-tight">
            {shop.shop_name}
          </h1>

          {/* Description */}
          {shop.description && (
            <p
              className="mt-1.5 text-sm leading-relaxed max-w-md"
              style={{ color: "rgba(255,255,255,0.75)" }}
            >
              {shop.description}
            </p>
          )}

          <div className="flex items-center gap-3 mt-2">
            {shop.telegram_username && (
              <a
                href={`https://t.me/${shop.telegram_username}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm transition-colors"
                style={{ color: "rgba(255,255,255,0.8)" }}
                onMouseEnter={(e) => e.currentTarget.style.color = "white"}
                onMouseLeave={(e) => e.currentTarget.style.color = "rgba(255,255,255,0.8)"}
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.12.03-1.99 1.27-5.62 3.72-.53.36-1.01.54-1.44.53-.47-.01-1.38-.27-2.06-.49-.83-.27-1.49-.42-1.43-.88.03-.24.37-.49 1.02-.74 3.98-1.73 6.64-2.88 7.97-3.44 3.8-1.58 4.59-1.86 5.1-1.87.11 0 .37.03.53.17.14.12.18.28.2.46-.01.06.01.24 0 .37z"/>
                </svg>
                @{shop.telegram_username}
              </a>
            )}
            <span style={{ color: "rgba(255,255,255,0.5)" }} className="text-sm">
              {productCount} {productCount === 1 ? "product" : "products"}
            </span>
          </div>
        </div>

        {/* Bottom curve */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 40" fill="none" className="w-full block">
            <path d="M0 40V20Q360 0 720 0T1440 20V40Z" fill="rgb(249 250 251)" />
          </svg>
        </div>
      </header>

      {/* ═══ Products Grid ═══ */}
      <main className="max-w-2xl mx-auto px-4 pb-8 -mt-4 relative z-10">
        {productCount === 0 ? (
          <div className="text-center py-20">
            <div
              className="w-20 h-20 mx-auto mb-5 rounded-full flex items-center justify-center"
              style={{ background: theme.bgSoft }}
            >
              <svg className="w-10 h-10" style={{ color: theme.primary }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">No products yet</h2>
            <p className="text-gray-400 text-sm">Check back soon!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {products.map((p, idx) => (
              <div
                key={p.id}
                className="product-card bg-white rounded-2xl overflow-hidden card-enter"
                style={{
                  animationDelay: `${idx * 0.06}s`,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
                }}
              >
                {/* Photo */}
                <div className="relative aspect-square bg-gray-50 overflow-hidden">
                  {p.photo_url ? (
                    <img
                      src={p.photo_url}
                      alt={p.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center"
                      style={{ background: theme.gradientCard }}
                    >
                      <svg className="w-12 h-12 opacity-30" style={{ color: theme.primary }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21z" />
                      </svg>
                    </div>
                  )}
                  {/* Price badge */}
                  <div
                    className="absolute bottom-2 left-2 px-2.5 py-1 rounded-lg text-xs font-bold text-white"
                    style={{
                      background: theme.primary,
                      boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                    }}
                  >
                    {p.price.toLocaleString()} Birr
                  </div>
                </div>

                {/* Info */}
                <div className="p-3">
                  <h2 className="font-semibold text-gray-900 text-sm leading-tight line-clamp-2">
                    {p.name}
                  </h2>
                  {p.description && (
                    <p className="text-gray-400 text-xs mt-1 line-clamp-2 leading-relaxed">
                      {p.description}
                    </p>
                  )}
                  <button
                    onClick={() =>
                      setOrderForm({
                        productId: p.id,
                        productName: p.name,
                        price: p.price,
                      })
                    }
                    className="w-full mt-3 py-2 rounded-xl text-white text-sm font-semibold transition-all active:scale-95"
                    style={{ background: theme.primary }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = theme.primaryDark)
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = theme.primary)
                    }
                  >
                    Order Now
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* ═══ Footer ═══ */}
      <footer className="text-center pb-8 pt-4">
        <div className="inline-flex items-center gap-1.5 text-xs text-gray-300">
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
          Powered by Suq
        </div>
      </footer>

      {/* ═══ Order Modal ═══ */}
      {orderForm && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOrderForm(null);
          }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 modal-backdrop" style={{ background: "rgba(0,0,0,0.4)" }} />

          {/* Sheet */}
          <div className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl modal-sheet sm:mx-4">
            {/* Drag indicator (mobile) */}
            <div className="flex justify-center pt-3 sm:hidden">
              <div className="w-10 h-1 rounded-full bg-gray-200" />
            </div>

            {orderSuccess ? (
              /* ── Success State ── */
              <div className="p-8 text-center">
                <div
                  className="w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 check-pop"
                  style={{ background: theme.bgSoft }}
                >
                  <svg className="w-8 h-8" style={{ color: theme.primary }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Order placed!</h3>
                <p className="text-gray-400 text-sm mt-1">
                  The seller will be notified on Telegram.
                </p>
              </div>
            ) : (
              /* ── Order Form ── */
              <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-5">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Place Order
                    </h3>
                    <p className="text-sm text-gray-400 mt-0.5">
                      {orderForm.productName}
                      <span
                        className="ml-2 font-semibold"
                        style={{ color: theme.primary }}
                      >
                        {orderForm.price.toLocaleString()} Birr
                      </span>
                    </p>
                  </div>
                  <button
                    onClick={() => setOrderForm(null)}
                    className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-colors -mt-1"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Form */}
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Your name"
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 focus:outline-none transition-shadow"
                    style={{
                      boxShadow: buyerName ? `0 0 0 2px ${theme.ring}` : undefined,
                    }}
                    onFocus={(e) =>
                      (e.currentTarget.style.boxShadow = `0 0 0 2px ${theme.ring}`)
                    }
                    onBlur={(e) => {
                      if (!buyerName) e.currentTarget.style.boxShadow = "none";
                    }}
                    autoFocus
                  />

                  <input
                    type="tel"
                    placeholder="Phone number (optional)"
                    value={buyerPhone}
                    onChange={(e) => setBuyerPhone(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 focus:outline-none transition-shadow"
                    onFocus={(e) =>
                      (e.currentTarget.style.boxShadow = `0 0 0 2px ${theme.ring}`)
                    }
                    onBlur={(e) => (e.currentTarget.style.boxShadow = "none")}
                  />

                  <textarea
                    placeholder="Note for the seller (optional)"
                    value={buyerNote}
                    onChange={(e) => setBuyerNote(e.target.value)}
                    rows={2}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 focus:outline-none resize-none transition-shadow"
                    onFocus={(e) =>
                      (e.currentTarget.style.boxShadow = `0 0 0 2px ${theme.ring}`)
                    }
                    onBlur={(e) => (e.currentTarget.style.boxShadow = "none")}
                  />

                  <button
                    onClick={submitOrder}
                    disabled={!buyerName.trim() || submitting}
                    className="w-full py-3.5 rounded-xl text-white text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{
                      background: !buyerName.trim() || submitting ? "#D1D5DB" : theme.primary,
                    }}
                    onMouseEnter={(e) => {
                      if (buyerName.trim() && !submitting)
                        e.currentTarget.style.background = theme.primaryDark;
                    }}
                    onMouseLeave={(e) => {
                      if (buyerName.trim() && !submitting)
                        e.currentTarget.style.background = theme.primary;
                    }}
                  >
                    {submitting ? (
                      <span className="inline-flex items-center gap-2">
                        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Sending...
                      </span>
                    ) : (
                      "Place Order"
                    )}
                  </button>
                </div>

                {/* Telegram hint */}
                <p className="text-center text-xs text-gray-300 mt-4">
                  Your order will be sent to the seller via Telegram
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
