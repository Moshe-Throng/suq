"""
Stock check — periodically asks sellers if their products are still available.
Runs every Wednesday at 8AM EAT via PTB job_queue.
"""

import logging
from telegram import InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ContextTypes

from bot.db.supabase_client import run_sync, get_all_active_shops, get_products
from bot.strings.lang import s, seed_lang

logger = logging.getLogger("suq.stock_check")


async def send_stock_checks(context: ContextTypes.DEFAULT_TYPE) -> None:
    """Job callback — asks sellers about their oldest products."""
    logger.info("Starting stock check reminders...")
    shops = await run_sync(get_all_active_shops)
    sent = 0

    for shop in shops:
        try:
            products = await run_sync(get_products, shop["id"], active_only=True)
            if not products or len(products) < 3:
                continue

            # Pick the 3 oldest products
            oldest = sorted(products, key=lambda p: p.get("created_at", ""))[:3]
            seed_lang(shop["telegram_id"], shop.get("language", "am"))
            t = s(shop["telegram_id"])

            lines = [getattr(t, "STOCK_CHECK_HEADER",
                "Are these still available?")]
            buttons = []
            for p in oldest:
                lines.append(f"• {p['name']}")
                buttons.append([
                    InlineKeyboardButton(
                        f"✅ {p['name'][:20]}", callback_data=f"stock_yes_{p['id']}"),
                    InlineKeyboardButton(
                        f"❌ Sold", callback_data=f"stock_no_{p['id']}"),
                ])

            await context.bot.send_message(
                chat_id=shop["telegram_id"],
                text="\n".join(lines),
                reply_markup=InlineKeyboardMarkup(buttons),
            )
            sent += 1
        except Exception as e:
            logger.warning(f"Stock check failed for {shop.get('shop_name')}: {e}")

    logger.info(f"Stock check complete: {sent} sellers asked")
