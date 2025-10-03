import "@/config/setupMultilingualism";

import appConfig from "@/constants/appConfig";
import { setupFastify } from "@/config/fastify";
import { appLogger } from "@/config/winstonLogger";
import { setupDIContainer } from "@/config/DIContainer";
import { setupTaskQueue } from "@/config/setupTaskQueue";

const bootstrapApp = async (): Promise<void> => {
  // Сначала установить все зависимости, без них ничего не может работать
  setupDIContainer();

  // Запустить Fastify API
  if (appConfig.ENABLED_MODULES.includes("fastify")) {
    await setupFastify();
  }

  // Запустить очередь задач
  if (appConfig.ENABLED_MODULES.includes("queue")) {
    try {
      setupTaskQueue();
    } catch (err) {
      appLogger.fatal((err as Error).message, true);
    }
  }

  appLogger.verbose("Запуск проекта завершён");
};

bootstrapApp();
