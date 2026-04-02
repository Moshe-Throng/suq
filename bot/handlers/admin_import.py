"""
Admin import handler — allows the platform admin to import a channel
into a new shop and generate a claim link for the channel owner.

Usage: /admin_import @channelname
Only admin (ADMIN_CHAT_ID) can use this command.
"""

import os
import asyncio
import logging

from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ContextTypes

from bot.db.supabase_client import (
    run_sync, get_shop_by_slug, get_shop_by_source_channel,
    create_shop, create_product, update_shop_source_channel,
    update_shop_logo, update_shop_category, get_existing_captions,
    catalog_link, slugify,
)
from bot.services.dedup import is_duplicate
from bot.services.channel_scraper import (
    parse_channel_identifier, scrape_channel_posts, upload_photo_to_bot,
)
from bot.services.caption_parser import parse_caption
from bot.services.ai_classifier import classify_product
from bot.services.category_channels import repost_to_category_channel
from bot.services.buyer_push import push_product_to_buyers

logger = logging.getLogger("suq.admin_import")

ADMIN_ID = int(os.getenv("ADMIN_CHAT_ID") or os.getenv("OWNER_CHAT_ID") or "0")
# Fake telegram_id range for admin-created shops (will be replaced on claim)
_ADMIN_SHOP_TG_BASE = 900100000


async def admin_import_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle /admin_import @channelname — admin only."""
    user = update.effective_user
    if user.id != ADMIN_ID:
        await update.message.reply_text("⛔ Admin only.")
        return

    # Parse channel from args
    if not context.args:
        await update.message.reply_text(
            "Usage: /admin_import @channelname\n\n"
            "This imports a channel's products into a new shop and "
            "returns a claim link for the channel owner.")
        return

    raw = context.args[0]
    channel = parse_channel_identifier(raw)
    if not channel:
        await update.message.reply_text(
            f"❌ Can't parse channel from: {raw}\n"
            f"Send @username or https://t.me/channel")
        return

    # Check if channel is already linked to a shop
    existing_shop = await run_sync(get_shop_by_source_channel, channel)
    if existing_shop:
        slug = existing_shop["shop_slug"]
        claim_link = f"https://t.me/SoukEtBot?start=claim_{slug}"
        link = catalog_link(slug)
        await update.message.reply_text(
            f"⚠️ @{channel} already has a shop: {existing_shop['shop_name']}\n\n"
            f"🔗 Shop: {link}\n"
            f"🔑 Claim: {claim_link}")
        return

    progress = await update.message.reply_text(f"🔄 Scraping @{channel}...")

    # Scrape channel
    try:
        result = await scrape_channel_posts(channel, limit=50)
        posts = result["posts"]
        channel_photo_bytes = result.get("channel_photo_bytes")
    except Exception as e:
        logger.error(f"Admin import scrape failed for @{channel}: {e}")
        await progress.edit_text(f"❌ Failed to scrape @{channel}: {e}")
        return

    if not posts:
        await progress.edit_text(f"❌ No product posts found in @{channel}.")
        return

    await progress.edit_text(
        f"📦 Found {len(posts)} posts. Creating shop & importing...")

    # Create a new shop with a placeholder owner
    import hashlib
    fake_tg_id = _ADMIN_SHOP_TG_BASE + int(hashlib.md5(channel.encode()).hexdigest()[:6], 16) % 100000
    shop_name = channel.replace("_", " ").title()

    shop = await run_sync(
        create_shop,
        telegram_id=fake_tg_id,
        username=None,
        shop_name=shop_name,
        lang="am",
        theme_color="teal",
        shop_type="product",
    )

    if not shop:
        await progress.edit_text("❌ Failed to create shop (at capacity?).")
        return

    # Set channel photo as logo
    bot_token = os.getenv("BOT_TOKEN")
    if channel_photo_bytes:
        try:
            logo_fid, logo_url = await upload_photo_to_bot(
                channel_photo_bytes, bot_token, user.id)
            await run_sync(update_shop_logo, shop["id"], logo_fid, logo_url)
        except Exception as e:
            logger.warning(f"Failed to set channel logo: {e}")

    # Import products
    existing_captions = []
    imported = 0
    skipped = 0
    errors = 0
    detected_category = None

    for post in posts:
        try:
            info = await classify_product(post["caption"])
            if not info or not info.get("name"):
                info = parse_caption(post["caption"])
            if not info.get("name"):
                errors += 1
                continue

            caption_text = f"{info['name']} {info.get('description') or ''}"
            if is_duplicate(caption_text, existing_captions):
                skipped += 1
                continue
            existing_captions.append(caption_text)

            file_id, file_url = await upload_photo_to_bot(
                post["photo_bytes"], bot_token, user.id)

            extra_file_ids = []
            for extra_bytes in post.get("extra_photos", [])[:4]:
                try:
                    extra_fid, _ = await upload_photo_to_bot(extra_bytes, bot_token, user.id)
                    extra_file_ids.append(extra_fid)
                except Exception:
                    pass

            tag = None
            ai_tags = info.get("tags")
            if isinstance(ai_tags, list) and ai_tags:
                tag = ai_tags[0]

            product = await run_sync(
                create_product,
                shop["id"],
                info["name"],
                info.get("price"),
                photo_file_id=file_id,
                photo_url=file_url,
                description=info.get("description"),
                price_type=info.get("price_type", "fixed"),
                tag=tag,
                source_channel_msg_id=post["message_id"],
                imported_from="admin_import",
                extra_photos=extra_file_ids if extra_file_ids else None,
            )

            ai_category = info.get("category")
            if ai_category and ai_category != "other" and not detected_category:
                detected_category = ai_category

            imported += 1

            if product:
                asyncio.create_task(
                    repost_to_category_channel(context.bot, product, shop))
                asyncio.create_task(
                    push_product_to_buyers(context.bot, product, shop))

        except Exception as e:
            logger.warning(f"Admin import post {post.get('message_id')}: {e}")
            errors += 1

    # Update shop with source channel + category
    await run_sync(update_shop_source_channel, shop["id"], channel, True)
    if detected_category:
        await run_sync(update_shop_category, shop["id"], detected_category)

    # Build result
    slug = shop["shop_slug"]
    claim_link = f"https://t.me/SoukEtBot?start=claim_{slug}"
    shop_link = catalog_link(slug)

    lines = [
        f"✅ <b>Import complete!</b>",
        f"",
        f"🏪 Shop: <b>{shop['shop_name']}</b>",
        f"📦 Imported: {imported} products",
    ]
    if skipped:
        lines.append(f"⏭ Skipped: {skipped} duplicates")
    if errors:
        lines.append(f"⚠️ Errors: {errors}")
    if detected_category:
        lines.append(f"📂 Category: {detected_category}")
    lines.extend([
        f"",
        f"🔗 Shop: {shop_link}",
        f"",
        f"🔑 <b>Claim link (send to channel owner):</b>",
        f"<code>{claim_link}</code>",
    ])

    keyboard = InlineKeyboardMarkup([
        [InlineKeyboardButton("View Shop", url=shop_link)],
    ])

    await progress.edit_text("\n".join(lines), parse_mode="HTML", reply_markup=keyboard)
    logger.info(f"Admin imported @{channel} → shop '{slug}', {imported} products, claim link generated")
