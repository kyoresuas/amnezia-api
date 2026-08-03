import { Protocol } from "@/types/shared";
import { afterEach, describe, expect, it, vi } from "vitest";

const ENV_KEYS = [
  "ENV",
  "FASTIFY_ROUTES",
  "FASTIFY_API_KEY",
  "CORS_ORIGINS",
  "SERVER_PUBLIC_HOST",
  "SERVER_ID",
  "SERVER_NAME",
  "SERVER_REGION",
  "SERVER_WEIGHT",
  "SERVER_MAX_PEERS",
  "PROTOCOLS_ENABLED",
] as const;

const originalEnv = Object.fromEntries(
  ENV_KEYS.map((key) => [key, process.env[key]]),
);

const validEnv: Record<(typeof ENV_KEYS)[number], string | undefined> = {
  ENV: "development",
  FASTIFY_ROUTES: "127.0.0.1:4001",
  FASTIFY_API_KEY: "test-api-key".padEnd(64, "0"),
  CORS_ORIGINS: "",
  SERVER_PUBLIC_HOST: "vpn.example.com",
  SERVER_ID: "server-id",
  SERVER_NAME: "Test server",
  SERVER_REGION: "test-region",
  SERVER_WEIGHT: "100",
  SERVER_MAX_PEERS: "200",
  PROTOCOLS_ENABLED: "amneziawg,amneziawg2,xray",
};

/**
 * Загрузить конфигурацию с новым набором переменных окружения
 */
const loadAppConfig = async (overrides: Partial<typeof validEnv> = {}) => {
  vi.resetModules();
  const env = { ...validEnv, ...overrides };

  for (const key of ENV_KEYS) {
    const value = env[key];

    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  return import("@/constants/appConfig");
};

/**
 * Восстановить переменные окружения
 */
afterEach(() => {
  for (const key of ENV_KEYS) {
    const value = originalEnv[key];

    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  vi.resetModules();
});

/**
 * Тестирование конфигурации приложения
 */
describe("appConfig", () => {
  // Тестирование нормализации CORS origin и списка протоколов
  it("parses and normalizes environment configuration", async () => {
    const { default: appConfig, assertAppConfig } = await loadAppConfig({
      CORS_ORIGINS:
        "https://panel.example.com, https://panel.example.com/, http://localhost:3000",
      PROTOCOLS_ENABLED: "AMNEZIAWG, unknown, xray",
    });

    expect(assertAppConfig).not.toThrow();
    expect(appConfig.FASTIFY_ROUTES).toEqual({
      host: "127.0.0.1",
      port: 4001,
    });
    expect(appConfig.CORS_ORIGINS).toEqual([
      "https://panel.example.com",
      "http://localhost:3000",
    ]);
    expect(appConfig.PROTOCOLS_ENABLED).toEqual([
      Protocol.AMNEZIAWG,
      Protocol.XRAY,
    ]);
    expect(appConfig.SERVER_WEIGHT).toBe(100);
    expect(appConfig.SERVER_MAX_PEERS).toBe(200);
  });

  // Тестирование отклонения небезопасного API ключа
  it("rejects an insecure API key", async () => {
    const { assertAppConfig } = await loadAppConfig({
      FASTIFY_API_KEY: "change-me",
    });

    expect(assertAppConfig).toThrow(
      "FASTIFY_API_KEY содержит небезопасное значение по умолчанию",
    );
  });

  // Тестирование накопления ошибок маршрута и CORS
  it("reports invalid routes and CORS origins together", async () => {
    const { assertAppConfig } = await loadAppConfig({
      FASTIFY_ROUTES: "localhost:not-a-port",
      CORS_ORIGINS: "*, ftp://example.com",
    });

    expect(assertAppConfig).toThrowError(
      expect.objectContaining({
        message: expect.stringContaining(
          "FASTIFY_ROUTES содержит некорректный порт",
        ),
      }),
    );
    expect(assertAppConfig).toThrowError(
      expect.objectContaining({
        message: expect.stringContaining(
          'CORS_ORIGINS содержит некорректный origin: "*"',
        ),
      }),
    );
  });
});
