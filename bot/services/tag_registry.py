"""
Product tag definitions per shop category.
Each tag set is a list of (key, label) tuples.
"""

CATEGORY_TAGS: dict[str, list[tuple[str, str]]] = {
    "fashion": [
        ("dresses", "👗 Dresses"),
        ("tops", "👕 Tops"),
        ("pants", "👖 Pants"),
        ("shoes", "👟 Shoes"),
        ("bags", "👜 Bags"),
        ("accessories", "💍 Accessories"),
        ("outerwear", "🧥 Outerwear"),
        ("other", "📦 Other"),
    ],
    "food": [
        ("cakes", "🎂 Cakes"),
        ("pastries", "🍪 Pastries"),
        ("bread", "🍞 Bread"),
        ("meals", "🥗 Meals"),
        ("drinks", "🥤 Drinks"),
        ("snacks", "🍫 Snacks"),
        ("other", "📦 Other"),
    ],
    "electronics": [
        ("phones", "📱 Phones"),
        ("laptops", "💻 Laptops"),
        ("audio", "🎧 Audio"),
        ("cameras", "📷 Cameras"),
        ("accessories", "🔌 Accessories"),
        ("gaming", "🎮 Gaming"),
        ("other", "📦 Other"),
    ],
    "beauty": [
        ("makeup", "💄 Makeup"),
        ("skincare", "🧴 Skincare"),
        ("haircare", "💇 Haircare"),
        ("fragrance", "🌸 Fragrance"),
        ("nails", "💅 Nails"),
        ("other", "📦 Other"),
    ],
    "handmade": [
        ("pottery", "🏺 Pottery"),
        ("textiles", "🧶 Textiles"),
        ("art", "🎨 Art"),
        ("jewelry", "📿 Jewelry"),
        ("woodwork", "🪵 Woodwork"),
        ("other", "📦 Other"),
    ],
    "coffee": [
        ("coffee", "☕ Coffee"),
        ("spices", "🌶 Spices"),
        ("honey", "🍯 Honey"),
        ("herbs", "🌿 Herbs"),
        ("other", "📦 Other"),
    ],
    "home": [
        ("furniture", "🛋 Furniture"),
        ("decor", "🏠 Decor"),
        ("kitchen", "🍽 Kitchen"),
        ("bedroom", "🛏 Bedroom"),
        ("organization", "🧹 Organization"),
        ("other", "📦 Other"),
    ],
}

# Service-type shops
SERVICE_TAGS: list[tuple[str, str]] = [
    ("basic", "✂️ Basic"),
    ("premium", "⭐ Premium"),
    ("package", "📦 Package"),
    ("other", "📦 Other"),
]

# Fallback for unknown or null categories
DEFAULT_TAGS: list[tuple[str, str]] = [
    ("new", "🆕 New"),
    ("popular", "🔥 Popular"),
    ("sale", "🏷 Sale"),
    ("featured", "⭐ Featured"),
    ("other", "📦 Other"),
]


def get_tags_for_category(category: str | None, shop_type: str = "product") -> list[tuple[str, str]]:
    """Return the appropriate tag set for a shop's category and type."""
    if shop_type == "service":
        return SERVICE_TAGS
    if category and category in CATEGORY_TAGS:
        return CATEGORY_TAGS[category]
    return DEFAULT_TAGS
