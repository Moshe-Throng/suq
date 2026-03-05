"""
Handlers for /start, /help, /language, /shop.
Onboarding flow: language → role → shop name → theme color → done.
"""

from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ContextTypes

from bot.db.supabase_client import (
    run_sync, get_shop, create_shop, catalog_link, slugify, update_shop_theme,
)
from bot.strings.lang import s, set_lang, seed_lang

# Theme palette — matches Tailwind color names for the web catalog
THEMES = {
    "teal":    {"emoji": "🟢", "label": "Teal",    "hex": "#0D9488"},
    "purple":  {"emoji": "🟣", "label": "Purple",  "hex": "#7C3AED"},
    "rose":    {"emoji": "🔴", "label": "Rose",    "hex": "#E11D48"},
    "orange":  {"emoji": "🟠", "label": "Orange",  "hex": "#EA580C"},
    "emerald": {"emoji": "💚", "label": "Emerald", "hex": "#059669"},
    "gold":    {"emoji": "🟡", "label": "Gold",    "hex": "#B45309"},
}


async def start_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle /start — language picker or seller menu."""
    user = update.effective_user

    shop = await run_sync(get_shop, user.id)
    if shop:
        seed_lang(user.id, shop.get("language", "am"))
        await _send_seller_menu(update, user.id, shop)
        return

    keyboard = InlineKeyboardMarkup([
        [
            InlineKeyboardButton("🇪🇹 አማርኛ", callback_data="lang_am"),
            InlineKeyboardButton("🇬🇧 English", callback_data="lang_en"),
        ]
    ])
    await update.message.reply_text(
        "🌍 ቋንቋ ይምረጡ / Choose your language:",
        reply_markup=keyboard,
    )


async def language_callback(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle lang_am / lang_en callback."""
    query = update.callback_query
    await query.answer()
    user = query.from_user
    lang = query.data.split("_")[1]
    set_lang(user.id, lang)
    t = s(user.id)

    shop = await run_sync(get_shop, user.id)
    if shop:
        await query.edit_message_text(t.LANG_CHANGED)
        await _send_seller_menu_from_query(query, user.id, shop)
        return

    keyboard = InlineKeyboardMarkup([
        [
            InlineKeyboardButton(t.BTN_SELLER, callback_data="role_seller"),
            InlineKeyboardButton(t.BTN_BUYER, callback_data="role_buyer"),
        ]
    ])
    await query.edit_message_text(
        f"{t.LANG_CHANGED}\n\n{t.WELCOME}\n\n{t.ASK_ROLE}",
        reply_markup=keyboard,
    )


async def role_callback(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle role_seller / role_buyer callback."""
    query = update.callback_query
    await query.answer()
    user = query.from_user
    t = s(user.id)

    if query.data == "role_buyer":
        await query.edit_message_text(t.BUYER_WELCOME)
        return

    shop = await run_sync(get_shop, user.id)
    if shop:
        link = catalog_link(shop["shop_slug"])
        await query.edit_message_text(
            t.SHOP_EXISTS.format(name=shop["shop_name"], link=link)
        )
        return

    await query.edit_message_text(t.ASK_SHOP_NAME)
    context.user_data["awaiting_shop_name"] = True


async def shop_name_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle shop name text → show theme picker."""
    if not context.user_data.get("awaiting_shop_name"):
        return

    user = update.effective_user
    t = s(user.id)
    name = update.message.text.strip()

    if len(name) < 2 or len(name) > 30:
        await update.message.reply_text(t.SHOP_NAME_INVALID)
        return

    slug = slugify(name)
    if not slug:
        await update.message.reply_text(t.SHOP_NAME_INVALID)
        return

    # Store name temporarily, show theme picker
    context.user_data["pending_shop_name"] = name
    context.user_data.pop("awaiting_shop_name", None)

    # Build theme picker grid (2×3)
    keys = list(THEMES.keys())
    keyboard = InlineKeyboardMarkup([
        [
            InlineKeyboardButton(
                f"{THEMES[k]['emoji']} {THEMES[k]['label']}",
                callback_data=f"theme_{k}",
            )
            for k in keys[i:i+2]
        ]
        for i in range(0, len(keys), 2)
    ])

    await update.message.reply_text(
        t.ASK_THEME_COLOR,
        reply_markup=keyboard,
    )


async def theme_callback(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle theme_{color} callback → create shop."""
    query = update.callback_query
    await query.answer()
    user = query.from_user
    t = s(user.id)

    theme = query.data.replace("theme_", "")
    name = context.user_data.pop("pending_shop_name", None)

    if not name:
        await query.edit_message_text(t.ERROR)
        return

    from bot.strings.lang import get_lang
    lang = get_lang(user.id)

    try:
        shop = await run_sync(create_shop, user.id, user.username, name, lang, theme)
        link = catalog_link(shop["shop_slug"])
        theme_info = THEMES.get(theme, THEMES["teal"])
        await query.edit_message_text(
            f"{theme_info['emoji']} {t.SHOP_CREATED.format(name=shop['shop_name'], link=link)}"
        )
        await _send_seller_menu_from_query(query, user.id, shop)
    except Exception as e:
        if "duplicate" in str(e).lower() or "unique" in str(e).lower():
            await query.edit_message_text(t.SHOP_NAME_TAKEN)
        else:
            await query.edit_message_text(t.ERROR)


async def shop_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle /shop — show shop link."""
    user = update.effective_user
    t = s(user.id)
    shop = await run_sync(get_shop, user.id)
    if not shop:
        await update.message.reply_text(t.ASK_ROLE)
        return
    link = catalog_link(shop["shop_slug"])
    await update.message.reply_text(f"🔗 {link}")


async def language_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle /language — show language selection."""
    keyboard = InlineKeyboardMarkup([
        [
            InlineKeyboardButton("🇪🇹 አማርኛ", callback_data="lang_am"),
            InlineKeyboardButton("🇬🇧 English", callback_data="lang_en"),
        ]
    ])
    await update.message.reply_text(
        "🌍 ቋንቋ ይምረጡ / Choose your language:",
        reply_markup=keyboard,
    )


async def help_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle /help."""
    t = s(update.effective_user.id)
    await update.message.reply_text(t.HELP)


# ── Internal helpers ─────────────────────────────────────────


def _seller_keyboard(t):
    """Build the 3x2 seller dashboard keyboard."""
    return InlineKeyboardMarkup([
        [
            InlineKeyboardButton(t.BTN_ADD_PRODUCT, callback_data="menu_add"),
            InlineKeyboardButton(t.BTN_MY_PRODUCTS, callback_data="menu_products"),
        ],
        [
            InlineKeyboardButton(t.BTN_MY_ORDERS, callback_data="menu_orders"),
            InlineKeyboardButton(t.BTN_SHOP_LINK, callback_data="menu_shop_link"),
        ],
        [
            InlineKeyboardButton(t.BTN_SETTINGS, callback_data="menu_settings"),
            InlineKeyboardButton(t.BTN_SHARE_SHOP, callback_data="menu_share"),
        ],
    ])


async def _send_seller_menu(update: Update, user_id: int, shop: dict) -> None:
    t = s(user_id)
    link = catalog_link(shop["shop_slug"])
    await update.message.reply_text(
        f"🏪 {shop['shop_name']}\n{link}",
        reply_markup=_seller_keyboard(t),
    )


async def _send_seller_menu_from_query(query, user_id: int, shop: dict) -> None:
    t = s(user_id)
    link = catalog_link(shop["shop_slug"])
    await query.message.reply_text(
        f"🏪 {shop['shop_name']}\n{link}",
        reply_markup=_seller_keyboard(t),
    )
