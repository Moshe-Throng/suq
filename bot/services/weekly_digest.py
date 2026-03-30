"""
Weekly digest — sends seller performance summaries every Monday.
Uses PTB's job_queue (APScheduler under the hood).
"""

import logging
from telegram.ext import ContextTypes

from bot.db.supabase_client import run_sync, get_all_active_shops, get_weekly_stats
from bot.strings.lang import s, seed_lang

logger = logging.getLogger("suq.weekly_digest")


def format_digest(shop: dict, stats: dict, t) -> str:
    """Format the weekly digest message."""
    views = stats.get("total_views", 0)
    taps = stats.get("contact_taps", 0)
    best = stats.get("best_product")

    lines = [
        getattr(t, "DIGEST_HEADER", "Weekly Report").format(shop_name=shop["shop_name"]),
        "",
        getattr(t, "DIGEST_VIEWS", "Views: {views}").format(views=views),
        getattr(t, "DIGEST_TAPS", "Contact taps: {taps}").format(taps=taps),
    ]

    if best:
        lines.append(getattr(t, "DIGEST_BEST", "Best: {name} ({views} views)").format(
            name=best["name"], views=best["views"]))

    # Simple insight
    if views > 0 and taps == 0:
        lines.append("")
        lines.append(getattr(t, "DIGEST_TIP_NO_TAPS",
            "Tip: Try adding better photos or descriptions to convert views to contacts."))
    elif views == 0:
        lines.append("")
        lines.append(getattr(t, "DIGEST_TIP_NO_VIEWS",
            "Tip: Share your shop link on social media to get more views."))

    return "\n".join(lines)


async def send_weekly_digests(context: ContextTypes.DEFAULT_TYPE) -> None:
    """Job callback — runs every Monday at 8AM EAT (5AM UTC)."""
    logger.info("Starting weekly digest send...")

    shops = await run_sync(get_all_active_shops)
    sent = 0
    skipped = 0

    for shop in shops:
        try:
            stats = await run_sync(get_weekly_stats, shop["id"])

            # Skip shops with zero activity
            if stats["total_views"] == 0 and stats["contact_taps"] == 0:
                skipped += 1
                continue

            seed_lang(shop["telegram_id"], shop.get("language", "am"))
            t = s(shop["telegram_id"])

            message = format_digest(shop, stats, t)
            await context.bot.send_message(
                chat_id=shop["telegram_id"],
                text=message,
            )
            sent += 1
        except Exception as e:
            logger.warning(f"Failed to send digest to {shop.get('shop_name')}: {e}")

    logger.info(f"Weekly digest complete: {sent} sent, {skipped} skipped (no activity)")
