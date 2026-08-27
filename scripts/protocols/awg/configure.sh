#!/bin/bash

set -euo pipefail

# Размеры служебных пакетов AmneziaWG, нужны для проверки размеров мусора
MESSAGE_INITIATION_SIZE=148
MESSAGE_RESPONSE_SIZE=92
MESSAGE_COOKIE_REPLY_SIZE=64

# Случайное число в диапазоне [min, max)
rand() { echo $(( RANDOM % ($2 - $1) + $1 )); }

# Размеры мусора не должны совпадать между собой и давать пакеты одинакового размера,
# иначе DPI отличит их по длине. Логика повторяет установщик клиента Amnezia
S1_GENERATED=$(rand 12 150)
S4_GENERATED=12

while :; do
  S2_GENERATED=$(rand 12 150)
  [ "$S2_GENERATED" -eq "$S1_GENERATED" ] && continue
  [ "$S2_GENERATED" -eq "$S4_GENERATED" ] && continue
  [ $(( MESSAGE_INITIATION_SIZE + S1_GENERATED )) -eq $(( MESSAGE_RESPONSE_SIZE + S2_GENERATED )) ] && continue
  break
done

while :; do
  S3_GENERATED=$(rand 12 64)
  [ "$S3_GENERATED" -eq "$S1_GENERATED" ] && continue
  [ "$S3_GENERATED" -eq "$S2_GENERATED" ] && continue
  [ "$S3_GENERATED" -eq "$S4_GENERATED" ] && continue
  [ $(( MESSAGE_INITIATION_SIZE + S1_GENERATED )) -eq $(( MESSAGE_COOKIE_REPLY_SIZE + S3_GENERATED )) ] && continue
  [ $(( MESSAGE_RESPONSE_SIZE + S2_GENERATED )) -eq $(( MESSAGE_COOKIE_REPLY_SIZE + S3_GENERATED )) ] && continue
  break
done

AWG_SERVER_PORT="${AWG_SERVER_PORT:-55424}"
AWG_SUBNET_IP="${AWG_SUBNET_IP:-10.8.0.0}"
WIREGUARD_SUBNET_CIDR="${WIREGUARD_SUBNET_CIDR:-24}"

JUNK_PACKET_COUNT="${JUNK_PACKET_COUNT:-$(rand 4 7)}"
JUNK_PACKET_MIN_SIZE="${JUNK_PACKET_MIN_SIZE:-10}"
JUNK_PACKET_MAX_SIZE="${JUNK_PACKET_MAX_SIZE:-50}"
INIT_PACKET_JUNK_SIZE="${INIT_PACKET_JUNK_SIZE:-$S1_GENERATED}"
RESPONSE_PACKET_JUNK_SIZE="${RESPONSE_PACKET_JUNK_SIZE:-$S2_GENERATED}"
COOKIE_REPLY_PACKET_JUNK_SIZE="${COOKIE_REPLY_PACKET_JUNK_SIZE:-$S3_GENERATED}"
TRANSPORT_PACKET_JUNK_SIZE="${TRANSPORT_PACKET_JUNK_SIZE:-$S4_GENERATED}"

# Magic-заголовки в 3.1 шифруются ключом защиты заголовков,
# поэтому клиент Amnezia оставляет их последовательными
INIT_PACKET_MAGIC_HEADER="${INIT_PACKET_MAGIC_HEADER:-1}"
RESPONSE_PACKET_MAGIC_HEADER="${RESPONSE_PACKET_MAGIC_HEADER:-2}"
UNDERLOAD_PACKET_MAGIC_HEADER="${UNDERLOAD_PACKET_MAGIC_HEADER:-3}"
TRANSPORT_PACKET_MAGIC_HEADER="${TRANSPORT_PACKET_MAGIC_HEADER:-4}"

# Специальный мусор I1–I5 по умолчанию пустой, как и у клиента
SPECIAL_JUNK_1="${SPECIAL_JUNK_1:-}"
SPECIAL_JUNK_2="${SPECIAL_JUNK_2:-}"
SPECIAL_JUNK_3="${SPECIAL_JUNK_3:-}"
SPECIAL_JUNK_4="${SPECIAL_JUNK_4:-}"
SPECIAL_JUNK_5="${SPECIAL_JUNK_5:-}"

# Параметры AmneziaWG 3.1
CONTENT_PADDING_ADDITION="${CONTENT_PADDING_ADDITION:-10-100}"
REKEY_AFTER_TIME="${REKEY_AFTER_TIME:-100-120}"
REKEY_TIMEOUT="${REKEY_TIMEOUT:-3-7}"
REJECT_AFTER_TIME="${REJECT_AFTER_TIME:-150-180}"
KEEPALIVE_TIMEOUT="${KEEPALIVE_TIMEOUT:-5-15}"
MAX_HANDSHAKE_ATTEMPTS="${MAX_HANDSHAKE_ATTEMPTS:-15-20}"
RANDOM_TRAILERS="${RANDOM_TRAILERS:-on}"
DISABLE_COOKIES="${DISABLE_COOKIES:-on}"

mkdir -p /opt/amnezia/awg
cd /opt/amnezia/awg

# Генерация ключей
WIREGUARD_SERVER_PRIVATE_KEY=$(awg genkey)
echo "$WIREGUARD_SERVER_PRIVATE_KEY" > /opt/amnezia/awg/wireguard_server_private_key.key

WIREGUARD_SERVER_PUBLIC_KEY=$(echo "$WIREGUARD_SERVER_PRIVATE_KEY" | awg pubkey)
echo "$WIREGUARD_SERVER_PUBLIC_KEY" > /opt/amnezia/awg/wireguard_server_public_key.key

WIREGUARD_PSK=$(awg genpsk)
echo "$WIREGUARD_PSK" > /opt/amnezia/awg/wireguard_psk.key

# Ключ защиты заголовков — обычный приватный ключ WireGuard
HEADER_PROTECTION_KEY="${HEADER_PROTECTION_KEY:-$(awg genkey)}"

# Конфиг сервера awg0
cat > /opt/amnezia/awg/awg0.conf <<CONF
[Interface]
PrivateKey = ${WIREGUARD_SERVER_PRIVATE_KEY}
Address = ${AWG_SUBNET_IP}/${WIREGUARD_SUBNET_CIDR}
ListenPort = ${AWG_SERVER_PORT}
Jc = ${JUNK_PACKET_COUNT}
Jmin = ${JUNK_PACKET_MIN_SIZE}
Jmax = ${JUNK_PACKET_MAX_SIZE}
S1 = ${INIT_PACKET_JUNK_SIZE}
S2 = ${RESPONSE_PACKET_JUNK_SIZE}
S3 = ${COOKIE_REPLY_PACKET_JUNK_SIZE}
S4 = ${TRANSPORT_PACKET_JUNK_SIZE}
H1 = ${INIT_PACKET_MAGIC_HEADER}
H2 = ${RESPONSE_PACKET_MAGIC_HEADER}
H3 = ${UNDERLOAD_PACKET_MAGIC_HEADER}
H4 = ${TRANSPORT_PACKET_MAGIC_HEADER}
HeaderProtectionKey = ${HEADER_PROTECTION_KEY}
ContentPaddingAddition = ${CONTENT_PADDING_ADDITION}
RekeyAfterTime = ${REKEY_AFTER_TIME}
RekeyTimeout = ${REKEY_TIMEOUT}
RejectAfterTime = ${REJECT_AFTER_TIME}
KeepaliveTimeout = ${KEEPALIVE_TIMEOUT}
MaxHandshakeAttempts = ${MAX_HANDSHAKE_ATTEMPTS}
RandomTrailers = ${RANDOM_TRAILERS}
DisableCookies = ${DISABLE_COOKIES}
# I1 = ${SPECIAL_JUNK_1}
# I2 = ${SPECIAL_JUNK_2}
# I3 = ${SPECIAL_JUNK_3}
# I4 = ${SPECIAL_JUNK_4}
# I5 = ${SPECIAL_JUNK_5}
CONF

# Параметры AmneziaWG опциональны, строки без значений убираем
sed -i '/^[^=]*= *$/d' /opt/amnezia/awg/awg0.conf

echo "AmneziaWG 3.1 configured:"
echo "  Port:       ${AWG_SERVER_PORT}/udp"
echo "  Subnet:     ${AWG_SUBNET_IP}/${WIREGUARD_SUBNET_CIDR}"
echo "  Public key: ${WIREGUARD_SERVER_PUBLIC_KEY}"
