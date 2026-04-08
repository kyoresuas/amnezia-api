#!/usr/bin/env bash

set -euo pipefail

CONTAINER_NAME="amnezia-xray"
DOCKER_NETWORK="amnezia-dns-net"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

XRAY_SERVER_PORT="${XRAY_SERVER_PORT:-443}"
XRAY_SITE_NAME="${XRAY_SITE_NAME:-www.googletagmanager.com}"
FORCE=0

# Разбор аргументов
while [[ $# -gt 0 ]]; do
  case "$1" in
    --port)      XRAY_SERVER_PORT="$2"; shift 2 ;;
    --site)      XRAY_SITE_NAME="$2";   shift 2 ;;
    --force)     FORCE=1;               shift   ;;
    *) echo "Неизвестный аргумент: $1"; exit 1  ;;
  esac
done

# Вспомогательные функции
SUDO=""
[ "${EUID:-$(id -u)}" -ne 0 ] && command -v sudo &>/dev/null && SUDO="sudo"

supports_color() { [ -t 1 ] && [ -z "${NO_COLOR:-}" ]; }
if supports_color; then
  R=$'\033[0m' BOLD=$'\033[1m' DIM=$'\033[2m'
  GREEN=$'\033[32m' YELLOW=$'\033[33m' CYAN=$'\033[36m' RED=$'\033[31m'
else
  R="" BOLD="" DIM="" GREEN="" YELLOW="" CYAN="" RED=""
fi

step()  { printf "\n%b\n" "${BOLD}${CYAN}▶ $*${R}"; }
ok()    { printf "%b\n" "  ${GREEN}✓${R} $*"; }
warn()  { printf "%b\n" "  ${YELLOW}⚠${R} $*" >&2; }
die()   { printf "%b\n" "${RED}✗ ОШИБКА:${R} $*" >&2; exit 1; }
kv()    { printf "%b\n" "  ${DIM}$1:${R} ${BOLD}$2${R}"; }

# Проверка зависимостей
step "Проверка окружения"

command -v docker &>/dev/null || die "Docker не установлен."
$SUDO docker info &>/dev/null  || die "Docker-демон не запущен (попробуйте: sudo systemctl start docker)."

kv "Контейнер"  "$CONTAINER_NAME"
kv "Порт"       "$XRAY_SERVER_PORT/tcp"
kv "REALITY SNI" "$XRAY_SITE_NAME"

# Docker-сеть
step "Docker-сеть $DOCKER_NETWORK"
if ! $SUDO docker network ls --format '{{.Name}}' | grep -qx "$DOCKER_NETWORK"; then
  $SUDO docker network create \
    --driver bridge \
    --subnet=172.29.172.0/24 \
    --opt com.docker.network.bridge.name=amn0 \
    "$DOCKER_NETWORK"
  ok "Сеть создана"
else
  ok "Сеть уже существует"
fi

# Сборка образа
step "Сборка Docker-образа $CONTAINER_NAME"
$SUDO docker build -t "$CONTAINER_NAME" "$SCRIPT_DIR"
ok "Образ собран"

# Удаление старого контейнера
if $SUDO docker ps -a --format '{{.Names}}' | grep -qx "$CONTAINER_NAME"; then
  if [ "$FORCE" -eq 1 ]; then
    step "Удаление старого контейнера"
    $SUDO docker rm -f "$CONTAINER_NAME"
    ok "Контейнер удалён"
  else
    die "Контейнер '$CONTAINER_NAME' уже существует. Передайте --force для пересоздания."
  fi
fi

# Запуск контейнера (заглушка)
step "Запуск контейнера (первичный)"
$SUDO docker run -d \
  --privileged \
  --log-driver none \
  --restart always \
  --cap-add=NET_ADMIN \
  -p "${XRAY_SERVER_PORT}:${XRAY_SERVER_PORT}/tcp" \
  --name "$CONTAINER_NAME" \
  "$CONTAINER_NAME"

$SUDO docker network connect "$DOCKER_NETWORK" "$CONTAINER_NAME" 2>/dev/null || true

# tun-устройство
$SUDO docker exec -i "$CONTAINER_NAME" bash -c \
  'mkdir -p /dev/net; [ -c /dev/net/tun ] || mknod /dev/net/tun c 10 200'

ok "Контейнер запущен"

# Инициализация ключей и конфига
step "Инициализация Xray"

# Копируем скрипт конфигурации в контейнер
$SUDO docker cp "$SCRIPT_DIR/configure.sh" "${CONTAINER_NAME}:/opt/amnezia/xray/configure.sh"
$SUDO docker exec -i "$CONTAINER_NAME" chmod +x /opt/amnezia/xray/configure.sh

# Запускаем с нужными переменными
$SUDO docker exec \
  -e "XRAY_SERVER_PORT=${XRAY_SERVER_PORT}" \
  -e "XRAY_SITE_NAME=${XRAY_SITE_NAME}" \
  "$CONTAINER_NAME" \
  bash /opt/amnezia/xray/configure.sh

ok "Конфигурация сгенерирована"

# Установка рабочего start.sh
step "Установка start.sh"
$SUDO docker cp "$SCRIPT_DIR/start.sh" "${CONTAINER_NAME}:/opt/amnezia/start.sh"
$SUDO docker exec -i "$CONTAINER_NAME" chmod +x /opt/amnezia/start.sh
ok "start.sh установлен"

# Перезапуск с рабочей конфигурацией
step "Перезапуск контейнера"
$SUDO docker restart "$CONTAINER_NAME"
sleep 2

if $SUDO docker ps --format '{{.Names}}' | grep -qx "$CONTAINER_NAME"; then
  ok "Контейнер запущен и работает"
else
  die "Контейнер не запустился. Проверьте логи: docker logs $CONTAINER_NAME"
fi

# Итог
printf "\n%b\n" "${BOLD}${GREEN}Готово!${R}"
printf "%b\n" "${DIM}────────────────────────────────────${R}"
kv "Контейнер"   "$CONTAINER_NAME"
kv "Порт"        "$XRAY_SERVER_PORT/tcp"
kv "REALITY SNI" "$XRAY_SITE_NAME"

PUBLIC_KEY=$($SUDO docker exec "$CONTAINER_NAME" cat /opt/amnezia/xray/xray_public.key 2>/dev/null || echo "—")
SHORT_ID=$($SUDO docker exec  "$CONTAINER_NAME" cat /opt/amnezia/xray/xray_short_id.key 2>/dev/null || echo "—")

kv "Public key"  "$PUBLIC_KEY"
kv "Short ID"    "$SHORT_ID"

printf "\n%b\n" "${DIM}Полезные команды:${R}"
printf "%b\n" "  docker logs -f $CONTAINER_NAME"
printf "%b\n" "  docker exec $CONTAINER_NAME cat /opt/amnezia/xray/server.json"
