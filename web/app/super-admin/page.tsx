"use client";

import { useState, useEffect } from "react";

interface Product {
  id: string;
  name: string;
  price: number | null;
  photo_url: string | null;
  tag: string | null;
  shop_name: string;
  shop_slug: string;
}

export default function SuperAdminPage() {
  const [key, setKey] = useState("");
  const [authed, setAuthed] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [shops, setShops] = useState<{ shop_name: string; shop_slug: string }[]>([]);
  const [selectedShop, setSelectedShop] = useState("");
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [deleted, setDeleted] = useState<Set<string>>(new Set());

  async function fetchProducts(shopSlug: string, off: number) {
    setLoading(true);
    const params = new URLSearchParams({ key, offset: String(off) });
    if (shopSlug) params.set("shop", shopSlug);
    const res = await fetch(`/api/super-admin/products?${params}`);
    if (!res.ok) { setAuthed(false); setLoading(false); return; }
    const data = await res.json();
    if (off === 0) setProducts(data.products);
    else setProducts((prev) => [...prev, ...data.products]);
    setShops(data.shops);
    setOffset(off + data.products.length);
    setLoading(false);
  }

  async function deleteProduct(id: string) {
    await fetch(`/api/super-admin/products?key=${key}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setDeleted((prev) => new Set(prev).add(id));
  }

  function login() {
    setAuthed(true);
    fetchProducts("", 0);
  }

  if (!authed) {
    return (
      <div style={{ padding: "40px 20px", maxWidth: 400, margin: "0 auto", fontFamily: "system-ui" }}>
        <h1 style={{ fontSize: 24, marginBottom: 20 }}>Super Admin</h1>
        <input type="password" placeholder="Admin key" value={key}
          onChange={(e) => setKey(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && login()}
          style={{ width: "100%", padding: "12px", fontSize: 16, border: "1px solid #ddd", borderRadius: 8, marginBottom: 12 }} />
        <button onClick={login}
          style={{ width: "100%", padding: "12px", fontSize: 16, background: "#FF6B35", color: "white", border: "none", borderRadius: 8, cursor: "pointer" }}>
          Login
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px", maxWidth: 1200, margin: "0 auto", fontFamily: "system-ui" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h1 style={{ fontSize: 22 }}>Product Manager ({products.filter((p) => !deleted.has(p.id)).length} showing)</h1>
        <select value={selectedShop} onChange={(e) => { setSelectedShop(e.target.value); fetchProducts(e.target.value, 0); }}
          style={{ padding: "8px 12px", fontSize: 14, border: "1px solid #ddd", borderRadius: 8 }}>
          <option value="">All Shops</option>
          {shops.map((s) => <option key={s.shop_slug} value={s.shop_slug}>{s.shop_name}</option>)}
        </select>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
        {products.filter((p) => !deleted.has(p.id)).map((p) => (
          <div key={p.id} style={{ border: "1px solid #e5e5e5", borderRadius: 12, overflow: "hidden", background: "white" }}>
            <div style={{ position: "relative", width: "100%", height: 0, paddingBottom: "100%", background: "#f5f5f5" }}>
              {p.photo_url ? (
                <img src={p.photo_url} alt={p.name} loading="lazy"
                  style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#ccc", fontSize: 32 }}>📦</div>
              )}
            </div>
            <div style={{ padding: "8px 10px" }}>
              <p style={{ fontSize: 12, fontWeight: 700, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</p>
              <p style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>{p.shop_name}</p>
              <p style={{ fontSize: 12, fontWeight: 800, color: "#FF6B35", marginBottom: 6 }}>{p.price ? `${p.price.toLocaleString()} ብር` : "—"}</p>
              <button onClick={() => deleteProduct(p.id)}
                style={{ width: "100%", padding: "6px", fontSize: 11, fontWeight: 700, color: "white", background: "#ef4444",
                  border: "none", borderRadius: 6, cursor: "pointer" }}>
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      {products.length > 0 && (
        <div style={{ textAlign: "center", marginTop: 20 }}>
          <button onClick={() => fetchProducts(selectedShop, offset)} disabled={loading}
            style={{ padding: "12px 32px", fontSize: 14, fontWeight: 700, background: "#333", color: "white",
              border: "none", borderRadius: 8, cursor: "pointer", opacity: loading ? 0.5 : 1 }}>
            {loading ? "Loading..." : "Load More"}
          </button>
        </div>
      )}
    </div>
  );
}
