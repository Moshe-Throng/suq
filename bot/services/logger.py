"""Centralized logging to Supabase system_logs table."""

import traceback
from supabase import Client
from ..db.supabase_client import get_client


def log_event(
    message: str,
    level: str = "info",
    category: str | None = None,
    metadata: dict | None = None,
) -> None:
    """Log an event to system_logs (fire-and-forget)."""
    try:
        client: Client = get_client()
        client.table("system_logs").insert({
            "source": "bot",
            "level": level,
            "message": message,
            "category": category,
            "metadata": metadata or {},
        }).execute()
    except Exception:
        # Don't crash the bot if logging fails
        pass


def log_error(message: str, category: str | None = None, metadata: dict | None = None) -> None:
    log_event(message, level="error", category=category, metadata=metadata)


def log_warn(message: str, category: str | None = None, metadata: dict | None = None) -> None:
    log_event(message, level="warn", category=category, metadata=metadata)


def log_info(message: str, category: str | None = None, metadata: dict | None = None) -> None:
    log_event(message, level="info", category=category, metadata=metadata)


async def error_handler(update, context) -> None:
    """Global bot error handler — logs to system_logs."""
    tb = traceback.format_exception(type(context.error), context.error, context.error.__traceback__)
    log_error(
        message=str(context.error),
        category="unhandled",
        metadata={
            "traceback": "".join(tb[-3:]),
            "update": str(update)[:500] if update else None,
        },
    )
