"use client";

import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import Link from "next/link";

/* ─── Types ──────────────────────────────────────────────── */

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

/* ─── Design tokens ──────────────────────────────────────── */
const C = {
  bg:     "#FAF8F2",
  dark:   "#1A1008",
  gold:   "#C8891A",
  terra:  "#C04820",
  sand:   "#EDE4CF",
  sage:   "#4A6B4A",
  text:   "#2E1F0A",
  muted:  "#7B6548",
  border: "#E0D5C0",
  white:  "#FFFFFF",
};

const CATEGORIES = [
  { key: "food",        label: "Food & Bakery",    am: "ምግብ",     emoji: "🎂", color: "#F59E0B" },
  { key: "fashion",     label: "Fashion",          am: "ልብስ",     emoji: "👗", color: "#EC4899" },
  { key: "electronics", label: "Electronics",      am: "ኤሌክትሮኒክ", emoji: "📱", color: "#3B82F6" },
  { key: "beauty",      label: "Beauty",           am: "ውበት",     emoji: "💄", color: "#F43F5E" },
  { key: "handmade",    label: "Handmade",         am: "እጅ ስራ",  emoji: "🏺", color: "#D97706" },
  { key: "coffee",      label: "Coffee & Spices",  am: "ቡና",      emoji: "☕", color: "#92400E" },
  { key: "home",        label: "Home",             am: "ቤት",      emoji: "🛋", color: "#059669" },
  { key: "service",     label: "Services",         am: "አገልግሎት", emoji: "💼", color: "#7C3AED" },
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

/* ─── Helpers ─────────────────────────────────────────────── */

function fmtPrice(price: number | null, pt: string | null): string {
  if (pt === "contact" || price === null) return "ለዋጋ ያግኙን";
  const f = price.toLocaleString();
  if (pt === "starting_from") return `ከ ${f} ብር`;
  return `${f} ብር`;
}

function initials(name: string) {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

/* ─── Sub-components ──────────────────────────────────────── */

function ProductCard({ p, delay = 0 }: { p: MarketProduct; delay?: number }) {
  const isSoldOut = p.stock === 0;
  return (
    <Link href={`/${p.shop_slug}/${p.id}`} style={{ textDecoration: "none", color: "inherit" }}>
      <div className="pcard" style={{
        background: C.white,
        borderRadius: "18px",
        overflow: "hidden",
        border: `1.5px solid ${C.border}`,
        flexShrink: 0,
        width: "180px",
        animationDelay: `${delay}s`,
      }}>
        {/* Image */}
        <div style={{ position: "relative", width: "100%", aspectRatio: "1", background: C.sand, overflow: "hidden" }}>
          {p.photo_url ? (
            <img src={p.photo_url} alt={p.name} loading="lazy" decoding="async"
              style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center",
              justifyContent: "center", background: `linear-gradient(135deg, #F5EDD8, #EDE0C4)` }}>
              <span style={{ fontSize: "36px", opacity: 0.35 }}>
                {CATEGORIES.find(c => c.key === p.shop_category)?.emoji || "📦"}
              </span>
            </div>
          )}
          {isSoldOut && (
            <div style={{ position: "absolute", inset: 0, background: "rgba(26,16,8,0.55)",
              display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: "white", fontSize: "11px", fontWeight: 700,
                background: "rgba(0,0,0,0.4)", padding: "4px 10px", borderRadius: "20px" }}>
                Sold out
              </span>
            </div>
          )}
          {p.tag && (
            <div style={{ position: "absolute", bottom: "8px", left: "8px", fontSize: "10px",
              fontWeight: 600, padding: "2px 7px", borderRadius: "6px",
              background: "rgba(255,255,255,0.92)", color: C.text, backdropFilter: "blur(6px)" }}>
              {TAG_LABELS[p.tag] || p.tag}
            </div>
          )}
        </div>
        {/* Info */}
        <div style={{ padding: "10px 12px 13px" }}>
          <p style={{ fontSize: "13px", fontWeight: 700, color: C.dark, lineHeight: 1.3,
            display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
            marginBottom: "4px" }}>
            {p.name}
          </p>
          <p style={{ fontSize: "14px", fontWeight: 800, color: C.terra }}>{fmtPrice(p.price, p.price_type)}</p>
          <p style={{ fontSize: "11px", color: C.muted, marginTop: "2px",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {p.shop_name}
          </p>
        </div>
      </div>
    </Link>
  );
}

function ShopCard({ s }: { s: MarketShop }) {
  const cat = CATEGORIES.find(c => c.key === s.category);
  return (
    <Link href={`/${s.shop_slug}`} style={{ textDecoration: "none", color: "inherit", flexShrink: 0, width: "160px" }}>
      <div className="scard" style={{
        background: C.white,
        border: `1.5px solid ${C.border}`,
        borderRadius: "20px",
        padding: "18px 14px",
        textAlign: "center",
      }}>
        {/* Avatar */}
        <div style={{
          width: "52px", height: "52px", borderRadius: "16px", margin: "0 auto 10px",
          overflow: "hidden", flexShrink: 0,
          background: s.logo_url ? "transparent" : `linear-gradient(135deg, ${cat?.color || C.gold}22, ${cat?.color || C.gold}44)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          border: `2px solid ${cat?.color || C.gold}33`,
        }}>
          {s.logo_url ? (
            <img src={s.logo_url} alt={s.shop_name} loading="lazy"
              style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <span style={{ fontSize: "18px", fontWeight: 800, color: cat?.color || C.gold }}>
              {initials(s.shop_name)}
            </span>
          )}
        </div>
        <p style={{ fontSize: "13px", fontWeight: 700, color: C.dark, marginBottom: "3px",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {s.shop_name}
        </p>
        {cat && (
          <p style={{ fontSize: "11px", color: cat.color, fontWeight: 600, marginBottom: "2px" }}>
            {cat.emoji} {cat.label}
          </p>
        )}
        <p style={{ fontSize: "11px", color: C.muted }}>
          {s.product_count} {s.product_count === 1 ? "item" : "items"}
        </p>
      </div>
    </Link>
  );
}

/* ─── Main component ─────────────────────────────────────── */

export default function MarketplaceClient({ initialProducts, initialShops, categoryCounts, totalProducts }: Props) {
  const [mounted, setMounted] = useState(false);
  const [browseMode, setBrowseMode] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"newest" | "price_asc" | "price_desc">("newest");
  const [browseProducts, setBrowseProducts] = useState<MarketProduct[]>([]);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const browseRef = useRef<HTMLDivElement>(null);

  useEffect(() => { requestAnimationFrame(() => setMounted(true)); }, []);

  const featuredProducts = useMemo(() => initialProducts.slice(0, 8), [initialProducts]);
  const featuredShops = useMemo(() => initialShops.slice(0, 10), [initialShops]);
  const totalShops = initialShops.length;

  async function fetchBrowse(q: string, cat: string | null, sort: string, off: number, append = false) {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (cat) params.set("category", cat);
      params.set("sort", sort);
      params.set("offset", String(off));
      params.set("limit", "20");
      const res = await fetch(`/api/marketplace?${params}`);
      if (!res.ok) return;
      const data = await res.json();
      if (append) setBrowseProducts(prev => [...prev, ...data.products]);
      else setBrowseProducts(data.products);
      setHasMore(data.products.length >= 20);
      setOffset(off + data.products.length);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }

  function openBrowse(cat?: string) {
    const c = cat || null;
    setSelectedCategory(c);
    setBrowseMode(true);
    fetchBrowse("", c, "newest", 0);
    setTimeout(() => browseRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  function handleSearch(value: string) {
    setSearchInput(value);
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setSearchQuery(value);
      if (value.length >= 2 || value.length === 0) {
        fetchBrowse(value, selectedCategory, sortBy, 0);
      }
    }, 300);
  }

  function handleCategory(cat: string | null) {
    setSelectedCategory(cat);
    fetchBrowse(searchQuery, cat, sortBy, 0);
  }

  return (
    <div style={{ background: C.bg, overflowX: "hidden", minHeight: "100vh" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Noto+Sans+Ethiopic:wght@400;500;600;700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Plus Jakarta Sans', 'Noto Sans Ethiopic', system-ui, sans-serif; }

        /* Animations */
        @keyframes fadeUp   { from { opacity:0; transform:translateY(28px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fadeIn   { from { opacity:0; } to { opacity:1; } }
        @keyframes slideR   { from { opacity:0; transform:translateX(24px); } to { opacity:1; transform:translateX(0); } }
        @keyframes pulse    { 0%,100% { opacity:1; } 50% { opacity:0.6; } }
        @keyframes spin     { to { transform:rotate(360deg); } }
        @keyframes float    { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-8px); } }

        .hero-text   { animation: fadeUp .9s cubic-bezier(.16,1,.3,1) .1s both; }
        .hero-sub    { animation: fadeUp .9s cubic-bezier(.16,1,.3,1) .25s both; }
        .hero-cta    { animation: fadeUp .9s cubic-bezier(.16,1,.3,1) .4s both; }
        .hero-stats  { animation: fadeUp .9s cubic-bezier(.16,1,.3,1) .55s both; }
        .hero-visual { animation: fadeIn 1.2s ease .3s both; }

        .pcard { transition: transform .25s cubic-bezier(.16,1,.3,1), box-shadow .25s ease; }
        .pcard:hover { transform: translateY(-4px); box-shadow: 0 12px 32px rgba(26,16,8,.12); }

        .scard { transition: transform .25s cubic-bezier(.16,1,.3,1), box-shadow .25s ease, border-color .2s ease; }
        .scard:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(26,16,8,.1); border-color: ${C.gold}66 !important; }

        .catpill { transition: all .2s ease; cursor: pointer; border: none; }
        .catpill:hover { transform: translateY(-1px); }

        .cta-btn { transition: all .25s cubic-bezier(.16,1,.3,1); }
        .cta-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 28px rgba(192,72,32,.35); }
        .cta-btn:active { transform: scale(0.97); }

        .ghost-btn { transition: all .2s ease; }
        .ghost-btn:hover { background: ${C.dark}0D !important; }

        .hide-scrollbar { scrollbar-width: none; }
        .hide-scrollbar::-webkit-scrollbar { display: none; }

        .search-input { transition: border-color .2s ease, box-shadow .2s ease; outline: none; }
        .search-input:focus { border-color: ${C.terra} !important; box-shadow: 0 0 0 3px ${C.terra}20 !important; }

        .browse-card { transition: transform .2s ease, box-shadow .2s ease; }
        .browse-card:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(26,16,8,.08); }

        /* Ethiopian cross pattern */
        .eth-pattern {
          background-image: url("data:image/svg+xml,${encodeURIComponent(
            '<svg width="32" height="32" xmlns="http://www.w3.org/2000/svg"><path d="M16 4 L18 14 L28 16 L18 18 L16 28 L14 18 L4 16 L14 14 Z" fill="none" stroke="%23C8891A" stroke-width="1" opacity="0.18"/></svg>'
          )}");
          background-size: 32px 32px;
        }
      `}</style>

      {/* ══════════════════════════════════════
          NAV
      ══════════════════════════════════════ */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "rgba(250,248,242,0.92)",
        backdropFilter: "blur(12px)",
        borderBottom: `1px solid ${C.border}`,
        padding: "0 20px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        height: "58px",
        opacity: mounted ? 1 : 0,
        transition: "opacity .5s ease .1s",
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{
            width: "34px", height: "34px", borderRadius: "10px",
            background: `linear-gradient(135deg, ${C.terra}, ${C.gold})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke="#fff" strokeWidth="2" strokeLinejoin="round" />
              <path d="M9 22V12h6v10" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <span style={{ fontSize: "19px", fontWeight: 800, color: C.dark, letterSpacing: "-0.03em" }}>
            souk<span style={{ color: C.terra }}>.</span>et
          </span>
        </div>

        {/* Nav CTA */}
        <a href="https://t.me/SoukEtBot" target="_blank" rel="noopener noreferrer"
          className="ghost-btn"
          style={{
            padding: "8px 16px", borderRadius: "10px", fontSize: "13px", fontWeight: 700,
            color: C.terra, background: `${C.terra}10`, textDecoration: "none",
            border: `1.5px solid ${C.terra}30`,
          }}>
          + Create Shop
        </a>
      </nav>

      {/* ══════════════════════════════════════
          HERO
      ══════════════════════════════════════ */}
      <section style={{
        position: "relative",
        padding: "52px 24px 48px",
        overflow: "hidden",
      }}>
        {/* Background pattern */}
        <div className="eth-pattern" style={{
          position: "absolute", inset: 0, opacity: 0.5, pointerEvents: "none",
        }} />
        {/* Warm gradient blob */}
        <div style={{
          position: "absolute", top: "-80px", right: "-60px",
          width: "320px", height: "320px",
          background: `radial-gradient(circle, ${C.gold}20 0%, transparent 70%)`,
          pointerEvents: "none",
        }} />
        <div style={{
          position: "absolute", bottom: "-40px", left: "-40px",
          width: "240px", height: "240px",
          background: `radial-gradient(circle, ${C.terra}14 0%, transparent 70%)`,
          pointerEvents: "none",
        }} />

        <div style={{ position: "relative", maxWidth: "600px", margin: "0 auto" }}>
          {/* Eyebrow */}
          <div className="hero-text" style={{
            display: "inline-flex", alignItems: "center", gap: "6px",
            background: `${C.gold}18`, border: `1px solid ${C.gold}40`,
            padding: "5px 12px", borderRadius: "20px", marginBottom: "20px",
          }}>
            <span style={{ fontSize: "14px" }}>🇪🇹</span>
            <span style={{ fontSize: "12px", fontWeight: 700, color: C.gold, letterSpacing: "0.04em" }}>
              ETHIOPIAN MARKETPLACE
            </span>
          </div>

          {/* Headline */}
          <h1 className="hero-sub" style={{
            fontSize: "clamp(2.2rem, 8vw, 3.2rem)",
            fontWeight: 800,
            color: C.dark,
            letterSpacing: "-0.03em",
            lineHeight: 1.08,
            marginBottom: "8px",
          }}>
            ሱቅ<span style={{ color: C.terra }}>።</span>{" "}
            <br />
            <span style={{ color: C.dark }}>Your Shop,</span>
            <br />
            <span style={{ color: C.terra }}>Made Beautiful.</span>
          </h1>

          {/* Sub */}
          <p className="hero-cta" style={{
            fontSize: "15px", color: C.muted, fontWeight: 500,
            lineHeight: 1.6, marginBottom: "28px", maxWidth: "380px",
          }}>
            Turn your Telegram into a professional shop — free.
            Add products, share your catalog, and start selling today.
          </p>

          {/* CTAs */}
          <div className="hero-cta" style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "32px" }}>
            <a
              href="https://t.me/SoukEtBot"
              target="_blank"
              rel="noopener noreferrer"
              className="cta-btn"
              style={{
                display: "inline-flex", alignItems: "center", gap: "8px",
                padding: "14px 26px", borderRadius: "14px",
                background: `linear-gradient(135deg, ${C.terra}, #A83A18)`,
                color: "white", fontWeight: 700, fontSize: "15px",
                textDecoration: "none",
                boxShadow: `0 4px 20px ${C.terra}40`,
              }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.07-.18c-.08-.05-.19-.03-.27-.02-.12.03-1.99 1.27-5.62 3.72-.53.36-1.01.54-1.44.53-.47-.01-1.38-.27-2.06-.49-.83-.27-1.49-.42-1.43-.88.03-.24.37-.49 1.02-.74 3.98-1.73 6.64-2.88 7.97-3.44 3.8-1.58 4.59-1.86 5.1-1.87.11 0 .37.03.53.17.14.12.18.28.2.46-.01.06.01.24 0 .37z" />
              </svg>
              Start Selling Free
            </a>
            <button
              onClick={() => openBrowse()}
              className="ghost-btn"
              style={{
                display: "inline-flex", alignItems: "center", gap: "6px",
                padding: "14px 22px", borderRadius: "14px",
                background: "transparent",
                color: C.text, fontWeight: 700, fontSize: "15px",
                border: `2px solid ${C.border}`,
                cursor: "pointer",
              }}>
              Browse Products
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </button>
          </div>

          {/* Stats bar */}
          <div className="hero-stats" style={{
            display: "flex", gap: "24px", flexWrap: "wrap",
          }}>
            {[
              { n: `${totalShops}+`, label: "shops" },
              { n: `${totalProducts}+`, label: "products" },
              { n: CATEGORIES.length.toString(), label: "categories" },
            ].map(({ n, label }) => (
              <div key={label}>
                <span style={{ fontSize: "20px", fontWeight: 800, color: C.dark }}>{n}</span>
                <span style={{ fontSize: "13px", color: C.muted, fontWeight: 500, marginLeft: "4px" }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          CATEGORIES
      ══════════════════════════════════════ */}
      <section style={{ padding: "0 0 8px" }}>
        <div className="hide-scrollbar" style={{
          display: "flex", gap: "10px", overflowX: "auto",
          padding: "0 24px 12px",
        }}>
          {CATEGORIES.map((c) => {
            const count = categoryCounts[c.key] || 0;
            if (!count) return null;
            return (
              <button
                key={c.key}
                onClick={() => openBrowse(c.key)}
                className="catpill"
                style={{
                  flexShrink: 0,
                  display: "flex", flexDirection: "column", alignItems: "center",
                  gap: "4px",
                  padding: "14px 16px",
                  borderRadius: "18px",
                  background: `${c.color}12`,
                  border: `1.5px solid ${c.color}30`,
                  minWidth: "84px",
                }}>
                <span style={{ fontSize: "24px", lineHeight: 1 }}>{c.emoji}</span>
                <span style={{ fontSize: "12px", fontWeight: 700, color: c.color }}>{c.label}</span>
                <span style={{ fontSize: "10px", fontWeight: 500, color: C.muted }}>{count} items</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ══════════════════════════════════════
          FEATURED PRODUCTS
      ══════════════════════════════════════ */}
      {featuredProducts.length > 0 && (
        <section style={{ padding: "24px 0 8px" }}>
          {/* Header */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "0 24px", marginBottom: "16px",
          }}>
            <div>
              <h2 style={{ fontSize: "20px", fontWeight: 800, color: C.dark, letterSpacing: "-0.02em" }}>
                New Arrivals
              </h2>
              <p style={{ fontSize: "13px", color: C.muted, marginTop: "2px" }}>
                Latest from Ethiopian sellers
              </p>
            </div>
            <button
              onClick={() => openBrowse()}
              style={{
                fontSize: "13px", fontWeight: 700, color: C.terra,
                background: "none", border: "none", cursor: "pointer",
                padding: "4px 0",
                textDecoration: "none",
                display: "flex", alignItems: "center", gap: "3px",
              }}>
              See all
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </div>

          {/* Horizontal scroll */}
          <div className="hide-scrollbar" style={{
            display: "flex", gap: "12px", overflowX: "auto",
            padding: "4px 24px 16px",
          }}>
            {featuredProducts.map((p, i) => (
              <ProductCard key={p.id} p={p} delay={i * 0.04} />
            ))}
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════
          SHOPS
      ══════════════════════════════════════ */}
      {featuredShops.length > 0 && (
        <section style={{ padding: "24px 0 8px" }}>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "0 24px", marginBottom: "16px",
          }}>
            <div>
              <h2 style={{ fontSize: "20px", fontWeight: 800, color: C.dark, letterSpacing: "-0.02em" }}>
                Shops
              </h2>
              <p style={{ fontSize: "13px", color: C.muted, marginTop: "2px" }}>
                Browse by seller
              </p>
            </div>
          </div>

          <div className="hide-scrollbar" style={{
            display: "flex", gap: "12px", overflowX: "auto",
            padding: "4px 24px 16px",
          }}>
            {featuredShops.map((s) => (
              <ShopCard key={s.shop_slug} s={s} />
            ))}
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════
          HOW IT WORKS
      ══════════════════════════════════════ */}
      <section style={{
        margin: "24px 20px",
        background: `linear-gradient(135deg, ${C.dark} 0%, #2D1A08 100%)`,
        borderRadius: "28px",
        padding: "40px 28px",
        position: "relative",
        overflow: "hidden",
      }}>
        <div className="eth-pattern" style={{
          position: "absolute", inset: 0, opacity: 0.35, pointerEvents: "none",
        }} />
        <div style={{ position: "relative" }}>
          <div style={{ textAlign: "center", marginBottom: "32px" }}>
            <p style={{ fontSize: "11px", fontWeight: 700, color: C.gold, letterSpacing: "0.1em",
              marginBottom: "8px", textTransform: "uppercase" }}>
              FOR SELLERS
            </p>
            <h2 style={{ fontSize: "22px", fontWeight: 800, color: "white", letterSpacing: "-0.02em" }}>
              Open your shop in{" "}
              <span style={{ color: C.gold }}>3 minutes</span>
            </h2>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {[
              { n: "1", icon: "💬", title: "Open the bot", desc: "Start @SoukEtBot on Telegram. Choose your language — English or Amharic." },
              { n: "2", icon: "📦", title: "Add your products", desc: "Send a photo, set a name and price. The bot generates 4 marketing images instantly." },
              { n: "3", icon: "🔗", title: "Share & sell", desc: "Get your catalog link. Share it on your channel, story, or WhatsApp." },
            ].map((step) => (
              <div key={step.n} style={{
                display: "flex", gap: "16px", alignItems: "flex-start",
              }}>
                <div style={{
                  width: "44px", height: "44px", borderRadius: "14px", flexShrink: 0,
                  background: `${C.gold}22`, border: `1.5px solid ${C.gold}44`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "20px",
                }}>
                  {step.icon}
                </div>
                <div>
                  <p style={{ fontSize: "15px", fontWeight: 700, color: "white", marginBottom: "4px" }}>
                    {step.title}
                  </p>
                  <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.55)", lineHeight: 1.6 }}>
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <a
            href="https://t.me/SoukEtBot"
            target="_blank"
            rel="noopener noreferrer"
            className="cta-btn"
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
              marginTop: "32px",
              padding: "16px 28px", borderRadius: "16px",
              background: `linear-gradient(135deg, ${C.gold}, #A86E10)`,
              color: "white", fontWeight: 700, fontSize: "15px",
              textDecoration: "none",
              boxShadow: `0 6px 24px ${C.gold}50`,
            }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.07-.18c-.08-.05-.19-.03-.27-.02-.12.03-1.99 1.27-5.62 3.72-.53.36-1.01.54-1.44.53-.47-.01-1.38-.27-2.06-.49-.83-.27-1.49-.42-1.43-.88.03-.24.37-.49 1.02-.74 3.98-1.73 6.64-2.88 7.97-3.44 3.8-1.58 4.59-1.86 5.1-1.87.11 0 .37.03.53.17.14.12.18.28.2.46-.01.06.01.24 0 .37z" />
            </svg>
            Create Your Shop Free →
          </a>
        </div>
      </section>

      {/* ══════════════════════════════════════
          BROWSE MODE (triggered by "Browse all" / category click)
      ══════════════════════════════════════ */}
      <div ref={browseRef}>
        {browseMode && (
          <section style={{ padding: "8px 20px 32px" }}>
            {/* Browse header */}
            <div style={{
              background: C.white, borderRadius: "24px",
              border: `1.5px solid ${C.border}`,
              padding: "20px 20px 16px",
              marginBottom: "16px",
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
                <h2 style={{ fontSize: "18px", fontWeight: 800, color: C.dark }}>
                  {selectedCategory
                    ? `${CATEGORIES.find(c => c.key === selectedCategory)?.emoji} ${CATEGORIES.find(c => c.key === selectedCategory)?.label}`
                    : "All Products"}
                </h2>
                <button onClick={() => setBrowseMode(false)} style={{
                  width: "32px", height: "32px", borderRadius: "10px",
                  background: C.sand, border: "none", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke={C.muted} strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Search */}
              <div style={{ position: "relative", marginBottom: "12px" }}>
                <svg style={{ position: "absolute", left: "13px", top: "50%", transform: "translateY(-50%)",
                  width: "16px", height: "16px", color: C.muted, pointerEvents: "none" }}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                </svg>
                <input type="text" placeholder="Search products..." value={searchInput}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="search-input"
                  style={{
                    width: "100%", padding: "11px 12px 11px 38px",
                    fontSize: "14px", fontWeight: 500,
                    border: `2px solid ${C.border}`, borderRadius: "12px",
                    background: C.bg, color: C.dark,
                  }} />
              </div>

              {/* Category pills */}
              <div className="hide-scrollbar" style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "2px" }}>
                <button onClick={() => handleCategory(null)} className="catpill"
                  style={{
                    flexShrink: 0, padding: "6px 14px", borderRadius: "10px",
                    fontSize: "12px", fontWeight: 700,
                    background: !selectedCategory ? C.terra : C.sand,
                    color: !selectedCategory ? "white" : C.muted,
                    border: "none",
                  }}>All</button>
                {CATEGORIES.map(c => (
                  <button key={c.key} onClick={() => handleCategory(selectedCategory === c.key ? null : c.key)}
                    className="catpill"
                    style={{
                      flexShrink: 0, padding: "6px 12px", borderRadius: "10px",
                      fontSize: "12px", fontWeight: 700,
                      background: selectedCategory === c.key ? c.color : C.sand,
                      color: selectedCategory === c.key ? "white" : C.muted,
                      border: "none",
                    }}>
                    {c.emoji} {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sort */}
            <div style={{ display: "flex", gap: "8px", marginBottom: "14px", justifyContent: "flex-end" }}>
              {(["newest", "price_asc", "price_desc"] as const).map(s => {
                const labels = { newest: "Newest", price_asc: "Price ↑", price_desc: "Price ↓" };
                return (
                  <button key={s} onClick={() => {
                    setSortBy(s);
                    fetchBrowse(searchQuery, selectedCategory, s, 0);
                  }}
                    style={{
                      padding: "6px 12px", borderRadius: "8px", fontSize: "12px",
                      fontWeight: 600, border: "none", cursor: "pointer",
                      background: sortBy === s ? `${C.terra}18` : "transparent",
                      color: sortBy === s ? C.terra : C.muted,
                    }}>
                    {labels[s]}
                  </button>
                );
              })}
            </div>

            {/* Product grid */}
            {loading && browseProducts.length === 0 ? (
              <div style={{ textAlign: "center", padding: "48px 20px" }}>
                <svg style={{ width: "24px", height: "24px", color: C.terra, animation: "spin 1s linear infinite", margin: "0 auto" }}
                  viewBox="0 0 24 24" fill="none">
                  <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
            ) : browseProducts.length === 0 ? (
              <div style={{ textAlign: "center", padding: "48px 20px",
                background: C.white, borderRadius: "20px", border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: "36px", marginBottom: "10px" }}>🔍</div>
                <p style={{ fontSize: "15px", fontWeight: 700, color: C.dark }}>No products found</p>
                <p style={{ fontSize: "13px", color: C.muted, marginTop: "4px" }}>Try a different search</p>
              </div>
            ) : (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  {browseProducts.map((p) => {
                    const isSoldOut = p.stock === 0;
                    return (
                      <Link key={p.id} href={`/${p.shop_slug}/${p.id}`}
                        style={{ textDecoration: "none", color: "inherit" }}>
                        <div className="browse-card" style={{
                          background: C.white, borderRadius: "16px", overflow: "hidden",
                          border: `1.5px solid ${C.border}`,
                        }}>
                          <div style={{ position: "relative", aspectRatio: "1", background: C.sand, overflow: "hidden" }}>
                            {p.photo_url ? (
                              <img src={p.photo_url} alt={p.name} loading="lazy"
                                style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            ) : (
                              <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center",
                                justifyContent: "center" }}>
                                <span style={{ fontSize: "28px", opacity: 0.3 }}>📦</span>
                              </div>
                            )}
                            {isSoldOut && (
                              <div style={{ position: "absolute", inset: 0, background: "rgba(26,16,8,.5)",
                                display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <span style={{ color: "white", fontSize: "10px", fontWeight: 700,
                                  background: "rgba(0,0,0,.4)", padding: "3px 8px", borderRadius: "20px" }}>
                                  Sold out
                                </span>
                              </div>
                            )}
                            {p.tag && (
                              <div style={{ position: "absolute", bottom: "6px", left: "6px", fontSize: "10px",
                                fontWeight: 600, padding: "2px 6px", borderRadius: "6px",
                                background: "rgba(255,255,255,0.9)", color: C.text, backdropFilter: "blur(4px)" }}>
                                {TAG_LABELS[p.tag] || p.tag}
                              </div>
                            )}
                          </div>
                          <div style={{ padding: "10px 11px 12px" }}>
                            <p style={{ fontSize: "13px", fontWeight: 700, color: C.dark, lineHeight: 1.3,
                              marginBottom: "3px", display: "-webkit-box", WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                              {p.name}
                            </p>
                            <p style={{ fontSize: "13px", fontWeight: 800, color: C.terra }}>
                              {fmtPrice(p.price, p.price_type)}
                            </p>
                            <p style={{ fontSize: "11px", color: C.muted, marginTop: "2px",
                              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {p.shop_name}
                            </p>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
                {hasMore && (
                  <div style={{ textAlign: "center", marginTop: "20px" }}>
                    <button onClick={() => fetchBrowse(searchQuery, selectedCategory, sortBy, offset, true)}
                      disabled={loading}
                      style={{
                        padding: "12px 32px", borderRadius: "12px",
                        background: C.terra, color: "white", border: "none",
                        fontSize: "14px", fontWeight: 700, cursor: "pointer",
                        opacity: loading ? 0.7 : 1,
                        transition: "all .2s ease",
                      }}>
                      {loading ? "Loading..." : "Load more"}
                    </button>
                  </div>
                )}
              </>
            )}
          </section>
        )}
      </div>

      {/* ══════════════════════════════════════
          FOOTER
      ══════════════════════════════════════ */}
      <footer style={{
        background: C.dark,
        padding: "44px 24px 36px",
      }}>
        <div className="eth-pattern" style={{ position: "absolute", opacity: 0.15, inset: 0, pointerEvents: "none" }} />
        <div style={{ position: "relative", maxWidth: "400px" }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
            <div style={{
              width: "34px", height: "34px", borderRadius: "10px",
              background: `linear-gradient(135deg, ${C.terra}, ${C.gold})`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke="#fff" strokeWidth="2" strokeLinejoin="round" />
                <path d="M9 22V12h6v10" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <span style={{ fontSize: "20px", fontWeight: 800, color: "white", letterSpacing: "-0.03em" }}>
              souk<span style={{ color: C.terra }}>.</span>et
            </span>
          </div>
          <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)", marginBottom: "28px", lineHeight: 1.6 }}>
            Where Ethiopia Shops — ኢትዮጵያ የምትሸምትበት
          </p>

          <div style={{ display: "flex", gap: "20px", marginBottom: "32px", flexWrap: "wrap" }}>
            {[
              { label: "Browse Products", href: "#", onClick: () => openBrowse() },
              { label: "Create a Shop", href: "https://t.me/SoukEtBot" },
            ].map((l) => (
              l.onClick ? (
                <button key={l.label} onClick={l.onClick}
                  style={{ fontSize: "13px", color: "rgba(255,255,255,0.45)",
                    background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "inherit" }}>
                  {l.label}
                </button>
              ) : (
                <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: "13px", color: "rgba(255,255,255,0.45)", textDecoration: "none" }}>
                  {l.label}
                </a>
              )
            ))}
          </div>

          <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.2)" }}>
            © 2026 souk.et · All rights reserved
          </p>
        </div>
      </footer>
    </div>
  );
}
