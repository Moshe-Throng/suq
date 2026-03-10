"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

interface AdminState {
  isAdmin: boolean;
  shopId: string | null;
  shopSlug: string | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AdminContext = createContext<AdminState>({
  isAdmin: false,
  shopId: null,
  shopSlug: null,
  loading: true,
  logout: async () => {},
});

export function useAdmin() {
  return useContext(AdminContext);
}

export function AdminProvider({ shopSlug, children }: { shopSlug: string; children: ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [shopId, setShopId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((data) => {
        if (data.authenticated && data.shopSlug === shopSlug) {
          setIsAdmin(true);
          setShopId(data.shopId);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [shopSlug]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setIsAdmin(false);
    setShopId(null);
  }

  return (
    <AdminContext.Provider value={{ isAdmin, shopId, shopSlug, loading, logout }}>
      {children}
    </AdminContext.Provider>
  );
}
