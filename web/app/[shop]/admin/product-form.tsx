"use client";

import { useState, useRef } from "react";
import type { ShopStrings } from "@/lib/i18n";

interface ProductData {
  id?: string;
  name: string;
  price: number | null;
  price_type: string;
  description: string;
  tag: string;
  stock: number | null;
  photo_url: string | null;
  listing_type: string;
  is_active?: boolean;
  tiktok_url?: string | null;
  extra_photos?: string[] | null;
}

interface Props {
  product?: ProductData;
  tags: string[];
  themeColor: string;
  t: ShopStrings;
  onSave: () => void;
  onClose: () => void;
}

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

export default function ProductForm({ product, tags, themeColor, t, onSave, onClose }: Props) {
  const isEdit = !!product?.id;
  const [name, setName] = useState(product?.name || "");
  const [price, setPrice] = useState<string>(product?.price?.toString() || "");
  const [priceType, setPriceType] = useState(product?.price_type || "fixed");
  const [description, setDescription] = useState(product?.description || "");
  const [tag, setTag] = useState(product?.tag || "");
  const [stock, setStock] = useState<string>(product?.stock?.toString() || "");
  const [photoUrl, setPhotoUrl] = useState(product?.photo_url || "");
  const [photoFileId, setPhotoFileId] = useState<string | null>(null);
  const [extraPhotos, setExtraPhotos] = useState<string[]>(product?.extra_photos || []);
  const [tiktokUrl, setTiktokUrl] = useState(product?.tiktok_url || "");
  const [uploading, setUploading] = useState(false);
  const [uploadingExtra, setUploadingExtra] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const extraFileRef = useRef<HTMLInputElement>(null);

  async function handleUpload(file: File) {
    setUploading(true);
    setError("");
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await fetch("/api/admin/upload", { method: "POST", body: form });
      const data = await res.json();
      if (res.ok && data.file_id) {
        setPhotoFileId(data.file_id);
        setPhotoUrl(`/api/img/${data.file_id}`);
      } else setError(data.error || "Upload failed");
    } catch { setError("Upload failed"); }
    finally { setUploading(false); }
  }

  async function handleExtraUpload(file: File) {
    if (extraPhotos.length >= 4) { setError("Max 5 photos total"); return; }
    setUploadingExtra(true);
    setError("");
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await fetch("/api/admin/upload", { method: "POST", body: form });
      const data = await res.json();
      if (res.ok && data.file_id) {
        setExtraPhotos(prev => [...prev, data.file_id]);
      } else setError(data.error || "Upload failed");
    } catch { setError("Upload failed"); }
    finally { setUploadingExtra(false); }
  }

  async function handleSave() {
    if (!name.trim()) { setError("Name is required"); return; }
    setSaving(true);
    setError("");

    const body: Record<string, unknown> = {
      name: name.trim(),
      price: priceType === "contact" ? null : (price ? Number(price) : null),
      price_type: priceType,
      description: description.trim() || null,
      tag: tag || null,
      stock: stock ? Number(stock) : null,
      photo_url: photoFileId ? null : (photoUrl || null),
      photo_file_id: photoFileId || null,
      tiktok_url: tiktokUrl.trim() || null,
      extra_photos: extraPhotos.length > 0 ? extraPhotos : null,
    };

    try {
      const url = isEdit ? `/api/admin/products/${product!.id}` : "/api/admin/products";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) onSave();
      else {
        const data = await res.json();
        setError(data.error || "Failed to save");
      }
    } catch { setError("Failed to save"); }
    finally { setSaving(false); }
  }

  const allTags = [...new Set([...Object.keys(TAG_LABELS), ...tags])];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.5)" }} />
      <div className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl sm:mx-4 max-h-[90vh] overflow-y-auto"
        style={{ animation: "slideUp 0.3s cubic-bezier(0.32,0.72,0,1)" }}>
        <div className="flex justify-center pt-3 sm:hidden"><div className="w-10 h-1 rounded-full bg-gray-200" /></div>

        <div className="p-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-bold text-gray-900">{isEdit ? t.editProduct : t.addProduct}</h3>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Photo upload */}
          <div className="mb-4">
            <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-gray-50 cursor-pointer border-2 border-dashed border-gray-200"
              onClick={() => fileRef.current?.click()}>
              {photoUrl ? (
                <img src={photoUrl} alt="Product" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                  <svg className="w-8 h-8 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" />
                  </svg>
                  <span className="text-xs">{uploading ? t.uploadingPhoto : t.tapToUpload}</span>
                </div>
              )}
              {photoUrl && (
                <button onClick={(e) => { e.stopPropagation(); setPhotoUrl(""); setPhotoFileId(null); }}
                  className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/50 text-white flex items-center justify-center text-xs">×</button>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => { if (e.target.files?.[0]) handleUpload(e.target.files[0]); }} />

            {/* Extra photos row */}
            <div className="flex gap-2 mt-2">
              {extraPhotos.map((fid, i) => (
                <div key={fid} className="relative w-14 h-14 rounded-lg overflow-hidden border border-gray-200">
                  <img src={`/api/img/${fid}`} alt={`Photo ${i + 2}`} className="w-full h-full object-cover" />
                  <button onClick={() => setExtraPhotos(prev => prev.filter((_, j) => j !== i))}
                    className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/50 text-white flex items-center justify-center text-[8px]">×</button>
                </div>
              ))}
              {extraPhotos.length < 4 && (
                <button onClick={() => extraFileRef.current?.click()}
                  className="w-14 h-14 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300 hover:border-gray-300 transition-colors">
                  {uploadingExtra ? (
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                  )}
                </button>
              )}
            </div>
            <input ref={extraFileRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => { if (e.target.files?.[0]) handleExtraUpload(e.target.files[0]); }} />
          </div>

          {/* Fields */}
          <div className="space-y-3">
            <input type="text" placeholder={t.productName} value={name} onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2"
              style={{ "--tw-ring-color": themeColor } as React.CSSProperties} />

            <div className="flex gap-2">
              <select value={priceType} onChange={(e) => setPriceType(e.target.value)}
                className="rounded-xl border border-gray-200 px-3 py-3 text-sm text-gray-700 focus:outline-none bg-white">
                <option value="fixed">{t.fixedPrice}</option>
                <option value="starting_from">{t.startingFromOption}</option>
                <option value="contact">{t.contactForPrice}</option>
              </select>
              {priceType !== "contact" && (
                <input type="number" placeholder={t.priceBirr} value={price} onChange={(e) => setPrice(e.target.value)}
                  className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2"
                  style={{ "--tw-ring-color": themeColor } as React.CSSProperties} />
              )}
            </div>

            <textarea placeholder={t.descriptionOptional} value={description} onChange={(e) => setDescription(e.target.value)}
              rows={2} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 focus:outline-none resize-none focus:ring-2"
              style={{ "--tw-ring-color": themeColor } as React.CSSProperties} />

            <input type="url" placeholder="TikTok video URL (optional)" value={tiktokUrl} onChange={(e) => setTiktokUrl(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2"
              style={{ "--tw-ring-color": themeColor } as React.CSSProperties} />

            <div className="flex gap-2">
              <select value={tag} onChange={(e) => setTag(e.target.value)}
                className="flex-1 rounded-xl border border-gray-200 px-3 py-3 text-sm text-gray-700 focus:outline-none bg-white">
                <option value="">{t.noTag}</option>
                {allTags.map(t => (
                  <option key={t} value={t}>{TAG_LABELS[t] || t}</option>
                ))}
              </select>
              <input type="number" placeholder={t.stockLabel} value={stock} onChange={(e) => setStock(e.target.value)}
                className="w-24 rounded-xl border border-gray-200 px-3 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2"
                style={{ "--tw-ring-color": themeColor } as React.CSSProperties} />
            </div>

            {error && <p className="text-red-500 text-xs">{error}</p>}

            <button onClick={handleSave} disabled={saving || !name.trim()}
              className="w-full py-3.5 rounded-xl text-white text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-40"
              style={{ background: themeColor }}>
              {saving ? t.savingDots : (isEdit ? t.saveChanges : t.addProduct)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
