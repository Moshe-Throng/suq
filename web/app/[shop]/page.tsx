"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useParams } from "next/navigation";

/* ─── Types ─────────────────────────────────────────────── */

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  price_type: string | null;
  listing_type: string | null;
  photo_url: string | null;
  photo_file_id: string | null;
  tag: string | null;
  stock: number | null;
}

interface Shop {
  id: string;
  shop_name: string;
  shop_slug: string;
  telegram_username: string | null;
  theme_color: string | null;
  template_style: string | null;
  shop_type: string | null;
  category: string | null;
  phone: string | null;
  location_text: string | null;
  description: string | null;
  logo_url: string | null;
  logo_file_id: string | null;
}

interface InquiryForm {
  productId: string;
  productName: string;
  price: number | null;
  priceType: string;
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

/* ─── Color Palette Map ────────────────────────────────────── */

function buildTheme(
  primary: string, primaryDark: string, accent: string,
  bgSoft: string, bgSubtle: string, ring: string
): ThemeColors {
  return {
    primary, primaryDark, accent, bgSoft, bgSubtle, ring,
    gradient: `linear-gradient(135deg, ${primaryDark} 0%, ${primary} 100%)`,
    gradientCard: `linear-gradient(135deg, ${bgSubtle} 0%, ${bgSoft} 100%)`,
  };
}

const TEMPLATE_THEMES: Record<string, ThemeColors> = {
  purple:   buildTheme("#7C3AED","#6D28D9","#A78BFA","#EDE9FE","#F5F3FF","#C4B5FD"),
  blue:     buildTheme("#2563EB","#1D4ED8","#93C5FD","#DBEAFE","#EFF6FF","#BFDBFE"),
  cyan:     buildTheme("#06B6D4","#0891B2","#67E8F9","#CFFAFE","#ECFEFF","#A5F3FC"),
  teal:     buildTheme("#0D9488","#0F766E","#5EEAD4","#CCFBF1","#F0FDFA","#99F6E4"),
  green:    buildTheme("#059669","#047857","#6EE7B7","#D1FAE5","#ECFDF5","#A7F3D0"),
  orange:   buildTheme("#EA580C","#C2410C","#FDBA74","#FFEDD5","#FFF7ED","#FED7AA"),
  red:      buildTheme("#E11D48","#BE123C","#FDA4AF","#FFE4E6","#FFF1F2","#FECDD3"),
  amber:    buildTheme("#D97706","#B45309","#FCD34D","#FEF3C7","#FFFBEB","#FDE68A"),
  charcoal: buildTheme("#374151","#1F2937","#9CA3AF","#F3F4F6","#F9FAFB","#D1D5DB"),
  brown:    buildTheme("#92400E","#78350F","#D97706","#FEF3C7","#FFFBEB","#FDE68A"),
  clean:    buildTheme("#7C3AED","#6D28D9","#A78BFA","#EDE9FE","#F5F3FF","#C4B5FD"),
  bold:     buildTheme("#06B6D4","#0891B2","#67E8F9","#CFFAFE","#ECFEFF","#A5F3FC"),
  minimal:  buildTheme("#374151","#1F2937","#9CA3AF","#F3F4F6","#F9FAFB","#D1D5DB"),
  ethiopian:buildTheme("#92400E","#78350F","#D97706","#FEF3C7","#FFFBEB","#FDE68A"),
  fresh:    buildTheme("#0D9488","#0F766E","#5EEAD4","#CCFBF1","#F0FDFA","#99F6E4"),
  warm:     buildTheme("#EA580C","#C2410C","#FDBA74","#FFEDD5","#FFF7ED","#FED7AA"),
};

const LEGACY_THEMES: Record<string, ThemeColors> = {
  teal: TEMPLATE_THEMES.teal,
  purple: TEMPLATE_THEMES.purple,
  rose: TEMPLATE_THEMES.red,
  orange: TEMPLATE_THEMES.orange,
  emerald: TEMPLATE_THEMES.green,
  gold: TEMPLATE_THEMES.amber,
};

/* ─── Tag display labels ─────────────────────────────────── */

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

/* ─── Price helpers ───────────────────────────────────────── */

function fmtPrice(price: number | null, pt: string | null): string {
  if (pt === "contact" || price === null) return "Contact";
  const f = price.toLocaleString();
  if (pt === "starting_from") return `From ${f} Birr`;
  return `${f} Birr`;
}

function fmtPriceLong(price: number | null, pt: string | null): string {
  if (pt === "contact" || price === null) return "Contact for pricing";
  const f = price.toLocaleString();
  if (pt === "starting_from") return `Starting from ${f} Birr`;
  return `${f} Birr`;
}

/* ─── Component ─────────────────────────────────────────── */

export default function ShopPage() {
  const params = useParams();
  const slug = params.shop as string;

  const [shop, setShop] = useState<Shop | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Search, filter, sort
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"newest" | "price_asc" | "price_desc">("newest");

  // Product detail modal
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Share
  const [shareProductId, setShareProductId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Inquiry modal
  const [inquiryForm, setInquiryForm] = useState<InquiryForm | null>(null);
  const [buyerName, setBuyerName] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [buyerMessage, setBuyerMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Debounced search
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const handleSearch = useCallback((value: string) => {
    setSearchInput(value);
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => setSearchQuery(value), 300);
  }, []);

  const theme = useMemo(() => {
    if (shop?.template_style && TEMPLATE_THEMES[shop.template_style])
      return TEMPLATE_THEMES[shop.template_style];
    const key = shop?.theme_color || "teal";
    return LEGACY_THEMES[key] || TEMPLATE_THEMES.clean;
  }, [shop?.template_style, shop?.theme_color]);

  const isService = shop?.shop_type === "service";

  // Unique tags from products
  const availableTags = useMemo(() => {
    const tags = products.map(p => p.tag).filter(Boolean) as string[];
    return [...new Set(tags)];
  }, [products]);

  // Filtered + sorted products
  const filteredProducts = useMemo(() => {
    let result = [...products];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q))
      );
    }
    if (activeTag) result = result.filter(p => p.tag === activeTag);
    if (sortBy === "price_asc") result.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
    else if (sortBy === "price_desc") result.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
    return result;
  }, [products, searchQuery, activeTag, sortBy]);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/shop/${slug}`);
        if (!res.ok) { setError("Shop not found"); return; }
        const data = await res.json();
        setShop(data.shop);
        setProducts(data.products);
      } catch { setError("Failed to load shop"); }
      finally { setLoading(false); }
    }
    load();
  }, [slug]);

  async function submitInquiry() {
    if (!inquiryForm || !buyerName.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shop_id: shop!.id,
          product_id: inquiryForm.productId,
          buyer_name: buyerName.trim(),
          buyer_phone: buyerPhone.trim() || undefined,
          message: buyerMessage.trim() || undefined,
        }),
      });
      if (res.ok) {
        setSubmitSuccess(true);
        setTimeout(() => {
          setInquiryForm(null); setSubmitSuccess(false);
          setBuyerName(""); setBuyerPhone(""); setBuyerMessage("");
        }, 2500);
      }
    } catch { /* silent */ } finally { setSubmitting(false); }
  }

  function openInquiry(p: Product) {
    setSelectedProduct(null);
    setInquiryForm({ productId: p.id, productName: p.name, price: p.price, priceType: p.price_type || "fixed" });
  }

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const shopUrl = `${baseUrl}/${slug}`;

  function shareProduct(p: Product) {
    const url = `${shopUrl}?p=${p.id}`;
    const text = `Check out ${p.name}${p.price ? ` - ${p.price.toLocaleString()} Birr` : ""} at ${shop?.shop_name}!`;
    if (navigator?.share) { navigator.share({ title: p.name, text, url }).catch(() => {}); }
    else { setShareProductId(shareProductId === p.id ? null : p.id); }
  }

  function copyLink(url: string, id: string) {
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(id); setTimeout(() => setCopiedId(null), 1500);
    });
    setShareProductId(null);
  }

  function shareShop() {
    if (navigator?.share) {
      navigator.share({ title: shop?.shop_name || "Shop", text: `Browse ${shop?.shop_name} on souk.et`, url: shopUrl }).catch(() => {});
    } else { copyLink(shopUrl, "shop"); }
  }

  const nextSort = () => setSortBy(s => s === "newest" ? "price_asc" : s === "price_asc" ? "price_desc" : "newest");
  const sortLabel = sortBy === "newest" ? "Newest" : sortBy === "price_asc" ? "Price ↑" : "Price ↓";

  /* ─── Loading skeleton ──────────────────────────────── */
  if (loading) return (
    <div className="min-h-screen bg-white">
      <div className="h-44 bg-gradient-to-br from-gray-200 to-gray-100 animate-pulse" />
      <div className="max-w-2xl mx-auto px-4 -mt-6">
        <div className="grid grid-cols-2 gap-3">
          {[1,2,3,4].map(i => (
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

  /* ─── Error state ───────────────────────────────────── */
  if (error || !shop) return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gray-50 flex items-center justify-center">
          <svg className="w-10 h-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a.75.75 0 0 1 .218-.523L12 2.25l8.032 6.576a.75.75 0 0 1 .218.523" />
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-gray-900 mb-2">Shop not found</h1>
        <p className="text-gray-400 text-sm">This shop doesn&apos;t exist or has been removed.</p>
      </div>
    </div>
  );

  const itemCount = products.length;
  const itemLabel = isService ? (itemCount === 1 ? "service" : "services") : (itemCount === 1 ? "item" : "items");

  /* ─── Main render ───────────────────────────────────── */
  return (
    <div className="min-h-screen bg-gray-50/50">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800&display=swap');
        * { font-family: 'DM Sans', system-ui, sans-serif; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes scaleIn { from { opacity:0; } to { opacity:1; } }
        @keyframes slideUp { from { transform:translateY(100%); } to { transform:translateY(0); } }
        @keyframes checkPop { 0% { transform:scale(0); opacity:0; } 50% { transform:scale(1.2); } 100% { transform:scale(1); opacity:1; } }
        .card-enter { animation: fadeUp 0.4s ease-out both; }
        .modal-backdrop { animation: scaleIn 0.2s ease-out; }
        .modal-sheet { animation: slideUp 0.3s cubic-bezier(0.32,0.72,0,1); }
        .check-pop { animation: checkPop 0.4s cubic-bezier(0.34,1.56,0.64,1) 0.1s both; }
        .product-card { transition: transform 0.2s ease, box-shadow 0.2s ease; }
        .product-card:active { transform: scale(0.98); }
        @media (hover:hover) { .product-card:hover { transform:translateY(-4px); box-shadow:0 12px 24px -8px rgba(0,0,0,0.12); } }
        .line-clamp-2 { display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
        .hide-scrollbar { scrollbar-width:none; }
        .hide-scrollbar::-webkit-scrollbar { display:none; }
      `}</style>

      {/* ═══ Hero Header ═══ */}
      <header className="relative overflow-hidden" style={{ background: theme.gradient }}>
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full" style={{ background: "rgba(255,255,255,0.1)" }} />
        <div className="absolute -bottom-6 -left-6 w-28 h-28 rounded-full" style={{ background: "rgba(255,255,255,0.08)" }} />
        <div className="relative max-w-2xl mx-auto px-5 pt-10 pb-14">
          <div className="w-14 h-14 rounded-2xl overflow-hidden flex items-center justify-center mb-4"
            style={{ background: shop.logo_url ? "transparent" : "rgba(255,255,255,0.2)", backdropFilter: shop.logo_url ? undefined : "blur(8px)", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
            {shop.logo_url
              ? <img src={shop.logo_url} alt={shop.shop_name} className="w-full h-full object-cover" />
              : <span className="text-2xl font-bold text-white">{shop.shop_name.charAt(0).toUpperCase()}</span>}
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">{shop.shop_name}</h1>
          {shop.description && (
            <p className="mt-1.5 text-sm leading-relaxed max-w-md" style={{ color: "rgba(255,255,255,0.75)" }}>{shop.description}</p>
          )}
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            {shop.category && (
              <span className="inline-flex items-center text-xs px-2.5 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.9)" }}>
                {shop.category.charAt(0).toUpperCase() + shop.category.slice(1)}
              </span>
            )}
            {shop.location_text && <span className="text-xs" style={{ color: "rgba(255,255,255,0.7)" }}>📍 {shop.location_text}</span>}
            <span style={{ color: "rgba(255,255,255,0.5)" }} className="text-sm">{itemCount} {itemLabel}</span>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 40" fill="none" className="w-full block"><path d="M0 40V20Q360 0 720 0T1440 20V40Z" fill="rgb(249 250 251)" /></svg>
        </div>
      </header>

      {/* ═══ Search + Filters + About ═══ */}
      <div className="max-w-2xl mx-auto px-4 -mt-2 relative z-10">
        {(shop.description || shop.location_text || shop.phone) && (
          <details className="mb-3">
            <summary className="cursor-pointer text-xs font-medium text-gray-400 flex items-center gap-1 py-1 select-none">
              About this shop
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
            </summary>
            <div className="mt-2 p-3.5 rounded-xl text-sm space-y-1.5" style={{ background: theme.bgSoft }}>
              {shop.description && <p className="text-gray-700">{shop.description}</p>}
              {shop.location_text && <p className="text-gray-500 text-xs">📍 {shop.location_text}</p>}
              {shop.category && <p className="text-gray-500 text-xs">📂 {shop.category.charAt(0).toUpperCase() + shop.category.slice(1)}</p>}
              {shop.phone && <p className="text-gray-500 text-xs">📱 {shop.phone}</p>}
            </div>
          </details>
        )}

        {itemCount > 0 && (
          <div className="relative mb-3">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
            <input type="text" placeholder={`Search ${isService ? "services" : "products"}...`} value={searchInput}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-gray-200 bg-white focus:outline-none transition-shadow text-gray-900 placeholder:text-gray-300"
              style={{ boxShadow: searchInput ? `0 0 0 2px ${theme.ring}` : undefined }} />
            {searchQuery && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">{filteredProducts.length} found</span>}
          </div>
        )}

        {(availableTags.length > 0 || itemCount > 2) && (
          <div className="flex items-center gap-2 mb-3">
            {availableTags.length > 0 && (
              <div className="flex-1 flex gap-1.5 overflow-x-auto hide-scrollbar -mx-1 px-1 py-0.5">
                <button onClick={() => setActiveTag(null)} className="shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                  style={{ background: activeTag === null ? theme.primary : theme.bgSoft, color: activeTag === null ? "white" : "#6B7280" }}>
                  All
                </button>
                {availableTags.map(tag => (
                  <button key={tag} onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                    className="shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                    style={{ background: activeTag === tag ? theme.primary : theme.bgSoft, color: activeTag === tag ? "white" : "#6B7280" }}>
                    {TAG_LABELS[tag] || tag.charAt(0).toUpperCase() + tag.slice(1)}
                  </button>
                ))}
              </div>
            )}
            {itemCount > 2 && (
              <button onClick={nextSort}
                className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border transition-all"
                style={{ borderColor: sortBy !== "newest" ? theme.primary : "#E5E7EB", color: sortBy !== "newest" ? theme.primary : "#9CA3AF" }}>
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h6M3 12h10M3 17h4m8-12v14m0 0-3-3m3 3 3-3" />
                </svg>
                {sortLabel}
              </button>
            )}
          </div>
        )}
      </div>

      {/* ═══ Products Grid ═══ */}
      <main className="max-w-2xl mx-auto px-4 pb-24 relative z-10">
        {itemCount === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 mx-auto mb-5 rounded-full flex items-center justify-center" style={{ background: theme.bgSoft }}>
              <svg className="w-10 h-10" style={{ color: theme.primary }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">No {isService ? "services" : "products"} yet</h2>
            <p className="text-gray-400 text-sm">Check back soon!</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-400 text-sm">No results found</p>
            <button onClick={() => { handleSearch(""); setActiveTag(null); }} className="mt-2 text-xs font-medium" style={{ color: theme.primary }}>Clear filters</button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {filteredProducts.map((p, idx) => {
              const priceDisplay = fmtPrice(p.price, p.price_type);
              const isContactPrice = p.price_type === "contact" || p.price === null;
              const isSoldOut = p.stock === 0;
              return (
                <div key={p.id} className="product-card bg-white rounded-2xl overflow-hidden card-enter"
                  style={{ animationDelay: `${idx * 0.06}s`, boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)" }}>
                  <div className="relative aspect-square bg-gray-50 overflow-hidden cursor-pointer" onClick={() => setSelectedProduct(p)}>
                    {p.photo_url ? (
                      <img src={p.photo_url} alt={p.name} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center" style={{ background: theme.gradientCard }}>
                        <svg className="w-12 h-12 opacity-30" style={{ color: theme.primary }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21z" />
                        </svg>
                      </div>
                    )}
                    {isSoldOut && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <span className="text-white font-bold text-xs bg-black/60 px-3 py-1 rounded-full">Sold out</span>
                      </div>
                    )}
                    {!isSoldOut && p.stock !== null && p.stock > 0 && p.stock <= 5 && (
                      <div className="absolute top-2 right-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "#FEF3C7", color: "#92400E" }}>
                        {p.stock} left
                      </div>
                    )}
                    <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded-lg text-xs font-bold text-white"
                      style={{ background: isContactPrice ? "#374151" : theme.primary, boxShadow: "0 2px 8px rgba(0,0,0,0.2)" }}>
                      {priceDisplay}
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); shareProduct(p); }}
                      className="absolute top-2 left-2 w-7 h-7 rounded-full flex items-center justify-center transition-all"
                      style={{ background: "rgba(255,255,255,0.85)", backdropFilter: "blur(4px)" }}>
                      <svg className="w-3.5 h-3.5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z" />
                      </svg>
                    </button>
                    {shareProductId === p.id && (
                      <div className="absolute top-10 left-2 bg-white rounded-xl shadow-lg p-2 z-20 flex flex-col gap-1 min-w-[140px]" onClick={(e) => e.stopPropagation()}>
                        <a href={`https://wa.me/?text=${encodeURIComponent(`${p.name}${p.price ? ` - ${p.price.toLocaleString()} Birr` : ""} at ${shop.shop_name} ${shopUrl}?p=${p.id}`)}`}
                          target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50">
                          <span className="text-base">💬</span> WhatsApp
                        </a>
                        <button onClick={() => copyLink(`${shopUrl}?p=${p.id}`, p.id)}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 text-left">
                          <span className="text-base">📋</span> {copiedId === p.id ? "Copied!" : "Copy Link"}
                        </button>
                      </div>
                    )}
                    {p.tag && (
                      <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded text-[10px] font-medium"
                        style={{ background: "rgba(255,255,255,0.85)", color: "#374151", backdropFilter: "blur(4px)" }}>
                        {TAG_LABELS[p.tag] || p.tag}
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <h2 className="font-semibold text-gray-900 text-sm leading-tight line-clamp-2 cursor-pointer" onClick={() => setSelectedProduct(p)}>{p.name}</h2>
                    {p.description && <p className="text-gray-400 text-xs mt-1 line-clamp-2 leading-relaxed">{p.description}</p>}
                    <button onClick={() => isSoldOut ? null : openInquiry(p)} disabled={isSoldOut}
                      className="w-full mt-3 py-2 rounded-xl text-white text-sm font-semibold transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{ background: isSoldOut ? "#D1D5DB" : theme.primary }}
                      onMouseEnter={(e) => { if (!isSoldOut) e.currentTarget.style.background = theme.primaryDark; }}
                      onMouseLeave={(e) => { if (!isSoldOut) e.currentTarget.style.background = theme.primary; }}>
                      {isSoldOut ? "Sold Out" : isContactPrice ? "Inquire" : (isService ? "Book Now" : "Buy Now")}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ═══ Sticky Action Bar ═══ */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 border-t border-gray-100"
        style={{ backdropFilter: "blur(12px)", paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="max-w-2xl mx-auto px-4 py-2.5 flex items-center gap-2 relative">
          {shop.telegram_username && (
            <a href={`https://t.me/${shop.telegram_username}`} target="_blank" rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-sm font-semibold transition-all active:scale-95"
              style={{ background: theme.primary }}>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.12.03-1.99 1.27-5.62 3.72-.53.36-1.01.54-1.44.53-.47-.01-1.38-.27-2.06-.49-.83-.27-1.49-.42-1.43-.88.03-.24.37-.49 1.02-.74 3.98-1.73 6.64-2.88 7.97-3.44 3.8-1.58 4.59-1.86 5.1-1.87.11 0 .37.03.53.17.14.12.18.28.2.46-.01.06.01.24 0 .37z"/>
              </svg>
              Chat
            </a>
          )}
          {shop.phone && (
            <a href={`tel:${shop.phone}`}
              className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all active:scale-95"
              style={{ borderColor: theme.primary, color: theme.primary }}>
              📞 Call
            </a>
          )}
          <button onClick={shareShop}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium border border-gray-200 text-gray-500 transition-all active:scale-95">
            📤 Share
          </button>
          {copiedId === "shop" && (
            <span className="absolute -top-8 right-4 text-xs font-medium px-2 py-1 rounded-lg bg-gray-900 text-white">Link copied!</span>
          )}
        </div>
      </div>

      {/* ═══ Footer ═══ */}
      <footer className="text-center pb-24 pt-6">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 text-xs text-gray-300">
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
            Powered by souk.et
          </div>
          <div>
            <a href="https://t.me/SoukEtBot" target="_blank" rel="noopener noreferrer"
              className="text-xs font-medium transition-colors" style={{ color: theme.accent }}>
              Create your own shop — free →
            </a>
          </div>
        </div>
      </footer>

      {/* ═══ Product Detail Modal ═══ */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedProduct(null); }}>
          <div className="absolute inset-0 modal-backdrop" style={{ background: "rgba(0,0,0,0.5)" }} />
          <div className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl modal-sheet sm:mx-4 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-center pt-3 sm:hidden"><div className="w-10 h-1 rounded-full bg-gray-200" /></div>
            <button onClick={() => setSelectedProduct(null)}
              className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-black/20 flex items-center justify-center text-white hover:bg-black/40 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
            {selectedProduct.photo_url && (
              <div className="w-full aspect-[4/3] overflow-hidden rounded-t-3xl">
                <img src={selectedProduct.photo_url} alt={selectedProduct.name} className="w-full h-full object-cover" />
              </div>
            )}
            <div className="p-5">
              <div className="flex items-center gap-2 mb-2">
                {selectedProduct.tag && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: theme.bgSoft, color: theme.primary }}>
                    {TAG_LABELS[selectedProduct.tag] || selectedProduct.tag}
                  </span>
                )}
                {selectedProduct.stock === 0 && <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-500">Sold out</span>}
                {selectedProduct.stock !== null && selectedProduct.stock > 0 && selectedProduct.stock <= 5 && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "#FEF3C7", color: "#92400E" }}>{selectedProduct.stock} left</span>
                )}
              </div>
              <h2 className="text-xl font-bold text-gray-900">{selectedProduct.name}</h2>
              <p className="text-lg font-bold mt-1" style={{ color: theme.primary }}>{fmtPriceLong(selectedProduct.price, selectedProduct.price_type)}</p>
              {selectedProduct.description && <p className="text-sm text-gray-500 mt-3 leading-relaxed">{selectedProduct.description}</p>}
              <button onClick={() => selectedProduct.stock !== 0 ? openInquiry(selectedProduct) : null}
                disabled={selectedProduct.stock === 0}
                className="w-full mt-5 py-3.5 rounded-xl text-white text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: selectedProduct.stock === 0 ? "#D1D5DB" : theme.primary }}>
                {selectedProduct.stock === 0 ? "Sold Out" : (selectedProduct.price_type === "contact" ? "Send Inquiry" : isService ? "Book Now" : "Buy Now")}
              </button>
              <div className="flex items-center gap-3 mt-4 justify-center">
                <a href={`https://wa.me/?text=${encodeURIComponent(`${selectedProduct.name}${selectedProduct.price ? ` - ${selectedProduct.price.toLocaleString()} Birr` : ""} at ${shop.shop_name} ${shopUrl}?p=${selectedProduct.id}`)}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-gray-500 hover:bg-gray-50 border border-gray-100">
                  💬 WhatsApp
                </a>
                <button onClick={() => copyLink(`${shopUrl}?p=${selectedProduct.id}`, `detail-${selectedProduct.id}`)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-gray-500 hover:bg-gray-50 border border-gray-100">
                  📋 {copiedId === `detail-${selectedProduct.id}` ? "Copied!" : "Copy Link"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Inquiry Modal ═══ */}
      {inquiryForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          onClick={(e) => { if (e.target === e.currentTarget) setInquiryForm(null); }}>
          <div className="absolute inset-0 modal-backdrop" style={{ background: "rgba(0,0,0,0.4)" }} />
          <div className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl modal-sheet sm:mx-4">
            <div className="flex justify-center pt-3 sm:hidden"><div className="w-10 h-1 rounded-full bg-gray-200" /></div>
            {submitSuccess ? (
              <div className="p-8 text-center">
                <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 check-pop" style={{ background: theme.bgSoft }}>
                  <svg className="w-8 h-8" style={{ color: theme.primary }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Inquiry sent!</h3>
                <p className="text-gray-400 text-sm mt-1">The seller will be notified on Telegram.</p>
              </div>
            ) : (
              <div className="p-6">
                <div className="flex items-start justify-between mb-5">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {inquiryForm.priceType === "contact" ? "Get a Quote" : (isService ? "Book Service" : "Buy Item")}
                    </h3>
                    <p className="text-sm text-gray-400 mt-0.5">
                      {inquiryForm.productName}
                      <span className="ml-2 font-semibold" style={{ color: theme.primary }}>{fmtPriceLong(inquiryForm.price, inquiryForm.priceType)}</span>
                    </p>
                  </div>
                  <button onClick={() => setInquiryForm(null)}
                    className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-gray-200 transition-colors -mt-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="space-y-3">
                  <input type="text" placeholder="Your name" value={buyerName} onChange={(e) => setBuyerName(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 focus:outline-none transition-shadow"
                    style={{ boxShadow: buyerName ? `0 0 0 2px ${theme.ring}` : undefined }}
                    onFocus={(e) => (e.currentTarget.style.boxShadow = `0 0 0 2px ${theme.ring}`)}
                    onBlur={(e) => { if (!buyerName) e.currentTarget.style.boxShadow = "none"; }}
                    autoFocus />
                  <input type="tel" placeholder="Phone number (optional)" value={buyerPhone} onChange={(e) => setBuyerPhone(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 focus:outline-none transition-shadow"
                    onFocus={(e) => (e.currentTarget.style.boxShadow = `0 0 0 2px ${theme.ring}`)}
                    onBlur={(e) => (e.currentTarget.style.boxShadow = "none")} />
                  <textarea placeholder="Message (optional)" value={buyerMessage} onChange={(e) => setBuyerMessage(e.target.value)} rows={2}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 focus:outline-none resize-none transition-shadow"
                    onFocus={(e) => (e.currentTarget.style.boxShadow = `0 0 0 2px ${theme.ring}`)}
                    onBlur={(e) => (e.currentTarget.style.boxShadow = "none")} />
                  <button onClick={submitInquiry} disabled={!buyerName.trim() || submitting}
                    className="w-full py-3.5 rounded-xl text-white text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ background: !buyerName.trim() || submitting ? "#D1D5DB" : theme.primary }}
                    onMouseEnter={(e) => { if (buyerName.trim() && !submitting) e.currentTarget.style.background = theme.primaryDark; }}
                    onMouseLeave={(e) => { if (buyerName.trim() && !submitting) e.currentTarget.style.background = theme.primary; }}>
                    {submitting ? (
                      <span className="inline-flex items-center gap-2">
                        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Sending...
                      </span>
                    ) : (inquiryForm.priceType === "contact" ? "Send Inquiry" : (isService ? "Send Inquiry" : "Send Order"))}
                  </button>
                </div>
                {shop.telegram_username && (
                  <p className="text-center text-xs text-gray-300 mt-4">
                    Or message directly on{" "}
                    <a href={`https://t.me/${shop.telegram_username}`} target="_blank" rel="noopener noreferrer"
                      className="underline" style={{ color: theme.primary }}>Telegram</a>
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
