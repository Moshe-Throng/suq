#!/bin/bash
# Suq Bot — Pull latest code and restart
# Usage: bash /root/suq/deploy/update.sh

set -e
cd /root/suq
git pull
venv/bin/pip install -r requirements.txt --quiet
systemctl restart suq-bot
sleep 2
systemctl status suq-bot --no-pager
echo "Updated and restarted!"
