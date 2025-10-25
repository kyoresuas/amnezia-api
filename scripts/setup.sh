#!/usr/bin/env bash
set -euo pipefail

readonly APP_NAME="amnezia-api"
readonly ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
readonly ENV_EXAMPLE="$ROOT_DIR/.env.example"
readonly ENV_FILE="$ROOT_DIR/.env"

# Определяем sudo если не root
SUDO=""
if [ "${EUID:-$(id -u)}" -ne 0 ] && command -v sudo >/dev/null 2>&1; then
  SUDO="sudo"
fi

# Обновляет или добавляет переменную в .env файл
upsert_env_var() {
  local key="$1" value="$2"
  
  [ ! -f "$ENV_FILE" ] && touch "$ENV_FILE"
  
  awk -v k="$key" -v v="$value" '
    BEGIN { found = 0 }
    /^[ \t]*#/ { print; next }
    {
      if ($0 ~ "^[ \\t]*" k "[ \\t]*=") {
        if (!found) { print k "=" v; found = 1; next }
      }
      print
    }
    END { if (!found) print k "=" v }
  ' "$ENV_FILE" > "$ENV_FILE.tmp" && mv "$ENV_FILE.tmp" "$ENV_FILE"
}

# Получает значение переменной из .env файла
get_env_var() {
  local key="$1"
  
  [ ! -f "$ENV_FILE" ] && return 0
  
  local line
  line=$(grep -E "^[[:space:]]*$key[[:space:]]*=" "$ENV_FILE" | grep -Ev "^[[:space:]]*#" | head -n1 || true)
  [ -z "$line" ] && return 0
  
  printf "%s" "$line" | sed -E "s/^[[:space:]]*$key[[:space:]]*=\\s*//" | sed -E 's/^"(.*)"$/\1/'
}

# Генерирует случайный API ключ
generate_api_key() {
  openssl rand -hex 32 2>/dev/null || \
  (head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n') || \
  (date +%s | sha256sum | awk '{print $1}')
}

# Получает внешний IP адрес
get_public_ip() {
  curl -4 -fsS http://checkip.amazonaws.com 2>/dev/null || \
  curl -4 -fsS ifconfig.me 2>/dev/null || \
  hostname -I 2>/dev/null | awk '{print $1}'
}

# Устанавливает Node.js и pm2
install_nodejs() {
  echo "[1/5] Установка Node.js LTS и pm2..."
  
  if ! command -v node >/dev/null 2>&1; then
    if ! command -v curl >/dev/null 2>&1; then
      $SUDO apt-get update -y
      $SUDO apt-get install -y curl
    fi
    curl -fsSL https://raw.githubusercontent.com/tj/n/master/bin/n | bash -s lts
    hash -r
  fi
  
  node -v && npm -v
  
  if ! command -v pm2 >/dev/null 2>&1; then
    npm install -g pm2
  fi
  
  pm2 -v
}

# Настраивает .env файл
setup_env() {
  echo "[2/5] Подготовка .env..."
  
  if [ -f "$ENV_EXAMPLE" ]; then
    cp -n "$ENV_EXAMPLE" "$ENV_FILE"
    echo "Используется .env: $ENV_FILE"
  else
    echo ".env.example не найден" >&2
  fi
  
  # API ключ
  local current_api_key
  current_api_key="$(get_env_var FASTIFY_API_KEY)"
  if [ -z "$current_api_key" ] || echo "$current_api_key" | grep -qiE '^\s*change-me\s*$'; then
    upsert_env_var FASTIFY_API_KEY "$(generate_api_key)"
    echo "FASTIFY_API_KEY сгенерирован автоматически."
  else
    echo "FASTIFY_API_KEY уже задан. Пропуск."
  fi
  
  # Регион сервера
  local current_region input_region
  current_region="$(get_env_var SERVER_REGION)"
  read -r -p "Введите SERVER_REGION [${current_region:-пропустить}]: " input_region || true
  [ -n "$input_region" ] && upsert_env_var SERVER_REGION "$input_region"
  
  # Вес сервера
  local current_weight input_weight
  current_weight="$(get_env_var SERVER_WEIGHT)"
  while true; do
    read -r -p "Введите SERVER_WEIGHT [${current_weight:-пропустить}]: " input_weight || true
    [ -z "$input_weight" ] && break
    if [[ "$input_weight" =~ ^[0-9]+$ ]]; then
      upsert_env_var SERVER_WEIGHT "$input_weight"
      break
    else
      echo "Нужно целое число или оставьте пустым для пропуска."
    fi
  done
  
  # Максимальное количество пиров
  local current_max_peers input_max_peers
  current_max_peers="$(get_env_var SERVER_MAX_PEERS)"
  while true; do
    read -r -p "Введите SERVER_MAX_PEERS [${current_max_peers:-пропустить}]: " input_max_peers || true
    [ -z "$input_max_peers" ] && break
    if [[ "$input_max_peers" =~ ^[0-9]+$ ]]; then
      upsert_env_var SERVER_MAX_PEERS "$input_max_peers"
      break
    else
      echo "Нужно целое число или оставьте пустым для пропуска."
    fi
  done
  
  # Публичный IP
  local auto_public_ip
  auto_public_ip=$(get_public_ip)
  if [ -n "$auto_public_ip" ]; then
    upsert_env_var AMNEZIA_PUBLIC_HOST "$auto_public_ip"
    echo "AMNEZIA_PUBLIC_HOST установлен в $auto_public_ip"
  else
    echo "Не удалось автоматически определить внешний IP для AMNEZIA_PUBLIC_HOST"
  fi
  
  # Описание
  local current_desc input_desc
  current_desc="$(get_env_var AMNEZIA_DESCRIPTION)"
  read -r -p "Введите AMNEZIA_DESCRIPTION [${current_desc:-пропустить}]: " input_desc || true
  if [ -n "$input_desc" ]; then
    local esc_desc="${input_desc//\"/\\\"}"
    upsert_env_var AMNEZIA_DESCRIPTION "\"$esc_desc\""
  fi
}

# Деплоит приложение
deploy_app() {
  echo "[3/5] Деплой..."
  node ./scripts/deploy.js
}

# Настраивает Nginx
setup_nginx() {
  echo "[4/5] Установка и настройка Nginx..."
  
  if ! command -v nginx >/dev/null 2>&1; then
    $SUDO apt-get update -y
    $SUDO apt-get install -y nginx
  fi
  
  local site_avail="/etc/nginx/sites-available/$APP_NAME"
  local site_enabled="/etc/nginx/sites-enabled/$APP_NAME"
  
  $SUDO tee "$site_avail" >/dev/null <<'NGINX'
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://127.0.0.1:4001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection "upgrade";
        proxy_set_header Upgrade $http_upgrade;
    }
}
NGINX
  
  [ ! -e "$site_enabled" ] && $SUDO ln -sfn "$site_avail" "$site_enabled"
  [ -e /etc/nginx/sites-enabled/default ] && $SUDO rm -f /etc/nginx/sites-enabled/default
  
  $SUDO nginx -t
  $SUDO systemctl enable nginx >/dev/null 2>&1 || true
  $SUDO systemctl restart nginx || $SUDO systemctl reload nginx
  
  command -v ufw >/dev/null 2>&1 && $SUDO ufw allow 80/tcp || true
  
  local public_ip
  public_ip=$(get_public_ip)
  echo "Nginx настроен успешно"
}

# Показывает финальную информацию
show_completion() {
  echo "[5/5] Готово. Полезные команды:"
  echo "  pm2 status"
  echo "  pm2 logs $APP_NAME --lines 200"
  echo "  pm2 restart $APP_NAME"
  echo "  pm2 save"
  
  echo ""
  echo "Информация для доступа:"
  
  local public_ip api_key
  public_ip=$(get_public_ip)
  api_key="$(get_env_var FASTIFY_API_KEY)"
  
  if [ -n "$public_ip" ]; then
    echo "API URL: http://$public_ip/"
    echo "Swagger документация: http://$public_ip/docs"
  else
    echo "API URL: http://localhost/"
    echo "Swagger документация: http://localhost/docs"
  fi
  
  if [ -n "$api_key" ]; then
    echo "API ключ: $api_key"
    echo ""
    echo "Используйте заголовок: x-api-key: $api_key"
  else
    echo "API ключ не найден в .env файле"
  fi
}

# Основная функция
main() {
  install_nodejs
  setup_env
  deploy_app
  setup_nginx
  show_completion
}

main "$@"
