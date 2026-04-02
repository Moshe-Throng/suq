"""
Buyer handler — onboarding, intent subscriptions, personalized feed,
product search, price comparison, category browsing, push notifications.
Buyers interact with the same bot as sellers but get a different experience.
"""

import logging

from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ContextTypes

from bot.db.supabase_client import run_sync, format_price, catalog_link
from bot.strings.lang import s

logger = logging.getLogger("suq.buyer")

# ── Intent types and display info ────────────────────────────

BUYER_INTENTS = [
    ("kids", "👶 Kids & Baby", "👶 ልጆች"),
    ("fashion", "👗 Fashion", "👗 ፋሽን"),
    ("electronics", "📱 Phones & Electronics", "📱 ስልክ"),
    ("home", "🛋 Home & Furniture", "🛋 ቤት"),
    ("pets", "🐾 Pet Supplies", "🐾 እንስሳ"),
    ("gifts", "🎁 Gifts & Souvenirs", "🎁 ስጦታ"),
    ("wholesale", "📦 Wholesale", "📦 ጅምላ"),
    ("beauty", "💄 Beauty", "💄 ውበት"),
    ("food", "☕ Food & Coffee", "☕ ምግብ"),
]

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

CATEGORY_LABELS = {
    "fashion": "👗 Fashion",
    "electronics": "📱 Electronics",
    "food": "☕ Food & Coffee",
    "beauty": "💄 Beauty",
    "home": "🛋 Home",
    "handmade": "🏺 Handmade",
    "coffee": "☕ Coffee",
    "other": "📦 Other",
}


def _product_card(p: dict, idx: int = 0) -> str:
    """Format a single product as a compact text card."""
    shop = p.get("suq_shops") or {}
    price_display = format_price(p.get("price"), p.get("price_type", "fixed"))
    shop_name = shop.get("shop_name", "")
    return f"{idx}. <b>{p['name']}</b> — {price_display}\n   🏪 {shop_name}"


def _product_buttons(products: list[dict], max_items: int = 8) -> list[list[InlineKeyboardButton]]:
    """Build View buttons for a list of products."""
    buttons = []
    for p in products[:max_items]:
        shop = p.get("suq_shops") or {}
        shop_slug = shop.get("shop_slug", "")
        if shop_slug:
            link = catalog_link(shop_slug)
            label = p["name"][:28]
            buttons.append([InlineKeyboardButton(f"👁 {label}", url=link)])
    return buttons


# ── Passive registration helper ──────────────────────────────

async def _ensure_buyer(user) -> dict:
    """Register/update buyer passively on any interaction."""
    from bot.db.supabase_client import upsert_buyer
    return await run_sync(upsert_buyer, user.id, user.username, user.first_name)


# ── Entry points ─────────────────────────────────────────────

async def buyer_start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Entry point for buyers — show intent picker."""
    query = update.callback_query
    if query:
        await query.answer()
        user = query.from_user
    else:
        user = update.effective_user

    await _ensure_buyer(user)

    from bot.db.supabase_client import get_buyer_intents
    active_intents = await run_sync(get_buyer_intents, user.id)
    active_keys = {i["intent_type"] for i in active_intents}

    rows = []
    row = []
    for key, label_en, label_am in BUYER_INTENTS:
        mark = "✓ " if key in active_keys else ""
        row.append(InlineKeyboardButton(
            f"{mark}{label_en}", callback_data=f"buyer_intent_{key}"))
        if len(row) == 2:
            rows.append(row)
            row = []
    if row:
        rows.append(row)
    rows.append([InlineKeyboardButton("✅ Done", callback_data="buyer_intents_done")])

    text = (
        "🛍 <b>What are you shopping for?</b>\n\n"
        "Pick everything that interests you — we'll build a personalized feed "
        "and notify you when matching products are posted.\n\n"
        f"Selected: {len(active_keys)}"
    )

    keyboard = InlineKeyboardMarkup(rows)
    if query:
        await query.edit_message_text(text, parse_mode="HTML", reply_markup=keyboard)
    else:
        await update.message.reply_text(text, parse_mode="HTML", reply_markup=keyboard)


async def buyer_toggle_intent(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Toggle a buyer intent on/off."""
    query = update.callback_query
    await query.answer()
    user = query.from_user

    await _ensure_buyer(user)

    intent_key = query.data.replace("buyer_intent_", "")

    from bot.db.supabase_client import toggle_buyer_intent, get_buyer_intents
    await run_sync(toggle_buyer_intent, user.id, intent_key)
    active_intents = await run_sync(get_buyer_intents, user.id)
    active_keys = {i["intent_type"] for i in active_intents}

    rows = []
    row = []
    for key, label_en, label_am in BUYER_INTENTS:
        mark = "✓ " if key in active_keys else ""
        row.append(InlineKeyboardButton(
            f"{mark}{label_en}", callback_data=f"buyer_intent_{key}"))
        if len(row) == 2:
            rows.append(row)
            row = []
    if row:
        rows.append(row)
    rows.append([InlineKeyboardButton("✅ Done", callback_data="buyer_intents_done")])

    text = (
        "🛍 <b>What are you shopping for?</b>\n\n"
        "Pick everything that interests you — we'll build a personalized feed "
        "and notify you when matching products are posted.\n\n"
        f"Selected: {len(active_keys)}"
    )

    await query.edit_message_text(text, parse_mode="HTML",
                                  reply_markup=InlineKeyboardMarkup(rows))


async def buyer_intents_done(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Buyer finished selecting intents — show their personalized feed."""
    query = update.callback_query
    await query.answer()
    user = query.from_user

    from bot.db.supabase_client import get_buyer_intents
    intents = await run_sync(get_buyer_intents, user.id)

    if not intents:
        await query.edit_message_text(
            "You didn't select anything. Send /browse anytime to start shopping!\n\n"
            "Or try:\n"
            "• /search <query> — search for specific products\n"
            "• /browse — see your personalized feed")
        return

    intent_names = []
    for i in intents:
        for key, label_en, _ in BUYER_INTENTS:
            if key == i["intent_type"]:
                intent_names.append(label_en)
                break

    await query.edit_message_text(
        f"✅ <b>You're subscribed to:</b>\n"
        f"{', '.join(intent_names)}\n\n"
        f"🔔 We'll notify you when matching products are posted.\n\n"
        f"<b>What next?</b>\n"
        f"• /browse — your personalized feed\n"
        f"• /search phone case — find specific products\n"
        f"• Tap a category below to browse:",
        parse_mode="HTML",
        reply_markup=_category_browse_keyboard(),
    )


# ── Personalized feed (/browse) ──────────────────────────────

async def buyer_browse(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Browse products matching buyer's intents — personalized feed."""
    user = update.effective_user
    await _ensure_buyer(user)

    from bot.db.supabase_client import get_buyer_intents, get_personalized_feed

    intents = await run_sync(get_buyer_intents, user.id)

    if not intents:
        # No intents set — show category browser instead
        await update.message.reply_text(
            "🛍 <b>Browse Products</b>\n\n"
            "Pick a category to explore, or set up your interests "
            "for a personalized feed.\n\n"
            "• /search <query> — search for anything\n"
            "• Tap 🛒 below to set your interests",
            parse_mode="HTML",
            reply_markup=_category_browse_keyboard(include_setup=True),
        )
        return

    intent_types = [i["intent_type"] for i in intents]
    products = await run_sync(get_personalized_feed, intent_types, 15)

    if not products:
        await update.message.reply_text(
            "No products matching your interests yet. Check back soon!\n\n"
            "Try /search to find something specific.",
            reply_markup=_category_browse_keyboard(),
        )
        return

    lines = ["🛍 <b>Your Feed</b>\n"]
    for idx, p in enumerate(products, 1):
        lines.append(_product_card(p, idx))

    buttons = _product_buttons(products)
    buttons.append([
        InlineKeyboardButton("🔄 Refresh", callback_data="buyer_refresh_feed"),
        InlineKeyboardButton("⚙️ Interests", callback_data="buyer_start"),
    ])

    await update.message.reply_text(
        "\n".join(lines),
        parse_mode="HTML",
        reply_markup=InlineKeyboardMarkup(buttons),
    )


# ── Product search (/search) ─────────────────────────────────

async def buyer_search(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Search for products by keyword: /search <query>"""
    user = update.effective_user
    await _ensure_buyer(user)

    if not context.args:
        await update.message.reply_text(
            "🔍 <b>Search Products</b>\n\n"
            "Usage: /search phone case\n"
            "Usage: /search Ethiopian coffee\n\n"
            "Or browse by category:",
            parse_mode="HTML",
            reply_markup=_category_browse_keyboard(),
        )
        return

    query = " ".join(context.args).strip()
    if len(query) < 2:
        await update.message.reply_text("Search query too short. Try at least 2 characters.")
        return

    from bot.db.supabase_client import search_products_by_text
    products = await run_sync(search_products_by_text, query, 15)

    if not products:
        await update.message.reply_text(
            f"No results for \"{query}\".\n\n"
            f"Try different keywords or browse by category:",
            reply_markup=_category_browse_keyboard(),
        )
        return

    lines = [f"🔍 <b>Results for \"{query}\"</b> ({len(products)} found)\n"]
    for idx, p in enumerate(products, 1):
        lines.append(_product_card(p, idx))

    buttons = _product_buttons(products)

    # Add price comparison button if multiple results
    if len(products) >= 2:
        buttons.append([InlineKeyboardButton(
            f"💰 Compare prices for \"{query[:20]}\"",
            callback_data=f"buyer_compare_{query[:40]}")])

    await update.message.reply_text(
        "\n".join(lines),
        parse_mode="HTML",
        reply_markup=InlineKeyboardMarkup(buttons),
    )


# ── Price comparison ──────────────────────────────────────────

async def buyer_compare(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Show price comparison for a product query."""
    query = update.callback_query
    await query.answer()

    search_term = query.data.replace("buyer_compare_", "")
    if not search_term:
        return

    from bot.db.supabase_client import get_price_comparison
    products = await run_sync(get_price_comparison, search_term, 10)

    if not products:
        await query.edit_message_text(f"No priced products found for \"{search_term}\".")
        return

    lines = [f"💰 <b>Price Comparison: \"{search_term}\"</b>\n"]
    lines.append("Sorted lowest → highest:\n")

    for idx, p in enumerate(products, 1):
        shop = p.get("suq_shops") or {}
        price = p.get("price")
        price_display = format_price(price, p.get("price_type", "fixed"))
        shop_name = shop.get("shop_name", "?")
        lines.append(f"{idx}. <b>{p['name']}</b>\n   {price_display} — 🏪 {shop_name}")

    buttons = _product_buttons(products)

    await query.edit_message_text(
        "\n".join(lines),
        parse_mode="HTML",
        reply_markup=InlineKeyboardMarkup(buttons) if buttons else None,
    )


# ── Category browsing ────────────────────────────────────────

async def buyer_browse_category(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Browse products in a specific category."""
    query = update.callback_query
    await query.answer()
    user = query.from_user
    await _ensure_buyer(user)

    category = query.data.replace("buyer_cat_", "")
    label = CATEGORY_LABELS.get(category, category)

    from bot.db.supabase_client import get_products_by_category
    products = await run_sync(get_products_by_category, category, 15)

    if not products:
        await query.edit_message_text(
            f"No products in {label} yet.\n\nTry another category:",
            reply_markup=_category_browse_keyboard(),
        )
        return

    lines = [f"{label}\n"]
    for idx, p in enumerate(products, 1):
        lines.append(_product_card(p, idx))

    buttons = _product_buttons(products)
    buttons.append([InlineKeyboardButton("← Categories", callback_data="buyer_categories")])

    await query.edit_message_text(
        "\n".join(lines),
        parse_mode="HTML",
        reply_markup=InlineKeyboardMarkup(buttons),
    )


async def buyer_show_categories(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Show category browser."""
    query = update.callback_query
    await query.answer()

    await query.edit_message_text(
        "🛍 <b>Browse by Category</b>\n\nPick a category:",
        parse_mode="HTML",
        reply_markup=_category_browse_keyboard(include_setup=True),
    )


async def buyer_refresh_feed(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Refresh the personalized feed."""
    query = update.callback_query
    await query.answer("Refreshing...")
    user = query.from_user

    from bot.db.supabase_client import get_buyer_intents, get_personalized_feed

    intents = await run_sync(get_buyer_intents, user.id)
    if not intents:
        await query.edit_message_text("Set up your interests first!",
                                      reply_markup=_category_browse_keyboard(include_setup=True))
        return

    intent_types = [i["intent_type"] for i in intents]
    products = await run_sync(get_personalized_feed, intent_types, 15)

    if not products:
        await query.edit_message_text(
            "No products matching your interests right now.",
            reply_markup=_category_browse_keyboard(),
        )
        return

    lines = ["🛍 <b>Your Feed</b> (refreshed)\n"]
    for idx, p in enumerate(products, 1):
        lines.append(_product_card(p, idx))

    buttons = _product_buttons(products)
    buttons.append([
        InlineKeyboardButton("🔄 Refresh", callback_data="buyer_refresh_feed"),
        InlineKeyboardButton("⚙️ Interests", callback_data="buyer_start"),
    ])

    await query.edit_message_text(
        "\n".join(lines),
        parse_mode="HTML",
        reply_markup=InlineKeyboardMarkup(buttons),
    )


# ── Keyboard helpers ─────────────────────────────────────────

def _category_browse_keyboard(include_setup: bool = False) -> InlineKeyboardMarkup:
    """Build a compact category browsing keyboard."""
    rows = []
    row = []
    for key, label in CATEGORY_LABELS.items():
        row.append(InlineKeyboardButton(label, callback_data=f"buyer_cat_{key}"))
        if len(row) == 2:
            rows.append(row)
            row = []
    if row:
        rows.append(row)

    if include_setup:
        rows.append([InlineKeyboardButton("🛒 Set Up My Interests", callback_data="buyer_start")])

    return InlineKeyboardMarkup(rows)
