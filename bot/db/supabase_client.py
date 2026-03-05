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
    """Convert shop name to URL-safe slug."""
    slug = name.lower().strip()
    slug = re.sub(r"[^a-z0-9\s-]", "", slug)
    slug = re.sub(r"[\s-]+", "-", slug).strip("-")
    return slug or "shop"


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


def create_shop(telegram_id: int, username: str | None, shop_name: str,
                lang: str = "am", theme_color: str = "teal",
                shop_type: str = "product", category: str | None = None,
                template_style: str = "clean") -> dict:
    """Create a new shop. Returns the created row."""
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


def get_product_count(shop_id: str) -> int:
    """Get count of active products for a shop."""
    result = get_client().table("suq_products").select(
        "id", count="exact"
    ).eq("shop_id", shop_id).eq("is_active", True).execute()
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
                   price_type: str = "fixed") -> dict:
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
    result = get_client().table("suq_products").insert(data).execute()
    return result.data[0]


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


# ── Price formatting ─────────────────────────────────────────


def format_price(price: int | None, price_type: str = "fixed") -> str:
    """Format price for display based on price_type."""
    if price_type == "contact" or price is None:
        return "Contact for pricing"
    if price_type == "starting_from":
        return f"Starting from {price:,} Birr"
    return f"{price:,} Birr"
