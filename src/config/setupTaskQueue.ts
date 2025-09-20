import chalk from "chalk";
import { appLogger } from "./winstonLogger";
import appConfig from "@/constants/appConfig";

/**
 * Запуск очереди задач
 */
export const setupTaskQueue = (): void => {
  if (appConfig.ENABLED_TASKS.length) {
    const coloredEnabledTasks = chalk.bold(appConfig.ENABLED_TASKS.join(", "));

    appLogger.info(`Установка одиночных задач (${coloredEnabledTasks})...`);

    for (const taskName of appConfig.ENABLED_TASKS) {
      switch (taskName) {
        default:
          appLogger.error(`Не удалось определить название задачи: ${taskName}`);
      }
    }
  }

  if (appConfig.ENABLED_TASK_TYPES.length) {
    const coloredEnabledTaskTypes = chalk.bold(
      appConfig.ENABLED_TASK_TYPES.join(", ")
    );

    appLogger.info(`Установка групп задач (${coloredEnabledTaskTypes})...`);

    for (const taskType of appConfig.ENABLED_TASK_TYPES) {
      switch (taskType) {
        // Сервисные службы
        case "service":
          break;

        // Бизнес-процессы
        case "business":
          break;

        default:
          appLogger.error(`Не удалось определить тип задачи: ${taskType}`);
      }
    }
  }

  appLogger.verbose("Очередь задач успешно настроена");
};
