"""
Claim handler — lets a channel owner claim a pre-built shop.
Flow: seller clicks t.me/SoukEtBot?start=claim_SHOPSLUG
      → bot asks them to forward a message from their channel
      → bot verifies the forwarded message came from that channel
      → shop ownership transfers to the seller's Telegram account
      → welcome sequence: celebration → tips → shop card → completion meter
"""

import asyncio
import logging

from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ContextTypes

from bot.db.supabase_client import (
    run_sync, get_shop, get_shop_by_slug, get_products, catalog_link,
    update_shop_owner,
)
from bot.strings.lang import s, seed_lang
from bot.services.shop_card import generate_shop_card

logger = logging.getLogger("suq.claim")


async def start_claim(update: Update, context: ContextTypes.DEFAULT_TYPE,
                      shop_slug: str) -> None:
    """Handle /start claim_SHOPSLUG deep link."""
    user = update.effective_user

    # Check if user already has a shop
    existing = await run_sync(get_shop, user.id)
    if existing:
        link = catalog_link(existing["shop_slug"])
        await update.message.reply_text(
            f"You already have a shop: {existing['shop_name']}\n{link}")
        return

    # Find the shop to claim
    shop = await run_sync(get_shop_by_slug, shop_slug)
    if not shop:
        await update.message.reply_text("This shop doesn't exist or has already been claimed.")
        return

    # Check if shop is already claimed by a real user (not a fake seeded telegram_id)
    owner_tg = shop.get("telegram_id", 0)
    if owner_tg and owner_tg < 900000000:
        # Real user already owns this
        await update.message.reply_text("This shop has already been claimed by someone else.")
        return

    source_channel = shop.get("source_channel")

    context.user_data["claiming_shop_slug"] = shop_slug
    context.user_data["claiming_channel"] = source_channel

    if source_channel:
        # Ask them to prove ownership by forwarding from their channel
        await update.message.reply_text(
            f"🏪 Claim \"{shop['shop_name']}\"\n\n"
            f"This shop was built from @{source_channel}.\n\n"
            f"To verify you own this channel, forward any message from @{source_channel} to me.",
        )
    else:
        # No source channel — just confirm
        keyboard = InlineKeyboardMarkup([
            [InlineKeyboardButton("Yes, claim this shop", callback_data=f"confirm_claim_{shop_slug}")],
            [InlineKeyboardButton("Cancel", callback_data="cancel_claim")],
        ])
        await update.message.reply_text(
            f"🏪 Claim \"{shop['shop_name']}\"?\n\n"
            f"You'll be the owner and can manage products, settings, and orders.",
            reply_markup=keyboard,
        )


async def verify_forwarded_message(update: Update, context: ContextTypes.DEFAULT_TYPE) -> bool:
    """Check if a forwarded message proves channel ownership. Returns True if handled."""
    shop_slug = context.user_data.get("claiming_shop_slug")
    expected_channel = context.user_data.get("claiming_channel")
    if not shop_slug or not expected_channel:
        return False

    msg = update.message
    if not msg:
        return False

    # Check if the message is forwarded from the expected channel
    fwd = msg.forward_origin
    if not fwd:
        await msg.reply_text(
            f"Please forward a message from @{expected_channel}.\n"
            f"Open the channel, long-press any message, and tap Forward → send it here.")
        return True

    # Check the forwarded source
    from telegram import MessageOriginChannel
    if isinstance(fwd, MessageOriginChannel):
        channel_username = fwd.chat.username
        if channel_username and channel_username.lower() == expected_channel.lower():
            # Verified! Transfer ownership
            await _complete_claim(update, context, shop_slug)
            return True
        else:
            await msg.reply_text(
                f"That message is from @{channel_username}, not @{expected_channel}.\n"
                f"Please forward from @{expected_channel}.")
            return True

    # Forwarded from a user, not a channel
    await msg.reply_text(
        f"That's a forwarded message from a user, not a channel.\n"
        f"Please forward a message directly from @{expected_channel}.")
    return True


async def confirm_claim_callback(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle confirm_claim_{slug} callback (for shops without source channel)."""
    query = update.callback_query
    await query.answer()
    shop_slug = query.data.replace("confirm_claim_", "")
    context.user_data["claiming_shop_slug"] = shop_slug
    await _complete_claim_from_query(query, context, shop_slug)


async def cancel_claim_callback(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle cancel_claim callback."""
    query = update.callback_query
    await query.answer()
    context.user_data.pop("claiming_shop_slug", None)
    context.user_data.pop("claiming_channel", None)
    await query.edit_message_text("Claim cancelled.")


async def _complete_claim(update: Update, context: ContextTypes.DEFAULT_TYPE,
                          shop_slug: str) -> None:
    """Transfer shop ownership to the claiming user + welcome sequence."""
    user = update.effective_user
    shop = await run_sync(get_shop_by_slug, shop_slug)
    if not shop:
        await update.message.reply_text("Shop not found.")
        return

    await run_sync(update_shop_owner, shop["id"], user.id, user.username)

    # Clean up
    context.user_data.pop("claiming_shop_slug", None)
    context.user_data.pop("claiming_channel", None)

    # Get product count
    products = await run_sync(get_products, shop["id"])
    product_count = len(products) if products else 0
    link = catalog_link(shop_slug)
    source = shop.get("source_channel")
    name = user.first_name or user.username or "there"

    # ── Message 1: Celebration ──
    keyboard = InlineKeyboardMarkup([
        [InlineKeyboardButton("🏪 View Your Shop", url=link)],
    ])
    await update.message.reply_text(
        f"🎉 <b>Welcome to souk.et, {name}!</b>\n\n"
        f"Your shop <b>\"{shop['shop_name']}\"</b> is now LIVE with "
        f"<b>{product_count} products</b>.\n\n"
        f"Here's what you can do:\n"
        f"📸 Send me a photo → I'll add it as a new product\n"
        f"⚙️ /settings → Customize your shop (logo, description, color)\n"
        f"🔗 Your shop link: {link}\n\n"
        f"Buyers are already finding shops through search — "
        f"I'll notify you when someone sends an inquiry!",
        reply_markup=keyboard,
        parse_mode="HTML",
    )
    logger.info(f"Shop '{shop['shop_name']}' claimed by @{user.username} (id={user.id})")

    # ── Message 2 (after 8 sec): Auto-sync + share tip ──
    await asyncio.sleep(8)

    await context.bot.send_message(
        chat_id=user.id,
        text=(
            f"💡 <b>Quick tip:</b> Share your shop link on WhatsApp, "
            f"Instagram, or your Telegram channel bio. "
            f"Sellers who do this get 3x more views.\n\n"
            f"Your link: {link}"
        ),
        parse_mode="HTML",
    )

    # ── Message 3 (after 15 sec): Completion meter ──
    await asyncio.sleep(15)

    has_logo = bool(shop.get("logo_file_id") or shop.get("logo_url"))
    has_desc = bool(shop.get("description"))
    has_location = bool(shop.get("location_text"))
    has_phone = bool(shop.get("phone"))
    has_products = product_count >= 3

    checks = [has_logo, has_desc, has_location, has_products]
    score = sum(checks)
    pct = score * 25  # 4 items = 100%

    lines = [f"📊 <b>Your shop is {pct}% complete</b>\n"]
    lines.append(f"{'✅' if has_products else '⬜'} Products — {product_count} listed")
    lines.append(f"{'✅' if has_logo else '⬜'} Shop logo — {'looks great!' if has_logo else 'add via /settings'}")
    lines.append(f"{'✅' if has_desc else '⬜'} Description — {'set!' if has_desc else 'tell buyers what you sell (/settings)'}")
    lines.append(f"{'✅' if has_location else '⬜'} Location — {'set!' if has_location else 'helps local buyers find you (/settings)'}")

    if pct == 100:
        lines.append(f"\n🏆 Your shop is fully set up — you're in the top tier on souk.et!")
    elif pct >= 50:
        lines.append(f"\n💪 Almost there! Complete the missing items to stand out.")

    await context.bot.send_message(
        chat_id=user.id,
        text="\n".join(lines),
        parse_mode="HTML",
    )

    # ── Message 4 (after 10 sec): Shareable shop card image ──
    await asyncio.sleep(10)

    try:
        # Get logo bytes if available
        logo_bytes = None
        logo_fid = shop.get("logo_file_id")
        if logo_fid:
            try:
                f = await context.bot.get_file(logo_fid)
                logo_ba = await f.download_as_bytearray()
                logo_bytes = bytes(logo_ba)
            except Exception:
                pass

        card_bytes = generate_shop_card(
            shop_name=shop["shop_name"],
            shop_slug=shop_slug,
            category=shop.get("category"),
            product_count=product_count,
            logo_bytes=logo_bytes,
        )
        import io
        await context.bot.send_photo(
            chat_id=user.id,
            photo=io.BytesIO(card_bytes),
            caption=(
                f"🎨 <b>Your shareable shop card!</b>\n\n"
                f"Share this on WhatsApp, Instagram, or your Telegram channel "
                f"to drive buyers to your shop."
            ),
            parse_mode="HTML",
        )
    except Exception as e:
        logger.warning(f"Failed to send shop card: {e}")


async def _complete_claim_from_query(query, context, shop_slug: str) -> None:
    """Transfer shop ownership (from callback query) + welcome sequence."""
    user = query.from_user
    shop = await run_sync(get_shop_by_slug, shop_slug)
    if not shop:
        await query.edit_message_text("Shop not found.")
        return

    await run_sync(update_shop_owner, shop["id"], user.id, user.username)

    context.user_data.pop("claiming_shop_slug", None)
    context.user_data.pop("claiming_channel", None)

    products = await run_sync(get_products, shop["id"])
    product_count = len(products) if products else 0
    link = catalog_link(shop_slug)
    name = user.first_name or user.username or "there"

    await query.edit_message_text(
        f"🎉 <b>Welcome to souk.et, {name}!</b>\n\n"
        f"Your shop <b>\"{shop['shop_name']}\"</b> is now LIVE with "
        f"<b>{product_count} products</b>.\n\n"
        f"📸 Send me a photo → new product\n"
        f"⚙️ /settings → Customize your shop\n"
        f"🔗 {link}\n\n"
        f"I'll notify you when buyers send inquiries!",
        parse_mode="HTML",
    )
    logger.info(f"Shop '{shop['shop_name']}' claimed by @{user.username} (id={user.id})")

    # Follow-up tip
    await asyncio.sleep(8)

    await context.bot.send_message(
        chat_id=user.id,
        text=(
            f"💡 <b>Share your shop link</b> on WhatsApp, Instagram, or your channel bio "
            f"to get more views:\n{link}"
        ),
        parse_mode="HTML",
    )
