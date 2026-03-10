"""
Quick visual test — generates sample images from a real-looking product photo stub.
Run from project root: python test_images.py
Images saved to .tmp/test_images/
"""
import os, io, sys
sys.path.insert(0, os.path.dirname(__file__))

from PIL import Image, ImageDraw
from bot.services.image_factory import generate_all

OUT = os.path.join(os.path.dirname(__file__), ".tmp", "test_images")
os.makedirs(OUT, exist_ok=True)

# ── Build a fake product photo (portrait shoe-like shape, neutral bg) ──
def make_test_photo(w=600, h=800):
    img = Image.new("RGB", (w, h), (245, 243, 240))  # beige background
    draw = ImageDraw.Draw(img)
    # Draw a simple shoe silhouette shape (dark blob on neutral bg)
    draw.ellipse([(80, 300), (520, 580)], fill=(30, 30, 35))   # sole
    draw.ellipse([(100, 180), (460, 420)], fill=(40, 40, 48))  # upper
    draw.ellipse([(280, 150), (520, 350)], fill=(35, 35, 42))  # toe
    draw.ellipse([(150, 280), (340, 420)], fill=(55, 55, 65))  # highlight
    return img

photo_img = make_test_photo()
buf = io.BytesIO()
photo_img.save(buf, "JPEG")
photo_bytes = buf.getvalue()

# ── Generate with different brand colors ──
configs = [
    ("purple", "New Balance 550", 5400, "Premium lifestyle sneakers"),
    ("teal",   "Habesha Dress",   2800, "Traditional Ethiopian design"),
    ("orange", "Ethiopian Coffee", 450, "Sidama single-origin, 250g"),
]

for color, name, price, desc in configs:
    images = generate_all(
        product_name=name,
        price=price,
        photo_bytes=photo_bytes,
        description=desc,
        shop_slug="bele",
        price_type="fixed",
        template_style=color,
    )
    for fmt, data in images.items():
        path = os.path.join(OUT, f"{color}_{fmt}.png")
        with open(path, "wb") as f:
            f.write(data)
        print(f"  saved {path}")

print(f"\nAll images saved to {OUT}")
print("Open .tmp/test_images/ to inspect.")
