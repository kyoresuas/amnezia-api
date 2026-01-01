#!/usr/bin/env bash
set -euo pipefail

readonly APP_NAME="amnezia-api"
readonly ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
readonly ENV_EXAMPLE="$ROOT_DIR/.env.example"
readonly ENV_FILE="$ROOT_DIR/.env"
IS_UPDATE=0
INSTALL_MODE="" # pm2 | docker

LOG_FILE="$(mktemp /tmp/amnezia-api-setup.XXXXXX.log 2>/dev/null || echo "/tmp/amnezia-api-setup.$$.$RANDOM.log")"
cleanup() {
  rm -f "$LOG_FILE" >/dev/null 2>&1 || true
}
trap cleanup EXIT

# Определяем sudo если не root
SUDO=""
if [ "${EUID:-$(id -u)}" -ne 0 ] && command -v sudo >/dev/null 2>&1; then
  SUDO="sudo"
fi

supports_color() {
  [ -t 1 ] && [ -z "${NO_COLOR:-}" ] && [ "${TERM:-}" != "dumb" ]
}

if supports_color; then
  C_RESET=$'\033[0m'
  C_BOLD=$'\033[1m'
  C_DIM=$'\033[2m'
  C_RED=$'\033[31m'
  C_GREEN=$'\033[32m'
  C_YELLOW=$'\033[33m'
  C_BLUE=$'\033[34m'
  C_MAGENTA=$'\033[35m'
  C_CYAN=$'\033[36m'
else
  C_RESET=""
  C_BOLD=""
  C_DIM=""
  C_RED=""
  C_GREEN=""
  C_YELLOW=""
  C_BLUE=""
  C_MAGENTA=""
  C_CYAN=""
fi

line() { printf "%s\n" "$*"; }
hr() { printf "%b\n" "${C_DIM}------------------------------------------------------------${C_RESET}"; }

section() {
  printf "\n%b\n" "${C_BOLD}${C_CYAN}$*${C_RESET}"
}

step() {
  printf "%b\n" "${C_BOLD}${C_BLUE}$*${C_RESET}"
}

info() { printf "%b\n" "  ${C_DIM}$*${C_RESET}"; }
ok() { printf "%b\n" "  ${C_GREEN}[OK]${C_RESET} $*"; }
warn() { printf "%b\n" "${C_YELLOW}WARN:${C_RESET} $*" >&2; }
err() { printf "%b\n" "${C_RED}ERROR:${C_RESET} $*" >&2; }
kv() { printf "%b\n" "  ${C_DIM}$1:${C_RESET} ${C_BOLD}$2${C_RESET}"; }

run_quiet() {
  # run_quiet "title" command...
  local title="$1"
  shift

  : >> "$LOG_FILE" 2>/dev/null || true

  if [ -t 1 ]; then
    local spin='|/-\'
    local i=0
    ("$@" >>"$LOG_FILE" 2>&1) &
    local pid=$!

    # рисеум строку
    while kill -0 "$pid" >/dev/null 2>&1; do
      printf "\r\033[2K  %b%s...%b %b%c%b" \
        "$C_DIM" "$title" "$C_RESET" "$C_CYAN" "${spin:i%4:1}" "$C_RESET"
      i=$((i + 1))
      sleep 0.12
    done
    wait "$pid"
    local rc=$?

    printf "\r\033[2K" # очистить строку

    if [ "$rc" -eq 0 ]; then
      ok "$title"
      return 0
    fi

    err "$title"
    info "Диагностика:"
    tail -n 40 "$LOG_FILE" >&2 || true
    return "$rc"
  fi

  info "$title..."
  if "$@" >>"$LOG_FILE" 2>&1; then
    ok "$title"
    return 0
  fi

  err "$title"
  info "Диагностика:"
  tail -n 40 "$LOG_FILE" >&2 || true
  return 1
}

# Выбор режима установки/запуска
choose_install_mode() {
  # Если нет TTY, по умолчанию pm2
  if [ ! -t 0 ]; then
    INSTALL_MODE="pm2"
    kv "Режим установки" "pm2"
    return 0
  fi

  local input
  section "Как запустить ${APP_NAME}?"
  info "1) pm2"
  info "2) docker (docker compose)"
  hr
  read -r -p "$(printf "%b" "${C_BOLD}Выберите [1/2] (по умолчанию 1): ${C_RESET}")" input || true

  case "${input:-1}" in
    2|docker|Docker|DOCKER)
      INSTALL_MODE="docker"
      ;;
    1|pm2|PM2|"")
      INSTALL_MODE="pm2"
      ;;
    *)
      INSTALL_MODE="pm2"
      ;;
  esac

  if [ "${input:-1}" != "1" ] && [ "${input:-1}" != "2" ] && [ -n "${input:-}" ]; then
    warn "Неверный выбор '${input}' — используется pm2"
  fi

  kv "Режим установки" "$INSTALL_MODE"
}

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
  section "Обновление репозитория"

  if ! command -v git >/dev/null 2>&1; then
    warn "git не найден — git pull пропущен"
    return 0
  fi

  if [ ! -d "$ROOT_DIR/.git" ]; then
    warn ".git не найден — git pull пропущен"
    return 0
  fi

  run_quiet "git pull" git -C "$ROOT_DIR" pull --ff-only
}

# Устанавливает Node.js и pm2
install_dependencies() {
  step "[1/6] Зависимости (pm2)"
  
  if ! command -v node >/dev/null 2>&1; then
    if ! command -v curl >/dev/null 2>&1; then
      run_quiet "apt update" $SUDO apt-get update -y
      run_quiet "apt install curl" $SUDO apt-get install -y -qq curl
    fi
    run_quiet "Установка Node.js (n lts)" bash -lc 'curl -fsSL https://raw.githubusercontent.com/tj/n/master/bin/n | bash -s lts'
    hash -r
  fi
  
  node -v && npm -v && ok "Node.js / npm установлены"
  
  if ! command -v pm2 >/dev/null 2>&1; then
    run_quiet "npm i -g pm2" npm install -g pm2
  fi
  
  pm2 -v && ok "pm2 установлен"
}

# Установка Docker
setup_docker_apt_repo() {
  # Минимальная настройка Docker repo для Debian/Ubuntu, чтобы был docker-compose-plugin
  if [ "$(uname -s 2>/dev/null || true)" != "Linux" ]; then
    return 1
  fi
  if [ ! -f /etc/os-release ]; then
    return 1
  fi

  # shellcheck disable=SC1091
  . /etc/os-release

  local arch codename id
  id="${ID:-ubuntu}"
  arch="$(dpkg --print-architecture 2>/dev/null || echo amd64)"
  codename="${VERSION_CODENAME:-}"
  if [ -z "$codename" ] && command -v lsb_release >/dev/null 2>&1; then
    codename="$(lsb_release -cs 2>/dev/null || true)"
  fi
  [ -n "$codename" ] || codename="stable"

  run_quiet "apt install prerequisites" $SUDO apt-get update -y
  run_quiet "apt install ca-certificates/curl/gnupg" $SUDO apt-get install -y -qq ca-certificates curl gnupg

  run_quiet "Подготовка keyrings" $SUDO install -m 0755 -d /etc/apt/keyrings
  run_quiet "Docker GPG key" bash -lc "curl -fsSL 'https://download.docker.com/linux/$id/gpg' | $SUDO gpg --dearmor -o /etc/apt/keyrings/docker.gpg"
  run_quiet "chmod docker.gpg" $SUDO chmod a+r /etc/apt/keyrings/docker.gpg

  run_quiet "Docker apt repo" bash -lc "echo 'deb [arch=$arch signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/$id $codename stable' | $SUDO tee /etc/apt/sources.list.d/docker.list >/dev/null"
  run_quiet "apt update (docker repo)" $SUDO apt-get update -y
}

install_docker() {
  step "[1/6] Установка Docker"

  if [ "$(uname -s 2>/dev/null || true)" != "Linux" ]; then
    err "Авто-установка Docker поддерживается только на Linux (Debian/Ubuntu)."
    return 1
  fi

  if ! command -v apt-get >/dev/null 2>&1; then
    err "apt-get не найден. Установите Docker вручную и повторите."
    return 1
  fi

  setup_docker_apt_repo || {
    err "Не удалось настроить Docker repo"
    return 1
  }

  run_quiet "apt install docker" $SUDO apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

  # Запуск сервиса
  if command -v systemctl >/dev/null 2>&1; then
    run_quiet "systemctl enable docker" $SUDO systemctl enable docker
    run_quiet "systemctl start docker" $SUDO systemctl start docker
  fi

  docker --version || $SUDO docker --version
  $SUDO docker compose version >/dev/null 2>&1 || true
  ok "Docker установлен"
}

# Убедиться, что docker compose доступен 
ensure_docker_compose() {
  if $SUDO docker compose version >/dev/null 2>&1; then
    return 0
  fi
  if command -v docker-compose >/dev/null 2>&1; then
    return 0
  fi

  if [ "$(uname -s 2>/dev/null || true)" != "Linux" ]; then
    err "Авто-установка Docker Compose поддерживается только на Debian/Ubuntu."
    info "Установите Docker Desktop/Compose вручную и повторите."
    return 1
  fi

  if ! command -v apt-get >/dev/null 2>&1; then
    err "apt-get не найден — Docker Compose нужно поставить вручную"
    return 1
  fi

  setup_docker_apt_repo >/dev/null 2>&1 || true
  run_quiet "apt install docker-compose-plugin" $SUDO apt-get install -y -qq docker-compose-plugin || true

  if $SUDO docker compose version >/dev/null 2>&1; then
    ok "Docker Compose установлен"
    return 0
  fi

  run_quiet "apt install docker-compose" $SUDO apt-get install -y -qq docker-compose || true
  if command -v docker-compose >/dev/null 2>&1; then
    ok "docker-compose установлен"
    return 0
  fi

  if command -v docker-compose >/dev/null 2>&1; then
    ok "docker-compose найден"
    return 0
  fi

  err "Не удалось установить Docker Compose."
  info "Попробуйте: apt-get install docker-compose или docker-compose-plugin"
  return 1
}

# Настраивает .env файл
setup_env() {
  step "[2/6] Подготовка .env"
  
  if [ -f "$ENV_EXAMPLE" ]; then
    cp -n "$ENV_EXAMPLE" "$ENV_FILE"
  else
    warn ".env.example не найден"
  fi
  
  # API ключ
  local current_api_key
  current_api_key="$(get_env_var FASTIFY_API_KEY)"
  if [ -z "$current_api_key" ] || echo "$current_api_key" | grep -qiE '^\s*change-me\s*$'; then
    upsert_env_var FASTIFY_API_KEY "$(generate_api_key)"
    ok "FASTIFY_API_KEY сгенерирован автоматически"
  else
    info "FASTIFY_API_KEY уже задан. Пропуск."
  fi

  # Протоколы
  local current_protocols auto_protocols
  current_protocols="$(get_env_var PROTOCOLS_ENABLED)"
  auto_protocols="$(detect_protocols_enabled)"
  if [ -n "$auto_protocols" ] && [ "$auto_protocols" != "$current_protocols" ]; then
    upsert_env_var PROTOCOLS_ENABLED "$auto_protocols"
    ok "PROTOCOLS_ENABLED: $auto_protocols"
  fi

  # FASTIFY_ROUTES (host:port)
  local current_routes
  current_routes="$(get_env_var FASTIFY_ROUTES)"
  if [ -z "$current_routes" ] || echo "$current_routes" | grep -qiE '^\s*change-me\s*$'; then
    if [ "${INSTALL_MODE:-pm2}" = "docker" ]; then
      upsert_env_var FASTIFY_ROUTES "0.0.0.0:4001"
      ok "FASTIFY_ROUTES установлен для docker: 0.0.0.0:4001"
    else
      upsert_env_var FASTIFY_ROUTES "127.0.0.1:4001"
      ok "FASTIFY_ROUTES установлен для pm2: 127.0.0.1:4001"
    fi
  else
    :
  fi

  # Определяем DOCKER_GID, нужен для доступа к /var/run/docker.sock из API контейнера
  if [ "${INSTALL_MODE:-pm2}" = "docker" ]; then
    local current_docker_gid detected_gid
    current_docker_gid="$(get_env_var DOCKER_GID)"

    if [ -z "$current_docker_gid" ] || echo "$current_docker_gid" | grep -qiE '^\s*change-me\s*$'; then
      detected_gid=""

      if [ -S /var/run/docker.sock ]; then
        detected_gid="$(stat -c '%g' /var/run/docker.sock 2>/dev/null || true)"
      fi

      if [ -z "$detected_gid" ] && command -v getent >/dev/null 2>&1; then
        detected_gid="$(getent group docker 2>/dev/null | cut -d: -f3 || true)"
      fi

      if [ -n "$detected_gid" ]; then
        upsert_env_var DOCKER_GID "$detected_gid"
        ok "DOCKER_GID: $detected_gid"
      else
        warn "Не получилось определить DOCKER_GID"
      fi
    fi
  fi

  if [ "${INSTALL_MODE:-pm2}" = "docker" ]; then
    local current_docker_api detected_api
    current_docker_api="$(get_env_var DOCKER_API_VERSION)"

    if [ -z "$current_docker_api" ] || echo "$current_docker_api" | grep -qiE '^\s*change-me\s*$'; then
      detected_api=""

      if command -v docker >/dev/null 2>&1; then
        detected_api="$(docker version --format '{{.Server.APIVersion}}' 2>/dev/null || true)"
      fi

      if echo "$detected_api" | grep -qE '^[0-9]+\.[0-9]+$'; then
        upsert_env_var DOCKER_API_VERSION "$detected_api"
      else
        upsert_env_var DOCKER_API_VERSION "1.41"
      fi
    fi
  fi
  
  # Регион сервера
  local current_region input_region
  current_region="$(get_env_var SERVER_REGION)"
  read -r -p "$(printf "%b" "${C_BOLD}Введите SERVER_REGION${C_RESET} [${current_region:-пропустить}]: ")" input_region || true
  [ -n "$input_region" ] && upsert_env_var SERVER_REGION "$input_region"
  
  # Вес сервера
  local current_weight input_weight
  current_weight="$(get_env_var SERVER_WEIGHT)"
  while true; do
    read -r -p "$(printf "%b" "${C_BOLD}Введите SERVER_WEIGHT${C_RESET} [${current_weight:-пропустить}]: ")" input_weight || true
    [ -z "$input_weight" ] && break
    if [[ "$input_weight" =~ ^[0-9]+$ ]]; then
      upsert_env_var SERVER_WEIGHT "$input_weight"
      break
    else
      warn "Нужно целое число или оставьте пустым для пропуска."
    fi
  done
  
  # Максимальное количество пиров
  local current_max_peers input_max_peers
  current_max_peers="$(get_env_var SERVER_MAX_PEERS)"
  while true; do
    read -r -p "$(printf "%b" "${C_BOLD}Введите SERVER_MAX_PEERS${C_RESET} [${current_max_peers:-пропустить}]: ")" input_max_peers || true
    [ -z "$input_max_peers" ] && break
    if [[ "$input_max_peers" =~ ^[0-9]+$ ]]; then
      upsert_env_var SERVER_MAX_PEERS "$input_max_peers"
      break
    else
      warn "Нужно целое число или оставьте пустым для пропуска."
    fi
  done
  
  # Публичный IP
  local auto_public_ip
  auto_public_ip=$(get_public_ip)
  if [ -n "$auto_public_ip" ]; then
    upsert_env_var SERVER_PUBLIC_HOST "$auto_public_ip"
    ok "SERVER_PUBLIC_HOST установлен: $auto_public_ip"
  else
    warn "Не удалось автоматически определить внешний IP для SERVER_PUBLIC_HOST"
  fi
  
  # Описание
  local current_desc input_desc
  current_desc="$(get_env_var SERVER_NAME)"
  read -r -p "$(printf "%b" "${C_BOLD}Введите SERVER_NAME${C_RESET} [${current_desc:-пропустить}]: ")" input_desc || true
  if [ -n "$input_desc" ]; then
    local esc_desc="${input_desc//\"/\\\"}"
    upsert_env_var SERVER_NAME "\"$esc_desc\""
  fi
}

# Деплоит приложение
deploy_app() {
  step "[3/6] Деплой (pm2)"
  node ./scripts/deploy.js
  ok "Деплой завершён"
}

# Запуск через docker compose
deploy_docker() {
  step "[3/6] Запуск (docker)"

  if ! command -v docker >/dev/null 2>&1; then
    warn "Docker не найден. Пытаюсь установить..."
    install_docker || return 1
  fi

  # Если демон не запущен - пробуем поднять
  if ! $SUDO docker info >/dev/null 2>&1; then
    warn "Docker демон не запущен. Пытаюсь запустить..."
    if command -v systemctl >/dev/null 2>&1; then
      run_quiet "systemctl start docker" $SUDO systemctl start docker || true
    fi
  fi

  ensure_docker_compose || return 1

  if $SUDO docker compose version >/dev/null 2>&1; then
    run_quiet "docker compose up" $SUDO docker compose -f "$ROOT_DIR/docker-compose.yml" up -d --build
    ok "Контейнеры запущены (docker compose)"
    return 0
  fi

  if command -v docker-compose >/dev/null 2>&1; then
    run_quiet "docker-compose up" $SUDO docker-compose -f "$ROOT_DIR/docker-compose.yml" up -d --build
    ok "Контейнеры запущены (docker-compose)"
    return 0
  fi

  err "Не найдено 'docker compose' и 'docker-compose'."
  info "Поставьте docker-compose-plugin или docker-compose и повторите."
  return 1
}

# Настраивает автозапуск pm2 после ребута
setup_pm2_startup() {
  step "[4/6] Автозапуск pm2"

  if ! command -v pm2 >/dev/null 2>&1; then
    warn "pm2 не найден — автозапуск пропущен"
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
  ok "pm2 автозапуск настроен"
}

# Настройка Xray Stats API
setup_xray_stats() {
  step "[5/6] Настройка Xray Stats API"

  if ! command -v docker >/dev/null 2>&1; then
    warn "Docker не установлен — Xray Stats API пропущен"
    return 0
  fi

  if ! $SUDO docker ps --format '{{.Names}}' | grep -qx "amnezia-xray"; then
    info "amnezia-xray не найден — Xray Stats API пропущен"
    return 0
  fi

  if ! command -v python3 >/dev/null 2>&1; then
    warn "python3 не найден. Устанавливаю..."
    $SUDO apt-get update -y
    $SUDO apt-get install -y python3
  fi

  tmp_json="$(mktemp)"

  $SUDO docker exec amnezia-xray sh -lc 'cat /opt/amnezia/xray/server.json 2>/dev/null || echo "{}"' > "$tmp_json"

  python3 "$ROOT_DIR/scripts/xray/setup_xray_stats.py" "$tmp_json"

  $SUDO docker cp "$tmp_json" amnezia-xray:/opt/amnezia/xray/server.json
  rm -f "$tmp_json"

  info "Перезапуск контейнера amnezia-xray..."
  $SUDO docker restart amnezia-xray >/dev/null 2>&1 || true
  ok "Xray Stats API настроен"
}

# Настраивает Nginx
setup_nginx() {
  step "[6/6] Установка и настройка Nginx"
  
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
  ok "Nginx настроен"
}

# Показывает финальную информацию
show_completion() {
  section "Готово"
  if [ "${IS_UPDATE:-0}" -eq 1 ]; then
    ok "Обновление завершено"
  else
    ok "Установка завершена"
  fi
  hr
  line "Полезные команды:"
  if [ "${INSTALL_MODE:-pm2}" = "docker" ]; then
    info "docker compose -f $ROOT_DIR/docker-compose.yml ps"
    info "docker compose -f $ROOT_DIR/docker-compose.yml logs -f --tail 200"
    info "docker compose -f $ROOT_DIR/docker-compose.yml restart"
    info "docker compose -f $ROOT_DIR/docker-compose.yml build api"
    info "docker compose -f $ROOT_DIR/docker-compose.yml up -d --build"
  else
    info "pm2 status"
    info "pm2 logs $APP_NAME --lines 200"
    info "pm2 restart $APP_NAME"
    info "pm2 save"
  fi
  
  section "Информация для доступа"
  
  local public_ip api_key
  public_ip=$(get_public_ip)
  api_key="$(get_env_var FASTIFY_API_KEY)"
  
  if [ -n "$public_ip" ]; then
    kv "API URL" "http://$public_ip/"
    kv "Swagger" "http://$public_ip/docs"
  else
    kv "API URL" "http://localhost/"
    kv "Swagger" "http://localhost/docs"
  fi
  
  if [ -n "$api_key" ]; then
    kv "API ключ" "$api_key"
  else
    warn "API ключ не найден в .env файле"
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
  choose_install_mode

  if [ "${IS_UPDATE:-0}" -eq 0 ]; then
    setup_env
    if [ "${INSTALL_MODE:-pm2}" != "docker" ]; then
      install_dependencies
    fi
  fi

  if [ "${INSTALL_MODE:-pm2}" = "docker" ]; then
    deploy_docker
  else
    deploy_app
    setup_pm2_startup
  fi

  if [ "${IS_UPDATE:-0}" -eq 0 ]; then
    setup_xray_stats
    setup_nginx
  fi

  show_completion
}

main "$@"
