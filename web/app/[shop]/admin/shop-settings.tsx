"use client";

import { useState, useRef } from "react";

interface ShopData {
  shop_name: string;
  description: string | null;
  location_text: string | null;
  category: string | null;
  template_style: string | null;
  phone: string | null;
  email: string | null;
  shop_type: string | null;
  tiktok_url: string | null;
}

interface Props {
  shop: ShopData;
  themeColor: string;
  onSave: () => void;
  onClose: () => void;
}

const COLORS = [
  { key: "purple", label: "Purple", hex: "#7C3AED" },
  { key: "blue", label: "Blue", hex: "#2563EB" },
  { key: "cyan", label: "Cyan", hex: "#06B6D4" },
  { key: "teal", label: "Teal", hex: "#0D9488" },
  { key: "green", label: "Green", hex: "#059669" },
  { key: "orange", label: "Orange", hex: "#EA580C" },
  { key: "red", label: "Red", hex: "#E11D48" },
  { key: "amber", label: "Amber", hex: "#D97706" },
  { key: "charcoal", label: "Charcoal", hex: "#374151" },
  { key: "brown", label: "Brown", hex: "#92400E" },
];

const CATEGORIES = [
  "food", "fashion", "electronics", "beauty", "handmade",
  "coffee", "home", "salon", "photo", "tutoring",
  "design", "repair", "fitness", "events", "other",
];

export default function ShopSettings({ shop, themeColor, onSave, onClose }: Props) {
  const [name, setName] = useState(shop.shop_name);
  const [desc, setDesc] = useState(shop.description || "");
  const [location, setLocation] = useState(shop.location_text || "");
  const [category, setCategory] = useState(shop.category || "");
  const [color, setColor] = useState(shop.template_style || "purple");
  const [phone, setPhone] = useState(shop.phone || "");
  const [email, setEmail] = useState(shop.email || "");
  const [tiktokUrl, setTiktokUrl] = useState(shop.tiktok_url || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    if (!name.trim()) { setError("Shop name is required"); return; }
    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/admin/shop", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shop_name: name.trim(),
          description: desc.trim() || null,
          location_text: location.trim() || null,
          category: category || null,
          template_style: color,
          phone: phone.trim() || null,
          email: email.trim() || null,
          tiktok_url: tiktokUrl.trim() || null,
        }),
      });
      if (res.ok) onSave();
      else {
        const data = await res.json();
        setError(data.error || "Failed to save");
      }
    } catch { setError("Failed to save"); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.5)" }} />
      <div className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl sm:mx-4 max-h-[90vh] overflow-y-auto"
        style={{ animation: "slideUp 0.3s cubic-bezier(0.32,0.72,0,1)" }}>
        <div className="flex justify-center pt-3 sm:hidden"><div className="w-10 h-1 rounded-full bg-gray-200" /></div>

        <div className="p-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-bold text-gray-900">Shop Settings</h3>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Shop Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2"
                style={{ "--tw-ring-color": themeColor } as React.CSSProperties} />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Description</label>
              <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 focus:outline-none resize-none focus:ring-2"
                style={{ "--tw-ring-color": themeColor } as React.CSSProperties} />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Location</label>
              <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Bole, Addis Ababa"
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2"
                style={{ "--tw-ring-color": themeColor } as React.CSSProperties} />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-700 focus:outline-none bg-white">
                <option value="">None</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Brand Color</label>
              <div className="flex flex-wrap gap-2">
                {COLORS.map(c => (
                  <button key={c.key} onClick={() => setColor(c.key)}
                    className="w-8 h-8 rounded-full border-2 transition-all"
                    style={{ background: c.hex, borderColor: color === c.key ? "#111" : "transparent", transform: color === c.key ? "scale(1.15)" : undefined }}
                    title={c.label} />
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Phone</label>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+251..."
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2"
                style={{ "--tw-ring-color": themeColor } as React.CSSProperties} />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Email (for web login)</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2"
                style={{ "--tw-ring-color": themeColor } as React.CSSProperties} />
              <p className="text-[10px] text-gray-400 mt-1">Set an email to log in from any browser without Telegram</p>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">TikTok</label>
              <input type="url" value={tiktokUrl} onChange={(e) => setTiktokUrl(e.target.value)} placeholder="https://www.tiktok.com/@yourshop"
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2"
                style={{ "--tw-ring-color": themeColor } as React.CSSProperties} />
              <p className="text-[10px] text-gray-400 mt-1">Link your TikTok to showcase videos on your shop page</p>
            </div>

            {error && <p className="text-red-500 text-xs">{error}</p>}

            <button onClick={handleSave} disabled={saving || !name.trim()}
              className="w-full py-3.5 rounded-xl text-white text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-40"
              style={{ background: themeColor }}>
              {saving ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
