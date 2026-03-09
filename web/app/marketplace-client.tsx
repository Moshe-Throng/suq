"use client";

import { useState, useMemo, useRef, useEffect } from "react";
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

/* ─── Translations ───────────────────────────────────────── */
const T = {
  en: {
    marketplaceBadge: "ETHIOPIAN MARKETPLACE",
    heroHeadline1: "Your Shop.",
    heroHeadline2: "Beautiful.",
    heroSub: "Turn your Telegram into a professional shop — free.",
    ctaSell: "Start Selling Free",
    ctaBrowse: "Browse Products",
    statsShops: "shops",
    statsProducts: "products",
    statsCategories: "categories",
    newArrivals: "New Arrivals",
    newArrivalsSub: "Latest from Ethiopian sellers",
    seeAll: "See all",
    shops: "Shops",
    shopsSub: "Browse by seller",
    forSellers: "FOR SELLERS",
    openIn3: "Open your shop in",
    openIn3Bold: "3 minutes",
    step1Title: "Open the bot",
    step1Desc: "Start @SoukEtBot on Telegram. Choose your language — English or Amharic.",
    step2Title: "Add your products",
    step2Desc: "Send a photo, set a name and price. The bot generates 4 marketing images instantly.",
    step3Title: "Share & sell",
    step3Desc: "Get your catalog link. Share it on your channel, story, or WhatsApp.",
    createShopFree: "Create Your Shop Free →",
    allProducts: "All Products",
    searchPlaceholder: "Search products...",
    noProducts: "No products found",
    noProductsSub: "Try a different search",
    loadMore: "Load more",
    loading: "Loading...",
    soldOut: "Sold out",
    items: "items",
    item: "item",
    footerTagline: "Where Ethiopia Shops",
    footerBrowse: "Browse Products",
    footerCreate: "Create a Shop",
    footerCopyright: "© 2026 souk.et · All rights reserved",
    createShopNav: "+ Create Shop",
    newest: "Newest",
    priceAsc: "Price ↑",
    priceDesc: "Price ↓",
    all: "All",
  },
  am: {
    marketplaceBadge: "የኢትዮጵያ ገበያ",
    heroHeadline1: "ሱቅህ።",
    heroHeadline2: "ውብ።",
    heroSub: "ቴሌግራምህን ነፃ ሱቅ አድርግ",
    ctaSell: "ሱቅ ክፈት ነፃ",
    ctaBrowse: "ምርቶችን ይመልከቱ",
    statsShops: "ሱቆች",
    statsProducts: "ምርቶች",
    statsCategories: "ምድቦች",
    newArrivals: "አዲስ ምርቶች",
    newArrivalsSub: "ከኢትዮጵያ ሻጮች",
    seeAll: "ሁሉም",
    shops: "ሱቆች",
    shopsSub: "በሻጭ ይፈልጉ",
    forSellers: "ለሻጮች",
    openIn3: "ሱቅህን በ",
    openIn3Bold: "3 ደቂቃ",
    step1Title: "ቦቱን ክፈት",
    step1Desc: "ቴሌግራምን ላይ @SoukEtBot ጀምር",
    step2Title: "ምርቶችህን ጨምር",
    step2Desc: "ፎቶ ላክ፣ ስም እና ዋጋ አስቀምጥ",
    step3Title: "ካሻር እና ሽጥ",
    step3Desc: "የካታሎግ ሊንክህን ካሻር",
    createShopFree: "ነፃ ሱቅ ክፈት →",
    allProducts: "ሁሉም ምርቶች",
    searchPlaceholder: "ምርቶችን ፈልግ...",
    noProducts: "ምርት አልተገኘም",
    noProductsSub: "ሌላ ፍለጋ ሞክር",
    loadMore: "ተጨማሪ",
    loading: "እየጫነ...",
    soldOut: "Sold out",
    items: "ምርቶች",
    item: "ምርት",
    footerTagline: "ኢትዮጵያ የምትሸምትበት",
    footerBrowse: "ምርቶችን ይፈልጉ",
    footerCreate: "ሱቅ ክፈት",
    footerCopyright: "© 2026 souk.et · መብቶች ተጠብቀዋል",
    createShopNav: "+ ሱቅ ክፈት",
    newest: "አዲስ",
    priceAsc: "ዋጋ ↑",
    priceDesc: "ዋጋ ↓",
    all: "ሁሉም",
  },
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

function ShopCard({ s, lang }: { s: MarketShop; lang: "en" | "am" }) {
  const cat = CATEGORIES.find(c => c.key === s.category);
  const t = T[lang];
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
            {cat.emoji} {lang === "am" ? cat.am : cat.label}
          </p>
        )}
        <p style={{ fontSize: "11px", color: C.muted }}>
          {s.product_count} {s.product_count === 1 ? t.item : t.items}
        </p>
      </div>
    </Link>
  );
}

/* ─── Main component ─────────────────────────────────────── */

export default function MarketplaceClient({ initialProducts, initialShops, categoryCounts, totalProducts }: Props) {
  const [mounted, setMounted] = useState(false);
  const [lang, setLang] = useState<"en" | "am">("en");
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

  const t = T[lang];

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
        .ghost-btn:hover { background: rgba(26,16,8,0.05) !important; }

        .hide-scrollbar { scrollbar-width: none; }
        .hide-scrollbar::-webkit-scrollbar { display: none; }

        .search-input { transition: border-color .2s ease, box-shadow .2s ease; outline: none; }
        .search-input:focus { border-color: ${C.terra} !important; box-shadow: 0 0 0 3px ${C.terra}20 !important; }

        .browse-card { transition: transform .2s ease, box-shadow .2s ease; }
        .browse-card:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(26,16,8,.08); }

        .lang-toggle-btn { transition: all .18s ease; cursor: pointer; border: none; font-family: inherit; }

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

        {/* Right side: lang toggle + CTA */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {/* Language toggle pill */}
          <div style={{
            display: "flex", alignItems: "center",
            background: C.sand,
            borderRadius: "10px",
            padding: "3px",
            border: `1px solid ${C.border}`,
            gap: "2px",
          }}>
            <button
              onClick={() => setLang("en")}
              className="lang-toggle-btn"
              style={{
                padding: "4px 10px",
                borderRadius: "7px",
                fontSize: "12px",
                fontWeight: 700,
                background: lang === "en" ? C.terra : "transparent",
                color: lang === "en" ? "white" : C.muted,
                letterSpacing: "0.02em",
              }}>
              EN
            </button>
            <button
              onClick={() => setLang("am")}
              className="lang-toggle-btn"
              style={{
                padding: "4px 10px",
                borderRadius: "7px",
                fontSize: "12px",
                fontWeight: 700,
                background: lang === "am" ? C.terra : "transparent",
                color: lang === "am" ? "white" : C.muted,
                letterSpacing: "0.01em",
              }}>
              አማ
            </button>
          </div>

          {/* Nav CTA */}
          <a href="https://t.me/SoukEtBot" target="_blank" rel="noopener noreferrer"
            className="ghost-btn"
            style={{
              padding: "8px 16px", borderRadius: "10px", fontSize: "13px", fontWeight: 700,
              color: C.terra, background: `${C.terra}10`, textDecoration: "none",
              border: `1.5px solid ${C.terra}30`,
            }}>
            {t.createShopNav}
          </a>
        </div>
      </nav>

      {/* ══════════════════════════════════════
          HERO — Bold & Elegant
      ══════════════════════════════════════ */}
      <section style={{
        position: "relative",
        padding: "64px 28px 56px",
        overflow: "hidden",
        background: "linear-gradient(160deg, #1A0A04 0%, #2D1206 35%, #3D1C0A 60%, #4A2510 80%, #3A1A08 100%)",
      }}>
        {/* Subtle grain overlay */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E\")",
          backgroundSize: "180px 180px",
          opacity: 0.6,
        }} />
        {/* Gold radial glow — top right */}
        <div style={{
          position: "absolute", top: "-100px", right: "-80px",
          width: "420px", height: "420px",
          background: `radial-gradient(circle at 60% 40%, ${C.gold}28 0%, transparent 65%)`,
          pointerEvents: "none",
        }} />
        {/* Warm amber glow — bottom left */}
        <div style={{
          position: "absolute", bottom: "-60px", left: "-60px",
          width: "320px", height: "320px",
          background: `radial-gradient(circle, #FF8C3020 0%, transparent 60%)`,
          pointerEvents: "none",
        }} />
        {/* Ethiopian cross pattern overlay */}
        <div className="eth-pattern" style={{
          position: "absolute", inset: 0, opacity: 0.12, pointerEvents: "none",
        }} />

        <div style={{ position: "relative", maxWidth: "640px", margin: "0 auto" }}>

          {/* Wordmark in hero */}
          <div className="hero-text" style={{ marginBottom: "28px" }}>
            <span style={{
              fontSize: "clamp(1rem, 3.5vw, 1.15rem)",
              fontWeight: 800,
              color: "rgba(255,255,255,0.22)",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
            }}>
              souk<span style={{ color: C.gold }}>.</span>et
            </span>
          </div>

          {/* Eyebrow badge */}
          <div className="hero-text" style={{
            display: "inline-flex", alignItems: "center", gap: "7px",
            background: `${C.gold}20`, border: `1px solid ${C.gold}45`,
            padding: "6px 14px", borderRadius: "20px", marginBottom: "18px",
          }}>
            <span style={{ fontSize: "14px" }}>🇪🇹</span>
            <span style={{ fontSize: "11px", fontWeight: 700, color: C.gold, letterSpacing: "0.1em" }}>
              {t.marketplaceBadge}
            </span>
          </div>

          {/* Thin rule */}
          <div style={{
            width: "48px", height: "2px",
            background: `linear-gradient(90deg, ${C.gold}, transparent)`,
            marginBottom: "20px",
            borderRadius: "2px",
          }} />

          {/* Headline — massive */}
          <h1 className="hero-sub" style={{
            fontSize: "clamp(2.8rem, 11vw, 4rem)",
            fontWeight: 800,
            color: C.white,
            letterSpacing: "-0.04em",
            lineHeight: 1.0,
            marginBottom: "20px",
          }}>
            {t.heroHeadline1}
            <br />
            <span style={{ color: C.gold }}>{t.heroHeadline2}</span>
          </h1>

          {/* Sub */}
          <p className="hero-cta" style={{
            fontSize: "16px", color: "rgba(255,255,255,0.55)", fontWeight: 400,
            lineHeight: 1.6, marginBottom: "36px", maxWidth: "380px",
            letterSpacing: "0.01em",
          }}>
            {t.heroSub}
          </p>

          {/* CTAs — stark contrast pair */}
          <div className="hero-cta" style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "44px" }}>
            <a
              href="https://t.me/SoukEtBot"
              target="_blank"
              rel="noopener noreferrer"
              className="cta-btn"
              style={{
                display: "inline-flex", alignItems: "center", gap: "8px",
                padding: "15px 28px", borderRadius: "14px",
                background: C.white,
                color: C.dark, fontWeight: 800, fontSize: "15px",
                textDecoration: "none",
                boxShadow: "0 4px 24px rgba(0,0,0,0.25)",
                letterSpacing: "-0.01em",
              }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill={C.terra}>
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.07-.18c-.08-.05-.19-.03-.27-.02-.12.03-1.99 1.27-5.62 3.72-.53.36-1.01.54-1.44.53-.47-.01-1.38-.27-2.06-.49-.83-.27-1.49-.42-1.43-.88.03-.24.37-.49 1.02-.74 3.98-1.73 6.64-2.88 7.97-3.44 3.8-1.58 4.59-1.86 5.1-1.87.11 0 .37.03.53.17.14.12.18.28.2.46-.01.06.01.24 0 .37z" />
              </svg>
              {t.ctaSell}
            </a>
            <button
              onClick={() => openBrowse()}
              style={{
                display: "inline-flex", alignItems: "center", gap: "7px",
                padding: "15px 24px", borderRadius: "14px",
                background: "rgba(255,255,255,0.08)",
                color: "rgba(255,255,255,0.85)", fontWeight: 700, fontSize: "15px",
                border: `1.5px solid rgba(255,255,255,0.2)`,
                cursor: "pointer",
                letterSpacing: "-0.01em",
                transition: "all .2s ease",
                fontFamily: "inherit",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.14)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.08)"; }}>
              {t.ctaBrowse}
              <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </button>
          </div>

          {/* Stats row with visual separators */}
          <div className="hero-stats" style={{
            display: "flex", alignItems: "center", gap: "0",
          }}>
            {[
              { n: `${totalShops}+`, label: t.statsShops },
              { n: `${totalProducts}+`, label: t.statsProducts },
              { n: CATEGORIES.length.toString(), label: t.statsCategories },
            ].map(({ n, label }, i) => (
              <div key={label} style={{ display: "flex", alignItems: "center" }}>
                {i > 0 && (
                  <span style={{
                    color: "rgba(255,255,255,0.2)",
                    fontSize: "18px",
                    fontWeight: 300,
                    margin: "0 16px",
                    lineHeight: 1,
                  }}>|</span>
                )}
                <div>
                  <span style={{ fontSize: "21px", fontWeight: 800, color: C.white }}>{n}</span>
                  <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", fontWeight: 500, marginLeft: "5px" }}>{label}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          CATEGORIES — compact elegant pills
      ══════════════════════════════════════ */}
      <section style={{ padding: "20px 0 4px" }}>
        <div className="hide-scrollbar" style={{
          display: "flex", gap: "8px", overflowX: "auto",
          padding: "0 24px 8px",
          alignItems: "center",
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
                  display: "inline-flex", alignItems: "center",
                  gap: "5px",
                  padding: "7px 13px",
                  borderRadius: "100px",
                  background: `${c.color}14`,
                  border: `1.5px solid ${c.color}30`,
                  whiteSpace: "nowrap",
                }}>
                <span style={{ fontSize: "14px", lineHeight: 1 }}>{c.emoji}</span>
                <span style={{ fontSize: "12px", fontWeight: 700, color: c.color }}>
                  {lang === "am" ? c.am : c.label}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ══════════════════════════════════════
          FEATURED PRODUCTS
      ══════════════════════════════════════ */}
      {featuredProducts.length > 0 && (
        <section style={{
          padding: "0 0 8px",
          borderTop: `2px solid ${C.gold}40`,
          marginTop: "8px",
        }}>
          {/* Header */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "20px 24px 16px",
          }}>
            <div>
              <h2 style={{ fontSize: "20px", fontWeight: 800, color: C.dark, letterSpacing: "-0.02em" }}>
                {t.newArrivals}
              </h2>
              <p style={{ fontSize: "13px", color: C.muted, marginTop: "2px" }}>
                {t.newArrivalsSub}
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
                fontFamily: "inherit",
              }}>
              {t.seeAll}
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
                {t.shops}
              </h2>
              <p style={{ fontSize: "13px", color: C.muted, marginTop: "2px" }}>
                {t.shopsSub}
              </p>
            </div>
          </div>

          <div className="hide-scrollbar" style={{
            display: "flex", gap: "12px", overflowX: "auto",
            padding: "4px 24px 16px",
          }}>
            {featuredShops.map((s) => (
              <ShopCard key={s.shop_slug} s={s} lang={lang} />
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
              {t.forSellers}
            </p>
            <h2 style={{ fontSize: "22px", fontWeight: 800, color: "white", letterSpacing: "-0.02em" }}>
              {t.openIn3}{" "}
              <span style={{ color: C.gold }}>{t.openIn3Bold}</span>
              {lang === "am" ? " ክፈት" : ""}
            </h2>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {[
              { n: "1", icon: "💬", titleKey: "step1Title" as const, descKey: "step1Desc" as const },
              { n: "2", icon: "📦", titleKey: "step2Title" as const, descKey: "step2Desc" as const },
              { n: "3", icon: "🔗", titleKey: "step3Title" as const, descKey: "step3Desc" as const },
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
                    {t[step.titleKey]}
                  </p>
                  <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.55)", lineHeight: 1.6 }}>
                    {t[step.descKey]}
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
            {t.createShopFree}
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
                    ? `${CATEGORIES.find(c => c.key === selectedCategory)?.emoji} ${lang === "am" ? CATEGORIES.find(c => c.key === selectedCategory)?.am : CATEGORIES.find(c => c.key === selectedCategory)?.label}`
                    : t.allProducts}
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
                <input type="text" placeholder={t.searchPlaceholder} value={searchInput}
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
                  }}>{t.all}</button>
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
                    {c.emoji} {lang === "am" ? c.am : c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sort */}
            <div style={{ display: "flex", gap: "8px", marginBottom: "14px", justifyContent: "flex-end" }}>
              {(["newest", "price_asc", "price_desc"] as const).map(s => {
                const labels = { newest: t.newest, price_asc: t.priceAsc, price_desc: t.priceDesc };
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
                      fontFamily: "inherit",
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
                <p style={{ fontSize: "15px", fontWeight: 700, color: C.dark }}>{t.noProducts}</p>
                <p style={{ fontSize: "13px", color: C.muted, marginTop: "4px" }}>{t.noProductsSub}</p>
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
                                  {t.soldOut}
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
                        fontFamily: "inherit",
                      }}>
                      {loading ? t.loading : t.loadMore}
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
        position: "relative",
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
            {t.footerTagline}
          </p>

          <div style={{ display: "flex", gap: "20px", marginBottom: "32px", flexWrap: "wrap" }}>
            {[
              { label: t.footerBrowse, onClick: () => openBrowse() },
              { label: t.footerCreate, href: "https://t.me/SoukEtBot" },
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
            {t.footerCopyright}
          </p>
        </div>
      </footer>
    </div>
  );
}
