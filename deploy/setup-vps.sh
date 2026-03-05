#!/bin/bash
# Suq Bot — VPS Setup Script
# Run this ONCE on your Hostinger VPS to set up the bot.
# Usage: bash setup-vps.sh

set -e

echo "=== Suq Bot VPS Setup ==="

# 1. Clone repo
if [ ! -d "/root/suq" ]; then
    echo "Cloning repository..."
    cd /root
    git clone https://github.com/Moshe-Throng/suq.git
else
    echo "Repo already exists, pulling latest..."
    cd /root/suq
    git pull
fi

cd /root/suq

# 2. Create virtual environment
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
fi

# 3. Install dependencies
echo "Installing dependencies..."
venv/bin/pip install --upgrade pip
venv/bin/pip install -r requirements.txt

# 4. Create .env if missing
if [ ! -f ".env" ]; then
    echo ""
    echo "=== CREATE .env FILE ==="
    echo "Copy your .env file to /root/suq/.env with these variables:"
    echo "  BOT_TOKEN=your_bot_token"
    echo "  SUPABASE_URL=https://getucjflokixtpcbpvmi.supabase.co"
    echo "  SUPABASE_SERVICE_KEY=your_service_key"
    echo "  CATALOG_URL=https://web-theta-plum-56.vercel.app"
    echo ""
    echo "Then run: sudo systemctl restart suq-bot"
    echo ""
else
    echo ".env file found"
fi

# 5. Install systemd service
echo "Installing systemd service..."
cp deploy/suq-bot.service /etc/systemd/system/suq-bot.service
systemctl daemon-reload
systemctl enable suq-bot

# 6. Start the bot
if [ -f ".env" ]; then
    echo "Starting bot..."
    systemctl restart suq-bot
    sleep 2
    systemctl status suq-bot --no-pager
else
    echo "Skipping start — create .env first, then run: sudo systemctl restart suq-bot"
fi

echo ""
echo "=== Setup Complete ==="
echo "Commands:"
echo "  systemctl status suq-bot    — check status"
echo "  journalctl -u suq-bot -f    — view live logs"
echo "  systemctl restart suq-bot   — restart bot"
