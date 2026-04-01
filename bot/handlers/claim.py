"""
Claim handler — lets a channel owner claim a pre-built shop.
Flow: seller clicks t.me/SoukEtBot?start=claim_SHOPSLUG
      → bot asks them to forward a message from their channel
      → bot verifies the forwarded message came from that channel
      → shop ownership transfers to the seller's Telegram account
"""

import logging

from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ContextTypes

from bot.db.supabase_client import (
    run_sync, get_shop, get_shop_by_slug, catalog_link,
    update_shop_owner,
)
from bot.strings.lang import s, seed_lang

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
    """Transfer shop ownership to the claiming user."""
    user = update.effective_user
    shop = await run_sync(get_shop_by_slug, shop_slug)
    if not shop:
        await update.message.reply_text("Shop not found.")
        return

    await run_sync(update_shop_owner, shop["id"], user.id, user.username)

    # Clean up
    context.user_data.pop("claiming_shop_slug", None)
    context.user_data.pop("claiming_channel", None)

    link = catalog_link(shop_slug)
    keyboard = InlineKeyboardMarkup([
        [InlineKeyboardButton("View Your Shop", url=link)],
    ])
    await update.message.reply_text(
        f"🎉 You now own \"{shop['shop_name']}\"!\n\n"
        f"Your shop: {link}\n\n"
        f"Use /start to manage your products and settings.",
        reply_markup=keyboard,
    )
    logger.info(f"Shop '{shop['shop_name']}' claimed by @{user.username} (id={user.id})")


async def _complete_claim_from_query(query, context, shop_slug: str) -> None:
    """Transfer shop ownership (from callback query)."""
    user = query.from_user
    shop = await run_sync(get_shop_by_slug, shop_slug)
    if not shop:
        await query.edit_message_text("Shop not found.")
        return

    await run_sync(update_shop_owner, shop["id"], user.id, user.username)

    context.user_data.pop("claiming_shop_slug", None)
    context.user_data.pop("claiming_channel", None)

    link = catalog_link(shop_slug)
    await query.edit_message_text(
        f"🎉 You now own \"{shop['shop_name']}\"!\n\n"
        f"Your shop: {link}\n\nUse /start to manage your products and settings.",
    )
    logger.info(f"Shop '{shop['shop_name']}' claimed by @{user.username} (id={user.id})")
