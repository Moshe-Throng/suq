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
    update_shop_source_channel, update_shop_logo, catalog_link, get_existing_captions,
)
from bot.services.dedup import is_duplicate
from bot.services.channel_scraper import (
    parse_channel_identifier, scrape_channel_posts, upload_photo_to_bot,
)
from bot.services.caption_parser import parse_caption
from bot.services.category_channels import repost_to_category_channel
from bot.services.buyer_push import push_product_to_buyers
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

    # Start scraping (import up to 50 products regardless of plan limit for now)
    progress_msg = await update.message.reply_text(
        getattr(t, "CHANNEL_IMPORTING",
            "Importing from @{channel}...").format(channel=channel))

    try:
        result = await scrape_channel_posts(channel, limit=50)
        posts = result["posts"]
        channel_photo_bytes = result.get("channel_photo_bytes")
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

    # Set channel photo as shop logo if shop doesn't have one
    if channel_photo_bytes and not shop.get("logo_file_id"):
        try:
            logo_fid, logo_url = await upload_photo_to_bot(
                channel_photo_bytes, bot_token, user.id)
            await run_sync(update_shop_logo, shop["id"], logo_fid, logo_url)
        except Exception as e:
            logger.warning(f"Failed to set channel photo as logo: {e}")

    # Get existing captions for dedup
    existing_captions = await run_sync(get_existing_captions, shop["id"])

    # Parse captions and create products
    bot_token = os.getenv("BOT_TOKEN")
    imported = 0
    skipped_dupes = 0
    errors = 0

    await progress_msg.edit_text(
        getattr(t, "CHANNEL_PARSING",
            "Found {count} posts. Extracting products...").format(count=len(posts)))

    for post in posts:
        try:
            # Parse caption
            info = parse_caption(post["caption"])
            if not info.get("name"):
                errors += 1
                continue

            # Dedup check
            caption_text = f"{info['name']} {info.get('description') or ''}"
            if is_duplicate(caption_text, existing_captions):
                skipped_dupes += 1
                continue
            existing_captions.append(caption_text)

            # Upload main photo to get PTB file_id
            file_id, file_url = await upload_photo_to_bot(
                post["photo_bytes"], bot_token, user.id)

            # Upload extra photos (from album/media group)
            extra_file_ids = []
            for extra_bytes in post.get("extra_photos", [])[:4]:  # max 4 extra
                try:
                    extra_fid, _ = await upload_photo_to_bot(extra_bytes, bot_token, user.id)
                    extra_file_ids.append(extra_fid)
                except Exception:
                    pass

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
                extra_photos=extra_file_ids if extra_file_ids else None,
            )

            imported += 1

            # Auto-repost + push to buyers (fire-and-forget)
            if product:
                asyncio.create_task(
                    repost_to_category_channel(context.bot, product, shop))
                asyncio.create_task(
                    push_product_to_buyers(context.bot, product, shop))

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

    skipped_info = []
    if skipped_dupes > 0:
        skipped_info.append(f"{skipped_dupes} duplicates")
    if errors > 0:
        skipped_info.append(f"{errors} unreadable")
    if skipped_info:
        completion += f"\n(Skipped: {', '.join(skipped_info)})"

    keyboard = InlineKeyboardMarkup([
        [InlineKeyboardButton("View Shop", url=link)],
    ])

    await progress_msg.edit_text(completion, reply_markup=keyboard)
    return True
