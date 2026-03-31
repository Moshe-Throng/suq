"""
One-time script to create a Pyrogram user session on the VPS.
Run interactively: python deploy/setup_pyrogram_session.py

This will ask for your phone number and OTP code.
The session file is saved as /root/suq/suq_user.session
"""

import os
import sys
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

print(f"API_ID: {api_id}")
print("Creating Pyrogram user session...")
print("You will be asked for your phone number and OTP code.\n")

from pyrogram import Client

app = Client(
    name="/root/suq/suq_user",
    api_id=int(api_id),
    api_hash=api_hash,
)

with app:
    me = app.get_me()
    print(f"\nSession created for: {me.first_name} (@{me.username})")
    print("Session file: /root/suq/suq_user.session")
    print("Done!")
