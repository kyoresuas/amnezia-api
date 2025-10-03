import "@/config/setupMultilingualism";

import appConfig from "@/constants/appConfig";
import { setupFastify } from "@/config/fastify";
import { appLogger } from "@/config/winstonLogger";
import { setupDIContainer } from "@/config/DIContainer";

const bootstrapApp = async (): Promise<void> => {
  // Сначала установить все зависимости, без них ничего не может работать
  setupDIContainer();

  // Запустить Fastify API
  if (appConfig.ENABLED_MODULES.includes("fastify")) {
    await setupFastify();
  }

  appLogger.verbose("Запуск проекта завершён");
};

bootstrapApp();
