#!/usr/bin/env python3
import json
import sys
from pathlib import Path


def main() -> None:
  if len(sys.argv) < 2:
    print("Usage: setup_xray_stats.py <server_json_path>", file=sys.stderr)
    raise SystemExit(1)

  path = Path(sys.argv[1])

  try:
    raw = path.read_text() if path.is_file() else "{}"
  except Exception:
    raw = "{}"

  try:
    data = json.loads(raw or "{}")
  except Exception:
    data = {}

  if not isinstance(data, dict):
    data = {}

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
    and ib.get("tag") == "api"
    for ib in inbounds
  )

  if not has_api_inbound:
    inbounds.append(
      {
        "listen": "127.0.0.1",
        "port": 10085,
        "protocol": "dokodemo-door",
        "settings": {"address": "127.0.0.1"},
        "tag": "api",
      }
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

  path.write_text(json.dumps(data, indent=2))


if __name__ == "__main__":
  main()


