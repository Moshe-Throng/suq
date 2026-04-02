"""
Supabase client for Suq bot.
All database interactions go through this module.

supabase-py is synchronous — use run_sync() from async handlers.
"""

import asyncio
import functools
import os
import re
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client, Client

# Load .env
_env_paths = [
    Path(__file__).parent.parent.parent / ".env",
    Path(__file__).parent.parent.parent.parent / ".env",
]
for _p in _env_paths:
    if _p.exists():
        load_dotenv(_p)
        break

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
CATALOG_URL = os.getenv("CATALOG_URL", "")

_client: Client | None = None
_executor = ThreadPoolExecutor(max_workers=4)


def get_client() -> Client:
    """Singleton Supabase client (service role)."""
    global _client
    if _client is None:
        if not SUPABASE_URL or not SUPABASE_KEY:
            raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in .env")
        _client = create_client(SUPABASE_URL, SUPABASE_KEY)
    return _client


async def run_sync(func, *args, **kwargs):
    """Run sync function in thread pool so it doesn't block the event loop."""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(
        _executor, functools.partial(func, *args, **kwargs)
    )


# ── Slug helper ───────────────────────────────────────────────


def slugify(name: str) -> str:
    """Convert shop name to URL-safe slug.
    For names with no Latin chars (e.g. Amharic), generates a hash-based slug."""
    slug = name.lower().strip()
    slug = re.sub(r"[^a-z0-9\s-]", "", slug)
    slug = re.sub(r"[\s-]+", "-", slug).strip("-")
    if not slug:
        import hashlib
        h = hashlib.md5(name.encode()).hexdigest()[:6]
        slug = f"shop-{h}"
    return slug


def catalog_link(shop_slug: str) -> str:
    """Build the public catalog URL for a shop."""
    base = CATALOG_URL.rstrip("/") if CATALOG_URL else "https://suq-catalog.vercel.app"
    return f"{base}/{shop_slug}"


# ── Shop operations ──────────────────────────────────────────


def get_shop(telegram_id: int) -> dict | None:
    """Get shop by owner's Telegram ID."""
    result = get_client().table("suq_shops").select("*").eq(
        "telegram_id", telegram_id
    ).execute()
    return result.data[0] if result.data else None


def get_shop_by_slug(slug: str) -> dict | None:
    """Get shop by slug (for buyer-facing pages)."""
    result = get_client().table("suq_shops").select("*").eq(
        "shop_slug", slug
    ).execute()
    return result.data[0] if result.data else None


MAX_SHOPS = 50


def create_shop(telegram_id: int, username: str | None, shop_name: str,
                lang: str = "am", theme_color: str = "teal",
                shop_type: str = "product", category: str | None = None,
                template_style: str = "purple",
                location_text: str | None = None) -> dict | None:
    """Create a new shop. Returns the created row, or None if at capacity."""
    if get_total_shop_count() >= MAX_SHOPS:
        return None
    slug = slugify(shop_name)
    existing = get_shop_by_slug(slug)
    if existing:
        suffix = 1
        while get_shop_by_slug(f"{slug}-{suffix}"):
            suffix += 1
        slug = f"{slug}-{suffix}"

    data = {
        "telegram_id": telegram_id,
        "telegram_username": username,
        "shop_name": shop_name,
        "shop_slug": slug,
        "language": lang,
        "theme_color": theme_color,
        "shop_type": shop_type,
        "template_style": template_style,
    }
    if category:
        data["category"] = category
    if location_text:
        data["location_text"] = location_text
    result = get_client().table("suq_shops").insert(data).execute()
    return result.data[0]


def update_shop_theme(shop_id: str, theme_color: str) -> None:
    """Update a shop's theme color (legacy)."""
    get_client().table("suq_shops").update(
        {"theme_color": theme_color}
    ).eq("id", shop_id).execute()


def update_shop_template(shop_id: str, template_style: str) -> None:
    """Update a shop's template style."""
    get_client().table("suq_shops").update(
        {"template_style": template_style}
    ).eq("id", shop_id).execute()


def update_shop_type(shop_id: str, shop_type: str) -> None:
    """Update a shop's business type."""
    get_client().table("suq_shops").update(
        {"shop_type": shop_type}
    ).eq("id", shop_id).execute()


def update_shop_category(shop_id: str, category: str) -> None:
    """Update a shop's category."""
    get_client().table("suq_shops").update(
        {"category": category}
    ).eq("id", shop_id).execute()


def update_shop_location(shop_id: str, location_text: str | None) -> None:
    """Update a shop's location text. Pass None to remove."""
    get_client().table("suq_shops").update(
        {"location_text": location_text}
    ).eq("id", shop_id).execute()


def update_shop_description(shop_id: str, description: str | None) -> None:
    """Update a shop's description/tagline. Pass None to remove."""
    get_client().table("suq_shops").update(
        {"description": description}
    ).eq("id", shop_id).execute()


def update_shop_logo(shop_id: str, logo_file_id: str | None,
                     logo_url: str | None = None) -> None:
    """Update a shop's logo. Pass None to both fields to remove."""
    get_client().table("suq_shops").update(
        {"logo_file_id": logo_file_id, "logo_url": logo_url}
    ).eq("id", shop_id).execute()


def update_shop_tiktok(shop_id: str, tiktok_url: str | None) -> None:
    """Update a shop's TikTok URL. Pass None to remove."""
    get_client().table("suq_shops").update(
        {"tiktok_url": tiktok_url}
    ).eq("id", shop_id).execute()


def get_product_count(shop_id: str) -> int:
    """Get count of active products for a shop."""
    result = get_client().table("suq_products").select(
        "id", count="exact"
    ).eq("shop_id", shop_id).eq("is_active", True).execute()
    return result.count or 0


def get_total_shop_count() -> int:
    """Get total number of shops on the platform."""
    result = get_client().table("suq_shops").select(
        "id", count="exact"
    ).execute()
    return result.count or 0


def slug_available(slug: str) -> bool:
    """Check if a slug is available."""
    return get_shop_by_slug(slug) is None


# ── Product operations ───────────────────────────────────────


def get_products(shop_id: str, active_only: bool = True,
                 listing_type: str | None = None) -> list[dict]:
    """Get all products for a shop, optionally filtered by listing_type."""
    q = get_client().table("suq_products").select("*").eq("shop_id", shop_id)
    if active_only:
        q = q.eq("is_active", True)
    if listing_type:
        q = q.eq("listing_type", listing_type)
    result = q.order("sort_order").execute()
    return result.data


def get_product(product_id: str) -> dict | None:
    """Get a single product by ID."""
    result = get_client().table("suq_products").select("*").eq("id", product_id).execute()
    return result.data[0] if result.data else None


def create_product(shop_id: str, name: str, price: int | None = None,
                   photo_file_id: str | None = None, photo_url: str | None = None,
                   description: str | None = None, listing_type: str = "product",
                   price_type: str = "fixed", tag: str | None = None,
                   stock: int | None = None,
                   source_channel_msg_id: int | None = None,
                   imported_from: str | None = None,
                   extra_photos: list[str] | None = None) -> dict:
    """Create a new product or service listing."""
    data = {
        "shop_id": shop_id,
        "name": name,
        "listing_type": listing_type,
        "price_type": price_type,
    }
    if price is not None:
        data["price"] = price
    if photo_file_id:
        data["photo_file_id"] = photo_file_id
    if photo_url:
        data["photo_url"] = photo_url
    if description:
        data["description"] = description
    if tag:
        data["tag"] = tag
    if stock is not None:
        data["stock"] = stock
    if source_channel_msg_id is not None:
        data["source_channel_msg_id"] = source_channel_msg_id
    if imported_from:
        data["imported_from"] = imported_from
    if extra_photos:
        data["extra_photos"] = extra_photos
    result = get_client().table("suq_products").insert(data).execute()
    return result.data[0]


def update_product_tag(product_id: str, tag: str | None) -> None:
    """Update a product's tag."""
    get_client().table("suq_products").update(
        {"tag": tag}
    ).eq("id", product_id).execute()


def update_product_stock(product_id: str, stock: int | None) -> None:
    """Update a product's stock count. Pass None for unlimited."""
    get_client().table("suq_products").update(
        {"stock": stock}
    ).eq("id", product_id).execute()


def update_product_tiktok(product_id: str, tiktok_url: str | None) -> None:
    """Update a product's TikTok video URL. Pass None to remove."""
    get_client().table("suq_products").update(
        {"tiktok_url": tiktok_url}
    ).eq("id", product_id).execute()


def delete_product(product_id: str) -> None:
    """Soft-delete a product."""
    get_client().table("suq_products").update(
        {"is_active": False}
    ).eq("id", product_id).execute()


# ── Order operations ─────────────────────────────────────────


def create_order(shop_id: str, product_id: str, buyer_telegram_id: int | None = None,
                 buyer_name: str | None = None, buyer_username: str | None = None,
                 buyer_phone: str | None = None, quantity: int = 1,
                 note: str | None = None) -> dict:
    """Create a new order."""
    data = {
        "shop_id": shop_id,
        "product_id": product_id,
        "quantity": quantity,
        "status": "new",
    }
    if buyer_telegram_id:
        data["buyer_telegram_id"] = buyer_telegram_id
    if buyer_name:
        data["buyer_name"] = buyer_name
    if buyer_username:
        data["buyer_username"] = buyer_username
    if buyer_phone:
        data["buyer_phone"] = buyer_phone
    if note:
        data["note"] = note
    result = get_client().table("suq_orders").insert(data).execute()
    return result.data[0]


def get_orders(shop_id: str, status: str = "new") -> list[dict]:
    """Get orders for a shop by status."""
    result = get_client().table("suq_orders").select(
        "*, suq_products(name, price)"
    ).eq("shop_id", shop_id).eq("status", status).order("created_at", desc=True).execute()
    return result.data


def update_order_status(order_id: str, status: str) -> dict:
    """Update order status (new → accepted → completed, or new → rejected)."""
    result = get_client().table("suq_orders").update(
        {"status": status}
    ).eq("id", order_id).execute()
    return result.data[0] if result.data else {}


# ── Inquiry operations (simplified orders) ──────────────────


def create_inquiry(shop_id: str, product_id: str,
                   buyer_name: str | None = None,
                   buyer_phone: str | None = None,
                   message: str | None = None) -> dict:
    """Create a new inquiry (simplified order)."""
    data = {
        "shop_id": shop_id,
        "product_id": product_id,
        "status": "new",
    }
    if buyer_name:
        data["buyer_name"] = buyer_name
    if buyer_phone:
        data["buyer_phone"] = buyer_phone
    if message:
        data["message"] = message
        data["note"] = message  # backward compat
    result = get_client().table("suq_orders").insert(data).execute()
    return result.data[0]


def get_inquiries(shop_id: str, status: str = "new") -> list[dict]:
    """Get inquiries for a shop by status, with item details."""
    result = get_client().table("suq_orders").select(
        "*, suq_products(name, price, price_type, listing_type)"
    ).eq("shop_id", shop_id).eq("status", status).order(
        "created_at", desc=True
    ).execute()
    return result.data


def mark_inquiry_seen(inquiry_id: str) -> dict:
    """Mark an inquiry as seen."""
    result = get_client().table("suq_orders").update(
        {"status": "seen"}
    ).eq("id", inquiry_id).execute()
    return result.data[0] if result.data else {}


# ── Feedback operations ──────────────────────────────────────


def create_feedback(shop_id: str | None, telegram_id: int,
                    source: str, message: str) -> dict:
    """Save user feedback to suq_feedback table."""
    data = {
        "telegram_id": telegram_id,
        "source": source,
        "message": message,
    }
    if shop_id:
        data["shop_id"] = shop_id
    result = get_client().table("suq_feedback").insert(data).execute()
    return result.data[0] if result.data else {}


# ── Price formatting ─────────────────────────────────────────


def format_price(price: int | None, price_type: str = "fixed") -> str:
    """Format price for display based on price_type."""
    if price_type == "contact" or price is None:
        return "Contact for pricing"
    if price_type == "starting_from":
        return f"Starting from {price:,} Birr"
    return f"{price:,} Birr"


# ── Channel import operations ───────────────────────────────


def update_shop_owner(shop_id: str, telegram_id: int, username: str | None) -> None:
    """Transfer shop ownership to a new Telegram user."""
    data = {"telegram_id": telegram_id}
    if username:
        data["telegram_username"] = username
    get_client().table("suq_shops").update(data).eq("id", shop_id).execute()


def update_shop_source_channel(shop_id: str, channel_username: str | None,
                                sync_enabled: bool = False) -> None:
    """Link a Telegram channel to a shop."""
    get_client().table("suq_shops").update({
        "source_channel": channel_username,
        "channel_sync_enabled": sync_enabled,
    }).eq("id", shop_id).execute()


def get_shop_by_source_channel(channel_username: str) -> dict | None:
    """Get shop linked to a Telegram channel."""
    result = get_client().table("suq_shops").select("*").eq(
        "source_channel", channel_username
    ).execute()
    return result.data[0] if result.data else None


def product_exists_by_channel_msg(shop_id: str, msg_id: int) -> bool:
    """Check if a product from a specific channel message already exists."""
    result = get_client().table("suq_products").select("id", count="exact").eq(
        "shop_id", shop_id
    ).eq("source_channel_msg_id", msg_id).execute()
    return (result.count or 0) > 0


# ── View tracking operations ────────────────────────────────


def track_view(shop_id: str, product_id: str | None = None,
               event_type: str = "view") -> None:
    """Record a view/contact_tap/share event."""
    data = {"shop_id": shop_id, "event_type": event_type}
    if product_id:
        data["product_id"] = product_id
    get_client().table("suq_views").insert(data).execute()


def get_all_active_shops() -> list[dict]:
    """Get all shops that have at least one active product."""
    result = get_client().table("suq_shops").select("*").execute()
    return result.data or []


def get_weekly_stats(shop_id: str) -> dict:
    """Get view/tap stats for the last 7 days."""
    from datetime import datetime, timedelta, timezone
    week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()

    client = get_client()

    # Total views
    views_result = client.table("suq_views").select("id", count="exact").eq(
        "shop_id", shop_id
    ).eq("event_type", "view").gte("created_at", week_ago).execute()
    total_views = views_result.count or 0

    # Contact taps
    taps_result = client.table("suq_views").select("id", count="exact").eq(
        "shop_id", shop_id
    ).eq("event_type", "contact_tap").gte("created_at", week_ago).execute()
    contact_taps = taps_result.count or 0

    # Best product (most views)
    best_product = None
    products_result = client.table("suq_views").select(
        "product_id"
    ).eq("shop_id", shop_id).eq("event_type", "view").gte(
        "created_at", week_ago
    ).not_.is_("product_id", "null").execute()

    if products_result.data:
        from collections import Counter
        counts = Counter(r["product_id"] for r in products_result.data)
        if counts:
            best_id, best_count = counts.most_common(1)[0]
            product = get_product(best_id)
            if product:
                best_product = {"name": product["name"], "views": best_count}

    return {
        "total_views": total_views,
        "contact_taps": contact_taps,
        "best_product": best_product,
    }


# ── Buyer operations ────────────────────────────────────────


def upsert_buyer(telegram_id: int, username: str | None, first_name: str | None) -> dict:
    """Create or update a buyer profile."""
    data = {"telegram_id": telegram_id}
    if username:
        data["username"] = username
    if first_name:
        data["first_name"] = first_name
    result = get_client().table("suq_buyers").upsert(
        data, on_conflict="telegram_id"
    ).execute()
    return result.data[0] if result.data else {}


def get_buyer(telegram_id: int) -> dict | None:
    """Get buyer by Telegram ID."""
    result = get_client().table("suq_buyers").select("*").eq(
        "telegram_id", telegram_id
    ).execute()
    return result.data[0] if result.data else None


def toggle_buyer_intent(telegram_id: int, intent_type: str) -> bool:
    """Toggle a buyer intent on/off. Returns True if now active."""
    buyer = get_buyer(telegram_id)
    if not buyer:
        buyer = upsert_buyer(telegram_id, None, None)

    # Check if intent exists
    existing = get_client().table("suq_buyer_intents").select("id, active").eq(
        "buyer_id", buyer["id"]
    ).eq("intent_type", intent_type).execute()

    if existing.data:
        # Toggle
        current = existing.data[0]
        new_active = not current["active"]
        get_client().table("suq_buyer_intents").update(
            {"active": new_active}
        ).eq("id", current["id"]).execute()
        return new_active
    else:
        # Create
        get_client().table("suq_buyer_intents").insert({
            "buyer_id": buyer["id"],
            "intent_type": intent_type,
            "active": True,
        }).execute()
        return True


def get_buyer_intents(telegram_id: int) -> list[dict]:
    """Get active intents for a buyer."""
    buyer = get_buyer(telegram_id)
    if not buyer:
        return []
    result = get_client().table("suq_buyer_intents").select("*").eq(
        "buyer_id", buyer["id"]
    ).eq("active", True).execute()
    return result.data or []


def get_buyers_for_category(intent_types: list[str]) -> list[dict]:
    """Get all buyers subscribed to any of the given intent types."""
    result = get_client().table("suq_buyer_intents").select(
        "buyer_id, suq_buyers!inner(id, telegram_id, username)"
    ).in_("intent_type", intent_types).eq("active", True).execute()

    # Deduplicate by buyer
    seen = set()
    buyers = []
    for row in (result.data or []):
        b = row.get("suq_buyers") or {}
        if b.get("id") and b["id"] not in seen:
            seen.add(b["id"])
            buyers.append(b)
    return buyers


def was_already_pushed(buyer_id: str, product_id: str) -> bool:
    """Check if a product was already pushed to a buyer."""
    result = get_client().table("suq_buyer_pushes").select("id", count="exact").eq(
        "buyer_id", buyer_id
    ).eq("product_id", product_id).execute()
    return (result.count or 0) > 0


def record_buyer_push(buyer_id: str, product_id: str) -> None:
    """Record that a product was pushed to a buyer."""
    get_client().table("suq_buyer_pushes").upsert({
        "buyer_id": buyer_id,
        "product_id": product_id,
    }, on_conflict="buyer_id,product_id").execute()


def search_products_by_categories(categories: list[str], limit: int = 10) -> list[dict]:
    """Search active products from shops in given categories."""
    result = get_client().table("suq_products").select(
        "id, name, price, price_type, photo_file_id, suq_shops!inner(shop_name, shop_slug, category)"
    ).eq("is_active", True).in_(
        "suq_shops.category", categories
    ).order("created_at", desc=True).limit(limit).execute()
    return result.data or []


def search_products_by_text(query: str, limit: int = 20) -> list[dict]:
    """Search active products by name/description text match across all shops."""
    result = get_client().table("suq_products").select(
        "id, name, price, price_type, description, photo_file_id, photo_url, tag, "
        "created_at, shop_id, "
        "suq_shops!inner(shop_name, shop_slug, category)"
    ).eq("is_active", True).or_(
        f"name.ilike.%{query}%,description.ilike.%{query}%,tag.ilike.%{query}%"
    ).order("created_at", desc=True).limit(limit).execute()
    return result.data or []


def get_products_by_category(category: str, limit: int = 20) -> list[dict]:
    """Get active products from shops in a specific category."""
    result = get_client().table("suq_products").select(
        "id, name, price, price_type, description, photo_file_id, photo_url, tag, "
        "created_at, shop_id, "
        "suq_shops!inner(shop_name, shop_slug, category)"
    ).eq("is_active", True).eq(
        "suq_shops.category", category
    ).order("created_at", desc=True).limit(limit).execute()
    return result.data or []


def get_price_comparison(query: str, limit: int = 10) -> list[dict]:
    """Find products matching a query, sorted by price for comparison.
    Returns products from multiple sellers with prices."""
    result = get_client().table("suq_products").select(
        "id, name, price, price_type, description, photo_file_id, photo_url, tag, "
        "created_at, shop_id, "
        "suq_shops!inner(shop_name, shop_slug, category)"
    ).eq("is_active", True).or_(
        f"name.ilike.%{query}%,description.ilike.%{query}%,tag.ilike.%{query}%"
    ).not_.is_("price", "null").order(
        "price", desc=False
    ).limit(limit).execute()
    return result.data or []


def get_personalized_feed(intent_types: list[str], limit: int = 15) -> list[dict]:
    """Get products matching buyer intent types, newest first."""
    # Map intents to shop categories
    intent_to_cats = {
        "kids": ["fashion", "handmade"],
        "fashion": ["fashion"],
        "electronics": ["electronics"],
        "home": ["home"],
        "pets": ["other"],
        "gifts": ["handmade", "coffee", "other"],
        "wholesale": ["fashion", "electronics", "beauty", "coffee"],
        "beauty": ["beauty", "salon"],
        "food": ["food", "coffee"],
    }
    categories = set()
    for it in intent_types:
        categories.update(intent_to_cats.get(it, []))

    if not categories:
        return []

    result = get_client().table("suq_products").select(
        "id, name, price, price_type, description, photo_file_id, photo_url, tag, "
        "created_at, shop_id, "
        "suq_shops!inner(shop_name, shop_slug, category)"
    ).eq("is_active", True).in_(
        "suq_shops.category", list(categories)
    ).order("created_at", desc=True).limit(limit).execute()
    return result.data or []


def get_existing_captions(shop_id: str) -> list[str]:
    """Get all product descriptions for a shop (for dedup)."""
    result = get_client().table("suq_products").select("name, description").eq(
        "shop_id", shop_id
    ).eq("is_active", True).execute()
    captions = []
    for p in (result.data or []):
        parts = [p.get("name", "")]
        if p.get("description"):
            parts.append(p["description"])
        captions.append(" ".join(parts))
    return captions
