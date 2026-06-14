import "@/config/setupMultilingualism";
import { setupFastify } from "@/config/fastify";
import { appLogger } from "@/config/winstonLogger";
import { AppFastifyInstance } from "@/types/shared";
import { assertAppConfig } from "@/constants/appConfig";
import { setupDIContainer } from "@/config/DIContainer";
import { setupTaskQueue } from "@/config/setupTaskQueue";

/**
 * Корректно завершить работу
 */
const registerShutdown = (fastify: AppFastifyInstance): void => {
  let shuttingDown = false;

  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;

    appLogger.info(`Получен сигнал ${signal}, завершение работы...`);

    try {
      await fastify.close();
    } catch (err) {
      appLogger.warn(`Ошибка при закрытии Fastify: ${err}`);
    }

    process.exit(0);
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
};

/**
 * Точка входа
 */
const bootstrapApp = async (): Promise<void> => {
  // Проверить окружение
  assertAppConfig();

  // Установить DI-контейнер
  setupDIContainer();

  // Запустить Fastify API
  const fastify = await setupFastify();

  // Запустить очередь задач
  setupTaskQueue();

  // Корректно завершить работу
  registerShutdown(fastify);

  appLogger.verbose("Запуск проекта завершён");
};

bootstrapApp().catch((err) => {
  appLogger.fatal(`Не удалось запустить проект: ${err?.stack || err}`);
  process.exit(1);
});
