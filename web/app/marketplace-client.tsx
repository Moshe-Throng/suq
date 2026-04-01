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

/* ─── Buyer intents (personas) ───────────────────────────── */

interface Intent {
  key: string;
  emoji: string;
  label: string;
  labelAm: string;
  hook: string;
  hookAm: string;
  categories: string[];
  color: string;
}

const INTENTS: Intent[] = [
  { key: "kids", emoji: "👶", label: "Shopping for Kids", labelAm: "ለልጆች", hook: "Clothes, toys, school supplies", hookAm: "ልብስ፣ መጫወቻ፣ ትምህርት", categories: ["fashion", "handmade"], color: "#F472B6" },
  { key: "fashion", emoji: "👗", label: "Fashion & Style", labelAm: "ፋሽን", hook: "Dresses, shoes, accessories", hookAm: "ልብስ፣ ጫማ፣ አክሰሰሪ", categories: ["fashion"], color: "#EC4899" },
  { key: "electronics", emoji: "📱", label: "Phones & Tech", labelAm: "ስልክ እና ቴክ", hook: "Phones, laptops, accessories", hookAm: "ስልክ፣ ላፕቶፕ", categories: ["electronics"], color: "#3B82F6" },
  { key: "home", emoji: "🛋", label: "Home & Living", labelAm: "ቤት እና ዕቃ", hook: "Furniture, decor, kitchen", hookAm: "ዕቃ ቤት፣ ማጌጫ", categories: ["home"], color: "#059669" },
  { key: "pets", emoji: "🐱", label: "Pet Parent", labelAm: "የቤት እንስሳ", hook: "Food, toys, accessories", hookAm: "ምግብ፣ መጫወቻ", categories: ["other"], color: "#8B5CF6" },
  { key: "gifts", emoji: "🎁", label: "Gifts & Souvenirs", labelAm: "ስጦታ", hook: "Ethiopian crafts, coffee sets", hookAm: "እጅ ስራ፣ ቡና", categories: ["handmade", "coffee", "other"], color: "#D97706" },
  { key: "wholesale", emoji: "📦", label: "Wholesale / Business", labelAm: "ጅምላ", hook: "Bulk pricing, Merkato sellers", hookAm: "የጅምላ ዋጋ", categories: ["fashion", "electronics", "beauty", "coffee"], color: "#374151" },
  { key: "beauty", emoji: "💄", label: "Beauty & Self-care", labelAm: "ውበት", hook: "Skincare, makeup, salon", hookAm: "ቆዳ፣ ሜካፕ", categories: ["beauty", "salon"], color: "#F43F5E" },
  { key: "food", emoji: "☕", label: "Food & Coffee", labelAm: "ምግብ እና ቡና", hook: "Coffee, spices, bakery", hookAm: "ቡና፣ ቅመም፣ ዳቦ", categories: ["food", "coffee"], color: "#92400E" },
];

const STORAGE_KEY = "souk_interests";

function loadInterests(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const val = localStorage.getItem(STORAGE_KEY);
    return val ? JSON.parse(val) : [];
  } catch { return []; }
}

function saveInterests(keys: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
  document.cookie = `souk_interests=${keys.join(",")};path=/;max-age=31536000`;
}

function getMatchingCategories(intentKeys: string[]): string[] {
  const cats = new Set<string>();
  for (const k of intentKeys) {
    const intent = INTENTS.find(i => i.key === k);
    if (intent) intent.categories.forEach(c => cats.add(c));
  }
  return [...cats];
}

function fmtPrice(price: number | null, pt: string | null, lang: "en" | "am"): string {
  if (pt === "contact" || price === null) return lang === "am" ? "ለዋጋ ያግኙን" : "Contact for price";
  const f = price.toLocaleString();
  if (pt === "starting_from") return lang === "am" ? `ከ ${f} ብር` : `From ${f} Birr`;
  return lang === "am" ? `${f} ብር` : `${f} Birr`;
}

/* ─── Interest Picker ────────────────────────────────────── */

function IntentPicker({ lang, onDone }: { lang: "en" | "am"; onDone: (keys: string[]) => void }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggle(key: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=Noto+Sans+Ethiopic:wght@400;500;600;700&display=swap');
        * { font-family: 'Outfit', 'Noto Sans Ethiopic', sans-serif; margin: 0; box-sizing: border-box; }
        @keyframes cardIn { from { opacity: 0; transform: translateY(20px) scale(0.95); } to { opacity: 1; transform: none; } }
        @keyframes pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.05); } }
        .intent-card { animation: cardIn 0.5s ease-out both; cursor: pointer; transition: all 0.2s; }
        .intent-card:active { transform: scale(0.96) !important; }
        @media (hover:hover) { .intent-card:hover { transform: translateY(-4px); box-shadow: 0 12px 32px rgba(0,0,0,0.12); } }
      `}</style>

      <div style={{ padding: "48px 20px 24px", textAlign: "center" }}>
        <div style={{ fontSize: "32px", marginBottom: "12px" }}>🏪</div>
        <h1 style={{ fontSize: "28px", fontWeight: 900, color: C.dark, lineHeight: 1.2, letterSpacing: "-0.5px" }}>
          {lang === "am" ? "ምን ይፈልጋሉ?" : "What are you\nshopping for?"}
        </h1>
        <p style={{ fontSize: "15px", color: C.muted, marginTop: "8px", lineHeight: 1.5 }}>
          {lang === "am" ? "የሚፈልጉትን ይምረጡ — ለርስዎ ምርቶችን እናሳያለን" : "Pick your interests — we'll show products that match"}
        </p>
      </div>

      <div style={{ padding: "0 16px", flex: 1 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", maxWidth: "440px", margin: "0 auto" }}>
          {INTENTS.map((intent, i) => {
            const active = selected.has(intent.key);
            return (
              <div key={intent.key} className="intent-card" onClick={() => toggle(intent.key)}
                style={{
                  animationDelay: `${i * 0.06}s`,
                  background: active ? `${intent.color}12` : C.white,
                  border: `2px solid ${active ? intent.color : C.border}`,
                  borderRadius: "20px",
                  padding: "16px 14px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                  position: "relative",
                  overflow: "hidden",
                }}>
                {active && (
                  <div style={{ position: "absolute", top: "10px", right: "10px", width: "22px", height: "22px",
                    borderRadius: "50%", background: intent.color, display: "flex", alignItems: "center",
                    justifyContent: "center", color: "white", fontSize: "12px", fontWeight: 700 }}>
                    ✓
                  </div>
                )}
                <span style={{ fontSize: "32px", lineHeight: 1 }}>{intent.emoji}</span>
                <span style={{ fontSize: "14px", fontWeight: 700, color: C.dark }}>
                  {lang === "am" ? intent.labelAm : intent.label}
                </span>
                <span style={{ fontSize: "11px", color: C.muted, lineHeight: 1.3 }}>
                  {lang === "am" ? intent.hookAm : intent.hook}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ padding: "20px 16px 32px", position: "sticky", bottom: 0,
        background: `linear-gradient(transparent, ${C.bg} 30%)`, paddingTop: "40px" }}>
        <button onClick={() => { if (selected.size > 0) { saveInterests([...selected]); onDone([...selected]); } }}
          disabled={selected.size === 0}
          style={{
            width: "100%", maxWidth: "440px", margin: "0 auto", display: "block",
            padding: "16px", borderRadius: "16px", border: "none",
            background: selected.size > 0 ? C.terra : "#E5E0DC",
            color: selected.size > 0 ? "white" : "#A09890",
            fontSize: "16px", fontWeight: 700, cursor: selected.size > 0 ? "pointer" : "default",
            transition: "all 0.3s",
            ...(selected.size > 0 ? { boxShadow: `0 4px 20px ${C.terra}44` } : {}),
          }}>
          {selected.size === 0
            ? (lang === "am" ? "ይምረጡ" : "Pick at least one")
            : (lang === "am" ? `${selected.size} ተመርጧል — ቀጥል` : `Continue with ${selected.size} selected`)}
        </button>

        <button onClick={() => { saveInterests([]); onDone([]); }}
          style={{ display: "block", margin: "12px auto 0", padding: "8px", background: "transparent",
            border: "none", color: C.muted, fontSize: "13px", cursor: "pointer" }}>
          {lang === "am" ? "ሁሉንም አሳዩኝ →" : "Skip — show me everything →"}
        </button>
      </div>
    </div>
  );
}

/* ─── Product Card ───────────────────────────────────────── */

function ProductCard({ p, lang, delay = 0 }: { p: MarketProduct; lang: "en" | "am"; delay?: number }) {
  const isSoldOut = p.stock === 0;
  const [imgFailed, setImgFailed] = useState(false);
  const src = imgUrl(p.photo_file_id, p.photo_url);

  return (
    <div className="pcard" style={{ animationDelay: `${delay}s` }}>
      <Link href={`/${p.shop_slug}`} style={{ textDecoration: "none", color: "inherit" }}>
        <div style={{ position: "relative", width: "100%", aspectRatio: "1", background: C.sand,
          overflow: "hidden", borderRadius: "16px 16px 0 0" }}>
          {src && !imgFailed ? (
            <img src={src} alt={p.name} loading="lazy" decoding="async"
              onError={() => setImgFailed(true)}
              style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center",
              justifyContent: "center", background: `linear-gradient(135deg, #FFE8D6, #FFCDB4)` }}>
              <span style={{ fontSize: "36px", opacity: 0.3 }}>📦</span>
            </div>
          )}
          {isSoldOut && (
            <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)",
              display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: "white", fontSize: "11px", fontWeight: 700,
                background: "rgba(0,0,0,0.4)", padding: "3px 10px", borderRadius: "20px" }}>
                {lang === "am" ? "አልቋል" : "Sold out"}
              </span>
            </div>
          )}
        </div>
      </Link>
      <div style={{ padding: "10px 12px 12px" }}>
        <p style={{ fontSize: "13px", fontWeight: 700, color: C.dark, lineHeight: 1.3,
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
          marginBottom: "3px" }}>
          {p.name}
        </p>
        <p style={{ fontSize: "14px", fontWeight: 800, color: C.terra }}>{fmtPrice(p.price, p.price_type, lang)}</p>
        <p style={{ fontSize: "11px", color: C.muted, marginTop: "2px",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {p.shop_name}
        </p>
        {!isSoldOut && (
          <Link href={`/${p.shop_slug}`}
            style={{
              display: "block", marginTop: "8px", padding: "7px", borderRadius: "10px",
              background: C.terra, color: "white", textAlign: "center",
              fontSize: "12px", fontWeight: 600, textDecoration: "none",
              transition: "opacity 0.15s",
            }}>
            {lang === "am" ? "ሻጩን ያግኙ" : "Contact Seller"}
          </Link>
        )}
      </div>
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────── */

export default function MarketplaceClient({ initialProducts, initialShops, categoryCounts, totalProducts, shopCount = 0 }: Props) {
  const [mounted, setMounted] = useState(false);
  const [lang, setLang] = useState<"en" | "am">("am");
  const [interests, setInterests] = useState<string[] | null>(null); // null = not loaded yet
  const [showPicker, setShowPicker] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [products, setProducts] = useState<MarketProduct[]>(initialProducts);
  const [loading, setLoading] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Load interests from localStorage on mount
  useEffect(() => {
    setMounted(true);
    const saved = loadInterests();
    if (saved.length > 0) {
      setInterests(saved);
    } else {
      setShowPicker(true);
      setInterests([]);
    }
  }, []);

  // Fetch personalized products when interests change
  const fetchProducts = useCallback(async (intents: string[], search = "", off = 0, append = false) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      if (intents.length > 0 && !search) {
        const cats = getMatchingCategories(intents);
        params.set("categories", cats.join(","));
      }
      params.set("sort", "newest");
      params.set("offset", String(off));
      params.set("limit", "20");

      const res = await fetch(`/api/marketplace?${params}`);
      if (!res.ok) return;
      const data = await res.json();
      const newProducts = data.products || [];
      if (append) {
        setProducts(prev => [...prev, ...newProducts]);
      } else {
        setProducts(newProducts);
      }
      setHasMore(newProducts.length >= 20);
      setOffset(off + newProducts.length);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (interests && interests.length > 0 && mounted) {
      fetchProducts(interests);
    }
  }, [interests, mounted, fetchProducts]);

  // Debounced search
  function handleSearch(value: string) {
    setSearchInput(value);
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setSearchQuery(value);
      if (value.length >= 2) {
        fetchProducts([], value);
      } else if (interests && interests.length > 0) {
        fetchProducts(interests);
      } else {
        setProducts(initialProducts);
      }
    }, 400);
  }

  // Interest names for display
  const activeIntentLabels = useMemo(() => {
    if (!interests || interests.length === 0) return [];
    return interests.map(k => {
      const intent = INTENTS.find(i => i.key === k);
      return intent ? (lang === "am" ? intent.labelAm : intent.label) : k;
    });
  }, [interests, lang]);

  // Filter initial products by interests (client-side for instant rendering)
  const filteredProducts = useMemo(() => {
    if (!interests || interests.length === 0 || searchQuery) return products;
    const cats = new Set(getMatchingCategories(interests));
    return products.filter(p => cats.has(p.shop_category));
  }, [products, interests, searchQuery]);

  // Show picker on first visit
  if (!mounted) return null;
  if (showPicker) {
    return (
      <IntentPicker lang={lang} onDone={(keys) => {
        setInterests(keys);
        setShowPicker(false);
        if (keys.length > 0) fetchProducts(keys);
      }} />
    );
  }

  const isPersonalized = interests && interests.length > 0 && !searchQuery;

  return (
    <div style={{ minHeight: "100vh", background: C.bg }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=Noto+Sans+Ethiopic:wght@400;500;600;700&display=swap');
        * { font-family: 'Outfit', 'Noto Sans Ethiopic', sans-serif; margin: 0; box-sizing: border-box; }
        @keyframes cardIn { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }
        .pcard { animation: cardIn 0.4s ease-out both; background: ${C.white}; border-radius: 16px; overflow: hidden; border: 1.5px solid ${C.border}; transition: transform 0.15s, box-shadow 0.15s; }
        .pcard:active { transform: scale(0.97); }
        @media (hover:hover) { .pcard:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(0,0,0,0.1); } }
        .hide-sb { scrollbar-width: none; } .hide-sb::-webkit-scrollbar { display: none; }
      `}</style>

      {/* ═══ Header ═══ */}
      <header style={{ padding: "16px 16px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "24px" }}>🏪</span>
          <span style={{ fontSize: "18px", fontWeight: 800, color: C.dark, letterSpacing: "-0.5px" }}>souk.et</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button onClick={() => setLang(l => l === "en" ? "am" : "en")}
            style={{ padding: "6px 10px", borderRadius: "10px", border: `1px solid ${C.border}`,
              background: C.white, fontSize: "12px", fontWeight: 600, color: C.muted, cursor: "pointer" }}>
            {lang === "en" ? "🇪🇹 አማ" : "🇬🇧 EN"}
          </button>
          <Link href="https://t.me/SoukEtBot" target="_blank"
            style={{ padding: "6px 14px", borderRadius: "10px", background: C.terra, color: "white",
              fontSize: "12px", fontWeight: 700, textDecoration: "none" }}>
            {lang === "am" ? "ሱቅ ክፈቱ" : "Open Shop"}
          </Link>
        </div>
      </header>

      {/* ═══ Search ═══ */}
      <div style={{ padding: "12px 16px" }}>
        <div style={{ position: "relative" }}>
          <svg style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", width: "16px", height: "16px", color: C.muted }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input type="text" value={searchInput} onChange={(e) => handleSearch(e.target.value)}
            placeholder={lang === "am" ? "ምርቶችን ይፈልጉ..." : "Search all products..."}
            style={{ width: "100%", padding: "12px 14px 12px 42px", borderRadius: "14px",
              border: `1.5px solid ${searchInput ? C.terra : C.border}`, background: C.white,
              fontSize: "14px", color: C.dark, outline: "none",
              boxShadow: searchInput ? `0 0 0 3px ${C.terra}20` : "0 1px 3px rgba(0,0,0,0.04)",
              transition: "all 0.2s" }} />
        </div>
      </div>

      {/* ═══ Personalization Bar ═══ */}
      {isPersonalized && (
        <div style={{ padding: "0 16px 8px", display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
          <span style={{ fontSize: "12px", color: C.muted, fontWeight: 500 }}>
            {lang === "am" ? "ለርስዎ:" : "For you:"}
          </span>
          {activeIntentLabels.map((label, i) => (
            <span key={i} style={{ fontSize: "11px", fontWeight: 600, padding: "3px 10px", borderRadius: "20px",
              background: `${C.terra}12`, color: C.terra }}>
              {label}
            </span>
          ))}
          <button onClick={() => setShowPicker(true)}
            style={{ fontSize: "11px", color: C.muted, background: "transparent", border: "none",
              cursor: "pointer", textDecoration: "underline", padding: "3px 4px" }}>
            {lang === "am" ? "ቀይር" : "Change"}
          </button>
        </div>
      )}

      {/* ═══ Products Grid ═══ */}
      <div style={{ padding: "0 16px 100px" }}>
        {searchQuery && (
          <p style={{ fontSize: "13px", color: C.muted, marginBottom: "12px" }}>
            {filteredProducts.length} {lang === "am" ? "ውጤት ለ" : "results for"} "{searchQuery}"
          </p>
        )}

        {filteredProducts.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <span style={{ fontSize: "48px", display: "block", marginBottom: "12px" }}>🔍</span>
            <p style={{ fontSize: "16px", fontWeight: 700, color: C.dark }}>
              {lang === "am" ? "ምርት አልተገኘም" : "No products found"}
            </p>
            <p style={{ fontSize: "13px", color: C.muted, marginTop: "4px" }}>
              {lang === "am" ? "ሌላ ፍለጋ ይሞክሩ" : "Try a different search or change your interests"}
            </p>
            <button onClick={() => setShowPicker(true)}
              style={{ marginTop: "16px", padding: "10px 20px", borderRadius: "12px",
                background: C.terra, color: "white", border: "none", fontSize: "13px",
                fontWeight: 600, cursor: "pointer" }}>
              {lang === "am" ? "ፍላጎቶችን ቀይር" : "Change interests"}
            </button>
          </div>
        ) : (
          <>
            {/* Section Header */}
            {isPersonalized && (
              <h2 style={{ fontSize: "18px", fontWeight: 800, color: C.dark, marginBottom: "12px",
                letterSpacing: "-0.3px" }}>
                {lang === "am" ? "ለርስዎ" : "For You"}
              </h2>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px" }}>
              {filteredProducts.map((p, i) => (
                <ProductCard key={p.id} p={p} lang={lang} delay={i * 0.04} />
              ))}
            </div>

            {/* Load More */}
            {hasMore && !searchQuery && (
              <button onClick={() => fetchProducts(interests || [], "", offset, true)}
                disabled={loading}
                style={{ display: "block", width: "100%", padding: "14px", marginTop: "16px",
                  borderRadius: "14px", border: `1.5px solid ${C.border}`, background: C.white,
                  color: loading ? C.muted : C.terra, fontSize: "14px", fontWeight: 600,
                  cursor: loading ? "default" : "pointer" }}>
                {loading ? (lang === "am" ? "እየጫነ..." : "Loading...") : (lang === "am" ? "ተጨማሪ" : "Load more")}
              </button>
            )}
          </>
        )}

        {/* ═══ Shops Section ═══ */}
        {!searchQuery && initialShops.length > 0 && (
          <div style={{ marginTop: "32px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: 800, color: C.dark, marginBottom: "12px",
              letterSpacing: "-0.3px" }}>
              {lang === "am" ? "ሱቆች" : "Shops"}
            </h2>
            <div className="hide-sb" style={{ display: "flex", gap: "10px", overflowX: "auto",
              margin: "0 -16px", padding: "0 16px 8px" }}>
              {initialShops.slice(0, 12).map(shop => {
                const logoSrc = imgUrl(shop.logo_file_id, shop.logo_url);
                return (
                  <Link key={shop.shop_slug} href={`/${shop.shop_slug}`}
                    style={{ textDecoration: "none", color: "inherit", flexShrink: 0 }}>
                    <div style={{ width: "80px", textAlign: "center" }}>
                      <div style={{ width: "60px", height: "60px", borderRadius: "18px", margin: "0 auto",
                        overflow: "hidden", background: logoSrc ? C.white : C.sand,
                        border: `2px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {logoSrc ? (
                          <img src={logoSrc} alt={shop.shop_name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          <span style={{ fontSize: "24px" }}>🏪</span>
                        )}
                      </div>
                      <p style={{ fontSize: "11px", fontWeight: 600, color: C.dark, marginTop: "6px",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {shop.shop_name}
                      </p>
                      <p style={{ fontSize: "10px", color: C.muted }}>{shop.product_count} {lang === "am" ? "ምርት" : "items"}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ═══ Footer ═══ */}
      <footer style={{ padding: "24px 16px 40px", borderTop: `1px solid ${C.border}`, textAlign: "center" }}>
        <p style={{ fontSize: "18px", fontWeight: 800, color: C.dark, letterSpacing: "-0.3px" }}>
          souk.et
        </p>
        <p style={{ fontSize: "12px", color: C.muted, marginTop: "4px" }}>
          {lang === "am" ? "ኢትዮጵያ የምትሸምትበት" : "Where Ethiopia Shops"}
        </p>
        <div style={{ display: "flex", gap: "16px", justifyContent: "center", marginTop: "12px" }}>
          <Link href="https://t.me/SoukEtBot" target="_blank"
            style={{ fontSize: "12px", color: C.terra, fontWeight: 600, textDecoration: "none" }}>
            {lang === "am" ? "ሱቅ ክፈቱ →" : "Open a Shop →"}
          </Link>
          <button onClick={() => setShowPicker(true)}
            style={{ fontSize: "12px", color: C.muted, fontWeight: 500, background: "transparent",
              border: "none", cursor: "pointer" }}>
            {lang === "am" ? "ፍላጎቶችን ቀይር" : "Change interests"}
          </button>
        </div>
        <p style={{ fontSize: "10px", color: "#C4B0A0", marginTop: "16px" }}>
          © 2026 souk.et
        </p>
      </footer>
    </div>
  );
}
