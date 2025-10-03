import "@/config/setupMultilingualism";

import { setupFastify } from "@/config/fastify";
import { appLogger } from "@/config/winstonLogger";
import { setupDIContainer } from "@/config/DIContainer";

const bootstrapApp = async (): Promise<void> => {
  // Сначала установить все зависимости, без них ничего не может работать
  setupDIContainer();

  // Запустить Fastify API
  await setupFastify();

  appLogger.verbose("Запуск проекта завершён");
};

bootstrapApp();
