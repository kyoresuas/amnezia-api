import { join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath, URL } from "node:url";
import { spawnSync } from "node:child_process";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";

type XrayConfig = Record<string, unknown>;

const SCRIPT_PATH = fileURLToPath(
  new URL("../../scripts/xray/setup_xray_stats.py", import.meta.url),
);

const HAS_PYTHON = spawnSync("python3", ["--version"]).status === 0;

const API_RULE = {
  type: "field",
  inboundTag: ["api"],
  outboundTag: "api",
};

let workDir = "";
let configPath = "";

/**
 * Создать временный server.json
 */
beforeEach(() => {
  workDir = mkdtempSync(join(tmpdir(), "xray-stats-"));
  configPath = join(workDir, "server.json");
});

/**
 * Удалить временные файлы
 */
afterEach(() => {
  rmSync(workDir, { recursive: true, force: true });
});

/**
 * Запустить скрипт настройки Xray Stats API на переданном конфиге
 */
const runScript = (config: XrayConfig | string) => {
  writeFileSync(
    configPath,
    typeof config === "string" ? config : JSON.stringify(config),
  );

  const result = spawnSync("python3", [SCRIPT_PATH, configPath], {
    encoding: "utf8",
  });

  return {
    status: result.status,
    stdout: result.stdout.trim(),
    config: readFileSync(configPath, "utf8"),
  };
};

/**
 * Получить правила routing из результата скрипта
 */
const getRules = (rawConfig: string): unknown[] =>
  (JSON.parse(rawConfig) as { routing: { rules: unknown[] } }).routing.rules;

/**
 * Тестирование скрипта настройки Xray Stats API
 */
describe.skipIf(!HAS_PYTHON)("setup_xray_stats.py", () => {
  // Тестирование регрессии, при которой api inbound создавался без правила routing
  it("adds the routing rule when routing is missing or null", () => {
    for (const routing of [undefined, null]) {
      const { status, stdout, config } = runScript({
        inbounds: [{ port: 443, protocol: "vless" }],
        outbounds: [{ protocol: "freedom", tag: "direct" }],
        routing,
      });

      expect(status).toBe(0);
      expect(stdout).toBe("changed");
      expect(getRules(config)).toEqual([API_RULE]);
    }
  });

  // Тестирование порядка правил, правило api должно срабатывать первым
  it("puts the api rule before existing routing rules", () => {
    const existingRule = {
      type: "field",
      outboundTag: "direct",
      ip: ["geoip:private"],
    };
    const { config } = runScript({
      routing: { domainStrategy: "AsIs", rules: [existingRule] },
    });

    expect(getRules(config)).toEqual([API_RULE, existingRule]);
    expect(JSON.parse(config).routing.domainStrategy).toBe("AsIs");
  });

  // Тестирование создания Stats API, inbound и политик статистики
  it("enables the stats api, its inbound and stats policies", () => {
    const parsed = JSON.parse(runScript({}).config);

    expect(parsed.api).toEqual({ tag: "api", services: ["StatsService"] });
    expect(parsed.stats).toEqual({});
    expect(parsed.inbounds).toEqual([
      expect.objectContaining({
        port: 10085,
        tag: "api",
        listen: "127.0.0.1",
        protocol: "dokodemo-door",
      }),
    ]);
    expect(parsed.policy.levels["0"]).toMatchObject({
      statsUserUplink: true,
      statsUserDownlink: true,
    });
    expect(parsed.policy.system).toMatchObject({
      statsInboundUplink: true,
      statsInboundDownlink: true,
    });
  });

  // Тестирование идемпотентности, повторный запуск не меняет конфиг
  it("does not change an already configured server.json", () => {
    const first = runScript({ inbounds: [{ port: 443, protocol: "vless" }] });
    const second = runScript(first.config);

    expect(second.status).toBe(0);
    expect(second.stdout).toBe("unchanged");
    expect(second.config).toBe(first.config);
    expect(getRules(second.config)).toEqual([API_RULE]);
  });

  // Тестирование отказа от перезаписи некорректного JSON
  it("leaves invalid JSON untouched and exits with an error", () => {
    const { status, config } = runScript("{broken");

    expect(status).toBe(2);
    expect(config).toBe("{broken");
  });
});
