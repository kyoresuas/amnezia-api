import appConfig from "@/constants/appConfig";
import { appLogger } from "@/config/winstonLogger";

/**
 * Проверить обязательную конфигурацию окружения до старта приложения
 */
export const validateEnv = (): void => {
  const errors: string[] = [];

  if (!appConfig.FASTIFY_API_KEY) {
    errors.push("FASTIFY_API_KEY не задан");
  }

  if (!appConfig.FASTIFY_ROUTES?.host) {
    errors.push("FASTIFY_ROUTES не задан или указан без хоста (host:port)");
  }

  if (
    appConfig.FASTIFY_ROUTES &&
    !Number.isInteger(appConfig.FASTIFY_ROUTES.port)
  ) {
    errors.push("FASTIFY_ROUTES содержит некорректный порт");
  }

  if (!appConfig.SERVER_PUBLIC_HOST) {
    errors.push("SERVER_PUBLIC_HOST не задан");
  }

  if (errors.length) {
    throw new Error(
      `Некорректная конфигурация окружения:\n- ${errors.join("\n- ")}`,
    );
  }

  if (appConfig.FASTIFY_API_KEY === "change-me") {
    appLogger.warn("FASTIFY_API_KEY использует значение по умолчанию");
  }
};
