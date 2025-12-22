#!/usr/bin/env bash
set -euo pipefail

readonly APP_NAME="amnezia-api"
readonly ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
readonly ENV_EXAMPLE="$ROOT_DIR/.env.example"
readonly ENV_FILE="$ROOT_DIR/.env"
IS_UPDATE=0

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

# Авто-детект поддерживаемых протоколов по запущенным контейнерам
detect_protocols_enabled() {
  if ! command -v docker >/dev/null 2>&1; then
    return 0
  fi

  local containers protocols=""
  containers="$($SUDO docker ps --format '{{.Names}}' 2>/dev/null || true)"

  echo "$containers" | grep -qx "amnezia-awg" && protocols="${protocols}amneziawg,"
  echo "$containers" | grep -qx "amnezia-xray" && protocols="${protocols}xray,"

  protocols="${protocols%,}"
  printf "%s" "$protocols"
}

# Обновляет репозиторий 
update_repo() {
  echo "Обновление репозитория..."

  if ! command -v git >/dev/null 2>&1; then
    echo "git не найден, пропускаю git pull."
    return 0
  fi

  if [ ! -d "$ROOT_DIR/.git" ]; then
    echo "Директория .git не найдена (не git-репозиторий?), пропускаю git pull."
    return 0
  fi

  git -C "$ROOT_DIR" pull --ff-only
}

# Устанавливает Node.js и pm2
install_dependencies() {
  echo "[1/6] Установка зависимостей..."
  
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
  echo "[2/6] Подготовка .env..."
  
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

  # Протоколы
  local current_protocols auto_protocols
  current_protocols="$(get_env_var PROTOCOLS_ENABLED)"
  if [ -z "$current_protocols" ] || echo "$current_protocols" | grep -qiE '^\s*change-me\s*$'; then
    auto_protocols="$(detect_protocols_enabled)"
    if [ -n "$auto_protocols" ]; then
      upsert_env_var PROTOCOLS_ENABLED "$auto_protocols"
      echo "PROTOCOLS_ENABLED установлен автоматически: $auto_protocols"
    else
      echo "PROTOCOLS_ENABLED: контейнеры протоколов не найдены, пропускаю."
    fi
  else
    echo "PROTOCOLS_ENABLED уже задан. Пропуск."
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
    upsert_env_var SERVER_PUBLIC_HOST "$auto_public_ip"
    echo "SERVER_PUBLIC_HOST установлен в $auto_public_ip"
  else
    echo "Не удалось автоматически определить внешний IP для SERVER_PUBLIC_HOST"
  fi
  
  # Описание
  local current_desc input_desc
  current_desc="$(get_env_var SERVER_NAME)"
  read -r -p "Введите SERVER_NAME [${current_desc:-пропустить}]: " input_desc || true
  if [ -n "$input_desc" ]; then
    local esc_desc="${input_desc//\"/\\\"}"
    upsert_env_var SERVER_NAME "\"$esc_desc\""
  fi
}

# Деплоит приложение
deploy_app() {
  echo "[3/6] Деплой..."
  node ./scripts/deploy.js
}

# Настраивает автозапуск pm2 после ребута
setup_pm2_startup() {
  echo "[4/6] Настройка автозапуска pm2..."

  if ! command -v pm2 >/dev/null 2>&1; then
    echo "pm2 не найден, пропускаю настройку автозапуска."
    return 0
  fi

  local pm2_user pm2_home
  pm2_user="${SUDO_USER:-${USER:-root}}"
  pm2_home="$(eval echo "~$pm2_user" 2>/dev/null || echo "${HOME:-/root}")"

  $SUDO env "PATH=$PATH" pm2 startup systemd -u "$pm2_user" --hp "$pm2_home" >/dev/null 2>&1 || true

  if [ -n "$SUDO" ] && [ "$pm2_user" != "${USER:-root}" ]; then
    $SUDO -u "$pm2_user" env "PATH=$PATH" pm2 save >/dev/null 2>&1 || true
  else
    pm2 save >/dev/null 2>&1 || true
  fi
}

# Настройка Xray Stats API
setup_xray_stats() {
  echo "[5/6] Настройка Xray Stats API..."

  if ! command -v docker >/dev/null 2>&1; then
    echo "Docker не установлен, пропускаю настройку Xray Stats API."
    return 0
  fi

  if ! $SUDO docker ps --format '{{.Names}}' | grep -qx "amnezia-xray"; then
    echo "Контейнер amnezia-xray не найден, пропускаю настройку Xray Stats API."
    return 0
  fi

  if ! command -v python3 >/dev/null 2>&1; then
    echo "Установка python3 для настройки Xray Stats API..."
    $SUDO apt-get update -y
    $SUDO apt-get install -y python3
  fi

  tmp_json="$(mktemp)"

  $SUDO docker exec amnezia-xray sh -lc 'cat /opt/amnezia/xray/server.json 2>/dev/null || echo "{}"' > "$tmp_json"

  python3 "$ROOT_DIR/scripts/xray/setup_xray_stats.py" "$tmp_json"

  $SUDO docker cp "$tmp_json" amnezia-xray:/opt/amnezia/xray/server.json
  rm -f "$tmp_json"

  echo "Перезапуск контейнера amnezia-xray для применения настроек Stats API..."
  $SUDO docker restart amnezia-xray >/dev/null 2>&1 || true
}

# Настраивает Nginx
setup_nginx() {
  echo "[6/6] Установка и настройка Nginx..."
  
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
  if [ "${IS_UPDATE:-0}" -eq 1 ]; then
    echo "Готово. Обновление завершено."
  else
    echo "Готово. Установка завершена."
  fi
  echo "Полезные команды:"
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
  if [ -f "$ENV_FILE" ]; then
    IS_UPDATE=1
  else
    IS_UPDATE=0
  fi

  update_repo

  if [ "${IS_UPDATE:-0}" -eq 0 ]; then
    install_dependencies
    setup_env
  fi

  deploy_app
  setup_pm2_startup

  if [ "${IS_UPDATE:-0}" -eq 0 ]; then
    setup_xray_stats
    setup_nginx
  fi

  show_completion
}

main "$@"
