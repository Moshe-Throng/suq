"""
Generate a premium shareable shop card — seller-owned feeling.
Product photos + logo + their brand color. Minimal souk.et branding.
"""

import io
import logging
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

logger = logging.getLogger("suq.shop_card")

# Category → color mapping
CAT_COLORS = {
    "fashion": "#EC4899", "electronics": "#3B82F6", "food": "#F59E0B",
    "beauty": "#F43F5E", "handmade": "#D97706", "coffee": "#92400E",
    "home": "#059669", "kids": "#8B5CF6", "pets": "#10B981",
}


def _font(bold: bool = False, size: int = 24) -> ImageFont.FreeTypeFont:
    names = ["arialbd", "Arial Bold"] if bold else ["arial", "Arial"]
    for name in names:
        try:
            return ImageFont.truetype(name, size)
        except (OSError, IOError):
            pass
    for d in [Path("C:/Windows/Fonts"), Path("/usr/share/fonts/truetype/dejavu")]:
        for n in (["arialbd", "DejaVuSans-Bold"] if bold else ["arial", "DejaVuSans"]):
            p = d / f"{n}.ttf"
            if p.exists():
                return ImageFont.truetype(str(p), size)
    return ImageFont.load_default()


def _crop_cover(img: Image.Image, target_w: int, target_h: int) -> Image.Image:
    """Crop image to fill target dimensions (like CSS object-fit: cover)."""
    src_w, src_h = img.size
    src_ratio = src_w / src_h
    tgt_ratio = target_w / target_h

    if src_ratio > tgt_ratio:
        # Source is wider — crop sides
        new_w = int(src_h * tgt_ratio)
        left = (src_w - new_w) // 2
        img = img.crop((left, 0, left + new_w, src_h))
    else:
        # Source is taller — crop top/bottom
        new_h = int(src_w / tgt_ratio)
        top = (src_h - new_h) // 2
        img = img.crop((0, top, src_w, top + new_h))

    return img.resize((target_w, target_h), Image.LANCZOS)


def generate_shop_card(
    shop_name: str,
    shop_slug: str,
    category: str | None = None,
    product_count: int = 0,
    logo_bytes: bytes | None = None,
    product_photos: list[bytes] | None = None,
) -> bytes:
    """Generate a premium shop card. Returns PNG bytes."""

    W, H = 1080, 1350
    accent = CAT_COLORS.get(category or "", "#FF6B35")
    white = "#FFFFFF"
    muted = "#9CA3AF"
    dark = "#111111"

    img = Image.new("RGB", (W, H), white)
    draw = ImageDraw.Draw(img)

    # ── Top accent stripe ──
    draw.rectangle([(0, 0), (W, 6)], fill=accent)

    # ── Product photo mosaic (top 60% of card) ──
    photos = product_photos or []
    mosaic_top = 6
    mosaic_h = 700
    gap = 6

    if len(photos) >= 4:
        cell_w = (W - gap) // 2
        cell_h = (mosaic_h - gap) // 2
        positions = [
            (0, mosaic_top, cell_w, cell_h),
            (cell_w + gap, mosaic_top, cell_w, cell_h),
            (0, mosaic_top + cell_h + gap, cell_w, cell_h),
            (cell_w + gap, mosaic_top + cell_h + gap, cell_w, cell_h),
        ]
        for i, (px, py, cw, ch) in enumerate(positions):
            try:
                p_img = Image.open(io.BytesIO(photos[i])).convert("RGB")
                p_img = _crop_cover(p_img, cw, ch)
                img.paste(p_img, (px, py))
            except Exception:
                draw.rectangle([(px, py), (px + cw, py + ch)], fill="#F3F4F6")
    elif len(photos) >= 2:
        cell_w = (W - gap) // 2
        for i, px in enumerate([0, cell_w + gap]):
            try:
                p_img = Image.open(io.BytesIO(photos[i])).convert("RGB")
                p_img = _crop_cover(p_img, cell_w, mosaic_h)
                img.paste(p_img, (px, mosaic_top))
            except Exception:
                draw.rectangle([(px, mosaic_top), (px + cell_w, mosaic_top + mosaic_h)], fill="#F3F4F6")
    elif len(photos) >= 1:
        try:
            p_img = Image.open(io.BytesIO(photos[0])).convert("RGB")
            p_img = _crop_cover(p_img, W, mosaic_h)
            img.paste(p_img, (0, mosaic_top))
        except Exception:
            draw.rectangle([(0, mosaic_top), (W, mosaic_top + mosaic_h)], fill="#F3F4F6")
    else:
        draw.rectangle([(0, mosaic_top), (W, mosaic_top + mosaic_h)], fill="#F3F4F6")
        pf = _font(False, 48)
        draw.text((W // 2, mosaic_top + mosaic_h // 2), "🛍", font=pf, anchor="mm")

    # ── Logo (overlapping mosaic/info boundary) ──
    logo_size = 120
    logo_x = W // 2 - logo_size // 2
    logo_y = mosaic_top + mosaic_h - logo_size // 2

    # White circle border
    border = 5
    draw.ellipse(
        [(logo_x - border, logo_y - border),
         (logo_x + logo_size + border, logo_y + logo_size + border)],
        fill=white,
    )

    if logo_bytes:
        try:
            logo_img = Image.open(io.BytesIO(logo_bytes)).convert("RGB")
            logo_img = _crop_cover(logo_img, logo_size, logo_size)
            mask = Image.new("L", (logo_size, logo_size), 0)
            ImageDraw.Draw(mask).ellipse([(0, 0), (logo_size, logo_size)], fill=255)
            img.paste(logo_img, (logo_x, logo_y), mask)
        except Exception:
            draw.ellipse([(logo_x, logo_y), (logo_x + logo_size, logo_y + logo_size)], fill="#F3F4F6")
            draw.text((W // 2, logo_y + logo_size // 2), shop_name[0].upper(), fill=accent, font=_font(True, 48), anchor="mm")
    else:
        draw.ellipse([(logo_x, logo_y), (logo_x + logo_size, logo_y + logo_size)], fill="#F3F4F6")
        draw.text((W // 2, logo_y + logo_size // 2), shop_name[0].upper(), fill=accent, font=_font(True, 48), anchor="mm")

    # ── Shop info section (white background) ──
    info_y = logo_y + logo_size + 24

    # Shop name
    name_font = _font(True, 52)
    display_name = shop_name
    max_w = W - 120
    while draw.textlength(display_name, font=name_font) > max_w and len(display_name) > 8:
        display_name = display_name[:-2] + "…"
    draw.text((W // 2, info_y), display_name, fill=dark, font=name_font, anchor="mt")

    # Category + count
    cat_y = info_y + 64
    cat_font = _font(False, 26)
    cat_label = category.title() if category else "Shop"
    cat_text = f"{cat_label}  ·  {product_count} products"
    draw.text((W // 2, cat_y), cat_text, fill=muted, font=cat_font, anchor="mt")

    # ── Accent divider ──
    div_y = cat_y + 50
    draw.rounded_rectangle([(W // 2 - 30, div_y), (W // 2 + 30, div_y + 4)], radius=2, fill=accent)

    # ── URL section ──
    url_y = div_y + 36
    url_font = _font(True, 32)
    url_text = f"souk.et/{shop_slug}"
    url_tw = draw.textlength(url_text, font=url_font)
    pill_w = url_tw + 56
    pill_h = 56
    pill_x = W // 2 - pill_w // 2
    draw.rounded_rectangle(
        [(pill_x, url_y), (pill_x + pill_w, url_y + pill_h)],
        radius=pill_h // 2, fill=accent,
    )
    draw.text((W // 2, url_y + pill_h // 2), url_text, fill=white, font=url_font, anchor="mm")

    # ── Bottom thin accent ──
    draw.rectangle([(0, H - 4), (W, H)], fill=accent)

    buf = io.BytesIO()
    img.save(buf, format="PNG", quality=95)
    return buf.getvalue()
