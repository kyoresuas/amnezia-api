import Fastify from "fastify";
import i18next from "i18next";
import fastifyCors from "@fastify/cors";
import fastifyCookie from "@fastify/cookie";
import { APIError } from "@/utils/APIError";
import metricsPlugin from "fastify-metrics";
import { appLogger } from "../winstonLogger";
import appConfig from "@/constants/appConfig";
import fastifySwagger from "@fastify/swagger";
import fastifyFormbody from "@fastify/formbody";
import { plugin } from "i18next-http-middleware";
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
export const setupFastify = async (): Promise<void> => {
  const { host, port } = appConfig.FASTIFY_ROUTES!;

  if (!host) {
    throw new APIError(500, {
      msg: "system.NO_FASTIFY_HOST",
    });
  }

  if (typeof port !== "number" || Number.isNaN(port)) {
    throw new APIError(500, {
      msg: "system.NO_FASTIFY_PORT",
    });
  }

  appLogger.info(`Запуск приложения Fastify...`);

  const fastify: AppFastifyInstance = Fastify({
    disableRequestLogging: true,
  })
    // Для улучшенной типизации запросов и ответов
    .withTypeProvider<JsonSchemaToTsProvider>();

  // Установить собственный обработчик ошибок
  fastify.setErrorHandler(fastifyErrorHandler);

  // Установить валидатор ошибок
  setupAjvValidator(fastify);

  // Интернационализация и локализация
  await fastify.register(plugin as never, { i18next });

  // Регистрация сваггера
  await fastify.register(fastifySwagger, SwaggerContract.GetConfig("admin"));
  await fastify.register(fastifySwaggerUi, SwaggerContract.ConfigUi);

  // Прочие плагины
  await fastify.register(fastifyCookie);
  await fastify.register(fastifyFormbody);
  await fastify.register(metricsPlugin, { clearRegisterOnInit: true });
  await fastify.register(fastifyCors, { origin: true, credentials: true });

  // Регистрация маршрутов
  setupFastifyRoutes(fastify);

  await fastify.listen({ host, port });
  await fastify.ready();

  appLogger.verbose(`Приложение Fastify запущено на '${host}:${port}'`);

  console.log(getFastifyRoutes(fastify));
};
