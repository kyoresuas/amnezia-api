import "dotenv/config";
import { toInt } from "@/utils/primitive";
import { Protocol, IAppConfig } from "@/types/shared";

// Накопленные ошибки конфигурации окружения
const errors: string[] = [];
const MIN_API_KEY_LENGTH = 32;
const INSECURE_API_KEYS = new Set([
  "change-me",
  "changeme",
  "password",
  "secret",
]);

/**
 * Прочитать обязательную строковую переменную
 */
const requireStr = (name: string, value?: string): string => {
  const trimmed = value?.trim();

  if (!trimmed) {
    errors.push(`${name} не задан`);
    return "";
  }

  return trimmed;
};

/**
 * Проверить ключ доступа к API
 */
const parseApiKey = (value?: string): string => {
  const apiKey = requireStr("FASTIFY_API_KEY", value);

  if (!apiKey) return apiKey;

  if (INSECURE_API_KEYS.has(apiKey.toLowerCase())) {
    errors.push("FASTIFY_API_KEY содержит небезопасное значение по умолчанию");
  } else if (apiKey.length < MIN_API_KEY_LENGTH) {
    errors.push(
      `FASTIFY_API_KEY должен содержать не менее ${MIN_API_KEY_LENGTH} символов`,
    );
  }

  return apiKey;
};

/**
 * Разобрать список разрешённых CORS origin
 */
const parseCorsOrigins = (value?: string): string[] => {
  if (!value?.trim()) return [];

  const origins = new Set<string>();

  for (const rawOrigin of value.split(",")) {
    const origin = rawOrigin.trim();

    if (!origin) continue;

    try {
      const url = new URL(origin);
      const isHttp = url.protocol === "http:" || url.protocol === "https:";
      const hasOnlyOrigin =
        url.pathname === "/" &&
        !url.search &&
        !url.hash &&
        !url.username &&
        !url.password;

      if (!isHttp || !hasOnlyOrigin || origin === "*") {
        throw new Error("invalid origin");
      }

      origins.add(url.origin);
    } catch {
      errors.push(
        `CORS_ORIGINS содержит некорректный origin: ${JSON.stringify(origin)}`,
      );
    }
  }

  return [...origins];
};

/**
 * Разобрать FASTIFY_ROUTES вида host:port
 */
const parseRoutes = (value?: string): IAppConfig["FASTIFY_ROUTES"] => {
  if (!value?.trim()) {
    errors.push("FASTIFY_ROUTES не задан");
    return { host: "", port: 0 };
  }

  const [host, rawPort] = value.split(":");
  const port = Number(rawPort);

  if (!host) {
    errors.push("FASTIFY_ROUTES указан без хоста");
  }

  if (!Number.isInteger(port)) {
    errors.push("FASTIFY_ROUTES содержит некорректный порт");
  }

  return { host: host ?? "", port };
};

/**
 * Разобрать список включенных протоколов
 */
const parseProtocols = (value?: string): Protocol[] | undefined => {
  if (!value) return undefined;

  return value
    .split(",")
    .map((protocol) => protocol.trim().toLowerCase())
    .filter((protocol): protocol is Protocol =>
      Object.values(Protocol).includes(protocol as Protocol),
    );
};

/**
 * Главная конфигурация проекта
 */
const appConfig: IAppConfig = {
  ENV: process.env.ENV as IAppConfig["ENV"],
  FASTIFY_ROUTES: parseRoutes(process.env.FASTIFY_ROUTES),
  FASTIFY_API_KEY: parseApiKey(process.env.FASTIFY_API_KEY),
  CORS_ORIGINS: parseCorsOrigins(process.env.CORS_ORIGINS),
  SERVER_PUBLIC_HOST: requireStr(
    "SERVER_PUBLIC_HOST",
    process.env.SERVER_PUBLIC_HOST,
  ),
  SERVER_ID: process.env.SERVER_ID,
  SERVER_NAME: process.env.SERVER_NAME,
  SERVER_REGION: process.env.SERVER_REGION,
  SERVER_WEIGHT: toInt(process.env.SERVER_WEIGHT),
  SERVER_MAX_PEERS: toInt(process.env.SERVER_MAX_PEERS),
  PROTOCOLS_ENABLED: parseProtocols(process.env.PROTOCOLS_ENABLED),
};

/**
 * Проверить корректность конфигурации окружения
 */
export const assertAppConfig = (): void => {
  if (errors.length) {
    throw new Error(`Некорректная конфигурация:\n- ${errors.join("\n- ")}`);
  }
};

export default appConfig;
