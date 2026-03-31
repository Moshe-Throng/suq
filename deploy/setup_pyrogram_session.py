"""
One-time script to create a Pyrogram user session on the VPS.

Usage (run directly on VPS via SSH):
  cd /root/suq
  venv/bin/python deploy/setup_pyrogram_session.py +251XXXXXXXXX

This will send an OTP to your Telegram app. Enter it when prompted.
The session file is saved as /root/suq/suq_user.session
"""

import os
import sys
import asyncio
from pathlib import Path
from dotenv import load_dotenv

# Load env
for p in [Path("/root/suq/.env"), Path(".env"), Path("../.env")]:
    if p.exists():
        load_dotenv(p)
        break

api_id = os.getenv("TELEGRAM_API_ID") or os.getenv("API_ID")
api_hash = os.getenv("TELEGRAM_API_HASH") or os.getenv("API_HASH")

if not api_id or not api_hash:
    print("ERROR: TELEGRAM_API_ID and TELEGRAM_API_HASH must be in .env")
    sys.exit(1)

if len(sys.argv) < 2:
    print("Usage: python deploy/setup_pyrogram_session.py +251XXXXXXXXX")
    sys.exit(1)

phone = sys.argv[1]
print(f"API_ID: {api_id}")
print(f"Phone: {phone}")
print("Creating Pyrogram user session...\n")

from pyrogram import Client


async def main():
    app = Client(
        name="/root/suq/suq_user",
        api_id=int(api_id),
        api_hash=api_hash,
        phone_number=phone,
    )
    async with app:
        me = await app.get_me()
        print(f"\nSession created for: {me.first_name} (@{me.username})")
        print("Session file: /root/suq/suq_user.session")
        print("\nNow restart the bot: systemctl restart suq-bot")


asyncio.run(main())
