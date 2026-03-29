"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { getStrings, fmtPrice as fmtPriceI18n, type ShopStrings } from "@/lib/i18n";

const ProductForm = dynamic(() => import("./admin/product-form"), { ssr: false });
const ShopSettings = dynamic(() => import("./admin/shop-settings"), { ssr: false });

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
  tiktok_url: string | null;
  extra_photos: string[] | null;
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
  language: string | null;
  tiktok_url: string | null;
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

/* ─── Image proxy helper ─────────────────────────────────── */

function imgUrl(fileId: string | null, fallbackUrl: string | null): string | null {
  if (fileId) return `/api/img/${fileId}`;
  return fallbackUrl;
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

function fmtPrice(price: number | null, pt: string | null, t: ShopStrings): string {
  return fmtPriceI18n(price, pt, t);
}

/* ─── Component ─────────────────────────────────────────── */

export default function ShopPage() {
  const params = useParams();
  const slug = params.shop as string;

  const [shop, setShop] = useState<Shop | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [crossSell, setCrossSell] = useState<{ id: string; name: string; price: number | null; price_type: string | null; photo_url: string | null; photo_file_id: string | null; stock: number | null; tag: string | null; shop_name: string; shop_slug: string }[]>([]);
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

  // Logo fallback
  const [logoFailed, setLogoFailed] = useState(false);

  // Admin state
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminShopId, setAdminShopId] = useState<string | null>(null);
  const [adminLoading, setAdminLoading] = useState(true);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showShopSettings, setShowShopSettings] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginNonce, setLoginNonce] = useState<string | null>(null);
  const [loginBotUrl, setLoginBotUrl] = useState<string | null>(null);
  const [loginPolling, setLoginPolling] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [tiktokVideoUrl, setTiktokVideoUrl] = useState<string | null>(null);
  const [tiktokEmbed, setTiktokEmbed] = useState<string | null>(null);
  const router = useRouter();

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
  const t = useMemo(() => getStrings(shop?.language), [shop?.language]);

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
        if (data.crossSell) setCrossSell(data.crossSell);
      } catch { setError("Failed to load shop"); }
      finally { setLoading(false); }
    }
    load();
  }, [slug]);

  // Load TikTok embed script when embed HTML is set
  useEffect(() => {
    if (!tiktokEmbed) return;
    const existing = document.querySelector('script[src*="tiktok.com/embed"]');
    if (existing) { existing.remove(); }
    const script = document.createElement("script");
    script.src = "https://www.tiktok.com/embed.js";
    script.async = true;
    document.body.appendChild(script);
    return () => { script.remove(); };
  }, [tiktokEmbed]);

  // Check admin session
  useEffect(() => {
    fetch("/api/auth/session")
      .then(r => r.json())
      .then(data => {
        if (data.authenticated && data.shopSlug === slug) {
          setIsAdmin(true);
          setAdminShopId(data.shopId);
        }
      })
      .catch(() => {})
      .finally(() => setAdminLoading(false));
  }, [slug]);

  async function adminLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setIsAdmin(false);
    setAdminShopId(null);
  }

  async function adminRefresh() {
    // Reload shop + products after admin action
    const res = await fetch(`/api/shop/${slug}`);
    if (res.ok) {
      const data = await res.json();
      setShop(data.shop);
      setProducts(data.products);
    }
    setEditProduct(null);
    setShowAddProduct(false);
    setShowShopSettings(false);
  }

  async function startWebLogin() {
    setShowLoginModal(true);
    try {
      const res = await fetch("/api/auth/web-login", { method: "POST" });
      const data = await res.json();
      if (data.nonce && data.botUrl) {
        setLoginNonce(data.nonce);
        setLoginBotUrl(data.botUrl);
        setLoginPolling(true);
      }
    } catch {
      setShowLoginModal(false);
    }
  }

  // Poll for login confirmation
  useEffect(() => {
    if (!loginPolling || !loginNonce) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/auth/check-login?nonce=${loginNonce}`);
        const data = await res.json();
        if (data.status === "ok") {
          setLoginPolling(false);
          setShowLoginModal(false);
          setLoginNonce(null);
          setIsAdmin(true);
          // Reload to get admin data
          const shopRes = await fetch(`/api/shop/${slug}`);
          if (shopRes.ok) {
            const shopData = await shopRes.json();
            setShop(shopData.shop);
            setProducts(shopData.products);
          }
          // Re-check session for adminShopId
          const sessRes = await fetch("/api/auth/session");
          const sessData = await sessRes.json();
          if (sessData.authenticated) setAdminShopId(sessData.shopId);
        }
      } catch { /* keep polling */ }
    }, 2000);
    return () => clearInterval(interval);
  }, [loginPolling, loginNonce, slug]);

  async function adminDeleteProduct(productId: string) {
    if (!confirm(t.deleteConfirm)) return;
    await fetch(`/api/admin/products/${productId}`, { method: "DELETE" });
    adminRefresh();
  }

  async function toggleStock(productId: string, newStock: number | null) {
    // Optimistic update
    setProducts(prev => prev.map(p =>
      p.id === productId ? { ...p, stock: newStock } : p
    ));
    try {
      const res = await fetch(`/api/admin/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stock: newStock }),
      });
      if (!res.ok) adminRefresh();
    } catch { adminRefresh(); }
  }

  async function submitFeedback() {
    if (!feedbackText.trim()) return;
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: feedbackText.trim() }),
      });
      setFeedbackSent(true);
      setTimeout(() => {
        setShowFeedbackModal(false);
        setFeedbackSent(false);
        setFeedbackText("");
      }, 2000);
    } catch { /* silent */ }
  }

  async function submitInquiry() {
    if (!inquiryForm || !buyerName.trim() || !buyerPhone.trim()) return;
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
    const url = `${shopUrl}/${p.id}`;
    const text = `${p.name}${p.price ? ` — ${p.price.toLocaleString()} Birr` : ""} at ${shop?.shop_name} on souk.et`;
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

  function tiktokHandle(url: string): string {
    const m = url.match(/tiktok\.com\/@([^/?]+)/);
    return m ? `@${m[1]}` : "TikTok";
  }

  async function openTiktokVideo(url: string) {
    setTiktokVideoUrl(url);
    setTiktokEmbed(null);
    try {
      const res = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`);
      if (res.ok) {
        const data = await res.json();
        setTiktokEmbed(data.html);
      }
    } catch { /* fallback to link */ }
  }

  function copyForTiktok(p: Product) {
    const text = `${p.name}${p.price ? ` - ${p.price.toLocaleString()} Birr` : ""}\n${shopUrl}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(p.id + "_tt"); setTimeout(() => setCopiedId(null), 1500);
    });
    setShareProductId(null);
  }

  const nextSort = () => setSortBy(s => s === "newest" ? "price_asc" : s === "price_asc" ? "price_desc" : "newest");
  const sortLabel = sortBy === "newest" ? t.newest : sortBy === "price_asc" ? t.priceAsc : t.priceDesc;

  /* ─── Loading skeleton ──────────────────────────────── */
  if (loading) return (
    <div className="min-h-screen bg-white">
      <div className="h-40 animate-pulse" style={{ background: "linear-gradient(135deg, #e5e7eb, #f3f4f6)" }} />
      <div className="max-w-2xl mx-auto px-4 pt-4">
        <div className="grid grid-cols-3 gap-2">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="rounded-xl overflow-hidden animate-pulse">
              <div className="aspect-square bg-gray-100" />
              <div className="pt-1.5 pb-1 px-2 space-y-1.5">
                <div className="h-3 bg-gray-100 rounded w-3/4" />
                <div className="h-7 bg-gray-100 rounded-lg" />
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
        <h1 className="text-xl font-semibold text-gray-900 mb-2">{t.shopNotFound}</h1>
        <p className="text-gray-400 text-sm">{t.shopNotFoundDesc}</p>
      </div>
    </div>
  );

  const itemCount = products.length;
  const itemLabel = isService ? (itemCount === 1 ? t.service : t.services) : (itemCount === 1 ? t.item : t.items);
  const logoSrc = imgUrl(shop.logo_file_id, shop.logo_url);
  const showLogo = logoSrc && !logoFailed;

  /* ─── Main render ───────────────────────────────────── */
  return (
    <div className="min-h-screen bg-white">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=Noto+Sans+Ethiopic:wght@400;500;600;700&display=swap');
        * { font-family: 'DM Sans', 'Noto Sans Ethiopic', system-ui, sans-serif; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes scaleIn { from { opacity:0; } to { opacity:1; } }
        @keyframes slideUp { from { transform:translateY(100%); } to { transform:translateY(0); } }
        @keyframes checkPop { 0% { transform:scale(0); opacity:0; } 50% { transform:scale(1.2); } 100% { transform:scale(1); opacity:1; } }
        .card-enter { animation: fadeUp 0.4s ease-out both; }
        .modal-backdrop { animation: scaleIn 0.2s ease-out; }
        .modal-sheet { animation: slideUp 0.3s cubic-bezier(0.32,0.72,0,1); }
        .check-pop { animation: checkPop 0.4s cubic-bezier(0.34,1.56,0.64,1) 0.1s both; }
        .product-card { transition: transform 0.15s ease, box-shadow 0.15s ease; }
        .product-card:active { transform: scale(0.97); }
        @media (hover:hover) { .product-card:hover { transform:translateY(-3px); box-shadow:0 12px 28px -8px rgba(0,0,0,0.18); } }
        .line-clamp-2 { display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
        .line-clamp-1 { display:-webkit-box; -webkit-line-clamp:1; -webkit-box-orient:vertical; overflow:hidden; }
        .hide-scrollbar { scrollbar-width:none; }
        .hide-scrollbar::-webkit-scrollbar { display:none; }
      `}</style>

      {/* ═══ Header ═══ */}
      <header className="relative overflow-hidden" style={{ background: theme.primary }}>
        <div className="max-w-2xl mx-auto px-5 pt-4 pb-6">
          {/* Top row: back + share */}
          <div className="flex items-center justify-between mb-5">
            <Link href="/" className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: "rgba(255,255,255,0.7)", textDecoration: "none" }}>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
              souk.et
            </Link>
            <div className="flex items-center gap-2">
              {!isAdmin && !adminLoading && (
                <button onClick={startWebLogin}
                  className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-full transition-all active:scale-95"
                  style={{ background: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.9)" }}>
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0" />
                  </svg>
                  {t.login}
                </button>
              )}
              <button onClick={shareShop}
                className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-full transition-all active:scale-95"
                style={{ background: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.9)" }}>
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z" />
                </svg>
                {t.share}
              </button>
            </div>
          </div>

          {/* Shop info */}
          <div className="flex items-center gap-4">
            {/* Logo */}
            <div className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center"
              style={{ background: showLogo ? "white" : "rgba(255,255,255,0.2)", boxShadow: "0 2px 12px rgba(0,0,0,0.15)" }}>
              {showLogo ? (
                <img src={logoSrc!} alt={shop.shop_name} className="w-full h-full object-cover"
                  onError={() => setLogoFailed(true)} />
              ) : (
                <span className="text-2xl font-bold text-white">{shop.shop_name.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-bold text-white tracking-tight leading-tight truncate">{shop.shop_name}</h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {shop.category && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.9)" }}>
                    {shop.category.charAt(0).toUpperCase() + shop.category.slice(1)}
                  </span>
                )}
                {shop.location_text && <span className="text-xs" style={{ color: "rgba(255,255,255,0.7)" }}>📍 {shop.location_text}</span>}
                <span className="text-xs" style={{ color: "rgba(255,255,255,0.55)" }}>{itemCount} {itemLabel}</span>
              </div>
              {shop.description && (
                <p className="text-xs mt-1.5 leading-relaxed line-clamp-2" style={{ color: "rgba(255,255,255,0.65)" }}>{shop.description}</p>
              )}
            </div>
          </div>
        </div>

        {copiedId === "shop" && (
          <span className="absolute top-3 right-20 text-xs font-medium px-2.5 py-1 rounded-lg bg-white text-gray-900 shadow-md"
            style={{ animation: "fadeUp 0.2s ease-out" }}>
            {t.linkCopied}
          </span>
        )}
      </header>

      {/* ═══ Admin Toolbar ═══ */}
      {isAdmin && !adminLoading && (
        <div className="max-w-2xl mx-auto px-4 pt-3 pb-1">
          <div className="flex items-center gap-2 p-2.5 rounded-xl" style={{ background: theme.bgSoft }}>
            <span className="text-xs font-semibold flex-1" style={{ color: theme.primary }}>
              ✏️ {t.adminMode}
            </span>
            <button onClick={() => setShowAddProduct(true)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all active:scale-95"
              style={{ background: theme.primary }}>
              {t.add}
            </button>
            <button onClick={() => setShowShopSettings(true)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all active:scale-95"
              style={{ borderColor: theme.primary, color: theme.primary }}>
              {t.settings}
            </button>
            <button onClick={() => setShowFeedbackModal(true)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all active:scale-95"
              style={{ borderColor: "#F59E0B", color: "#F59E0B" }}>
              {t.feedback}
            </button>
            <button onClick={adminLogout}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-400 border border-gray-200 transition-all active:scale-95">
              {t.logout}
            </button>
          </div>
        </div>
      )}

      {/* ═══ TikTok Banner ═══ */}
      {shop.tiktok_url && (
        <div className="max-w-2xl mx-auto px-4 pt-3">
          <a href={shop.tiktok_url} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl transition-all active:scale-[0.98]"
            style={{ background: theme.bgSoft, textDecoration: "none" }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#000" }}>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="white">
                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15.2a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.86a8.28 8.28 0 0 0 4.76 1.51v-3.45a4.85 4.85 0 0 1-1-.23z"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-900 truncate">{tiktokHandle(shop.tiktok_url)}</p>
              <p className="text-[10px] text-gray-400">{t.followOnTiktok}</p>
            </div>
            <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
            </svg>
          </a>
        </div>
      )}

      {/* ═══ Search + Filters ═══ */}
      <div className="max-w-2xl mx-auto px-4 pt-4 pb-1">
        {itemCount > 0 && (
          <div className="relative mb-3">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
            <input type="text" placeholder={isService ? t.searchServices : t.searchProducts} value={searchInput}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border bg-white focus:outline-none transition-shadow text-gray-900 placeholder:text-gray-300"
              style={{ borderColor: searchInput ? theme.ring : "#E5E7EB", boxShadow: searchInput ? `0 0 0 2px ${theme.ring}` : "0 1px 2px rgba(0,0,0,0.04)" }} />
            {searchQuery && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">{filteredProducts.length} {t.found}</span>}
          </div>
        )}

        {(availableTags.length > 0 || itemCount > 2) && (
          <div className="flex items-center gap-2 mb-3">
            {availableTags.length > 0 && (
              <div className="flex-1 flex gap-1.5 overflow-x-auto hide-scrollbar -mx-1 px-1 py-0.5">
                <button onClick={() => setActiveTag(null)} className="shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                  style={{ background: activeTag === null ? theme.primary : "transparent", color: activeTag === null ? "white" : "#9CA3AF", border: activeTag === null ? "none" : "1px solid #E5E7EB" }}>
                  {t.all}
                </button>
                {availableTags.map(tag => (
                  <button key={tag} onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                    className="shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                    style={{ background: activeTag === tag ? theme.primary : "transparent", color: activeTag === tag ? "white" : "#9CA3AF", border: activeTag === tag ? "none" : "1px solid #E5E7EB" }}>
                    {TAG_LABELS[tag] || tag.charAt(0).toUpperCase() + tag.slice(1)}
                  </button>
                ))}
              </div>
            )}
            {itemCount > 2 && (
              <button onClick={nextSort}
                className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all"
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
      <main className="max-w-2xl mx-auto px-4 pb-28">
        {itemCount === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 mx-auto mb-5 rounded-full flex items-center justify-center" style={{ background: theme.bgSoft }}>
              <svg className="w-10 h-10" style={{ color: theme.primary }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">{isService ? t.noServicesYet : t.noProductsYet}</h2>
            <p className="text-gray-400 text-sm">{t.checkBackSoon}</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-400 text-sm">{t.noResults}</p>
            <button onClick={() => { handleSearch(""); setActiveTag(null); }} className="mt-2 text-xs font-medium" style={{ color: theme.primary }}>{t.clearFilters}</button>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {filteredProducts.map((p, idx) => {
              const priceDisplay = fmtPrice(p.price, p.price_type, t);
              const isSoldOut = p.stock === 0;
              const src = imgUrl(p.photo_file_id, p.photo_url);
              return (
                <div key={p.id} className="product-card rounded-xl overflow-hidden card-enter"
                  style={{ animationDelay: `${idx * 0.03}s`, boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>

                  {/* Photo area — compact */}
                  <div className="relative aspect-square overflow-hidden cursor-pointer" onClick={() => setSelectedProduct(p)}>
                    {src ? (
                      <img src={src} alt={p.name} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center" style={{ background: theme.gradientCard }}>
                        <svg className="w-8 h-8 opacity-30" style={{ color: theme.primary }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21z" />
                        </svg>
                      </div>
                    )}

                    {/* Dark gradient overlay on photo bottom */}
                    {src && (
                      <div className="absolute inset-0"
                        style={{ background: "linear-gradient(to top, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.15) 40%, transparent 60%)" }} />
                    )}

                    {/* Sold out overlay */}
                    {isSoldOut && (
                      <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }}>
                        <span className="text-white font-bold text-xs px-3 py-1 rounded-full" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}>{t.soldOut}</span>
                      </div>
                    )}

                    {/* Low stock badge */}
                    {!isSoldOut && p.stock !== null && p.stock > 0 && p.stock <= 5 && (
                      <div className="absolute top-1 right-1 text-[8px] font-bold px-1 py-0.5 rounded-full" style={{ background: "#FEF3C7", color: "#92400E" }}>
                        {p.stock} {t.left}
                      </div>
                    )}

                    {/* TikTok video badge */}
                    {p.tiktok_url && (
                      <button onClick={(e) => { e.stopPropagation(); openTiktokVideo(p.tiktok_url!); }}
                        className="absolute bottom-1 right-1 w-6 h-6 rounded-full flex items-center justify-center z-10 transition-all active:scale-90"
                        style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
                        title={t.watchVideo}>
                        <svg className="w-3 h-3 text-white ml-0.5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M8 5v14l11-7z"/>
                        </svg>
                      </button>
                    )}

                    {/* Share button */}
                    {!isAdmin && (
                    <button onClick={(e) => { e.stopPropagation(); shareProduct(p); }}
                      className="absolute top-1 left-1 w-6 h-6 rounded-full flex items-center justify-center transition-all"
                      style={{ background: "rgba(255,255,255,0.85)", backdropFilter: "blur(4px)" }}>
                      <svg className="w-3 h-3 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z" />
                      </svg>
                    </button>
                    )}

                    {/* Admin edit/delete buttons */}
                    {isAdmin && (
                      <div className="absolute top-1 left-1 flex gap-1" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => setEditProduct(p)}
                          className="w-6 h-6 rounded-full flex items-center justify-center"
                          style={{ background: "rgba(255,255,255,0.9)", backdropFilter: "blur(4px)" }}>
                          <svg className="w-3 h-3 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" />
                          </svg>
                        </button>
                        <button onClick={() => adminDeleteProduct(p.id)}
                          className="w-6 h-6 rounded-full flex items-center justify-center"
                          style={{ background: "rgba(239,68,68,0.9)" }}>
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                          </svg>
                        </button>
                      </div>
                    )}

                    {/* Share dropdown */}
                    {shareProductId === p.id && (
                      <div className="absolute top-8 left-1 bg-white rounded-lg shadow-lg p-1.5 z-20 flex flex-col gap-0.5 min-w-[120px]" onClick={(e) => e.stopPropagation()}>
                        <a href={`https://wa.me/?text=${encodeURIComponent(`${p.name}${p.price ? ` - ${p.price.toLocaleString()} Birr` : ""} at ${shop.shop_name} ${shopUrl}/${p.id}`)}`}
                          target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[10px] font-medium text-gray-700 hover:bg-gray-50">
                          <span className="text-xs">💬</span> WhatsApp
                        </a>
                        <button onClick={() => copyLink(`${shopUrl}/${p.id}`, p.id)}
                          className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[10px] font-medium text-gray-700 hover:bg-gray-50 text-left">
                          <span className="text-xs">📋</span> {copiedId === p.id ? t.copied : t.copyLink}
                        </button>
                        <button onClick={() => copyForTiktok(p)}
                          className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[10px] font-medium text-gray-700 hover:bg-gray-50 text-left">
                          <span className="text-xs">🎬</span> {copiedId === p.id + "_tt" ? t.copied : t.shareForTiktok}
                        </button>
                      </div>
                    )}

                    {/* Product name + price on gradient */}
                    {src && (
                      <div className="absolute bottom-0 left-0 right-0 px-2 pb-1.5 pt-4">
                        <p className="text-white font-bold text-[11px] leading-tight line-clamp-1 drop-shadow-sm">{p.name}</p>
                        <p className="text-white font-bold text-[10px] mt-0.5" style={{ textShadow: "0 1px 3px rgba(0,0,0,0.3)" }}>{priceDisplay}</p>
                      </div>
                    )}

                    {/* Tag */}
                    {p.tag && !src && (
                      <div className="absolute bottom-1 right-1 px-1 py-0.5 rounded text-[8px] font-medium"
                        style={{ background: "rgba(255,255,255,0.85)", color: "#374151" }}>
                        {TAG_LABELS[p.tag] || p.tag}
                      </div>
                    )}
                  </div>

                  {/* Info below photo */}
                  <div className="px-2 pt-1.5 pb-2" style={{ background: "white" }}>
                    {!src && (
                      <>
                        <h2 className="font-semibold text-gray-900 text-[11px] leading-tight line-clamp-1">{p.name}</h2>
                        <p className="text-[10px] font-bold mt-0.5" style={{ color: theme.primary }}>{priceDisplay}</p>
                      </>
                    )}
                    {isAdmin ? (
                      <button onClick={() => toggleStock(p.id, isSoldOut ? null : 0)}
                        className="w-full mt-1 py-1.5 rounded-lg text-white text-[10px] font-semibold transition-all active:scale-95"
                        style={{ background: isSoldOut ? "#22C55E" : "#EF4444" }}>
                        {isSoldOut ? t.restock : t.markSoldOut}
                      </button>
                    ) : (
                      <button onClick={() => isSoldOut ? null : setSelectedProduct(p)} disabled={isSoldOut}
                        className="w-full mt-1 py-1.5 rounded-lg text-white text-[10px] font-semibold transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{ background: isSoldOut ? "#D1D5DB" : theme.primary }}
                        onMouseEnter={(e) => { if (!isSoldOut) e.currentTarget.style.background = theme.primaryDark; }}
                        onMouseLeave={(e) => { if (!isSoldOut) e.currentTarget.style.background = theme.primary; }}>
                        {isSoldOut ? t.soldOut : (p.price_type === "contact" ? t.inquire : (isService ? t.book : t.buy))}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ═══ More on souk.et (cross-sell) ═══ */}
        {crossSell.length > 0 && (
          <div className="mt-8 pt-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-gray-900">{t.moreOnSouk}</h2>
              {shop.category && (
                <Link href={`/?category=${shop.category}`} className="text-xs font-semibold" style={{ color: theme.primary, textDecoration: "none" }}>
                  {t.browseAll}
                </Link>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {crossSell.map((p) => {
                const csSrc = imgUrl(p.photo_file_id, p.photo_url);
                return (
                <Link key={p.id} href={`/${p.shop_slug}/${p.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                  <div className="product-card rounded-xl overflow-hidden" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                    <div className="relative aspect-square overflow-hidden">
                      {csSrc ? (
                        <>
                          <img src={csSrc} alt={p.name} className="w-full h-full object-cover" loading="lazy" />
                          <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 50%)" }} />
                          <div className="absolute bottom-0 left-0 right-0 px-2.5 pb-2">
                            <p className="text-white font-bold text-xs leading-tight line-clamp-1">{p.name}</p>
                            <p className="text-white text-[10px] mt-0.5 font-bold">{fmtPrice(p.price, p.price_type, t)}</p>
                          </div>
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #FFF8F3, #FFF0E6)" }}>
                          <span style={{ fontSize: "24px", opacity: 0.3 }}>📦</span>
                        </div>
                      )}
                    </div>
                    {!csSrc && (
                      <div className="p-2">
                        <p className="font-semibold text-gray-900 text-[11px] leading-tight line-clamp-1">{p.name}</p>
                        <p className="text-[10px] font-bold mt-0.5" style={{ color: theme.primary }}>{fmtPrice(p.price, p.price_type, t)}</p>
                      </div>
                    )}
                    <div className="px-2 pb-1.5">
                      <p className="text-[9px] text-gray-400">{p.shop_name}</p>
                    </div>
                  </div>
                </Link>
              );
              })}
            </div>
          </div>
        )}
      </main>

      {/* ═══ Sticky Action Bar ═══ */}
      <div className="fixed bottom-0 left-0 right-0 z-30"
        style={{ background: "rgba(255,255,255,0.92)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", borderTop: "1px solid rgba(0,0,0,0.06)", paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="max-w-2xl mx-auto px-4 py-2.5 flex items-center gap-2">
          {shop.telegram_username && (
            <a href={`https://t.me/${shop.telegram_username}`} target="_blank" rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-sm font-semibold transition-all active:scale-95"
              style={{ background: theme.primary }}>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.12.03-1.99 1.27-5.62 3.72-.53.36-1.01.54-1.44.53-.47-.01-1.38-.27-2.06-.49-.83-.27-1.49-.42-1.43-.88.03-.24.37-.49 1.02-.74 3.98-1.73 6.64-2.88 7.97-3.44 3.8-1.58 4.59-1.86 5.1-1.87.11 0 .37.03.53.17.14.12.18.28.2.46-.01.06.01.24 0 .37z"/>
              </svg>
              {t.chat}
            </a>
          )}
          {shop.phone && (
            <a href={`tel:${shop.phone}`}
              className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all active:scale-95"
              style={{ borderColor: theme.primary, color: theme.primary }}>
              📞 {t.call}
            </a>
          )}
        </div>
      </div>

      {/* ═══ Footer ═══ */}
      <footer className="text-center pb-28 pt-6 max-w-2xl mx-auto px-4">
        <p className="text-sm font-bold text-gray-900">{shop.shop_name} <span className="font-normal text-gray-400">{t.on}</span> <span style={{ color: theme.primary }}>souk.et</span></p>
        <div className="flex items-center justify-center gap-4 mt-2">
          <Link href="/" className="text-xs text-gray-400 font-medium" style={{ textDecoration: "none" }}>
            {t.browseMoreShops}
          </Link>
        </div>
        <a href="https://t.me/SoukEtBot" target="_blank" rel="noopener noreferrer"
          className="inline-block text-xs font-medium mt-2 transition-colors" style={{ color: theme.accent }}>
          {t.createShopFree}
        </a>
      </footer>

      {/* ═══ Product Detail Modal ═══ */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedProduct(null); }}>
          <div className="absolute inset-0 modal-backdrop" style={{ background: "rgba(0,0,0,0.5)" }} />
          <div className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl modal-sheet sm:mx-4 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-center pt-3 sm:hidden"><div className="w-10 h-1 rounded-full bg-gray-200" /></div>
            <button onClick={() => setSelectedProduct(null)}
              className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full flex items-center justify-center text-white transition-colors"
              style={{ background: "rgba(0,0,0,0.3)", backdropFilter: "blur(4px)" }}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
            {imgUrl(selectedProduct.photo_file_id, selectedProduct.photo_url) && (() => {
              const allPhotos = [
                imgUrl(selectedProduct.photo_file_id, selectedProduct.photo_url)!,
                ...(selectedProduct.extra_photos || []).map(fid => `/api/img/${fid}`),
              ];
              return (
                <div className="w-full aspect-[4/3] overflow-hidden rounded-t-3xl relative">
                  <div className="w-full h-full flex overflow-x-auto snap-x snap-mandatory hide-scrollbar">
                    {allPhotos.map((src, i) => (
                      <img key={i} src={src} alt={`${selectedProduct.name} ${i + 1}`} className="w-full h-full object-cover flex-shrink-0 snap-center" />
                    ))}
                  </div>
                  <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.4) 0%, transparent 40%)" }} />
                  {allPhotos.length > 1 && (
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                      {allPhotos.map((_, i) => (
                        <div key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: i === 0 ? "white" : "rgba(255,255,255,0.4)" }} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
            <div className="p-5">
              <div className="flex items-center gap-2 mb-2">
                {selectedProduct.tag && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: theme.bgSoft, color: theme.primary }}>
                    {TAG_LABELS[selectedProduct.tag] || selectedProduct.tag}
                  </span>
                )}
                {selectedProduct.stock === 0 && <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-500">{t.soldOut}</span>}
                {selectedProduct.stock !== null && selectedProduct.stock > 0 && selectedProduct.stock <= 5 && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "#FEF3C7", color: "#92400E" }}>{selectedProduct.stock} {t.left}</span>
                )}
              </div>
              <h2 className="text-xl font-bold text-gray-900">{selectedProduct.name}</h2>
              <p className="text-lg font-bold mt-1" style={{ color: theme.primary }}>{fmtPrice(selectedProduct.price, selectedProduct.price_type, t)}</p>
              {selectedProduct.description && <p className="text-sm text-gray-500 mt-3 leading-relaxed">{selectedProduct.description}</p>}
              {selectedProduct.stock === 0 ? (
                <div className="w-full mt-5 py-3.5 rounded-xl text-center text-sm font-semibold text-gray-400" style={{ background: "#F3F4F6" }}>{t.soldOut}</div>
              ) : (
                <div className="mt-5 space-y-2">
                  {shop.telegram_username && (
                    <a href={`https://t.me/${shop.telegram_username}?text=${encodeURIComponent(`Hi, I'm interested in: ${selectedProduct.name}${selectedProduct.price ? ` (${selectedProduct.price.toLocaleString()} Birr)` : ""}`)}`}
                      target="_blank" rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white text-sm font-semibold transition-all active:scale-[0.98]"
                      style={{ background: theme.primary }}>
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.12.03-1.99 1.27-5.62 3.72-.53.36-1.01.54-1.44.53-.47-.01-1.38-.27-2.06-.49-.83-.27-1.49-.42-1.43-.88.03-.24.37-.49 1.02-.74 3.98-1.73 6.64-2.88 7.97-3.44 3.8-1.58 4.59-1.86 5.1-1.87.11 0 .37.03.53.17.14.12.18.28.2.46-.01.06.01.24 0 .37z"/>
                      </svg>
                      {t.chat} on Telegram
                    </a>
                  )}
                  {shop.phone && (
                    <a href={`https://wa.me/${shop.phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(`Hi, I'm interested in: ${selectedProduct.name}${selectedProduct.price ? ` (${selectedProduct.price.toLocaleString()} Birr)` : ""}\n${shopUrl}/${selectedProduct.id}`)}`}
                      target="_blank" rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold border transition-all active:scale-[0.98]"
                      style={{ borderColor: "#25D366", color: "#25D366" }}>
                      💬 WhatsApp
                    </a>
                  )}
                  {shop.phone && (
                    <a href={`tel:${shop.phone}`}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold border transition-all active:scale-[0.98]"
                      style={{ borderColor: theme.primary, color: theme.primary }}>
                      📞 {t.call}
                    </a>
                  )}
                </div>
              )}
              <div className="flex items-center gap-3 mt-4 justify-center">
                <button onClick={() => copyLink(`${shopUrl}/${selectedProduct.id}`, `detail-${selectedProduct.id}`)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-gray-500 hover:bg-gray-50 border border-gray-100">
                  📋 {copiedId === `detail-${selectedProduct.id}` ? t.copied : t.copyLink}
                </button>
              </div>
              <Link href={`/${slug}/${selectedProduct.id}`}
                className="block text-center mt-3 text-xs font-semibold transition-colors"
                style={{ color: theme.primary, textDecoration: "none" }}>
                {t.viewFullPage}
              </Link>
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
                <h3 className="text-lg font-semibold text-gray-900">{t.inquirySent}</h3>
                <p className="text-gray-400 text-sm mt-1">{t.sellerNotified}</p>
              </div>
            ) : (
              <div className="p-6">
                <div className="flex items-start justify-between mb-5">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {inquiryForm.priceType === "contact" ? t.getQuote : (isService ? t.bookService : t.buyItem)}
                    </h3>
                    <p className="text-sm text-gray-400 mt-0.5">
                      {inquiryForm.productName}
                      <span className="ml-2 font-semibold" style={{ color: theme.primary }}>{fmtPrice(inquiryForm.price, inquiryForm.priceType, t)}</span>
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
                  <input type="text" placeholder={t.yourName} value={buyerName} onChange={(e) => setBuyerName(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 focus:outline-none transition-shadow"
                    style={{ boxShadow: buyerName ? `0 0 0 2px ${theme.ring}` : undefined }}
                    onFocus={(e) => (e.currentTarget.style.boxShadow = `0 0 0 2px ${theme.ring}`)}
                    onBlur={(e) => { if (!buyerName) e.currentTarget.style.boxShadow = "none"; }}
                    autoFocus />
                  <input type="tel" placeholder={t.phoneNumber} value={buyerPhone} onChange={(e) => setBuyerPhone(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 focus:outline-none transition-shadow"
                    onFocus={(e) => (e.currentTarget.style.boxShadow = `0 0 0 2px ${theme.ring}`)}
                    onBlur={(e) => (e.currentTarget.style.boxShadow = "none")} />
                  <p className="text-xs text-gray-400 -mt-1 ml-1">{t.phoneSub}</p>
                  <textarea placeholder={t.messageOptional} value={buyerMessage} onChange={(e) => setBuyerMessage(e.target.value)} rows={2}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 focus:outline-none resize-none transition-shadow"
                    onFocus={(e) => (e.currentTarget.style.boxShadow = `0 0 0 2px ${theme.ring}`)}
                    onBlur={(e) => (e.currentTarget.style.boxShadow = "none")} />
                  <button onClick={submitInquiry} disabled={!buyerName.trim() || !buyerPhone.trim() || submitting}
                    className="w-full py-3.5 rounded-xl text-white text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ background: !buyerName.trim() || !buyerPhone.trim() || submitting ? "#D1D5DB" : theme.primary }}
                    onMouseEnter={(e) => { if (buyerName.trim() && buyerPhone.trim() && !submitting) e.currentTarget.style.background = theme.primaryDark; }}
                    onMouseLeave={(e) => { if (buyerName.trim() && buyerPhone.trim() && !submitting) e.currentTarget.style.background = theme.primary; }}>
                    {submitting ? (
                      <span className="inline-flex items-center gap-2">
                        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        {t.sending}
                      </span>
                    ) : (inquiryForm.priceType === "contact" ? t.sendInquiry : (isService ? t.sendInquiry : t.sendOrder))}
                  </button>
                </div>
                {shop.telegram_username && (
                  <p className="text-center text-xs text-gray-300 mt-4">
                    {t.orMessageOn}{" "}
                    <a href={`https://t.me/${shop.telegram_username}`} target="_blank" rel="noopener noreferrer"
                      className="underline" style={{ color: theme.primary }}>Telegram</a>
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      {/* ═══ Admin: Floating Add Button ═══ */}
      {isAdmin && !showAddProduct && !editProduct && !showShopSettings && (
        <button onClick={() => setShowAddProduct(true)}
          className="fixed bottom-20 right-4 z-40 w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white text-2xl font-light transition-all active:scale-90"
          style={{ background: theme.primary, boxShadow: `0 4px 20px ${theme.primary}44` }}>
          +
        </button>
      )}

      {/* ═══ Admin: Product Form Modal ═══ */}
      {(showAddProduct || editProduct) && (
        <ProductForm
          product={editProduct ? {
            id: editProduct.id,
            name: editProduct.name,
            price: editProduct.price,
            price_type: editProduct.price_type || "fixed",
            description: editProduct.description || "",
            tag: editProduct.tag || "",
            stock: editProduct.stock,
            photo_url: editProduct.photo_url,
            listing_type: editProduct.listing_type || "product",
            tiktok_url: editProduct.tiktok_url,
            extra_photos: editProduct.extra_photos,
          } : undefined}
          tags={availableTags}
          themeColor={theme.primary}
          t={t}
          onSave={adminRefresh}
          onClose={() => { setEditProduct(null); setShowAddProduct(false); }}
        />
      )}

      {/* ═══ Admin: Shop Settings Modal ═══ */}
      {/* ═══ Login Modal ═══ */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => { setShowLoginModal(false); setLoginPolling(false); setLoginNonce(null); }}>
          <div className="bg-white rounded-2xl p-6 mx-4 max-w-sm w-full text-center shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: theme.bgSoft }}>
              <svg className="w-7 h-7" style={{ color: theme.primary }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">{t.loginViaTelegram}</h3>
            <p className="text-sm text-gray-500 mb-4">
              {loginBotUrl
                ? t.loginDesc
                : t.loginSetup}
            </p>
            {loginBotUrl && (
              <a href={loginBotUrl} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all active:scale-95"
                style={{ background: "#0088cc" }}>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                </svg>
                {t.openTelegram}
              </a>
            )}
            {loginPolling && (
              <p className="text-xs text-gray-400 mt-3 flex items-center justify-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full animate-pulse" style={{ background: theme.primary }} />
                {t.waitingConfirm}
              </p>
            )}
          </div>
        </div>
      )}

      {showShopSettings && shop && (
        <ShopSettings
          shop={{
            shop_name: shop.shop_name,
            description: shop.description,
            location_text: shop.location_text,
            category: shop.category,
            template_style: shop.template_style,
            phone: shop.phone,
            email: null,
            shop_type: shop.shop_type,
            tiktok_url: shop.tiktok_url,
          }}
          themeColor={theme.primary}
          onSave={adminRefresh}
          onClose={() => setShowShopSettings(false)}
        />
      )}

      {/* ═══ TikTok Video Modal ═══ */}
      {tiktokVideoUrl && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          onClick={(e) => { if (e.target === e.currentTarget) { setTiktokVideoUrl(null); setTiktokEmbed(null); } }}>
          <div className="absolute inset-0 modal-backdrop" style={{ background: "rgba(0,0,0,0.6)" }} />
          <div className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl modal-sheet sm:mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-center pt-3 sm:hidden"><div className="w-10 h-1 rounded-full bg-gray-200" /></div>
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#000">
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15.2a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.86a8.28 8.28 0 0 0 4.76 1.51v-3.45a4.85 4.85 0 0 1-1-.23z"/>
                  </svg>
                  {t.tiktokVideo}
                </h3>
                <button onClick={() => { setTiktokVideoUrl(null); setTiktokEmbed(null); }}
                  className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              {tiktokEmbed ? (
                <div className="rounded-xl overflow-hidden" dangerouslySetInnerHTML={{ __html: tiktokEmbed }} />
              ) : (
                <div className="text-center py-8">
                  <a href={tiktokVideoUrl} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold text-white transition-all active:scale-95"
                    style={{ background: "#000" }}>
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="white">
                      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15.2a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.86a8.28 8.28 0 0 0 4.76 1.51v-3.45a4.85 4.85 0 0 1-1-.23z"/>
                    </svg>
                    {t.watchVideo}
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══ Feedback Modal ═══ */}
      {showFeedbackModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          onClick={(e) => { if (e.target === e.currentTarget) { setShowFeedbackModal(false); setFeedbackText(""); } }}>
          <div className="absolute inset-0 modal-backdrop" style={{ background: "rgba(0,0,0,0.4)" }} />
          <div className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl modal-sheet sm:mx-4">
            <div className="flex justify-center pt-3 sm:hidden"><div className="w-10 h-1 rounded-full bg-gray-200" /></div>
            {feedbackSent ? (
              <div className="p-8 text-center">
                <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 check-pop" style={{ background: "#FEF3C7" }}>
                  <svg className="w-8 h-8 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">{t.thankYou}</h3>
                <p className="text-gray-400 text-sm mt-1">{t.weReadEvery}</p>
              </div>
            ) : (
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{t.shareFeedback}</h3>
                    <p className="text-sm text-gray-400 mt-0.5">{t.whatToImprove}</p>
                  </div>
                  <button onClick={() => { setShowFeedbackModal(false); setFeedbackText(""); }}
                    className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-gray-200 transition-colors -mt-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <textarea
                  placeholder={t.feedbackPlaceholder}
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  rows={4}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 focus:outline-none resize-none transition-shadow"
                  style={{ boxShadow: feedbackText ? "0 0 0 2px #F59E0B44" : undefined }}
                  autoFocus
                />
                <button onClick={submitFeedback} disabled={!feedbackText.trim()}
                  className="w-full mt-3 py-3 rounded-xl text-white text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: feedbackText.trim() ? "#F59E0B" : "#D1D5DB" }}>
                  {t.sendFeedbackBtn}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
