"""
Suq Content Factory — generates 4 marketing image formats per product/service.

Formats:
  - square   (1080×1080) — Instagram feed, Facebook, Telegram
  - story    (1080×1920) — Instagram Story, TikTok, Reels
  - banner   (1200×628)  — Facebook/Twitter share, Telegram header
  - tile     (600×600)   — Web catalog, WhatsApp catalog

Styles (mapped from template_style):
  - clean    → clean_white    — White/cream bg, product centered, price in brand color
  - bold     → bold_dark      — Black bg, dramatic shadow, neon gradient price
  - minimal  → minimal_line   — Thin line border, serif font, lots of white space
  - ethiopian → ethiopian     — Warm earth tones, traditional pattern border
  - fresh    → fresh_pop      — Teal gradient, bold sans-serif, Gen-Z vibrant
  - warm     → warm_gradient  — Peach gradient, lifestyle feel, polaroid frame
"""

import io
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

# ── Brand Colors ─────────────────────────────────────────────

WHITE = (255, 255, 255)
OFF_WHITE = (250, 248, 245)
CREAM = (252, 249, 243)
BLACK = (20, 20, 20)
DARK_BG = (18, 18, 24)
BRAND_PURPLE = (110, 60, 180)

# ── Color key → hex (for template_style DB field) ────────────

COLOR_HEX: dict[str, str] = {
    "purple":    "#7C3AED",
    "blue":      "#2563EB",
    "cyan":      "#06B6D4",
    "teal":      "#0D9488",
    "green":     "#059669",
    "orange":    "#EA580C",
    "red":       "#E11D48",
    "amber":     "#D97706",
    "charcoal":  "#374151",
    "brown":     "#92400E",
    # legacy style name fallbacks
    "clean":     "#7C3AED",
    "bold":      "#06B6D4",
    "minimal":   "#374151",
    "ethiopian": "#92400E",
    "fresh":     "#0D9488",
    "warm":      "#EA580C",
}
NEON_CYAN = (0, 230, 255)
NEON_PINK = (255, 50, 150)
GOLD = (200, 165, 75)
WARM_BROWN = (140, 85, 50)
WARM_BG = (245, 235, 220)
WARM_CREAM = (250, 240, 225)
ETH_EARTH = (165, 120, 70)
ETH_BORDER = (180, 135, 75)
ETH_DARK = (80, 50, 25)
SUBTLE_GRAY = (140, 140, 150)

# Fresh style colors
TEAL = (13, 148, 136)
TEAL_DARK = (6, 95, 90)
TEAL_LIGHT = (20, 184, 166)
EMERALD = (5, 150, 105)

# Warm style colors
PEACH = (255, 200, 170)
CORAL = (245, 130, 95)
WARM_DARK = (80, 50, 35)
PEACH_BG = (255, 240, 230)

WIN_FONTS = "C:/Windows/Fonts"
_CUSTOM_FONTS = str(Path(__file__).parent.parent / "fonts")

# ── Font cache ───────────────────────────────────────────────

_font_cache: dict[tuple, ImageFont.FreeTypeFont] = {}


def _load_font(names: list[str], size: int) -> ImageFont.FreeTypeFont:
    """Cached font loader — custom fonts → Windows → Linux paths."""
    key = (tuple(names), size)
    if key in _font_cache:
        return _font_cache[key]
    bases = [
        _CUSTOM_FONTS,
        WIN_FONTS,
        "/usr/share/fonts/truetype/dejavu",
        "/usr/share/fonts/truetype/liberation",
        "/usr/share/fonts/truetype/google",
    ]
    for name in names:
        for base in bases:
            try:
                font = ImageFont.truetype(f"{base}/{name}", size)
                _font_cache[key] = font
                return font
            except Exception:
                pass
    try:
        font = ImageFont.load_default(size=size)
    except TypeError:
        font = ImageFont.load_default()
    _font_cache[key] = font
    return font


# Font presets — try Google Fonts first, fall back to system fonts
def _f_sans_bold(size): return _load_font(["PlusJakartaSans-Bold.ttf", "DMSans-Bold.ttf", "arialbd.ttf", "calibrib.ttf", "DejaVuSans-Bold.ttf"], size)
def _f_sans(size): return _load_font(["PlusJakartaSans-Regular.ttf", "DMSans-Regular.ttf", "arial.ttf", "calibri.ttf", "DejaVuSans.ttf"], size)
def _f_serif_bold(size): return _load_font(["CormorantGaramond-Bold.ttf", "georgiab.ttf", "timesbd.ttf", "DejaVuSerif-Bold.ttf"], size)
def _f_serif(size): return _load_font(["CormorantGaramond-Regular.ttf", "georgia.ttf", "times.ttf", "DejaVuSerif.ttf"], size)

# Template-specific font presets
def _f_jakarta_bold(size): return _load_font(["PlusJakartaSans-Bold.ttf", "arialbd.ttf", "DejaVuSans-Bold.ttf"], size)
def _f_jakarta(size): return _load_font(["PlusJakartaSans-Regular.ttf", "arial.ttf", "DejaVuSans.ttf"], size)
def _f_dm_bold(size): return _load_font(["DMSans-Bold.ttf", "arialbd.ttf", "DejaVuSans-Bold.ttf"], size)
def _f_dm(size): return _load_font(["DMSans-Regular.ttf", "arial.ttf", "DejaVuSans.ttf"], size)
def _f_cormorant_bold(size): return _load_font(["CormorantGaramond-Bold.ttf", "georgiab.ttf", "DejaVuSerif-Bold.ttf"], size)
def _f_cormorant(size): return _load_font(["CormorantGaramond-Regular.ttf", "georgia.ttf", "DejaVuSerif.ttf"], size)
def _f_inter_bold(size): return _load_font(["Inter-Bold.ttf", "Inter-SemiBold.ttf", "arialbd.ttf", "DejaVuSans-Bold.ttf"], size)
def _f_inter(size): return _load_font(["Inter-Regular.ttf", "arial.ttf", "DejaVuSans.ttf"], size)


# ── Price text helper ────────────────────────────────────────


def _price_text(price: int | None, price_type: str = "fixed") -> str:
    """Format price for image display."""
    if price_type == "contact" or price is None:
        return "Contact for pricing"
    if price_type == "starting_from":
        return f"From {price:,} Birr"
    return f"{price:,} Birr"


def _cta_text(price_type: str = "fixed") -> str:
    """Get CTA text based on price type."""
    if price_type == "contact":
        return "INQUIRE NOW →"
    if price_type == "starting_from":
        return "GET A QUOTE →"
    return "ORDER NOW →"


# ── Text helpers ─────────────────────────────────────────────


def _wrap(text: str, font, max_w: int, draw: ImageDraw.Draw) -> list[str]:
    """Word-wrap text to fit within max_w pixels."""
    words = text.split()
    lines, cur = [], []
    for word in words:
        test = " ".join(cur + [word])
        if draw.textbbox((0, 0), test, font=font)[2] <= max_w:
            cur.append(word)
        else:
            if cur:
                lines.append(" ".join(cur))
            cur = [word]
    if cur:
        lines.append(" ".join(cur))
    return lines


def _text_block(draw, text, font, x, y, max_w, color, max_lines=3, spacing=1.3):
    """Draw wrapped text, return y after last line."""
    lines = _wrap(text, font, max_w, draw)
    lh = int(font.size * spacing)
    for line in lines[:max_lines]:
        draw.text((x, y), line, fill=color, font=font)
        y += lh
    return y


def _center(draw, text, font, y, w, color):
    """Draw horizontally centered text."""
    bbox = draw.textbbox((0, 0), text, font=font)
    x = (w - bbox[2] + bbox[0]) // 2
    draw.text((x, y), text, fill=color, font=font)
    return y + int(font.size * 1.3)


def _text_w(draw, text, font):
    """Get text width."""
    return draw.textbbox((0, 0), text, font=font)[2]


def _rr(draw, box, radius, **kw):
    draw.rounded_rectangle(box, radius=radius, **kw)


# ── Photo processing ─────────────────────────────────────────


def _load_photo(photo_bytes: bytes) -> Image.Image:
    return Image.open(io.BytesIO(photo_bytes)).convert("RGB")


def _fit(photo: Image.Image, tw: int, th: int) -> Image.Image:
    """Center-crop to target size."""
    iw, ih = photo.size
    scale = max(tw / iw, th / ih)
    r = photo.resize((int(iw * scale), int(ih * scale)), Image.LANCZOS)
    x, y = (r.width - tw) // 2, (r.height - th) // 2
    return r.crop((x, y, x + tw, y + th))


def _round(img: Image.Image, radius: int, bg=WHITE) -> Image.Image:
    """Rounded corners."""
    img = img.convert("RGBA")
    mask = Image.new("L", img.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([(0, 0), img.size], radius=radius, fill=255)
    img.putalpha(mask)
    flat = Image.new("RGB", img.size, bg)
    flat.paste(img, mask=img.split()[3])
    return flat


def _shadow(img: Image.Image, offset=8, blur=15, color=(0, 0, 0, 60)) -> Image.Image:
    """Add drop shadow behind an image."""
    w, h = img.size
    canvas = Image.new("RGBA", (w + offset * 2 + blur, h + offset * 2 + blur), (0, 0, 0, 0))
    shadow_layer = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    shadow_rect = Image.new("RGBA", (w, h), color)
    shadow_layer.paste(shadow_rect, (offset + blur // 2, offset + blur // 2))
    shadow_layer = shadow_layer.filter(ImageFilter.GaussianBlur(blur))
    canvas = Image.alpha_composite(canvas, shadow_layer)
    canvas.paste(img.convert("RGBA"), (blur // 2, blur // 2))
    return canvas.convert("RGB")


# ── Fast gradient (numpy) ────────────────────────────────────


def _gradient(w: int, h: int, top: tuple, bot: tuple) -> Image.Image:
    """Fast vertical gradient using numpy."""
    arr = np.zeros((h, w, 3), dtype=np.uint8)
    for c in range(3):
        arr[:, :, c] = np.linspace(top[c], bot[c], h, dtype=np.uint8)[:, np.newaxis]
    return Image.fromarray(arr)


# ── Watermark ────────────────────────────────────────────────


def _watermark(img: Image.Image, shop_slug: str = "") -> Image.Image:
    """Subtle branded watermark."""
    img = img.copy()
    draw = ImageDraw.Draw(img)
    w, h = img.size

    text = f"souk.et/{shop_slug}" if shop_slug else "souk.et"
    font_size = max(12, int(w * 0.018))
    font = _f_sans(font_size)

    tw = _text_w(draw, text, font)
    th = font_size

    px, py = (w - tw) // 2 - 12, h - th - 16
    _rr(draw, [px, py - 4, px + tw + 24, py + th + 8], radius=12,
        fill=(0, 0, 0), outline=None)
    draw.text((px + 12, py), text, fill=(255, 255, 255, 200), font=font)

    return img


# ── Ethiopian pattern border ─────────────────────────────────


def _draw_eth_pattern(draw, x0, y0, x1, y1, color1, color2, cell=12):
    """Draw a simple Ethiopian cross-stitch inspired border pattern."""
    for x in range(x0, x1, cell * 2):
        for y in range(y0, y1, cell * 2):
            cx, cy = x + cell // 2, y + cell // 2
            pts = [(cx, cy - cell // 2), (cx + cell // 2, cy),
                   (cx, cy + cell // 2), (cx - cell // 2, cy)]
            draw.polygon(pts, fill=color1)
            r = cell // 6
            draw.ellipse([(cx - r, cy - r), (cx + r, cy + r)], fill=color2)


# ══════════════════════════════════════════════════════════════
# STYLE 1: CLEAN WHITE
# ══════════════════════════════════════════════════════════════


def _style_clean_white(photo: Image.Image, name: str, price_display: str, desc: str | None,
                       w: int, h: int, shop_slug: str, price_type: str = "fixed",
                       accent_rgb: tuple = BRAND_PURPLE) -> Image.Image:
    """Light #FAFAFA bg, Plus Jakarta Sans, accent-colored price pill, soft shadow photo."""
    bg = (250, 250, 250)
    img = Image.new("RGB", (w, h), bg)
    draw = ImageDraw.Draw(img)
    pad = int(w * 0.06)

    # Accent stripe top
    draw.rectangle([(0, 0), (w, 4)], fill=accent_rgb)

    is_tall = h > w
    photo_h = int(h * 0.55) if not is_tall else int(h * 0.48)
    photo_w = w - pad * 2
    if w > h:
        photo_w = int(w * 0.45)
        photo_h = h - pad * 2

    fitted = _fit(photo, photo_w, photo_h)
    fitted = _round(fitted, 20, bg)
    # Add soft shadow behind photo
    shadowed = _shadow(fitted, offset=6, blur=12, color=(0, 0, 0, 40))

    if w > h:  # Banner
        sx = pad - 6
        sy = pad - 6
        img.paste(shadowed, (sx, sy))
        tx = pad + photo_w + pad + 10
        ty = pad + int(h * 0.08)
        text_w = w - tx - pad

        f_name = _f_jakarta_bold(int(w * 0.038))
        ty = _text_block(draw, name, f_name, tx, ty, text_w, BLACK, max_lines=3)
        ty += int(h * 0.03)

        # Thin divider line
        draw.line([(tx, ty), (tx + int(text_w * 0.3), ty)], fill=(220, 220, 220), width=1)
        ty += int(h * 0.04)

        if desc:
            f_desc = _f_jakarta(int(w * 0.022))
            ty = _text_block(draw, desc, f_desc, tx, ty, text_w, SUBTLE_GRAY, max_lines=2)
            ty += int(h * 0.03)

        # Price pill
        f_price = _f_jakarta_bold(int(w * 0.036))
        pw = _text_w(draw, price_display, f_price)
        pill_y = h - pad - int(w * 0.06)
        _rr(draw, [tx, pill_y, tx + pw + 28, pill_y + int(w * 0.050)],
            radius=14, fill=accent_rgb)
        draw.text((tx + 14, pill_y + 7), price_display, fill=WHITE, font=f_price)
    else:
        sx = pad - 6
        sy = pad + 4
        img.paste(shadowed, (sx, sy))
        y = pad + 10 + photo_h + int(h * 0.03)

        f_name = _f_jakarta_bold(int(w * 0.050))
        y = _text_block(draw, name, f_name, pad, y, w - pad * 2, BLACK, max_lines=2)
        y += int(h * 0.01)

        if desc:
            f_desc = _f_jakarta(int(w * 0.030))
            y = _text_block(draw, desc, f_desc, pad, y, w - pad * 2, SUBTLE_GRAY, max_lines=2)

        # Price pill at bottom
        f_price = _f_jakarta_bold(int(w * 0.050))
        pw = _text_w(draw, price_display, f_price)
        pill_y = h - pad - int(w * 0.09)
        _rr(draw, [pad, pill_y, pad + pw + 36, pill_y + int(w * 0.070)],
            radius=16, fill=accent_rgb)
        draw.text((pad + 18, pill_y + 10), price_display, fill=WHITE, font=f_price)

    return img


# ══════════════════════════════════════════════════════════════
# STYLE 2: BOLD DARK
# ══════════════════════════════════════════════════════════════


def _style_bold_dark(photo: Image.Image, name: str, price_display: str, desc: str | None,
                     w: int, h: int, shop_slug: str, price_type: str = "fixed",
                     accent_rgb: tuple = NEON_CYAN) -> Image.Image:
    """Dark bg, neon accents, dramatic gradient fade on photo."""
    bg = (10, 10, 15)
    img = Image.new("RGB", (w, h), bg)
    draw = ImageDraw.Draw(img)
    pad = int(w * 0.06)

    # Accent-colored top bar + secondary bottom bar
    draw.rectangle([(0, 0), (w, 3)], fill=accent_rgb)
    secondary = NEON_PINK
    draw.rectangle([(0, h - 3), (w, h)], fill=secondary)

    # Glow from top
    glow_h = int(h * 0.15)
    glow_top = tuple(min(255, c // 3 + 15) for c in accent_rgb)
    glow = _gradient(w, glow_h, glow_top, bg)
    img.paste(glow, (0, 0))

    # Subtle noise texture
    img = _noise_overlay(img, intensity=5)
    draw = ImageDraw.Draw(img)

    # Geometric accent lines (top-right corner)
    line_color = (*accent_rgb[:3],) if len(accent_rgb) == 3 else accent_rgb
    for i in range(3):
        offset = i * 18
        draw.line([(w - 120 + offset, 20), (w - 20, 120 - offset)],
                  fill=line_color, width=1)

    if w > h:  # Banner
        photo_w = int(w * 0.45)
        photo_h = h - pad * 2 - 20
        fitted = _fit(photo, photo_w, photo_h)
        fitted = _round(fitted, 16, bg)
        img.paste(fitted, (pad, pad + 10))

        tx = pad + photo_w + pad
        text_w = w - tx - pad

        f_name = _f_dm_bold(int(w * 0.04))
        y = int(h * 0.15)
        y = _text_block(draw, name.upper(), f_name, tx, y, text_w, WHITE, max_lines=2, spacing=1.2)
        y += int(h * 0.06)

        f_price = _f_dm_bold(int(w * 0.050))
        draw.text((tx, h - pad - int(w * 0.07)), price_display, fill=accent_rgb, font=f_price)
    else:
        photo_h = int(h * 0.52) if h > w else int(h * 0.55)
        fitted = _fit(photo, w - pad * 2, photo_h)
        fitted = _round(fitted, 16, bg)
        y_ph = pad + 10
        img.paste(fitted, (pad, y_ph))

        # Gradient fade at bottom of photo
        fade_h = int(photo_h * 0.3)
        for fy in range(fade_h):
            alpha = int(255 * (fy / fade_h))
            draw.line([(pad, y_ph + photo_h - fade_h + fy),
                       (w - pad, y_ph + photo_h - fade_h + fy)],
                      fill=(*bg, alpha) if len(bg) == 3 else bg)

        y = y_ph + photo_h + int(h * 0.03)

        f_name = _f_dm_bold(int(w * 0.055))
        y = _text_block(draw, name.upper(), f_name, pad, y, w - pad * 2, WHITE, max_lines=2, spacing=1.2)

        f_price = _f_dm_bold(int(w * 0.070))
        draw.text((pad, h - pad - int(w * 0.10)), price_display, fill=accent_rgb, font=f_price)

        f_cta = _f_dm_bold(int(w * 0.025))
        cta = _cta_text(price_type)
        cta_w = _text_w(draw, cta, f_cta)
        draw.text((w - pad - cta_w, h - pad - int(w * 0.04)), cta, fill=secondary, font=f_cta)

    return img


# ══════════════════════════════════════════════════════════════
# STYLE 3: MINIMAL LINE
# ══════════════════════════════════════════════════════════════


def _style_minimal_line(photo: Image.Image, name: str, price_display: str, desc: str | None,
                        w: int, h: int, shop_slug: str, price_type: str = "fixed",
                        accent_rgb: tuple = BRAND_PURPLE) -> Image.Image:
    """Pure white, thin line border, serif font, generous whitespace. Restraint IS the design."""
    img = Image.new("RGB", (w, h), WHITE)
    draw = ImageDraw.Draw(img)

    # 1.5px thin line border with generous margin
    border = int(w * 0.04)
    line_color = (190, 190, 190)
    draw.rectangle(
        [(border, border), (w - border, h - border)],
        outline=line_color, width=2,
    )

    pad = int(w * 0.07)  # More generous whitespace

    if w > h:  # Banner
        photo_w = int(w * 0.40)
        photo_h = h - pad * 2 - 20
        fitted = _fit(photo, photo_w, photo_h)
        img.paste(fitted, (pad, pad + 10))

        tx = pad + photo_w + int(w * 0.05)
        text_w = w - tx - pad
        ty = pad + int(h * 0.12)

        f_name = _f_cormorant_bold(int(w * 0.034))
        ty = _text_block(draw, name, f_name, tx, ty, text_w, BLACK, max_lines=3, spacing=1.5)

        ty += int(h * 0.04)
        draw.line([(tx, ty), (tx + int(text_w * 0.35), ty)], fill=line_color, width=1)
        ty += int(h * 0.06)

        f_price = _f_cormorant(int(w * 0.032))
        draw.text((tx, ty), price_display, fill=BLACK, font=f_price)
    else:
        photo_h = int(h * 0.48)
        photo_w = w - pad * 2
        fitted = _fit(photo, photo_w, photo_h)
        img.paste(fitted, (pad, pad + 14))

        y = pad + 14 + photo_h + int(h * 0.04)

        f_name = _f_cormorant_bold(int(w * 0.050))
        y = _text_block(draw, name, f_name, pad, y, w - pad * 2, BLACK, max_lines=2, spacing=1.5)

        y += int(h * 0.015)
        draw.line([(pad, y), (pad + int(w * 0.20), y)], fill=line_color, width=1)
        y += int(h * 0.03)

        if desc:
            f_desc = _f_cormorant(int(w * 0.028))
            y = _text_block(draw, desc, f_desc, pad, y, w - pad * 2, SUBTLE_GRAY, max_lines=2, spacing=1.5)

        f_price = _f_cormorant(int(w * 0.050))
        draw.text((pad, h - pad - int(w * 0.07)), price_display, fill=BLACK, font=f_price)

    return img


# ══════════════════════════════════════════════════════════════
# STYLE 4: ETHIOPIAN
# ══════════════════════════════════════════════════════════════


def _style_ethiopian(photo: Image.Image, name: str, price_display: str, desc: str | None,
                     w: int, h: int, shop_slug: str, price_type: str = "fixed",
                     accent_rgb: tuple = WARM_BROWN) -> Image.Image:
    """Cream bg, Cormorant serif, cross-stitch border pattern, earth tones, gold accents."""
    cream = (253, 246, 236)
    img = Image.new("RGB", (w, h), cream)
    draw = ImageDraw.Draw(img)

    # Use accent to derive earth-tone palette
    price_color = accent_rgb
    border_gold = GOLD

    border_h = int(h * 0.04)
    cell = max(8, int(w * 0.012))
    _draw_eth_pattern(draw, 0, 0, w, border_h, ETH_BORDER, border_gold, cell)
    _draw_eth_pattern(draw, 0, h - border_h, w, h, ETH_BORDER, border_gold, cell)

    side_w = int(w * 0.025)
    _draw_eth_pattern(draw, 0, border_h, side_w, h - border_h, ETH_EARTH, accent_rgb, cell)
    _draw_eth_pattern(draw, w - side_w, border_h, w, h - border_h, ETH_EARTH, accent_rgb, cell)

    pad = side_w + int(w * 0.04)
    content_w = w - pad * 2

    if w > h:  # Banner
        photo_w = int(w * 0.40)
        photo_h = h - border_h * 2 - int(h * 0.08)
        fitted = _fit(photo, photo_w, photo_h)
        fitted = _round(fitted, 12, cream)
        img.paste(fitted, (pad, border_h + int(h * 0.04)))

        tx = pad + photo_w + int(w * 0.04)
        text_w = w - tx - pad
        ty = border_h + int(h * 0.10)

        f_name = _f_cormorant_bold(int(w * 0.035))
        ty = _text_block(draw, name, f_name, tx, ty, text_w, ETH_DARK, max_lines=2)
        ty += int(h * 0.03)

        draw.rectangle([(tx, ty), (tx + int(text_w * 0.5), ty + 2)], fill=border_gold)
        ty += int(h * 0.06)

        f_price = _f_cormorant_bold(int(w * 0.038))
        draw.text((tx, ty), price_display, fill=price_color, font=f_price)
    else:
        photo_h = int(h * 0.48)
        y_start = border_h + int(h * 0.02)
        fitted = _fit(photo, content_w, photo_h)
        fitted = _round(fitted, 12, cream)
        img.paste(fitted, (pad, y_start))

        y = y_start + photo_h + int(h * 0.03)

        f_name = _f_cormorant_bold(int(w * 0.050))
        y = _text_block(draw, name, f_name, pad, y, content_w, ETH_DARK, max_lines=2)

        y += int(h * 0.01)
        draw.rectangle([(pad, y), (pad + int(w * 0.20), y + 3)], fill=border_gold)
        y += int(h * 0.025)

        if desc:
            f_desc = _f_cormorant(int(w * 0.028))
            y = _text_block(draw, desc, f_desc, pad, y, content_w, price_color, max_lines=2)

        f_price = _f_cormorant_bold(int(w * 0.060))
        draw.text((pad, h - border_h - int(w * 0.10)),
                  price_display, fill=price_color, font=f_price)

    return img


# ══════════════════════════════════════════════════════════════
# STYLE 5: FRESH POP (teal gradient, Gen-Z vibrant)
# ══════════════════════════════════════════════════════════════


def _style_fresh_pop(photo: Image.Image, name: str, price_display: str, desc: str | None,
                     w: int, h: int, shop_slug: str, price_type: str = "fixed",
                     accent_rgb: tuple = TEAL) -> Image.Image:
    """Dynamic bg from accent color, polaroid-style frame, blob shapes, vibrant."""
    # Build gradient from accent (darken + lighten)
    dark = tuple(max(0, c - 60) for c in accent_rgb)
    light = tuple(min(255, c + 40) for c in accent_rgb)
    img = _gradient(w, h, dark, light)
    draw = ImageDraw.Draw(img)
    pad = int(w * 0.06)

    # Decorative blob circles (8% opacity)
    img_rgba = img.convert("RGBA")
    for cx, cy, r in [(int(w * 0.85), int(h * 0.15), int(w * 0.18)),
                       (int(w * 0.10), int(h * 0.80), int(w * 0.14)),
                       (int(w * 0.60), int(h * 0.90), int(w * 0.10))]:
        blob = Image.new("RGBA", (r * 2, r * 2), (0, 0, 0, 0))
        ImageDraw.Draw(blob).ellipse([(0, 0), (r * 2, r * 2)], fill=(255, 255, 255, 20))
        img_rgba.paste(blob, (cx - r, cy - r), blob)
    img = img_rgba.convert("RGB")
    draw = ImageDraw.Draw(img)

    pill_text_color = dark  # Price text on white pill

    if w > h:  # Banner
        photo_w = int(w * 0.42)
        photo_h = h - pad * 2
        fitted = _fit(photo, photo_w, photo_h)
        # Polaroid-style white frame
        border = int(w * 0.012)
        frame = Image.new("RGB", (photo_w + border * 2, photo_h + border * 2), WHITE)
        frame.paste(fitted, (border, border))
        frame = _round(frame, 16, dark)
        img.paste(frame, (pad, pad))

        tx = pad + photo_w + border * 2 + pad
        text_w = w - tx - pad
        ty = pad + int(h * 0.10)

        f_name = _f_inter_bold(int(w * 0.042))
        ty = _text_block(draw, name, f_name, tx, ty, text_w, WHITE, max_lines=2, spacing=1.2)
        ty += int(h * 0.04)

        if desc:
            f_desc = _f_inter(int(w * 0.022))
            ty = _text_block(draw, desc, f_desc, tx, ty, text_w, (220, 255, 245), max_lines=2)

        # Price pill
        f_price = _f_inter_bold(int(w * 0.038))
        pw = _text_w(draw, price_display, f_price)
        pill_x = tx
        pill_y = h - pad - int(w * 0.07)
        _rr(draw, [pill_x, pill_y, pill_x + pw + 30, pill_y + int(w * 0.055)],
            radius=16, fill=WHITE)
        draw.text((pill_x + 15, pill_y + 8), price_display, fill=pill_text_color, font=f_price)
    else:
        photo_h = int(h * 0.50)
        photo_inner_w = w - pad * 2 - int(w * 0.04)
        fitted = _fit(photo, photo_inner_w, photo_h)
        # Polaroid frame
        border = int(w * 0.015)
        frame = Image.new("RGB", (photo_inner_w + border * 2, photo_h + border * 2), WHITE)
        frame.paste(fitted, (border, border))
        frame = _round(frame, 20, dark)
        fx = (w - frame.width) // 2
        img.paste(frame, (fx, pad + 10))

        y = pad + 10 + frame.height + int(h * 0.03)

        f_name = _f_inter_bold(int(w * 0.055))
        y = _text_block(draw, name, f_name, pad, y, w - pad * 2, WHITE, max_lines=2, spacing=1.2)
        y += int(h * 0.01)

        if desc:
            f_desc = _f_inter(int(w * 0.028))
            y = _text_block(draw, desc, f_desc, pad, y, w - pad * 2, (220, 255, 245), max_lines=2)

        # Price pill
        f_price = _f_inter_bold(int(w * 0.055))
        pw = _text_w(draw, price_display, f_price)
        pill_x = pad
        pill_y = h - pad - int(w * 0.09)
        _rr(draw, [pill_x, pill_y, pill_x + pw + 40, pill_y + int(w * 0.075)],
            radius=20, fill=WHITE)
        draw.text((pill_x + 20, pill_y + 10), price_display, fill=pill_text_color, font=f_price)

        f_cta = _f_inter_bold(int(w * 0.022))
        cta = _cta_text(price_type)
        cta_w = _text_w(draw, cta, f_cta)
        draw.text((w - pad - cta_w, h - pad - int(w * 0.03)), cta, fill=(220, 255, 245), font=f_cta)

    return img


# ══════════════════════════════════════════════════════════════
# STYLE 6: WARM GRADIENT (peach, lifestyle, polaroid frame)
# ══════════════════════════════════════════════════════════════


def _style_warm_gradient(photo: Image.Image, name: str, price_display: str, desc: str | None,
                         w: int, h: int, shop_slug: str, price_type: str = "fixed",
                         accent_rgb: tuple = CORAL) -> Image.Image:
    """Warm gradient (accent-derived), polaroid frame, grain texture overlay."""
    # Build warm gradient from accent
    warm_light = tuple(min(255, c + 80) for c in accent_rgb)
    warm_bg = tuple(min(255, c + 120) for c in accent_rgb)
    img = _gradient(w, h, warm_bg, warm_light)
    # Grain texture
    img = _noise_overlay(img, intensity=6)
    draw = ImageDraw.Draw(img)
    pad = int(w * 0.06)
    text_dark = (80, 50, 35)

    if w > h:  # Banner
        photo_w = int(w * 0.40)
        photo_h = h - pad * 2 - 30
        fitted = _fit(photo, photo_w, photo_h)

        # Polaroid frame
        border = int(w * 0.015)
        frame_w = photo_w + border * 2
        frame_h = photo_h + border * 2 + int(h * 0.08)
        frame = Image.new("RGB", (frame_w, frame_h), WHITE)
        frame.paste(fitted, (border, border))
        img.paste(frame, (pad, (h - frame_h) // 2))

        tx = pad + frame_w + pad
        text_w = w - tx - pad
        ty = int(h * 0.18)

        f_name = _f_inter_bold(int(w * 0.038))
        ty = _text_block(draw, name, f_name, tx, ty, text_w, text_dark, max_lines=2)
        ty += int(h * 0.04)

        if desc:
            f_desc = _f_inter(int(w * 0.020))
            ty = _text_block(draw, desc, f_desc, tx, ty, text_w, (120, 80, 50), max_lines=2)

        f_price = _f_inter_bold(int(w * 0.042))
        draw.text((tx, h - pad - int(w * 0.06)), price_display, fill=accent_rgb, font=f_price)
    else:
        photo_h = int(h * 0.46)
        photo_w_inner = w - pad * 2 - int(w * 0.06)
        fitted = _fit(photo, photo_w_inner, photo_h)

        border = int(w * 0.020)
        frame_w = photo_w_inner + border * 2
        frame_h = photo_h + border * 2 + int(h * 0.04)
        frame = Image.new("RGB", (frame_w, frame_h), WHITE)
        frame.paste(fitted, (border, border))

        fx = (w - frame_w) // 2
        img.paste(frame, (fx, pad + 10))

        y = pad + 10 + frame_h + int(h * 0.03)

        f_name = _f_inter_bold(int(w * 0.050))
        y = _text_block(draw, name, f_name, pad, y, w - pad * 2, text_dark, max_lines=2)
        y += int(h * 0.01)

        if desc:
            f_desc = _f_inter(int(w * 0.028))
            y = _text_block(draw, desc, f_desc, pad, y, w - pad * 2, (120, 80, 50), max_lines=2)

        f_price = _f_inter_bold(int(w * 0.060))
        draw.text((pad, h - pad - int(w * 0.09)), price_display, fill=accent_rgb, font=f_price)

        f_cta = _f_inter_bold(int(w * 0.023))
        cta = _cta_text(price_type)
        cta_w = _text_w(draw, cta, f_cta)
        draw.text((w - pad - cta_w, h - pad - int(w * 0.035)), cta, fill=text_dark, font=f_cta)

    return img


# ══════════════════════════════════════════════════════════════
# FORMAT DEFINITIONS & MAIN API
# ══════════════════════════════════════════════════════════════

FORMATS = {
    "square": (1080, 1080),
    "story": (1080, 1920),
    "banner": (1200, 628),
    "tile": (600, 600),
}

# Internal style name → function
STYLES = {
    "clean_white": _style_clean_white,
    "bold_dark": _style_bold_dark,
    "minimal_line": _style_minimal_line,
    "ethiopian": _style_ethiopian,
    "fresh_pop": _style_fresh_pop,
    "warm_gradient": _style_warm_gradient,
}

# Template style (from DB) → internal style name
TEMPLATE_TO_STYLE = {
    "clean": "clean_white",
    "bold": "bold_dark",
    "minimal": "minimal_line",
    "ethiopian": "ethiopian",
    "fresh": "fresh_pop",
    "warm": "warm_gradient",
}

DEFAULT_STYLE = "clean_white"

# Brand color → which template style to render
COLOR_TO_TEMPLATE: dict[str, str] = {
    "purple": "clean_white",
    "blue": "clean_white",
    "cyan": "bold_dark",
    "red": "bold_dark",
    "brown": "ethiopian",
    "amber": "ethiopian",
    "teal": "fresh_pop",
    "green": "fresh_pop",
    "charcoal": "minimal_line",
    "orange": "warm_gradient",
    # Legacy style names
    "clean": "clean_white",
    "bold": "bold_dark",
    "minimal": "minimal_line",
    "ethiopian": "ethiopian",
    "fresh": "fresh_pop",
    "warm": "warm_gradient",
}


def _resolve_style(template_style: str | None) -> str:
    """Resolve a template_style (color key) to an internal style function name."""
    return COLOR_TO_TEMPLATE.get(template_style or "purple", DEFAULT_STYLE)


def _dominant_color(photo: Image.Image) -> tuple:
    """Extract dominant color from photo using simple k-means."""
    small = photo.resize((80, 80), Image.LANCZOS)
    arr = np.array(small).reshape(-1, 3).astype(np.float32)

    # Simple k-means: 3 clusters, 3 iterations
    k = 3
    rng = np.random.RandomState(42)
    indices = rng.choice(len(arr), k, replace=False)
    centroids = arr[indices].copy()

    for _ in range(3):
        dists = np.sqrt(((arr[:, np.newaxis] - centroids[np.newaxis]) ** 2).sum(axis=2))
        labels = dists.argmin(axis=1)
        for i in range(k):
            mask = labels == i
            if mask.any():
                centroids[i] = arr[mask].mean(axis=0)

    counts = np.bincount(labels, minlength=k)
    dominant_idx = counts.argmax()
    return tuple(int(c) for c in centroids[dominant_idx])


def _noise_overlay(img: Image.Image, intensity: int = 8) -> Image.Image:
    """Add subtle noise/grain texture to an image."""
    arr = np.array(img).astype(np.int16)
    noise = np.random.RandomState(0).randint(-intensity, intensity + 1, arr.shape, dtype=np.int16)
    arr = np.clip(arr + noise, 0, 255).astype(np.uint8)
    return Image.fromarray(arr)


def _resolve_accent(template_style: str | None) -> tuple:
    """Resolve a template_style key to an RGB accent tuple."""
    hex_color = COLOR_HEX.get(template_style or "purple", "#7C3AED")
    hx = hex_color.lstrip("#")
    return tuple(int(hx[i:i + 2], 16) for i in (0, 2, 4))


def generate_single(
    product_name: str,
    price: int | None = None,
    photo_bytes: bytes = b"",
    fmt: str = "square",
    style: str = DEFAULT_STYLE,
    description: str | None = None,
    shop_slug: str = "",
    watermark: bool = True,
    price_type: str = "fixed",
    template_style: str | None = None,
) -> bytes:
    """Generate one marketing image. Returns PNG bytes."""
    photo = _load_photo(photo_bytes)
    w, h = FORMATS[fmt]

    accent_rgb = _resolve_accent(template_style)
    style_name = _resolve_style(template_style)
    style_fn = STYLES[style_name]
    pd = _price_text(price, price_type)
    img = style_fn(photo, product_name, pd, description, w, h, shop_slug,
                   price_type=price_type, accent_rgb=accent_rgb)
    if watermark:
        img = _watermark(img, shop_slug)

    buf = io.BytesIO()
    img.save(buf, "PNG", optimize=True)
    return buf.getvalue()


def generate_all(
    product_name: str,
    price: int | None = None,
    photo_bytes: bytes = b"",
    description: str | None = None,
    shop_name: str = "",
    shop_slug: str = "",
    style: str = DEFAULT_STYLE,
    watermark: bool = True,
    price_type: str = "fixed",
    template_style: str | None = None,
) -> dict[str, bytes]:
    """
    Generate all 4 formats for a product/service.
    Returns: {"square": bytes, "story": bytes, "banner": bytes, "tile": bytes}
    """
    photo = _load_photo(photo_bytes)

    accent_rgb = _resolve_accent(template_style)
    style_name = _resolve_style(template_style)
    style_fn = STYLES[style_name]
    pd = _price_text(price, price_type)
    results = {}

    for fmt_name, (w, h) in FORMATS.items():
        img = style_fn(photo, product_name, pd, description, w, h, shop_slug,
                       price_type=price_type, accent_rgb=accent_rgb)
        if watermark:
            img = _watermark(img, shop_slug)
        buf = io.BytesIO()
        img.save(buf, "PNG", optimize=True)
        results[fmt_name] = buf.getvalue()

    return results


# ══════════════════════════════════════════════════════════════
# SHOP CARD — shareable promotional image
# ══════════════════════════════════════════════════════════════


def generate_shop_card(
    shop_name: str,
    shop_slug: str,
    theme_hex: str = "#0D9488",
    product_count: int = 0,
    description: str | None = None,
    logo_bytes: bytes | None = None,
) -> bytes:
    """Generate a 1080x1080 shareable shop promotional card. Returns PNG bytes."""
    W, H = 1080, 1080

    hx = theme_hex.lstrip("#")
    theme_rgb = tuple(int(hx[i:i + 2], 16) for i in (0, 2, 4))
    light_rgb = tuple(min(255, c + 50) for c in theme_rgb)

    img = _gradient(W, H, theme_rgb, light_rgb)
    draw = ImageDraw.Draw(img)

    # Decorative circles
    img = img.convert("RGBA")
    circle_lg = Image.new("RGBA", (400, 400), (0, 0, 0, 0))
    ImageDraw.Draw(circle_lg).ellipse([(0, 0), (400, 400)], fill=(255, 255, 255, 25))
    img.paste(circle_lg, (W - 280, -80), circle_lg)
    circle_md = Image.new("RGBA", (280, 280), (0, 0, 0, 0))
    ImageDraw.Draw(circle_md).ellipse([(0, 0), (280, 280)], fill=(255, 255, 255, 18))
    img.paste(circle_md, (-60, H - 240), circle_md)
    circle_sm = Image.new("RGBA", (160, 160), (0, 0, 0, 0))
    ImageDraw.Draw(circle_sm).ellipse([(0, 0), (160, 160)], fill=(255, 255, 255, 12))
    img.paste(circle_sm, (W - 120, H // 2 - 40), circle_sm)

    img = img.convert("RGB")
    draw = ImageDraw.Draw(img)

    y = 260

    # Logo or initial letter
    box_size = 140
    bx = (W - box_size) // 2

    if logo_bytes:
        try:
            logo = _load_photo(logo_bytes)
            logo = _fit(logo, box_size, box_size)
            logo_rgba = logo.convert("RGBA")
            mask = Image.new("L", (box_size, box_size), 0)
            ImageDraw.Draw(mask).rounded_rectangle(
                [(0, 0), (box_size, box_size)], radius=28, fill=255)
            logo_rgba.putalpha(mask)
            img_rgba = img.convert("RGBA")
            img_rgba.paste(logo_rgba, (bx, y), logo_rgba)
            img = img_rgba.convert("RGB")
            draw = ImageDraw.Draw(img)
        except Exception:
            _rr(draw, [bx, y, bx + box_size, y + box_size],
                radius=28, fill=(255, 255, 255, 50))
            f_initial = _f_sans_bold(72)
            _center(draw, shop_name[0].upper(), f_initial, y + 30, W, WHITE)
    else:
        overlay = Image.new("RGBA", (box_size, box_size), (255, 255, 255, 50))
        mask = Image.new("L", (box_size, box_size), 0)
        ImageDraw.Draw(mask).rounded_rectangle(
            [(0, 0), (box_size, box_size)], radius=28, fill=255)
        overlay.putalpha(mask)
        img_rgba = img.convert("RGBA")
        img_rgba.paste(overlay, (bx, y), overlay)
        img = img_rgba.convert("RGB")
        draw = ImageDraw.Draw(img)

        f_initial = _f_sans_bold(72)
        _center(draw, shop_name[0].upper(), f_initial, y + 30, W, WHITE)

    y += box_size + 50

    # Shop name
    f_name = _f_sans_bold(56)
    name_lines = _wrap(shop_name, f_name, W - 160, draw)
    for line in name_lines[:2]:
        _center(draw, line, f_name, y, W, WHITE)
        y += 70
    y += 10

    # Description
    if description:
        f_desc = _f_sans(26)
        desc_lines = _wrap(description, f_desc, W - 200, draw)
        for line in desc_lines[:2]:
            _center(draw, line, f_desc, y, W, (255, 255, 255, 190))
            y += 36
        y += 20

    # Product count badge
    if product_count > 0:
        y += 10
        badge_text = f"Browse {product_count} item{'s' if product_count != 1 else ''}"
        f_badge = _f_sans_bold(24)
        tw = _text_w(draw, badge_text, f_badge)
        pill_w = tw + 48
        pill_h = 48
        px = (W - pill_w) // 2
        _rr(draw, [px, y, px + pill_w, y + pill_h], radius=24, fill=WHITE)
        draw.text((px + 24, y + 11), badge_text, fill=theme_rgb, font=f_badge)
        y += pill_h + 30

    # Catalog URL
    from bot.db.supabase_client import catalog_link
    url = catalog_link(shop_slug)
    f_url = _f_sans(22)
    _center(draw, url, f_url, H - 130, W, (255, 255, 255, 150))

    # Footer
    f_footer = _f_sans_bold(18)
    _center(draw, "Powered by souk.et", f_footer, H - 70, W, (255, 255, 255, 100))

    buf = io.BytesIO()
    img.save(buf, "PNG", optimize=True)
    return buf.getvalue()
