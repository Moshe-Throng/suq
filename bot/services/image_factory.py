"""
Suq Content Factory — generates 4 marketing image formats per product/service.

Formats:
  square  (1080×1080) — Instagram feed, Telegram
  story   (1080×1920) — Instagram Story, TikTok
  banner  (1200×628)  — Facebook/Twitter header
  tile    (600×600)   — web catalog card

Design: clean product card — photo always fully visible, brand accent color pill.
"""

import io
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

# ── Palette ──────────────────────────────────────────────────

BG           = (250, 250, 250)   # near-white canvas
PHOTO_BG     = (238, 238, 242)   # subtle gray behind product photo
WHITE        = (255, 255, 255)
BLACK        = (20, 20, 24)
TEXT_DARK    = (22, 22, 28)
TEXT_GRAY    = (108, 114, 128)
DIVIDER      = (220, 220, 226)

# ── Brand color map (template_style → hex) ───────────────────

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
    # legacy names
    "clean":     "#7C3AED",
    "bold":      "#06B6D4",
    "minimal":   "#374151",
    "ethiopian": "#92400E",
    "fresh":     "#0D9488",
    "warm":      "#EA580C",
}

# ── Font paths ───────────────────────────────────────────────

_CUSTOM = str(Path(__file__).parent.parent / "fonts")
_SYSTEM_PATHS = [
    "/usr/share/fonts/truetype/dejavu",
    "/usr/share/fonts/truetype/liberation",
    "C:/Windows/Fonts",
]
_font_cache: dict[tuple, ImageFont.FreeTypeFont] = {}


def _font(names: list[str], size: int) -> ImageFont.FreeTypeFont:
    key = (tuple(names), size)
    if key in _font_cache:
        return _font_cache[key]
    for name in names:
        for base in [_CUSTOM] + _SYSTEM_PATHS:
            try:
                f = ImageFont.truetype(f"{base}/{name}", size)
                _font_cache[key] = f
                return f
            except Exception:
                pass
    try:
        f = ImageFont.load_default(size=size)
    except TypeError:
        f = ImageFont.load_default()
    _font_cache[key] = f
    return f


def _bold(size: int) -> ImageFont.FreeTypeFont:
    return _font(["DMSans-Bold.ttf", "PlusJakartaSans-Bold.ttf",
                  "LiberationSans-Bold.ttf", "DejaVuSans-Bold.ttf", "arialbd.ttf"], size)


def _regular(size: int) -> ImageFont.FreeTypeFont:
    return _font(["DMSans-Regular.ttf", "PlusJakartaSans-Regular.ttf",
                  "LiberationSans-Regular.ttf", "DejaVuSans.ttf", "arial.ttf"], size)


# ── Layout helpers ───────────────────────────────────────────


def _wrap(text: str, font, max_w: int, draw: ImageDraw.Draw) -> list[str]:
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


def _draw_text_block(draw, text, font, x, y, max_w, color, max_lines=2, line_gap=1.25) -> int:
    """Draw wrapped text block. Returns y after last line."""
    lines = _wrap(text, font, max_w, draw)
    lh = int(font.size * line_gap)
    for line in lines[:max_lines]:
        draw.text((x, y), line, fill=color, font=font)
        y += lh
    return y


def _center_text(draw, text, font, y, canvas_w, color) -> int:
    """Draw horizontally centered text. Returns y after line."""
    bb = draw.textbbox((0, 0), text, font=font)
    x = (canvas_w - (bb[2] - bb[0])) // 2
    draw.text((x, y), text, fill=color, font=font)
    return y + int(font.size * 1.3)


def _text_w(draw, text, font) -> int:
    return draw.textbbox((0, 0), text, font=font)[2]


def _pill(draw, x, y, text, font, bg, fg, h_pad=20, v_pad=10) -> tuple[int, int]:
    """Draw a rounded pill. Returns (pill_width, pill_height)."""
    tw = _text_w(draw, text, font)
    pw = tw + h_pad * 2
    ph = font.size + v_pad * 2
    r = ph // 2
    draw.rounded_rectangle([x, y, x + pw, y + ph], radius=r, fill=bg)
    draw.text((x + h_pad, y + v_pad), text, fill=fg, font=font)
    return pw, ph


# ── Photo processing ─────────────────────────────────────────


def _load_photo(photo_bytes: bytes) -> Image.Image:
    return Image.open(io.BytesIO(photo_bytes)).convert("RGB")


def _fit_contain(photo: Image.Image, tw: int, th: int,
                 bg: tuple = PHOTO_BG, margin: float = 0.05) -> Image.Image:
    """
    Scale photo to fit fully within (tw × th) without cropping.
    Pads the empty area with bg. A small margin keeps the product from
    touching the edges.
    """
    iw, ih = photo.size
    # Reserve margin inside the box
    inner_w = int(tw * (1 - margin * 2))
    inner_h = int(th * (1 - margin * 2))
    scale = min(inner_w / iw, inner_h / ih)
    nw = max(1, int(iw * scale))
    nh = max(1, int(ih * scale))
    resized = photo.resize((nw, nh), Image.LANCZOS)
    canvas = Image.new("RGB", (tw, th), bg)
    x = (tw - nw) // 2
    y = (th - nh) // 2
    canvas.paste(resized, (x, y))
    return canvas


def _gradient(w: int, h: int, top: tuple, bot: tuple) -> Image.Image:
    img = Image.new("RGB", (w, h))
    draw = ImageDraw.Draw(img)
    for y in range(h):
        t = y / max(h - 1, 1)
        color = tuple(int(top[c] + (bot[c] - top[c]) * t) for c in range(3))
        draw.line([(0, y), (w - 1, y)], fill=color)
    return img


def _resolve_accent(template_style: str | None) -> tuple:
    hx = COLOR_HEX.get(template_style or "purple", "#7C3AED").lstrip("#")
    return tuple(int(hx[i:i + 2], 16) for i in (0, 2, 4))


def _price_text(price: int | None, price_type: str = "fixed") -> str:
    if price_type == "contact" or price is None:
        return "Contact for pricing"
    if price_type == "starting_from":
        return f"From {price:,} Birr"
    return f"{price:,} Birr"


def _watermark(draw, text: str, canvas_w: int, canvas_h: int) -> None:
    """Draw a small pill watermark at the bottom center."""
    font = _regular(max(14, int(canvas_w * 0.018)))
    tw = _text_w(draw, text, font)
    pw, ph = tw + 20, font.size + 10
    px = (canvas_w - pw) // 2
    py = canvas_h - ph - 12
    draw.rounded_rectangle([px, py, px + pw, py + ph], radius=ph // 2,
                            fill=(0, 0, 0))
    draw.text((px + 10, py + 5), text, fill=(255, 255, 255), font=font)


# ══════════════════════════════════════════════════════════════
# SINGLE PRODUCT CARD STYLE
# All 4 formats use this. Layout adapts to aspect ratio.
# ══════════════════════════════════════════════════════════════


def _product_card(photo: Image.Image, name: str, price_display: str,
                  desc: str | None, w: int, h: int,
                  shop_slug: str, accent: tuple) -> Image.Image:

    is_banner = w > h * 1.1   # landscape (banner)
    is_story  = h > w * 1.5   # tall (story)

    img = Image.new("RGB", (w, h), BG)
    draw = ImageDraw.Draw(img)
    pad = int(w * 0.058)      # ~63px on 1080

    # ── Accent bar (top) ─────────────────────────────────────
    bar_h = max(5, int(h * 0.004))
    draw.rectangle([(0, 0), (w, bar_h)], fill=accent)

    if is_banner:
        # ── BANNER layout: photo left, info right ────────────
        split = int(w * 0.46)           # photo column width

        # Photo area
        draw.rectangle([(0, bar_h), (split, h)], fill=PHOTO_BG)
        photo_img = _fit_contain(photo, split, h - bar_h, PHOTO_BG, margin=0.06)
        img.paste(photo_img, (0, bar_h))

        # Thin right-edge shadow on photo (simple lines, no numpy)
        for i in range(6):
            shade = 235 - i * 8
            draw.line([(split - 6 + i, bar_h), (split - 6 + i, h)],
                      fill=(shade, shade, shade + 2))

        # Info column
        ix = split + pad
        info_w = w - ix - pad
        iy = int(h * 0.15)

        f_name = _bold(int(w * 0.034))
        iy = _draw_text_block(draw, name, f_name, ix, iy, info_w,
                              TEXT_DARK, max_lines=2, line_gap=1.3)
        iy += int(h * 0.04)

        # Accent divider
        draw.rectangle([ix, iy, ix + int(info_w * 0.28), iy + 3], fill=accent)
        iy += int(h * 0.07)

        if desc:
            f_desc = _regular(int(w * 0.019))
            iy = _draw_text_block(draw, desc, f_desc, ix, iy, info_w,
                                  TEXT_GRAY, max_lines=2)
            iy += int(h * 0.03)

        # Price pill
        f_price = _bold(int(w * 0.030))
        _pill(draw, ix, h - pad - int(w * 0.056),
              price_display, f_price, accent, WHITE,
              h_pad=18, v_pad=9)

    elif is_story:
        # ── STORY layout: photo top 48%, info bottom 52% ─────
        photo_h = int(h * 0.48)

        draw.rectangle([(0, bar_h), (w, photo_h)], fill=PHOTO_BG)
        photo_img = _fit_contain(photo, w, photo_h - bar_h, PHOTO_BG, margin=0.05)
        img.paste(photo_img, (0, bar_h))

        # Shadow line separating photo from info
        for i in range(6):
            gray = 200 + i * 5
            draw.line([(0, photo_h + i), (w, photo_h + i)], fill=(gray, gray, gray + 4))

        iy = photo_h + int(h * 0.04)

        f_name = _bold(int(w * 0.060))
        iy = _draw_text_block(draw, name, f_name, pad, iy, w - pad * 2,
                              TEXT_DARK, max_lines=2, line_gap=1.3)
        iy += int(h * 0.015)

        if desc:
            f_desc = _regular(int(w * 0.032))
            iy = _draw_text_block(draw, desc, f_desc, pad, iy, w - pad * 2,
                                  TEXT_GRAY, max_lines=2)
            iy += int(h * 0.015)

        # Accent divider
        draw.rectangle([pad, iy, pad + int(w * 0.20), iy + 3], fill=accent)
        iy += int(h * 0.04)

        # Price pill
        f_price = _bold(int(w * 0.060))
        _pill(draw, pad, iy, price_display, f_price, accent, WHITE,
              h_pad=22, v_pad=12)
        iy += int(w * 0.060) + 24 + int(h * 0.04)

        # CTA
        f_cta = _bold(int(w * 0.030))
        cta = "ORDER NOW →" if price_display != "Contact for pricing" else "INQUIRE →"
        draw.text((pad, iy), cta, fill=accent, font=f_cta)

    else:
        # ── SQUARE / TILE layout: photo top 56%, info bottom ─
        photo_h = int(h * 0.56)

        draw.rectangle([(0, bar_h), (w, photo_h)], fill=PHOTO_BG)
        photo_img = _fit_contain(photo, w, photo_h - bar_h, PHOTO_BG, margin=0.05)
        img.paste(photo_img, (0, bar_h))

        # Shadow line
        for i in range(5):
            gray = 202 + i * 6
            draw.line([(0, photo_h + i), (w, photo_h + i)], fill=(gray, gray, gray + 4))

        iy = photo_h + int(h * 0.04)

        f_name = _bold(int(w * 0.052))
        iy = _draw_text_block(draw, name, f_name, pad, iy, w - pad * 2,
                              TEXT_DARK, max_lines=2, line_gap=1.25)
        iy += int(h * 0.012)

        if desc:
            f_desc = _regular(int(w * 0.030))
            iy = _draw_text_block(draw, desc, f_desc, pad, iy, w - pad * 2,
                                  TEXT_GRAY, max_lines=1)

        # Price pill anchored near bottom
        f_price = _bold(int(w * 0.050))
        pill_h_size = int(w * 0.080)
        pill_y = h - pad - pill_h_size - int(h * 0.018)
        tw_price = _text_w(draw, price_display, f_price)
        pill_w = tw_price + 40
        draw.rounded_rectangle([pad, pill_y, pad + pill_w, pill_y + pill_h_size],
                                radius=pill_h_size // 2, fill=accent)
        v_off = (pill_h_size - f_price.size) // 2
        draw.text((pad + 20, pill_y + v_off), price_display, fill=WHITE, font=f_price)

    # ── Watermark ─────────────────────────────────────────────
    wm_text = f"souk.et/{shop_slug}" if shop_slug else "souk.et"
    _watermark(draw, wm_text, w, h)

    return img


# ══════════════════════════════════════════════════════════════
# PUBLIC API
# ══════════════════════════════════════════════════════════════

FORMATS = {
    "square": (1080, 1080),
    "story":  (1080, 1920),
    "banner": (1200, 628),
    "tile":   (600, 600),
}


def generate_all(
    product_name: str,
    price: int | None = None,
    photo_bytes: bytes = b"",
    description: str | None = None,
    shop_name: str = "",
    shop_slug: str = "",
    style: str = "clean",          # kept for backward compat, unused
    watermark: bool = True,
    price_type: str = "fixed",
    template_style: str | None = None,
) -> dict[str, bytes]:
    """Generate all 4 marketing image formats. Returns {format: PNG bytes}."""
    photo = _load_photo(photo_bytes)
    accent = _resolve_accent(template_style)
    pd = _price_text(price, price_type)
    results = {}

    for fmt_name, (w, h) in FORMATS.items():
        img = _product_card(photo, product_name, pd, description, w, h, shop_slug, accent)
        buf = io.BytesIO()
        img.save(buf, "PNG", optimize=True)
        results[fmt_name] = buf.getvalue()

    return results


def generate_single(
    product_name: str,
    price: int | None = None,
    photo_bytes: bytes = b"",
    fmt: str = "square",
    style: str = "clean",
    description: str | None = None,
    shop_slug: str = "",
    watermark: bool = True,
    price_type: str = "fixed",
    template_style: str | None = None,
) -> bytes:
    """Generate one marketing image. Returns PNG bytes."""
    photo = _load_photo(photo_bytes)
    accent = _resolve_accent(template_style)
    pd = _price_text(price, price_type)
    w, h = FORMATS[fmt]
    img = _product_card(photo, product_name, pd, description, w, h, shop_slug, accent)
    buf = io.BytesIO()
    img.save(buf, "PNG", optimize=True)
    return buf.getvalue()


# ══════════════════════════════════════════════════════════════
# SHOP CARD
# ══════════════════════════════════════════════════════════════


def generate_shop_card(
    shop_name: str,
    shop_slug: str,
    theme_hex: str = "#0D9488",
    product_count: int = 0,
    description: str | None = None,
    logo_bytes: bytes | None = None,
) -> bytes:
    """Generate a 1080×1080 shareable shop card. Returns PNG bytes."""
    W, H = 1080, 1080

    hx = theme_hex.lstrip("#")
    accent = tuple(int(hx[i:i + 2], 16) for i in (0, 2, 4))
    light = tuple(min(255, c + 60) for c in accent)

    img = _gradient(W, H, accent, light)
    draw = ImageDraw.Draw(img)

    # Decorative circles
    img = img.convert("RGBA")
    for cx, cy, r, alpha in [
        (W - 200, -60, 260, 22),
        (-60, H - 200, 240, 18),
        (W - 80, H // 2, 130, 12),
    ]:
        blob = Image.new("RGBA", (r * 2, r * 2), (0, 0, 0, 0))
        ImageDraw.Draw(blob).ellipse([(0, 0), (r * 2, r * 2)], fill=(255, 255, 255, alpha))
        img.paste(blob, (cx - r, cy - r), blob)
    img = img.convert("RGB")
    draw = ImageDraw.Draw(img)

    y = 240

    # Logo or initial
    box = 140
    bx = (W - box) // 2
    if logo_bytes:
        try:
            logo = _load_photo(logo_bytes)
            logo = _fit_contain(logo, box, box, accent, margin=0.04)
            logo_rgba = logo.convert("RGBA")
            mask = Image.new("L", (box, box), 0)
            ImageDraw.Draw(mask).rounded_rectangle([(0, 0), (box, box)], radius=28, fill=255)
            logo_rgba.putalpha(mask)
            img_rgba = img.convert("RGBA")
            img_rgba.paste(logo_rgba, (bx, y), logo_rgba)
            img = img_rgba.convert("RGB")
            draw = ImageDraw.Draw(img)
        except Exception:
            pass
    else:
        overlay = Image.new("RGBA", (box, box), (0, 0, 0, 0))
        ImageDraw.Draw(overlay).rounded_rectangle([(0, 0), (box, box)],
                                                   radius=28, fill=(255, 255, 255, 50))
        img_rgba = img.convert("RGBA")
        img_rgba.paste(overlay, (bx, y), overlay)
        img = img_rgba.convert("RGB")
        draw = ImageDraw.Draw(img)
        f_init = _bold(72)
        _center_text(draw, shop_name[0].upper(), f_init, y + 28, W, WHITE)

    y += box + 48

    f_name = _bold(54)
    for line in _wrap(shop_name, f_name, W - 140, draw)[:2]:
        _center_text(draw, line, f_name, y, W, WHITE)
        y += 68
    y += 8

    if description:
        f_desc = _regular(28)
        for line in _wrap(description, f_desc, W - 200, draw)[:2]:
            _center_text(draw, line, f_desc, y, W, (255, 255, 255))
            y += 38
        y += 16

    if product_count > 0:
        badge = f"Browse {product_count} item{'s' if product_count != 1 else ''}"
        f_badge = _bold(24)
        tw = _text_w(draw, badge, f_badge)
        pw, ph = tw + 48, 48
        px = (W - pw) // 2
        draw.rounded_rectangle([px, y, px + pw, y + ph], radius=24, fill=WHITE)
        draw.text((px + 24, y + 11), badge, fill=accent, font=f_badge)
        y += ph + 28

    from bot.db.supabase_client import catalog_link
    url = catalog_link(shop_slug)
    _center_text(draw, url, _regular(22), H - 120, W, (255, 255, 255))
    _center_text(draw, "Powered by souk.et", _regular(18), H - 64, W, (255, 255, 255))

    buf = io.BytesIO()
    img.save(buf, "PNG", optimize=True)
    return buf.getvalue()
