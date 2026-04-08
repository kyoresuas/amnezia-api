#!/bin/bash

echo "Container startup"

iptables -A INPUT -i lo -j ACCEPT
iptables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
iptables -A INPUT -p icmp -j ACCEPT
iptables -A INPUT -p tcp --dport 80 -j ACCEPT
iptables -A INPUT -p tcp --dport 443 -j ACCEPT
iptables -P INPUT DROP

ip6tables -A INPUT -i lo -j ACCEPT
ip6tables -A INPUT -m state --state RELATED,ESTABLISHED -j ACCEPT
ip6tables -A INPUT -p ipv6-icmp -j ACCEPT
ip6tables -P INPUT DROP

# Убиваем предыдущий процесс
killall -KILL xray 2>/dev/null || true

# Запускаем xray
if [ -f /opt/amnezia/xray/server.json ]; then
    exec xray -config /opt/amnezia/xray/server.json
fi

tail -f /dev/null
