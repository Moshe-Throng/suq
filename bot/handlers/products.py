"""
Product management: add, list, delete products.
Uses ConversationHandler for the multi-step add flow.
"""

from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import (
    ContextTypes, ConversationHandler, CommandHandler, MessageHandler, filters,
    CallbackQueryHandler,
)

from bot.db.supabase_client import (
    run_sync, get_shop, get_products, get_product, create_product, delete_product,
)
from bot.strings.lang import s

# Conversation states
PHOTO, NAME, PRICE, DESC = range(4)


async def add_entry(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Entry point for /add — ask for product photo."""
    user = update.effective_user
    t = s(user.id)

    shop = await run_sync(get_shop, user.id)
    if not shop:
        await update.message.reply_text(t.ERROR)
        return ConversationHandler.END

    context.user_data["shop_id"] = shop["id"]
    await update.message.reply_text(t.ASK_PRODUCT_PHOTO)
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
    await query.message.reply_text(t.ASK_PRODUCT_PHOTO)
    return PHOTO


async def recv_photo(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Receive product photo, ask for name."""
    user = update.effective_user
    t = s(user.id)

    photo = update.message.photo[-1]  # Highest resolution
    context.user_data["photo_file_id"] = photo.file_id

    await update.message.reply_text(t.ASK_PRODUCT_NAME)
    return NAME


async def recv_name(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Receive product name, ask for price."""
    user = update.effective_user
    t = s(user.id)

    context.user_data["product_name"] = update.message.text.strip()
    await update.message.reply_text(t.ASK_PRODUCT_PRICE)
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
    await update.message.reply_text(t.ASK_PRODUCT_DESC)
    return DESC


async def recv_desc(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Receive description (or /skip), save product and generate images."""
    user = update.effective_user
    t = s(user.id)

    text = update.message.text.strip()
    desc = None if text.lower() == "/skip" else text

    # Save to DB
    shop_id = context.user_data["shop_id"]
    name = context.user_data["product_name"]
    price = context.user_data["product_price"]
    photo_file_id = context.user_data.get("photo_file_id")

    # Get shop for slug + store photo URL
    shop = await run_sync(get_shop, user.id)
    shop_slug = shop["shop_slug"] if shop else ""

    # Get public photo URL from Telegram
    photo_url = None
    if photo_file_id:
        try:
            pf = await context.bot.get_file(photo_file_id)
            photo_url = pf.file_path  # Telegram CDN URL
        except Exception:
            pass

    product = await run_sync(
        create_product, shop_id, name, price,
        photo_file_id=photo_file_id, photo_url=photo_url, description=desc,
    )

    await update.message.reply_text(
        t.PRODUCT_SAVED.format(name=name, price=price)
    )

    # Generate marketing images
    try:
        from bot.services.image_factory import generate_all
        photo_file = await context.bot.get_file(photo_file_id)
        photo_bytes = await photo_file.download_as_bytearray()

        images = generate_all(
            product_name=name,
            price=price,
            photo_bytes=bytes(photo_bytes),
            description=desc,
            shop_slug=shop_slug,
        )

        # Send each generated image
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
        # Non-fatal — product is already saved

    # Cleanup
    for key in ("shop_id", "product_name", "product_price", "photo_file_id"):
        context.user_data.pop(key, None)

    return ConversationHandler.END


async def cancel(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Cancel the add product flow."""
    t = s(update.effective_user.id)
    await update.message.reply_text(t.CANCELLED)
    for key in ("shop_id", "product_name", "product_price", "photo_file_id"):
        context.user_data.pop(key, None)
    return ConversationHandler.END


async def list_products(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle /products — list seller's products."""
    user = update.effective_user
    t = s(user.id)

    shop = await run_sync(get_shop, user.id)
    if not shop:
        await update.message.reply_text(t.ERROR)
        return

    products = await run_sync(get_products, shop["id"])
    if not products:
        await update.message.reply_text(t.NO_PRODUCTS)
        return

    lines = [t.PRODUCT_LIST_HEADER, ""]
    buttons = []
    for p in products:
        lines.append(f"• {p['name']} — {p['price']} Birr")
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

    products = await run_sync(get_products, shop["id"])
    if not products:
        await query.edit_message_text(t.NO_PRODUCTS)
        return

    lines = [t.PRODUCT_LIST_HEADER, ""]
    buttons = []
    for p in products:
        lines.append(f"• {p['name']} — {p['price']} Birr")
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
        await query.edit_message_text(t.PRODUCT_DELETED.format(name=product["name"]))
    else:
        await query.edit_message_text(t.ERROR)


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
            PRICE: [MessageHandler(filters.TEXT & ~filters.COMMAND, recv_price)],
            DESC: [MessageHandler(filters.TEXT, recv_desc)],  # Allow /skip
        },
        fallbacks=[
            CommandHandler("cancel", cancel),
            CommandHandler("start", cancel),
        ],
        per_message=False,
        conversation_timeout=300,
    )
