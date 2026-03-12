"""
Feedback handler — /feedback command + text receiver.
Saves to suq_feedback and forwards to platform owner.
"""

import os
from telegram import Update
from telegram.ext import ContextTypes

from bot.strings.lang import s
from bot.db.supabase_client import run_sync, get_shop, create_feedback

OWNER_CHAT_ID = os.getenv("ADMIN_CHAT_ID") or os.getenv("OWNER_CHAT_ID")


async def feedback_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /feedback — prompt the user to type their feedback."""
    user = update.effective_user
    t = s(user.id)
    context.user_data["awaiting_feedback"] = True
    await update.message.reply_text(
        getattr(t, "FEEDBACK_PROMPT", "We'd love to hear your thoughts! What's working, what's not, or what would you like us to add?")
    )


async def feedback_text_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> bool:
    """Check if user is submitting feedback. Returns True if consumed."""
    if not context.user_data.get("awaiting_feedback"):
        return False

    context.user_data.pop("awaiting_feedback", None)
    user = update.effective_user
    t = s(user.id)
    text = update.message.text.strip()

    if not text:
        return True

    # Get shop info if available
    shop = await run_sync(get_shop, user.id)
    shop_id = shop["id"] if shop else None
    shop_name = shop["shop_name"] if shop else "No shop"

    # Save to database
    await run_sync(create_feedback, shop_id, user.id, "bot", text)

    # Thank the user
    await update.message.reply_text(
        getattr(t, "FEEDBACK_THANKS", "Thank you for your feedback! We read every message.")
    )

    # Forward to platform owner
    if OWNER_CHAT_ID:
        try:
            owner_msg = (
                f"Feedback from {user.full_name} (@{user.username or 'N/A'})\n"
                f"Shop: {shop_name}\n\n"
                f"{text}"
            )
            await context.bot.send_message(
                chat_id=int(OWNER_CHAT_ID),
                text=owner_msg,
            )
        except Exception:
            pass

    return True
