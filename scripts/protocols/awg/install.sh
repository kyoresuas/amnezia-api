#!/usr/bin/env bash

set -euo pipefail

CONTAINER_NAME="amnezia-awg2"
DOCKER_NETWORK="amnezia-dns-net"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

AWG_SERVER_PORT="${AWG_SERVER_PORT:-55424}"
AWG_SUBNET_IP="${AWG_SUBNET_IP:-10.8.0.0}"
WIREGUARD_SUBNET_CIDR="${WIREGUARD_SUBNET_CIDR:-24}"
JUNK_PACKET_COUNT="${JUNK_PACKET_COUNT:-3}"
JUNK_PACKET_MIN_SIZE="${JUNK_PACKET_MIN_SIZE:-10}"
JUNK_PACKET_MAX_SIZE="${JUNK_PACKET_MAX_SIZE:-30}"
INIT_PACKET_JUNK_SIZE="${INIT_PACKET_JUNK_SIZE:-15}"
RESPONSE_PACKET_JUNK_SIZE="${RESPONSE_PACKET_JUNK_SIZE:-18}"
COOKIE_REPLY_PACKET_JUNK_SIZE="${COOKIE_REPLY_PACKET_JUNK_SIZE:-20}"
TRANSPORT_PACKET_JUNK_SIZE="${TRANSPORT_PACKET_JUNK_SIZE:-23}"
INIT_PACKET_MAGIC_HEADER="${INIT_PACKET_MAGIC_HEADER:-1020325451}"
RESPONSE_PACKET_MAGIC_HEADER="${RESPONSE_PACKET_MAGIC_HEADER:-3288052141}"
UNDERLOAD_PACKET_MAGIC_HEADER="${UNDERLOAD_PACKET_MAGIC_HEADER:-1766607858}"
TRANSPORT_PACKET_MAGIC_HEADER="${TRANSPORT_PACKET_MAGIC_HEADER:-2528465083}"
FORCE=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --port)    AWG_SERVER_PORT="$2";    shift 2 ;;
    --subnet)  AWG_SUBNET_IP="$2";     shift 2 ;;
    --cidr)    WIREGUARD_SUBNET_CIDR="$2"; shift 2 ;;
    --force)   FORCE=1;                shift   ;;
    *) echo "Неизвестный аргумент: $1"; exit 1  ;;
  esac
done

SUDO=""
[ "${EUID:-$(id -u)}" -ne 0 ] && command -v sudo &>/dev/null && SUDO="sudo"

supports_color() { [ -t 1 ] && [ -z "${NO_COLOR:-}" ]; }
if supports_color; then
  R=$'\033[0m' BOLD=$'\033[1m' DIM=$'\033[2m'
  GREEN=$'\033[32m' YELLOW=$'\033[33m' CYAN=$'\033[36m' RED=$'\033[31m'
else
  R="" BOLD="" DIM="" GREEN="" YELLOW="" CYAN="" RED=""
fi

step() { printf "\n%b\n" "${BOLD}${CYAN}▶ $*${R}"; }
ok()   { printf "%b\n" "  ${GREEN}✓${R} $*"; }
warn() { printf "%b\n" "  ${YELLOW}⚠${R} $*" >&2; }
die()  { printf "%b\n" "${RED}✗ ОШИБКА:${R} $*" >&2; exit 1; }
kv()   { printf "%b\n" "  ${DIM}$1:${R} ${BOLD}$2${R}"; }

# Проверка окружения
step "Проверка окружения"
command -v docker &>/dev/null || die "Docker не установлен."
$SUDO docker info &>/dev/null  || die "Docker-демон не запущен."

kv "Контейнер" "$CONTAINER_NAME"
kv "Порт"      "$AWG_SERVER_PORT/udp"
kv "Подсеть"   "$AWG_SUBNET_IP/$WIREGUARD_SUBNET_CIDR"

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

# Запуск контейнера
step "Запуск контейнера (первичный)"
$SUDO docker run -d \
  --log-driver none \
  --restart always \
  --privileged \
  --cap-add=NET_ADMIN \
  --cap-add=SYS_MODULE \
  -p "${AWG_SERVER_PORT}:${AWG_SERVER_PORT}/udp" \
  -v /lib/modules:/lib/modules \
  --sysctl="net.ipv4.conf.all.src_valid_mark=1" \
  --name "$CONTAINER_NAME" \
  "$CONTAINER_NAME"

$SUDO docker network connect "$DOCKER_NETWORK" "$CONTAINER_NAME" 2>/dev/null || true
ok "Контейнер запущен"

# Инициализация конфигурации
step "Инициализация AmneziaWG (ключи, awg0.conf)"

$SUDO docker cp "$SCRIPT_DIR/configure.sh" "${CONTAINER_NAME}:/opt/amnezia/awg/configure.sh"
$SUDO docker exec -i "$CONTAINER_NAME" chmod +x /opt/amnezia/awg/configure.sh

$SUDO docker exec \
  -e "AWG_SERVER_PORT=${AWG_SERVER_PORT}" \
  -e "AWG_SUBNET_IP=${AWG_SUBNET_IP}" \
  -e "WIREGUARD_SUBNET_CIDR=${WIREGUARD_SUBNET_CIDR}" \
  -e "JUNK_PACKET_COUNT=${JUNK_PACKET_COUNT}" \
  -e "JUNK_PACKET_MIN_SIZE=${JUNK_PACKET_MIN_SIZE}" \
  -e "JUNK_PACKET_MAX_SIZE=${JUNK_PACKET_MAX_SIZE}" \
  -e "INIT_PACKET_JUNK_SIZE=${INIT_PACKET_JUNK_SIZE}" \
  -e "RESPONSE_PACKET_JUNK_SIZE=${RESPONSE_PACKET_JUNK_SIZE}" \
  -e "COOKIE_REPLY_PACKET_JUNK_SIZE=${COOKIE_REPLY_PACKET_JUNK_SIZE}" \
  -e "TRANSPORT_PACKET_JUNK_SIZE=${TRANSPORT_PACKET_JUNK_SIZE}" \
  -e "INIT_PACKET_MAGIC_HEADER=${INIT_PACKET_MAGIC_HEADER}" \
  -e "RESPONSE_PACKET_MAGIC_HEADER=${RESPONSE_PACKET_MAGIC_HEADER}" \
  -e "UNDERLOAD_PACKET_MAGIC_HEADER=${UNDERLOAD_PACKET_MAGIC_HEADER}" \
  -e "TRANSPORT_PACKET_MAGIC_HEADER=${TRANSPORT_PACKET_MAGIC_HEADER}" \
  "$CONTAINER_NAME" \
  bash /opt/amnezia/awg/configure.sh

ok "Конфигурация сгенерирована"

# Установка start.sh
step "Установка start.sh"
$SUDO docker cp "$SCRIPT_DIR/start.sh" "${CONTAINER_NAME}:/opt/amnezia/start.sh"
$SUDO docker exec -i "$CONTAINER_NAME" chmod +x /opt/amnezia/start.sh
ok "start.sh установлен"

# Перезапуск
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
kv "Контейнер"  "$CONTAINER_NAME"
kv "Порт"       "$AWG_SERVER_PORT/udp"
kv "Подсеть"    "$AWG_SUBNET_IP/$WIREGUARD_SUBNET_CIDR"

PUB_KEY=$($SUDO docker exec "$CONTAINER_NAME" cat /opt/amnezia/awg/wireguard_server_public_key.key 2>/dev/null || echo "—")
kv "Public key" "$PUB_KEY"

printf "\n%b\n" "${DIM}Полезные команды:${R}"
printf "%b\n" "  docker logs -f $CONTAINER_NAME"
printf "%b\n" "  docker exec $CONTAINER_NAME awg show"
