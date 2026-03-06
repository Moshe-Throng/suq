"""
Product/service management: add, list, delete items.
Uses ConversationHandler for the multi-step add flow.
"""

from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import (
    ContextTypes, ConversationHandler, CommandHandler, MessageHandler, filters,
    CallbackQueryHandler,
)

from bot.db.supabase_client import (
    run_sync, get_shop, get_products, get_product, create_product, delete_product,
    format_price,
)
from bot.strings.lang import s

# Conversation states
PHOTO, NAME, PRICE_TYPE, PRICE, DESC = range(5)


# ── Entry points ─────────────────────────────────────────────


async def add_entry(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Entry point for /add — ask for photo."""
    user = update.effective_user
    t = s(user.id)

    shop = await run_sync(get_shop, user.id)
    if not shop:
        await update.message.reply_text(t.ERROR)
        return ConversationHandler.END

    context.user_data["shop_id"] = shop["id"]
    context.user_data["listing_type"] = shop.get("shop_type", "product")

    is_service = shop.get("shop_type") == "service"
    prompt = getattr(t, "ASK_SERVICE_PHOTO", t.ASK_PRODUCT_PHOTO) if is_service else t.ASK_PRODUCT_PHOTO
    await update.message.reply_text(prompt)
    return PHOTO


async def add_entry_callback(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Entry point from menu_add callback."""
    query = update.callback_query
    await query.answer()
    user = query.from_user
    t = s(user.id)

    shop = await run_sync(get_shop, user.id)
    if not shop:
        await query.edit_message_text(t.ERROR)
        return ConversationHandler.END

    context.user_data["shop_id"] = shop["id"]
    context.user_data["listing_type"] = shop.get("shop_type", "product")

    is_service = shop.get("shop_type") == "service"
    prompt = getattr(t, "ASK_SERVICE_PHOTO", t.ASK_PRODUCT_PHOTO) if is_service else t.ASK_PRODUCT_PHOTO
    await query.message.reply_text(prompt)
    return PHOTO


# ── Conversation steps ───────────────────────────────────────


async def recv_photo(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Receive photo, ask for name."""
    user = update.effective_user
    t = s(user.id)

    photo = update.message.photo[-1]
    context.user_data["photo_file_id"] = photo.file_id

    is_service = context.user_data.get("listing_type") == "service"
    prompt = getattr(t, "ASK_SERVICE_NAME", t.ASK_PRODUCT_NAME) if is_service else t.ASK_PRODUCT_NAME
    await update.message.reply_text(prompt)
    return NAME


async def recv_name(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Receive name, ask for price type."""
    user = update.effective_user
    t = s(user.id)

    context.user_data["product_name"] = update.message.text.strip()

    keyboard = InlineKeyboardMarkup([
        [InlineKeyboardButton(t.BTN_PRICE_FIXED, callback_data="ptype_fixed")],
        [InlineKeyboardButton(t.BTN_PRICE_STARTING, callback_data="ptype_starting_from")],
        [InlineKeyboardButton(t.BTN_PRICE_CONTACT, callback_data="ptype_contact")],
    ])
    await update.message.reply_text(t.ASK_PRICE_TYPE, reply_markup=keyboard)
    return PRICE_TYPE


async def recv_price_type(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Handle price type callback."""
    query = update.callback_query
    await query.answer()
    user = query.from_user
    t = s(user.id)

    price_type = query.data.replace("ptype_", "")
    context.user_data["price_type"] = price_type

    if price_type == "contact":
        # Skip price entirely, go to description
        context.user_data["product_price"] = None
        await query.edit_message_text(t.BTN_PRICE_CONTACT + " ✓")
        is_service = context.user_data.get("listing_type") == "service"
        prompt = getattr(t, "ASK_SERVICE_DESC", t.ASK_PRODUCT_DESC) if is_service else t.ASK_PRODUCT_DESC
        await query.message.reply_text(prompt)
        return DESC

    is_service = context.user_data.get("listing_type") == "service"
    prompt = getattr(t, "ASK_SERVICE_PRICE", t.ASK_PRODUCT_PRICE) if is_service else t.ASK_PRODUCT_PRICE
    await query.edit_message_text(prompt)
    return PRICE


async def recv_price(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Receive price, ask for description."""
    user = update.effective_user
    t = s(user.id)

    text = update.message.text.strip().replace(",", "")
    try:
        price = int(float(text))
        if price <= 0:
            raise ValueError
    except (ValueError, TypeError):
        await update.message.reply_text(t.PRICE_INVALID)
        return PRICE

    context.user_data["product_price"] = price

    is_service = context.user_data.get("listing_type") == "service"
    prompt = getattr(t, "ASK_SERVICE_DESC", t.ASK_PRODUCT_DESC) if is_service else t.ASK_PRODUCT_DESC
    await update.message.reply_text(prompt)
    return DESC


async def recv_desc(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Receive description (or /skip), save item and generate images."""
    user = update.effective_user
    t = s(user.id)

    text = update.message.text.strip()
    desc = None if text.lower() == "/skip" else text

    # Gather data
    shop_id = context.user_data["shop_id"]
    name = context.user_data["product_name"]
    price = context.user_data.get("product_price")
    price_type = context.user_data.get("price_type", "fixed")
    listing_type = context.user_data.get("listing_type", "product")
    photo_file_id = context.user_data.get("photo_file_id")

    # Get shop for slug + template
    shop = await run_sync(get_shop, user.id)
    shop_slug = shop["shop_slug"] if shop else ""

    # Get public photo URL from Telegram
    photo_url = None
    if photo_file_id:
        try:
            pf = await context.bot.get_file(photo_file_id)
            photo_url = pf.file_path
        except Exception:
            pass

    product = await run_sync(
        create_product, shop_id, name, price,
        photo_file_id=photo_file_id, photo_url=photo_url, description=desc,
        listing_type=listing_type, price_type=price_type,
    )

    price_display = format_price(price, price_type)
    await update.message.reply_text(
        t.PRODUCT_SAVED.format(name=name, price_display=price_display)
    )

    # Generate marketing images
    try:
        from bot.services.image_factory import generate_all
        photo_file = await context.bot.get_file(photo_file_id)
        photo_bytes = await photo_file.download_as_bytearray()

        template_style = shop.get("template_style", "clean") if shop else "clean"

        images = generate_all(
            product_name=name,
            price=price,
            photo_bytes=bytes(photo_bytes),
            description=desc,
            shop_slug=shop_slug,
            price_type=price_type,
            template_style=template_style,
        )

        from telegram import InputMediaPhoto
        import io
        media_group = []
        for label, img_bytes in images.items():
            media_group.append(
                InputMediaPhoto(media=io.BytesIO(img_bytes), filename=f"{label}.png")
            )

        if media_group:
            await update.message.reply_media_group(media=media_group)
            await update.message.reply_text(
                t.PRODUCT_IMAGES_READY.format(name=name)
            )
    except Exception as e:
        import logging
        logging.getLogger("suq").warning(f"Image generation failed: {e}")

    # Cleanup
    for key in ("shop_id", "product_name", "product_price", "photo_file_id",
                "listing_type", "price_type"):
        context.user_data.pop(key, None)

    return ConversationHandler.END


async def cancel(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Cancel the add flow."""
    t = s(update.effective_user.id)
    await update.message.reply_text(t.CANCELLED)
    for key in ("shop_id", "product_name", "product_price", "photo_file_id",
                "listing_type", "price_type"):
        context.user_data.pop(key, None)
    return ConversationHandler.END


# ── List / Delete ────────────────────────────────────────────


async def list_products(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle /products — list seller's items."""
    user = update.effective_user
    t = s(user.id)

    shop = await run_sync(get_shop, user.id)
    if not shop:
        await update.message.reply_text(t.ERROR)
        return

    is_service = shop.get("shop_type") == "service"
    products = await run_sync(get_products, shop["id"])
    if not products:
        msg = getattr(t, "NO_SERVICES", t.NO_PRODUCTS) if is_service else t.NO_PRODUCTS
        await update.message.reply_text(msg)
        return

    header = getattr(t, "SERVICE_LIST_HEADER", t.PRODUCT_LIST_HEADER) if is_service else t.PRODUCT_LIST_HEADER
    lines = [header, ""]
    buttons = []
    for p in products:
        price_display = format_price(p.get("price"), p.get("price_type", "fixed"))
        emoji = "💼" if p.get("listing_type") == "service" else "📦"
        lines.append(f"{emoji} {p['name']} — {price_display}")
        buttons.append([
            InlineKeyboardButton(
                f"🗑 {p['name']}", callback_data=f"del_product_{p['id']}"
            )
        ])

    keyboard = InlineKeyboardMarkup(buttons) if buttons else None
    await update.message.reply_text("\n".join(lines), reply_markup=keyboard)


async def list_products_callback(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle menu_products callback."""
    query = update.callback_query
    await query.answer()
    user = query.from_user
    t = s(user.id)

    shop = await run_sync(get_shop, user.id)
    if not shop:
        await query.edit_message_text(t.ERROR)
        return

    is_service = shop.get("shop_type") == "service"
    products = await run_sync(get_products, shop["id"])
    if not products:
        msg = getattr(t, "NO_SERVICES", t.NO_PRODUCTS) if is_service else t.NO_PRODUCTS
        await query.edit_message_text(msg)
        return

    header = getattr(t, "SERVICE_LIST_HEADER", t.PRODUCT_LIST_HEADER) if is_service else t.PRODUCT_LIST_HEADER
    lines = [header, ""]
    buttons = []
    for p in products:
        price_display = format_price(p.get("price"), p.get("price_type", "fixed"))
        emoji = "💼" if p.get("listing_type") == "service" else "📦"
        lines.append(f"{emoji} {p['name']} — {price_display}")
        buttons.append([
            InlineKeyboardButton(
                f"🗑 {p['name']}", callback_data=f"del_product_{p['id']}"
            )
        ])

    keyboard = InlineKeyboardMarkup(buttons) if buttons else None
    await query.edit_message_text("\n".join(lines), reply_markup=keyboard)


async def delete_product_callback(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle del_product_{id} callback."""
    query = update.callback_query
    await query.answer()
    user = query.from_user
    t = s(user.id)

    product_id = query.data.replace("del_product_", "")
    product = await run_sync(get_product, product_id)

    if product:
        await run_sync(delete_product, product_id)
        is_service = product.get("listing_type") == "service"
        msg = getattr(t, "SERVICE_DELETED", t.PRODUCT_DELETED) if is_service else t.PRODUCT_DELETED
        await query.edit_message_text(msg.format(name=product["name"]))
    else:
        await query.edit_message_text(t.ERROR)


async def _start_fallback(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Handle /start mid-conversation — cancel flow and go to main menu."""
    for key in ("shop_id", "product_name", "product_price", "photo_file_id",
                "listing_type", "price_type"):
        context.user_data.pop(key, None)
    from bot.handlers.start import start_handler
    await start_handler(update, context)
    return ConversationHandler.END


# ── Build the ConversationHandler ────────────────────────────


def build_add_product_conv() -> ConversationHandler:
    """Build and return the add-product ConversationHandler."""
    return ConversationHandler(
        entry_points=[
            CommandHandler("add", add_entry),
            CallbackQueryHandler(add_entry_callback, pattern="^menu_add$"),
        ],
        states={
            PHOTO: [MessageHandler(filters.PHOTO, recv_photo)],
            NAME: [MessageHandler(filters.TEXT & ~filters.COMMAND, recv_name)],
            PRICE_TYPE: [CallbackQueryHandler(recv_price_type, pattern="^ptype_")],
            PRICE: [MessageHandler(filters.TEXT & ~filters.COMMAND, recv_price)],
            DESC: [MessageHandler(filters.TEXT, recv_desc)],  # Allow /skip
        },
        fallbacks=[
            CommandHandler("cancel", cancel),
            CommandHandler("start", _start_fallback),
        ],
        per_message=False,
        conversation_timeout=300,
    )
