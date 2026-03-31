"""
Channel scraper — fetches posts from a public Telegram channel via Pyrogram.
Uses the bot token + API_ID/API_HASH for MTProto access.
"""

import io
import os
import re
import asyncio
import logging
from pathlib import Path
from dotenv import load_dotenv

_env_paths = [
    Path(__file__).parent.parent.parent / ".env",
    Path(__file__).parent.parent.parent.parent / ".env",
]
for _p in _env_paths:
    if _p.exists():
        load_dotenv(_p)
        break

logger = logging.getLogger("suq.channel_scraper")


def parse_channel_identifier(text: str) -> str | None:
    """Extract channel username from various formats.
    Returns username without @, or None if invalid."""
    text = text.strip()
    # https://t.me/channel or t.me/channel
    m = re.match(r'(?:https?://)?t\.me/([a-zA-Z_][a-zA-Z0-9_]{3,})', text)
    if m:
        return m.group(1)
    # @channel
    m = re.match(r'@([a-zA-Z_][a-zA-Z0-9_]{3,})', text)
    if m:
        return m.group(1)
    # plain username
    m = re.match(r'^([a-zA-Z_][a-zA-Z0-9_]{3,})$', text)
    if m:
        return m.group(1)
    return None


async def scrape_channel_posts(channel_username: str, limit: int = 50) -> list[dict]:
    """Scrape recent posts with photos from a public Telegram channel.
    Returns list of {photo_bytes, caption, message_id}."""
    from pyrogram import Client

    api_id = os.getenv("TELEGRAM_API_ID") or os.getenv("API_ID")
    api_hash = os.getenv("TELEGRAM_API_HASH") or os.getenv("API_HASH")
    bot_token = os.getenv("BOT_TOKEN")

    if not api_id or not api_hash or not bot_token:
        raise RuntimeError("TELEGRAM_API_ID, TELEGRAM_API_HASH, and BOT_TOKEN required")

    # User session for reading channel history (bots can't use messages.GetHistory)
    session_path = os.getenv("PYROGRAM_SESSION_PATH", "/root/suq/suq_user")
    app = Client(
        name=session_path,
        api_id=int(api_id),
        api_hash=api_hash,
    )

    posts = []
    async with app:
        try:
            chat = await app.get_chat(channel_username)
            logger.info(f"Scraping channel: {chat.title} (@{channel_username})")
        except Exception as e:
            logger.error(f"Cannot access channel @{channel_username}: {e}")
            raise ValueError(f"Cannot access channel @{channel_username}. Make sure it's a public channel.")

        async for msg in app.get_chat_history(channel_username, limit=limit):
            if not msg.photo:
                continue
            caption = msg.caption or msg.text or ""
            if not caption.strip():
                continue

            # Download photo to bytes
            try:
                photo_bytes = await app.download_media(msg, in_memory=True)
                if isinstance(photo_bytes, io.BytesIO):
                    photo_bytes = photo_bytes.getvalue()
                elif photo_bytes is None:
                    continue
            except Exception as e:
                logger.warning(f"Failed to download photo for msg {msg.id}: {e}")
                continue

            posts.append({
                "photo_bytes": photo_bytes,
                "caption": caption,
                "message_id": msg.id,
                "date": msg.date,
            })

            # Small delay to be respectful
            await asyncio.sleep(0.05)

    logger.info(f"Scraped {len(posts)} posts with photos from @{channel_username}")
    return posts


async def upload_photo_to_bot(photo_bytes: bytes, bot_token: str, chat_id: int) -> tuple[str, str | None]:
    """Upload photo bytes via Bot API to get a persistent file_id.
    Sends to seller's chat (silently), captures file_id, then deletes the message.
    Returns (file_id, file_url)."""
    import httpx

    url = f"https://api.telegram.org/bot{bot_token}/sendPhoto"
    files = {"photo": ("product.jpg", photo_bytes, "image/jpeg")}
    data = {"chat_id": str(chat_id), "disable_notification": "true"}

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(url, files=files, data=data)
        result = resp.json()

    if not result.get("ok"):
        raise RuntimeError(f"Failed to upload photo: {result}")

    photos = result["result"]["photo"]
    file_id = photos[-1]["file_id"]  # largest size
    msg_id = result["result"]["message_id"]

    # Get file URL
    file_url = None
    try:
        get_url = f"https://api.telegram.org/bot{bot_token}/getFile"
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(get_url, json={"file_id": file_id})
            file_data = resp.json()
            if file_data.get("ok"):
                file_path = file_data["result"]["file_path"]
                file_url = f"https://api.telegram.org/file/bot{bot_token}/{file_path}"
    except Exception:
        pass

    # Delete the temp message (fire-and-forget)
    try:
        del_url = f"https://api.telegram.org/bot{bot_token}/deleteMessage"
        async with httpx.AsyncClient(timeout=5.0) as client:
            await client.post(del_url, json={"chat_id": chat_id, "message_id": msg_id})
    except Exception:
        pass

    return file_id, file_url
