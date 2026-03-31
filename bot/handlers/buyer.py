"""
Buyer handler — onboarding, intent subscriptions, product search, push notifications.
Buyers interact with the same bot as sellers but get a different experience.
"""

import logging

from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ContextTypes

from bot.db.supabase_client import run_sync
from bot.strings.lang import s

logger = logging.getLogger("suq.buyer")

# Intent types and their display info
BUYER_INTENTS = [
    ("kids", "Kids & Baby"),
    ("fashion", "Fashion"),
    ("electronics", "Phones & Electronics"),
    ("home", "Home & Furniture"),
    ("pets", "Pet Supplies"),
    ("gifts", "Gifts & Souvenirs"),
    ("wholesale", "Wholesale / Business"),
    ("beauty", "Beauty & Cosmetics"),
    ("food", "Food & Coffee"),
]

BUYER_INTENTS_AM = {
    "kids": "ልጆች",
    "fashion": "ፋሽን",
    "electronics": "ስልክ እና ኤሌክትሮኒክስ",
    "home": "ቤት እና ዕቃ",
    "pets": "የቤት እንስሳ",
    "gifts": "ስጦታ",
    "wholesale": "ጅምላ / ንግድ",
    "beauty": "ውበት",
    "food": "ምግብ እና ቡና",
}

# Maps intent types to shop categories for matching
INTENT_TO_CATEGORIES = {
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


async def buyer_start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Entry point for buyers — show intent picker."""
    query = update.callback_query
    if query:
        await query.answer()
        user = query.from_user
    else:
        user = update.effective_user

    # Register buyer
    from bot.db.supabase_client import upsert_buyer
    await run_sync(upsert_buyer, user.id, user.username, user.first_name)

    # Build intent picker keyboard
    rows = []
    row = []
    for key, label in BUYER_INTENTS:
        row.append(InlineKeyboardButton(label, callback_data=f"buyer_intent_{key}"))
        if len(row) == 2:
            rows.append(row)
            row = []
    if row:
        rows.append(row)
    rows.append([InlineKeyboardButton("Done", callback_data="buyer_intents_done")])

    text = (
        "What are you shopping for?\n\n"
        "Pick everything that interests you — we'll send you the best matches."
    )

    keyboard = InlineKeyboardMarkup(rows)
    if query:
        await query.edit_message_text(text, reply_markup=keyboard)
    else:
        await update.message.reply_text(text, reply_markup=keyboard)


async def buyer_toggle_intent(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Toggle a buyer intent on/off."""
    query = update.callback_query
    await query.answer()
    user = query.from_user
    intent_key = query.data.replace("buyer_intent_", "")

    from bot.db.supabase_client import toggle_buyer_intent, get_buyer_intents
    await run_sync(toggle_buyer_intent, user.id, intent_key)

    # Rebuild keyboard with checkmarks
    active_intents = await run_sync(get_buyer_intents, user.id)
    active_keys = {i["intent_type"] for i in active_intents}

    rows = []
    row = []
    for key, label in BUYER_INTENTS:
        mark = "✓ " if key in active_keys else ""
        row.append(InlineKeyboardButton(f"{mark}{label}", callback_data=f"buyer_intent_{key}"))
        if len(row) == 2:
            rows.append(row)
            row = []
    if row:
        rows.append(row)
    rows.append([InlineKeyboardButton("Done ✓", callback_data="buyer_intents_done")])

    text = (
        "What are you shopping for?\n\n"
        "Pick everything that interests you — we'll send you the best matches.\n\n"
        f"Selected: {len(active_keys)}"
    )

    await query.edit_message_text(text, reply_markup=InlineKeyboardMarkup(rows))


async def buyer_intents_done(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Buyer finished selecting intents."""
    query = update.callback_query
    await query.answer()
    user = query.from_user

    from bot.db.supabase_client import get_buyer_intents
    intents = await run_sync(get_buyer_intents, user.id)

    if not intents:
        await query.edit_message_text(
            "You didn't select anything. Send /browse anytime to start shopping!")
        return

    intent_names = [dict(BUYER_INTENTS).get(i["intent_type"], i["intent_type"]) for i in intents]
    await query.edit_message_text(
        f"You're subscribed to: {', '.join(intent_names)}\n\n"
        f"We'll notify you when matching products are posted.\n\n"
        f"Send /browse to see what's available now.")


async def buyer_browse(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Browse products matching buyer's intents."""
    user = update.effective_user

    from bot.db.supabase_client import (
        get_buyer_intents, search_products_by_categories, catalog_link, format_price
    )

    intents = await run_sync(get_buyer_intents, user.id)
    if not intents:
        await update.message.reply_text(
            "You haven't set up your interests yet.\nSend /shop to pick what you're looking for.")
        return

    # Collect matching categories from intents
    categories = set()
    for intent in intents:
        cats = INTENT_TO_CATEGORIES.get(intent["intent_type"], [])
        categories.update(cats)

    products = await run_sync(search_products_by_categories, list(categories), limit=10)
    if not products:
        await update.message.reply_text("No products found matching your interests yet. Check back soon!")
        return

    lines = ["<b>Products for you:</b>\n"]
    buttons = []
    for p in products:
        shop = p.get("suq_shops") or {}
        price_display = format_price(p.get("price"), p.get("price_type", "fixed"))
        shop_name = shop.get("shop_name", "")
        shop_slug = shop.get("shop_slug", "")
        lines.append(f"• <b>{p['name']}</b> — {price_display}")
        if shop_name:
            lines.append(f"  {shop_name}")
        if shop_slug:
            link = catalog_link(shop_slug)
            buttons.append([InlineKeyboardButton(
                f"{p['name'][:25]}... →", url=link)])

    keyboard = InlineKeyboardMarkup(buttons[:5]) if buttons else None
    await update.message.reply_text(
        "\n".join(lines), parse_mode="HTML", reply_markup=keyboard)
