#!/bin/bash

set -euo pipefail

XRAY_SERVER_PORT="${XRAY_SERVER_PORT:-443}"
XRAY_SITE_NAME="${XRAY_SITE_NAME:-www.googletagmanager.com}"

mkdir -p /opt/amnezia/xray
cd /opt/amnezia/xray

# UUID начального клиента
XRAY_CLIENT_ID=$(xray uuid)
echo "$XRAY_CLIENT_ID" > /opt/amnezia/xray/xray_uuid.key

# Short ID
XRAY_SHORT_ID=$(openssl rand -hex 8)
echo "$XRAY_SHORT_ID" > /opt/amnezia/xray/xray_short_id.key

# Пара ключей x25519
KEYPAIR=$(xray x25519)
XRAY_PRIVATE_KEY=$(echo "$KEYPAIR" | awk -F': ' 'NR==1{print $2}' | tr -d ' ')
XRAY_PUBLIC_KEY=$(echo "$KEYPAIR"  | awk -F': ' 'NR==2{print $2}' | tr -d ' ')

echo "$XRAY_PUBLIC_KEY"  > /opt/amnezia/xray/xray_public.key
echo "$XRAY_PRIVATE_KEY" > /opt/amnezia/xray/xray_private.key

# Конфиг сервера
cat > /opt/amnezia/xray/server.json <<EOF
{
    "log": {
        "loglevel": "error"
    },
    "stats": {},
    "api": {
        "tag": "api",
        "services": ["StatsService"]
    },
    "policy": {
        "levels": {
            "0": {
                "statsUserUplink": true,
                "statsUserDownlink": true
            }
        },
        "system": {
            "statsInboundUplink": true,
            "statsInboundDownlink": true
        }
    },
    "inbounds": [
        {
            "port": ${XRAY_SERVER_PORT},
            "protocol": "vless",
            "settings": {
                "clients": [
                    {
                        "id": "${XRAY_CLIENT_ID}",
                        "flow": "xtls-rprx-vision"
                    }
                ],
                "decryption": "none"
            },
            "streamSettings": {
                "network": "tcp",
                "security": "reality",
                "realitySettings": {
                    "dest": "${XRAY_SITE_NAME}:443",
                    "serverNames": [
                        "${XRAY_SITE_NAME}"
                    ],
                    "privateKey": "${XRAY_PRIVATE_KEY}",
                    "shortIds": [
                        "${XRAY_SHORT_ID}"
                    ]
                }
            }
        },
        {
            "listen": "127.0.0.1",
            "port": 10085,
            "protocol": "dokodemo-door",
            "settings": {
                "address": "127.0.0.1"
            },
            "tag": "api"
        }
    ],
    "outbounds": [
        {
            "protocol": "freedom"
        }
    ],
    "routing": {
        "rules": [
            {
                "inboundTag": ["api"],
                "outboundTag": "api",
                "type": "field"
            }
        ]
    }
}
EOF

echo "Xray configured:"
echo "  Port:       ${XRAY_SERVER_PORT}"
echo "  Site:       ${XRAY_SITE_NAME}"
echo "  Public key: ${XRAY_PUBLIC_KEY}"
echo "  Short ID:   ${XRAY_SHORT_ID}"
echo "  Client ID:  ${XRAY_CLIENT_ID}"
