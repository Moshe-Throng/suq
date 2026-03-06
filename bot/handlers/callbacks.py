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
)
from bot.db.supabase_client import run_sync, get_shop, catalog_link
from bot.strings.lang import s


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

    elif data == "menu_settings":
        await settings_menu(update, context)

    elif data == "menu_share":
        await share_shop_card(update, context)

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

    elif data == "settings_back":
        await query.answer()
        user = query.from_user
        shop = await run_sync(get_shop, user.id)
        if shop:
            await _send_seller_menu_from_query(query, user.id, shop)

    # ── Products & Inquiries ─────────────────────────────────

    elif data.startswith("del_product_"):
        await delete_product_callback(update, context)

    elif data.startswith("inq_seen_"):
        await inquiry_seen_callback(update, context)

    elif data.startswith("order_"):
        await order_action_callback(update, context)

    else:
        await query.answer("Unknown action")
