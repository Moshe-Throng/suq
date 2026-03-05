"""
Suq — Telegram Storefront Bot
Entry point.

Usage:
  cd suq
  python -m bot.main
"""

import os
import logging
from pathlib import Path
from dotenv import load_dotenv

from telegram import BotCommand
from telegram.ext import (
    ApplicationBuilder,
    CommandHandler,
    CallbackQueryHandler,
    MessageHandler,
    filters,
)

from bot.handlers.start import (
    start_handler, help_handler, language_handler, shop_handler, shop_name_handler,
)
from bot.handlers.products import build_add_product_conv, list_products
from bot.handlers.orders import list_orders
from bot.handlers.callbacks import callback_router
from bot.handlers.settings import (
    settings_recv_desc, settings_recv_logo, settings_recv_logo_skip,
)

# ── Config ────────────────────────────────────────────────────

_env_paths = [
    Path(__file__).parent.parent / ".env",
    Path(__file__).parent.parent.parent / ".env",
]
for _p in _env_paths:
    if _p.exists():
        load_dotenv(_p)
        break

BOT_TOKEN = os.getenv("BOT_TOKEN")
if not BOT_TOKEN:
    raise RuntimeError("BOT_TOKEN must be set in .env")

logging.basicConfig(
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
    level=logging.INFO,
)
logger = logging.getLogger("suq")


# ── Bot menu commands ─────────────────────────────────────────

COMMANDS_EN = [
    BotCommand("start", "Main menu"),
    BotCommand("add", "Add a product or service"),
    BotCommand("products", "View your items"),
    BotCommand("orders", "View inquiries"),
    BotCommand("shop", "Your shop link"),
    BotCommand("language", "Change language"),
    BotCommand("help", "List commands"),
]


async def post_init(application) -> None:
    """Set bot commands after startup."""
    await application.bot.set_my_commands(COMMANDS_EN)
    logger.info("Bot commands menu set.")


# ── Main ──────────────────────────────────────────────────────

def main():
    """Build and run the Suq bot."""
    app = (
        ApplicationBuilder()
        .token(BOT_TOKEN)
        .post_init(post_init)
        .build()
    )

    # ── Conversation Handlers (must be added before single-command handlers) ──

    # Add product flow: /add → photo → name → price → description
    app.add_handler(build_add_product_conv())

    # ── Command Handlers ──

    app.add_handler(CommandHandler("start", start_handler))
    app.add_handler(CommandHandler("products", list_products))
    app.add_handler(CommandHandler("orders", list_orders))
    app.add_handler(CommandHandler("shop", shop_handler))
    app.add_handler(CommandHandler("language", language_handler))
    app.add_handler(CommandHandler("help", help_handler))

    # ── Photo handler for logo upload (settings) ──
    async def _photo_handler(update, context):
        if await settings_recv_logo(update, context):
            return
        # Not awaiting logo — ignore standalone photos outside ConversationHandler

    app.add_handler(MessageHandler(filters.PHOTO & ~filters.COMMAND, _photo_handler))

    # ── Text handler (description input → logo skip → shop name) ──
    async def _text_handler(update, context):
        text = update.message.text.strip() if update.message.text else ""

        # Check /skip during logo prompt
        if text.lower() == "/skip" and context.user_data.get("awaiting_logo"):
            await settings_recv_logo_skip(update, context)
            return

        # Check description input
        if await settings_recv_desc(update, context):
            return

        # Fall through to shop name handler (onboarding)
        await shop_name_handler(update, context)

    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, _text_handler))

    # Handle /skip command during description prompt
    async def _skip_handler(update, context):
        if context.user_data.get("awaiting_description"):
            await settings_recv_desc(update, context)
            return
        if context.user_data.get("awaiting_logo"):
            await settings_recv_logo_skip(update, context)
            return

    app.add_handler(CommandHandler("skip", _skip_handler))

    # ── Callback Query Handler (all inline buttons) ──
    app.add_handler(CallbackQueryHandler(callback_router))

    # ── Start Polling ──
    logger.info("Suq bot starting... (polling mode)")
    app.run_polling(drop_pending_updates=True)


if __name__ == "__main__":
    main()
