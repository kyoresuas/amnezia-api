import Fastify from "fastify";
import i18next from "i18next";
import fastifyCors from "@fastify/cors";
import fastifyHelmet from "@fastify/helmet";
import fastifyCookie from "@fastify/cookie";
import metricsPlugin from "fastify-metrics";
import { appLogger } from "../winstonLogger";
import appConfig from "@/constants/appConfig";
import { AppContract } from "@/contracts/app";
import fastifySwagger from "@fastify/swagger";
import fastifyFormbody from "@fastify/formbody";
import { plugin } from "i18next-http-middleware";
import fastifyRateLimit from "@fastify/rate-limit";
import fastifySwaggerUi from "@fastify/swagger-ui";
import { AppFastifyInstance } from "@/types/shared";
import { SwaggerContract } from "@/contracts/swagger";
import { setupAjvValidator } from "./setupAjvValidator";
import { setupFastifyRoutes } from "./setupFastifyRoutes";
import { getFastifyRoutes } from "@/helpers/getFastifyRoutes";
import { fastifyErrorHandler } from "@/helpers/fastifyErrorHandler";
import { JsonSchemaToTsProvider } from "@fastify/type-provider-json-schema-to-ts";

/**
 * Запуск систем Fastify
 */
export const setupFastify = async (): Promise<AppFastifyInstance> => {
  const { host, port } = appConfig.FASTIFY_ROUTES;

  appLogger.info(`Запуск приложения Fastify...`);

  const fastify: AppFastifyInstance = Fastify({
    disableRequestLogging: true,
  })
    // Для улучшенной типизации запросов и ответов
    .withTypeProvider<JsonSchemaToTsProvider>();

  // Установить собственный обработчик ошибок
  fastify.setErrorHandler(fastifyErrorHandler);

  // Заголовки безопасности
  await fastify.register(fastifyHelmet, { contentSecurityPolicy: false });

  // Ограничение частоты запросов
  await fastify.register(fastifyRateLimit, {
    max: AppContract.RATE_LIMIT.MAX,
    timeWindow: AppContract.RATE_LIMIT.WINDOW_MS,
  });

  // Установить валидатор ошибок
  setupAjvValidator(fastify);

  // Интернационализация и локализация
  await fastify.register(plugin as never, { i18next });

  // Регистрация сваггера
  await fastify.register(fastifySwagger, SwaggerContract.GetConfig());
  await fastify.register(fastifySwaggerUi, SwaggerContract.ConfigUi);

  // Прочие плагины
  await fastify.register(fastifyCookie);
  await fastify.register(fastifyFormbody);
  await fastify.register(metricsPlugin, { clearRegisterOnInit: true });
  await fastify.register(fastifyCors, { origin: true });

  // Регистрация маршрутов
  setupFastifyRoutes(fastify);

  await fastify.listen({ host, port });
  await fastify.ready();

  appLogger.verbose(`Приложение Fastify запущено на '${host}:${port}'`);

  appLogger.info(`Зарегистрированные маршруты:\n${getFastifyRoutes(fastify)}`);

  return fastify;
};
