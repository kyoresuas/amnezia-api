#!/usr/bin/env python3
import copy
import json
import sys
from pathlib import Path

API_INBOUND_TAG = "api"


def has_api_rule(rules: list, api_tag: str) -> bool:
  """Проверяет, что в routing уже есть правило api inbound -> api outbound"""
  for rule in rules:
    if not isinstance(rule, dict):
      continue

    inbound_tags = rule.get("inboundTag")
    if isinstance(inbound_tags, str):
      inbound_tags = [inbound_tags]

    if (
      isinstance(inbound_tags, list)
      and API_INBOUND_TAG in inbound_tags
      and rule.get("outboundTag") == api_tag
    ):
      return True

  return False


def main() -> None:
  """Добавляет Stats API и правило routing для него в server.json Xray"""
  if len(sys.argv) < 2:
    print("Usage: setup_xray_stats.py <server_json_path>", file=sys.stderr)
    raise SystemExit(1)

  path = Path(sys.argv[1])

  try:
    raw = path.read_text() if path.is_file() else "{}"
  except Exception:
    raw = "{}"

  # Битый конфиг не перезаписываем минимальным, иначе потеряем настройки Xray
  try:
    data = json.loads(raw.strip() or "{}")
  except Exception:
    print("server.json содержит некорректный JSON, конфиг не изменён", file=sys.stderr)
    raise SystemExit(2)

  if not isinstance(data, dict):
    data = {}

  original = copy.deepcopy(data)

  data.setdefault("log", {"loglevel": "error"})

  data.setdefault("stats", {})
  api = data.get("api")
  if not isinstance(api, dict):
    api = {}
    data["api"] = api
  api.setdefault("tag", "api")
  services = api.get("services")
  if not isinstance(services, list):
    services = []
  if "StatsService" not in services:
    services.append("StatsService")
  api["services"] = services

  inbounds = data.get("inbounds")
  if not isinstance(inbounds, list):
    inbounds = []
    data["inbounds"] = inbounds

  has_api_inbound = any(
    isinstance(ib, dict)
    and ib.get("protocol") == "dokodemo-door"
    and ib.get("tag") == API_INBOUND_TAG
    for ib in inbounds
  )

  if not has_api_inbound:
    inbounds.append(
      {
        "listen": "127.0.0.1",
        "port": 10085,
        "protocol": "dokodemo-door",
        "settings": {"address": "127.0.0.1"},
        "tag": API_INBOUND_TAG,
      }
    )

  # Без правила routing запросы к api уходят в freedom обратно на 10085 и зацикливаются
  routing = data.get("routing")
  if not isinstance(routing, dict):
    routing = {}
    data["routing"] = routing

  rules = routing.get("rules")
  if not isinstance(rules, list):
    rules = []
    routing["rules"] = rules

  if not has_api_rule(rules, api["tag"]):
    rules.insert(
      0,
      {
        "type": "field",
        "inboundTag": [API_INBOUND_TAG],
        "outboundTag": api["tag"],
      },
    )

  policy = data.get("policy")
  if not isinstance(policy, dict):
    policy = {}
    data["policy"] = policy

  levels = policy.get("levels")
  if not isinstance(levels, dict):
    levels = {}
    policy["levels"] = levels

  level0 = levels.get("0")
  if not isinstance(level0, dict):
    level0 = {}
    levels["0"] = level0

  level0["statsUserUplink"] = True
  level0["statsUserDownlink"] = True

  system = policy.get("system")
  if not isinstance(system, dict):
    system = {}
    policy["system"] = system

  system["statsInboundUplink"] = True
  system["statsInboundDownlink"] = True

  # Файл переписываем только при изменениях, чтобы не перезапускать Xray зря
  if data == original:
    print("unchanged")
    return

  path.write_text(json.dumps(data, indent=2))
  print("changed")


if __name__ == "__main__":
  main()
