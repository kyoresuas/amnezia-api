import "dotenv/config";
import { toInt } from "@/utils/primitive";
import { appLogger } from "@/config/winstonLogger";
import { Protocol, IAppConfig } from "@/types/shared";

// Накопленные ошибки конфигурации окружения
const errors: string[] = [];

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
  FASTIFY_API_KEY: requireStr("FASTIFY_API_KEY", process.env.FASTIFY_API_KEY),
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

  if (appConfig.FASTIFY_API_KEY === "change-me") {
    appLogger.warn("FASTIFY_API_KEY использует значение по умолчанию");
  }
};

export default appConfig;
