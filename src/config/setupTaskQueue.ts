import { di } from "./DIContainer";
import { appLogger } from "./winstonLogger";
import { CronService } from "@/services/cron";
import { CronContract } from "@/contracts/cron";

/**
 * Запуск очереди задач
 */
export const setupTaskQueue = (): void => {
  const cronService = di.container.resolve<CronService>(CronService.key);

  appLogger.info(`Установка задач...`);

  // Тестовая задача
  cronService.addTask(CronContract.TestTask);

  appLogger.verbose("Очередь задач успешно настроена");
};
