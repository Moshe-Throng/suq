"""
Settings handler — shop customization (template, category, type, description, logo, share card).
"""

import io

from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ContextTypes

import re

from bot.db.supabase_client import (
    run_sync, get_shop, update_shop_theme, update_shop_description,
    update_shop_logo, update_shop_template, update_shop_type, update_shop_category,
    update_shop_location, update_shop_tiktok, get_product_count, catalog_link,
)
from bot.strings.lang import s, seed_lang
from bot.handlers.start import (
    COLORS, TEMPLATES, THEMES, LOCATION_AREAS, LOCATION_AREA_KEYS, LOCATION_MAP,
    PRODUCT_CATEGORIES, SERVICE_CATEGORIES, _location_keyboard,
)


# ── Settings Menu ────────────────────────────────────────────


async def settings_menu(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Show settings sub-menu with current values."""
    query = update.callback_query
    await query.answer()
    user = query.from_user

    shop = await run_sync(get_shop, user.id)
    if not shop:
        await query.edit_message_text(s(user.id).ERROR)
        return
    seed_lang(user.id, shop.get("language", "am"))
    t = s(user.id)

    color_key = shop.get("template_style", "purple")
    color_info = COLORS.get(color_key) or TEMPLATES.get(color_key) or COLORS["purple"]
    color_emoji = color_info.get("emoji", "🎨")
    color_label = color_info.get("label") or color_key.title()
    desc = shop.get("description") or "—"
    logo = "✅" if shop.get("logo_file_id") else "—"
    category = shop.get("category") or "—"
    location = shop.get("location_text") or "—"

    tiktok = shop.get("tiktok_url") or "—"

    header = (
        f"⚙️ {shop['shop_name']}\n\n"
        f"{color_emoji} {color_label}\n"
        f"📂 {category.title() if category != '—' else '—'}\n"
        f"📍 {location}\n"
        f"📝 {desc}\n"
        f"🖼 Logo: {logo}\n"
        f"🎬 TikTok: {tiktok}"
    )

    btn_color = getattr(t, "BTN_CHANGE_COLOR", "Brand Color 🎨")
    btn_location = getattr(t, "BTN_CHANGE_LOCATION", "Location 📍")
    btn_tiktok = getattr(t, "BTN_CHANGE_TIKTOK", "TikTok 🎬")

    keyboard = InlineKeyboardMarkup([
        [InlineKeyboardButton(btn_color, callback_data="settings_color")],
        [InlineKeyboardButton(btn_location, callback_data="settings_location")],
        [InlineKeyboardButton(f"📂 {t.BTN_CHANGE_CATEGORY}", callback_data="settings_category")],
        [InlineKeyboardButton(f"📝 {t.BTN_EDIT_DESC}", callback_data="settings_desc")],
        [InlineKeyboardButton(f"🖼 {t.BTN_CHANGE_LOGO}", callback_data="settings_logo")],
        [InlineKeyboardButton(f"🎬 {btn_tiktok}", callback_data="settings_tiktok")],
        [InlineKeyboardButton(f"← {t.BTN_BACK_MENU}", callback_data="settings_back")],
    ])

    await query.edit_message_text(header, reply_markup=keyboard)


# ── Brand Color Change ───────────────────────────────────────


async def settings_change_color(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Show brand color picker."""
    query = update.callback_query
    await query.answer()
    user = query.from_user
    t = s(user.id)

    keys = list(COLORS.keys())
    keyboard = InlineKeyboardMarkup([
        [
            InlineKeyboardButton(
                f"{COLORS[k]['emoji']} {COLORS[k]['label']}",
                callback_data=f"setcolor_{k}",
            )
            for k in keys[i:i + 2]
        ]
        for i in range(0, len(keys), 2)
    ])

    await query.edit_message_text(
        getattr(t, "ASK_COLOR", "🎨 Pick your brand color:"),
        reply_markup=keyboard,
    )


async def settings_color_selected(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Apply the selected brand color."""
    query = update.callback_query
    await query.answer()
    user = query.from_user

    color_key = query.data.replace("setcolor_", "").replace("settmpl_", "")
    # map legacy style names to colors
    _legacy = {"clean": "purple", "bold": "cyan", "ethiopian": "brown",
               "fresh": "teal", "minimal": "charcoal", "warm": "orange"}
    color_key = _legacy.get(color_key, color_key)
    if color_key not in COLORS:
        color_key = "purple"

    shop = await run_sync(get_shop, user.id)
    if not shop:
        await query.edit_message_text(s(user.id).ERROR)
        return
    seed_lang(user.id, shop.get("language", "am"))
    t = s(user.id)

    await run_sync(update_shop_template, shop["id"], color_key)
    color_info = COLORS[color_key]
    msg = getattr(t, "COLOR_UPDATED", "Brand color updated!")
    await query.edit_message_text(f"{color_info['emoji']} {msg}")


# Legacy aliases
async def settings_change_template(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await settings_change_color(update, context)


async def settings_template_selected(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await settings_color_selected(update, context)


# ── Location Change ──────────────────────────────────────────


async def settings_change_location(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Show location picker with GPS option."""
    query = update.callback_query
    await query.answer()
    user = query.from_user
    t = s(user.id)

    kb = _location_keyboard(t, prefix="setloc_")
    # Insert GPS button before the skip row
    gps_btn = [InlineKeyboardButton(
        getattr(t, "BTN_SHARE_LOCATION", "📍 Share GPS Location"),
        callback_data="setloc_gps",
    )]
    rows = list(kb.inline_keyboard)
    rows.insert(-1, gps_btn)  # before skip

    await query.edit_message_text(
        getattr(t, "ASK_LOCATION", "📍 Where is your shop? (optional)"),
        reply_markup=InlineKeyboardMarkup(rows),
    )


async def settings_location_selected(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Apply the selected location."""
    query = update.callback_query
    await query.answer()
    user = query.from_user

    loc_key = query.data.replace("setloc_", "")

    # GPS option — prompt user to share Telegram location
    if loc_key == "gps":
        shop = await run_sync(get_shop, user.id)
        if shop:
            seed_lang(user.id, shop.get("language", "am"))
        t = s(user.id)
        context.user_data["awaiting_gps_location"] = True
        await query.edit_message_text(
            getattr(t, "ASK_GPS_LOCATION",
                    "📍 Send your shop's location using Telegram's location sharing.\n\n"
                    "Tap the 📎 icon → Location → send your pin.\n\nOr /skip to cancel.")
        )
        return

    location_text = None if loc_key == "skip" else LOCATION_MAP.get(loc_key)

    shop = await run_sync(get_shop, user.id)
    if not shop:
        await query.edit_message_text(s(user.id).ERROR)
        return
    seed_lang(user.id, shop.get("language", "am"))
    t = s(user.id)

    await run_sync(update_shop_location, shop["id"], location_text)
    msg = getattr(t, "LOCATION_UPDATED", "📍 Location updated!")
    if location_text:
        await query.edit_message_text(f"📍 {location_text} — {msg}")
    else:
        await query.edit_message_text(msg)


async def settings_recv_gps_location(update: Update, context: ContextTypes.DEFAULT_TYPE) -> bool:
    """Receive a Telegram location message. Returns True if consumed."""
    if not context.user_data.get("awaiting_gps_location"):
        return False

    context.user_data.pop("awaiting_gps_location", None)
    user = update.effective_user
    location = update.message.location

    if not location:
        return False

    shop = await run_sync(get_shop, user.id)
    if not shop:
        await update.message.reply_text(s(user.id).ERROR)
        return True
    seed_lang(user.id, shop.get("language", "am"))
    t = s(user.id)

    # Store as Google Maps link text so it's useful on web too
    lat, lng = location.latitude, location.longitude
    location_text = f"{lat:.6f}, {lng:.6f}"

    # If shop already has an area name, keep it and append coordinates
    existing = shop.get("location_text")
    if existing and not existing.replace(",", "").replace(".", "").replace(" ", "").replace("-", "").isdigit():
        location_text = f"{existing} ({lat:.6f}, {lng:.6f})"

    await run_sync(update_shop_location, shop["id"], location_text)
    msg = getattr(t, "GPS_LOCATION_SAVED", "📍 GPS location saved!")
    await update.message.reply_text(f"{msg}\n📍 {location_text}")
    return True


async def settings_recv_gps_skip(update: Update, context: ContextTypes.DEFAULT_TYPE) -> bool:
    """Handle /skip during GPS location prompt. Returns True if consumed."""
    if not context.user_data.get("awaiting_gps_location"):
        return False
    context.user_data.pop("awaiting_gps_location", None)
    t = s(update.effective_user.id)
    await update.message.reply_text(getattr(t, "CANCELLED", "Cancelled."))
    return True


# ── Category Change ──────────────────────────────────────────


async def settings_change_category(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Show category picker based on shop type."""
    query = update.callback_query
    await query.answer()
    user = query.from_user

    shop = await run_sync(get_shop, user.id)
    if not shop:
        await query.edit_message_text(s(user.id).ERROR)
        return
    seed_lang(user.id, shop.get("language", "am"))
    t = s(user.id)

    shop_type = shop.get("shop_type", "product")
    cats = SERVICE_CATEGORIES if shop_type == "service" else PRODUCT_CATEGORIES

    keyboard = InlineKeyboardMarkup([
        [InlineKeyboardButton(
            getattr(t, attr, key.title()),
            callback_data=f"setcat_{key}",
        )]
        for key, attr in cats
    ])

    await query.edit_message_text(t.ASK_CATEGORY, reply_markup=keyboard)


async def settings_category_selected(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Apply the selected category."""
    query = update.callback_query
    await query.answer()
    user = query.from_user

    category = query.data.replace("setcat_", "")
    shop = await run_sync(get_shop, user.id)
    if not shop:
        await query.edit_message_text(s(user.id).ERROR)
        return
    seed_lang(user.id, shop.get("language", "am"))
    t = s(user.id)

    await run_sync(update_shop_category, shop["id"], category)
    await query.edit_message_text(f"✅ {t.CATEGORY_UPDATED}")


# ── Type Change ──────────────────────────────────────────────


async def settings_change_type(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Show business type picker."""
    query = update.callback_query
    await query.answer()
    user = query.from_user
    t = s(user.id)

    keyboard = InlineKeyboardMarkup([
        [
            InlineKeyboardButton(t.BTN_TYPE_PRODUCT, callback_data="settype_product"),
            InlineKeyboardButton(t.BTN_TYPE_SERVICE, callback_data="settype_service"),
        ]
    ])

    await query.edit_message_text(t.ASK_SHOP_TYPE, reply_markup=keyboard)


async def settings_type_selected(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Apply the selected business type."""
    query = update.callback_query
    await query.answer()
    user = query.from_user

    shop_type = query.data.replace("settype_", "")
    shop = await run_sync(get_shop, user.id)
    if not shop:
        await query.edit_message_text(s(user.id).ERROR)
        return
    seed_lang(user.id, shop.get("language", "am"))
    t = s(user.id)

    await run_sync(update_shop_type, shop["id"], shop_type)
    await query.edit_message_text(f"✅ {t.TYPE_UPDATED}")


# ── Legacy Theme Change ──────────────────────────────────────


async def settings_change_theme(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Show theme picker (legacy — redirects to template)."""
    await settings_change_template(update, context)


async def settings_theme_selected(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Apply the selected theme color (legacy)."""
    query = update.callback_query
    await query.answer()
    user = query.from_user

    theme = query.data.replace("settheme_", "")
    shop = await run_sync(get_shop, user.id)
    if not shop:
        await query.edit_message_text(s(user.id).ERROR)
        return
    seed_lang(user.id, shop.get("language", "am"))
    t = s(user.id)

    await run_sync(update_shop_theme, shop["id"], theme)
    theme_info = THEMES.get(theme, THEMES["teal"])
    await query.edit_message_text(f"{theme_info['emoji']} {t.THEME_UPDATED}")


# ── Description Edit ─────────────────────────────────────────


async def settings_ask_desc(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Prompt for new description."""
    query = update.callback_query
    await query.answer()
    user = query.from_user
    t = s(user.id)

    context.user_data["awaiting_description"] = True
    await query.edit_message_text(t.ASK_DESCRIPTION)


async def settings_recv_desc(update: Update, context: ContextTypes.DEFAULT_TYPE) -> bool:
    """Receive description text. Returns True if handled, False otherwise."""
    if not context.user_data.get("awaiting_description"):
        return False

    user = update.effective_user
    text = update.message.text.strip()

    shop = await run_sync(get_shop, user.id)
    if not shop:
        context.user_data.pop("awaiting_description", None)
        await update.message.reply_text(s(user.id).ERROR)
        return True
    seed_lang(user.id, shop.get("language", "am"))
    t = s(user.id)

    if text.lower() == "/skip":
        context.user_data.pop("awaiting_description", None)
        await run_sync(update_shop_description, shop["id"], None)
        await update.message.reply_text(t.DESC_REMOVED)
        return True

    if len(text) > 120:
        await update.message.reply_text(t.DESC_INVALID)
        return True

    context.user_data.pop("awaiting_description", None)
    await run_sync(update_shop_description, shop["id"], text)
    await update.message.reply_text(t.DESC_SAVED)
    return True


# ── Logo Change ──────────────────────────────────────────────


async def settings_ask_logo(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Prompt for logo photo."""
    query = update.callback_query
    await query.answer()
    user = query.from_user
    t = s(user.id)

    context.user_data["awaiting_logo"] = True
    await query.edit_message_text(t.ASK_LOGO)


async def settings_recv_logo(update: Update, context: ContextTypes.DEFAULT_TYPE) -> bool:
    """Receive logo photo. Returns True if handled."""
    if not context.user_data.get("awaiting_logo"):
        return False

    user = update.effective_user
    context.user_data.pop("awaiting_logo", None)

    shop = await run_sync(get_shop, user.id)
    if not shop:
        await update.message.reply_text(s(user.id).ERROR)
        return True
    seed_lang(user.id, shop.get("language", "am"))
    t = s(user.id)

    photo = update.message.photo[-1]
    file_id = photo.file_id

    logo_url = None
    try:
        pf = await context.bot.get_file(file_id)
        logo_url = pf.file_path
        if logo_url and not logo_url.startswith("http"):
            logo_url = f"https://api.telegram.org/file/bot{context.bot.token}/{logo_url}"
    except Exception:
        pass

    await run_sync(update_shop_logo, shop["id"], file_id, logo_url)
    await update.message.reply_text(t.LOGO_SAVED)
    return True


async def settings_recv_logo_skip(update: Update, context: ContextTypes.DEFAULT_TYPE) -> bool:
    """Handle /skip during logo prompt to remove logo. Returns True if handled."""
    if not context.user_data.get("awaiting_logo"):
        return False

    user = update.effective_user
    context.user_data.pop("awaiting_logo", None)

    shop = await run_sync(get_shop, user.id)
    if shop:
        seed_lang(user.id, shop.get("language", "am"))
        t = s(user.id)
        await run_sync(update_shop_logo, shop["id"], None, None)
        await update.message.reply_text(t.LOGO_REMOVED)
    return True


# ── Share Shop Card ──────────────────────────────────────────


async def share_shop_card(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Generate and send a shareable shop card image."""
    query = update.callback_query
    await query.answer()
    user = query.from_user

    shop = await run_sync(get_shop, user.id)
    if not shop:
        await query.edit_message_text(s(user.id).ERROR)
        return
    seed_lang(user.id, shop.get("language", "am"))
    t = s(user.id)

    product_count = await run_sync(get_product_count, shop["id"])

    # Use brand color hex
    color_key = shop.get("template_style", "purple")
    color_info = COLORS.get(color_key) or TEMPLATES.get(color_key) or COLORS["purple"]
    theme_hex = color_info.get("hex", "#7C3AED")

    # Load logo if set
    logo_bytes = None
    if shop.get("logo_file_id"):
        try:
            logo_file = await context.bot.get_file(shop["logo_file_id"])
            logo_ba = await logo_file.download_as_bytearray()
            logo_bytes = bytes(logo_ba)
        except Exception:
            pass

    from bot.services.image_factory import generate_shop_card

    card_bytes = generate_shop_card(
        shop_name=shop["shop_name"],
        shop_slug=shop["shop_slug"],
        theme_hex=theme_hex,
        product_count=product_count,
        description=shop.get("description"),
        logo_bytes=logo_bytes,
    )

    link = catalog_link(shop["shop_slug"])
    caption = f"🏪 {shop['shop_name']}\n🔗 {link}\n\n{t.SHARE_CARD_CAPTION}"

    # Add TikTok bio copy button if shop has TikTok linked
    reply_markup = None
    if shop.get("tiktok_url"):
        btn_label = getattr(t, "BTN_TIKTOK_BIO", "📋 Copy Link for TikTok Bio")
        reply_markup = InlineKeyboardMarkup([
            [InlineKeyboardButton(btn_label, callback_data="tiktok_bio")],
        ])

    await query.message.reply_photo(
        photo=io.BytesIO(card_bytes),
        caption=caption,
        reply_markup=reply_markup,
    )


# ── TikTok Link ─────────────────────────────────────────────


async def settings_ask_tiktok(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Prompt for TikTok profile URL."""
    query = update.callback_query
    await query.answer()
    user = query.from_user
    t = s(user.id)

    context.user_data["awaiting_tiktok"] = True
    await query.edit_message_text(getattr(t, "ASK_TIKTOK",
        "🎬 Send your TikTok profile URL (e.g. https://www.tiktok.com/@yourshop).\n\nSend /skip to remove it."))


async def settings_recv_tiktok(update: Update, context: ContextTypes.DEFAULT_TYPE) -> bool:
    """Receive TikTok URL. Returns True if handled."""
    if not context.user_data.get("awaiting_tiktok"):
        return False

    user = update.effective_user
    text = update.message.text.strip()

    shop = await run_sync(get_shop, user.id)
    if not shop:
        context.user_data.pop("awaiting_tiktok", None)
        await update.message.reply_text(s(user.id).ERROR)
        return True
    seed_lang(user.id, shop.get("language", "am"))
    t = s(user.id)

    if text.lower() == "/skip":
        context.user_data.pop("awaiting_tiktok", None)
        await run_sync(update_shop_tiktok, shop["id"], None)
        await update.message.reply_text(getattr(t, "TIKTOK_REMOVED", "TikTok link removed."))
        return True

    if not re.match(r'^https?://(www\.)?tiktok\.com/', text):
        await update.message.reply_text(getattr(t, "TIKTOK_INVALID",
            "Please send a valid TikTok URL."))
        return True

    if len(text) > 255:
        await update.message.reply_text(getattr(t, "TIKTOK_TOO_LONG",
            "TikTok URL is too long (max 255 characters)."))
        return True

    context.user_data.pop("awaiting_tiktok", None)
    await run_sync(update_shop_tiktok, shop["id"], text)
    await update.message.reply_text(getattr(t, "TIKTOK_SAVED", "🎬 TikTok link updated!"))
    return True


async def settings_recv_tiktok_skip(update: Update, context: ContextTypes.DEFAULT_TYPE) -> bool:
    """Handle /skip during TikTok prompt. Returns True if consumed."""
    if not context.user_data.get("awaiting_tiktok"):
        return False
    context.user_data.pop("awaiting_tiktok", None)
    user = update.effective_user
    shop = await run_sync(get_shop, user.id)
    if shop:
        seed_lang(user.id, shop.get("language", "am"))
        t = s(user.id)
        await run_sync(update_shop_tiktok, shop["id"], None)
        await update.message.reply_text(getattr(t, "TIKTOK_REMOVED", "TikTok link removed."))
    return True


# ── TikTok Bio Link ─────────────────────────────────────────


async def tiktok_bio_link(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Generate a ready-to-paste text for TikTok bio."""
    query = update.callback_query
    await query.answer()
    user = query.from_user

    shop = await run_sync(get_shop, user.id)
    if not shop:
        await query.edit_message_text(s(user.id).ERROR)
        return
    seed_lang(user.id, shop.get("language", "am"))
    t = s(user.id)

    link = catalog_link(shop["shop_slug"])
    bio_text = getattr(t, "TIKTOK_BIO_TEXT",
        "🏪 {shop_name}\n🛍 Browse & order: {link}").format(
        shop_name=shop["shop_name"], link=link)

    await query.edit_message_text(
        f"📋 Copy this to your TikTok bio:\n\n<code>{bio_text}</code>",
        parse_mode="HTML",
    )
