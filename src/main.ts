import "@/config/setupMultilingualism";

import { setupFastify } from "@/config/fastify";
import { appLogger } from "@/config/winstonLogger";
import { setupDIContainer } from "@/config/DIContainer";
import { setupTaskQueue } from "@/config/setupTaskQueue";

const bootstrapApp = async (): Promise<void> => {
  // Сначала установить все зависимости, без них ничего не может работать
  setupDIContainer();

  // Запустить Fastify API
  await setupFastify();

  // Запустить очередь задач
  setupTaskQueue();

  appLogger.verbose("Запуск проекта завершён");
};

bootstrapApp();
