"""
Generate a shareable shop card image for social media / WhatsApp / Telegram.

Creates a branded card with:
- Shop name + logo
- "Visit my shop on souk.et"
- Shop URL
- Product count
- QR code (optional, via qrcode lib)
"""

import io
import logging
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

logger = logging.getLogger("suq.shop_card")

# Paths for fonts — use system fonts as fallback
_FONT_DIRS = [
    Path(__file__).parent.parent.parent / "assets" / "fonts",
    Path("C:/Windows/Fonts"),
    Path("/usr/share/fonts/truetype"),
]


def _find_font(name: str, size: int) -> ImageFont.FreeTypeFont:
    """Find a font by name, fallback to default."""
    for d in _FONT_DIRS:
        for ext in (".ttf", ".otf"):
            p = d / f"{name}{ext}"
            if p.exists():
                return ImageFont.truetype(str(p), size)
    # Try system font names
    try:
        return ImageFont.truetype(name, size)
    except (OSError, IOError):
        pass
    return ImageFont.load_default()


def generate_shop_card(
    shop_name: str,
    shop_slug: str,
    category: str | None = None,
    product_count: int = 0,
    logo_bytes: bytes | None = None,
) -> bytes:
    """Generate a shop card image. Returns PNG bytes."""

    W, H = 1080, 600
    # Colors
    bg = "#0A0A0F"
    terra = "#FF6B35"
    gold = "#FFB800"
    white = "#FFFFFF"

    img = Image.new("RGB", (W, H), bg)
    draw = ImageDraw.Draw(img)

    # Gradient overlay (warm brown at bottom)
    for y in range(H):
        r = int(10 + (42 - 10) * (y / H) * 0.4)
        g = int(10 + (22 - 10) * (y / H) * 0.4)
        b = int(15 + (8 - 15) * (y / H) * 0.4)
        draw.line([(0, y), (W, y)], fill=(r, g, b))

    # Decorative accent line at top
    draw.rectangle([(0, 0), (W, 4)], fill=terra)

    # Logo circle
    logo_x, logo_y, logo_size = 80, 160, 120
    if logo_bytes:
        try:
            logo_img = Image.open(io.BytesIO(logo_bytes)).convert("RGBA")
            logo_img = logo_img.resize((logo_size, logo_size), Image.LANCZOS)
            # Create circular mask
            mask = Image.new("L", (logo_size, logo_size), 0)
            mask_draw = ImageDraw.Draw(mask)
            mask_draw.ellipse([(0, 0), (logo_size, logo_size)], fill=255)
            # White circle background
            draw.ellipse(
                [(logo_x - 4, logo_y - 4), (logo_x + logo_size + 4, logo_y + logo_size + 4)],
                fill=white,
            )
            img.paste(logo_img, (logo_x, logo_y), mask)
        except Exception as e:
            logger.warning(f"Failed to paste logo: {e}")
            draw.ellipse(
                [(logo_x, logo_y), (logo_x + logo_size, logo_y + logo_size)],
                fill="#2A1608", outline=gold, width=3,
            )
            # Draw initial
            init_font = _find_font("arial", 48)
            initial = shop_name[0].upper()
            draw.text(
                (logo_x + logo_size // 2, logo_y + logo_size // 2),
                initial, fill=gold, font=init_font, anchor="mm",
            )
    else:
        draw.ellipse(
            [(logo_x, logo_y), (logo_x + logo_size, logo_y + logo_size)],
            fill="#2A1608", outline=gold, width=3,
        )
        init_font = _find_font("arial", 48)
        draw.text(
            (logo_x + logo_size // 2, logo_y + logo_size // 2),
            shop_name[0].upper(), fill=gold, font=init_font, anchor="mm",
        )

    # Text section — to the right of logo
    text_x = logo_x + logo_size + 40
    text_y = logo_y - 10

    # "souk.et" brand
    brand_font = _find_font("arialbd", 22)
    draw.text((text_x, text_y), "souk", fill=white, font=brand_font)
    # Measure "souk" width
    souk_w = draw.textlength("souk", font=brand_font)
    draw.text((text_x + souk_w, text_y), ".", fill=terra, font=brand_font)
    dot_w = draw.textlength(".", font=brand_font)
    draw.text((text_x + souk_w + dot_w, text_y), "et", fill=white, font=brand_font)

    # Shop name
    name_font = _find_font("arialbd", 42)
    # Truncate if too long
    display_name = shop_name
    max_text_w = W - text_x - 60
    while draw.textlength(display_name, font=name_font) > max_text_w and len(display_name) > 10:
        display_name = display_name[:-2] + "…"
    draw.text((text_x, text_y + 36), display_name, fill=white, font=name_font)

    # Category + product count
    info_font = _find_font("arial", 22)
    cat_text = f"{category.title() if category else 'Shop'} · {product_count} products"
    draw.text((text_x, text_y + 90), cat_text, fill="#8C6E58", font=info_font)

    # URL bar at bottom
    url_y = H - 120
    draw.rounded_rectangle(
        [(60, url_y), (W - 60, url_y + 60)],
        radius=16, fill="#1A0C08", outline=terra, width=2,
    )
    url_font = _find_font("arialbd", 26)
    url_text = f"souk.et/{shop_slug}"
    draw.text(
        (W // 2, url_y + 30), url_text, fill=white, font=url_font, anchor="mm",
    )

    # "Visit my shop" text above URL
    visit_font = _find_font("arial", 20)
    draw.text(
        (W // 2, url_y - 20), "Visit my shop on", fill="#8C6E58",
        font=visit_font, anchor="mm",
    )

    # Accent dots (decorative)
    for dx in range(0, W, 32):
        draw.ellipse([(dx, H - 10), (dx + 3, H - 7)], fill=f"{gold}40")

    # Convert to bytes
    buf = io.BytesIO()
    img.save(buf, format="PNG", quality=95)
    return buf.getvalue()
