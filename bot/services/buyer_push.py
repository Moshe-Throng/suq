"""
Buyer push notifications — notify subscribed buyers when matching products appear.
"""

import logging
from telegram import InlineKeyboardButton, InlineKeyboardMarkup

from bot.db.supabase_client import (
    run_sync, format_price, catalog_link,
    get_buyers_for_category, record_buyer_push, was_already_pushed,
)

logger = logging.getLogger("suq.buyer_push")

# Maps shop category to buyer intent types
CATEGORY_TO_INTENTS = {
    "fashion": ["fashion", "kids"],
    "food": ["food"],
    "electronics": ["electronics"],
    "beauty": ["beauty"],
    "handmade": ["gifts", "kids"],
    "coffee": ["food", "gifts"],
    "home": ["home"],
    "salon": ["beauty"],
    "photo": [],
    "tutoring": [],
    "design": [],
    "repair": ["electronics"],
    "fitness": [],
    "events": [],
    "other": ["pets", "gifts"],
}


async def push_product_to_buyers(bot, product: dict, shop: dict) -> int:
    """Push a new product to buyers whose intents match.
    Returns number of buyers notified."""
    category = shop.get("category")
    if not category:
        return 0

    intent_types = CATEGORY_TO_INTENTS.get(category, [])
    if not intent_types:
        return 0

    product_id = product.get("id")
    if not product_id:
        return 0

    # Get all buyers subscribed to matching intents
    buyers = await run_sync(get_buyers_for_category, intent_types)
    if not buyers:
        return 0

    price_display = format_price(product.get("price"), product.get("price_type", "fixed"))
    shop_name = shop.get("shop_name", "Shop")
    shop_slug = shop.get("shop_slug", "")
    link = catalog_link(shop_slug)

    text = (
        f"<b>{product.get('name', 'New product')}</b>\n"
        f"{price_display}\n"
        f"{shop_name}\n"
    )

    keyboard = InlineKeyboardMarkup([
        [InlineKeyboardButton("View →", url=link)],
    ])

    sent = 0
    for buyer in buyers:
        buyer_id = buyer["id"]
        telegram_id = buyer["telegram_id"]

        # Skip if already pushed this product
        if await run_sync(was_already_pushed, buyer_id, product_id):
            continue

        try:
            photo_file_id = product.get("photo_file_id")
            if photo_file_id:
                await bot.send_photo(
                    chat_id=telegram_id,
                    photo=photo_file_id,
                    caption=text,
                    parse_mode="HTML",
                    reply_markup=keyboard,
                )
            else:
                await bot.send_message(
                    chat_id=telegram_id,
                    text=text,
                    parse_mode="HTML",
                    reply_markup=keyboard,
                )
            await run_sync(record_buyer_push, buyer_id, product_id)
            sent += 1
        except Exception as e:
            logger.warning(f"Failed to push to buyer {telegram_id}: {e}")

    if sent > 0:
        logger.info(f"Pushed '{product.get('name')}' to {sent} buyers")
    return sent
