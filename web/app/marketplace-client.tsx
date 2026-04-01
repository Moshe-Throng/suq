"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
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

function imgUrl(fileId: string | null, fallbackUrl: string | null): string | null {
  if (fileId) return `/api/img/${fileId}`;
  return fallbackUrl;
}

/* ─── Design tokens ──────────────────────────────────────── */
const C = {
  bg: "#FFF8F3",
  dark: "#0A0A0F",
  gold: "#FFB800",
  terra: "#FF6B35",
  sand: "#FFE8D6",
  text: "#1A0804",
  muted: "#8C6E58",
  border: "#FFCDB4",
  white: "#FFFFFF",
};

/* ─── Translations ───────────────────────────────────────── */
const T = {
  en: {
    heroLine1: "Buy.",
    heroLine2: "Sell.",
    heroLine3: "On Telegram.",
    searchPlaceholder: "Search products, shops...",
    sellerHook: "Got products? Open a shop in 3 minutes",
    forYou: "For You",
    newArrivals: "New Arrivals",
    shops: "Shops",
    loadMore: "Load more",
    loading: "Loading...",
    soldOut: "Sold out",
    contactSeller: "Contact Seller",
    items: "items",
    item: "item",
    sellFree: "Sell Free",
    stepOpen: "Open the bot",
    stepOpenDesc: "Start @SoukEtBot on Telegram",
    stepAdd: "Add products",
    stepAddDesc: "Send photos, set prices",
    stepShare: "Share & sell",
    stepShareDesc: "Get your catalog link",
    startSelling: "Start Selling Free →",
    trustItems: "items listed",
    trustSellers: "sellers",
    trustFree: "Free forever",
    trustTelegram: "100% Telegram",
    tellUsLikes: "Personalize your feed →",
    changeInterests: "Change",
    noResults: "No products found",
    tryDifferent: "Try a different search",
    footerTagline: "Where Ethiopia Shops",
    all: "All",
  },
  am: {
    heroLine1: "ግዛ.",
    heroLine2: "ሽጥ.",
    heroLine3: "በቴሌግራም.",
    searchPlaceholder: "ምርቶችን ይፈልጉ...",
    sellerHook: "ምርት አለዎት? ሱቅ በ3 ደቂቃ ይክፈቱ",
    forYou: "ለርስዎ",
    newArrivals: "አዲስ ምርቶች",
    shops: "ሱቆች",
    loadMore: "ተጨማሪ",
    loading: "እየጫነ...",
    soldOut: "አልቋል",
    contactSeller: "ሻጩን ያግኙ",
    items: "ምርቶች",
    item: "ምርት",
    sellFree: "ነፃ ሽጥ",
    stepOpen: "ቦቱን ክፈቱ",
    stepOpenDesc: "ቴሌግራም ላይ @SoukEtBot ይጀምሩ",
    stepAdd: "ምርቶቹን ይጨምሩ",
    stepAddDesc: "ፎቶ ይላኩ፣ ዋጋ ያስቀምጡ",
    stepShare: "ያጋሩ እና ይሸጡ",
    stepShareDesc: "የካታሎግ ሊንኩን ያጋሩ",
    startSelling: "ነፃ ሱቅ ክፈቱ →",
    trustItems: "ምርቶች",
    trustSellers: "ሻጮች",
    trustFree: "ለዘላለም ነፃ",
    trustTelegram: "100% ቴሌግራም",
    tellUsLikes: "ፍላጎትዎን ይንገሩን →",
    changeInterests: "ቀይር",
    noResults: "ምርት አልተገኘም",
    tryDifferent: "ሌላ ፍለጋ ይሞክሩ",
    footerTagline: "ኢትዮጵያ የምትሸምትበት",
    all: "ሁሉም",
  },
};

/* ─── Categories ─────────────────────────────────────────── */
const CATEGORIES = [
  { key: "fashion", emoji: "👗", label: "Fashion", am: "ፋሽን", color: "#EC4899" },
  { key: "electronics", emoji: "📱", label: "Electronics", am: "ኤሌክትሮኒክ", color: "#3B82F6" },
  { key: "food", emoji: "🎂", label: "Food", am: "ምግብ", color: "#F59E0B" },
  { key: "beauty", emoji: "💄", label: "Beauty", am: "ውበት", color: "#F43F5E" },
  { key: "home", emoji: "🛋", label: "Home", am: "ቤት", color: "#059669" },
  { key: "coffee", emoji: "☕", label: "Coffee", am: "ቡና", color: "#92400E" },
  { key: "handmade", emoji: "🏺", label: "Handmade", am: "እጅ ስራ", color: "#D97706" },
  { key: "other", emoji: "📦", label: "Other", am: "ሌላ", color: "#6B7280" },
];

/* ─── Intent personalization ─────────────────────────────── */
const INTENT_MAP: Record<string, string[]> = {
  kids: ["fashion", "handmade"],
  fashion: ["fashion"],
  electronics: ["electronics"],
  home: ["home"],
  pets: ["other"],
  gifts: ["handmade", "coffee", "other"],
  wholesale: ["fashion", "electronics", "beauty", "coffee"],
  beauty: ["beauty"],
  food: ["food", "coffee"],
};

const STORAGE_KEY = "souk_interests";

function loadInterests(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v ? JSON.parse(v) : [];
  } catch { return []; }
}

function saveInterests(keys: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
}

function getMatchingCategories(intents: string[]): string[] {
  const cats = new Set<string>();
  for (const k of intents) {
    (INTENT_MAP[k] || []).forEach(c => cats.add(c));
  }
  return [...cats];
}

/* ─── Price helper ───────────────────────────────────────── */
function fmtPrice(price: number | null, pt: string | null, lang: "en" | "am"): string {
  if (pt === "contact" || price === null) return lang === "am" ? "ለዋጋ ያግኙን" : "Contact";
  const f = price.toLocaleString();
  if (pt === "starting_from") return lang === "am" ? `ከ ${f} ብር` : `From ${f} Birr`;
  return lang === "am" ? `${f} ብር` : `${f} Birr`;
}

/* ─── Interest Picker Modal ──────────────────────────────── */
const INTENTS = [
  { key: "kids", emoji: "👶", label: "Kids", am: "ልጆች" },
  { key: "fashion", emoji: "👗", label: "Fashion", am: "ፋሽን" },
  { key: "electronics", emoji: "📱", label: "Tech", am: "ቴክ" },
  { key: "home", emoji: "🛋", label: "Home", am: "ቤት" },
  { key: "pets", emoji: "🐱", label: "Pets", am: "እንስሳ" },
  { key: "gifts", emoji: "🎁", label: "Gifts", am: "ስጦታ" },
  { key: "beauty", emoji: "💄", label: "Beauty", am: "ውበት" },
  { key: "food", emoji: "☕", label: "Food", am: "ምግብ" },
];

function IntentModal({ lang, onDone, onClose }: { lang: "en" | "am"; onDone: (keys: string[]) => void; onClose: () => void }) {
  const [sel, setSel] = useState<Set<string>>(new Set());
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", alignItems: "flex-end", justifyContent: "center" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }} />
      <div style={{ position: "relative", width: "100%", maxWidth: "440px", background: C.white,
        borderRadius: "24px 24px 0 0", padding: "24px 20px 32px",
        animation: "sheetUp 0.3s cubic-bezier(0.32,0.72,0,1)" }}>
        <div style={{ width: "40px", height: "4px", borderRadius: "2px", background: "#E5E0DC", margin: "0 auto 16px" }} />
        <h3 style={{ fontSize: "18px", fontWeight: 800, color: C.dark, textAlign: "center", marginBottom: "4px" }}>
          {lang === "am" ? "ምን ይወዳሉ?" : "What do you like?"}
        </h3>
        <p style={{ fontSize: "13px", color: C.muted, textAlign: "center", marginBottom: "16px" }}>
          {lang === "am" ? "የሚፈልጉትን ይምረጡ" : "Pick your interests"}
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", justifyContent: "center" }}>
          {INTENTS.map(i => {
            const active = sel.has(i.key);
            return (
              <button key={i.key} onClick={() => setSel(p => { const n = new Set(p); if (n.has(i.key)) n.delete(i.key); else n.add(i.key); return n; })}
                style={{ padding: "8px 16px", borderRadius: "24px", border: `2px solid ${active ? C.terra : C.border}`,
                  background: active ? `${C.terra}10` : C.white, fontSize: "13px", fontWeight: 600,
                  color: active ? C.terra : C.text, cursor: "pointer", transition: "all 0.15s",
                  display: "flex", alignItems: "center", gap: "6px" }}>
                <span>{i.emoji}</span> {lang === "am" ? i.am : i.label}
              </button>
            );
          })}
        </div>
        <button onClick={() => { saveInterests([...sel]); onDone([...sel]); }}
          style={{ width: "100%", marginTop: "16px", padding: "14px", borderRadius: "14px", border: "none",
            background: sel.size > 0 ? C.terra : "#E5E0DC", color: sel.size > 0 ? "white" : "#A09890",
            fontSize: "15px", fontWeight: 700, cursor: sel.size > 0 ? "pointer" : "default",
            transition: "all 0.2s" }}>
          {sel.size > 0 ? (lang === "am" ? "ቀጥል" : `Done (${sel.size})`) : (lang === "am" ? "ይምረጡ" : "Pick at least one")}
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/* ═══ MAIN COMPONENT ═══════════════════════════════════════ */
/* ═══════════════════════════════════════════════════════════ */

export default function MarketplaceClient({ initialProducts, initialShops, categoryCounts, totalProducts, shopCount = 0 }: Props) {
  const [mounted, setMounted] = useState(false);
  const [lang, setLang] = useState<"en" | "am">("am");
  const [interests, setInterests] = useState<string[]>([]);
  const [showIntentModal, setShowIntentModal] = useState(false);
  const [dismissedBanner, setDismissedBanner] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [products, setProducts] = useState<MarketProduct[]>(initialProducts);
  const [loading, setLoading] = useState(false);
  const [offset, setOffset] = useState(20);
  const [hasMore, setHasMore] = useState(initialProducts.length >= 20);
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    setMounted(true);
    const saved = loadInterests();
    setInterests(saved);
    if (saved.length > 0) setDismissedBanner(true);
  }, []);

  const t = T[lang];

  // Fetch products (search, category filter, or personalized)
  const fetchProducts = useCallback(async (opts: { search?: string; category?: string; intents?: string[]; off?: number; append?: boolean }) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (opts.search) params.set("q", opts.search);
      if (opts.category) params.set("category", opts.category);
      else if (opts.intents && opts.intents.length > 0 && !opts.search) {
        params.set("categories", getMatchingCategories(opts.intents).join(","));
      }
      params.set("sort", "newest");
      params.set("offset", String(opts.off || 0));
      params.set("limit", "20");
      const res = await fetch(`/api/marketplace?${params}`);
      if (!res.ok) return;
      const data = await res.json();
      const newP = data.products || [];
      if (opts.append) setProducts(prev => [...prev, ...newP]);
      else setProducts(newP);
      setHasMore(newP.length >= 20);
      setOffset((opts.off || 0) + newP.length);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  // Search with debounce
  function handleSearch(value: string) {
    setSearchInput(value);
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setSearchQuery(value);
      setSelectedCategory(null);
      if (value.length >= 2) fetchProducts({ search: value });
      else if (interests.length > 0) fetchProducts({ intents: interests });
      else { setProducts(initialProducts); setOffset(20); setHasMore(initialProducts.length >= 20); }
    }, 400);
  }

  function selectCategory(cat: string | null) {
    setSelectedCategory(cat);
    setSearchInput(""); setSearchQuery("");
    if (cat) fetchProducts({ category: cat });
    else if (interests.length > 0) fetchProducts({ intents: interests });
    else { setProducts(initialProducts); setOffset(20); }
  }

  function loadMore() {
    fetchProducts({
      search: searchQuery || undefined,
      category: selectedCategory || undefined,
      intents: (!searchQuery && !selectedCategory) ? interests : undefined,
      off: offset, append: true,
    });
  }

  // Personalized label
  const isPersonalized = interests.length > 0 && !searchQuery && !selectedCategory;

  if (!mounted) return null;

  return (
    <div style={{ minHeight: "100vh", background: C.bg }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;1,9..40,400&family=Noto+Sans+Ethiopic:wght@400;500;600;700&display=swap');
        * { font-family: 'DM Sans', 'Noto Sans Ethiopic', system-ui, sans-serif; margin: 0; box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:none; } }
        @keyframes sheetUp { from { transform:translateY(100%); } to { transform:translateY(0); } }
        @keyframes fabPulse { 0%,100% { box-shadow: 0 4px 20px ${C.gold}55; } 50% { box-shadow: 0 4px 28px ${C.gold}88; } }
        @keyframes heroReveal { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:none; } }
        .card-anim { animation: fadeUp 0.45s ease-out both; }
        .hide-sb { scrollbar-width: none; } .hide-sb::-webkit-scrollbar { display: none; }
        .pcard { transition: transform 0.15s, box-shadow 0.15s; }
        .pcard:active { transform: scale(0.97); }
        @media (hover:hover) { .pcard:hover { transform: translateY(-4px); box-shadow: 0 12px 28px rgba(0,0,0,0.12); } }
      `}</style>

      {/* ═══ Top Bar ═══ */}
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 16px 8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
          <div style={{ width: "28px", height: "28px", borderRadius: "8px", background: C.terra,
            display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: "14px" }}>🏪</span>
          </div>
          <span style={{ fontSize: "17px", fontWeight: 800, color: C.dark, letterSpacing: "-0.4px" }}>souk.et</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <button onClick={() => setLang(l => l === "en" ? "am" : "en")}
            style={{ padding: "5px 10px", borderRadius: "8px", border: `1px solid ${C.border}`,
              background: "transparent", fontSize: "11px", fontWeight: 600, color: C.muted, cursor: "pointer" }}>
            {lang === "en" ? "🇪🇹 አማ" : "🇬🇧 EN"}
          </button>
          <a href="https://t.me/SoukEtBot" target="_blank" rel="noopener noreferrer"
            style={{ padding: "6px 14px", borderRadius: "10px", border: `1.5px solid ${C.terra}`,
              background: "transparent", color: C.terra, fontSize: "12px", fontWeight: 700,
              textDecoration: "none", transition: "all 0.15s" }}>
            {t.sellFree}
          </a>
        </div>
      </nav>

      {/* ═══ Hero ═══ */}
      <div style={{ padding: "16px 16px 20px", position: "relative", overflow: "hidden" }}>
        {/* Subtle pattern background */}
        <div style={{ position: "absolute", inset: 0, opacity: 0.03,
          backgroundImage: `repeating-linear-gradient(45deg, ${C.terra} 0px, ${C.terra} 1px, transparent 1px, transparent 12px),
            repeating-linear-gradient(-45deg, ${C.terra} 0px, ${C.terra} 1px, transparent 1px, transparent 12px)`,
          pointerEvents: "none" }} />

        <div style={{ position: "relative" }}>
          <h1 style={{ fontSize: "36px", fontWeight: 800, lineHeight: 1.1, letterSpacing: "-1px",
            animation: "heroReveal 0.6s ease-out" }}>
            <span style={{ color: C.dark }}>{t.heroLine1} </span>
            <span style={{ color: C.terra }}>{t.heroLine2} </span>
            <br />
            <span style={{ color: C.gold }}>{t.heroLine3}</span>
          </h1>

          {/* Search */}
          <div style={{ position: "relative", marginTop: "16px", animation: "heroReveal 0.6s ease-out 0.1s both" }}>
            <svg style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)",
              width: "18px", height: "18px", color: C.muted, opacity: 0.5 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
            <input type="text" value={searchInput} onChange={(e) => handleSearch(e.target.value)}
              placeholder={t.searchPlaceholder}
              style={{ width: "100%", padding: "14px 16px 14px 44px", borderRadius: "16px",
                border: `1.5px solid ${searchInput ? C.terra : C.border}`,
                background: C.white, fontSize: "15px", color: C.dark, outline: "none",
                boxShadow: searchInput ? `0 0 0 3px ${C.terra}18` : "0 2px 8px rgba(26,8,4,0.04)",
                transition: "all 0.2s" }} />
          </div>

          {/* Seller hook */}
          <a href="https://t.me/SoukEtBot" target="_blank" rel="noopener noreferrer"
            style={{ display: "block", marginTop: "10px", fontSize: "13px", fontWeight: 500,
              color: C.muted, textDecoration: "none", animation: "heroReveal 0.6s ease-out 0.2s both" }}>
            {t.sellerHook} <span style={{ color: C.terra }}>→</span>
          </a>
        </div>
      </div>

      {/* ═══ Categories ═══ */}
      <div className="hide-sb" style={{ display: "flex", gap: "8px", overflowX: "auto",
        padding: "0 16px 12px", margin: "0" }}>
        <button onClick={() => selectCategory(null)}
          style={{ flexShrink: 0, padding: "8px 16px", borderRadius: "24px",
            border: `1.5px solid ${!selectedCategory ? C.terra : C.border}`,
            background: !selectedCategory ? C.terra : C.white,
            color: !selectedCategory ? "white" : C.text,
            fontSize: "13px", fontWeight: 600, cursor: "pointer", transition: "all 0.15s",
            whiteSpace: "nowrap" }}>
          {t.all}
        </button>
        {CATEGORIES.map(cat => {
          const count = categoryCounts[cat.key] || 0;
          const active = selectedCategory === cat.key;
          return (
            <button key={cat.key} onClick={() => selectCategory(active ? null : cat.key)}
              style={{ flexShrink: 0, padding: "8px 14px", borderRadius: "24px",
                border: `1.5px solid ${active ? cat.color : C.border}`,
                background: active ? `${cat.color}12` : C.white,
                color: active ? cat.color : C.text,
                fontSize: "13px", fontWeight: 600, cursor: "pointer", transition: "all 0.15s",
                display: "flex", alignItems: "center", gap: "5px", whiteSpace: "nowrap" }}>
              <span style={{ fontSize: "14px" }}>{cat.emoji}</span>
              {lang === "am" ? cat.am : cat.label}
              {count > 0 && <span style={{ fontSize: "10px", opacity: 0.5 }}>{count}</span>}
            </button>
          );
        })}
      </div>

      {/* ═══ Personalization Banner ═══ */}
      {!dismissedBanner && interests.length === 0 && !searchQuery && (
        <div style={{ margin: "0 16px 12px", padding: "10px 14px", borderRadius: "12px",
          background: `linear-gradient(135deg, ${C.sand}, ${C.border}40)`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          animation: "fadeUp 0.4s ease-out" }}>
          <button onClick={() => setShowIntentModal(true)}
            style={{ fontSize: "13px", fontWeight: 600, color: C.terra, background: "transparent",
              border: "none", cursor: "pointer", padding: 0 }}>
            ✨ {t.tellUsLikes}
          </button>
          <button onClick={() => setDismissedBanner(true)}
            style={{ fontSize: "16px", color: C.muted, background: "transparent", border: "none",
              cursor: "pointer", padding: "0 2px", lineHeight: 1 }}>×</button>
        </div>
      )}

      {/* Personalization pills */}
      {isPersonalized && (
        <div style={{ padding: "0 16px 8px", display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
          <span style={{ fontSize: "13px", fontWeight: 700, color: C.dark }}>{t.forYou}</span>
          <button onClick={() => setShowIntentModal(true)}
            style={{ fontSize: "11px", color: C.muted, background: "transparent", border: "none",
              cursor: "pointer", textDecoration: "underline" }}>
            {t.changeInterests}
          </button>
        </div>
      )}

      {/* ═══ Section header ═══ */}
      {!isPersonalized && !searchQuery && (
        <div style={{ padding: "0 16px 8px" }}>
          <h2 style={{ fontSize: "18px", fontWeight: 800, color: C.dark, letterSpacing: "-0.3px" }}>
            {t.newArrivals}
          </h2>
        </div>
      )}

      {/* ═══ Products Grid ═══ */}
      <div style={{ padding: "0 16px" }}>
        {searchQuery && (
          <p style={{ fontSize: "13px", color: C.muted, marginBottom: "8px" }}>
            {products.length} {lang === "am" ? "ውጤት" : "results"} {searchQuery && `"${searchQuery}"`}
          </p>
        )}

        {products.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 20px" }}>
            <span style={{ fontSize: "40px", display: "block", marginBottom: "8px" }}>🔍</span>
            <p style={{ fontSize: "15px", fontWeight: 700, color: C.dark }}>{t.noResults}</p>
            <p style={{ fontSize: "13px", color: C.muted, marginTop: "2px" }}>{t.tryDifferent}</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "10px" }}>
            {products.map((p, i) => {
              const isSoldOut = p.stock === 0;
              const src = imgUrl(p.photo_file_id, p.photo_url);
              return (
                <div key={p.id} className="pcard card-anim"
                  style={{ animationDelay: `${i * 0.04}s`, borderRadius: "16px", overflow: "hidden",
                    background: C.white, border: `1px solid ${C.border}` }}>
                  <Link href={`/${p.shop_slug}`} style={{ textDecoration: "none", color: "inherit" }}>
                    <div style={{ position: "relative", width: "100%", aspectRatio: "1",
                      background: C.sand, overflow: "hidden" }}>
                      {src ? (
                        <img src={src} alt={p.name} loading="lazy" decoding="async"
                          style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center",
                          justifyContent: "center", background: `linear-gradient(135deg, ${C.sand}, ${C.border})` }}>
                          <span style={{ fontSize: "32px", opacity: 0.25 }}>
                            {CATEGORIES.find(c => c.key === p.shop_category)?.emoji || "📦"}
                          </span>
                        </div>
                      )}
                      {isSoldOut && (
                        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)",
                          display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <span style={{ color: "white", fontSize: "11px", fontWeight: 700,
                            background: "rgba(0,0,0,0.4)", padding: "3px 10px", borderRadius: "16px" }}>
                            {t.soldOut}
                          </span>
                        </div>
                      )}
                    </div>
                  </Link>
                  <div style={{ padding: "10px 10px 11px" }}>
                    <p style={{ fontSize: "13px", fontWeight: 700, color: C.dark, lineHeight: 1.3,
                      display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                      overflow: "hidden", marginBottom: "2px" }}>{p.name}</p>
                    <p style={{ fontSize: "14px", fontWeight: 800, color: C.terra }}>
                      {fmtPrice(p.price, p.price_type, lang)}
                    </p>
                    <p style={{ fontSize: "11px", color: C.muted, marginTop: "1px",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {p.shop_name}
                    </p>
                    {!isSoldOut && (
                      <Link href={`/${p.shop_slug}`}
                        style={{ display: "block", marginTop: "8px", padding: "7px", borderRadius: "10px",
                          background: C.terra, color: "white", textAlign: "center",
                          fontSize: "12px", fontWeight: 600, textDecoration: "none" }}>
                        {t.contactSeller}
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Load More */}
        {hasMore && products.length > 0 && !searchQuery && (
          <button onClick={loadMore} disabled={loading}
            style={{ display: "block", width: "100%", padding: "14px", marginTop: "14px",
              borderRadius: "14px", border: `1.5px solid ${C.border}`, background: C.white,
              color: loading ? C.muted : C.terra, fontSize: "14px", fontWeight: 600,
              cursor: loading ? "default" : "pointer" }}>
            {loading ? t.loading : t.loadMore}
          </button>
        )}
      </div>

      {/* ═══ Seller Pitch ═══ */}
      {!searchQuery && (
        <div style={{ margin: "32px 16px 0", padding: "24px 20px", borderRadius: "20px",
          background: `linear-gradient(135deg, ${C.dark} 0%, #1A1008 100%)`,
          position: "relative", overflow: "hidden" }}>
          {/* Decorative pattern */}
          <div style={{ position: "absolute", inset: 0, opacity: 0.04,
            backgroundImage: `radial-gradient(circle at 2px 2px, ${C.gold} 1px, transparent 0)`,
            backgroundSize: "20px 20px", pointerEvents: "none" }} />

          <div style={{ position: "relative" }}>
            <p style={{ fontSize: "11px", fontWeight: 700, color: C.gold, letterSpacing: "1.5px",
              textTransform: "uppercase", marginBottom: "8px" }}>
              {lang === "am" ? "ለሻጮች" : "FOR SELLERS"}
            </p>
            <h3 style={{ fontSize: "22px", fontWeight: 800, color: C.white, lineHeight: 1.2,
              letterSpacing: "-0.3px", marginBottom: "16px" }}>
              {lang === "am" ? "ሱቅዎን በ 3 ደቂቃ ይክፈቱ" : "Open your shop in 3 minutes"}
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" }}>
              {[
                { n: "1", title: t.stepOpen, desc: t.stepOpenDesc },
                { n: "2", title: t.stepAdd, desc: t.stepAddDesc },
                { n: "3", title: t.stepShare, desc: t.stepShareDesc },
              ].map(step => (
                <div key={step.n} style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                  <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: C.gold,
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    fontSize: "13px", fontWeight: 800, color: C.dark }}>{step.n}</div>
                  <div>
                    <p style={{ fontSize: "14px", fontWeight: 700, color: C.white }}>{step.title}</p>
                    <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", marginTop: "1px" }}>{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <a href="https://t.me/SoukEtBot" target="_blank" rel="noopener noreferrer"
              style={{ display: "block", padding: "14px", borderRadius: "14px", background: C.gold,
                color: C.dark, textAlign: "center", fontSize: "15px", fontWeight: 700,
                textDecoration: "none" }}>
              {t.startSelling}
            </a>
          </div>
        </div>
      )}

      {/* ═══ Trust Strip ═══ */}
      {!searchQuery && (
        <div style={{ display: "flex", justifyContent: "center", gap: "6px", flexWrap: "wrap",
          padding: "24px 16px 8px" }}>
          {[
            { value: totalProducts.toLocaleString(), label: t.trustItems },
            { value: (shopCount || initialShops.length).toString(), label: t.trustSellers },
            { value: "✓", label: t.trustFree },
            { value: "💬", label: t.trustTelegram },
          ].map((s, i) => (
            <div key={i} style={{ padding: "6px 12px", borderRadius: "20px", background: C.white,
              border: `1px solid ${C.border}`, fontSize: "11px", fontWeight: 600, color: C.muted,
              display: "flex", alignItems: "center", gap: "4px", whiteSpace: "nowrap" }}>
              <span style={{ fontWeight: 800, color: C.dark }}>{s.value}</span> {s.label}
            </div>
          ))}
        </div>
      )}

      {/* ═══ Shops Section ═══ */}
      {!searchQuery && initialShops.length > 0 && (
        <div style={{ padding: "20px 0 8px" }}>
          <div style={{ padding: "0 16px 10px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: 800, color: C.dark, letterSpacing: "-0.3px" }}>{t.shops}</h2>
          </div>
          <div className="hide-sb" style={{ display: "flex", gap: "10px", overflowX: "auto",
            padding: "0 16px 4px" }}>
            {initialShops.slice(0, 14).map(shop => {
              const logoSrc = imgUrl(shop.logo_file_id, shop.logo_url);
              return (
                <Link key={shop.shop_slug} href={`/${shop.shop_slug}`}
                  style={{ textDecoration: "none", color: "inherit", flexShrink: 0 }}>
                  <div style={{ width: "76px", textAlign: "center" }}>
                    <div style={{ width: "56px", height: "56px", borderRadius: "16px", margin: "0 auto",
                      overflow: "hidden", background: logoSrc ? C.white : C.sand,
                      border: `1.5px solid ${C.border}`, display: "flex", alignItems: "center",
                      justifyContent: "center" }}>
                      {logoSrc ? (
                        <img src={logoSrc} alt={shop.shop_name} loading="lazy"
                          style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <span style={{ fontSize: "22px" }}>🏪</span>
                      )}
                    </div>
                    <p style={{ fontSize: "10px", fontWeight: 600, color: C.dark, marginTop: "5px",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {shop.shop_name}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ Footer ═══ */}
      <footer style={{ padding: "28px 16px 40px", textAlign: "center", marginTop: "16px" }}>
        <p style={{ fontSize: "16px", fontWeight: 800, color: C.dark }}>souk.et</p>
        <p style={{ fontSize: "11px", color: C.muted, marginTop: "2px" }}>{t.footerTagline}</p>
        <div style={{ display: "flex", gap: "16px", justifyContent: "center", marginTop: "10px" }}>
          <a href="https://t.me/SoukEtBot" target="_blank" rel="noopener noreferrer"
            style={{ fontSize: "12px", color: C.terra, fontWeight: 600, textDecoration: "none" }}>
            {t.startSelling}
          </a>
        </div>
        <p style={{ fontSize: "10px", color: "#C4B0A0", marginTop: "12px" }}>© 2026 souk.et</p>
      </footer>

      {/* ═══ Sticky Sell FAB ═══ */}
      <a href="https://t.me/SoukEtBot" target="_blank" rel="noopener noreferrer"
        style={{ position: "fixed", bottom: "20px", right: "16px", zIndex: 50,
          width: "56px", height: "56px", borderRadius: "50%", background: C.gold,
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: `0 4px 20px ${C.gold}55`, textDecoration: "none",
          animation: "fabPulse 3s ease-in-out infinite",
          transition: "transform 0.15s" }}>
        <span style={{ fontSize: "20px", fontWeight: 800, color: C.dark, lineHeight: 1 }}>+</span>
      </a>

      {/* ═══ Intent Modal ═══ */}
      {showIntentModal && (
        <IntentModal lang={lang}
          onDone={(keys) => {
            setInterests(keys);
            setShowIntentModal(false);
            setDismissedBanner(true);
            if (keys.length > 0) fetchProducts({ intents: keys });
          }}
          onClose={() => setShowIntentModal(false)} />
      )}
    </div>
  );
}
