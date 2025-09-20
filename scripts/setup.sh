#!/usr/bin/env bash
set -euo pipefail

APP_NAME="amnezia-api"
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ENV_EXAMPLE="$ROOT_DIR/.env.example"
ENV_FILE="$ROOT_DIR/.env"

echo "[1/4] Установка Node.js LTS и pm2..."
if ! command -v node >/dev/null 2>&1; then
  if ! command -v curl >/dev/null 2>&1; then
    apt-get update -y || true
    apt-get install -y curl || true
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

echo "[2/4] Подготовка .env..."
if [ -f "$ENV_EXAMPLE" ]; then
  cp -n "$ENV_EXAMPLE" "$ENV_FILE" || true
  echo "Используется .env: $ENV_FILE"
else
  echo ".env.example не найден" >&2
fi

echo "[3/4] Деплой..."
node ./scripts/deploy.js

echo "[4/4] Готово. Полезные команды:"
echo "  pm2 status"
echo "  pm2 logs $APP_NAME --lines 200"
echo "  pm2 restart $APP_NAME"
echo "  pm2 save"

