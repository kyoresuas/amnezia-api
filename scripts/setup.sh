#!/usr/bin/env bash
set -euo pipefail

APP_NAME="amnezia-api"
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ENV_EXAMPLE="$ROOT_DIR/.env.example"
ENV_FILE="$ROOT_DIR/.env"
SUDO=""
if [ "${EUID:-$(id -u)}" -ne 0 ]; then
  if command -v sudo >/dev/null 2>&1; then SUDO="sudo"; fi
fi

echo "[1/5] Установка Node.js LTS и pm2..."
if ! command -v node >/dev/null 2>&1; then
  if ! command -v curl >/dev/null 2>&1; then
    $SUDO apt-get update -y || true
    $SUDO apt-get install -y curl || true
  fi
  curl -fsSL https://raw.githubusercontent.com/tj/n/master/bin/n | bash -s lts
  hash -r || true
fi
node -v
npm -v

if ! command -v pm2 >/dev/null 2>&1; then
  npm install -g pm2
fi
pm2 -v

echo "[2/5] Подготовка .env..."
if [ -f "$ENV_EXAMPLE" ]; then
  cp -n "$ENV_EXAMPLE" "$ENV_FILE" || true
  echo "Используется .env: $ENV_FILE"
else
  echo ".env.example не найден" >&2
fi

echo "[3/5] Деплой..."
node ./scripts/deploy.js

echo "[4/5] Установка и настройка Nginx (reverse proxy на 4000)..."
if ! command -v nginx >/dev/null 2>&1; then
  $SUDO apt-get update -y || true
  $SUDO apt-get install -y nginx
fi

SITE_AVAIL="/etc/nginx/sites-available/$APP_NAME"
SITE_ENABLED="/etc/nginx/sites-enabled/$APP_NAME"

$SUDO tee "$SITE_AVAIL" >/dev/null <<'NGINX'
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection "upgrade";
        proxy_set_header Upgrade $http_upgrade;
    }
}
NGINX
if [ ! -e "$SITE_ENABLED" ]; then
  $SUDO ln -sfn "$SITE_AVAIL" "$SITE_ENABLED"
fi

if [ -e /etc/nginx/sites-enabled/default ]; then
  $SUDO rm -f /etc/nginx/sites-enabled/default || true
fi

$SUDO nginx -t
$SUDO systemctl enable nginx >/dev/null 2>&1 || true
$SUDO systemctl restart nginx || $SUDO systemctl reload nginx || true

if command -v ufw >/dev/null 2>&1; then
  $SUDO ufw allow 80/tcp || true
fi

PUBLIC_IP=$(curl -4 -fsS http://checkip.amazonaws.com 2>/dev/null || curl -4 -fsS ifconfig.me 2>/dev/null || hostname -I 2>/dev/null | awk '{print $1}')
echo "Nginx настроен. Откройте: http://$PUBLIC_IP/ (проксирует на 127.0.0.1:4000)"

echo "[5/5] Готово. Полезные команды:"
echo "  pm2 status"
echo "  pm2 logs $APP_NAME --lines 200"
echo "  pm2 restart $APP_NAME"
echo "  pm2 save"

