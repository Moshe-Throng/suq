"""
Channel import handler — imports products from a seller's Telegram channel.
"""

import os
import asyncio
import logging

from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ContextTypes

from bot.db.supabase_client import (
    run_sync, get_shop, create_product, get_product_count,
    update_shop_source_channel, catalog_link,
)
from bot.services.channel_scraper import (
    parse_channel_identifier, scrape_channel_posts, upload_photo_to_bot,
)
from bot.services.caption_parser import parse_caption
from bot.services.category_channels import repost_to_category_channel
from bot.strings.lang import s, seed_lang

logger = logging.getLogger("suq.channel_import")
MAX_PRODUCTS = 15


async def import_ask_channel(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Prompt seller for their channel link."""
    query = update.callback_query
    await query.answer()
    user = query.from_user

    shop = await run_sync(get_shop, user.id)
    if not shop:
        await query.edit_message_text(s(user.id).ERROR)
        return
    seed_lang(user.id, shop.get("language", "am"))
    t = s(user.id)

    context.user_data["awaiting_channel_link"] = True
    await query.edit_message_text(
        getattr(t, "ASK_CHANNEL_LINK",
            "Send your Telegram channel link or @username.\n\n"
            "We'll import your products automatically.\n\n"
            "Example: @MyShopChannel or https://t.me/MyShopChannel")
    )


async def import_recv_channel(update: Update, context: ContextTypes.DEFAULT_TYPE) -> bool:
    """Receive channel link and start import. Returns True if handled."""
    if not context.user_data.get("awaiting_channel_link"):
        return False

    context.user_data.pop("awaiting_channel_link", None)
    user = update.effective_user
    text = update.message.text.strip()

    shop = await run_sync(get_shop, user.id)
    if not shop:
        await update.message.reply_text(s(user.id).ERROR)
        return True
    seed_lang(user.id, shop.get("language", "am"))
    t = s(user.id)

    # Parse channel identifier
    channel = parse_channel_identifier(text)
    if not channel:
        await update.message.reply_text(
            getattr(t, "CHANNEL_INVALID",
                "That doesn't look like a valid channel link. Send @username or https://t.me/channel"))
        context.user_data["awaiting_channel_link"] = True
        return True

    # Check product limit
    current_count = await run_sync(get_product_count, shop["id"])
    remaining = MAX_PRODUCTS - current_count
    if remaining <= 0:
        await update.message.reply_text(
            getattr(t, "PRODUCT_LIMIT",
                "You've reached the free plan limit of {max} products.").format(max=MAX_PRODUCTS))
        return True

    # Start scraping
    progress_msg = await update.message.reply_text(
        getattr(t, "CHANNEL_IMPORTING",
            "Importing from @{channel}...").format(channel=channel))

    try:
        posts = await scrape_channel_posts(channel, limit=remaining + 10)
    except ValueError as e:
        await progress_msg.edit_text(str(e))
        return True
    except Exception as e:
        logger.error(f"Scrape failed for @{channel}: {e}")
        await progress_msg.edit_text(
            getattr(t, "CHANNEL_SCRAPE_FAILED",
                "Failed to access @{channel}. Make sure it's a public channel.").format(channel=channel))
        return True

    if not posts:
        await progress_msg.edit_text(
            getattr(t, "CHANNEL_NO_PRODUCTS",
                "No product posts found in @{channel}.").format(channel=channel))
        return True

    # Parse captions and create products
    bot_token = os.getenv("BOT_TOKEN")
    imported = 0
    errors = 0

    await progress_msg.edit_text(
        getattr(t, "CHANNEL_PARSING",
            "Found {count} posts. Extracting products...").format(count=len(posts)))

    for post in posts[:remaining]:
        try:
            # Parse caption
            info = parse_caption(post["caption"])
            if not info.get("name"):
                errors += 1
                continue

            # Upload photo to get PTB file_id
            file_id, file_url = await upload_photo_to_bot(
                post["photo_bytes"], bot_token, user.id)

            # Create product
            product = await run_sync(
                create_product,
                shop["id"],
                info["name"],
                info.get("price"),
                photo_file_id=file_id,
                photo_url=file_url,
                description=info.get("description"),
                price_type=info.get("price_type", "fixed"),
                source_channel_msg_id=post["message_id"],
                imported_from="channel_import",
            )

            imported += 1

            # Auto-repost to category channel (fire-and-forget)
            if product:
                asyncio.create_task(
                    repost_to_category_channel(
                        context.bot, product, shop))

        except Exception as e:
            logger.warning(f"Failed to import post {post['message_id']}: {e}")
            errors += 1

    # Save channel link to shop
    await run_sync(update_shop_source_channel, shop["id"], channel, True)

    # Send completion message
    link = catalog_link(shop["shop_slug"])
    completion = getattr(t, "CHANNEL_IMPORT_DONE",
        "Imported {count} products from @{channel}!\n\n"
        "Your shop: {link}\n\n"
        "Add @SoukEtBot as admin to your channel for auto-sync.").format(
        count=imported, channel=channel, link=link)

    if errors > 0:
        completion += getattr(t, "CHANNEL_IMPORT_ERRORS",
            "\n({errors} posts skipped — no product info found)").format(errors=errors)

    keyboard = InlineKeyboardMarkup([
        [InlineKeyboardButton("View Shop", url=link)],
    ])

    await progress_msg.edit_text(completion, reply_markup=keyboard)
    return True
