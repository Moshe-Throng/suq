"use client";

import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import Link from "next/link";

/* ─── Types ─────────────────────────────────────────── */

interface MarketProduct {
  id: string;
  name: string;
  price: number | null;
  price_type: string | null;
  photo_url: string | null;
  stock: number | null;
  tag: string | null;
  created_at: string;
  shop_name: string;
  shop_slug: string;
  shop_category: string;
  shop_template_style: string;
}

interface MarketShop {
  shop_name: string;
  shop_slug: string;
  category: string | null;
  location_text: string | null;
  logo_url: string | null;
  template_style: string | null;
  description: string | null;
  product_count: number;
}

interface Props {
  initialProducts: MarketProduct[];
  initialShops: MarketShop[];
  categoryCounts: Record<string, number>;
  totalProducts: number;
}

/* ─── Constants ─────────────────────────────────────── */

const O = "#FF6B35";
const G = "#FFB800";
const N = "#0A0A0F";

const CATEGORIES: {
  key: string;
  label: string;
  labelAm: string;
  emoji: string;
  bg: string;
  border: string;
}[] = [
  { key: "fashion", label: "Fashion", labelAm: "ፋሽን", emoji: "👗", bg: "#FFF0F3", border: "#FECDD3" },
  { key: "food", label: "Food & Bakery", labelAm: "ምግብ", emoji: "🎂", bg: "#FFF8EB", border: "#FDE68A" },
  { key: "electronics", label: "Electronics", labelAm: "ኤሌክትሮኒክ", emoji: "📱", bg: "#EFF6FF", border: "#BFDBFE" },
  { key: "beauty", label: "Beauty", labelAm: "ውበት", emoji: "💄", bg: "#FFF1F2", border: "#FECDD3" },
  { key: "handmade", label: "Handmade", labelAm: "እጅ ስራ", emoji: "🏺", bg: "#FEF3E2", border: "#FED7AA" },
  { key: "coffee", label: "Coffee & Spices", labelAm: "ቡና", emoji: "☕", bg: "#F5F0EB", border: "#D6C4B0" },
  { key: "home", label: "Home", labelAm: "ቤት", emoji: "🛋", bg: "#F0FAF4", border: "#A7F3D0" },
  { key: "service", label: "Services", labelAm: "አገልግሎት", emoji: "💼", bg: "#F3F0FF", border: "#C4B5FD" },
];

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
  new: "New", popular: "Popular", sale: "Sale", featured: "Featured",
  other: "Other",
};

const CATEGORY_EMOJI: Record<string, string> = {
  fashion: "👗", food: "🎂", electronics: "📱", beauty: "💄",
  handmade: "🏺", coffee: "☕", home: "🛋", service: "💼",
};

/* ─── Price helpers ─────────────────────────────────── */

function fmtPrice(price: number | null, pt: string | null): string {
  if (pt === "contact" || price === null) return "ለዋጋ ያግኙን";
  const f = price.toLocaleString();
  if (pt === "starting_from") return `ከ ${f} ብር`;
  return `${f} ብር`;
}

/* ─── Component ─────────────────────────────────────── */

export default function MarketplaceClient({
  initialProducts,
  initialShops,
  categoryCounts,
  totalProducts,
}: Props) {
  const [products, setProducts] = useState<MarketProduct[]>(initialProducts);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"newest" | "price_asc" | "price_desc">("newest");
  const [offset, setOffset] = useState(20);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialProducts.length >= 20);
  const [mounted, setMounted] = useState(false);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    requestAnimationFrame(() => setMounted(true));
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting && e.target.id) {
            setRevealed((prev) => new Set([...prev, e.target.id]));
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -30px 0px" }
    );
    setTimeout(() => {
      document.querySelectorAll("[data-reveal]").forEach((el) => observer.observe(el));
    }, 100);
    return () => observer.disconnect();
  }, []);

  // Parse URL params on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const cat = params.get("category");
    const q = params.get("q");
    if (cat) {
      setSelectedCategory(cat);
      fetchProducts(q || "", cat, "newest", 0);
    }
    if (q) {
      setSearchInput(q);
      setSearchQuery(q);
      if (!cat) fetchProducts(q, null, "newest", 0);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const v = useCallback((id: string) => revealed.has(id), [revealed]);

  async function fetchProducts(
    q: string, category: string | null, sort: string, off: number, append = false
  ) {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (category) params.set("category", category);
      params.set("sort", sort);
      params.set("offset", String(off));
      params.set("limit", "20");
      const res = await fetch(`/api/marketplace?${params}`);
      if (!res.ok) return;
      const data = await res.json();
      if (append) {
        setProducts((prev) => [...prev, ...data.products]);
      } else {
        setProducts(data.products);
      }
      setHasMore(data.products.length >= 20);
      setOffset(off + data.products.length);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }

  function handleSearch(value: string) {
    setSearchInput(value);
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setSearchQuery(value);
      if (value.length >= 3 || value.length === 0) {
        fetchProducts(value, selectedCategory, sortBy, 0);
        // Update URL
        const params = new URLSearchParams(window.location.search);
        if (value) params.set("q", value); else params.delete("q");
        window.history.replaceState({}, "", `/${params.toString() ? `?${params}` : ""}`);
      }
    }, 300);
  }

  function handleCategory(cat: string | null) {
    setSelectedCategory(cat);
    fetchProducts(searchQuery, cat, sortBy, 0);
    const params = new URLSearchParams(window.location.search);
    if (cat) params.set("category", cat); else params.delete("category");
    window.history.replaceState({}, "", `/${params.toString() ? `?${params}` : ""}`);
  }

  function handleSort(sort: "newest" | "price_asc" | "price_desc") {
    setSortBy(sort);
    fetchProducts(searchQuery, selectedCategory, sort, 0);
  }

  function loadMore() {
    fetchProducts(searchQuery, selectedCategory, sortBy, offset, true);
  }

  const filteredShops = useMemo(() => {
    if (!selectedCategory) return initialShops.slice(0, 8);
    return initialShops.filter((s) => s.category === selectedCategory).slice(0, 8);
  }, [initialShops, selectedCategory]);

  const activeLabel = selectedCategory
    ? CATEGORIES.find((c) => c.key === selectedCategory)?.label || selectedCategory
    : null;

  /* ─── Render ─────────────────────────────────────── */

  return (
    <div style={{ overflowX: "hidden", background: "#FFFCF8" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800&family=Noto+Sans+Ethiopic:wght@400;500;600;700&display=swap');
        * { font-family: 'Plus Jakarta Sans', 'Noto Sans Ethiopic', system-ui, sans-serif; }

        @keyframes fadeUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        @keyframes pulseOrange { 0%,100% { box-shadow: 0 0 0 0 rgba(255,107,53,0.3); } 50% { box-shadow: 0 0 0 8px rgba(255,107,53,0); } }

        .sr  { opacity:0; transform:translateY(24px); transition: opacity .7s cubic-bezier(.16,1,.3,1), transform .7s cubic-bezier(.16,1,.3,1); }
        .sr.in { opacity:1; transform:translateY(0); }
        .sg > * { opacity:0; transform:translateY(16px); transition: opacity .5s cubic-bezier(.16,1,.3,1), transform .5s cubic-bezier(.16,1,.3,1); }
        .sg.in > *:nth-child(1) { transition-delay:.0s;  opacity:1; transform:translateY(0); }
        .sg.in > *:nth-child(2) { transition-delay:.06s; opacity:1; transform:translateY(0); }
        .sg.in > *:nth-child(3) { transition-delay:.12s; opacity:1; transform:translateY(0); }
        .sg.in > *:nth-child(4) { transition-delay:.18s; opacity:1; transform:translateY(0); }
        .sg.in > *:nth-child(5) { transition-delay:.24s; opacity:1; transform:translateY(0); }
        .sg.in > *:nth-child(6) { transition-delay:.30s; opacity:1; transform:translateY(0); }
        .sg.in > *:nth-child(7) { transition-delay:.36s; opacity:1; transform:translateY(0); }
        .sg.in > *:nth-child(8) { transition-delay:.42s; opacity:1; transform:translateY(0); }

        .card-pop { transition: transform .2s ease, box-shadow .2s ease; }
        .card-pop:active { transform: scale(0.97); }
        @media (hover:hover) { .card-pop:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(0,0,0,0.08); } }

        .cat-card { transition: transform .25s cubic-bezier(.16,1,.3,1), box-shadow .25s ease; cursor: pointer; }
        .cat-card:active { transform: scale(0.95); }
        @media (hover:hover) { .cat-card:hover { transform: translateY(-2px) scale(1.02); box-shadow: 0 6px 20px rgba(0,0,0,0.06); } }

        .hide-scrollbar { scrollbar-width: none; }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .line-clamp-2 { display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
        .line-clamp-1 { display:-webkit-box; -webkit-line-clamp:1; -webkit-box-orient:vertical; overflow:hidden; }

        .search-ring { transition: box-shadow .2s ease, border-color .2s ease; }
        .search-ring:focus { border-color: ${O}; box-shadow: 0 0 0 3px rgba(255,107,53,0.15); outline:none; }

        .sort-btn { transition: all .15s ease; }
        .sort-btn:hover { background: #F3F4F6; }

        .load-btn { transition: all .3s cubic-bezier(.16,1,.3,1); }
        .load-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 16px rgba(255,107,53,0.25); }
        .load-btn:active { transform: scale(0.97); }

        .shop-row { transition: background .15s ease; }
        .shop-row:hover { background: rgba(255,107,53,0.03); }
      `}</style>

      {/* ═══════════ HERO + SEARCH ═══════════ */}
      <section style={{
        background: "linear-gradient(180deg, #FFF8F3 0%, #FFFCF8 100%)",
        padding: "0 0 12px",
        position: "relative",
      }}>
        {/* Subtle pattern overlay */}
        <div style={{
          position: "absolute", inset: 0, opacity: 0.02, pointerEvents: "none",
          backgroundImage: `url("data:image/svg+xml,${encodeURIComponent('<svg width="40" height="40" xmlns="http://www.w3.org/2000/svg"><path d="M20 2L23 17L38 20L23 23L20 38L17 23L2 20L17 17Z" fill="#FF6B35" fill-opacity="0.5"/></svg>')}")`,
          backgroundSize: "40px 40px",
        }} />

        {/* Nav bar */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 20px 0",
          opacity: mounted ? 1 : 0,
          transform: mounted ? "translateY(0)" : "translateY(-10px)",
          transition: "all .6s cubic-bezier(.16,1,.3,1) .1s",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{
              width: "32px", height: "32px", borderRadius: "10px", background: O,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg viewBox="0 0 120 120" width="20" height="20">
                <path d="M24 52 L60 28 L96 52" stroke="#fff" strokeWidth="6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                <rect x="38" y="56" width="44" height="28" rx="3" fill="none" stroke="#fff" strokeWidth="4" />
              </svg>
            </div>
            <span style={{ fontSize: "18px", fontWeight: 800, color: N, letterSpacing: "-0.02em" }}>
              souk<span style={{ color: O }}>.</span>et
            </span>
          </div>
          <span style={{ fontSize: "12px", color: "#9CA3AF", fontWeight: 500 }}>
            {totalProducts} {totalProducts === 1 ? "product" : "products"}
          </span>
        </div>

        {/* Amharic headline + search */}
        <div style={{
          padding: "28px 20px 0",
          opacity: mounted ? 1 : 0,
          transform: mounted ? "translateY(0)" : "translateY(16px)",
          transition: "all .7s cubic-bezier(.16,1,.3,1) .25s",
        }}>
          <h1 style={{
            fontSize: "clamp(1.6rem, 6vw, 2.2rem)",
            fontWeight: 800, color: N,
            letterSpacing: "-0.02em", lineHeight: 1.15,
            marginBottom: "6px",
          }}>
            ምን ትፈልጋለህ<span style={{ color: O }}>?</span>
          </h1>
          <p style={{ fontSize: "14px", color: "#6B7280", marginBottom: "16px", fontWeight: 500 }}>
            Discover products from Ethiopian sellers
          </p>

          {/* Search bar */}
          <div style={{ position: "relative" }}>
            <svg style={{
              position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)",
              width: "18px", height: "18px", color: "#9CA3AF", pointerEvents: "none",
            }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
            <input
              type="text"
              placeholder="Search products or shops..."
              value={searchInput}
              onChange={(e) => handleSearch(e.target.value)}
              className="search-ring"
              style={{
                width: "100%", padding: "14px 14px 14px 42px",
                fontSize: "15px", fontWeight: 500,
                border: "2px solid #E5E7EB", borderRadius: "14px",
                background: "white", color: N,
                boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
              }}
            />
            {searchQuery && (
              <span style={{
                position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)",
                fontSize: "12px", color: "#9CA3AF", fontWeight: 600,
              }}>
                {products.length} found
              </span>
            )}
          </div>
        </div>

        {/* Popular category pills */}
        <div style={{
          padding: "14px 20px 0",
          opacity: mounted ? 1 : 0,
          transform: mounted ? "translateY(0)" : "translateY(10px)",
          transition: "all .6s cubic-bezier(.16,1,.3,1) .45s",
        }}>
          <div className="hide-scrollbar" style={{
            display: "flex", gap: "8px", overflowX: "auto",
            padding: "2px 0 8px",
          }}>
            <button
              onClick={() => handleCategory(null)}
              style={{
                flexShrink: 0, padding: "7px 14px", borderRadius: "10px",
                fontSize: "13px", fontWeight: 600, border: "1.5px solid",
                cursor: "pointer",
                background: !selectedCategory ? O : "white",
                color: !selectedCategory ? "white" : "#4B5563",
                borderColor: !selectedCategory ? O : "#E5E7EB",
              }}
            >
              All
            </button>
            {CATEGORIES.map((c) => (
              <button
                key={c.key}
                onClick={() => handleCategory(selectedCategory === c.key ? null : c.key)}
                style={{
                  flexShrink: 0, padding: "7px 14px", borderRadius: "10px",
                  fontSize: "13px", fontWeight: 600, border: "1.5px solid",
                  cursor: "pointer",
                  background: selectedCategory === c.key ? O : "white",
                  color: selectedCategory === c.key ? "white" : "#4B5563",
                  borderColor: selectedCategory === c.key ? O : "#E5E7EB",
                }}
              >
                {c.emoji} {c.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ CATEGORY CARDS ═══════════ */}
      {!searchQuery && !selectedCategory && (
        <section style={{ padding: "20px 20px 8px" }}>
          <div id="cat-h" data-reveal className={`sr ${v("cat-h") ? "in" : ""}`}>
            <h2 style={{
              fontSize: "18px", fontWeight: 800, color: N,
              letterSpacing: "-0.01em", marginBottom: "14px",
            }}>
              Browse
            </h2>
          </div>
          <div
            id="cat-g" data-reveal
            className={`sg ${v("cat-g") ? "in" : ""}`}
            style={{
              display: "grid", gridTemplateColumns: "1fr 1fr",
              gap: "10px",
            }}
          >
            {CATEGORIES.map((c) => {
              const count = categoryCounts[c.key] || 0;
              return (
                <div
                  key={c.key}
                  className="cat-card"
                  onClick={() => handleCategory(c.key)}
                  style={{
                    background: c.bg, border: `1.5px solid ${c.border}`,
                    borderRadius: "16px", padding: "16px",
                    display: "flex", flexDirection: "column", gap: "4px",
                  }}
                >
                  <span style={{ fontSize: "28px", lineHeight: 1 }}>{c.emoji}</span>
                  <span style={{ fontSize: "14px", fontWeight: 700, color: N, marginTop: "4px" }}>
                    {c.label}
                  </span>
                  <span style={{ fontSize: "12px", color: "#6B7280", fontWeight: 500 }}>
                    {count} {count === 1 ? "item" : "items"}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ═══════════ PRODUCT FEED ═══════════ */}
      <section style={{ padding: "20px 20px 16px" }}>
        {/* Header + sort */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          marginBottom: "14px",
        }}>
          <h2 style={{ fontSize: "18px", fontWeight: 800, color: N, letterSpacing: "-0.01em" }}>
            {searchQuery
              ? `Results for "${searchQuery}"`
              : activeLabel
                ? activeLabel
                : "New on souk.et"}
          </h2>
          <div style={{ display: "flex", gap: "4px" }}>
            {(["newest", "price_asc", "price_desc"] as const).map((s) => {
              const labels = { newest: "New", price_asc: "↑", price_desc: "↓" };
              return (
                <button
                  key={s}
                  onClick={() => handleSort(s)}
                  className="sort-btn"
                  style={{
                    padding: "5px 10px", borderRadius: "8px", fontSize: "12px",
                    fontWeight: sortBy === s ? 700 : 500, border: "none", cursor: "pointer",
                    background: sortBy === s ? `${O}15` : "transparent",
                    color: sortBy === s ? O : "#9CA3AF",
                  }}
                >
                  {labels[s]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Product grid */}
        {products.length === 0 ? (
          <div style={{
            textAlign: "center", padding: "48px 20px",
            background: "white", borderRadius: "20px",
            border: "1px solid #F3F4F6",
          }}>
            <div style={{ fontSize: "40px", marginBottom: "12px" }}>🔍</div>
            <p style={{ fontSize: "15px", fontWeight: 600, color: N, marginBottom: "4px" }}>
              No products found
            </p>
            <p style={{ fontSize: "13px", color: "#9CA3AF" }}>
              Try a different search or category
            </p>
            {(searchQuery || selectedCategory) && (
              <button
                onClick={() => { handleSearch(""); handleCategory(null); }}
                style={{
                  marginTop: "12px", padding: "8px 20px", borderRadius: "10px",
                  background: O, color: "white", border: "none", fontSize: "13px",
                  fontWeight: 600, cursor: "pointer",
                }}
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px",
          }}>
            {products.map((p, idx) => {
              const isSoldOut = p.stock === 0;
              const priceText = fmtPrice(p.price, p.price_type);
              return (
                <div
                  key={p.id}
                  className="card-pop"
                  style={{
                    background: "white", borderRadius: "16px", overflow: "hidden",
                    border: "1px solid #F3F4F6",
                    animation: `fadeUp .5s cubic-bezier(.16,1,.3,1) ${Math.min(idx * 0.05, 0.5)}s both`,
                  }}
                >
                  <Link href={`/${p.shop_slug}/${p.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                    <div style={{ position: "relative", aspectRatio: "1", background: "#F9FAFB", overflow: "hidden" }}>
                      {p.photo_url ? (
                        <img
                          src={p.photo_url}
                          alt={p.name}
                          loading="lazy"
                          decoding="async"
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      ) : (
                        <div style={{
                          width: "100%", height: "100%",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          background: "linear-gradient(135deg, #FFF8F3, #FFF0E6)",
                        }}>
                          <span style={{ fontSize: "32px", opacity: 0.3 }}>📦</span>
                        </div>
                      )}
                      {isSoldOut && (
                        <div style={{
                          position: "absolute", inset: 0,
                          background: "rgba(0,0,0,0.45)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          <span style={{
                            color: "white", fontWeight: 700, fontSize: "11px",
                            background: "rgba(0,0,0,0.5)", padding: "4px 10px",
                            borderRadius: "20px",
                          }}>Sold out</span>
                        </div>
                      )}
                      {!isSoldOut && p.stock !== null && p.stock > 0 && p.stock <= 5 && (
                        <div style={{
                          position: "absolute", top: "6px", right: "6px",
                          fontSize: "10px", fontWeight: 700,
                          padding: "2px 6px", borderRadius: "6px",
                          background: "#FEF3C7", color: "#92400E",
                        }}>
                          {p.stock} left
                        </div>
                      )}
                      {p.tag && (
                        <div style={{
                          position: "absolute", bottom: "6px", left: "6px",
                          fontSize: "10px", fontWeight: 600,
                          padding: "2px 7px", borderRadius: "6px",
                          background: "rgba(255,255,255,0.9)", color: "#374151",
                          backdropFilter: "blur(4px)",
                        }}>
                          {TAG_LABELS[p.tag] || p.tag}
                        </div>
                      )}
                    </div>
                  </Link>
                  <div style={{ padding: "10px 12px 12px" }}>
                    <Link href={`/${p.shop_slug}/${p.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                      <h3 className="line-clamp-2" style={{
                        fontSize: "13px", fontWeight: 700, color: N,
                        lineHeight: 1.35, marginBottom: "3px",
                      }}>
                        {p.name}
                      </h3>
                    </Link>
                    <p style={{
                      fontSize: "14px", fontWeight: 800, color: O,
                      marginBottom: "4px",
                    }}>
                      {priceText}
                    </p>
                    <Link href={`/${p.shop_slug}`} style={{ textDecoration: "none" }}>
                      <p className="line-clamp-1" style={{
                        fontSize: "11px", fontWeight: 500, color: "#9CA3AF",
                      }}>
                        {p.shop_name}
                      </p>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Load more */}
        {hasMore && products.length > 0 && (
          <div style={{ textAlign: "center", marginTop: "20px" }}>
            <button
              onClick={loadMore}
              disabled={loading}
              className="load-btn"
              style={{
                padding: "12px 32px", borderRadius: "12px",
                background: O, color: "white", border: "none",
                fontSize: "14px", fontWeight: 700, cursor: "pointer",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? (
                <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                  <svg style={{ width: "16px", height: "16px", animation: "spin 1s linear infinite" }} viewBox="0 0 24 24" fill="none">
                    <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Loading...
                </span>
              ) : "Load more"}
            </button>
          </div>
        )}
      </section>

      {/* ═══════════ SHOP DIRECTORY ═══════════ */}
      {filteredShops.length > 0 && (
        <section style={{ padding: "8px 20px 20px" }}>
          <div id="shop-h" data-reveal className={`sr ${v("shop-h") ? "in" : ""}`}>
            <h2 style={{
              fontSize: "18px", fontWeight: 800, color: N,
              letterSpacing: "-0.01em", marginBottom: "12px",
            }}>
              Shops
            </h2>
          </div>
          <div
            id="shop-g" data-reveal
            className={`sg ${v("shop-g") ? "in" : ""}`}
            style={{
              background: "white", borderRadius: "20px",
              border: "1px solid #F3F4F6",
              overflow: "hidden",
            }}
          >
            {filteredShops.map((s, idx) => (
              <Link key={s.shop_slug} href={`/${s.shop_slug}`} style={{ textDecoration: "none", color: "inherit" }}>
                <div
                  className="shop-row"
                  style={{
                    display: "flex", alignItems: "center", gap: "12px",
                    padding: "14px 16px",
                    borderBottom: idx < filteredShops.length - 1 ? "1px solid #F9FAFB" : "none",
                  }}
                >
                  {/* Avatar */}
                  <div style={{
                    width: "40px", height: "40px", borderRadius: "12px",
                    flexShrink: 0, overflow: "hidden",
                    background: s.logo_url ? "transparent" : `linear-gradient(135deg, ${O}20, ${G}20)`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {s.logo_url ? (
                      <img src={s.logo_url} alt={s.shop_name} style={{ width: "100%", height: "100%", objectFit: "cover" }} loading="lazy" />
                    ) : (
                      <span style={{ fontSize: "16px", fontWeight: 800, color: O }}>
                        {s.shop_name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p className="line-clamp-1" style={{ fontSize: "14px", fontWeight: 700, color: N }}>
                      {s.shop_name}
                    </p>
                    <p className="line-clamp-1" style={{ fontSize: "12px", color: "#9CA3AF", marginTop: "1px" }}>
                      {s.category && `${CATEGORY_EMOJI[s.category] || ""} ${s.category.charAt(0).toUpperCase() + s.category.slice(1)}`}
                      {s.location_text && ` · ${s.location_text}`}
                      {` · ${s.product_count} ${s.product_count === 1 ? "product" : "products"}`}
                    </p>
                  </div>
                  {/* Chevron */}
                  <svg style={{ width: "16px", height: "16px", color: "#D1D5DB", flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ═══════════ SELLER CTA ═══════════ */}
      <section
        id="cta-s" data-reveal
        className={`sr ${v("cta-s") ? "in" : ""}`}
        style={{
          margin: "8px 20px 20px",
          background: `linear-gradient(135deg, ${O}, #E85D2A)`,
          borderRadius: "24px",
          padding: "36px 24px",
          textAlign: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Pattern overlay */}
        <div style={{
          position: "absolute", inset: 0, opacity: 0.06, pointerEvents: "none",
          backgroundImage: `url("data:image/svg+xml,${encodeURIComponent('<svg width="40" height="40" xmlns="http://www.w3.org/2000/svg"><path d="M20 2L23 17L38 20L23 23L20 38L17 23L2 20L17 17Z" fill="white" fill-opacity="0.8"/></svg>')}")`,
          backgroundSize: "40px 40px",
        }} />

        <div style={{ position: "relative" }}>
          <p style={{ fontSize: "28px", marginBottom: "12px" }}>🏪</p>
          <h2 style={{
            fontSize: "20px", fontWeight: 800, color: "white",
            letterSpacing: "-0.01em", marginBottom: "8px",
          }}>
            Do you sell on Telegram?
          </h2>
          <p style={{
            fontSize: "14px", color: "rgba(255,255,255,0.8)",
            lineHeight: 1.6, marginBottom: "20px",
            maxWidth: "320px", marginLeft: "auto", marginRight: "auto",
          }}>
            Turn your channel into a professional shop — free.
            Beautiful product cards. Shareable catalog. Organized contacts.
          </p>
          <a
            href="https://t.me/SoukEtBot"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex", alignItems: "center", gap: "8px",
              padding: "14px 28px", borderRadius: "14px",
              background: "white", color: O,
              fontWeight: 700, fontSize: "15px",
              textDecoration: "none",
              boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
              transition: "all .2s ease",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill={O}>
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.07-.18c-.08-.05-.19-.03-.27-.02-.12.03-1.99 1.27-5.62 3.72-.53.36-1.01.54-1.44.53-.47-.01-1.38-.27-2.06-.49-.83-.27-1.49-.42-1.43-.88.03-.24.37-.49 1.02-.74 3.98-1.73 6.64-2.88 7.97-3.44 3.8-1.58 4.59-1.86 5.1-1.87.11 0 .37.03.53.17.14.12.18.28.2.46-.01.06.01.24 0 .37z" />
            </svg>
            Create Your Shop →
          </a>
        </div>
      </section>

      {/* ═══════════ FOOTER ═══════════ */}
      <footer style={{
        background: "#1A1A1F",
        padding: "36px 20px 32px",
        textAlign: "center",
      }}>
        <p style={{
          fontSize: "16px", fontWeight: 800, color: "white",
          letterSpacing: "-0.01em",
        }}>
          souk<span style={{ color: O }}>.</span>et
        </p>
        <p style={{
          fontSize: "12px", color: "rgba(255,255,255,0.35)",
          marginTop: "4px", fontWeight: 500,
        }}>
          Where Ethiopia Shops
        </p>
        <div style={{
          marginTop: "20px",
          display: "flex", flexDirection: "column", alignItems: "center", gap: "10px",
        }}>
          <div style={{ display: "flex", gap: "20px" }}>
            <a href="/" style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", textDecoration: "none" }}>Browse</a>
            <a href="https://t.me/SoukEtBot" target="_blank" rel="noopener noreferrer" style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", textDecoration: "none" }}>
              Create a Shop
            </a>
          </div>
          <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.2)", marginTop: "8px" }}>
            © 2026 souk.et
          </p>
        </div>
      </footer>
    </div>
  );
}
