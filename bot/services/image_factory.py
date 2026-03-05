"""
Suq Content Factory — generates 4 marketing image formats per product.

Formats:
  - square   (1080×1080) — Instagram feed, Facebook, Telegram
  - story    (1080×1920) — Instagram Story, TikTok, Reels
  - banner   (1200×628)  — Facebook/Twitter share, Telegram header
  - tile     (600×600)   — Web catalog, WhatsApp catalog

Styles (from product brief):
  - clean_white    — White/cream bg, product centered, price in brand color
  - bold_dark      — Black bg, dramatic shadow, neon gradient price, high contrast
  - minimal_line   — Thin line border, serif font, lots of white space
  - ethiopian      — Warm earth tones, traditional pattern border, brown/gold
"""

import io
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

# ── Suq Brand Colors ────────────────────────────────────────

WHITE = (255, 255, 255)
OFF_WHITE = (250, 248, 245)
CREAM = (252, 249, 243)
BLACK = (20, 20, 20)
DARK_BG = (18, 18, 24)
BRAND_PURPLE = (110, 60, 180)       # Price accent (from brief)
NEON_CYAN = (0, 230, 255)           # Bold dark neon price
NEON_PINK = (255, 50, 150)          # Neon gradient accent
GOLD = (200, 165, 75)
WARM_BROWN = (140, 85, 50)
WARM_BG = (245, 235, 220)
WARM_CREAM = (250, 240, 225)
ETH_EARTH = (165, 120, 70)          # Ethiopian earth tone
ETH_BORDER = (180, 135, 75)
ETH_DARK = (80, 50, 25)
SUBTLE_GRAY = (140, 140, 150)

WIN_FONTS = "C:/Windows/Fonts"

# ── Font cache ───────────────────────────────────────────────

_font_cache: dict[tuple, ImageFont.FreeTypeFont] = {}


def _load_font(names: list[str], size: int) -> ImageFont.FreeTypeFont:
    """Cached font loader — Windows + Linux paths."""
    key = (tuple(names), size)
    if key in _font_cache:
        return _font_cache[key]
    bases = [
        WIN_FONTS,
        "/usr/share/fonts/truetype/dejavu",
        "/usr/share/fonts/truetype/liberation",
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


# Font presets
def _f_sans_bold(size): return _load_font(["arialbd.ttf", "calibrib.ttf", "DejaVuSans-Bold.ttf"], size)
def _f_sans(size): return _load_font(["arial.ttf", "calibri.ttf", "DejaVuSans.ttf"], size)
def _f_serif_bold(size): return _load_font(["georgiab.ttf", "timesbd.ttf", "DejaVuSerif-Bold.ttf"], size)
def _f_serif(size): return _load_font(["georgia.ttf", "times.ttf", "DejaVuSerif.ttf"], size)


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


# ── Fast gradient (numpy, not pixel-by-pixel) ────────────────


def _gradient(w: int, h: int, top: tuple, bot: tuple) -> Image.Image:
    """Fast vertical gradient using numpy."""
    arr = np.zeros((h, w, 3), dtype=np.uint8)
    for c in range(3):
        arr[:, :, c] = np.linspace(top[c], bot[c], h, dtype=np.uint8)[:, np.newaxis]
    return Image.fromarray(arr)


# ── Watermark (the viral engine) ─────────────────────────────


def _watermark(img: Image.Image, shop_slug: str = "") -> Image.Image:
    """Subtle branded watermark: suq.shop/slug or 'suq.shop'."""
    img = img.copy()
    draw = ImageDraw.Draw(img)
    w, h = img.size

    text = f"suq.shop/{shop_slug}" if shop_slug else "suq.shop"
    font_size = max(12, int(w * 0.018))
    font = _f_sans(font_size)

    tw = _text_w(draw, text, font)
    th = font_size

    # Bottom center — clean pill
    px, py = (w - tw) // 2 - 12, h - th - 16
    _rr(draw, [px, py - 4, px + tw + 24, py + th + 8], radius=12,
        fill=(0, 0, 0), outline=None)
    draw.text((px + 12, py), text, fill=(255, 255, 255, 200), font=font)

    return img


# ── Ethiopian pattern border (geometric, not decorative font) ─


def _draw_eth_pattern(draw, x0, y0, x1, y1, color1, color2, cell=12):
    """Draw a simple Ethiopian cross-stitch inspired border pattern."""
    for x in range(x0, x1, cell * 2):
        for y in range(y0, y1, cell * 2):
            # Diamond pattern
            cx, cy = x + cell // 2, y + cell // 2
            pts = [(cx, cy - cell // 2), (cx + cell // 2, cy),
                   (cx, cy + cell // 2), (cx - cell // 2, cy)]
            draw.polygon(pts, fill=color1)
            # Small dot in center
            r = cell // 6
            draw.ellipse([(cx - r, cy - r), (cx + r, cy + r)], fill=color2)


# ══════════════════════════════════════════════════════════════
# STYLE 1: CLEAN WHITE
# ══════════════════════════════════════════════════════════════


def _style_clean_white(photo: Image.Image, name: str, price: int, desc: str | None,
                       w: int, h: int, shop_slug: str) -> Image.Image:
    """White/cream bg, product centered, price in brand purple, clean sans-serif."""
    img = Image.new("RGB", (w, h), CREAM)
    draw = ImageDraw.Draw(img)
    pad = int(w * 0.06)

    # Subtle top accent line
    draw.rectangle([(0, 0), (w, 4)], fill=BRAND_PURPLE)

    # Photo — large, rounded, with subtle shadow
    is_tall = h > w  # story format
    photo_h = int(h * 0.58) if not is_tall else int(h * 0.50)
    photo_w = w - pad * 2
    if w > h:  # banner — photo on left
        photo_w = int(w * 0.45)
        photo_h = h - pad * 2

    fitted = _fit(photo, photo_w, photo_h)
    fitted = _round(fitted, 20, CREAM)

    if w > h:  # Banner layout: photo left, text right
        img.paste(fitted, (pad, pad))
        tx = pad + photo_w + pad
        ty = pad + int(h * 0.08)
        text_w = w - tx - pad

        f_name = _f_sans_bold(int(w * 0.038))
        ty = _text_block(draw, name, f_name, tx, ty, text_w, BLACK, max_lines=3)
        ty += int(h * 0.04)

        if desc:
            f_desc = _f_sans(int(w * 0.022))
            ty = _text_block(draw, desc, f_desc, tx, ty, text_w, SUBTLE_GRAY, max_lines=2)
            ty += int(h * 0.03)

        f_price = _f_sans_bold(int(w * 0.045))
        draw.text((tx, h - pad - int(w * 0.06)), f"{price:,} Birr", fill=BRAND_PURPLE, font=f_price)
    else:
        # Square / story / tile: photo top, text below
        img.paste(fitted, (pad, pad + 10))
        y = pad + 10 + photo_h + int(h * 0.03)

        f_name = _f_sans_bold(int(w * 0.050))
        y = _text_block(draw, name, f_name, pad, y, w - pad * 2, BLACK, max_lines=2)
        y += int(h * 0.01)

        if desc:
            f_desc = _f_sans(int(w * 0.030))
            y = _text_block(draw, desc, f_desc, pad, y, w - pad * 2, SUBTLE_GRAY, max_lines=2)

        # Price — large, brand purple
        f_price = _f_sans_bold(int(w * 0.065))
        price_text = f"{price:,} Birr"
        draw.text((pad, h - pad - int(w * 0.08)), price_text, fill=BRAND_PURPLE, font=f_price)

    return img


# ══════════════════════════════════════════════════════════════
# STYLE 2: BOLD DARK
# ══════════════════════════════════════════════════════════════


def _style_bold_dark(photo: Image.Image, name: str, price: int, desc: str | None,
                     w: int, h: int, shop_slug: str) -> Image.Image:
    """Black bg, dramatic product, neon gradient price text, high contrast."""
    img = Image.new("RGB", (w, h), DARK_BG)
    draw = ImageDraw.Draw(img)
    pad = int(w * 0.06)

    # Neon accent lines — top and bottom
    draw.rectangle([(0, 0), (w, 3)], fill=NEON_CYAN)
    draw.rectangle([(0, h - 3), (w, h)], fill=NEON_PINK)

    # Subtle radial glow behind photo area (simulated with gradient rectangle)
    glow_h = int(h * 0.15)
    glow = _gradient(w, glow_h, (30, 30, 50), DARK_BG)
    img.paste(glow, (0, 0))

    if w > h:  # Banner
        photo_w = int(w * 0.45)
        photo_h = h - pad * 2 - 20
        fitted = _fit(photo, photo_w, photo_h)
        fitted = _round(fitted, 16, DARK_BG)
        img.paste(fitted, (pad, pad + 10))

        tx = pad + photo_w + pad
        text_w = w - tx - pad

        f_name = _f_sans_bold(int(w * 0.04))
        y = int(h * 0.15)
        y = _text_block(draw, name.upper(), f_name, tx, y, text_w, WHITE, max_lines=2, spacing=1.2)
        y += int(h * 0.06)

        # Neon price
        f_price = _f_sans_bold(int(w * 0.055))
        draw.text((tx, h - pad - int(w * 0.07)), f"{price:,} Birr", fill=NEON_CYAN, font=f_price)
    else:
        # Photo — dramatic, nearly full width
        photo_h = int(h * 0.52) if h > w else int(h * 0.55)
        fitted = _fit(photo, w - pad * 2, photo_h)
        fitted = _round(fitted, 16, DARK_BG)
        y_ph = pad + 10
        img.paste(fitted, (pad, y_ph))

        # Gradient overlay on bottom of photo (fade to dark)
        fade_h = int(photo_h * 0.3)
        for fy in range(fade_h):
            alpha = int(200 * (fy / fade_h))
            draw.line([(pad, y_ph + photo_h - fade_h + fy),
                       (w - pad, y_ph + photo_h - fade_h + fy)],
                      fill=(18, 18, 24))  # We just darken; alpha needs RGBA

        y = y_ph + photo_h + int(h * 0.03)

        f_name = _f_sans_bold(int(w * 0.055))
        y = _text_block(draw, name.upper(), f_name, pad, y, w - pad * 2, WHITE, max_lines=2, spacing=1.2)

        # Neon price — big, eye-catching
        f_price = _f_sans_bold(int(w * 0.075))
        price_text = f"{price:,} Birr"
        draw.text((pad, h - pad - int(w * 0.10)), price_text, fill=NEON_CYAN, font=f_price)

        # Subtle "ORDER NOW" CTA
        f_cta = _f_sans_bold(int(w * 0.025))
        cta_text = "ORDER NOW →"
        cta_w = _text_w(draw, cta_text, f_cta)
        draw.text((w - pad - cta_w, h - pad - int(w * 0.04)), cta_text, fill=NEON_PINK, font=f_cta)

    return img


# ══════════════════════════════════════════════════════════════
# STYLE 3: MINIMAL LINE
# ══════════════════════════════════════════════════════════════


def _style_minimal_line(photo: Image.Image, name: str, price: int, desc: str | None,
                        w: int, h: int, shop_slug: str) -> Image.Image:
    """Thin line border, elegant serif, lots of white space. Premium/luxury feel."""
    img = Image.new("RGB", (w, h), WHITE)
    draw = ImageDraw.Draw(img)

    # Thin elegant border
    border = int(w * 0.03)
    inner_pad = int(w * 0.06)
    draw.rectangle(
        [(border, border), (w - border, h - border)],
        outline=(180, 180, 180), width=1,
    )

    pad = inner_pad

    if w > h:  # Banner
        photo_w = int(w * 0.40)
        photo_h = h - pad * 2 - 20
        fitted = _fit(photo, photo_w, photo_h)
        img.paste(fitted, (pad, pad + 10))

        tx = pad + photo_w + int(w * 0.05)
        text_w = w - tx - pad
        ty = pad + int(h * 0.12)

        f_name = _f_serif_bold(int(w * 0.032))
        ty = _text_block(draw, name, f_name, tx, ty, text_w, BLACK, max_lines=3)

        # Thin rule
        ty += int(h * 0.04)
        draw.line([(tx, ty), (tx + int(text_w * 0.4), ty)], fill=(200, 200, 200), width=1)
        ty += int(h * 0.06)

        f_price = _f_serif(int(w * 0.035))
        draw.text((tx, ty), f"{price:,} Birr", fill=BLACK, font=f_price)
    else:
        # Photo — generous white space
        photo_h = int(h * 0.50)
        photo_w = w - pad * 2
        fitted = _fit(photo, photo_w, photo_h)
        img.paste(fitted, (pad, pad + 10))

        y = pad + photo_h + int(h * 0.04)

        # Name — serif, elegant
        f_name = _f_serif_bold(int(w * 0.048))
        y = _text_block(draw, name, f_name, pad, y, w - pad * 2, BLACK, max_lines=2, spacing=1.4)

        # Thin horizontal rule
        y += int(h * 0.01)
        draw.line([(pad, y), (pad + int(w * 0.25), y)], fill=(200, 200, 200), width=1)
        y += int(h * 0.03)

        # Description — italic feel (lighter weight)
        if desc:
            f_desc = _f_serif(int(w * 0.028))
            y = _text_block(draw, desc, f_desc, pad, y, w - pad * 2, SUBTLE_GRAY, max_lines=2)
            y += int(h * 0.01)

        # Price — understated elegance
        f_price = _f_serif(int(w * 0.055))
        draw.text((pad, h - pad - int(w * 0.07)), f"{price:,} Birr", fill=BLACK, font=f_price)

    return img


# ══════════════════════════════════════════════════════════════
# STYLE 4: ETHIOPIAN
# ══════════════════════════════════════════════════════════════


def _style_ethiopian(photo: Image.Image, name: str, price: int, desc: str | None,
                     w: int, h: int, shop_slug: str) -> Image.Image:
    """Warm earth tones, traditional cross-stitch border, brown/gold palette."""
    img = Image.new("RGB", (w, h), WARM_CREAM)
    draw = ImageDraw.Draw(img)

    # Pattern border — top and bottom bands
    border_h = int(h * 0.04)
    cell = max(8, int(w * 0.012))
    _draw_eth_pattern(draw, 0, 0, w, border_h, ETH_BORDER, GOLD, cell)
    _draw_eth_pattern(draw, 0, h - border_h, w, h, ETH_BORDER, GOLD, cell)

    # Side accents (thin vertical pattern strips)
    side_w = int(w * 0.025)
    _draw_eth_pattern(draw, 0, border_h, side_w, h - border_h, ETH_EARTH, WARM_BROWN, cell)
    _draw_eth_pattern(draw, w - side_w, border_h, w, h - border_h, ETH_EARTH, WARM_BROWN, cell)

    pad = side_w + int(w * 0.04)
    content_w = w - pad * 2

    if w > h:  # Banner
        photo_w = int(w * 0.40)
        photo_h = h - border_h * 2 - int(h * 0.08)
        fitted = _fit(photo, photo_w, photo_h)
        fitted = _round(fitted, 12, WARM_CREAM)
        img.paste(fitted, (pad, border_h + int(h * 0.04)))

        tx = pad + photo_w + int(w * 0.04)
        text_w = w - tx - pad
        ty = border_h + int(h * 0.10)

        f_name = _f_serif_bold(int(w * 0.035))
        ty = _text_block(draw, name, f_name, tx, ty, text_w, ETH_DARK, max_lines=2)
        ty += int(h * 0.03)

        # Gold rule
        draw.rectangle([(tx, ty), (tx + int(text_w * 0.5), ty + 2)], fill=GOLD)
        ty += int(h * 0.06)

        f_price = _f_serif_bold(int(w * 0.042))
        draw.text((tx, ty), f"{price:,} Birr", fill=WARM_BROWN, font=f_price)
    else:
        # Photo
        photo_h = int(h * 0.48)
        y_start = border_h + int(h * 0.02)
        fitted = _fit(photo, content_w, photo_h)
        fitted = _round(fitted, 12, WARM_CREAM)
        img.paste(fitted, (pad, y_start))

        y = y_start + photo_h + int(h * 0.03)

        # Name — warm serif
        f_name = _f_serif_bold(int(w * 0.050))
        y = _text_block(draw, name, f_name, pad, y, content_w, ETH_DARK, max_lines=2)

        # Gold accent line
        y += int(h * 0.01)
        draw.rectangle([(pad, y), (pad + int(w * 0.20), y + 3)], fill=GOLD)
        y += int(h * 0.025)

        if desc:
            f_desc = _f_serif(int(w * 0.028))
            y = _text_block(draw, desc, f_desc, pad, y, content_w, WARM_BROWN, max_lines=2)

        # Price — gold
        f_price = _f_serif_bold(int(w * 0.065))
        draw.text((pad, h - border_h - int(w * 0.10)),
                  f"{price:,} Birr", fill=WARM_BROWN, font=f_price)

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

STYLES = {
    "clean_white": _style_clean_white,
    "bold_dark": _style_bold_dark,
    "minimal_line": _style_minimal_line,
    "ethiopian": _style_ethiopian,
}

# Default style
DEFAULT_STYLE = "clean_white"


def generate_single(
    product_name: str,
    price: int,
    photo_bytes: bytes,
    fmt: str = "square",
    style: str = DEFAULT_STYLE,
    description: str | None = None,
    shop_slug: str = "",
    watermark: bool = True,
) -> bytes:
    """Generate one marketing image. Returns PNG bytes."""
    photo = _load_photo(photo_bytes)
    w, h = FORMATS[fmt]
    style_fn = STYLES.get(style, STYLES[DEFAULT_STYLE])

    img = style_fn(photo, product_name, price, description, w, h, shop_slug)
    if watermark:
        img = _watermark(img, shop_slug)

    buf = io.BytesIO()
    img.save(buf, "PNG", optimize=True)
    return buf.getvalue()


def generate_all(
    product_name: str,
    price: int,
    photo_bytes: bytes,
    description: str | None = None,
    shop_name: str = "",
    shop_slug: str = "",
    style: str = DEFAULT_STYLE,
    watermark: bool = True,
) -> dict[str, bytes]:
    """
    Generate all 4 formats for a product.
    Returns: {"square": bytes, "story": bytes, "banner": bytes, "tile": bytes}
    """
    photo = _load_photo(photo_bytes)
    style_fn = STYLES.get(style, STYLES[DEFAULT_STYLE])
    results = {}

    for fmt_name, (w, h) in FORMATS.items():
        img = style_fn(photo, product_name, price, description, w, h, shop_slug)
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
    """
    Generate a 1080x1080 shareable shop promotional card.
    Returns PNG bytes.
    """
    W, H = 1080, 1080

    # Parse theme color to RGB
    hx = theme_hex.lstrip("#")
    theme_rgb = tuple(int(hx[i:i + 2], 16) for i in (0, 2, 4))
    # Lighter variant for gradient bottom
    light_rgb = tuple(min(255, c + 50) for c in theme_rgb)

    # Background gradient
    img = _gradient(W, H, theme_rgb, light_rgb)
    draw = ImageDraw.Draw(img)

    # Decorative semi-transparent circles (matching web header)
    img = img.convert("RGBA")
    # Large circle top-right
    circle_lg = Image.new("RGBA", (400, 400), (0, 0, 0, 0))
    ImageDraw.Draw(circle_lg).ellipse([(0, 0), (400, 400)],
                                       fill=(255, 255, 255, 25))
    img.paste(circle_lg, (W - 280, -80), circle_lg)
    # Medium circle bottom-left
    circle_md = Image.new("RGBA", (280, 280), (0, 0, 0, 0))
    ImageDraw.Draw(circle_md).ellipse([(0, 0), (280, 280)],
                                       fill=(255, 255, 255, 18))
    img.paste(circle_md, (-60, H - 240), circle_md)
    # Small circle mid-right
    circle_sm = Image.new("RGBA", (160, 160), (0, 0, 0, 0))
    ImageDraw.Draw(circle_sm).ellipse([(0, 0), (160, 160)],
                                       fill=(255, 255, 255, 12))
    img.paste(circle_sm, (W - 120, H // 2 - 40), circle_sm)

    img = img.convert("RGB")
    draw = ImageDraw.Draw(img)

    y = 260  # Start content area

    # ── Logo or initial letter ───────────────────────────────
    box_size = 140
    bx = (W - box_size) // 2

    if logo_bytes:
        try:
            logo = _load_photo(logo_bytes)
            logo = _fit(logo, box_size, box_size)
            # Rounded corners with transparent background
            logo_rgba = logo.convert("RGBA")
            mask = Image.new("L", (box_size, box_size), 0)
            ImageDraw.Draw(mask).rounded_rectangle(
                [(0, 0), (box_size, box_size)], radius=28, fill=255)
            logo_rgba.putalpha(mask)
            # Shadow backing
            backing = Image.new("RGBA", (box_size, box_size), (0, 0, 0, 0))
            img_rgba = img.convert("RGBA")
            img_rgba.paste(logo_rgba, (bx, y), logo_rgba)
            img = img_rgba.convert("RGB")
            draw = ImageDraw.Draw(img)
        except Exception:
            # Fallback to initial letter
            _rr(draw, [bx, y, bx + box_size, y + box_size],
                radius=28, fill=(255, 255, 255, 50))
            f_initial = _f_sans_bold(72)
            _center(draw, shop_name[0].upper(), f_initial, y + 30, W, WHITE)
    else:
        # Styled initial letter in frosted square
        # Draw semi-transparent white box
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

    # ── Shop name ────────────────────────────────────────────
    f_name = _f_sans_bold(56)
    # Wrap if name is long
    name_lines = _wrap(shop_name, f_name, W - 160, draw)
    for line in name_lines[:2]:
        _center(draw, line, f_name, y, W, WHITE)
        y += 70
    y += 10

    # ── Description ──────────────────────────────────────────
    if description:
        f_desc = _f_sans(26)
        desc_lines = _wrap(description, f_desc, W - 200, draw)
        for line in desc_lines[:2]:
            _center(draw, line, f_desc, y, W, (255, 255, 255, 190))
            y += 36
        y += 20

    # ── Product count badge ──────────────────────────────────
    if product_count > 0:
        y += 10
        badge_text = f"Browse {product_count} product{'s' if product_count != 1 else ''}"
        f_badge = _f_sans_bold(24)
        tw = _text_w(draw, badge_text, f_badge)
        pill_w = tw + 48
        pill_h = 48
        px = (W - pill_w) // 2
        _rr(draw, [px, y, px + pill_w, y + pill_h], radius=24, fill=WHITE)
        draw.text((px + 24, y + 11), badge_text, fill=theme_rgb, font=f_badge)
        y += pill_h + 30

    # ── Catalog URL ──────────────────────────────────────────
    from bot.db.supabase_client import catalog_link
    url = catalog_link(shop_slug)
    f_url = _f_sans(22)
    _center(draw, url, f_url, H - 130, W, (255, 255, 255, 150))

    # ── Powered by Suq ──────────────────────────────────────
    f_footer = _f_sans_bold(18)
    _center(draw, "Powered by Suq", f_footer, H - 70, W, (255, 255, 255, 100))

    buf = io.BytesIO()
    img.save(buf, "PNG", optimize=True)
    return buf.getvalue()
