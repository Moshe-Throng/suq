"""
Handlers for /start, /help, /language, /shop.
Onboarding flow: language → type → shop name → category → template style → done.
"""

import os
import asyncio
import logging

from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ContextTypes

from bot.db.supabase_client import (
    run_sync, get_shop, create_shop, catalog_link, slugify,
    update_shop_theme, update_shop_template, get_product,
)
from bot.strings.lang import s, set_lang, seed_lang

_log = logging.getLogger("suq.start")
_ADMIN_CHAT_ID = os.getenv("ADMIN_CHAT_ID") or os.getenv("OWNER_CHAT_ID")


async def _notify_admin_new_shop(bot, shop: dict, user) -> None:
    """Send real-time notification to admin when a new shop is created."""
    if not _ADMIN_CHAT_ID:
        return
    try:
        link = catalog_link(shop["shop_slug"])
        username = f"@{user.username}" if user.username else "no username"
        lines = [
            "🆕 <b>New Shop Created!</b>",
            f"🏪 {shop['shop_name']}",
            f"👤 {username} (ID: {user.id})",
            f"📂 {shop.get('category', '—')} | {shop.get('shop_type', 'product')}",
        ]
        if shop.get("location_text"):
            lines.append(f"📍 {shop['location_text']}")
        lines.append(f"🔗 {link}")
        await bot.send_message(
            chat_id=int(_ADMIN_CHAT_ID),
            text="\n".join(lines),
            parse_mode="HTML",
        )
    except Exception as e:
        _log.warning(f"Admin notification failed: {e}")

# 10 color options for brand color picker
COLORS = {
    "purple":   {"emoji": "🟣", "hex": "#7C3AED", "label": "Purple"},
    "blue":     {"emoji": "🔵", "hex": "#2563EB", "label": "Blue"},
    "cyan":     {"emoji": "💠", "hex": "#06B6D4", "label": "Cyan"},
    "teal":     {"emoji": "🟢", "hex": "#0D9488", "label": "Teal"},
    "green":    {"emoji": "💚", "hex": "#059669", "label": "Green"},
    "orange":   {"emoji": "🟠", "hex": "#EA580C", "label": "Orange"},
    "red":      {"emoji": "🔴", "hex": "#E11D48", "label": "Red"},
    "amber":    {"emoji": "🟡", "hex": "#D97706", "label": "Amber"},
    "charcoal": {"emoji": "⚫", "hex": "#374151", "label": "Charcoal"},
    "brown":    {"emoji": "🟤", "hex": "#92400E", "label": "Brown"},
}

# Location area keys + their string attribute names
LOCATION_AREA_KEYS = [
    ("bole", "LOC_BOLE"), ("megenagna", "LOC_MEGENAGNA"), ("cmc", "LOC_CMC"),
    ("piazza", "LOC_PIAZZA"), ("merkato", "LOC_MERKATO"), ("kazanchis", "LOC_KAZANCHIS"),
    ("sarbet", "LOC_SARBET"), ("mexico", "LOC_MEXICO"), ("4kilo", "LOC_4KILO"),
    ("diredawa", "LOC_DIREDAWA"), ("bahirdar", "LOC_BAHIRDAR"), ("hawassa", "LOC_HAWASSA"),
    ("mekelle", "LOC_MEKELLE"), ("adama", "LOC_ADAMA"), ("jimma", "LOC_JIMMA"),
    ("gondar", "LOC_GONDAR"), ("other", "LOC_OTHER"),
]

# English fallback names (used for DB storage and legacy compat)
LOCATION_AREAS = [
    ("bole", "Bole"), ("megenagna", "Megenagna"), ("cmc", "CMC"),
    ("piazza", "Piazza"), ("merkato", "Merkato"), ("kazanchis", "Kazanchis"),
    ("sarbet", "Sarbet"), ("mexico", "Mexico"), ("4kilo", "4 Kilo"),
    ("diredawa", "Dire Dawa"), ("bahirdar", "Bahir Dar"), ("hawassa", "Hawassa"),
    ("mekelle", "Mekelle"), ("adama", "Adama"), ("jimma", "Jimma"),
    ("gondar", "Gondar"), ("other", "Other"),
]
LOCATION_MAP = {key: name for key, name in LOCATION_AREAS}

# Legacy template styles dict (kept for backward compat)
TEMPLATES = {
    "clean":    {"emoji": "✨", "label_attr": "TMPL_CLEAN",    "hex": "#7C3AED"},
    "bold":     {"emoji": "⚡", "label_attr": "TMPL_BOLD",     "hex": "#06B6D4"},
    "ethiopian":{"emoji": "🇪🇹", "label_attr": "TMPL_ETHIOPIAN","hex": "#B45309"},
    "fresh":    {"emoji": "🌿", "label_attr": "TMPL_FRESH",    "hex": "#0D9488"},
    "minimal":  {"emoji": "◻️", "label_attr": "TMPL_MINIMAL",  "hex": "#374151"},
    "warm":     {"emoji": "🌅", "label_attr": "TMPL_WARM",     "hex": "#EA580C"},
}

# Legacy theme palette (for backward compat with existing shops)
THEMES = {
    "teal":    {"emoji": "🟢", "label": "Teal",    "hex": "#0D9488"},
    "purple":  {"emoji": "🟣", "label": "Purple",  "hex": "#7C3AED"},
    "rose":    {"emoji": "🔴", "label": "Rose",    "hex": "#E11D48"},
    "orange":  {"emoji": "🟠", "label": "Orange",  "hex": "#EA580C"},
    "emerald": {"emoji": "💚", "label": "Emerald", "hex": "#059669"},
    "gold":    {"emoji": "🟡", "label": "Gold",    "hex": "#B45309"},
}

# Categories per business type
PRODUCT_CATEGORIES = [
    ("food",        "CAT_FOOD"),
    ("fashion",     "CAT_FASHION"),
    ("electronics", "CAT_ELECTRONICS"),
    ("beauty",      "CAT_BEAUTY"),
    ("handmade",    "CAT_HANDMADE"),
    ("coffee",      "CAT_COFFEE"),
    ("home",        "CAT_HOME"),
    ("other",       "CAT_OTHER"),
]

SERVICE_CATEGORIES = [
    ("salon",    "CAT_SALON"),
    ("photo",    "CAT_PHOTO"),
    ("tutoring", "CAT_TUTORING"),
    ("design",   "CAT_DESIGN"),
    ("repair",   "CAT_REPAIR"),
    ("fitness",  "CAT_FITNESS"),
    ("events",   "CAT_EVENTS"),
    ("other",    "CAT_OTHER"),
]


# ── /start ───────────────────────────────────────────────────


async def start_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle /start — language picker, seller menu, or buyer contact deep link."""
    user = update.effective_user

    # ── Check for deep links ──
    args = context.args

    # Web login deep link: /start weblogin_<nonce>
    if args and args[0].startswith("weblogin_"):
        nonce = args[0][len("weblogin_"):]
        await _handle_weblogin_deeplink(update, user, nonce)
        return

    # Buyer contact deep link: /start contact_{product_id}
    if args and args[0].startswith("contact_"):
        product_id = args[0][len("contact_"):]
        await _handle_contact_deeplink(update, product_id)
        return

    # Shop claim deep link: /start claim_SHOPSLUG
    if args and args[0].startswith("claim_"):
        shop_slug = args[0][len("claim_"):]
        from bot.handlers.claim import start_claim
        await start_claim(update, context, shop_slug)
        return

    shop = await run_sync(get_shop, user.id)
    if shop:
        lang = shop.get("language", "am")
        seed_lang(user.id, lang)
        from bot.utils.commands import set_user_commands
        await set_user_commands(context.bot, user.id, lang)
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


async def _handle_weblogin_deeplink(update: Update, user, nonce: str) -> None:
    """Handle web login deep link: verify seller, write JWT to suq_web_logins."""
    from bot.db.supabase_client import get_client
    from bot.services.web_auth import generate_admin_token

    shop = await run_sync(get_shop, user.id)
    t = s(user.id)
    if not shop:
        await update.message.reply_text(
            getattr(t, "NO_SHOP_YET", "You don't have a shop yet. Use /start to create one first.")
        )
        return
    seed_lang(user.id, shop.get("language", "am"))
    t = s(user.id)

    # Generate JWT
    token = generate_admin_token(user.id, shop["id"], shop["shop_slug"])

    # Write JWT back to suq_web_logins
    client = get_client()
    result = client.table("suq_web_logins").update({
        "jwt": token,
        "shop_slug": shop["shop_slug"],
    }).eq("nonce", nonce).execute()

    if not result.data:
        await update.message.reply_text(
            getattr(t, "LOGIN_EXPIRED", "This login link has expired. Please try again from the website.")
        )
        return

    await update.message.reply_text(
        getattr(t, "LOGIN_SUCCESS", "You're now logged in on the web!\n\n🏪 {name}").format(name=shop["shop_name"])
    )


async def _handle_contact_deeplink(update: Update, product_id: str) -> None:
    """Handle buyer clicking a product contact link from the web catalog."""
    from bot.db.supabase_client import get_client

    user = update.effective_user
    t = s(user.id)

    product = await run_sync(get_product, product_id)
    if not product:
        await update.message.reply_text(
            getattr(t, "PRODUCT_NOT_FOUND", "😕 Sorry, this product was not found or is no longer available.")
        )
        return

    # Get shop info
    client = get_client()
    result = client.table("suq_shops").select(
        "shop_name, shop_slug, telegram_username, telegram_id"
    ).eq("id", product["shop_id"]).execute()
    shop = result.data[0] if result.data else None

    if not shop:
        await update.message.reply_text(
            getattr(t, "SHOP_NOT_FOUND", "😕 Sorry, this shop is no longer available.")
        )
        return

    # Format price
    price_str = ""
    if product.get("price") is not None and product.get("price_type") != "contact":
        price_str = f"\n💰 {product['price']:,} ብር"
        if product.get("price_type") == "starting_from":
            price_str = f"\n💰 ከ {product['price']:,} ብር"
    elif product.get("price_type") == "contact":
        price_str = "\n💰 ለዋጋ ያግኙን"

    text = (
        f"📦 <b>{product['name']}</b>{price_str}\n"
        f"🏪 {shop['shop_name']}\n\n"
    )

    buttons = []

    # Direct link to seller's Telegram
    if shop.get("telegram_username"):
        text += getattr(t, "CONTACT_SELLER", "👤 Contact the seller directly:") + "\n"
        buttons.append([
            InlineKeyboardButton(
                getattr(t, "BTN_MESSAGE_SHOP", "💬 Message {name}").format(name=shop["shop_name"]),
                url=f"https://t.me/{shop['telegram_username']}"
            )
        ])
    else:
        text += getattr(t, "NO_DIRECT_MSG", "ℹ️ This seller hasn't set up direct messaging yet.") + "\n"

    # Link to product on web
    buttons.append([
        InlineKeyboardButton(
            getattr(t, "BTN_VIEW_WEB", "🌐 View on souk.et"),
            url=catalog_link(f"{shop['shop_slug']}/{product_id}")
        )
    ])

    # Send product photo if available
    if product.get("photo_url"):
        await update.message.reply_photo(
            photo=product["photo_url"],
            caption=text,
            parse_mode="HTML",
            reply_markup=InlineKeyboardMarkup(buttons) if buttons else None,
        )
    elif product.get("photo_file_id"):
        await update.message.reply_photo(
            photo=product["photo_file_id"],
            caption=text,
            parse_mode="HTML",
            reply_markup=InlineKeyboardMarkup(buttons) if buttons else None,
        )
    else:
        await update.message.reply_text(
            text,
            parse_mode="HTML",
            reply_markup=InlineKeyboardMarkup(buttons) if buttons else None,
        )


# ── Language ─────────────────────────────────────────────────


async def language_callback(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle lang_am / lang_en callback."""
    query = update.callback_query
    await query.answer()
    user = query.from_user
    lang = query.data.split("_")[1]
    set_lang(user.id, lang)
    from bot.utils.commands import set_user_commands
    await set_user_commands(context.bot, user.id, lang)
    t = s(user.id)

    shop = await run_sync(get_shop, user.id)
    if shop:
        await query.edit_message_text(t.LANG_CHANGED)
        await _send_seller_menu_from_query(query, user.id, shop)
        return

    # New user → show business type selection (skip role picker)
    keyboard = InlineKeyboardMarkup([
        [
            InlineKeyboardButton(t.BTN_TYPE_PRODUCT, callback_data="type_product"),
            InlineKeyboardButton(t.BTN_TYPE_SERVICE, callback_data="type_service"),
        ]
    ])
    await query.edit_message_text(
        f"{t.LANG_CHANGED}\n\n{t.WELCOME}",
        reply_markup=keyboard,
    )


# ── Business type ────────────────────────────────────────────


async def type_callback(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle type_product / type_service callback."""
    query = update.callback_query
    await query.answer()
    user = query.from_user
    t = s(user.id)

    shop_type = query.data.replace("type_", "")  # "product" or "service"
    context.user_data["pending_shop_type"] = shop_type

    shop = await run_sync(get_shop, user.id)
    if shop:
        link = catalog_link(shop["shop_slug"])
        await query.edit_message_text(
            t.SHOP_EXISTS.format(name=shop["shop_name"], link=link)
        )
        return

    await query.edit_message_text(t.ASK_SHOP_NAME)
    context.user_data["awaiting_shop_name"] = True


# ── Legacy role callback (backward compat) ───────────────────


async def role_callback(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle role_seller / role_buyer callback (legacy)."""
    query = update.callback_query
    await query.answer()
    user = query.from_user
    t = s(user.id)

    if query.data == "role_buyer":
        await query.edit_message_text(t.BUYER_WELCOME)
        return

    # Treat as product seller
    context.user_data["pending_shop_type"] = "product"
    shop = await run_sync(get_shop, user.id)
    if shop:
        link = catalog_link(shop["shop_slug"])
        await query.edit_message_text(
            t.SHOP_EXISTS.format(name=shop["shop_name"], link=link)
        )
        return

    await query.edit_message_text(t.ASK_SHOP_NAME)
    context.user_data["awaiting_shop_name"] = True


# ── Shop name → category ────────────────────────────────────


async def shop_name_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle shop name text → show category picker."""
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

    context.user_data["pending_shop_name"] = name
    context.user_data.pop("awaiting_shop_name", None)

    # Show category picker based on business type
    shop_type = context.user_data.get("pending_shop_type", "product")
    cats = SERVICE_CATEGORIES if shop_type == "service" else PRODUCT_CATEGORIES

    keyboard = InlineKeyboardMarkup([
        [InlineKeyboardButton(
            getattr(t, attr, key.title()),
            callback_data=f"cat_{key}",
        )]
        for key, attr in cats
    ])

    await update.message.reply_text(t.ASK_CATEGORY, reply_markup=keyboard)


# ── Category → color picker ──────────────────────────────────


async def category_callback(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle cat_* callback → show brand color picker."""
    query = update.callback_query
    await query.answer()
    user = query.from_user
    t = s(user.id)

    category = query.data.replace("cat_", "")
    context.user_data["pending_category"] = category

    # Show color picker (2 per row, 5 rows)
    keys = list(COLORS.keys())
    keyboard = InlineKeyboardMarkup([
        [
            InlineKeyboardButton(
                f"{COLORS[k]['emoji']} {COLORS[k]['label']}",
                callback_data=f"color_{k}",
            )
            for k in keys[i:i + 2]
        ]
        for i in range(0, len(keys), 2)
    ])

    await query.edit_message_text(
        getattr(t, "ASK_COLOR", "🎨 Pick your brand color:"),
        reply_markup=keyboard,
    )


# ── Color → location picker ──────────────────────────────────


def _location_keyboard(t, prefix: str = "loc_") -> InlineKeyboardMarkup:
    """Build the location picker keyboard (3 per row + skip).
    prefix: 'loc_' for onboarding, 'setloc_' for settings."""
    rows = []
    row = []
    for key, attr in LOCATION_AREA_KEYS:
        label = getattr(t, attr, LOCATION_MAP.get(key, key.title()))
        row.append(InlineKeyboardButton(label, callback_data=f"{prefix}{key}"))
        if len(row) == 3:
            rows.append(row)
            row = []
    if row:
        rows.append(row)
    skip_data = f"{prefix}skip"
    rows.append([InlineKeyboardButton(
        getattr(t, "BTN_LOCATION_SKIP", "⏭ Skip"),
        callback_data=skip_data,
    )])
    return InlineKeyboardMarkup(rows)


async def color_callback(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle color_* (and legacy tmpl_*) callback → store color, show location picker."""
    query = update.callback_query
    await query.answer()
    user = query.from_user
    t = s(user.id)

    data = query.data
    if data.startswith("color_"):
        color_key = data.replace("color_", "")
    else:
        # Legacy tmpl_* mapping
        _legacy = {
            "clean": "purple", "bold": "cyan", "ethiopian": "brown",
            "fresh": "teal", "minimal": "charcoal", "warm": "orange",
        }
        color_key = _legacy.get(data.replace("tmpl_", ""), "purple")

    if color_key not in COLORS:
        color_key = "purple"

    context.user_data["pending_template_style"] = color_key
    await query.edit_message_text(
        getattr(t, "ASK_LOCATION", "📍 Where is your shop? (optional)"),
        reply_markup=_location_keyboard(t),
    )


# Legacy alias
async def template_callback(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Legacy handler — delegates to color_callback."""
    await color_callback(update, context)


# ── Location → create shop ───────────────────────────────────


async def location_callback(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle loc_* callback → create shop."""
    query = update.callback_query
    await query.answer()
    user = query.from_user
    t = s(user.id)

    loc_key = query.data.replace("loc_", "")
    location_text = None if loc_key == "skip" else LOCATION_MAP.get(loc_key)

    name = context.user_data.pop("pending_shop_name", None)
    shop_type = context.user_data.pop("pending_shop_type", "product")
    category = context.user_data.pop("pending_category", None)
    color_key = context.user_data.pop("pending_template_style", "purple")

    if not name:
        await query.edit_message_text(t.ERROR)
        return

    from bot.strings.lang import get_lang
    lang = get_lang(user.id)

    try:
        shop = await run_sync(
            create_shop, user.id, user.username, name, lang,
            theme_color="teal",
            shop_type=shop_type,
            category=category,
            template_style=color_key,
            location_text=location_text,
        )
        if shop is None:
            waitlist_msg = getattr(t, "WAITLIST_MSG", "We're at capacity right now! We'll notify you when spots open up.")
            await query.edit_message_text(waitlist_msg)
            return
        link = catalog_link(shop["shop_slug"])
        item_type = t.SHOP_CREATED_SERVICE if shop_type == "service" else t.SHOP_CREATED_PRODUCT
        color_info = COLORS.get(color_key, COLORS["purple"])
        free_plan = getattr(t, "FREE_PLAN_INFO", "Free plan: up to {max} products, free for 1 year.").format(max=15)
        await query.edit_message_text(
            f"{color_info['emoji']} {t.SHOP_CREATED.format(name=shop['shop_name'], link=link, item_type=item_type)}\n\n{free_plan}"
        )
        await _send_seller_menu_from_query(query, user.id, shop)
        # Notify admin in real-time
        asyncio.create_task(_notify_admin_new_shop(context.bot, shop, user))
    except Exception as e:
        if "duplicate" in str(e).lower() or "unique" in str(e).lower():
            await query.edit_message_text(t.SHOP_NAME_TAKEN)
        else:
            await query.edit_message_text(t.ERROR)


# ── Legacy theme callback (for old onboarding buttons) ───────


async def theme_callback(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle theme_{color} callback → create shop (legacy flow)."""
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

    # Map old theme to new template
    theme_to_tmpl = {
        "teal": "fresh", "purple": "clean", "rose": "warm",
        "orange": "warm", "emerald": "fresh", "gold": "ethiopian",
    }

    try:
        shop = await run_sync(
            create_shop, user.id, user.username, name, lang,
            theme_color=theme,
            template_style=theme_to_tmpl.get(theme, "clean"),
        )
        if shop is None:
            waitlist_msg = getattr(t, "WAITLIST_MSG", "We're at capacity right now! We'll notify you when spots open up.")
            await query.edit_message_text(waitlist_msg)
            return
        link = catalog_link(shop["shop_slug"])
        theme_info = THEMES.get(theme, THEMES["teal"])
        item_type = getattr(t, "SHOP_CREATED_PRODUCT", "product")
        free_plan = getattr(t, "FREE_PLAN_INFO", "Free plan: up to {max} products, free for 1 year.").format(max=15)
        await query.edit_message_text(
            f"{theme_info['emoji']} {t.SHOP_CREATED.format(name=shop['shop_name'], link=link, item_type=item_type)}\n\n{free_plan}"
        )
        await _send_seller_menu_from_query(query, user.id, shop)
        # Notify admin in real-time
        asyncio.create_task(_notify_admin_new_shop(context.bot, shop, user))
    except Exception as e:
        if "duplicate" in str(e).lower() or "unique" in str(e).lower():
            await query.edit_message_text(t.SHOP_NAME_TAKEN)
        else:
            await query.edit_message_text(t.ERROR)


# ── Commands ─────────────────────────────────────────────────


async def shop_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle /shop — show shop link."""
    user = update.effective_user
    shop = await run_sync(get_shop, user.id)
    if not shop:
        await update.message.reply_text(s(user.id).ASK_SHOP_TYPE)
        return
    seed_lang(user.id, shop.get("language", "am"))
    t = s(user.id)
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
    user = update.effective_user
    shop = await run_sync(get_shop, user.id)
    if shop:
        seed_lang(user.id, shop.get("language", "am"))
    t = s(user.id)
    await update.message.reply_text(t.HELP)


# ── Internal helpers ─────────────────────────────────────────


def _seller_keyboard(t, shop: dict | None = None):
    """Build the 3x2 seller dashboard keyboard, adapted to shop type."""
    shop_type = (shop or {}).get("shop_type", "product")

    if shop_type == "service":
        add_btn = getattr(t, "BTN_ADD_SERVICE", t.BTN_ADD_PRODUCT)
        list_btn = getattr(t, "BTN_MY_SERVICES", t.BTN_MY_PRODUCTS)
    else:
        add_btn = t.BTN_ADD_PRODUCT
        list_btn = t.BTN_MY_PRODUCTS

    inq_btn = getattr(t, "BTN_INQUIRIES", t.BTN_MY_ORDERS)

    web_label = getattr(t, "BTN_MANAGE_WEB", "🌐 Manage on Web")

    return InlineKeyboardMarkup([
        [
            InlineKeyboardButton(add_btn, callback_data="menu_add"),
            InlineKeyboardButton(list_btn, callback_data="menu_products"),
        ],
        [
            InlineKeyboardButton(inq_btn, callback_data="menu_orders"),
            InlineKeyboardButton(t.BTN_SHOP_LINK, callback_data="menu_shop_link"),
        ],
        [
            InlineKeyboardButton(t.BTN_SETTINGS, callback_data="menu_settings"),
            InlineKeyboardButton(t.BTN_SHARE_SHOP, callback_data="menu_share"),
        ],
        [
            InlineKeyboardButton(web_label, callback_data="menu_manage_web"),
        ],
    ])


async def _send_seller_menu(update: Update, user_id: int, shop: dict) -> None:
    t = s(user_id)
    link = catalog_link(shop["shop_slug"])
    await update.message.reply_text(
        f"🏪 {shop['shop_name']}\n{link}",
        reply_markup=_seller_keyboard(t, shop),
    )


async def _send_seller_menu_from_query(query, user_id: int, shop: dict) -> None:
    t = s(user_id)
    link = catalog_link(shop["shop_slug"])
    await query.message.reply_text(
        f"🏪 {shop['shop_name']}\n{link}",
        reply_markup=_seller_keyboard(t, shop),
    )
