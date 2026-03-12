"""
Suq Content Factory — generates 4 marketing image formats per product/service.

Formats:
  square  (1080×1080) — Instagram feed, Telegram
  story   (1080×1920) — Instagram Story, TikTok
  banner  (1200×628)  — Facebook/Twitter header
  tile    (600×600)   — web catalog card

Design: cinematic full-bleed — photo fills canvas, dark gradient overlay,
white text anchored at the bottom. Brand accent color as accent bar + divider.
"""

import io
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

# ── Palette ──────────────────────────────────────────────────

WHITE      = (255, 255, 255)
WHITE_DIM  = (220, 220, 220)   # slightly dimmed white for secondary text
BLACK      = (0, 0, 0)

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


def _has_ethiopic(text: str) -> bool:
    """Check if text contains Ethiopic (Ge'ez) characters."""
    return any("\u1200" <= c <= "\u137F" or "\u1380" <= c <= "\u139F"
               or "\u2D80" <= c <= "\u2DDF" or "\uAB00" <= c <= "\uAB2F" for c in text)


def _bold(size: int, text: str = "") -> ImageFont.FreeTypeFont:
    if _has_ethiopic(text):
        return _font(["NotoSansEthiopic.ttf", "DMSans-Bold.ttf",
                      "LiberationSans-Bold.ttf", "DejaVuSans-Bold.ttf", "arialbd.ttf"], size)
    return _font(["DMSans-Bold.ttf", "PlusJakartaSans-Bold.ttf",
                  "LiberationSans-Bold.ttf", "DejaVuSans-Bold.ttf", "arialbd.ttf"], size)


def _regular(size: int, text: str = "") -> ImageFont.FreeTypeFont:
    if _has_ethiopic(text):
        return _font(["NotoSansEthiopic.ttf", "DMSans-Regular.ttf",
                      "LiberationSans-Regular.ttf", "DejaVuSans.ttf", "arial.ttf"], size)
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


def _text_w(draw, text, font) -> int:
    return draw.textbbox((0, 0), text, font=font)[2]


# ── Photo processing ─────────────────────────────────────────


def _load_photo(photo_bytes: bytes) -> Image.Image:
    return Image.open(io.BytesIO(photo_bytes)).convert("RGB")


def _fit_cover(photo: Image.Image, tw: int, th: int) -> Image.Image:
    """Scale photo to FILL (tw × th), cropping excess. Center crop."""
    iw, ih = photo.size
    scale = max(tw / iw, th / ih)
    nw = max(1, int(iw * scale))
    nh = max(1, int(ih * scale))
    resized = photo.resize((nw, nh), Image.LANCZOS)
    x = (nw - tw) // 2
    y = (nh - th) // 2
    return resized.crop((x, y, x + tw, y + th))


def _fit_contain(photo: Image.Image, tw: int, th: int,
                 bg: tuple = (238, 238, 242), margin: float = 0.05) -> Image.Image:
    """Scale photo to fit fully within (tw × th) without cropping."""
    iw, ih = photo.size
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


def _dark_overlay(w: int, h: int, start_fraction: float = 0.40,
                  max_alpha: int = 215) -> Image.Image:
    """
    RGBA image: fully transparent at top, dark at bottom.
    Used to make white text readable over any photo.
    """
    overlay = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    start_y = int(h * start_fraction)
    for y in range(start_y, h):
        progress = (y - start_y) / max(h - start_y - 1, 1)
        alpha = int(max_alpha * (progress ** 0.60))  # ease-in curve
        draw.line([(0, y), (w - 1, y)], fill=(0, 0, 0, alpha))
    return overlay


def _resolve_accent(template_style: str | None) -> tuple:
    hx = COLOR_HEX.get(template_style or "purple", "#7C3AED").lstrip("#")
    return tuple(int(hx[i:i + 2], 16) for i in (0, 2, 4))


def _price_text(price: int | None, price_type: str = "fixed",
                lang: str = "en") -> str:
    if price_type == "contact" or price is None:
        return "ለዋጋ ያግኙን" if lang == "am" else "Contact for pricing"
    if price_type == "starting_from":
        return f"ከ {price:,} ብር" if lang == "am" else f"From {price:,} Birr"
    return f"{price:,} ብር" if lang == "am" else f"{price:,} Birr"


def _gradient(w: int, h: int, top: tuple, bot: tuple) -> Image.Image:
    img = Image.new("RGB", (w, h))
    draw = ImageDraw.Draw(img)
    for y in range(h):
        t = y / max(h - 1, 1)
        color = tuple(int(top[c] + (bot[c] - top[c]) * t) for c in range(3))
        draw.line([(0, y), (w - 1, y)], fill=color)
    return img


# ══════════════════════════════════════════════════════════════
# CINEMATIC PRODUCT CARD
# Photo fills canvas, dark gradient from bottom, white text.
# ══════════════════════════════════════════════════════════════


def _product_card(photo: Image.Image, name: str, price_display: str,
                  desc: str | None, w: int, h: int,
                  shop_slug: str, accent: tuple) -> Image.Image:

    is_banner = w > h * 1.1   # landscape
    is_story  = h > w * 1.5   # tall portrait

    # Detect if we need Ethiopic-capable fonts
    all_text = f"{name} {price_display} {desc or ''}"

    pad = int(w * 0.06)

    if is_banner:
        # ── BANNER: photo left half, solid brand color right half ──
        split = int(w * 0.50)

        img = Image.new("RGB", (w, h), accent)
        draw = ImageDraw.Draw(img)

        # Photo side (left) — cover fill
        photo_cover = _fit_cover(photo, split, h)
        img.paste(photo_cover, (0, 0))

        # Thin vertical accent stripe at the split
        draw.rectangle([(split, 0), (split + 4, h)], fill=accent)

        # Accent bar at very top (left side only, matching photo width)
        bar_h = max(5, int(h * 0.008))
        draw.rectangle([(0, 0), (split, bar_h)], fill=accent)

        # Info side (right)
        ix = split + pad
        info_w = w - ix - pad
        iy = int(h * 0.14)

        f_name = _bold(int(h * 0.110), name)
        for line in _wrap(name, f_name, info_w, draw)[:2]:
            draw.text((ix, iy), line, fill=WHITE, font=f_name)
            iy += int(f_name.size * 1.25)
        iy += int(h * 0.03)

        # Short accent divider (lighter)
        div_color = tuple(min(255, c + 80) for c in accent)
        draw.rectangle([ix, iy, ix + int(info_w * 0.35), iy + 3], fill=div_color)
        iy += int(h * 0.07)

        if desc:
            f_desc = _regular(int(h * 0.058), desc)
            for line in _wrap(desc, f_desc, info_w, draw)[:2]:
                draw.text((ix, iy), line, fill=WHITE_DIM, font=f_desc)
                iy += int(f_desc.size * 1.35)
            iy += int(h * 0.02)

        # Price — large, white
        f_price = _bold(int(h * 0.120), price_display)
        price_y = h - pad - int(f_price.size * 1.1)
        draw.text((ix, price_y), price_display, fill=WHITE, font=f_price)

        # Watermark bottom-right
        f_wm = _regular(max(12, int(h * 0.040)))
        wm = f"souk.et/{shop_slug}" if shop_slug else "souk.et"
        wm_w = _text_w(draw, wm, f_wm)
        draw.text((w - pad - wm_w, h - pad // 2 - f_wm.size), wm,
                  fill=(255, 255, 255, 160) if hasattr(WHITE, '__len__') else WHITE_DIM,
                  font=f_wm)

    else:
        # ── SQUARE / STORY / TILE: full-bleed cinematic ──────────

        # 1. Photo fills entire canvas
        photo_cover = _fit_cover(photo, w, h)
        img = photo_cover.convert("RGBA")

        # 2. Dark gradient overlay from ~40% down
        start_frac = 0.38 if is_story else 0.35
        overlay = _dark_overlay(w, h, start_fraction=start_frac, max_alpha=220)
        img.paste(overlay, (0, 0), overlay)
        img = img.convert("RGB")
        draw = ImageDraw.Draw(img)

        # 3. Short accent bar at top-left (not full width — more intentional)
        bar_h = max(5, int(h * 0.005))
        bar_w = int(w * 0.28)
        draw.rectangle([(pad, 0), (pad + bar_w, bar_h)], fill=accent)

        # 4. Text anchored to bottom
        #    Layout (bottom-up): watermark → price → divider → name
        f_wm = _regular(max(14, int(w * 0.022)))
        wm = f"souk.et/{shop_slug}" if shop_slug else "souk.et"

        if is_story:
            f_price = _bold(int(w * 0.085), price_display)
            f_name  = _bold(int(w * 0.068), name)
            f_desc  = _regular(int(w * 0.038), desc or "")
            name_max_lines = 2
            line_gap_name  = 1.25
            line_gap_price = 1.15
            bottom_pad = int(h * 0.055)
        else:
            f_price = _bold(int(w * 0.078), price_display)
            f_name  = _bold(int(w * 0.062), name)
            f_desc  = _regular(int(w * 0.032), desc or "")
            name_max_lines = 2
            line_gap_name  = 1.25
            line_gap_price = 1.15
            bottom_pad = int(h * 0.050)

        text_w = w - pad * 2

        # watermark
        wm_y = h - bottom_pad - f_wm.size
        wm_tw = _text_w(draw, wm, f_wm)
        draw.text((w - pad - wm_tw, wm_y), wm, fill=WHITE_DIM, font=f_wm)

        # price
        price_y = wm_y - int(f_price.size * line_gap_price) - int(h * 0.008)
        draw.text((pad, price_y), price_display, fill=WHITE, font=f_price)

        # accent divider
        div_y = price_y - int(h * 0.028)
        draw.rectangle([pad, div_y, pad + int(text_w * 0.22), div_y + 3], fill=accent)

        # product name (bottom-up: measure total name block height first)
        name_lines = _wrap(name, f_name, text_w, draw)[:name_max_lines]
        name_block_h = int(f_name.size * line_gap_name) * len(name_lines)
        name_y = div_y - int(h * 0.02) - name_block_h

        for line in name_lines:
            draw.text((pad, name_y), line, fill=WHITE, font=f_name)
            name_y += int(f_name.size * line_gap_name)

        # optional description above name
        if desc and not is_story:
            pass  # skip desc on square to keep it clean; too much text
        if desc and is_story:
            f_desc = _regular(int(w * 0.036), desc)
            desc_lines = _wrap(desc, f_desc, text_w, draw)[:2]
            # positioned above the name block
            desc_block_h = int(f_desc.size * 1.35) * len(desc_lines)
            desc_y = (div_y - int(h * 0.02) - name_block_h
                      - int(h * 0.015) - desc_block_h)
            if desc_y > int(h * 0.45):  # only draw if there's room
                for line in desc_lines:
                    draw.text((pad, desc_y), line, fill=WHITE_DIM, font=f_desc)
                    desc_y += int(f_desc.size * 1.35)

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
    lang: str = "en",
) -> dict[str, bytes]:
    """Generate all 4 marketing image formats. Returns {format: PNG bytes}."""
    photo = _load_photo(photo_bytes)
    accent = _resolve_accent(template_style)
    pd = _price_text(price, price_type, lang)
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
    lang: str = "en",
) -> bytes:
    """Generate one marketing image. Returns PNG bytes."""
    photo = _load_photo(photo_bytes)
    accent = _resolve_accent(template_style)
    pd = _price_text(price, price_type, lang)
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
        bb = draw.textbbox((0, 0), shop_name[0].upper(), font=f_init)
        tx = bx + (box - (bb[2] - bb[0])) // 2
        draw.text((tx, y + 28), shop_name[0].upper(), fill=WHITE, font=f_init)

    y += box + 48

    f_name = _bold(54, shop_name)
    for line in _wrap(shop_name, f_name, W - 140, draw)[:2]:
        bb = draw.textbbox((0, 0), line, font=f_name)
        draw.text(((W - (bb[2] - bb[0])) // 2, y), line, fill=WHITE, font=f_name)
        y += 68
    y += 8

    if description:
        f_desc = _regular(28, description)
        for line in _wrap(description, f_desc, W - 200, draw)[:2]:
            bb = draw.textbbox((0, 0), line, font=f_desc)
            draw.text(((W - (bb[2] - bb[0])) // 2, y), line, fill=WHITE, font=f_desc)
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
    f_url = _regular(22)
    bb = draw.textbbox((0, 0), url, font=f_url)
    draw.text(((W - (bb[2] - bb[0])) // 2, H - 120), url, fill=WHITE, font=f_url)
    f_pw = _regular(18)
    bb2 = draw.textbbox((0, 0), "Powered by souk.et", font=f_pw)
    draw.text(((W - (bb2[2] - bb2[0])) // 2, H - 64), "Powered by souk.et",
              fill=WHITE, font=f_pw)

    buf = io.BytesIO()
    img.save(buf, "PNG", optimize=True)
    return buf.getvalue()
