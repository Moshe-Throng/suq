"use client";

import { DM_Sans } from "next/font/google";
import { useEffect, useState, useCallback } from "react";

const dm = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

/* ─── Brand tokens ─── */
const O = "#FF6B35";
const G = "#FFB800";
const N = "#0A0A0F";
const CREAM = "#FFF8F3";

/* ─── Inline SVG logo (from brand kit) ─── */
function SoukLogo({ size = 48 }: { size?: number }) {
  return (
    <svg viewBox="0 0 120 120" width={size} height={size}>
      <circle cx="60" cy="60" r="58" fill={O} />
      <path
        d="M24 52 L60 28 L96 52"
        stroke="#fff"
        strokeWidth="5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M28 52 Q36 60 44 52 Q52 60 60 52 Q68 60 76 52 Q84 60 92 52"
        stroke="#fff"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
      <rect
        x="38"
        y="56"
        width="44"
        height="30"
        rx="3"
        fill="none"
        stroke="#fff"
        strokeWidth="3"
      />
      <rect x="50" y="64" width="20" height="22" rx="2" fill={G} opacity="0.3" />
      <circle cx="44" cy="62" r="2.5" fill={G} />
      <circle cx="76" cy="62" r="2.5" fill={G} />
      <path
        d="M88 36 L90 32 L92 36 L96 38 L92 40 L90 44 L88 40 L84 38Z"
        fill={G}
        opacity="0.9"
      />
    </svg>
  );
}

/* ─── Data ─── */
const STEPS = [
  {
    num: "01",
    title: "Start the Bot",
    desc: "Open @SoukEtBot on Telegram. Choose your language, name your shop, pick a visual style.",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill={O}>
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.07-.18c-.08-.05-.19-.03-.27-.02-.12.03-1.99 1.27-5.62 3.72-.53.36-1.01.54-1.44.53-.47-.01-1.38-.27-2.06-.49-.83-.27-1.49-.42-1.43-.88.03-.24.37-.49 1.02-.74 3.98-1.73 6.64-2.88 7.97-3.44 3.8-1.58 4.59-1.86 5.1-1.87.11 0 .37.03.53.17.14.12.18.28.2.46-.01.06.01.24 0 .37z" />
      </svg>
    ),
  },
  {
    num: "02",
    title: "Add Your Items",
    desc: "Send a photo, set a price. Products or services. Takes under a minute each.",
    icon: (
      <svg
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        stroke={O}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <line x1="12" y1="8" x2="12" y2="16" />
        <line x1="8" y1="12" x2="16" y2="12" />
      </svg>
    ),
  },
  {
    num: "03",
    title: "Share & Sell",
    desc: "Get your souk.et link. Share on social, WhatsApp, or anywhere. You're live.",
    icon: (
      <svg
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        stroke={O}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </svg>
    ),
  },
];

const FEATURES = [
  {
    icon: "🌐",
    title: "Professional Web Store",
    desc: "Every shop gets a beautiful page at souk.et/your-name — share it anywhere.",
  },
  {
    icon: "🎨",
    title: "Auto Marketing Images",
    desc: "Product photos become professional marketing visuals instantly. No design skills needed.",
  },
  {
    icon: "✨",
    title: "6 Visual Themes",
    desc: "From clean & modern to warm Ethiopian heritage — pick the style that fits your brand.",
  },
  {
    icon: "📩",
    title: "Built-in Inquiries",
    desc: "Customers reach you directly. Get leads on Telegram the moment someone is interested.",
  },
  {
    icon: "🇪🇹",
    title: "English & Amharic",
    desc: "Fully bilingual. Customers see everything in the language they prefer.",
  },
  {
    icon: "💰",
    title: "Free Forever",
    desc: "No fees, no subscriptions, no catches. Just start selling and growing.",
  },
];

/* ─── Ethiopian cross pattern SVG ─── */
const PATTERN = `url("data:image/svg+xml,${encodeURIComponent(
  '<svg width="60" height="60" xmlns="http://www.w3.org/2000/svg"><path d="M30 5L35 25L55 30L35 35L30 55L25 35L5 30L25 25Z" fill="white" fill-opacity="0.5"/></svg>'
)}")`;

/* ══════════════════════════════════════════════════════════════ */

export default function Home() {
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setMounted(true));

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting && e.target.id) {
            setRevealed((prev) => new Set([...prev, e.target.id]));
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    );

    setTimeout(() => {
      document
        .querySelectorAll("[data-reveal]")
        .forEach((el) => observer.observe(el));
    }, 50);

    return () => observer.disconnect();
  }, []);

  const v = useCallback((id: string) => revealed.has(id), [revealed]);

  return (
    <div className={dm.className} style={{ overflowX: "hidden" }}>
      <style>{`
        /* ── Keyframes ── */
        @keyframes meshA {
          0%,100% { transform: translate(0,0) scale(1); }
          33%     { transform: translate(40px,-30px) scale(1.08); }
          66%     { transform: translate(-25px,20px) scale(0.94); }
        }
        @keyframes meshB {
          0%,100% { transform: translate(0,0) scale(1); }
          33%     { transform: translate(-35px,25px) scale(0.92); }
          66%     { transform: translate(30px,-15px) scale(1.06); }
        }
        @keyframes dotGlow {
          0%,100% { text-shadow: 0 0 20px rgba(255,107,53,0.4); }
          50%     { text-shadow: 0 0 40px rgba(255,107,53,0.8), 0 0 80px rgba(255,107,53,0.2); }
        }
        @keyframes ripple {
          0%   { transform: scale(0.6); opacity: 0.18; }
          100% { transform: scale(2.8); opacity: 0; }
        }
        @keyframes floatA {
          0%,100% { transform: translateY(0) rotate(-4deg); }
          50%     { transform: translateY(-14px) rotate(-2deg); }
        }
        @keyframes floatB {
          0%,100% { transform: translateY(0) rotate(3deg); }
          50%     { transform: translateY(-18px) rotate(5deg); }
        }
        @keyframes chevDown {
          0%,100% { transform: translateX(-50%) translateY(0); opacity: 0.3; }
          50%     { transform: translateX(-50%) translateY(6px); opacity: 0.15; }
        }
        @keyframes shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }

        /* ── Scroll reveal ── */
        .sr  { opacity:0; transform:translateY(32px); transition: opacity .8s cubic-bezier(.16,1,.3,1), transform .8s cubic-bezier(.16,1,.3,1); }
        .sr.in { opacity:1; transform:translateY(0); }
        .sg > * { opacity:0; transform:translateY(24px); transition: opacity .65s cubic-bezier(.16,1,.3,1), transform .65s cubic-bezier(.16,1,.3,1); }
        .sg.in > *:nth-child(1) { transition-delay:.0s;  opacity:1; transform:translateY(0); }
        .sg.in > *:nth-child(2) { transition-delay:.08s; opacity:1; transform:translateY(0); }
        .sg.in > *:nth-child(3) { transition-delay:.16s; opacity:1; transform:translateY(0); }
        .sg.in > *:nth-child(4) { transition-delay:.24s; opacity:1; transform:translateY(0); }
        .sg.in > *:nth-child(5) { transition-delay:.32s; opacity:1; transform:translateY(0); }
        .sg.in > *:nth-child(6) { transition-delay:.40s; opacity:1; transform:translateY(0); }

        /* ── Interactive ── */
        .cta-main {
          display:inline-flex; align-items:center; gap:10px;
          padding:18px 40px; background:${O}; color:#fff;
          font-weight:700; font-size:17px; border-radius:16px;
          border:none; cursor:pointer; text-decoration:none;
          transition: all .3s cubic-bezier(.16,1,.3,1);
          box-shadow: 0 4px 24px rgba(255,107,53,0.35),
                      inset 0 1px 0 rgba(255,255,255,0.15);
        }
        .cta-main:hover {
          transform:translateY(-2px) scale(1.02);
          box-shadow: 0 8px 40px rgba(255,107,53,0.5),
                      inset 0 1px 0 rgba(255,255,255,0.15);
          background:#FF7F50;
        }
        .cta-main:active { transform:translateY(0) scale(.98); }

        .step-card {
          background:#fff; border-radius:24px; padding:36px 28px;
          text-align:center; border:1px solid rgba(0,0,0,0.04);
          transition: all .4s cubic-bezier(.16,1,.3,1);
        }
        .step-card:hover {
          transform:translateY(-6px);
          box-shadow: 0 20px 60px rgba(255,107,53,0.08);
        }

        .feat-card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius:20px; padding:32px 28px;
          transition: all .4s cubic-bezier(.16,1,.3,1);
          position:relative; overflow:hidden;
        }
        .feat-card::before {
          content:''; position:absolute; top:0; left:0;
          width:100%; height:3px;
          background: linear-gradient(90deg, ${O}, ${G});
          opacity:0; transition: opacity .3s;
        }
        .feat-card:hover {
          background: rgba(255,255,255,0.06);
          border-color: rgba(255,107,53,0.2);
          transform:translateY(-4px);
        }
        .feat-card:hover::before { opacity:1; }

        .who-card {
          border-radius:24px; padding:36px 32px;
          transition: all .4s cubic-bezier(.16,1,.3,1);
        }
        .who-card:hover { transform:translateY(-4px); }

        .pill {
          font-size:.8rem; padding:6px 14px; border-radius:20px;
          background:#fff; color:#4B5563; font-weight:500;
          border:1px solid rgba(0,0,0,0.06);
          transition: all .2s;
        }
        .pill:hover {
          border-color: ${O}40;
          color: ${O};
          transform:translateY(-1px);
        }

        /* ── Responsive ── */
        @media(max-width:768px) {
          .hero-blob  { width:280px!important; height:280px!important; filter:blur(80px)!important; }
          .grid-3     { grid-template-columns:1fr!important; }
          .grid-2     { grid-template-columns:1fr!important; }
          .hero-float { display:none!important; }
        }
        @media(max-width:480px) {
          .cta-main { padding:16px 32px; font-size:15px; }
        }
      `}</style>

      {/* ════════════════════════════════════════════
          HERO
      ════════════════════════════════════════════ */}
      <section
        style={{
          position: "relative",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: N,
          overflow: "hidden",
          padding: "100px 24px 80px",
        }}
      >
        {/* Gradient blobs */}
        <div
          className="hero-blob"
          style={{
            position: "absolute",
            width: "550px",
            height: "550px",
            borderRadius: "50%",
            background: `radial-gradient(circle, ${O}70, transparent 70%)`,
            filter: "blur(130px)",
            top: "5%",
            right: "12%",
            animation: "meshA 22s ease-in-out infinite",
          }}
        />
        <div
          className="hero-blob"
          style={{
            position: "absolute",
            width: "450px",
            height: "450px",
            borderRadius: "50%",
            background: `radial-gradient(circle, ${G}50, transparent 70%)`,
            filter: "blur(110px)",
            bottom: "10%",
            left: "8%",
            animation: "meshB 18s ease-in-out infinite",
          }}
        />

        {/* Ethiopian cross pattern */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: 0.025,
            backgroundImage: PATTERN,
            backgroundSize: "60px 60px",
          }}
        />

        {/* Ripple rings */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "42%",
            transform: "translate(-50%,-50%)",
            pointerEvents: "none",
          }}
        >
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                width: "180px",
                height: "180px",
                borderRadius: "50%",
                border: "1px solid rgba(255,107,53,0.12)",
                left: "-90px",
                top: "-90px",
                animation: `ripple 4.5s ease-out ${i * 1.5}s infinite`,
              }}
            />
          ))}
        </div>

        {/* Content */}
        <div
          style={{
            position: "relative",
            textAlign: "center",
            maxWidth: "780px",
            zIndex: 2,
          }}
        >
          {/* Logo */}
          <div
            style={{
              display: "inline-block",
              marginBottom: "28px",
              opacity: mounted ? 1 : 0,
              transform: mounted ? "translateY(0) scale(1)" : "translateY(20px) scale(0.9)",
              transition: "all 0.8s cubic-bezier(0.16,1,0.3,1) 0s",
            }}
          >
            <SoukLogo size={72} />
          </div>

          {/* Wordmark */}
          <h1
            style={{
              fontSize: "clamp(3.8rem, 11vw, 7.5rem)",
              fontWeight: 900,
              letterSpacing: "-0.04em",
              lineHeight: 0.95,
              marginBottom: "24px",
              color: "white",
              opacity: mounted ? 1 : 0,
              transform: mounted ? "translateY(0)" : "translateY(36px)",
              transition: "all 1s cubic-bezier(0.16,1,0.3,1) 0.15s",
            }}
          >
            souk
            <span
              style={{
                color: O,
                animation: mounted ? "dotGlow 3s ease-in-out 1.5s infinite" : "none",
              }}
            >
              .
            </span>
            et
          </h1>

          {/* Tagline */}
          <p
            style={{
              fontSize: "clamp(1.25rem, 3.5vw, 1.8rem)",
              fontWeight: 500,
              color: "rgba(255,255,255,0.7)",
              marginBottom: "14px",
              opacity: mounted ? 1 : 0,
              transform: mounted ? "translateY(0)" : "translateY(28px)",
              transition: "all 0.9s cubic-bezier(0.16,1,0.3,1) 0.35s",
            }}
          >
            Your shop, made beautiful.
          </p>

          {/* Sub */}
          <p
            style={{
              fontSize: "clamp(0.95rem, 2.2vw, 1.1rem)",
              color: "rgba(255,255,255,0.35)",
              marginBottom: "44px",
              lineHeight: 1.7,
              maxWidth: "460px",
              marginLeft: "auto",
              marginRight: "auto",
              opacity: mounted ? 1 : 0,
              transform: mounted ? "translateY(0)" : "translateY(22px)",
              transition: "all 0.9s cubic-bezier(0.16,1,0.3,1) 0.5s",
            }}
          >
            Turn your Telegram into a professional store — free.
            <br />
            No app. No setup fees. Just start.
          </p>

          {/* CTA */}
          <div
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? "translateY(0)" : "translateY(18px)",
              transition: "all 0.9s cubic-bezier(0.16,1,0.3,1) 0.7s",
            }}
          >
            <a
              href="https://t.me/SoukEtBot"
              target="_blank"
              rel="noopener noreferrer"
              className="cta-main"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.07-.18c-.08-.05-.19-.03-.27-.02-.12.03-1.99 1.27-5.62 3.72-.53.36-1.01.54-1.44.53-.47-.01-1.38-.27-2.06-.49-.83-.27-1.49-.42-1.43-.88.03-.24.37-.49 1.02-.74 3.98-1.73 6.64-2.88 7.97-3.44 3.8-1.58 4.59-1.86 5.1-1.87.11 0 .37.03.53.17.14.12.18.28.2.46-.01.06.01.24 0 .37z" />
              </svg>
              Start Selling — It&apos;s Free
            </a>
          </div>

          <p
            style={{
              fontSize: "13px",
              color: "rgba(255,255,255,0.2)",
              marginTop: "18px",
              opacity: mounted ? 1 : 0,
              transition: "opacity 1s ease 1s",
            }}
          >
            Takes 5 minutes. No downloads needed.
          </p>
        </div>

        {/* Floating preview cards (desktop) */}
        <div
          className="hero-float"
          style={{
            position: "absolute",
            right: "6%",
            top: "28%",
            animation: "floatA 6s ease-in-out infinite",
            opacity: mounted ? 0.18 : 0,
            transition: "opacity 1.5s ease 1.1s",
          }}
        >
          <div
            style={{
              width: "150px",
              background: "rgba(255,255,255,0.04)",
              borderRadius: "16px",
              border: "1px solid rgba(255,255,255,0.07)",
              padding: "12px",
              backdropFilter: "blur(12px)",
            }}
          >
            <div
              style={{
                width: "100%",
                height: "90px",
                borderRadius: "10px",
                background: `linear-gradient(135deg, ${O}35, ${G}35)`,
                marginBottom: "10px",
              }}
            />
            <div
              style={{
                height: "9px",
                width: "75%",
                borderRadius: "4px",
                background: "rgba(255,255,255,0.14)",
                marginBottom: "6px",
              }}
            />
            <div
              style={{
                height: "8px",
                width: "45%",
                borderRadius: "4px",
                background: `${O}40`,
              }}
            />
          </div>
        </div>
        <div
          className="hero-float"
          style={{
            position: "absolute",
            left: "7%",
            bottom: "22%",
            animation: "floatB 7s ease-in-out infinite",
            opacity: mounted ? 0.14 : 0,
            transition: "opacity 1.5s ease 1.4s",
          }}
        >
          <div
            style={{
              width: "130px",
              background: "rgba(255,255,255,0.03)",
              borderRadius: "14px",
              border: "1px solid rgba(255,255,255,0.06)",
              padding: "10px",
              backdropFilter: "blur(12px)",
            }}
          >
            <div
              style={{
                width: "100%",
                height: "75px",
                borderRadius: "8px",
                background: `linear-gradient(135deg, ${G}28, #0D948828)`,
                marginBottom: "8px",
              }}
            />
            <div
              style={{
                height: "8px",
                width: "65%",
                borderRadius: "4px",
                background: "rgba(255,255,255,0.11)",
                marginBottom: "5px",
              }}
            />
            <div
              style={{
                height: "7px",
                width: "38%",
                borderRadius: "4px",
                background: `${G}35`,
              }}
            />
          </div>
        </div>

        {/* Scroll hint */}
        <div
          style={{
            position: "absolute",
            bottom: "28px",
            left: "50%",
            animation: "chevDown 2.5s ease-in-out infinite",
            opacity: mounted ? 1 : 0,
            transition: "opacity 1s ease 1.5s",
          }}
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M7 13l5 5 5-5M7 6l5 5 5-5" />
          </svg>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          HOW IT WORKS
      ════════════════════════════════════════════ */}
      <section style={{ background: CREAM, padding: "100px 24px", position: "relative" }}>
        {/* Blend from hero */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "100px",
            background: `linear-gradient(to bottom, ${N}, ${CREAM})`,
            pointerEvents: "none",
          }}
        />

        <div style={{ maxWidth: "920px", margin: "0 auto", position: "relative" }}>
          <div
            id="how-h"
            data-reveal
            className={`sr ${v("how-h") ? "in" : ""}`}
            style={{ textAlign: "center", marginBottom: "56px" }}
          >
            <p
              style={{
                fontSize: "13px",
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: O,
                marginBottom: "12px",
              }}
            >
              How it works
            </p>
            <h2
              style={{
                fontSize: "clamp(1.8rem, 4.5vw, 2.6rem)",
                fontWeight: 800,
                color: N,
                letterSpacing: "-0.02em",
              }}
            >
              Three steps. Five minutes.
            </h2>
          </div>

          <div
            id="how-g"
            data-reveal
            className={`grid-3 sg ${v("how-g") ? "in" : ""}`}
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "20px",
            }}
          >
            {STEPS.map((s) => (
              <div key={s.num} className="step-card">
                <div
                  style={{
                    width: "52px",
                    height: "52px",
                    borderRadius: "16px",
                    background: `linear-gradient(135deg, ${O}14, ${G}14)`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 18px",
                  }}
                >
                  {s.icon}
                </div>
                <p
                  style={{
                    fontSize: "12px",
                    fontWeight: 800,
                    color: O,
                    letterSpacing: "0.08em",
                    marginBottom: "8px",
                  }}
                >
                  STEP {s.num}
                </p>
                <h3
                  style={{
                    fontSize: "1.1rem",
                    fontWeight: 700,
                    color: N,
                    marginBottom: "8px",
                  }}
                >
                  {s.title}
                </h3>
                <p
                  style={{
                    fontSize: "0.88rem",
                    color: "#6B7280",
                    lineHeight: 1.65,
                  }}
                >
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          FEATURES
      ════════════════════════════════════════════ */}
      <section
        style={{
          background: "#08080D",
          padding: "100px 24px",
          position: "relative",
        }}
      >
        {/* Ambient glow */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%,-50%)",
            width: "700px",
            height: "500px",
            borderRadius: "50%",
            background: `radial-gradient(circle, ${O}06, transparent 70%)`,
            filter: "blur(80px)",
            pointerEvents: "none",
          }}
        />

        <div style={{ maxWidth: "920px", margin: "0 auto", position: "relative" }}>
          <div
            id="feat-h"
            data-reveal
            className={`sr ${v("feat-h") ? "in" : ""}`}
            style={{ textAlign: "center", marginBottom: "56px" }}
          >
            <p
              style={{
                fontSize: "13px",
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: G,
                marginBottom: "12px",
              }}
            >
              Everything included
            </p>
            <h2
              style={{
                fontSize: "clamp(1.8rem, 4.5vw, 2.6rem)",
                fontWeight: 800,
                color: "white",
                letterSpacing: "-0.02em",
              }}
            >
              Built for Ethiopian sellers.
            </h2>
          </div>

          <div
            id="feat-g"
            data-reveal
            className={`grid-2 sg ${v("feat-g") ? "in" : ""}`}
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: "16px",
            }}
          >
            {FEATURES.map((f) => (
              <div key={f.title} className="feat-card">
                <div style={{ fontSize: "28px", marginBottom: "16px" }}>
                  {f.icon}
                </div>
                <h3
                  style={{
                    fontSize: "1.05rem",
                    fontWeight: 700,
                    color: "white",
                    marginBottom: "8px",
                  }}
                >
                  {f.title}
                </h3>
                <p
                  style={{
                    fontSize: "0.88rem",
                    color: "rgba(255,255,255,0.42)",
                    lineHeight: 1.65,
                  }}
                >
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          FOR WHO
      ════════════════════════════════════════════ */}
      <section style={{ background: CREAM, padding: "100px 24px" }}>
        <div style={{ maxWidth: "920px", margin: "0 auto" }}>
          <div
            id="who-h"
            data-reveal
            className={`sr ${v("who-h") ? "in" : ""}`}
            style={{ textAlign: "center", marginBottom: "52px" }}
          >
            <p
              style={{
                fontSize: "13px",
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: O,
                marginBottom: "12px",
              }}
            >
              Who it&apos;s for
            </p>
            <h2
              style={{
                fontSize: "clamp(1.8rem, 4.5vw, 2.6rem)",
                fontWeight: 800,
                color: N,
                letterSpacing: "-0.02em",
              }}
            >
              Products. Services. You.
            </h2>
          </div>

          <div
            id="who-g"
            data-reveal
            className={`grid-2 sg ${v("who-g") ? "in" : ""}`}
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: "20px",
            }}
          >
            {/* Products */}
            <div
              className="who-card"
              style={{
                background: `linear-gradient(135deg, ${O}10, ${G}08)`,
                border: `1px solid ${O}18`,
              }}
            >
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "14px",
                  background: `${O}15`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "22px",
                  marginBottom: "20px",
                }}
              >
                📦
              </div>
              <h3
                style={{
                  fontSize: "1.2rem",
                  fontWeight: 700,
                  color: N,
                  marginBottom: "14px",
                }}
              >
                Product Sellers
              </h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {[
                  "Food & Bakery",
                  "Fashion",
                  "Electronics",
                  "Beauty",
                  "Handmade & Crafts",
                  "Coffee & Spices",
                  "Home & Furniture",
                ].map((c) => (
                  <span key={c} className="pill">
                    {c}
                  </span>
                ))}
              </div>
            </div>

            {/* Services */}
            <div
              className="who-card"
              style={{
                background: `linear-gradient(135deg, ${G}10, #0D948810)`,
                border: `1px solid ${G}18`,
              }}
            >
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "14px",
                  background: `${G}15`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "22px",
                  marginBottom: "20px",
                }}
              >
                💼
              </div>
              <h3
                style={{
                  fontSize: "1.2rem",
                  fontWeight: 700,
                  color: N,
                  marginBottom: "14px",
                }}
              >
                Service Providers
              </h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {[
                  "Beauty & Salon",
                  "Photography",
                  "Tutoring",
                  "Design & Creative",
                  "Repair & Technical",
                  "Health & Fitness",
                  "Events & Catering",
                ].map((c) => (
                  <span key={c} className="pill">
                    {c}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          FINAL CTA
      ════════════════════════════════════════════ */}
      <section
        style={{
          position: "relative",
          padding: "120px 24px",
          background: `linear-gradient(160deg, ${N} 0%, #1a0f08 100%)`,
          overflow: "hidden",
        }}
      >
        {/* Glow */}
        <div
          style={{
            position: "absolute",
            bottom: "-80px",
            left: "50%",
            transform: "translateX(-50%)",
            width: "900px",
            height: "450px",
            borderRadius: "50%",
            background: `radial-gradient(circle, ${O}12, transparent 70%)`,
            filter: "blur(80px)",
            pointerEvents: "none",
          }}
        />

        {/* Pattern */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: 0.015,
            backgroundImage: PATTERN,
            backgroundSize: "60px 60px",
            pointerEvents: "none",
          }}
        />

        <div
          id="cta-f"
          data-reveal
          className={`sr ${v("cta-f") ? "in" : ""}`}
          style={{
            position: "relative",
            textAlign: "center",
            maxWidth: "600px",
            margin: "0 auto",
          }}
        >
          <div style={{ marginBottom: "28px" }}>
            <SoukLogo size={56} />
          </div>
          <h2
            style={{
              fontSize: "clamp(2rem, 5.5vw, 3.2rem)",
              fontWeight: 900,
              color: "white",
              letterSpacing: "-0.03em",
              marginBottom: "16px",
              lineHeight: 1.1,
            }}
          >
            Ready to open
            <br />
            your souk?
          </h2>
          <p
            style={{
              fontSize: "1.05rem",
              color: "rgba(255,255,255,0.38)",
              marginBottom: "40px",
              lineHeight: 1.7,
            }}
          >
            Join Ethiopian sellers already using souk.et.
            <br />
            Five minutes. Zero cost. Beautiful results.
          </p>

          <a
            href="https://t.me/SoukEtBot"
            target="_blank"
            rel="noopener noreferrer"
            className="cta-main"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.07-.18c-.08-.05-.19-.03-.27-.02-.12.03-1.99 1.27-5.62 3.72-.53.36-1.01.54-1.44.53-.47-.01-1.38-.27-2.06-.49-.83-.27-1.49-.42-1.43-.88.03-.24.37-.49 1.02-.74 3.98-1.73 6.64-2.88 7.97-3.44 3.8-1.58 4.59-1.86 5.1-1.87.11 0 .37.03.53.17.14.12.18.28.2.46-.01.06.01.24 0 .37z" />
            </svg>
            Open Your Shop
          </a>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          FOOTER
      ════════════════════════════════════════════ */}
      <footer
        style={{
          background: N,
          borderTop: "1px solid rgba(255,255,255,0.05)",
          padding: "40px 24px",
          textAlign: "center",
        }}
      >
        <p
          style={{
            fontSize: "1.15rem",
            fontWeight: 800,
            color: "white",
            letterSpacing: "-0.02em",
          }}
        >
          souk<span style={{ color: O }}>.</span>et
        </p>
        <p
          style={{
            fontSize: "0.8rem",
            color: "rgba(255,255,255,0.22)",
            marginTop: "6px",
          }}
        >
          Your shop, made beautiful.
        </p>
        <div
          style={{
            marginTop: "20px",
            display: "flex",
            justifyContent: "center",
            gap: "24px",
          }}
        >
          <a
            href="https://t.me/SoukEtBot"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: "0.82rem",
              color: "rgba(255,255,255,0.3)",
              textDecoration: "none",
              transition: "color 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = O)}
            onMouseLeave={(e) =>
              (e.currentTarget.style.color = "rgba(255,255,255,0.3)")
            }
          >
            @SoukEtBot
          </a>
        </div>
      </footer>
    </div>
  );
}
