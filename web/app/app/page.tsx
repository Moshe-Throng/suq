"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData: string;
        initDataUnsafe: { user?: { id: number; first_name?: string; username?: string } };
        ready: () => void;
        expand: () => void;
        themeParams: Record<string, string>;
        colorScheme: "light" | "dark";
        HapticFeedback?: { impactOccurred: (style: string) => void };
      };
    };
  }
}

type AuthResult = {
  role: "seller" | "buyer";
  slug?: string;
  name?: string;
  tid: number;
};

export default function MiniAppBoot() {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState("");
  const [scheme, setScheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const tryAuth = async () => {
      // Wait for Telegram WebApp SDK to be ready
      const tg = window.Telegram?.WebApp;
      if (!tg) {
        // Not inside Telegram — redirect to the open web marketplace
        window.location.href = "/";
        return;
      }

      tg.ready();
      tg.expand();
      setScheme(tg.colorScheme);

      const initData = tg.initData;
      if (!initData) {
        // Dev fallback — no signed initData, redirect to public marketplace
        window.location.href = "/";
        return;
      }

      try {
        const res = await fetch("/api/tg-auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ initData }),
        });
        if (!res.ok) throw new Error(`auth failed ${res.status}`);
        const data: AuthResult = await res.json();

        if (data.role === "seller" && data.slug) {
          // Sellers land on their own shop page (admin controls auto-enabled by session cookie)
          router.replace(`/${data.slug}`);
        } else {
          // Buyers land on the marketplace
          router.replace("/");
        }
      } catch (e) {
        console.error(e);
        setStatus("error");
        setMessage("Couldn't sign in. Please try again or use @SoukEtBot in chat.");
      }
    };

    // Give the Telegram script a tick to load
    const timer = setTimeout(tryAuth, 150);
    return () => clearTimeout(timer);
  }, [router]);

  const dark = scheme === "dark";
  const bg = dark ? "#0f1116" : "#fafafa";
  const fg = dark ? "#f5f5f5" : "#222";

  return (
    <>
      <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
      <div
        style={{
          minHeight: "100vh",
          background: bg,
          color: fg,
          fontFamily: "system-ui,-apple-system,sans-serif",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 56, marginBottom: 12 }}>🛒</div>
        <h1 style={{ fontSize: 28, margin: "0 0 4px" }}>souk.et</h1>
        <p style={{ opacity: 0.6, margin: "0 0 28px", fontSize: 14 }}>የኢትዮጵያ ገበያ</p>
        {status === "loading" && (
          <p style={{ opacity: 0.7, fontSize: 14 }}>Opening…</p>
        )}
        {status === "error" && (
          <>
            <p style={{ opacity: 0.85, fontSize: 14, marginBottom: 16 }}>{message}</p>
            <a
              href="https://t.me/SoukEtBot"
              style={{
                display: "inline-block",
                padding: "12px 24px",
                borderRadius: 10,
                background: "#7C3AED",
                color: "white",
                textDecoration: "none",
                fontWeight: 600,
              }}
            >
              Open @SoukEtBot
            </a>
          </>
        )}
      </div>
    </>
  );
}
