#!/bin/bash

echo "Container startup"

# Читаем подсеть из конфига
AWG_SUBNET=$(awk '/^Address/{split($3,a,"/"); print a[1]}' /opt/amnezia/awg/awg0.conf 2>/dev/null || echo "10.8.0.0")
AWG_CIDR=$(awk '/^Address/{split($3,a,"/"); print a[2]}' /opt/amnezia/awg/awg0.conf 2>/dev/null || echo "24")

# Поднимаем интерфейс
awg-quick down /opt/amnezia/awg/awg0.conf 2>/dev/null || true
if [ -f /opt/amnezia/awg/awg0.conf ]; then
    awg-quick up /opt/amnezia/awg/awg0.conf
fi

# Разрешаем трафик через VPN-интерфейс
iptables -A INPUT   -i awg0 -j ACCEPT
iptables -A FORWARD -i awg0 -j ACCEPT
iptables -A OUTPUT  -o awg0 -j ACCEPT

iptables -A FORWARD -i awg0 -o eth0 -s "${AWG_SUBNET}/${AWG_CIDR}" -j ACCEPT
iptables -A FORWARD -i awg0 -o eth1 -s "${AWG_SUBNET}/${AWG_CIDR}" -j ACCEPT
iptables -A FORWARD -m state --state ESTABLISHED,RELATED -j ACCEPT

iptables -t nat -A POSTROUTING -s "${AWG_SUBNET}/${AWG_CIDR}" -o eth0 -j MASQUERADE
iptables -t nat -A POSTROUTING -s "${AWG_SUBNET}/${AWG_CIDR}" -o eth1 -j MASQUERADE

tail -f /dev/null
