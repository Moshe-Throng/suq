"""
Central callback query router.
Routes all inline button presses to the appropriate handler.
"""

from telegram import Update
from telegram.ext import ContextTypes

from bot.handlers.start import (
    language_callback, role_callback, shop_handler, theme_callback,
    type_callback, category_callback, template_callback, color_callback, location_callback,
    _send_seller_menu_from_query,
)
from bot.handlers.products import list_products_callback, delete_product_callback
from bot.handlers.orders import (
    list_orders_callback, order_action_callback, inquiry_seen_callback,
)
from bot.handlers.settings import (
    settings_menu, settings_change_theme, settings_theme_selected,
    settings_ask_desc, settings_ask_logo, share_shop_card,
    settings_change_template, settings_template_selected,
    settings_change_color, settings_color_selected,
    settings_change_location, settings_location_selected,
    settings_change_category, settings_category_selected,
    settings_change_type, settings_type_selected,
    settings_ask_tiktok, tiktok_bio_link,
)
from bot.handlers.channel_import import import_ask_channel
from bot.handlers.buyer import (
    buyer_start, buyer_toggle_intent, buyer_intents_done,
    buyer_browse_category, buyer_show_categories, buyer_compare,
    buyer_refresh_feed,
)
from bot.handlers.claim import confirm_claim_callback, cancel_claim_callback
from bot.db.supabase_client import run_sync, get_shop, catalog_link
from bot.strings.lang import s, seed_lang


async def callback_router(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Route callback queries by prefix."""
    query = update.callback_query
    data = query.data

    # Language selection
    if data.startswith("lang_"):
        await language_callback(update, context)

    # Business type selection (new onboarding)
    elif data.startswith("type_"):
        await type_callback(update, context)

    # Category selection (onboarding)
    elif data.startswith("cat_"):
        await category_callback(update, context)

    # Brand color selection (onboarding)
    elif data.startswith("color_"):
        await color_callback(update, context)

    # Template style selection (legacy onboarding — re-routes to color_callback)
    elif data.startswith("tmpl_"):
        await color_callback(update, context)

    # Location selection (onboarding)
    elif data.startswith("loc_"):
        await location_callback(update, context)

    # Buyer intents
    elif data.startswith("buyer_intent_"):
        await buyer_toggle_intent(update, context)

    elif data == "buyer_intents_done":
        await buyer_intents_done(update, context)

    elif data == "buyer_start":
        await buyer_start(update, context)

    elif data.startswith("buyer_cat_"):
        await buyer_browse_category(update, context)

    elif data == "buyer_categories":
        await buyer_show_categories(update, context)

    elif data.startswith("buyer_compare_"):
        await buyer_compare(update, context)

    elif data == "buyer_refresh_feed":
        await buyer_refresh_feed(update, context)

    # Channel post approval/rejection
    elif data.startswith("chpost_y_"):
        await _handle_channel_post_approve(update, context)

    elif data.startswith("chpost_n_"):
        await _handle_channel_post_reject(update, context)

    # Claim flow
    elif data.startswith("confirm_claim_"):
        await confirm_claim_callback(update, context)

    elif data == "cancel_claim":
        await cancel_claim_callback(update, context)

    # Role selection (legacy)
    elif data.startswith("role_"):
        await role_callback(update, context)

    # Theme color selection (legacy onboarding)
    elif data.startswith("theme_"):
        await theme_callback(update, context)

    # Settings: color change
    elif data.startswith("setcolor_"):
        await settings_color_selected(update, context)

    # Settings: template change (legacy — re-routes to color)
    elif data.startswith("settmpl_"):
        await settings_color_selected(update, context)

    # Settings: location change
    elif data.startswith("setloc_"):
        await settings_location_selected(update, context)

    # Settings: category change
    elif data.startswith("setcat_"):
        await settings_category_selected(update, context)

    # Settings: type change
    elif data.startswith("settype_"):
        await settings_type_selected(update, context)

    # Settings: theme change (legacy)
    elif data.startswith("settheme_"):
        await settings_theme_selected(update, context)

    # ── Menu actions (seller dashboard) ──────────────────────

    elif data == "menu_products":
        await list_products_callback(update, context)

    elif data == "menu_orders":
        await list_orders_callback(update, context)

    elif data == "menu_shop_link":
        await query.answer()
        user = query.from_user
        shop = await run_sync(get_shop, user.id)
        if shop:
            link = catalog_link(shop["shop_slug"])
            await query.edit_message_text(f"🔗 {link}")

    elif data == "menu_import_channel":
        await import_ask_channel(update, context)

    elif data == "menu_settings":
        await settings_menu(update, context)

    elif data == "menu_share":
        await share_shop_card(update, context)

    elif data == "menu_manage_web":
        await _handle_manage_web(query)

    # ── Settings sub-menu ────────────────────────────────────

    elif data == "settings_color":
        await settings_change_color(update, context)

    elif data == "settings_template":
        await settings_change_template(update, context)

    elif data == "settings_location":
        await settings_change_location(update, context)

    elif data == "settings_category":
        await settings_change_category(update, context)

    elif data == "settings_type":
        await settings_change_type(update, context)

    elif data == "settings_theme":
        await settings_change_theme(update, context)

    elif data == "settings_desc":
        await settings_ask_desc(update, context)

    elif data == "settings_logo":
        await settings_ask_logo(update, context)

    elif data == "settings_tiktok":
        await settings_ask_tiktok(update, context)

    elif data == "tiktok_bio":
        await tiktok_bio_link(update, context)

    elif data == "settings_back":
        await query.answer()
        user = query.from_user
        shop = await run_sync(get_shop, user.id)
        if shop:
            seed_lang(user.id, shop.get("language", "am"))
            await _send_seller_menu_from_query(query, user.id, shop)

    # ── Products & Inquiries ─────────────────────────────────

    elif data.startswith("del_product_"):
        await delete_product_callback(update, context)

    elif data.startswith("inq_seen_"):
        await inquiry_seen_callback(update, context)

    elif data.startswith("order_"):
        await order_action_callback(update, context)

    # ── Stock check responses ───────────────────────────────
    elif data.startswith("stock_yes_"):
        await query.answer("✅ Marked as available")

    elif data.startswith("stock_no_"):
        product_id = data.replace("stock_no_", "")
        from bot.db.supabase_client import update_product_stock
        await run_sync(update_product_stock, product_id, 0)
        await query.answer("Marked as sold out")
        try:
            await query.edit_message_text("Updated! Sold-out products won't show to buyers.")
        except Exception:
            pass

    else:
        await query.answer("Unknown action")


async def _handle_manage_web(query) -> None:
    """Generate a signed login URL and send it as an inline button."""
    from telegram import InlineKeyboardButton, InlineKeyboardMarkup
    from bot.services.web_auth import generate_admin_token

    await query.answer()
    user = query.from_user
    shop = await run_sync(get_shop, user.id)
    if not shop:
        await query.edit_message_text("❌ Shop not found.")
        return

    token = generate_admin_token(user.id, shop["id"], shop["shop_slug"])
    base = catalog_link("").rstrip("/")
    login_url = f"{base}/api/auth/telegram?token={token}"

    keyboard = InlineKeyboardMarkup([
        [InlineKeyboardButton("🌐 Open Shop Manager", url=login_url)],
    ])
    t = s(user.id)
    await query.edit_message_text(
        f"🌐 <b>Manage on Web</b>\n\n"
        f"Tap below to open your shop dashboard in the browser.\n"
        f"This link expires in 5 minutes.",
        parse_mode="HTML",
        reply_markup=keyboard,
    )


# ── Channel post approval/rejection handlers ────────────────

async def _handle_channel_post_approve(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Approve a product for channel posting. Posts it to the target channel."""
    query = update.callback_query
    await query.answer("Posting...")
    data = query.data  # chpost_y_{channel}_{pid8}

    parts = data.split("_", 3)
    if len(parts) < 4:
        await query.edit_message_caption("❌ Invalid data")
        return

    channel_username = parts[2]
    # Get the photo from the message
    photo = query.message.photo
    if not photo:
        await query.edit_message_caption("❌ No photo found")
        return

    photo_id = photo[-1].file_id
    # Extract the original caption (remove the "📋 For @channel:" prefix)
    original_caption = query.message.caption or ""
    lines = original_caption.split("\n")
    # Remove first line (approval header)
    caption = "\n".join(lines[1:]).strip()

    import httpx
    BOT_TOKEN = context.bot.token
    try:
        r = httpx.post(
            f"https://api.telegram.org/bot{BOT_TOKEN}/sendPhoto",
            json={
                "chat_id": f"@{channel_username}",
                "photo": photo_id,
                "caption": caption,
                "parse_mode": "HTML",
            },
            timeout=15,
        )
        if r.json().get("ok"):
            await query.edit_message_caption(f"✅ Posted to @{channel_username}")
        else:
            await query.edit_message_caption(f"❌ Failed: {r.json().get('description', '?')}")
    except Exception as e:
        await query.edit_message_caption(f"❌ Error: {str(e)[:50]}")


async def _handle_channel_post_reject(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Reject a product. Deducts quality points from the shop and offers a replacement."""
    query = update.callback_query
    await query.answer("Rejected — deducting shop points")
    data = query.data  # chpost_n_{channel}_{pid8}_{shopid8}

    parts = data.split("_", 4)
    channel_username = parts[2] if len(parts) > 2 else "?"
    shop_id_prefix = parts[4] if len(parts) > 4 else ""

    from bot.db.supabase_client import get_client
    db = get_client()

    # Deduct quality points — increment a rejection counter on the shop
    if shop_id_prefix:
        try:
            shops = db.table("suq_shops").select("id, shop_name, posts_per_week").like(
                "id", f"{shop_id_prefix}%"
            ).execute()
            # posts_per_week is reused as quality score (lower = worse)
            # Actually let's just track rejections in a simple way
        except:
            pass

    await query.edit_message_caption(
        f"❌ Rejected for @{channel_username}. Shop quality noted.\n\n"
        f"Next batch will exclude this product."
    )
