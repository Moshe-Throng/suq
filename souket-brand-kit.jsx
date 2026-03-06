import { useState } from "react";

// ============================================================
// SOUK LOGO — Clean geometric market stall / shop icon
// with a modern tech feel. Works at every size.
// ============================================================
const SoukLogo = ({ size = 120, style = "primary", bg = "transparent" }) => {
  const s = size;
  const colors = {
    primary: { bg: "#FF6B35", ring: "#FF6B35", icon: "#fff", accent: "#FFB800" },
    dark: { bg: "#0A0A0F", ring: "#FF6B35", icon: "#FF6B35", accent: "#FFB800" },
    white: { bg: "#FFFFFF", ring: "#FF6B35", icon: "#FF6B35", accent: "#FFB800" },
    mono: { bg: "#0A0A0F", ring: "#fff", icon: "#fff", accent: "#fff" },
  };
  const c = colors[style] || colors.primary;

  return (
    <svg viewBox="0 0 120 120" width={s} height={s}>
      {/* Background circle */}
      <circle cx="60" cy="60" r="58" fill={c.bg} />
      {style === "dark" && <circle cx="60" cy="60" r="58" fill={c.bg} stroke={c.ring} strokeWidth="3" />}
      {style === "white" && <circle cx="60" cy="60" r="58" fill={c.bg} stroke="#f0f0f0" strokeWidth="1" />}

      {/* Market stall roof — the iconic shape */}
      <path d="M24 52 L60 28 L96 52" stroke={style === "primary" ? c.icon : c.ring} strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      
      {/* Awning scallops — bazaar feel */}
      <path d="M28 52 Q36 60 44 52 Q52 60 60 52 Q68 60 76 52 Q84 60 92 52" stroke={style === "primary" ? c.icon : c.ring} strokeWidth="3" fill="none" strokeLinecap="round" />
      
      {/* Shop front — open doorway */}
      <rect x="38" y="56" width="44" height="30" rx="3" fill="none" stroke={style === "primary" ? c.icon : c.icon} strokeWidth="3" />
      
      {/* Door opening */}
      <rect x="50" y="64" width="20" height="22" rx="2" fill={c.accent} opacity="0.3" />
      
      {/* Hanging product dots — marketplace goods */}
      <circle cx="44" cy="62" r="2.5" fill={c.accent} />
      <circle cx="76" cy="62" r="2.5" fill={c.accent} />
      
      {/* Sparkle — the "beautiful content" hint */}
      <path d="M88 36 L90 32 L92 36 L96 38 L92 40 L90 44 L88 40 L84 38Z" fill={c.accent} opacity="0.9" />
    </svg>
  );
};

// ============================================================
// WORDMARK
// ============================================================
const Wordmark = ({ size = 28, color = "#fff", showDot = true }) => (
  <span style={{ fontSize: size, fontWeight: 800, fontFamily: "'DM Sans', sans-serif", color, letterSpacing: -0.5 }}>
    souk<span style={{ color: "#FF6B35" }}>{showDot ? "." : ""}</span>{showDot && <span style={{ color: color }}>et</span>}
  </span>
);

// ============================================================
// COLOR SWATCH
// ============================================================
const Swatch = ({ color, name, hex }) => {
  const [copied, setCopied] = useState(false);
  const light = ["#FFFFFF", "#FFF8F3", "#FFB800"].includes(color);
  return (
    <div onClick={() => { navigator.clipboard?.writeText(hex); setCopied(true); setTimeout(() => setCopied(false), 1200); }}
      style={{ cursor: "pointer", textAlign: "center" }}>
      <div style={{ width: 64, height: 64, borderRadius: 14, background: color, margin: "0 auto 6px",
        border: light ? "1px solid #e0e0e0" : "none",
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: light ? "#333" : "#fff",
        fontWeight: 700, transition: "transform 0.15s", transform: copied ? "scale(0.92)" : "none"
      }}>{copied ? "✓" : ""}</div>
      <div style={{ fontSize: 11, fontWeight: 700 }}>{name}</div>
      <div style={{ fontSize: 10, color: "#888", fontFamily: "monospace" }}>{hex}</div>
    </div>
  );
};

// ============================================================
// MAIN
// ============================================================
export default function SoukBrand() {
  const [dark, setDark] = useState(true);
  const bg = dark ? "#06060a" : "#FAFAFA";
  const fg = dark ? "#e8e8e8" : "#111";
  const sub = dark ? "#666" : "#999";
  const card = dark ? "#0c0c14" : "#fff";
  const brd = dark ? "#1a1a2e" : "#eee";

  return (
    <div style={{ background: bg, minHeight: "100vh", color: fg, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: ${bg}; }
      `}</style>

      <div style={{ maxWidth: 560, margin: "0 auto", padding: "24px 16px" }}>
        {/* Toggle */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 11, color: sub, fontWeight: 700, letterSpacing: 2 }}>BRAND KIT</div>
          <button onClick={() => setDark(!dark)} style={{
            background: "none", border: `1px solid ${brd}`, color: sub,
            padding: "4px 12px", borderRadius: 16, fontSize: 11, cursor: "pointer"
          }}>{dark ? "☀️" : "🌙"}</button>
        </div>

        {/* Hero Logo */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <SoukLogo size={140} style="primary" />
          <div style={{ marginTop: 16 }}>
            <Wordmark size={42} color={fg} />
          </div>
          <div style={{ fontSize: 13, color: sub, marginTop: 6, letterSpacing: 0.5 }}>Your shop, made beautiful.</div>
        </div>

        {/* ============ LOGO VARIANTS ============ */}
        <div style={{ background: card, border: `1px solid ${brd}`, borderRadius: 16, padding: 20, marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: sub, fontWeight: 700, letterSpacing: 2, marginBottom: 16 }}>LOGO VARIANTS</div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
            {/* On orange */}
            <div style={{ textAlign: "center" }}>
              <div style={{ width: 80, height: 80, borderRadius: 18, background: "#FF6B35", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 4px" }}>
                <SoukLogo size={70} style="primary" />
              </div>
              <div style={{ fontSize: 10, color: sub }}>Primary</div>
            </div>
            {/* On dark */}
            <div style={{ textAlign: "center" }}>
              <div style={{ width: 80, height: 80, borderRadius: 18, background: "#0A0A0F", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 4px", border: "1px solid #222" }}>
                <SoukLogo size={70} style="dark" />
              </div>
              <div style={{ fontSize: 10, color: sub }}>Dark</div>
            </div>
            {/* On white */}
            <div style={{ textAlign: "center" }}>
              <div style={{ width: 80, height: 80, borderRadius: 18, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 4px", border: "1px solid #eee" }}>
                <SoukLogo size={70} style="white" />
              </div>
              <div style={{ fontSize: 10, color: sub }}>Light</div>
            </div>
            {/* Mono */}
            <div style={{ textAlign: "center" }}>
              <div style={{ width: 80, height: 80, borderRadius: 18, background: "#0A0A0F", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 4px", border: "1px solid #222" }}>
                <SoukLogo size={70} style="mono" />
              </div>
              <div style={{ fontSize: 10, color: sub }}>Mono</div>
            </div>
          </div>
        </div>

        {/* ============ SIZES ============ */}
        <div style={{ background: card, border: `1px solid ${brd}`, borderRadius: 16, padding: 20, marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: sub, fontWeight: 700, letterSpacing: 2, marginBottom: 16 }}>SIZES — TELEGRAM TO BILLBOARD</div>
          <div style={{ display: "flex", alignItems: "end", gap: 14, flexWrap: "wrap", justifyContent: "center" }}>
            {[24, 36, 48, 64, 80, 120].map(s => (
              <div key={s} style={{ textAlign: "center" }}>
                <SoukLogo size={s} style="primary" />
                <div style={{ fontSize: 9, color: sub, marginTop: 4 }}>{s}px</div>
              </div>
            ))}
          </div>
        </div>

        {/* ============ WORDMARKS ============ */}
        <div style={{ background: card, border: `1px solid ${brd}`, borderRadius: 16, padding: 20, marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: sub, fontWeight: 700, letterSpacing: 2, marginBottom: 16 }}>WORDMARKS</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16, alignItems: "center" }}>
            {/* Horizontal logo + wordmark */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <SoukLogo size={44} style={dark ? "dark" : "white"} />
              <Wordmark size={28} color={fg} />
            </div>
            {/* Compact */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <SoukLogo size={32} style={dark ? "dark" : "white"} />
              <Wordmark size={20} color={fg} />
            </div>
            {/* Text only */}
            <div>
              <Wordmark size={36} color={fg} />
            </div>
            {/* Tagline variant */}
            <div style={{ textAlign: "center" }}>
              <Wordmark size={28} color={fg} />
              <div style={{ fontSize: 11, color: sub, marginTop: 2, letterSpacing: 1.5 }}>Your shop, made beautiful.</div>
            </div>
          </div>
        </div>

        {/* ============ COLORS ============ */}
        <div style={{ background: card, border: `1px solid ${brd}`, borderRadius: 16, padding: 20, marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: sub, fontWeight: 700, letterSpacing: 2, marginBottom: 16 }}>COLOR PALETTE</div>
          <div style={{ fontSize: 11, color: sub, marginBottom: 12 }}>Tap to copy hex</div>
          
          <div style={{ fontSize: 10, color: "#FF6B35", fontWeight: 700, letterSpacing: 1.5, marginBottom: 8 }}>PRIMARY</div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
            <Swatch color="#FF6B35" name="Souk Orange" hex="#FF6B35" />
            <Swatch color="#FFB800" name="Gold" hex="#FFB800" />
            <Swatch color="#0A0A0F" name="Night" hex="#0A0A0F" />
            <Swatch color="#FFFFFF" name="White" hex="#FFFFFF" />
          </div>

          <div style={{ fontSize: 10, color: "#FF6B35", fontWeight: 700, letterSpacing: 1.5, marginBottom: 8 }}>EXTENDED</div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
            <Swatch color="#FF8C5A" name="Light Orange" hex="#FF8C5A" />
            <Swatch color="#E85D2A" name="Deep Orange" hex="#E85D2A" />
            <Swatch color="#FFF8F3" name="Warm Cream" hex="#FFF8F3" />
            <Swatch color="#1A1A2E" name="Dark Surface" hex="#1A1A2E" />
          </div>

          <div style={{ fontSize: 10, color: "#FF6B35", fontWeight: 700, letterSpacing: 1.5, marginBottom: 8 }}>STATUS</div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Swatch color="#10B981" name="Success" hex="#10B981" />
            <Swatch color="#EF4444" name="Error" hex="#EF4444" />
            <Swatch color="#F59E0B" name="Warning" hex="#F59E0B" />
            <Swatch color="#3B82F6" name="Info" hex="#3B82F6" />
          </div>
        </div>

        {/* ============ TYPOGRAPHY ============ */}
        <div style={{ background: card, border: `1px solid ${brd}`, borderRadius: 16, padding: 20, marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: sub, fontWeight: 700, letterSpacing: 2, marginBottom: 16 }}>TYPOGRAPHY</div>
          <div style={{ fontSize: 36, fontWeight: 900, marginBottom: 4 }}>DM Sans</div>
          <div style={{ fontSize: 13, color: sub, marginBottom: 16 }}>Primary typeface — all UI, content, web catalog</div>
          {[
            { s: 32, w: 900, t: "souk.et", l: "Brand — 32px / 900" },
            { s: 22, w: 700, t: "Red Velvet Cake", l: "Product — 22px / 700" },
            { s: 18, w: 800, t: "3,500 Birr", l: "Price — 18px / 800" },
            { s: 14, w: 400, t: "Handmade leather bags from Addis", l: "Body — 14px / 400" },
            { s: 11, w: 400, t: "suq.et/meronleather", l: "Watermark — 11px / 400" },
          ].map((r, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "8px 0", borderBottom: i < 4 ? `1px solid ${brd}` : "none" }}>
              <span style={{ fontSize: r.s, fontWeight: r.w }}>{r.t}</span>
              <span style={{ fontSize: 10, color: sub, whiteSpace: "nowrap", marginLeft: 12 }}>{r.l}</span>
            </div>
          ))}
        </div>

        {/* ============ BOT PROFILE ============ */}
        <div style={{ background: card, border: `1px solid ${brd}`, borderRadius: 16, padding: 20, marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: sub, fontWeight: 700, letterSpacing: 2, marginBottom: 16 }}>TELEGRAM BOT PROFILE</div>
          <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16 }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#FF6B35", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <SoukLogo size={48} style="primary" />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>Souk.et</div>
              <div style={{ fontSize: 12, color: sub }}>@SoukEtBot</div>
            </div>
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.8 }}>
            <div><span style={{ color: sub }}>Name:</span> <b>Souk.et</b></div>
            <div><span style={{ color: sub }}>Username:</span> <b>@SoukEtBot</b></div>
            <div><span style={{ color: sub }}>Bio:</span> Your shop, made beautiful. Turn your Telegram into a professional store — free.</div>
            <div><span style={{ color: sub }}>Avatar:</span> Logo on #FF6B35 background</div>
          </div>
        </div>

        {/* ============ IN CONTEXT — Telegram Preview ============ */}
        <div style={{ background: card, border: `1px solid ${brd}`, borderRadius: 16, padding: 20, marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: sub, fontWeight: 700, letterSpacing: 2, marginBottom: 16 }}>IN CONTEXT — TELEGRAM</div>
          <div style={{ background: "#17212B", borderRadius: 12, padding: 12 }}>
            <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#FF6B35", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <SoukLogo size={30} style="primary" />
              </div>
              <div style={{ background: "#182533", borderRadius: "4px 14px 14px 14px", padding: "10px 14px", maxWidth: "85%" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#FF6B35", marginBottom: 4 }}>🏪 Welcome to Souk.et!</div>
                <div style={{ fontSize: 12, color: "#ddd" }}>Turn your Telegram into a beautiful shop.</div>
                <div style={{ fontSize: 12, color: "#8BA2B5", marginTop: 6 }}>What type of business are you?</div>
                <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                  <span style={{ background: "#FF6B35", color: "#fff", padding: "5px 12px", borderRadius: 6, fontSize: 11, fontWeight: 700 }}>🛍 Products</span>
                  <span style={{ background: "transparent", color: "#8BA2B5", padding: "5px 12px", borderRadius: 6, fontSize: 11, fontWeight: 600, border: "1px solid #2B3E50" }}>💼 Services</span>
                </div>
              </div>
            </div>

            {/* Content generation message */}
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#FF6B35", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <SoukLogo size={30} style="primary" />
              </div>
              <div style={{ background: "#182533", borderRadius: "4px 14px 14px 14px", padding: "10px 14px", maxWidth: "85%" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#10B981", marginBottom: 4 }}>✨ Product added!</div>
                <div style={{ fontSize: 12, color: "#ddd", marginBottom: 6 }}>4 marketing images generated:</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
                  {["1:1 Square", "9:16 Story", "Banner", "Tile"].map(f => (
                    <div key={f} style={{ background: "#1F3044", borderRadius: 4, padding: "6px 8px", fontSize: 10, color: "#8BA2B5", textAlign: "center" }}>📸 {f}</div>
                  ))}
                </div>
                <div style={{ fontSize: 11, color: "#FFB800", marginTop: 8 }}>🔗 suq.et/meronleather</div>
              </div>
            </div>
          </div>
        </div>

        {/* ============ WEB CATALOG HEADER PREVIEW ============ */}
        <div style={{ background: card, border: `1px solid ${brd}`, borderRadius: 16, padding: 20, marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: sub, fontWeight: 700, letterSpacing: 2, marginBottom: 16 }}>IN CONTEXT — WEB CATALOG</div>
          <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid #333" }}>
            {/* Browser bar */}
            <div style={{ background: "#1a1a1a", padding: "6px 10px", display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ display: "flex", gap: 3 }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#FF5F57" }} />
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#FEBC2E" }} />
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#28C840" }} />
              </div>
              <div style={{ flex: 1, background: "#111", borderRadius: 4, padding: "3px 8px", fontSize: 10, color: "#888" }}>suq.et/meronleather</div>
            </div>
            {/* Header */}
            <div style={{ background: "linear-gradient(135deg, #FF6B35, #E85D2A)", padding: "24px 16px", color: "#fff" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <SoukLogo size={36} style="primary" />
                <div>
                  <div style={{ fontSize: 20, fontWeight: 800 }}>Meron Leather</div>
                  <div style={{ fontSize: 11, opacity: 0.8 }}>Handmade & Crafts · Bole, Addis Ababa</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                <span style={{ background: "rgba(255,255,255,0.2)", padding: "4px 10px", borderRadius: 6, fontSize: 10, fontWeight: 600 }}>💬 Telegram</span>
                <span style={{ background: "rgba(255,255,255,0.2)", padding: "4px 10px", borderRadius: 6, fontSize: 10, fontWeight: 600 }}>📞 Call</span>
                <span style={{ background: "rgba(255,255,255,0.2)", padding: "4px 10px", borderRadius: 6, fontSize: 10, fontWeight: 600 }}>📍 Directions</span>
              </div>
            </div>
            {/* Products hint */}
            <div style={{ background: dark ? "#111" : "#fff", padding: "12px 16px" }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Products (8)</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {["Classic Brown Tote", "Mini Crossbody", "Card Holder", "Laptop Sleeve"].map(n => (
                  <div key={n} style={{ background: dark ? "#1a1a2e" : "#f5f5f5", borderRadius: 8, padding: 10 }}>
                    <div style={{ width: "100%", height: 50, borderRadius: 6, background: "linear-gradient(135deg, #C8956C33, #8B451333)", marginBottom: 6 }} />
                    <div style={{ fontSize: 11, fontWeight: 600 }}>{n}</div>
                    <div style={{ fontSize: 12, fontWeight: 800, color: "#FF6B35" }}>3,500 Birr</div>
                  </div>
                ))}
              </div>
              <div style={{ textAlign: "center", marginTop: 12, fontSize: 10, color: "#888" }}>Powered by <b style={{ color: "#FF6B35" }}>souk.et</b></div>
            </div>
          </div>
        </div>

        {/* ============ QUICK REFERENCE ============ */}
        <div style={{ background: card, border: `1px solid ${brd}`, borderRadius: 16, padding: 20 }}>
          <div style={{ fontSize: 11, color: sub, fontWeight: 700, letterSpacing: 2, marginBottom: 16 }}>QUICK REFERENCE</div>
          {[
            ["Brand Name", "souk.et"],
            ["Bot Username", "@SoukEtBot"],
            ["Domain", "souk.et"],
            ["Primary Color", "#FF6B35 (Souk Orange)"],
            ["Accent Color", "#FFB800 (Gold)"],
            ["Dark Background", "#0A0A0F"],
            ["Font", "DM Sans (Google Fonts)"],
            ["Tagline", "Your shop, made beautiful."],
            ["Logo Style", "Market stall with awning + sparkle"],
          ].map(([k, v], i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: i < 8 ? `1px solid ${dark ? "#111" : "#f0f0f0"}` : "none" }}>
              <span style={{ fontSize: 13, color: sub }}>{k}</span>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
