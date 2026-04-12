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
  photo_file_id: string | null;
  stock: number | null;
  tag: string | null;
  created_at: string;
  shop_name: string;
  shop_slug: string;
  shop_category: string;
  shop_template_style: string;
}

function imgUrl(fileId: string | null, fallbackUrl: string | null): string | null {
  if (fileId) return `/api/img/${fileId}`;
  return fallbackUrl;
}

interface MarketShop {
  shop_name: string;
  shop_slug: string;
  category: string | null;
  location_text: string | null;
  logo_url: string | null;
  logo_file_id: string | null;
  template_style: string | null;
  description: string | null;
  product_count: number;
}

interface Props {
  initialProducts: MarketProduct[];
  initialShops: MarketShop[];
  categoryCounts: Record<string, number>;
  totalProducts: number;
  shopCount?: number;
}

/* ─── Design tokens ──────────────────────────────────────── */
const C = {
  bg:     "#FFF8F3",
  dark:   "#0A0A0F",
  gold:   "#FFB800",
  terra:  "#FF6B35",
  sand:   "#FFE8D6",
  sage:   "#4A6B4A",
  text:   "#1A0804",
  muted:  "#8C6E58",
  border: "#FFCDB4",
  white:  "#FFFFFF",
};

/* ─── Translations ───────────────────────────────────────── */
const T = {
  en: {
    marketplaceBadge: "ETHIOPIAN MARKETPLACE",
    heroHeadline1: "Buy. Sell.",
    heroHeadline2: "On Telegram.",
    heroSub: "Ethiopia's marketplace on Telegram — find what you need or open your shop free.",
    ctaSell: "Open a Shop",
    ctaBrowse: "Browse Products",
    searchPlaceholderHero: "What are you looking for?",
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
    activityStrip: "new products this week",
    activityShops: "shops",
    newBadge: "New",
    recentlyAdded: "Recently added",
    createShopNav: "+ Create Shop",
    newest: "Newest",
    priceAsc: "Price ↑",
    priceDesc: "Price ↓",
    all: "All",
    comparePrices: "Compare Prices",
    compareOff: "Grid View",
    seller: "Seller",
    location: "Location",
  },
  am: {
    marketplaceBadge: "የኢትዮጵያ ገበያ",
    heroHeadline1: "ግዛ. ሽጥ.",
    heroHeadline2: "በቴሌግራም.",
    heroSub: "በቴሌግራም ግዙ ወይም ሱቅ ክፈቱ — ነፃ።",
    ctaSell: "ሱቅ ክፈቱ",
    ctaBrowse: "ምርቶችን ይመልከቱ",
    searchPlaceholderHero: "ምን ይፈልጋሉ?",
    statsShops: "ሱቆች",
    statsProducts: "ምርቶች",
    statsCategories: "ምድቦች",
    newArrivals: "አዲስ ምርቶች",
    newArrivalsSub: "ከኢትዮጵያ ሻጮች",
    seeAll: "ሁሉም",
    shops: "ሱቆች",
    shopsSub: "በሻጭ ይፈልጉ",
    forSellers: "ለሻጮች",
    openIn3: "ሱቅዎን በ",
    openIn3Bold: "3 ደቂቃ",
    step1Title: "ቦቱን ክፈቱ",
    step1Desc: "ቴሌግራም ላይ @SoukEtBot ይጀምሩ",
    step2Title: "ምርቶቹን ይጨምሩ",
    step2Desc: "ፎቶ ይላኩ፣ ስም እና ዋጋ ያስቀምጡ",
    step3Title: "ያጋሩ እና ይሸጡ",
    step3Desc: "የካታሎግ ሊንኩን ያጋሩ",
    createShopFree: "ነፃ ሱቅ ክፈቱ →",
    allProducts: "ሁሉም ምርቶች",
    searchPlaceholder: "ምርቶችን ይፈልጉ...",
    noProducts: "ምርት አልተገኘም",
    noProductsSub: "ሌላ ፍለጋ ይሞክሩ",
    loadMore: "ተጨማሪ",
    loading: "እየጫነ...",
    soldOut: "አልቋል",
    items: "ምርቶች",
    item: "ምርት",
    footerTagline: "ኢትዮጵያ የምትሸምትበት",
    footerBrowse: "ምርቶችን ይፈልጉ",
    footerCreate: "ሱቅ ክፈቱ",
    footerCopyright: "© 2026 souk.et · መብቶች ተጠብቀዋል",
    activityStrip: "አዲስ ምርቶች በዚህ ሳምንት",
    activityShops: "ሱቆች",
    newBadge: "አዲስ",
    recentlyAdded: "በቅርቡ የተጨመሩ",
    createShopNav: "+ ሱቅ ክፈቱ",
    newest: "አዲስ",
    priceAsc: "ዋጋ ↑",
    priceDesc: "ዋጋ ↓",
    all: "ሁሉም",
    comparePrices: "ዋጋ ያወዳድሩ",
    compareOff: "ፍርግርግ",
    seller: "ሻጭ",
    location: "ቦታ",
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

function isNew(createdAt: string): boolean {
  const diff = Date.now() - new Date(createdAt).getTime();
  return diff < 48 * 60 * 60 * 1000;
}

/* ─── Sub-components ──────────────────────────────────────── */

function ProductCard({ p, delay = 0, shopLogo }: { p: MarketProduct; delay?: number; shopLogo?: string | null }) {
  const isSoldOut = p.stock === 0;
  const [imgFailed, setImgFailed] = useState(false);
  const cat = CATEGORIES.find(c => c.key === p.shop_category);
  return (
    <Link href={`/${p.shop_slug}/${p.id}`} style={{ textDecoration: "none", color: "inherit" }}>
      <div className="pcard" style={{
        background: C.white,
        borderRadius: "18px",
        overflow: "hidden",
        border: `1.5px solid ${C.border}`,
        flexShrink: 0,
        width: "200px",
        animationDelay: `${delay}s`,
      }}>
        {/* Image */}
        <div style={{ position: "relative", width: "100%", aspectRatio: "1", background: C.sand, overflow: "hidden" }}>
          {imgUrl(p.photo_file_id, p.photo_url) && !imgFailed ? (
            <img src={imgUrl(p.photo_file_id, p.photo_url)!} alt={p.name} loading="lazy" decoding="async"
              onError={() => setImgFailed(true)}
              style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center",
              justifyContent: "center", background: `linear-gradient(135deg, #FFE8D6, #FFCDB4)` }}>
              <span style={{ fontSize: "36px", opacity: 0.35 }}>
                {cat?.emoji || "📦"}
              </span>
            </div>
          )}
          {isNew(p.created_at) && (
            <span className="new-badge">New</span>
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
          {/* Shop logo overlay */}
          {shopLogo && (
            <div style={{ position: "absolute", bottom: "8px", right: "8px", width: "22px", height: "22px",
              borderRadius: "50%", overflow: "hidden", border: "1.5px solid white",
              boxShadow: "0 1px 4px rgba(0,0,0,0.2)", background: C.sand }}>
              <img src={shopLogo} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
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
        border: `1px solid ${C.border}50`,
        borderRadius: "16px",
        padding: "16px 12px",
        textAlign: "center",
        height: "140px",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        boxShadow: "0 1px 4px rgba(26,16,8,0.06)",
      }}>
        {/* Avatar */}
        <div style={{
          width: "52px", height: "52px", borderRadius: "16px", margin: "0 auto 10px",
          overflow: "hidden", flexShrink: 0,
          background: (s.logo_file_id || s.logo_url) ? "transparent" : `linear-gradient(135deg, ${cat?.color || C.terra}18, ${cat?.color || C.terra}30)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          border: `1.5px solid ${cat?.color || C.terra}30`,
        }}>
          {(s.logo_file_id || s.logo_url) ? (
            <img src={imgUrl(s.logo_file_id, s.logo_url)!} alt={s.shop_name} loading="lazy"
              style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <span style={{
              fontSize: "22px", fontWeight: 900, color: cat?.color || C.terra,
              lineHeight: 1, letterSpacing: "-0.02em",
            }}>
              {s.shop_name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "4px", marginBottom: "3px" }}>
          <p style={{ fontSize: "13px", fontWeight: 700, color: C.dark,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {s.shop_name}
          </p>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="#22c55e" style={{ flexShrink: 0 }}>
            <path d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" />
          </svg>
        </div>
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

function GridCard({ p, shopLogo }: { p: MarketProduct; shopLogo?: string | null }) {
  const isSoldOut = p.stock === 0;
  const [imgFailed, setImgFailed] = useState(false);
  const src = imgUrl(p.photo_file_id, p.photo_url);
  return (
    <Link href={`/${p.shop_slug}/${p.id}`} style={{ textDecoration: "none", color: "inherit" }}>
      <div className="pcard" style={{ background: C.white, borderRadius: "14px", overflow: "hidden", border: `1px solid ${C.border}` }}>
        <div style={{ position: "relative", aspectRatio: "1", background: C.sand, overflow: "hidden" }}>
          {src && !imgFailed ? (
            <img src={src} alt={p.name} loading="lazy" decoding="async" onError={() => setImgFailed(true)}
              style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center",
              background: `linear-gradient(135deg, ${C.sand}, ${C.border})` }}>
              <span style={{ fontSize: "28px", opacity: 0.3 }}>{CATEGORIES.find(c => c.key === p.shop_category)?.emoji || "📦"}</span>
            </div>
          )}
          {isNew(p.created_at) && <span className="new-badge">New</span>}
          {isSoldOut && (
            <div style={{ position: "absolute", inset: 0, background: "rgba(26,16,8,0.5)",
              display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: "white", fontSize: "10px", fontWeight: 700, background: "rgba(0,0,0,.4)", padding: "3px 8px", borderRadius: "20px" }}>Sold out</span>
            </div>
          )}
          {p.tag && (
            <div style={{ position: "absolute", bottom: "6px", left: "6px", fontSize: "9px", fontWeight: 600,
              padding: "2px 6px", borderRadius: "5px", background: "rgba(255,255,255,0.9)", color: C.text, backdropFilter: "blur(4px)" }}>
              {TAG_LABELS[p.tag] || p.tag}
            </div>
          )}
          {shopLogo && (
            <div style={{ position: "absolute", bottom: "6px", right: "6px", width: "20px", height: "20px",
              borderRadius: "50%", overflow: "hidden", border: "1.5px solid white", boxShadow: "0 1px 3px rgba(0,0,0,.2)", background: C.sand }}>
              <img src={shopLogo} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
          )}
        </div>
        <div style={{ padding: "8px 10px 10px" }}>
          <p style={{ fontSize: "12px", fontWeight: 700, color: C.dark, lineHeight: 1.3, marginBottom: "3px",
            display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{p.name}</p>
          <p style={{ fontSize: "13px", fontWeight: 800, color: C.terra }}>{fmtPrice(p.price, p.price_type)}</p>
          <p style={{ fontSize: "10px", color: C.muted, marginTop: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.shop_name}</p>
        </div>
      </div>
    </Link>
  );
}

/* ─── Main component ─────────────────────────────────────── */

export default function MarketplaceClient({ initialProducts, initialShops, categoryCounts, totalProducts, shopCount = 0 }: Props) {
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
  const [compareMode, setCompareMode] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const browseRef = useRef<HTMLDivElement>(null);

  useEffect(() => { requestAnimationFrame(() => setMounted(true)); }, []);

  const t = T[lang];

  const featuredProducts = useMemo(() => initialProducts.filter(p => p.photo_url || p.photo_file_id).slice(0, 8), [initialProducts]);
  const featuredShops = useMemo(() => initialShops.slice(0, 10), [initialShops]);
  const shopLogoMap = useMemo(() => {
    const m: Record<string, string | null> = {};
    for (const s of initialShops) {
      m[s.shop_slug] = imgUrl(s.logo_file_id, s.logo_url);
    }
    return m;
  }, [initialShops]);
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
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;0,9..40,900&family=Noto+Sans+Ethiopic:wght@400;500;600;700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'DM Sans', 'Noto Sans Ethiopic', system-ui, sans-serif; }

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
        .cta-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 28px rgba(255,107,53,.4); }
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

        @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .marquee-track { display: flex; gap: 12px; animation: marquee 20s linear infinite; width: max-content; }

        .new-badge { position: absolute; top: 6px; right: 6px; font-size: 9px; font-weight: 700; padding: 2px 6px; border-radius: 6px; background: #22c55e; color: white; z-index: 2; }

        /* Ethiopian cross pattern */
        .eth-pattern {
          background-image: url("data:image/svg+xml,${encodeURIComponent(
            '<svg width="32" height="32" xmlns="http://www.w3.org/2000/svg"><path d="M16 4 L18 14 L28 16 L18 18 L16 28 L14 18 L4 16 L14 14 Z" fill="none" stroke="%23FFB800" stroke-width="1" opacity="0.18"/></svg>'
          )}");
          background-size: 32px 32px;
        }

        /* ── Responsive layout ── */
        .mkt-container { max-width: 100%; margin: 0 auto; padding: 0 16px; }
        .product-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .browse-grid  { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .welcome-block { padding: 20px 16px 12px; }
        .welcome-headline { font-size: 22px; }
        .welcome-sub { font-size: 13px; max-width: 320px; }
        .nav-inner { max-width: 100%; margin: 0 auto; }
        .featured-scroll { display: flex; gap: 12px; overflow-x: auto; padding: 4px 16px 16px; }
        .featured-scroll .pcard { width: 170px; }
        .seller-cta-card { margin: 16px 16px 0; }

        @media (min-width: 640px) {
          .mkt-container { max-width: 1100px; padding: 0 32px; }
          .product-grid { grid-template-columns: repeat(3, 1fr); gap: 14px; }
          .browse-grid  { grid-template-columns: repeat(3, 1fr); gap: 10px; }
          .welcome-block { padding: 40px 32px 24px; text-align: center; }
          .welcome-headline { font-size: 32px; }
          .welcome-sub { font-size: 15px; max-width: 440px; margin: 0 auto; }
          .nav-inner { max-width: 1100px; }
          .featured-scroll { padding: 4px 32px 16px; }
          .featured-scroll .pcard { width: 200px; }
          .seller-cta-card { margin: 24px 32px 0; max-width: 1100px; margin-left: auto; margin-right: auto; }
        }

        @media (min-width: 960px) {
          .product-grid { grid-template-columns: repeat(4, 1fr); gap: 16px; }
          .browse-grid  { grid-template-columns: repeat(4, 1fr); gap: 12px; }
          .welcome-headline { font-size: 38px; }
        }
      `}</style>

      {/* ══════════════════════════════════════
          NAV — compact with integrated search
      ══════════════════════════════════════ */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "rgba(250,248,242,0.95)",
        backdropFilter: "blur(16px)",
        borderBottom: `1px solid ${C.border}`,
        padding: "10px 0",
        opacity: mounted ? 1 : 0,
        transition: "opacity .5s ease .1s",
      }}>
       <div className="nav-inner" style={{ margin: "0 auto", padding: "0 16px" }}>
        {/* Top row: logo + lang + sell */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
            <svg viewBox="0 0 120 120" width="30" height="30" style={{ flexShrink: 0 }}>
              <circle cx="60" cy="60" r="58" fill="#FF6B35" />
              <path d="M24 52 L60 28 L96 52" stroke="#fff" strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M28 52 Q36 60 44 52 Q52 60 60 52 Q68 60 76 52 Q84 60 92 52" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" />
              <rect x="38" y="56" width="44" height="30" rx="3" fill="none" stroke="#fff" strokeWidth="3" />
              <rect x="50" y="64" width="20" height="22" rx="2" fill="#FFB800" opacity="0.3" />
            </svg>
            <span style={{ fontSize: "18px", fontWeight: 800, color: C.dark, letterSpacing: "-0.03em" }}>
              souk<span style={{ color: C.terra }}>.</span>et
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ display: "flex", background: C.sand, borderRadius: "8px", padding: "2px", border: `1px solid ${C.border}`, gap: "1px" }}>
              <button onClick={() => setLang("en")} className="lang-toggle-btn"
                style={{ padding: "3px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: 700,
                  background: lang === "en" ? C.terra : "transparent", color: lang === "en" ? "white" : C.muted }}>EN</button>
              <button onClick={() => setLang("am")} className="lang-toggle-btn"
                style={{ padding: "3px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: 700,
                  background: lang === "am" ? C.terra : "transparent", color: lang === "am" ? "white" : C.muted }}>አማ</button>
            </div>
            <a href="https://t.me/SoukEtBot" target="_blank" rel="noopener noreferrer"
              style={{ padding: "6px 12px", borderRadius: "8px", fontSize: "12px", fontWeight: 700,
                color: C.terra, background: `${C.terra}08`, textDecoration: "none", border: `1px solid ${C.terra}20` }}>
              {t.ctaSell}
            </a>
          </div>
        </div>
        {/* Search bar — always visible in nav */}
        <div style={{ position: "relative" }}>
          <svg style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)",
            width: "16px", height: "16px", color: C.muted, pointerEvents: "none" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input type="text" value={searchInput}
            onChange={(e) => { setSearchInput(e.target.value); if (!browseMode) setBrowseMode(true); handleSearch(e.target.value); }}
            onFocus={() => { if (!browseMode) openBrowse(); }}
            placeholder={t.searchPlaceholderHero}
            className="search-input"
            style={{ width: "100%", padding: "10px 12px 10px 36px", borderRadius: "10px",
              border: `1.5px solid ${C.border}`, background: C.white,
              color: C.dark, fontSize: "14px", fontWeight: 500, fontFamily: "inherit" }}
          />
        </div>
       </div>
      </nav>

      {/* ══════════════════════════════════════
          WELCOME BLOCK — warm intro (not a hero)
      ══════════════════════════════════════ */}
      {!browseMode && (
        <div className="hero-text" style={{
          background: `linear-gradient(180deg, ${C.sand} 0%, ${C.bg} 100%)`,
          borderBottom: `1px solid ${C.border}`,
        }}>
          <div className="welcome-block mkt-container" style={{ textAlign: "center" }}>
            <h1 className="welcome-headline" style={{ fontWeight: 800, color: C.dark, letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: "8px" }}>
              {lang === "am" ? "የኢትዮጵያ የቴሌግራም ገበያ" : "Ethiopia's Telegram Marketplace"}
            </h1>
            <p className="welcome-sub" style={{ color: C.muted, lineHeight: 1.5, marginBottom: "0", marginLeft: "auto", marginRight: "auto" }}>
              {t.heroSub}
            </p>

            {/* Categories — inside welcome block, centered */}
            <div className="hide-scrollbar" style={{
              display: "flex", gap: "4px", overflowX: "auto",
              justifyContent: "center",
              padding: "16px 0 0",
            }}>
              <button onClick={() => { setSelectedCategory(null); openBrowse(); }} className="catpill"
                style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: "3px",
                  padding: "6px 12px", borderRadius: "12px", background: !selectedCategory && browseMode ? `${C.terra}12` : "transparent",
                  border: "none", minWidth: "56px" }}>
                <span style={{ fontSize: "20px", lineHeight: 1 }}>🏪</span>
                <span style={{ fontSize: "10px", fontWeight: 700, color: !selectedCategory && browseMode ? C.terra : C.muted }}>{t.all}</span>
              </button>
              {CATEGORIES.map((c) => {
                const count = categoryCounts[c.key] || 0;
                if (!count) return null;
                const isActive = selectedCategory === c.key;
                return (
                  <button key={c.key} onClick={() => openBrowse(c.key)} className="catpill"
                    style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: "3px",
                      padding: "6px 12px", borderRadius: "12px", background: isActive ? `${c.color}12` : "transparent",
                      border: "none", minWidth: "56px" }}>
                    <span style={{ fontSize: "20px", lineHeight: 1 }}>{c.emoji}</span>
                    <span style={{ fontSize: "10px", fontWeight: 700, color: isActive ? c.color : C.muted }}>
                      {lang === "am" ? c.am : c.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════
          PRODUCT FEED — 2-column grid (the main content)
      ══════════════════════════════════════ */}
      {featuredProducts.length > 0 && !browseMode && (
        <section className="mkt-container" style={{ paddingTop: "16px", paddingBottom: "8px" }}>
          {/* New Arrivals — horizontal scroll */}
          <div style={{ marginBottom: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
              <h2 style={{ fontSize: "16px", fontWeight: 800, color: C.dark }}>{t.newArrivals}</h2>
              <span style={{ fontSize: "11px", fontWeight: 600, color: C.muted }}>
                🔥 {totalProducts}+ {t.statsProducts} · {totalShops} {t.statsShops}
              </span>
            </div>
            <div className="hide-scrollbar featured-scroll" style={{ marginLeft: "-16px", marginRight: "-16px" }}>
              {featuredProducts.map((p, i) => (
                <ProductCard key={p.id} p={p} delay={i * 0.04} shopLogo={shopLogoMap[p.shop_slug]} />
              ))}
            </div>
          </div>

          {/* All Products — responsive grid */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
            <h2 style={{ fontSize: "16px", fontWeight: 800, color: C.dark }}>{t.allProducts}</h2>
            <button onClick={() => openBrowse()} style={{ fontSize: "12px", fontWeight: 700, color: C.terra,
              background: "none", border: "none", cursor: "pointer", fontFamily: "inherit",
              display: "flex", alignItems: "center", gap: "3px" }}>
              {t.seeAll}
              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </div>
          <div className="product-grid">
            {initialProducts.filter(p => p.photo_url || p.photo_file_id).slice(0, 12).map((p) => (
              <GridCard key={p.id} p={p} shopLogo={shopLogoMap[p.shop_slug]} />
            ))}
          </div>

        </section>
      )}

      {/* ══════════════════════════════════════
          SHOPS — horizontal strip
      ══════════════════════════════════════ */}
      {featuredShops.length > 0 && !browseMode && (
        <section className="mkt-container" style={{ paddingTop: "20px", paddingBottom: "12px", borderTop: `1px solid ${C.border}` }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
            <h2 style={{ fontSize: "16px", fontWeight: 800, color: C.dark }}>{t.shops}</h2>
            <span style={{ fontSize: "11px", color: C.muted }}>{totalShops} {t.statsShops}</span>
          </div>
          <div className="hide-scrollbar featured-scroll" style={{ marginLeft: "-16px", marginRight: "-16px" }}>
            {featuredShops.map((s) => (
              <ShopCard key={s.shop_slug} s={s} lang={lang} />
            ))}
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════
          SELLER CTA — inline card
      ══════════════════════════════════════ */}
      {!browseMode && (
        <div className="seller-cta-card">
          <div style={{
            background: `linear-gradient(135deg, ${C.dark} 0%, #1A0C06 100%)`,
            borderRadius: "20px", padding: "28px 24px",
            position: "relative", overflow: "hidden",
          }}>
            <div className="eth-pattern" style={{ position: "absolute", inset: 0, opacity: 0.2, pointerEvents: "none" }} />
            <div style={{ position: "relative", display: "flex", alignItems: "center", gap: "20px", flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: "200px" }}>
                <p style={{ fontSize: "11px", fontWeight: 700, color: C.gold, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "6px" }}>{t.forSellers}</p>
                <p style={{ fontSize: "18px", fontWeight: 800, color: "white", lineHeight: 1.2, marginBottom: "6px" }}>
                  {t.openIn3} <span style={{ color: C.gold }}>{t.openIn3Bold}</span>{lang === "am" ? " ክፈቱ" : ""}
                </p>
                <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", lineHeight: 1.5 }}>{t.step1Desc}</p>
              </div>
              <a href="https://t.me/SoukEtBot" target="_blank" rel="noopener noreferrer" className="cta-btn"
                style={{
                  display: "inline-flex", alignItems: "center", gap: "8px",
                  padding: "14px 24px", borderRadius: "14px",
                  background: `linear-gradient(135deg, ${C.terra}, #E85D2A)`,
                  color: "white", fontWeight: 700, fontSize: "14px",
                  textDecoration: "none", whiteSpace: "nowrap",
                  boxShadow: `0 4px 16px ${C.terra}40`,
                }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.07-.18c-.08-.05-.19-.03-.27-.02-.12.03-1.99 1.27-5.62 3.72-.53.36-1.01.54-1.44.53-.47-.01-1.38-.27-2.06-.49-.83-.27-1.49-.42-1.43-.88.03-.24.37-.49 1.02-.74 3.98-1.73 6.64-2.88 7.97-3.44 3.8-1.58 4.59-1.86 5.1-1.87.11 0 .37.03.53.17.14.12.18.28.2.46-.01.06.01.24 0 .37z" />
                </svg>
                {t.createShopFree}
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════
          BROWSE MODE (triggered by "Browse all" / category click)
      ══════════════════════════════════════ */}
      <div ref={browseRef}>
        {browseMode && (
          <section className="mkt-container" style={{ paddingTop: "8px", paddingBottom: "32px" }}>
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

            {/* Sort + Compare toggle */}
            <div style={{ display: "flex", gap: "8px", marginBottom: "14px", justifyContent: "space-between", alignItems: "center" }}>
              {/* Compare toggle */}
              <button onClick={() => {
                const next = !compareMode;
                setCompareMode(next);
                if (next) {
                  setSortBy("price_asc");
                  fetchBrowse(searchQuery, selectedCategory, "price_asc", 0);
                }
              }}
                style={{
                  padding: "6px 14px", borderRadius: "8px", fontSize: "12px",
                  fontWeight: 700, border: "none", cursor: "pointer",
                  background: compareMode ? `${C.sage}18` : "transparent",
                  color: compareMode ? C.sage : C.muted,
                  fontFamily: "inherit",
                  display: "flex", alignItems: "center", gap: "4px",
                }}>
                <span style={{ fontSize: "14px" }}>{compareMode ? "📊" : "💰"}</span>
                {compareMode ? t.compareOff : t.comparePrices}
              </button>

              {/* Sort buttons */}
              <div style={{ display: "flex", gap: "8px" }}>
                {(["newest", "price_asc", "price_desc"] as const).map(s => {
                  const labels = { newest: t.newest, price_asc: t.priceAsc, price_desc: t.priceDesc };
                  return (
                    <button key={s} onClick={() => {
                      setSortBy(s);
                      setCompareMode(s === "price_asc" || s === "price_desc");
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
                {compareMode ? (
                  /* ── COMPARISON LIST VIEW ── */
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    {browseProducts.map((p, idx) => {
                      const src = imgUrl(p.photo_file_id, p.photo_url);
                      const isSoldOut = p.stock === 0;
                      return (
                        <Link key={p.id} href={`/${p.shop_slug}/${p.id}`}
                          style={{ textDecoration: "none", color: "inherit" }}>
                          <div className="browse-card" style={{
                            background: C.white, borderRadius: "14px", overflow: "hidden",
                            border: `1px solid ${C.border}`,
                            display: "flex", alignItems: "center", gap: "12px",
                            padding: "10px 14px 10px 10px",
                          }}>
                            {/* Rank number */}
                            <span style={{ fontSize: "13px", fontWeight: 800, color: C.muted,
                              minWidth: "20px", textAlign: "center", flexShrink: 0 }}>
                              {idx + 1}
                            </span>
                            {/* Thumbnail */}
                            <div style={{ width: "52px", height: "52px", borderRadius: "10px",
                              overflow: "hidden", flexShrink: 0, background: C.sand }}>
                              {src ? (
                                <img src={src} alt={p.name} loading="lazy"
                                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                                  style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                              ) : (
                                <div style={{ width: "100%", height: "100%", display: "flex",
                                  alignItems: "center", justifyContent: "center" }}>
                                  <span style={{ fontSize: "18px", opacity: 0.3 }}>📦</span>
                                </div>
                              )}
                            </div>
                            {/* Info */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ fontSize: "13px", fontWeight: 700, color: C.dark,
                                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {p.name}
                              </p>
                              <p style={{ fontSize: "11px", color: C.muted, marginTop: "2px",
                                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                🏪 {p.shop_name}
                              </p>
                            </div>
                            {/* Price — prominent */}
                            <div style={{ textAlign: "right", flexShrink: 0 }}>
                              <p style={{ fontSize: "15px", fontWeight: 800,
                                color: isSoldOut ? C.muted : C.terra }}>
                                {isSoldOut ? t.soldOut : fmtPrice(p.price, p.price_type)}
                              </p>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  /* ── GRID VIEW ── */
                  <div className="browse-grid">
                    {browseProducts.map((p) => {
                      const isSoldOut = p.stock === 0;
                      const src = imgUrl(p.photo_file_id, p.photo_url);
                      return (
                        <Link key={p.id} href={`/${p.shop_slug}/${p.id}`}
                          style={{ textDecoration: "none", color: "inherit" }}>
                          <div className="browse-card" style={{
                            background: C.white, borderRadius: "12px", overflow: "hidden",
                            border: `1px solid ${C.border}`,
                          }}>
                            <div style={{ position: "relative", aspectRatio: "1", background: C.sand, overflow: "hidden" }}>
                              {src ? (
                                <img src={src} alt={p.name} loading="lazy"
                                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                                  style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                              ) : null}
                              {!src && (
                                <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center",
                                  justifyContent: "center" }}>
                                  <span style={{ fontSize: "22px", opacity: 0.3 }}>📦</span>
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
                            <div style={{ padding: "6px 8px 8px" }}>
                              <p style={{ fontSize: "11px", fontWeight: 700, color: C.dark, lineHeight: 1.3,
                                marginBottom: "2px", display: "-webkit-box", WebkitLineClamp: 1,
                                WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                                {p.name}
                              </p>
                              <p style={{ fontSize: "11px", fontWeight: 800, color: C.terra }}>
                                {fmtPrice(p.price, p.price_type)}
                              </p>
                              <p style={{ fontSize: "9px", color: C.muted, marginTop: "1px",
                                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {p.shop_name}
                              </p>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
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
        padding: "32px 0",
        position: "relative",
        marginTop: "24px",
      }}>
        <div className="eth-pattern" style={{ position: "absolute", opacity: 0.15, inset: 0, pointerEvents: "none" }} />
        <div className="mkt-container" style={{ position: "relative" }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
            <svg viewBox="0 0 120 120" width="34" height="34" style={{ flexShrink: 0 }}>
              <circle cx="60" cy="60" r="58" fill="#FF6B35" />
              <path d="M24 52 L60 28 L96 52" stroke="#fff" strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M28 52 Q36 60 44 52 Q52 60 60 52 Q68 60 76 52 Q84 60 92 52" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" />
              <rect x="38" y="56" width="44" height="30" rx="3" fill="none" stroke="#fff" strokeWidth="3" />
              <rect x="50" y="64" width="20" height="22" rx="2" fill="#FFB800" opacity="0.3" />
              <circle cx="44" cy="62" r="2.5" fill="#FFB800" />
              <circle cx="76" cy="62" r="2.5" fill="#FFB800" />
              <path d="M88 36 L90 32 L92 36 L96 38 L92 40 L90 44 L88 40 L84 38Z" fill="#FFB800" opacity="0.9" />
            </svg>
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
