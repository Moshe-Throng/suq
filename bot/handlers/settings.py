"""
Settings handler — shop customization (theme, description, logo, share card).
"""

import io

from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ContextTypes

from bot.db.supabase_client import (
    run_sync, get_shop, update_shop_theme, update_shop_description,
    update_shop_logo, get_product_count, catalog_link,
)
from bot.strings.lang import s
from bot.handlers.start import THEMES


# ── Settings Menu ────────────────────────────────────────────


async def settings_menu(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Show settings sub-menu with current values."""
    query = update.callback_query
    await query.answer()
    user = query.from_user
    t = s(user.id)

    shop = await run_sync(get_shop, user.id)
    if not shop:
        await query.edit_message_text(t.ERROR)
        return

    theme_key = shop.get("theme_color", "teal")
    theme_info = THEMES.get(theme_key, THEMES["teal"])
    desc = shop.get("description") or "—"
    logo = "✅" if shop.get("logo_file_id") else "—"

    header = (
        f"⚙️ {shop['shop_name']}\n\n"
        f"🎨 {theme_info['emoji']} {theme_info['label']}\n"
        f"📝 {desc}\n"
        f"🖼 Logo: {logo}"
    )

    keyboard = InlineKeyboardMarkup([
        [InlineKeyboardButton(f"🎨 {t.BTN_CHANGE_THEME}", callback_data="settings_theme")],
        [InlineKeyboardButton(f"📝 {t.BTN_EDIT_DESC}", callback_data="settings_desc")],
        [InlineKeyboardButton(f"🖼 {t.BTN_CHANGE_LOGO}", callback_data="settings_logo")],
        [InlineKeyboardButton(f"← {t.BTN_BACK_MENU}", callback_data="settings_back")],
    ])

    await query.edit_message_text(header, reply_markup=keyboard)


# ── Theme Change ─────────────────────────────────────────────


async def settings_change_theme(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Show theme picker (reused from onboarding)."""
    query = update.callback_query
    await query.answer()
    user = query.from_user
    t = s(user.id)

    keys = list(THEMES.keys())
    keyboard = InlineKeyboardMarkup([
        [
            InlineKeyboardButton(
                f"{THEMES[k]['emoji']} {THEMES[k]['label']}",
                callback_data=f"settheme_{k}",
            )
            for k in keys[i:i + 2]
        ]
        for i in range(0, len(keys), 2)
    ])

    await query.edit_message_text(t.ASK_THEME_COLOR, reply_markup=keyboard)


async def settings_theme_selected(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Apply the selected theme color."""
    query = update.callback_query
    await query.answer()
    user = query.from_user
    t = s(user.id)

    theme = query.data.replace("settheme_", "")
    shop = await run_sync(get_shop, user.id)
    if not shop:
        await query.edit_message_text(t.ERROR)
        return

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
    t = s(user.id)
    text = update.message.text.strip()

    shop = await run_sync(get_shop, user.id)
    if not shop:
        context.user_data.pop("awaiting_description", None)
        await update.message.reply_text(t.ERROR)
        return True

    if text.lower() == "/skip":
        context.user_data.pop("awaiting_description", None)
        await run_sync(update_shop_description, shop["id"], None)
        await update.message.reply_text(t.DESC_REMOVED)
        return True

    if len(text) > 120:
        await update.message.reply_text(t.DESC_INVALID)
        return True  # Keep awaiting

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
    t = s(user.id)
    context.user_data.pop("awaiting_logo", None)

    shop = await run_sync(get_shop, user.id)
    if not shop:
        await update.message.reply_text(t.ERROR)
        return True

    photo = update.message.photo[-1]
    file_id = photo.file_id

    # Resolve to CDN URL
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
    t = s(user.id)
    context.user_data.pop("awaiting_logo", None)

    shop = await run_sync(get_shop, user.id)
    if shop:
        await run_sync(update_shop_logo, shop["id"], None, None)
        await update.message.reply_text(t.LOGO_REMOVED)
    return True


# ── Share Shop Card ──────────────────────────────────────────


async def share_shop_card(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Generate and send a shareable shop card image."""
    query = update.callback_query
    await query.answer()
    user = query.from_user
    t = s(user.id)

    shop = await run_sync(get_shop, user.id)
    if not shop:
        await query.edit_message_text(t.ERROR)
        return

    product_count = await run_sync(get_product_count, shop["id"])

    # Get theme hex color
    theme_key = shop.get("theme_color", "teal")
    theme_hex = THEMES.get(theme_key, THEMES["teal"])["hex"]

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

    await query.message.reply_photo(
        photo=io.BytesIO(card_bytes),
        caption=caption,
    )
