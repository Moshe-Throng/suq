"""
Category channel auto-repost — posts new products to themed Telegram channels.
Channels must be created manually and bot added as admin.
"""

import os
import logging
from telegram import InlineKeyboardButton, InlineKeyboardMarkup

from bot.db.supabase_client import catalog_link, format_price

logger = logging.getLogger("suq.category_channels")

# Maps shop category → channel username (from env or defaults)
CATEGORY_CHANNELS: dict[str, str] = {}


def _load_channels():
    """Load channel mappings from env vars like SOUK_CHANNEL_FASHION=@SoukFashion."""
    global CATEGORY_CHANNELS
    for key, val in os.environ.items():
        if key.startswith("SOUK_CHANNEL_"):
            category = key.replace("SOUK_CHANNEL_", "").lower()
            CATEGORY_CHANNELS[category] = val
    # Fallback defaults (only used if env vars not set)
    defaults = {
        "fashion": "@SoukFashion",
        "food": "@SoukFood",
        "electronics": "@SoukElectronics",
        "beauty": "@SoukBeauty",
        "handmade": "@SoukHandmade",
        "coffee": "@SoukCoffee",
        "home": "@SoukHome",
    }
    for cat, ch in defaults.items():
        CATEGORY_CHANNELS.setdefault(cat, ch)


_load_channels()


async def repost_to_category_channel(bot, product: dict, shop: dict) -> bool:
    """Post a product card to the matching category channel.
    Returns True if posted, False if no matching channel or error."""
    category = shop.get("category")
    if not category:
        return False

    channel = CATEGORY_CHANNELS.get(category)
    if not channel:
        return False

    shop_slug = shop.get("shop_slug", "")
    product_id = product.get("id", "")
    link = catalog_link(f"{shop_slug}")

    price_display = format_price(product.get("price"), product.get("price_type", "fixed"))
    shop_name = shop.get("shop_name", "Shop")

    caption = (
        f"<b>{product.get('name', 'New product')}</b>\n"
        f"{price_display}\n"
        f"{shop_name}\n\n"
        f"{link}"
    )

    keyboard = InlineKeyboardMarkup([
        [InlineKeyboardButton("View on souk.et", url=link)],
    ])

    try:
        photo_file_id = product.get("photo_file_id")
        if photo_file_id:
            await bot.send_photo(
                chat_id=channel,
                photo=photo_file_id,
                caption=caption,
                parse_mode="HTML",
                reply_markup=keyboard,
            )
        else:
            await bot.send_message(
                chat_id=channel,
                text=caption,
                parse_mode="HTML",
                reply_markup=keyboard,
            )
        logger.info(f"Reposted product '{product.get('name')}' to {channel}")
        return True
    except Exception as e:
        logger.warning(f"Failed to repost to {channel}: {e}")
        return False
