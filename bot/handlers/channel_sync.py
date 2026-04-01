"""
Channel sync handler — listens for new posts in linked channels.
When a seller adds the bot as admin to their channel, new posts with photos
automatically become products in their Souk.et shop.
"""

import asyncio
import logging

from telegram import Update
from telegram.ext import ContextTypes

from bot.db.supabase_client import (
    run_sync, get_shop_by_source_channel, create_product,
    get_product_count, product_exists_by_channel_msg,
)
from bot.services.caption_parser import parse_caption
from bot.services.ai_classifier import classify_product
from bot.services.category_channels import repost_to_category_channel
from bot.services.buyer_push import push_product_to_buyers
from bot.strings.lang import s, seed_lang

logger = logging.getLogger("suq.channel_sync")
MAX_PRODUCTS = 15


async def channel_post_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle new posts in channels where the bot is admin."""
    post = update.channel_post
    if not post or not post.photo:
        return

    # Get channel username
    channel_username = post.chat.username
    if not channel_username:
        return

    # Look up linked shop
    shop = await run_sync(get_shop_by_source_channel, channel_username)
    if not shop or not shop.get("channel_sync_enabled"):
        return

    # Check product limit
    count = await run_sync(get_product_count, shop["id"])
    if count >= MAX_PRODUCTS:
        return

    # Check for duplicate
    if await run_sync(product_exists_by_channel_msg, shop["id"], post.message_id):
        return

    caption = post.caption or post.text or ""
    if not caption.strip():
        return

    # AI classification with regex fallback
    info = await classify_product(caption)
    if not info or not info.get("name"):
        info = parse_caption(caption)
    if not info.get("name"):
        return

    # Get photo file_id (directly from PTB — valid since bot is channel admin)
    photo = post.photo[-1]  # largest size
    file_id = photo.file_id

    # Get file URL
    file_url = None
    try:
        pf = await context.bot.get_file(file_id)
        file_url = pf.file_path
        if file_url and not file_url.startswith("http"):
            file_url = f"https://api.telegram.org/file/bot{context.bot.token}/{file_url}"
    except Exception:
        pass

    try:
        product = await run_sync(
            create_product,
            shop["id"],
            info["name"],
            info.get("price"),
            photo_file_id=file_id,
            photo_url=file_url,
            description=info.get("description"),
            price_type=info.get("price_type", "fixed"),
            source_channel_msg_id=post.message_id,
            imported_from="channel_sync",
        )

        # Notify seller
        seed_lang(shop["telegram_id"], shop.get("language", "am"))
        t = s(shop["telegram_id"])
        name = info["name"]
        notify_text = getattr(t, "SYNC_PRODUCT_ADDED",
            "New product from your channel: {name}").format(name=name)

        try:
            await context.bot.send_message(
                chat_id=shop["telegram_id"],
                text=notify_text,
            )
        except Exception:
            pass

        # Auto-repost to category channel + push to buyers
        if product:
            asyncio.create_task(
                repost_to_category_channel(context.bot, product, shop))
            asyncio.create_task(
                push_product_to_buyers(context.bot, product, shop))

        logger.info(f"Auto-synced product '{name}' from @{channel_username} to shop {shop['shop_name']}")

    except Exception as e:
        logger.error(f"Failed to auto-sync from @{channel_username}: {e}")
